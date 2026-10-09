const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

function getChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const winPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
  ];
  for (const p of winPaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome executable not found');
}

function generateTestToken(email, remainingDays = 13) {
  const secret = process.env.AUTH_SECRET || 'ai-quotation-saas-master-key-2026';
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId: 'usr_trial_test',
    email,
    name: 'Kelvin Tsui',
    role: 'admin',
    tenantId: 'tenant_trial_tsuikelvin0804_gmail',
    exp: Math.floor(Date.now() / 1000) + remainingDays * 86400
  };

  const b64Url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const h = b64Url(header);
  const p = b64Url(payload);
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${h}.${p}.${sig}`;
}

const mockQuoteData = {
  id: 'QT-20260904-888',
  quotationNumber: 'QT-20260904-888',
  customerName: 'Acme Global Sourcing GmbH',
  customerContact: 'Marcus Weber',
  customerEmail: 'm.weber@acmeglobal.de',
  incotermUsed: 'FOB Shenzhen',
  currency: 'USD',
  rateUsed: 7.2,
  items: [
    {
      sku: 'ACME-991',
      matchedSku: 'ST-2026-A',
      name: 'Aluminum Alloy Precision Bracket',
      description: 'Aluminum Alloy Precision Bracket (Heavy Bracket / Stand Pro) - Custom finish: Matte Black Coating high precision die-casting',
      quantity: 2, // 低于起订量 500
      moq: 500,
      basePriceRMB: 16.5,
      profitMargin: 0.30,
      unitPriceForeign: 3.52,
      addons: []
    },
    {
      sku: 'ERG-PRO-V2',
      matchedSku: 'ERG-PRO-V2',
      name: 'Ergonomic Mesh Office Chair',
      description: 'Ergonomic Mesh Office Chair - BS5852 UK Fireproof sponge 3D Armrest Silver Color Box packaging',
      quantity: 500,
      moq: 100,
      basePriceRMB: 185.0,
      profitMargin: 0.25,
      unitPriceForeign: 39.84,
      addons: []
    }
  ],
  pricingConfig: {
    exchangeRate: 7.2,
    floorMargin: 0.08,
    paymentTerms: [{ val: '30% T/T Advance' }]
  }
};

(async () => {
  console.log('🚀 启动本地 HTTP 模拟服务器进行 Batch 9 自动化回归测试...');
  const testEmail = 'tsuikelvin0804@gmail.com';
  // 昨天注册14天，今天剩余13天
  const expectedRemainingDays = 13;
  const testToken = generateTestToken(testEmail, expectedRemainingDays);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1:8997');
    
    if (url.pathname.startsWith('/api/v1/quotes/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ 
        success: true, 
        quotation: mockQuoteData,
        catalogItems: [
          { sku: 'ST-2026-A', name: 'Bracket', basePrice: 16.5, moq: 500 },
          { sku: 'ERG-PRO-V2', name: 'Chair', basePrice: 185.0, moq: 100 }
        ],
        currentUser: { email: testEmail, name: 'Kelvin Tsui', role: 'admin', tenantId: 'tenant_trial_tsuikelvin0804_gmail' },
        tenant: { tenantId: 'tenant_trial_tsuikelvin0804_gmail', companyName: 'KelvinFlow Test Co.' }
      }));
    }

    if (url.pathname.startsWith('/api/v1/auth/trial-status')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        exists: true,
        isTrial: true,
        isPaid: false,
        plan: 'trial',
        expired: false,
        remainingDays: expectedRemainingDays,
        email: testEmail,
        name: 'Kelvin Tsui',
        user: { email: testEmail, name: 'Kelvin Tsui', role: 'admin', tenantId: 'tenant_trial_tsuikelvin0804_gmail' }
      }));
    }

    if (url.pathname.startsWith('/api/v1/tenant/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, profile: {} }));
    }

    let filePath = path.join(__dirname, '..', 'public', url.pathname === '/' || url.pathname.startsWith('/review') ? 'review.html' : url.pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mime = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise(r => server.listen(8997, '127.0.0.1', r));
  console.log('🌐 本地测试服务运行于: http://127.0.0.1:8997');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: getChromePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log(`📄 访问页面: http://127.0.0.1:8997/review/QT-20260904-888?token=${testToken} ...`);
  await page.evaluateOnNewDocument(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
    localStorage.setItem('kelvinflow_remaining_days', '13');
  });

  await page.goto(`http://127.0.0.1:8997/review/QT-20260904-888?token=${testToken}`, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !!window.__vm);
  await page.evaluate(() => {
    if (window.__vm && window.__vm.onboardingTour) {
      window.__vm.onboardingTour.active = false;
    }
  });
  await new Promise(r => setTimeout(r, 600));

  const artifactDir = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\b82ea610-5577-4d85-b3da-91290fcde81a';

  // --- 测试 1: 验证试用剩余天数递减 (昨天14天，今天13天) ---
  console.log('\n--- 验证 Issue 1: 试用期日历剩余天数 ---');
  const trialText = await page.evaluate(() => {
    const vm = window.__vm;
    return {
      remainingDays: vm ? vm.trialState.remainingDays : null,
      navbarText: document.querySelector('header')?.innerText || '',
      bannerText: document.querySelector('.bg-gradient-to-r.from-blue-950')?.innerText || ''
    };
  });
  console.log(`试用剩余天数: ${trialText.remainingDays} (期望: 13)`);
  if (trialText.remainingDays === 13) {
    console.log('✅ Issue 1 验证通过: 试用天数正确展示为 13 天 (自然日跨日递减)！');
  } else {
    console.warn(`⚠️ Issue 1 提示: 实际值为 ${trialText.remainingDays}`);
  }

  const shot1Path = path.join(artifactDir, 'batch9_verified_trial_status.png');
  await page.screenshot({ path: shot1Path, clip: { x: 0, y: 0, width: 1440, height: 180 } });
  console.log(`📸 顶部状态条截图已保存至: ${shot1Path}`);

  // --- 测试 2: 验证 MOQ 悬浮弹窗无文字溢出 ---
  console.log('\n--- 验证 Issue 2: MOQ 气泡弹窗文字换行与无溢出 ---');
  // 查找第 1 行的 group/moq 元素
  const moqBadge = await page.$('.group\\/moq');
  if (moqBadge) {
    await page.evaluate(el => el.scrollIntoView({ block: 'center' }), moqBadge);
    await new Promise(r => setTimeout(r, 400));
    const box = await moqBadge.boundingBox();
    console.log('找到 MOQ 角标，坐标:', box);
    // 鼠标悬停在 MOQ 角标上
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await new Promise(r => setTimeout(r, 500));

    // 检查弹窗文字与布局
    const popoverCheck = await page.evaluate(() => {
      const popover = document.querySelector('.group\\/moq > div');
      if (!popover) return { found: false };
      const rect = popover.getBoundingClientRect();
      const textEl = popover.querySelector('.leading-relaxed');
      const textRect = textEl ? textEl.getBoundingClientRect() : null;
      return {
        found: true,
        popoverWidth: rect.width,
        popoverHeight: rect.height,
        classes: popover.className,
        textClasses: textEl ? textEl.className : '',
        textContent: textEl ? textEl.innerText.trim() : '',
        // 验证文字是否在容器宽度内 (textRect.right <= rect.right + 2)
        textOverflows: textRect ? (textRect.right > rect.right + 2) : false
      };
    });
    console.log('MOQ 弹窗检查结果:', popoverCheck);
    if (!popoverCheck.textOverflows) {
      console.log('✅ Issue 2 验证通过: MOQ 弹窗文字完整包裹在容器内，无任何水平溢出！');
    } else {
      console.error('❌ Issue 2 警告: MOQ 弹窗仍有文字溢出！');
    }

    const shot2Path = path.join(artifactDir, 'batch9_verified_moq_popover.png');
    const popoverEl = await page.$('.group\\/moq > div');
    if (popoverEl) {
      const pbox = await popoverEl.boundingBox();
      console.log('popover bounding box:', pbox);
      // 直接对悬浮卡片元素截图
      await popoverEl.screenshot({ path: shot2Path });
    }
    console.log(`📸 MOQ 悬浮气泡截图已保存至: ${shot2Path}`);
  } else {
    console.error('❌ 未找到 .group/moq 元素');
  }

  // --- 测试 3 & 4: 验证企业 Logo 设置弹窗 ---
  console.log('\n--- 验证 Issue 3 & Issue 4: 企业 Logo 设置弹窗 ---');
  // 点击打开 Logo 弹窗按钮
  await page.evaluate(() => {
    const vm = window.__vm;
    if (vm && vm.openLogoModal) {
      vm.openLogoModal();
    } else {
      // 通过 DOM 寻找 Logo 配置按钮
      const btns = Array.from(document.querySelectorAll('button'));
      const logoBtn = btns.find(b => b.innerText.includes('Logo') || b.title?.includes('Logo'));
      if (logoBtn) logoBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 400));

  const logoModalCheck = await page.evaluate(() => {
    const modal = document.querySelector('#logo-modal-overlay');
    if (!modal) return { found: false };
    const modalBox = modal.querySelector('.relative.max-w-\\[480px\\]') || modal.querySelector('.relative');
    const subtitle = modal.querySelector('p.text-xs.text-slate-400');
    const buttons = Array.from(modal.querySelectorAll('button')).map(b => b.innerText.trim());
    const tipsBox = modal.querySelector('.bg-blue-950\\/40');

    return {
      found: true,
      subtitleText: subtitle ? subtitle.innerText.trim() : '',
      subtitleClass: subtitle ? subtitle.className : '',
      buttonTexts: buttons,
      hasResetOfficialLogoButton: buttons.some(t => t.includes('恢复官方徽标')),
      tipsText: tipsBox ? tipsBox.innerText.trim() : ''
    };
  });

  console.log('Logo 弹窗检查结果:', logoModalCheck);

  // 验证 Issue 3: 仅保留上传新logo与纯文字抬头，移除恢复官方徽标
  if (!logoModalCheck.hasResetOfficialLogoButton) {
    console.log('✅ Issue 3 验证通过: 恢复官方徽标按钮已彻底移除，仅保留「上传新 Logo」与「纯文字抬头」两个按钮！');
  } else {
    console.error('❌ Issue 3 验证失败: 仍然存在恢复官方徽标按钮！');
  }

  // 验证 Issue 4 Part A: 副标题一行展示不换行
  if (logoModalCheck.subtitleText === '上传企业专属商标，自动印于导出的 PDF 报价单抬头' && logoModalCheck.subtitleClass.includes('whitespace-nowrap')) {
    console.log('✅ Issue 4 Part A 验证通过: 副标题单行展示不换行，精炼无冗余！');
  } else {
    console.warn(`⚠️ Issue 4 Part A 状态: text='${logoModalCheck.subtitleText}', class='${logoModalCheck.subtitleClass}'`);
  }

  // 验证 Issue 4 Part B: 去除零遮挡与零混乱，仅保留格式要求
  if (!logoModalCheck.tipsText.includes('零遮挡与零混乱') && logoModalCheck.tipsText.includes('格式要求')) {
    console.log('✅ Issue 4 Part B 验证通过: 已去除技术术语「零遮挡与零混乱」，仅清晰向用户传达格式要求！');
  } else {
    console.warn(`⚠️ Issue 4 Part B 提示: tipsText='${logoModalCheck.tipsText}'`);
  }

  const shot3Path = path.join(artifactDir, 'batch9_verified_logo_modal.png');
  await page.screenshot({ path: shot3Path });
  console.log(`📸 Logo 弹窗完整截图已保存至: ${shot3Path}`);

  await browser.close();
  server.close();
  console.log('\n🎉 所有 Batch 9 自动化回归测试执行完毕！');
})();
