const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Navigating to index.html...');
  await page.goto('https://quote.kelvinflow.com/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Trigger login modal via JS directly: openLoginModal() or click
  console.log('2. Opening login modal...');
  await page.evaluate(() => {
    if (typeof openInboundModal === 'function') {
      openInboundModal('starter');
      // switch to login tab
      setTimeout(() => {
        const loginTab = document.querySelector('button[onclick*="login"], #tab-login, [data-tab="login"]');
        if (loginTab) loginTab.click();
      }, 200);
    }
  });
  await page.waitForTimeout(800);

  // Switch to existing account login tab if present
  const existingTab = await page.$('button:has-text("已有工作邮箱登录"), button:has-text("已有账号登录"), button:has-text("已有账号安全登录")');
  if (existingTab) {
    await existingTab.click();
    await page.waitForTimeout(500);
  }

  console.log('3. Filling credentials for tsuikelvin82099@gmail.com...');
  await page.fill('#trial-login-email', 'tsuikelvin82099@gmail.com');
  await page.fill('#trial-login-password', 'Kelvin820');

  console.log('4. Submitting login form to trigger trial expired modal...');
  const submitBtn = await page.$('button:has-text("验证密码并进入工作台")');
  if (submitBtn) {
    await submitBtn.click();
  }

  await page.waitForTimeout(2500);

  const screenshotPath = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5\\tc_exp01_live_expired_modal.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Screenshot saved to:', screenshotPath);

  // Verify modal text
  const modalText = await page.innerText('body');
  console.log('Contains "少喝一杯星巴克"?', modalText.includes('少喝一杯星巴克'));
  console.log('Contains "每月仍享有 10 笔免费出单额度"?', modalText.includes('每月仍享有 10 笔免费出单额度'));
  console.log('Contains "底价库与历史单据已为您安全保留 30 天"?', modalText.includes('底价库与历史单据已为您安全保留 30 天'));

  await browser.close();
})();
