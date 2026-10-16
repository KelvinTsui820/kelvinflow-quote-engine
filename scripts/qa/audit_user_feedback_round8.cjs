const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const REPORT_DIR = 'F:\\gemini test report';
const ARTIFACT_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\55cf2dff-82cb-4e4f-ae6c-d5a1787d3a2a';

(async () => {
  console.log('====================================================');
  console.log('AUDIT USER FEEDBACK ROUND 8 - ZERO LAYOUT SHIFT & OFFICIAL EMAIL');
  console.log('====================================================\n');

  const browser = await chromium.launch({ 
    headless: false,
    executablePath: CHROME_PATH,
    args: ['--window-size=1920,1080']
  });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // --- ITEM 1: NAV BAR HORIZONTAL SHIFT AUDIT ---
  console.log('--- Item 1: Nav Bar Horizontal Layout Shift Audit ---');

  const getMetrics = async () => page.evaluate(() => {
    const header = document.querySelector('header');
    const inner = header.querySelector('div');
    const loginBtn = document.getElementById('nav-login-btn');
    const trialBtn = document.getElementById('nav-trial-btn');
    const logoSpan = header.querySelector('span.text-xl');
    const h1 = document.querySelector('h1');
    return {
      headerWidth: header.getBoundingClientRect().width,
      innerX: inner.getBoundingClientRect().x,
      loginBtnX: loginBtn ? loginBtn.getBoundingClientRect().x : null,
      trialBtnX: trialBtn ? trialBtn.getBoundingClientRect().x : null,
      logoX: logoSpan ? logoSpan.getBoundingClientRect().x : null,
      h1X: h1 ? h1.getBoundingClientRect().x : null,
      hasScrollbarGutter: getComputedStyle(document.documentElement).scrollbarGutter.includes('stable'),
      headerHasTransitionAll: header.classList.contains('transition-all')
    };
  });

  const baseMetrics = await getMetrics();
  console.log('Base Initial Metrics (No Modal):', {
    innerX: baseMetrics.innerX,
    loginBtnX: baseMetrics.loginBtnX,
    trialBtnX: baseMetrics.trialBtnX,
    logoX: baseMetrics.logoX,
    headerWidth: baseMetrics.headerWidth,
    hasScrollbarGutter: baseMetrics.hasScrollbarGutter,
    headerHasTransitionAll: baseMetrics.headerHasTransitionAll
  });

  if (!baseMetrics.hasScrollbarGutter) {
    throw new Error('FAIL: documentElement is missing scrollbar-gutter: stable!');
  }
  if (baseMetrics.headerHasTransitionAll) {
    throw new Error('FAIL: header still contains transition-all!');
  }

  // 1.1 Test Login Modal
  console.log('\n[1.1] Testing Login Modal open/close shift...');
  await page.click('#nav-login-btn');
  await page.waitForTimeout(300);
  const loginOpenMetrics = await getMetrics();

  const loginOpenInnerShift = Math.abs(loginOpenMetrics.innerX - baseMetrics.innerX);
  const loginOpenBtnShift = Math.abs(loginOpenMetrics.loginBtnX - baseMetrics.loginBtnX);
  const loginOpenLogoShift = Math.abs(loginOpenMetrics.logoX - baseMetrics.logoX);
  console.log(`Login Modal Open Shift: innerX delta = ${loginOpenInnerShift}px, loginBtnX delta = ${loginOpenBtnShift}px, logoX delta = ${loginOpenLogoShift}px`);

  if (loginOpenInnerShift > 0.5 || loginOpenBtnShift > 0.5) {
    throw new Error(`FAIL: Navbar shifted horizontally on login modal open! Shift: ${loginOpenInnerShift}px`);
  }

  // Save screenshot of modal open
  const modalOpenPath = path.join(REPORT_DIR, 'v15_navbar_stability_modal_open.png');
  await page.screenshot({ path: modalOpenPath });
  fs.copyFileSync(modalOpenPath, path.join(ARTIFACT_DIR, 'v15_navbar_stability_modal_open.png'));

  // Close Login Modal
  await page.click('#inbound-modal button[aria-label="关闭弹窗"]');
  await page.waitForTimeout(300);
  const loginCloseMetrics = await getMetrics();

  const loginCloseInnerShift = Math.abs(loginCloseMetrics.innerX - baseMetrics.innerX);
  const loginCloseBtnShift = Math.abs(loginCloseMetrics.loginBtnX - baseMetrics.loginBtnX);
  console.log(`Login Modal Close Shift: innerX delta = ${loginCloseInnerShift}px, loginBtnX delta = ${loginCloseBtnShift}px`);

  if (loginCloseInnerShift > 0.5 || loginCloseBtnShift > 0.5) {
    throw new Error(`FAIL: Navbar shifted horizontally on login modal close! Shift: ${loginCloseInnerShift}px`);
  }

  // 1.2 Test Starter (Free Trial) Modal
  console.log('\n[1.2] Testing Free Trial Modal open/close shift...');
  await page.click('#nav-trial-btn');
  await page.waitForTimeout(300);
  const trialOpenMetrics = await getMetrics();

  const trialOpenInnerShift = Math.abs(trialOpenMetrics.innerX - baseMetrics.innerX);
  const trialOpenBtnShift = Math.abs(trialOpenMetrics.trialBtnX - baseMetrics.trialBtnX);
  console.log(`Trial Modal Open Shift: innerX delta = ${trialOpenInnerShift}px, trialBtnX delta = ${trialOpenBtnShift}px`);

  if (trialOpenInnerShift > 0.5 || trialOpenBtnShift > 0.5) {
    throw new Error(`FAIL: Navbar shifted horizontally on trial modal open! Shift: ${trialOpenInnerShift}px`);
  }

  await page.click('#inbound-modal button[aria-label="关闭弹窗"]');
  await page.waitForTimeout(300);
  const trialCloseMetrics = await getMetrics();

  const trialCloseInnerShift = Math.abs(trialCloseMetrics.innerX - baseMetrics.innerX);
  console.log(`Trial Modal Close Shift: innerX delta = ${trialCloseInnerShift}px`);

  if (trialCloseInnerShift > 0.5) {
    throw new Error(`FAIL: Navbar shifted horizontally on trial modal close! Shift: ${trialCloseInnerShift}px`);
  }

  // Save screenshot of modal closed
  const modalClosedPath = path.join(REPORT_DIR, 'v15_navbar_stability_modal_closed.png');
  await page.screenshot({ path: modalClosedPath });
  fs.copyFileSync(modalClosedPath, path.join(ARTIFACT_DIR, 'v15_navbar_stability_modal_closed.png'));

  // --- ITEM 2: OFFICIAL FOOTER CONTACT EMAIL AUDIT ---
  console.log('\n--- Item 2: Official Footer Contact Email Audit ---');
  const footerEmailInfo = await page.evaluate(() => {
    const footer = document.querySelector('footer');
    const mailLink = footer ? footer.querySelector('a[href^="mailto:"]') : null;
    return {
      exists: !!mailLink,
      text: mailLink ? mailLink.textContent.trim() : null,
      href: mailLink ? mailLink.getAttribute('href') : null
    };
  });

  console.log('Footer Email Info:', footerEmailInfo);

  if (footerEmailInfo.text !== 'sales@kelvinflow.com') {
    throw new Error(`FAIL: Footer email text is not sales@kelvinflow.com! Found: ${footerEmailInfo.text}`);
  }
  if (footerEmailInfo.href !== 'mailto:sales@kelvinflow.com') {
    throw new Error(`FAIL: Footer email href is not mailto:sales@kelvinflow.com! Found: ${footerEmailInfo.href}`);
  }

  // Scroll to footer and take screenshot
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const footerPath = path.join(REPORT_DIR, 'v15_footer_official_email.png');
  await page.screenshot({ path: footerPath });
  fs.copyFileSync(footerPath, path.join(ARTIFACT_DIR, 'v15_footer_official_email.png'));

  // Check prohibited placeholder in index.html
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'index.html'), 'utf8');
  const hiCount = (indexHtml.split('hi@kelvinflow.com').length - 1);
  console.log(`Occurrences of 'hi@kelvinflow.com' in public/index.html: ${hiCount}`);
  if (hiCount !== 0) {
    throw new Error(`FAIL: Found placeholder hi@kelvinflow.com in public/index.html (${hiCount} occurrences)!`);
  }

  // Console error check
  console.log('\n--- Item 3: Console Error Audit ---');
  console.log('Total console errors:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
    throw new Error('FAIL: Console errors detected during audit!');
  }

  console.log('\n====================================================');
  console.log('>>> ALL ROUND 8 AUDIT & REGRESSION CHECKS PASSED <<<');
  console.log('====================================================');

  await browser.close();
})();
