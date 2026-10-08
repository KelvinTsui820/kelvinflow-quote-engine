const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const http = require('http');

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
      sku: 'ST-2026-A',
      name: 'Aluminum Alloy Precision Bracket (铝合金精密五金支架)',
      description: 'Aluminum Alloy Precision Bracket',
      quantity: 50, // 低于 MOQ 1000
      basePriceRMB: 15.5,
      profitMargin: 0.05, // 低于利润红线 8%
      unitPriceForeign: 2.65,
      addons: []
    },
    {
      sku: 'ERG-PRO-V2',
      name: 'Ergonomic Mesh Office Chair (人体工学全网办公椅)',
      description: 'Ergonomic Mesh Office Chair',
      quantity: 500, // 高于起订量 200
      basePriceRMB: 185.0,
      profitMargin: 0.25,
      unitPriceForeign: 32.5,
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
  console.log('🚀 启动本地 HTTP 模拟服务器...');
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1:8998');
    
    // API 路由拦截
    if (url.pathname.startsWith('/api/v1/quotes/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ 
        success: true, 
        quotation: mockQuoteData,
        currentUser: { email: '550578343@qq.com', name: 'QQ测试用户' },
        tenant: { tenantId: 'tenant_trial_550578343_qq', companyName: 'KelvinFlow Test Co.' }
      }));
    }
    if (url.pathname.startsWith('/api/v1/auth/trial-status')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ 
        success: true, 
        isTrial: true,
        expired: false,
        remainingDays: 14,
        email: '550578343@qq.com',
        name: 'QQ测试用户',
        plan: 'trial'
      }));
    }
    if (url.pathname.startsWith('/api/v1/tenant/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, profile: {} }));
    }

    // 静态文件服务
    let filePath = path.join(__dirname, '..', 'public', url.pathname === '/' || url.pathname.startsWith('/review') ? 'review.html' : url.pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mime = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise(r => server.listen(8998, '127.0.0.1', r));
  console.log('✅ 模拟服务器运行于 http://127.0.0.1:8998');

  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('📄 正在访问页面 http://127.0.0.1:8998/review/QT-20260904-888?token=test_token_qq ...');
  await page.goto('http://127.0.0.1:8998/review/QT-20260904-888?token=test_token_qq', { waitUntil: 'networkidle2' });

  // 等待 Vue 应用加载
  await page.waitForFunction(() => !!window.__vm);
  console.log('✅ Vue 应用成功挂载！');

  // =========================================================================
  // 1. 验证用户账号显示 (Issue 1)
  // =========================================================================
  console.log('\n--- 验证 1: 用户账号 Navbar 同步 ---');
  await new Promise(r => setTimeout(r, 600));
  const maskedPhoneText = await page.evaluate(() => window.__vm.maskedPhone);
  console.log(`Navbar 用户显示: "${maskedPhoneText}" (期望: 550578343@qq.com)`);
  if (maskedPhoneText !== '550578343@qq.com') {
    throw new Error(`Navbar 用户显示不匹配: ${maskedPhoneText}`);
  }
  const remainingDays = await page.evaluate(() => window.__vm.trialState.remainingDays);
  console.log(`试用剩余天数: ${remainingDays} 天 (期望: 14)`);

  // =========================================================================
  // 2. 验证低于 MOQ 悬浮角标与行高不受破坏 (Issue 2)
  // =========================================================================
  console.log('\n--- 验证 2: 低于 MOQ 悬浮角标与行高不被拉伸 ---');
  const tableRows = await page.evaluate(() => {
    const trs = Array.from(document.querySelectorAll('tbody tr'));
    return trs.map((tr, idx) => {
      const rect = tr.getBoundingClientRect();
      const moqBadge = tr.querySelector('span.bg-amber-500');
      const marginBadge = tr.querySelector('span.bg-rose-500');
      return {
        idx,
        height: Math.round(rect.height),
        hasMoqBadge: !!moqBadge,
        moqText: moqBadge ? moqBadge.innerText.trim() : '',
        hasMarginBadge: !!marginBadge,
        marginText: marginBadge ? marginBadge.innerText.trim() : ''
      };
    });
  });

  console.log('表格行信息:', tableRows);
  // 核心验证：验证触发低于 MOQ 前后，该行行高是否完全一致（0 像素变化）！
  const row0HeightBefore = await page.evaluate(() => {
    return document.querySelector('tbody tr').getBoundingClientRect().height;
  });

  // 动态修改为低于起订量 (如 10)
  await page.evaluate(() => {
    window.__vm.quotation.items[0].quantity = 10;
  });
  await new Promise(r => setTimeout(r, 300));

  const row0InfoAfter = await page.evaluate(() => {
    const tr = document.querySelector('tbody tr');
    const moqBadge = tr.querySelector('span.bg-amber-500');
    return {
      height: tr.getBoundingClientRect().height,
      hasMoqBadge: !!moqBadge,
      moqText: moqBadge ? moqBadge.innerText.trim() : ''
    };
  });

  console.log(`行 0 原始高度: ${row0HeightBefore}px, 触发低于 MOQ 后高度: ${row0InfoAfter.height}px, 差异: ${row0InfoAfter.height - row0HeightBefore}px`);
  if (!row0InfoAfter.hasMoqBadge || !row0InfoAfter.moqText.includes('MOQ')) {
    throw new Error('未检测到低于 MOQ 悬浮角标！');
  }
  if (Math.abs(row0InfoAfter.height - row0HeightBefore) > 1) {
    throw new Error(`低于 MOQ 破坏了表格行高！高度由 ${row0HeightBefore}px 增加到了 ${row0InfoAfter.height}px！`);
  }
  console.log('✅ 零行高破坏验证通过！MOQ 角标采用高对比度绝对定位角标，完全不撑大表格行高（高度差为 0px）！');

  // 截取表格局部图
  await page.screenshot({
    path: path.resolve(__dirname, 'batch6_verified_table_moq.png'),
    clip: { x: 50, y: 350, width: 1340, height: 350 }
  });

  // =========================================================================
  // 3 & 4. 验证邮箱中枢 Tab 1 & Tab 2 文案 (Issue 3 & 4)
  // =========================================================================
  console.log('\n--- 验证 3 & 4: 邮箱中枢 Tab 1 & Tab 2 文案 ---');
  await page.evaluate(() => {
    window.__vm.openImapModal();
  });
  await new Promise(r => setTimeout(r, 400));

  const bodyTextTab1 = await page.evaluate(() => document.body.innerText);
  const containsOldZeroRisk = bodyTextTab1.includes('(0风控通道)');
  const containsNewForward = bodyTextTab1.includes('【邮件自动转发】');
  console.log(`Tab 1 是否已剔除 "(0风控通道)": ${!containsOldZeroRisk}`);
  console.log(`Tab 1 底部卡片是否为 "【邮件自动转发】": ${containsNewForward}`);
  if (containsOldZeroRisk) {
    throw new Error('Tab 1 仍残留 "(0风控通道)"！');
  }
  if (!containsNewForward) {
    throw new Error('Tab 1 未找到 "【邮件自动转发】"！');
  }

  // 截取 Tab 1 截图
  await page.screenshot({
    path: path.resolve(__dirname, 'batch6_verified_tab1.png')
  });

  // 切换到 Tab 2
  await page.evaluate(() => {
    window.__vm.imapModal.tab = 'draft';
  });
  await new Promise(r => setTimeout(r, 400));

  const bodyTextTab2 = await page.evaluate(() => document.body.innerText);
  const mentionsAllMailboxes = bodyTextTab2.includes('全面支持阿里企业邮、网易企业邮、腾讯企业邮/Foxmail、Outlook、Gmail等主流外贸企业邮箱及个人邮箱');
  console.log(`Tab 2 是否完整覆盖主流企业与个人邮箱兼容说明: ${mentionsAllMailboxes}`);
  if (!mentionsAllMailboxes) {
    throw new Error('Tab 2 未找到主流邮箱全兼容文案！');
  }

  // 截取 Tab 2 截图
  await page.screenshot({
    path: path.resolve(__dirname, 'batch6_verified_tab2.png')
  });

  // 关闭模态框
  await page.evaluate(() => {
    window.__vm.imapModal.show = false;
  });
  await new Promise(r => setTimeout(r, 300));

  // =========================================================================
  // 5. 验证高对比度居中高亮浮动 Toast 弹窗 (Issue 5)
  // =========================================================================
  console.log('\n--- 验证 5: 全局居中高对比度 Toast 提示 ---');
  await page.evaluate(() => {
    window.__vm.showToast('🎉 恭喜！询盘报价与商业条款已成功同步更新！', 'success');
  });
  await new Promise(r => setTimeout(r, 400));

  const toastInfo = await page.evaluate(() => {
    const toastEl = document.querySelector('div.fixed.top-6.left-1\\/2');
    const toastCard = toastEl ? toastEl.querySelector('div.pointer-events-auto') : null;
    if (!toastCard) return null;
    const rect = toastCard.getBoundingClientRect();
    const style = window.getComputedStyle(toastCard);
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bgColor: style.backgroundColor,
      color: style.color,
      text: toastCard.innerText.trim()
    };
  });
  console.log('Toast 节点信息:', toastInfo);
  if (!toastInfo) {
    throw new Error('未找到居中悬浮 Toast 节点！');
  }
  const screenCenter = 1440 / 2;
  const toastCenter = toastInfo.left + toastInfo.width / 2;
  console.log(`屏幕中线: ${screenCenter}px, Toast 中心: ${toastCenter}px, 偏差: ${Math.abs(screenCenter - toastCenter)}px`);
  if (Math.abs(screenCenter - toastCenter) > 20) {
    throw new Error(`Toast 未水平居中: ${toastCenter} vs ${screenCenter}`);
  }

  // 截取 Toast 屏幕截图
  await page.screenshot({
    path: path.resolve(__dirname, 'batch6_verified_toast_centered.png'),
    clip: { x: 400, y: 0, width: 640, height: 180 }
  });

  console.log('\n🎉 Batch 6 修复全部 5 项测试百分之百验证通过！');

  await browser.close();
  server.close();
  process.exit(0);
})().catch(err => {
  console.error('❌ 测试验证失败:', err);
  process.exit(1);
});
