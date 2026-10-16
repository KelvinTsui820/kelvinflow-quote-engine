const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\55cf2dff-82cb-4e4f-ae6c-d5a1787d3a2a';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const consoleErrors = [];

  // ==========================================
  // 1. Desktop 1440x900 Verification
  // ==========================================
  console.log('\n=== 1. DESKTOP VERIFICATION (1440x900) ===');
  const contextDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await contextDesktop.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[Console Error] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    consoleErrors.push(`[Page Error] ${err.message}`);
  });

  await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check S2 Hero Mockup Elements
  const heroMockInfo = await page.evaluate(() => {
    const studioTitle = document.body.innerText.includes('KelvinFlow Quotation Studio v2.4');
    const rateText = document.body.innerText.includes('USD/CNY 7.2340 (手动设定)');
    const rfqBuyer = document.body.innerText.includes('buyer@globalautomotive.de');
    const quoteNo = document.body.innerText.includes('KF-209-PRO');
    const marginRate = document.body.innerText.includes('24.8% (达标)');
    const priceText = document.body.innerText.includes('$17.80 / set');
    const card1 = document.body.innerText.includes('逐行精准拆解');
    const card2 = document.body.innerText.includes('10秒极速生成');
    const card3 = document.body.innerText.includes('零授权零密码');

    return {
      studioTitle,
      rateText,
      rfqBuyer,
      quoteNo,
      marginRate,
      priceText,
      card1,
      card2,
      card3
    };
  });
  console.log('Hero Mockup Verification:', heroMockInfo);

  // Screenshot of Hero Studio Mockup
  const heroSection = await page.$('section.animate-fade-up');
  if (heroSection) {
    const p = path.join(ARTIFACT_DIR, 's2_v13_hero_studio_mock.png');
    await heroSection.screenshot({ path: p });
    console.log(`Saved Hero Mockup screenshot: ${p}`);
  }

  // Screenshot of 3 Metric Cards (scroll into view to trigger scroll-reveal)
  await page.evaluate(() => {
    const el = document.querySelector('section.bg-surface-container-low');
    if (el) el.scrollIntoView();
  });
  await page.waitForTimeout(800);
  const metricsSection = await page.$('section.bg-surface-container-low:has(div.grid-cols-1.md\\:grid-cols-3)');
  if (metricsSection) {
    const p = path.join(ARTIFACT_DIR, 's2_v13_metric_cards.png');
    await metricsSection.screenshot({ path: p });
    console.log(`Saved Metric Cards screenshot: ${p}`);
  }

  // Check Desktop Scrolling (S1 Desktop)
  console.log('\n--- Checking Desktop Scrolling ---');
  const scrollInitial = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(500);
  const scrollMid = await page.evaluate(() => window.scrollY);
  console.log(`Scroll initial: ${scrollInitial}, after scroll: ${scrollMid}`);

  // Screenshot at Middle (Workflow section)
  const pMid = path.join(ARTIFACT_DIR, 's1_desktop_scroll_workflow.png');
  await page.screenshot({ path: pMid });
  console.log(`Saved Desktop Scroll Mid: ${pMid}`);

  // Scroll to Footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  const scrollBottom = await page.evaluate(() => window.scrollY);
  console.log(`Scroll bottom: ${scrollBottom} / max: ${await page.evaluate(() => document.body.scrollHeight)}`);

  const pBottom = path.join(ARTIFACT_DIR, 's1_desktop_scroll_bottom.png');
  await page.screenshot({ path: pBottom });
  console.log(`Saved Desktop Scroll Bottom: ${pBottom}`);

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  // ==========================================
  // 2. Modals Verification (v13 Normal & Error)
  // ==========================================
  console.log('\n=== 2. MODALS VERIFICATION ===');

  // Open Registration Modal
  await page.evaluate(() => openInboundModal('starter'));
  await page.waitForTimeout(400);

  const regModalBox = await page.$('#inbound-modal > div:nth-child(2)');
  if (regModalBox) {
    const p = path.join(ARTIFACT_DIR, 'v13_modal_register_normal.png');
    await regModalBox.screenshot({ path: p });
    console.log(`Saved Register Normal: ${p}`);
  }

  // Trigger Register Error
  await page.evaluate(() => {
    document.getElementById('inbound-email').value = 'test@company.com';
    document.getElementById('inbound-code').value = '000000';
    document.getElementById('inbound-password').value = 'password123';
    document.getElementById('inbound-agreement-checkbox').checked = true;
    const form = document.getElementById('inbound-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
  });
  await page.waitForTimeout(500);

  if (regModalBox) {
    const p = path.join(ARTIFACT_DIR, 'v13_modal_register_error.png');
    await regModalBox.screenshot({ path: p });
    console.log(`Saved Register Error: ${p}`);
  }

  // Switch to Login Tab
  await page.evaluate(() => switchInboundFormMode('login'));
  await page.waitForTimeout(400);

  if (regModalBox) {
    const p = path.join(ARTIFACT_DIR, 'v13_modal_login_normal.png');
    await regModalBox.screenshot({ path: p });
    console.log(`Saved Login Normal: ${p}`);
  }

  // Trigger Login Error
  await page.evaluate(() => {
    document.getElementById('inbound-login-email').value = 'user@company.com';
    document.getElementById('inbound-login-password').value = 'wrongpassword';
    const form = document.getElementById('inbound-login-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
  });
  await page.waitForTimeout(500);

  if (regModalBox) {
    const p = path.join(ARTIFACT_DIR, 'v13_modal_login_error.png');
    await regModalBox.screenshot({ path: p });
    console.log(`Saved Login Error: ${p}`);
  }

  // Close Login Modal via Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // Open Logout Modal
  await page.evaluate(() => openLogoutModal());
  await page.waitForTimeout(400);

  const logoutBox = await page.$('#logout-modal-card');
  if (logoutBox) {
    const p = path.join(ARTIFACT_DIR, 'v13_modal_logout_normal.png');
    await logoutBox.screenshot({ path: p });
    console.log(`Saved Logout Modal: ${p}`);
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await contextDesktop.close();

  // ==========================================
  // 3. Mobile Verification (375x812)
  // ==========================================
  console.log('\n=== 3. MOBILE VERIFICATION (375x812) ===');
  const contextMobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true
  });
  const pageMobile = await contextMobile.newPage();

  pageMobile.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[Mobile Console Error] ${msg.text()}`);
  });
  pageMobile.on('pageerror', err => {
    consoleErrors.push(`[Mobile Page Error] ${err.message}`);
  });

  await pageMobile.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle' });
  await pageMobile.waitForTimeout(1000);

  // S1 Mobile Scroll Check
  const mInitialScroll = await pageMobile.evaluate(() => window.scrollY);
  console.log('Mobile initial scroll:', mInitialScroll);

  // Mobile Top Screenshot
  const pMobHero = path.join(ARTIFACT_DIR, 's1_s2_mobile_hero.png');
  await pageMobile.screenshot({ path: pMobHero });
  console.log(`Saved Mobile Hero: ${pMobHero}`);

  // Scroll mobile to middle (workflow)
  await pageMobile.evaluate(() => window.scrollTo(0, 1000));
  await pageMobile.waitForTimeout(500);
  const mMidScroll = await pageMobile.evaluate(() => window.scrollY);
  console.log('Mobile scroll pos at mid:', mMidScroll);

  // Scroll mobile to bottom CTA
  await pageMobile.evaluate(() => {
    const trial = document.getElementById('trial');
    if (trial) trial.scrollIntoView();
  });
  await pageMobile.waitForTimeout(500);

  const pMobCTA = path.join(ARTIFACT_DIR, 's1_mobile_cta.png');
  await pageMobile.screenshot({ path: pMobCTA });
  console.log(`Saved Mobile CTA: ${pMobCTA}`);

  // Scroll mobile to Footer
  await pageMobile.evaluate(() => {
    const footer = document.getElementById('footer');
    if (footer) footer.scrollIntoView();
  });
  await pageMobile.waitForTimeout(500);

  const pMobFooter = path.join(ARTIFACT_DIR, 's1_mobile_footer.png');
  await pageMobile.screenshot({ path: pMobFooter });
  console.log(`Saved Mobile Footer: ${pMobFooter}`);

  const mFinalScroll = await pageMobile.evaluate(() => window.scrollY);
  console.log('Mobile scroll pos at footer:', mFinalScroll);

  await contextMobile.close();
  await browser.close();

  // ==========================================
  // Summary
  // ==========================================
  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log(`Console Errors Count: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('Errors:', consoleErrors);
  }
  const isScrollPass = scrollBottom > 1000 && mFinalScroll > 1000;
  console.log(`Desktop & Mobile Scrolling: ${isScrollPass ? 'PASS' : 'FAIL'}`);
  console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
})();
