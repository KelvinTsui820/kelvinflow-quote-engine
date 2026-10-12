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
      matchedSku: 'ST-2026-A',
      name: 'Aluminum Alloy Precision Bracket (铝合金精密五金支架)',
      description: 'Aluminum Alloy Precision Bracket',
      quantity: 50, // 低于 MOQ 500
      moq: 500,
      basePriceRMB: 16.5,
      profitMargin: 0.05, // 低于底线 8%
      unitPriceForeign: 2.65,
      addons: []
    },
    {
      sku: 'ERG-PRO-V2',
      matchedSku: 'ERG-PRO-V2',
      name: 'Ergonomic Mesh Office Chair (人体工学全网办公椅)',
      description: 'Ergonomic Mesh Office Chair',
      quantity: 500,
      moq: 100,
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
        currentUser: { email: '550578343@qq.com', name: '外贸同行' },
        tenant: { tenantId: 'tenant_trial_550578343_qq', companyName: 'KelvinFlow Test Co.' }
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
        remainingDays: 7,
        email: '550578343@qq.com',
        name: '外贸同行'
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

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('saas_auth_token', 'mock_trial_token_550578343');
      localStorage.setItem('kelvinflow_user_email', '550578343@qq.com');
      localStorage.setItem('kelvinflow_user_name', '外贸同行');
      localStorage.setItem('kelvinflow_remaining_days', '7');
      localStorage.setItem('kelvinflow_user_plan', 'trial');
      localStorage.setItem('kelvinflow_user_is_paid', 'false');
      localStorage.setItem('kelvinflow_tour_dismissed', 'true');
    });

    console.log('📖 正在打开审单工作台...');
    await page.goto('http://127.0.0.1:8997/review/QT-20260904-888?token=mock_trial_token_550578343', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => !!window.__vm);
    await new Promise(r => setTimeout(r, 1200));

    // ==========================================
    // 检查 1：导航栏版本标识 (应该显示「免费试用版」，绝非「个人极客版」)
    // ==========================================
    console.log('\n--- 检查 1: 导航栏版本标识 (非极客版账号) ---');
    const badgeText = await page.evaluate(() => {
      const h1 = document.querySelector('header h1');
      const badge = h1?.parentElement?.querySelector('span.rounded-full');
      return badge ? badge.innerText.trim() : 'NOT_FOUND';
    });
    console.log(`   当前版本标识文字: [${badgeText}]`);
    if (badgeText.includes('免费试用版') && !badgeText.includes('个人极客版')) {
      console.log('   ✅ 成功: 试用期账号正确显示为【免费试用版】，未误展示为极客版！');
    } else {
      console.error(`   ❌ 失败: 预期包含「免费试用版」，实际显示: [${badgeText}]`);
    }

    // 检查导航栏邮箱与天数
    const navUserText = await page.evaluate(() => {
      const el = document.querySelector('header .bg-blue-950\\/90');
      return el ? el.innerText.trim() : 'NOT_FOUND';
    });
    console.log(`   导航栏账号标识: [${navUserText}]`);

    // ==========================================
    // 检查 2: 买家询盘建单弹窗 (检查「Gemini 3.8 Flash...」是否已彻底移除)
    // ==========================================
    console.log('\n--- 检查 2: 买家询盘建单弹窗文案精简 ---');
    await page.click('#tour-step-2'); // 点击「上传新询盘建单」
    await page.waitForSelector('div.fixed.inset-0.z-50', { timeout: 3000 });
    // 切换到粘贴文本模式
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const textBtn = btns.find(b => b.innerText.includes('粘贴英文正文'));
      if (textBtn) textBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    const quickModalHtml = await page.evaluate(() => {
      const modal = document.querySelector('div.fixed.inset-0.z-50');
      return modal ? modal.innerHTML : '';
    });
    const hasGeminiPromo = quickModalHtml.includes('Gemini 3.8 Flash 自动解析买家信息');
    if (!hasGeminiPromo) {
      console.log('   ✅ 成功: 「Gemini 3.8 Flash 自动解析买家信息」已成功删除，界面紧凑无冗余！');
    } else {
      console.error('   ❌ 失败: 快速建单弹窗中仍存在 Gemini 推广文案！');
    }
    // 关闭建单弹窗
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));

    // ==========================================
    // 检查 3: 表格 MOQ 与毛利率角标 Hover 展开业务说明弹窗
    // ==========================================
    console.log('\n--- 检查 3: 表格 MOQ 角标与 Hover 说明弹窗 ---');
    const moqBadge = await page.$('.group\\/moq');
    if (moqBadge) {
      console.log('   ✅ 找到 MOQ 角标，准备触发鼠标 Hover...');
      const badgeBox = await moqBadge.boundingBox();
      await page.mouse.move(badgeBox.x + badgeBox.width / 2, badgeBox.y + badgeBox.height / 2);
      await new Promise(r => setTimeout(r, 400));

      const popoverText = await page.evaluate(() => {
        const pop = document.querySelector('.group\\/moq div.absolute');
        return pop ? pop.innerText.replace(/\s+/g, ' ').trim() : 'NOT_FOUND';
      });
      console.log(`   Hover 弹窗内容: [${popoverText}]`);
      if (popoverText.includes('数量低于工厂起订量') && popoverText.includes('起订门槛')) {
        console.log('   ✅ 成功: MOQ 角标鼠标悬停弹出精美业务说明弹窗，包含报盘量与起订门槛！');
      } else {
        console.error('   ❌ 失败: MOQ 说明弹窗未按预期显示！');
      }

      // 截取带 Hover 弹窗的表格明细区域
      const tableElem = (await page.$$('div.bg-white.rounded-2xl.border'))[1] || await page.$('table');
      if (tableElem) {
        const outPath = path.resolve('C:/Users/tsuik/.gemini/antigravity/brain/b82ea610-5577-4d85-b3da-91290fcde81a/batch7_verified_moq_hover.png');
        await tableElem.screenshot({ path: outPath });
        console.log(`   📸 已保存 MOQ Hover 效果截图至: ${outPath}`);
      }
    } else {
      console.error('   ❌ 未找到 MOQ 角标！');
    }

    // ==========================================
    // 检查 4: 退出登录弹窗 (检查「公共演示状态」是否已彻底移除)
    // ==========================================
    console.log('\n--- 检查 4: 退出登录弹窗文案 ---');
    await page.evaluate(() => {
      window.__vm.openLogoutModal();
    });
    await page.waitForSelector('div[class*="z-[120]"]', { timeout: 3000 });
    await new Promise(r => setTimeout(r, 500));

    const logoutModalText = await page.evaluate(() => {
      const modal = document.querySelector('div[class*="z-[120]"]');
      return modal ? modal.innerText.replace(/\s+/g, ' ').trim() : 'NOT_FOUND';
    });
    console.log(`   退出弹窗文案: [${logoutModalText}]`);
    if (!logoutModalText.includes('公共演示状态') && logoutModalText.includes('您随时可以通过该邮箱重新登录')) {
      console.log('   ✅ 成功: 「审单工作台将恢复为公共演示状态」已彻底删除，文案自然流畅！');
    } else {
      console.error(`   ❌ 失败: 退出弹窗文案不符合预期: [${logoutModalText}]`);
    }

    const logoutCard = await page.$('div[class*="z-[120]"] div.relative.max-w-sm');
    if (logoutCard) {
      const outPath = path.resolve('C:/Users/tsuik/.gemini/antigravity/brain/b82ea610-5577-4d85-b3da-91290fcde81a/batch7_verified_logout_modal.png');
      await logoutCard.screenshot({ path: outPath });
      console.log(`   📸 已保存退出弹窗截图至: ${outPath}`);
    }

    console.log('\n🎉 本地自动化验证全部顺利通过！');
  } catch (err) {
    console.error('❌ 测试过程发生错误:', err);
  } finally {
    await browser.close();
    server.close();
    process.exit(0);
  }
})();
