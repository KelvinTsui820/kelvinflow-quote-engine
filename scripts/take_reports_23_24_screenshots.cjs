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

  // A. Report 24 Verification: Wrong Password alert
  console.log('\n2. Testing Report 24: Wrong Password...');
  await page.evaluate(() => {
    openInboundModal('starter');
    switchInboundFormMode('login');
  });
  await page.waitForTimeout(600);

  await page.fill('#inbound-login-email', 'tsuikelvin82099@gmail.com');
  await page.fill('#inbound-login-password', 'WrongPassword123');
  await page.click('#inbound-login-submit-btn');
  await page.waitForTimeout(1500);

  const errorText = await page.innerText('#inbound-login-error-feedback');
  console.log('Report 24 Error Box text:', errorText);

  const report24Screenshot = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5\\tc_auth_wrong_password_fix.png';
  await page.screenshot({ path: report24Screenshot, fullPage: false });
  console.log('Report 24 Screenshot saved to:', report24Screenshot);

  // B. Report 23 Verification: Expired Account Modal
  console.log('\n3. Testing Report 23: Expired Account Login...');
  await page.fill('#inbound-login-password', 'Kelvin820');
  await page.click('#inbound-login-submit-btn');
  await page.waitForTimeout(2000);

  const expiredText = await page.innerText('#inbound-login-error-feedback');
  console.log('Report 23 Expired Box text:', expiredText);

  const report23Screenshot = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5\\tc_exp01_live_expired_modal.png';
  await page.screenshot({ path: report23Screenshot, fullPage: false });
  console.log('Report 23 Screenshot saved to:', report23Screenshot);

  await browser.close();
})();
