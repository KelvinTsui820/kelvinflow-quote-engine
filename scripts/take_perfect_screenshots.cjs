const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

function getChromePath() {
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

(async () => {
  console.log('📸 正在线上截取超清无遮挡验证成果图...');
  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('saas_auth_token', 'live_verified_token_qq');
    localStorage.setItem('kelvinflow_user_email', '550578343@qq.com');
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
  });

  await page.goto('https://quote.kelvinflow.com/review/QT-20260904-888', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !!window.__vm);

  // 1. 关闭任何向导并等待动画静止
  await page.evaluate(() => {
    window.__vm.skipTour();
    window.__vm.tourActive = false;
  });
  await new Promise(r => setTimeout(r, 600));

  // =========================================================================
  // 截图 1: 表格 MOQ 悬浮角标 (0 行高破坏，整洁美观)
  // =========================================================================
  console.log('1. 正在截取 MOQ 悬浮角标成果图...');
  await page.evaluate(() => {
    // 将第 1 款数量改为 10 (低于起订量 500)
    window.__vm.quotation.items[0].quantity = 10;
    window.__vm.onQtyChange(window.__vm.quotation.items[0]);
  });
  await new Promise(r => setTimeout(r, 400));

  // 精准定位到包含 table 的卡片容器
  const tableCard = await page.evaluateHandle(() => {
    return document.querySelector('table').closest('div.bg-white.rounded-2xl') || document.querySelector('table');
  });
  await tableCard.asElement().screenshot({
    path: path.resolve(__dirname, 'live_batch6_table_moq.png')
  });

  // =========================================================================
  // 截图 2: 邮箱中枢 Tab 1 (剔除 0风控通道，规范为【邮件自动转发】)
  // =========================================================================
  console.log('2. 正在截取邮箱中枢 Tab 1 成果图...');
  await page.evaluate(() => {
    if (window.__vm.imapModal.savedConfig) {
      window.__vm.imapModal.savedConfig.enabled = false;
    }
    window.__vm.openImapModal();
    window.__vm.imapModal.tab = 'forward';
  });
  await new Promise(r => setTimeout(r, 500));

  const modalBox = await page.$('div.bg-white.rounded-3xl');
  if (modalBox) {
    await modalBox.screenshot({
      path: path.resolve(__dirname, 'live_batch6_email_tab1.png')
    });
  }

  // =========================================================================
  // 截图 3: 邮箱中枢 Tab 2 (主流企业邮全兼容规范说明)
  // =========================================================================
  console.log('3. 正在截取邮箱中枢 Tab 2 成果图...');
  await page.evaluate(() => {
    window.__vm.imapModal.tab = 'draft';
    window.__vm.trialState.isTrial = true;
    window.__vm.trialState.isPaid = false;
    if (window.__vm.currentTenant) {
      window.__vm.currentTenant.plan = 'trial';
    }
  });
  await new Promise(r => setTimeout(r, 400));

  if (modalBox) {
    await modalBox.screenshot({
      path: path.resolve(__dirname, 'live_batch6_email_tab2.png')
    });
  }

  // 关闭模态框
  await page.evaluate(() => {
    window.__vm.imapModal.show = false;
  });
  await new Promise(r => setTimeout(r, 300));

  // =========================================================================
  // 截图 4: 顶部居中高对比度 Toast 悬浮卡片
  // =========================================================================
  console.log('4. 正在截取顶部居中高对比度 Toast 成果图...');
  await page.evaluate(() => {
    window.__vm.showToast('🎉 恭喜！询盘报价与商业条款已成功同步更新！', 'success');
  });
  await new Promise(r => setTimeout(r, 400));

  // 截取页面顶部区域 (显示顶部居中药丸卡片与 Navbar)
  await page.screenshot({
    path: path.resolve(__dirname, 'live_batch6_toast.png'),
    clip: { x: 0, y: 0, width: 1440, height: 260 }
  });

  console.log('🎉 4 张成果高清图截取完毕！');
  await browser.close();
})();
