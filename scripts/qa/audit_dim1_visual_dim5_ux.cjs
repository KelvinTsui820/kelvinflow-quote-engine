const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\dd190252-6867-43b6-8a91-8aa4a3e1f425';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('====================================================');
  console.log('AUDIT DIM-1 (VISUAL) & DIM-5 (UX) & COD-01 (CONSOLE)');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH
  });

  const auditReport = {
    vis01_colors: {},
    vis02_borders: {},
    vis03_logos: {},
    vis04_mobile_wraps: {},
    vis05_overflow: {},
    ux01_touch_targets: {},
    ux02_scrollbars: {},
    ux03_deadlinks: {},
    cod01_console_errors: []
  };

  // ----------------------------------------------------
  // TEST SET 1: DESKTOP 1440x900
  // ----------------------------------------------------
  console.log('\n>>> Starting Test Set 1: Desktop Viewport (1440x900) ...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const desktopPage = await desktopContext.newPage();

  desktopPage.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`[Console Error - Desktop] ${msg.text()}`);
      auditReport.cod01_console_errors.push({ viewport: 'desktop', page: desktopPage.url(), text: msg.text() });
    }
  });
  desktopPage.on('pageerror', err => {
    console.error(`[Page Error - Desktop] ${err.message}`);
    auditReport.cod01_console_errors.push({ viewport: 'desktop', page: desktopPage.url(), text: err.message });
  });

  // Navigate to index.html
  await desktopPage.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1000);

  // Take Full Landing Page Screenshot (Desktop)
  const pDeskFull = path.join(ARTIFACT_DIR, 'vis_desktop_1440_full.png');
  await desktopPage.screenshot({ path: pDeskFull, fullPage: true });
  console.log(`[Screenshot] Desktop full page saved: ${pDeskFull}`);

  // VIS-01: Check Colors on Primary Buttons and Titles
  console.log('\n--- Checking VIS-01: Colors ---');
  const colors = await desktopPage.evaluate(() => {
    const primaryCta = document.querySelector('#nav-trial-btn') || document.querySelector('a[data-path="signup"]');
    const heroTitle = document.querySelector('h1');
    const aiBadge = document.querySelector('header span.bg-\\[\\#FEF3C7\\]') || document.querySelector('header span:has-text("AI")');
    return {
      ctaBg: primaryCta ? window.getComputedStyle(primaryCta).backgroundColor : null,
      ctaColor: primaryCta ? window.getComputedStyle(primaryCta).color : null,
      titleColor: heroTitle ? window.getComputedStyle(heroTitle).color : null,
      aiBadgeBg: aiBadge ? window.getComputedStyle(aiBadge).backgroundColor : null,
      aiBadgeColor: aiBadge ? window.getComputedStyle(aiBadge).color : null
    };
  });
  console.log('VIS-01 Colors captured:', colors);
  auditReport.vis01_colors = colors;

  // VIS-03: Check 4 Logos
  console.log('\n--- Checking VIS-03: Logos ---');
  const logoInfo = await desktopPage.evaluate(() => {
    const headerLogo = document.querySelector('header img[src*="k_logo.svg"]');
    const footerLogo = document.querySelector('footer img[src*="k_logo.svg"]');
    const heroLogo = document.querySelector('section img[src*="k_logo.svg"]');
    return {
      header: headerLogo ? {
        box: headerLogo.getBoundingClientRect(),
        naturalWidth: headerLogo.naturalWidth,
        naturalHeight: headerLogo.naturalHeight
      } : null,
      footer: footerLogo ? {
        box: footerLogo.getBoundingClientRect(),
        naturalWidth: footerLogo.naturalWidth,
        naturalHeight: footerLogo.naturalHeight
      } : null,
      hero: heroLogo ? {
        box: heroLogo.getBoundingClientRect(),
        naturalWidth: heroLogo.naturalWidth,
        naturalHeight: heroLogo.naturalHeight
      } : null
    };
  });
  console.log('Logos geometry:', logoInfo);
  auditReport.vis03_logos = logoInfo;

  // VIS-05: Check Horizontal Overflow on Desktop
  console.log('\n--- Checking VIS-05: Desktop Horizontal Overflow ---');
  const desktopOverflow = await desktopPage.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    return {
      scrollWidth: docEl.scrollWidth,
      clientWidth: docEl.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
      hasHorizontalOverflow: docEl.scrollWidth > docEl.clientWidth
    };
  });
  console.log('Desktop Overflow status:', desktopOverflow);
  auditReport.vis05_overflow.desktop = desktopOverflow;

  // UX-02: Check Desktop Native Scrollbar
  console.log('\n--- Checking UX-02: Desktop Scrollbar ---');
  const scrollbarStatus = await desktopPage.evaluate(() => {
    const initialY = window.scrollY;
    window.scrollTo(0, 500);
    const scrolledY = window.scrollY;
    window.scrollTo(0, 0);
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    return {
      canScroll: scrolledY > initialY,
      scrollbarWidth: scrollbarWidth,
      htmlOverflow: window.getComputedStyle(document.documentElement).overflowY,
      bodyOverflow: window.getComputedStyle(document.body).overflowY
    };
  });
  console.log('Scrollbar status:', scrollbarStatus);
  auditReport.ux02_scrollbars = scrollbarStatus;

  // UX-03: Check Dead Links & javascript:void(0)
  console.log('\n--- Checking UX-03: Dead links in index.html ---');
  const deadLinks = await desktopPage.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.map(l => ({
      href: l.getAttribute('href'),
      text: (l.textContent || '').trim().slice(0, 40),
      onclick: l.getAttribute('onclick'),
      outerHtml: l.outerHTML.slice(0, 120)
    })).filter(l => !l.href || l.href.includes('javascript:void') || l.href === '#');
  });
  console.log(`Dead links found: ${deadLinks.length}`);
  deadLinks.forEach(dl => console.log(`  - [${dl.text}] href="${dl.href}" | onclick="${dl.onclick}"`));
  auditReport.ux03_deadlinks.index = deadLinks;

  // ----------------------------------------------------
  // TEST SET 2: MOBILE 375x812 (iPhone X / SE Viewport)
  // ----------------------------------------------------
  console.log('\n>>> Starting Test Set 2: Mobile Viewport (375x812) ...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();

  mobilePage.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`[Console Error - Mobile] ${msg.text()}`);
      auditReport.cod01_console_errors.push({ viewport: 'mobile', page: mobilePage.url(), text: msg.text() });
    }
  });
  mobilePage.on('pageerror', err => {
    console.error(`[Page Error - Mobile] ${err.message}`);
    auditReport.cod01_console_errors.push({ viewport: 'mobile', page: mobilePage.url(), text: err.message });
  });

  await mobilePage.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);

  // Take Full Mobile Screenshot
  const pMobFull = path.join(ARTIFACT_DIR, 'vis_mobile_375_full.png');
  await mobilePage.screenshot({ path: pMobFull, fullPage: true });
  console.log(`[Screenshot] Mobile full page saved: ${pMobFull}`);

  // VIS-04: Mobile Text Wraps
  console.log('\n--- Checking VIS-04: Mobile Text Wrapping & Breakpoints ---');
  const mobileWrapInfo = await mobilePage.evaluate(() => {
    // Check Hero Badge
    const heroBadge = document.querySelector('section div.inline-flex.items-center.gap-1\\.5.px-3\\.5');
    const heroH1 = document.querySelector('h1');
    return {
      heroBadgeText: heroBadge ? heroBadge.textContent.trim().replace(/\s+/g, ' ') : null,
      heroBadgeHeight: heroBadge ? heroBadge.getBoundingClientRect().height : null,
      heroH1Text: heroH1 ? heroH1.textContent.trim().replace(/\s+/g, ' ') : null,
      heroH1Height: heroH1 ? heroH1.getBoundingClientRect().height : null
    };
  });
  console.log('Mobile Wrap Info:', mobileWrapInfo);
  auditReport.vis04_mobile_wraps = mobileWrapInfo;

  // VIS-05: Mobile Horizontal Overflow
  console.log('\n--- Checking VIS-05: Mobile Horizontal Overflow ---');
  const mobileOverflow = await mobilePage.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    return {
      scrollWidth: docEl.scrollWidth,
      clientWidth: docEl.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
      hasHorizontalOverflow: docEl.scrollWidth > docEl.clientWidth
    };
  });
  console.log('Mobile Overflow status:', mobileOverflow);
  auditReport.vis05_overflow.mobile = mobileOverflow;

  // UX-01: Mobile Touch Targets Check
  console.log('\n--- Checking UX-01: Mobile Touch Targets (>= 44x44px) ---');
  const touchTargets = await mobilePage.evaluate(() => {
    const clickables = Array.from(document.querySelectorAll('button, a, input[type="checkbox"], input[type="radio"], [role="button"]'));
    return clickables.map(el => {
      const rect = el.getBoundingClientRect();
      const text = (el.textContent || el.getAttribute('aria-label') || el.id || '').trim().slice(0, 30);
      const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id,
        text: text,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        isVisible,
        isUnder44: isVisible && (rect.width < 44 || rect.height < 44)
      };
    }).filter(t => t.isVisible);
  });

  const under44Items = touchTargets.filter(t => t.isUnder44);
  console.log(`Total visible clickable items on mobile: ${touchTargets.length}`);
  console.log(`Clickable items with touch target < 44px: ${under44Items.length}`);
  if (under44Items.length > 0) {
    console.log('Sample items under 44px:');
    under44Items.slice(0, 10).forEach(item => {
      console.log(`  - <${item.tag}> id="${item.id}" text="${item.text}": ${item.width}x${item.height}px`);
    });
  }
  auditReport.ux01_touch_targets = {
    total: touchTargets.length,
    under44Count: under44Items.length,
    items: under44Items
  };

  // ----------------------------------------------------
  // TEST SET 3: REVIEW.HTML (WORKBENCH) DEADLINKS & ERRORS
  // ----------------------------------------------------
  console.log('\n>>> Starting Test Set 3: Workbench (review.html) Inspection ...');
  await desktopPage.goto('http://localhost:3000/review.html', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1500);

  const pReviewFull = path.join(ARTIFACT_DIR, 'vis_workbench_desktop_full.png');
  await desktopPage.screenshot({ path: pReviewFull, fullPage: false });
  console.log(`[Screenshot] Workbench screenshot saved: ${pReviewFull}`);

  const reviewDeadLinks = await desktopPage.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.map(l => ({
      href: l.getAttribute('href'),
      text: (l.textContent || '').trim().slice(0, 40),
      onclick: l.getAttribute('onclick')
    })).filter(l => !l.href || l.href.includes('javascript:void') || l.href === '#');
  });
  console.log(`Workbench dead links found: ${reviewDeadLinks.length}`);
  auditReport.ux03_deadlinks.workbench = reviewDeadLinks;

  // Save JSON report
  const jsonOut = path.join(ARTIFACT_DIR, 'dim1_dim5_audit_result.json');
  fs.writeFileSync(jsonOut, JSON.stringify(auditReport, null, 2), 'utf8');
  console.log(`\nAudit results written to: ${jsonOut}`);

  await browser.close();
  console.log('\nDIM-1 & DIM-5 AUDIT FINISHED SUCCESSFULLY.');
})();
