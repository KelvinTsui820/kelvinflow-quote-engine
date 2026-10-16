const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('====================================================');
  console.log('AUDIT USER FEEDBACK ROUND 6 - ALL 5 ITEMS VERIFICATION');
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

  // ----------------------------------------------------
  // ITEM 1: 注册弹窗协议精简（删除保密承诺，仅保留用户服务协议）
  // ----------------------------------------------------
  await page.evaluate(() => openInboundModal('starter'));
  await page.waitForTimeout(300);

  const agreementCheck = await page.evaluate(() => {
    const checkbox = document.getElementById('inbound-agreement-checkbox');
    const label = document.querySelector('label[for="inbound-agreement-checkbox"]');
    const labelText = label ? label.innerText.replace(/\s+/g, ' ').trim() : '';
    const hasPrivacy = labelText.includes('隐私') || labelText.includes('保密承诺');
    const hasTerms = labelText.includes('用户服务协议');
    const rect = label ? label.getBoundingClientRect() : null;
    return {
      checkboxExists: !!checkbox,
      labelText,
      hasPrivacy,
      hasTerms,
      labelHeight: rect ? rect.height : 0,
      labelWidth: rect ? rect.width : 0
    };
  });
  console.log('1. Agreement Simplification Check:', agreementCheck);

  if (agreementCheck.hasPrivacy) {
    throw new Error('FAIL: Agreement still contains privacy/confidentiality text!');
  }
  if (!agreementCheck.hasTerms) {
    throw new Error('FAIL: Agreement does not contain terms text!');
  }

  await page.evaluate(() => closeInboundModal());
  await page.waitForTimeout(300);

  // ----------------------------------------------------
  // ITEM 2: Section 2 特性卡片 hover 动画效果
  // ----------------------------------------------------
  const cardsHoverCheck = await page.evaluate(async () => {
    const section = document.getElementById('features');
    const cards = section.querySelectorAll('.grid > div');
    const results = [];
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const hasGroup = card.classList.contains('group');
      const hasHoverTranslate = Array.from(card.classList).some(c => c.includes('hover:-translate-y'));
      const hasHoverShadow = Array.from(card.classList).some(c => c.includes('hover:shadow'));
      const hasTransition = Array.from(card.classList).some(c => c.includes('transition'));
      const icon = card.querySelector('.w-10.h-10');
      const iconHasHover = icon && Array.from(icon.classList).some(c => c.includes('group-hover'));
      results.push({
        index: i + 1,
        hasGroup,
        hasHoverTranslate,
        hasHoverShadow,
        hasTransition,
        iconHasHover
      });
    }
    return results;
  });
  console.log('2. Section 2 Cards Hover Animation Check:', cardsHoverCheck);
  const allCardsHaveHover = cardsHoverCheck.every(c => c.hasGroup && c.hasHoverTranslate && c.hasHoverShadow && c.hasTransition);
  if (!allCardsHaveHover) {
    throw new Error('FAIL: Section 2 Metric cards missing hover animation classes!');
  }

  // ----------------------------------------------------
  // ITEM 3: Hero 主图 1:1 对版最新设计稿 (Quotation Studio v2.4)
  // ----------------------------------------------------
  const heroMockupCheck = await page.evaluate(() => {
    const el = document.querySelector('[aria-label="KelvinFlow Quotation Review Interface Preview"]');
    if (!el) return { found: false };
    const text = el.innerText;
    return {
      found: true,
      hasStudioTitle: text.includes('Quotation Studio v2.4'),
      hasFxRate: text.includes('USD/CNY 7.2340'),
      hasIncomingRfq: text.includes('原始询盘邮件') || text.includes('Incoming RFQ'),
      hasBuyerEmail: text.includes('buyer@globalautomotive.de'),
      hasPriceMatching: text.includes('KF-209-PRO') && text.includes('$17.80'),
      hasProfitMargin: text.includes('24.8%')
    };
  });
  console.log('3. Hero Mockup Latest Design Check:', heroMockupCheck);
  if (!heroMockupCheck.found || !heroMockupCheck.hasStudioTitle || !heroMockupCheck.hasPriceMatching) {
    throw new Error('FAIL: Hero Mockup does not match latest design!');
  }

  // ----------------------------------------------------
  // ITEM 4: Header Logo Hover 不抖动位移校验
  // ----------------------------------------------------
  const headerLogoCheck = await page.evaluate(async () => {
    const a = document.querySelector('header a[data-path="landing-page"]');
    const span = a.querySelector('span');
    const initialRect = span.getBoundingClientRect();
    const hasScaleOnAnchor = Array.from(a.classList).some(c => c.includes('hover:scale'));

    // Simulate hover by adding group-hover / hovering
    return {
      aClass: a.className,
      hasScaleOnAnchor,
      textX: initialRect.x,
      textY: initialRect.y,
      textWidth: initialRect.width,
      textHeight: initialRect.height
    };
  });
  console.log('4. Header Logo Static Stability Check:', headerLogoCheck);
  if (headerLogoCheck.hasScaleOnAnchor) {
    throw new Error('FAIL: Header Logo anchor still has hover:scale which causes font jitter!');
  }

  // Hover test on header logo using Playwright mouse
  const headerAnchor = await page.locator('header a[data-path="landing-page"]');
  const spanBefore = await headerAnchor.locator('span').first().boundingBox();
  await headerAnchor.hover();
  await page.waitForTimeout(150);
  const spanAfter = await headerAnchor.locator('span').first().boundingBox();
  const fontShiftX = Math.abs(spanAfter.x - spanBefore.x);
  const fontShiftY = Math.abs(spanAfter.y - spanBefore.y);
  console.log('Header Logo Hover font shift:', { fontShiftX, fontShiftY });
  if (fontShiftX > 0.5 || fontShiftY > 0.5) {
    throw new Error(`FAIL: Header Logo font shifted on hover! Delta: (${fontShiftX}, ${fontShiftY})`);
  }

  // ----------------------------------------------------
  // ITEM 5: Footer Logo 样式与 hover 效果校验
  // ----------------------------------------------------
  const footerLogoCheck = await page.evaluate(() => {
    const footer = document.querySelector('footer');
    const a = footer.querySelector('a[aria-label="KelvinFlow 首页"]') || footer.querySelector('a[href="/"]');
    if (!a) return { found: false };
    const img = a.querySelector('img');
    const span = a.querySelector('span');
    const badge = a.querySelector('span + span') || a.querySelectorAll('span')[1];
    const rImg = img.getBoundingClientRect();
    const hasScaleOnAnchor = Array.from(a.classList).some(c => c.includes('hover:scale'));
    const isLink = a.tagName === 'A';
    const hasHoverEffect = Array.from(a.classList).some(c => c.includes('hover:'));
    return {
      found: true,
      isLink,
      hasHoverEffect,
      hasScaleOnAnchor,
      imgWidth: rImg.width,
      imgHeight: rImg.height,
      spanText: span ? span.innerText : '',
      badgeText: badge ? badge.innerText : ''
    };
  });
  console.log('5. Footer Logo Check:', footerLogoCheck);
  if (!footerLogoCheck.found || !footerLogoCheck.isLink || !footerLogoCheck.hasHoverEffect || footerLogoCheck.hasScaleOnAnchor) {
    throw new Error('FAIL: Footer Logo is not an interactive link with matching hover effect!');
  }

  // Check 375px mobile viewport for Item 1
  await page.setViewportSize({ width: 375, height: 667 });
  await page.evaluate(() => openInboundModal('starter'));
  await page.waitForTimeout(300);

  const mobileAgreementCheck = await page.evaluate(() => {
    const label = document.querySelector('label[for="inbound-agreement-checkbox"]');
    const rect = label ? label.getBoundingClientRect() : null;
    return {
      height: rect ? rect.height : 0,
      width: rect ? rect.width : 0
    };
  });
  console.log('Mobile 375px Agreement Check:', mobileAgreementCheck);

  // Take visual sign-off screenshots
  const targetDir = path.join('F:', 'gemini test report', 'screenshots');
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  await page.screenshot({ path: path.join(targetDir, 'r6_mobile_modal_agreement.png') });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => closeInboundModal());
  await page.waitForTimeout(200);

  // Screenshot header logo
  const headerEl = await page.locator('header');
  await headerEl.screenshot({ path: path.join(targetDir, 'r6_desktop_header_logo.png') });

  // Screenshot hero mockup
  const heroMockupEl = await page.locator('[aria-label="KelvinFlow Quotation Review Interface Preview"]');
  await heroMockupEl.screenshot({ path: path.join(targetDir, 'r6_hero_quotation_studio.png') });

  // Screenshot metric cards
  const featuresEl = await page.locator('#features');
  await featuresEl.screenshot({ path: path.join(targetDir, 'r6_metric_cards_hover.png') });

  // Screenshot footer logo
  const footerEl = await page.locator('footer');
  await footerEl.screenshot({ path: path.join(targetDir, 'r6_desktop_footer_logo.png') });

  console.log('\nAll 5 visual sign-off screenshots saved successfully!');
  console.log('Console Errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    throw new Error('FAIL: Console errors detected!');
  }

  await browser.close();
  console.log('\n====================================================');
  console.log('ALL ROUND 6 AUDIT ASSERTIONS PASSED PERFECTLY!');
  console.log('====================================================');
})().catch(err => {
  console.error('\nAUDIT FAILED:', err.message);
  process.exit(1);
});
