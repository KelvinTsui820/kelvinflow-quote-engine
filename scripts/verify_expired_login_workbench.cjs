const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
  });
  const page = await context.newPage();

  console.log('1. Navigating to index.html...');
  await page.goto('https://quote.kelvinflow.com/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  console.log('2. Opening login modal on landing page...');
  await page.evaluate(() => {
    openInboundModal('starter');
    switchInboundFormMode('login');
  });
  await page.waitForTimeout(800);

  console.log('3. Filling credentials for expired account tsuikelvin82099@gmail.com...');
  await page.fill('#inbound-login-email', 'tsuikelvin82099@gmail.com');
  await page.fill('#inbound-login-password', 'Kelvin820');

  console.log('4. Clicking submit login...');
  await page.click('#inbound-login-submit-btn');

  // Wait for redirect to review workbench
  console.log('5. Waiting for redirect to review workbench...');
  await page.waitForURL(url => url.pathname.includes('/review/'), { timeout: 15000 });
  console.log('Current URL after login:', page.url());

  await page.waitForTimeout(2000);

  // Take screenshot of workbench with expired modal clearly visible
  const shotPath = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5\\expired_account_logged_in_workbench.png';
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log('Screenshot 1 saved to:', shotPath);

  // Close the expired modal
  console.log('6. Closing expired modal to reveal review workbench...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  const shotPath2 = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5\\expired_account_workbench_unlocked.png';
  await page.screenshot({ path: shotPath2, fullPage: false });
  console.log('Screenshot 2 (workbench after Esc) saved to:', shotPath2);

  await browser.close();
  console.log('🎉 Verification completed successfully!');
})();
