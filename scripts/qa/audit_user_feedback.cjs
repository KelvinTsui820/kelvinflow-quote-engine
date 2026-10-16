const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('====================================================');
  console.log('AUDIT USER FEEDBACK - ALL 5 SCREENSHOT ITEMS');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true, executablePath: CHROME_PATH });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('[Console Error]', msg.text());
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // 1. Check Header Logo
  const headerLogo = await page.evaluate(() => {
    const a = document.querySelector('header a[data-path="landing-page"]');
    const img = a.querySelector('img');
    const span = a.querySelector('span');
    const badge = a.querySelector('span > span') || a.querySelectorAll('span')[1];
    const rImg = img.getBoundingClientRect();
    return {
      aClass: a.className,
      imgClass: img.className,
      imgSrc: img.getAttribute('src'),
      imgWidth: rImg.width,
      imgHeight: rImg.height,
      spanText: span.innerText,
      badgeText: badge ? badge.innerText : null
    };
  });
  console.log('1. Header Logo Check:', headerLogo);

  // 2. Check Footer Logo
  const footerLogo = await page.evaluate(() => {
    const footer = document.querySelector('footer#footer');
    const logoDiv = footer.querySelector('.flex.items-end.gap-1\\.5') || footer.querySelector('img').parentElement;
    const img = footer.querySelector('img');
    const span = logoDiv.querySelector('span');
    const badge = logoDiv.querySelector('span:nth-of-type(2)');
    const rImg = img.getBoundingClientRect();
    return {
      logoDivClass: logoDiv.className,
      imgSrc: img.getAttribute('src'),
      imgWidth: rImg.width,
      imgHeight: rImg.height,
      spanText: span ? span.innerText : null,
      badgeText: badge ? badge.innerText : null
    };
  });
  console.log('2. Footer Logo Check:', footerLogo);

  // 3. Open Starter Modal & Check Modal Logo + Agreement Checkbox Wrapping
  await page.click('#nav-trial-btn');
  await page.waitForTimeout(400);

  const modalCheck = await page.evaluate(() => {
    const modal = document.querySelector('#inbound-modal');
    const card = modal.querySelector('.max-w-\\[480px\\]') || modal.querySelector('.max-w-\\[440px\\]');
    const logoImg = modal.querySelector('img');
    const rLogo = logoImg.getBoundingClientRect();
    
    // Check agreement label
    const label = document.querySelector('label[for="inbound-agreement-checkbox"]');
    const rLabel = label.getBoundingClientRect();
    
    // Compute if label wrapped (height check)
    // At text-[11px], line-height is ~14-16px. If wrapped, height would be >= 26px!
    const isSingleLine = rLabel.height <= 20;

    return {
      cardClass: card ? card.className : null,
      logoWidth: rLogo.width,
      logoHeight: rLogo.height,
      labelHeight: rLabel.height,
      labelWidth: rLabel.width,
      isSingleLine,
      labelClass: label.className,
      labelText: label.innerText
    };
  });
  console.log('3. Modal Logo & Agreement Wrapping Check:', modalCheck);

  await page.screenshot({ path: 'scratch_modal_audit.png' });

  // Close modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 4. Test "功能特性" Click & Scroll offset
  await page.click('header nav a[href="#features"]');
  await page.waitForTimeout(800);

  const scrollCheck = await page.evaluate(() => {
    const sec = document.getElementById('features');
    const r = sec.getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      sectionTopInViewport: r.top,
      sectionHeight: r.height,
      // Target should be offset ~72px under top, so r.top should be around 72px (+-5px)
      isAccuratelyOffset: Math.abs(r.top - 72) <= 5
    };
  });
  console.log('4. Nav Anchor #features Jump Check:', scrollCheck);
  await page.screenshot({ path: 'scratch_features_jump_audit.png' });

  // 5. Test Hero image
  const heroImgCheck = await page.evaluate(() => {
    const img = document.querySelector('img[alt="KelvinFlow Quotation Review Interface Preview"]');
    return {
      src: img.getAttribute('src'),
      width: img.naturalWidth,
      height: img.naturalHeight,
      complete: img.complete
    };
  });
  console.log('5. Hero Mockup Image Check:', heroImgCheck);

  console.log('Console Errors count:', consoleErrors.length);

  await browser.close();
})();
