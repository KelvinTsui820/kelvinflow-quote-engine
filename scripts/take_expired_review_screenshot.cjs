const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await context.addInitScript(() => {
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
  });

  console.log('Navigating to https://quote.kelvinflow.com/review/latest ...');
  await page.goto('https://quote.kelvinflow.com/review/latest', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Click trial button in header
  const headerBtn = await page.$('button:has-text("试用")');
  if (headerBtn) {
    await headerBtn.click();
    await page.waitForTimeout(600);
  }

  // Click "已有工作邮箱登录" tab or link
  const loginTab = await page.$('button:has-text("已有工作邮箱登录")');
  if (loginTab) {
    await loginTab.click();
    await page.waitForTimeout(600);
  } else {
    const loginLink = await page.$('text=点击此处直接输入工作邮箱密码登录');
    if (loginLink) {
      await loginLink.click();
      await page.waitForTimeout(600);
    }
  }

  // Check if #trial-login-email is visible
  const emailInput = await page.$('#trial-login-email');
  if (emailInput) {
    console.log('Filling login form...');
    await emailInput.fill('tsuikelvin82099@gmail.com');
    await page.fill('#trial-login-password', 'Kelvin820');
    
    // Submit
    const submitBtn = await page.$('button:has-text("验证密码并进入系统")');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(3000);

    const shotPath = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5\\tc_exp01_review_expired_modal.png';
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log('Saved to:', shotPath);
  } else {
    console.log('emailInput still not found!');
  }

  await browser.close();
})();
