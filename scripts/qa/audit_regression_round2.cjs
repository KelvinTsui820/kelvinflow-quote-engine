const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const ARTIFACT_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\dd190252-6867-43b6-8a91-8aa4a3e1f425';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('====================================================');
  console.log('KELVINFLOW REGRESSION AUDIT - ROUND 2 (10 DEFECTS)');
  console.log('====================================================\n');

  const regressionReport = {
    def01_send_code_route: {},
    def02_forbidden_words: {},
    def03_dead_links: {},
    def04_hero_main_graphic: {},
    def05_header_logo: {},
    def06_footer_logo: {},
    def07_metric_cards: {},
    def08_remember_device_default: {},
    def09_focus_trap: {},
    def10_mobile_touch_targets: {},
    cod01_runtime_console_errors: [],
    cod03_typecheck: {},
    cod03_unit_tests: {},
    summary: { total: 10, passed: 0, failed: 0 }
  };

  // ====================================================
  // TEST DEF-02: 8 FORBIDDEN WORDS COMPLIANCE SCAN
  // ====================================================
  console.log('>>> [DEF-02] Scanning 8 forbidden words across public/ and src/...');
  const FORBIDDEN_WORDS = ['99.4%', '180,000+', '95%', '一键', '实时汇率', '中国银行', '自动获取', 'Sinosure'];
  
  function scanFiles(dir, extensions, ignoreDirs = ['node_modules', '.git', 'dist', 'screenshots']) {
    let fileList = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (ignoreDirs.includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        fileList = fileList.concat(scanFiles(fullPath, extensions, ignoreDirs));
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  const filesToScan = ['public/index.html', 'public/review.html', ...scanFiles('src', ['.ts', '.js'])];
  const hitsByWord = {};
  FORBIDDEN_WORDS.forEach(w => hitsByWord[w] = []);
  let totalForbiddenHits = 0;

  filesToScan.forEach(f => {
    if (!fs.existsSync(f)) return;
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      FORBIDDEN_WORDS.forEach(w => {
        const reg = new RegExp(w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
        if (reg.test(l)) {
          totalForbiddenHits++;
          hitsByWord[w].push({ file: f, line: idx + 1, text: l.trim().slice(0, 100) });
        }
      });
    });
  });

  console.log(`Forbidden words total hits: ${totalForbiddenHits}`);
  FORBIDDEN_WORDS.forEach(w => {
    console.log(`  - "${w}": ${hitsByWord[w].length}`);
  });

  regressionReport.def02_forbidden_words = {
    totalHits: totalForbiddenHits,
    hitsByWord,
    verdict: totalForbiddenHits === 0 ? 'PASS' : 'FAIL (STILL VIOLATED)'
  };
  if (totalForbiddenHits === 0) regressionReport.summary.passed++; else regressionReport.summary.failed++;

  // ====================================================
  // TEST DEF-01: SEND-CODE ROUTE LIVE VERIFICATION
  // ====================================================
  console.log('\n>>> [DEF-01] Testing Verification Code Route Live Connectivity...');
  let sendCodeResStatus = null;
  let sendVerificationResStatus = null;
  try {
    const r1 = await fetch('http://localhost:3000/api/v1/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_regression_r2@exporttrade.com' })
    });
    sendCodeResStatus = r1.status;
  } catch (e) {
    sendCodeResStatus = 'ERR: ' + e.message;
  }

  try {
    const r2 = await fetch('http://localhost:3000/api/v1/auth/send-verification-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_regression_r2@exporttrade.com' })
    });
    sendVerificationResStatus = r2.status;
  } catch (e) {
    sendVerificationResStatus = 'ERR: ' + e.message;
  }

  // Check what index.html actually calls
  const indexHtmlContent = fs.readFileSync('public/index.html', 'utf8');
  const indexCallsSendVerification = indexHtmlContent.includes('/api/v1/auth/send-verification-code');
  const indexCallsSendCode = indexHtmlContent.includes("fetch('/api/v1/auth/send-code'") || indexHtmlContent.includes('fetch("/api/v1/auth/send-code"');

  console.log(`Endpoint /api/v1/auth/send-code status: ${sendCodeResStatus}`);
  console.log(`Endpoint /api/v1/auth/send-verification-code status: ${sendVerificationResStatus}`);
  console.log(`Does index.html call send-verification-code? ${indexCallsSendVerification}`);
  console.log(`Does index.html still call /api/v1/auth/send-code? ${indexCallsSendCode}`);

  const def01Passed = (sendCodeResStatus === 200 || indexCallsSendVerification) && !indexCallsSendCode;
  regressionReport.def01_send_code_route = {
    sendCodeResStatus,
    sendVerificationResStatus,
    indexCallsSendVerification,
    indexCallsSendCode,
    verdict: def01Passed ? 'PASS' : 'FAIL (STILL BROKEN / MISMATCH)'
  };
  if (def01Passed) regressionReport.summary.passed++; else regressionReport.summary.failed++;

  // ====================================================
  // PLAYWRIGHT AUDITS (DESKTOP & MOBILE)
  // ====================================================
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH
  });

  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopContext.newPage();

  desktopPage.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`[Console Error - Desktop] ${msg.text()}`);
      regressionReport.cod01_runtime_console_errors.push({ viewport: 'desktop', text: msg.text() });
    }
  });

  await desktopPage.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1000);

  // Capture Full Desktop Page (R2)
  const pDeskFullR2 = path.join(ARTIFACT_DIR, 'regression_r2_desktop_full.png');
  await desktopPage.screenshot({ path: pDeskFullR2, fullPage: true });
  console.log(`[Screenshot] Saved R2 desktop full page: ${pDeskFullR2}`);

  // ====================================================
  // TEST DEF-03: DEAD LINKS & javascript:void(0)
  // ====================================================
  console.log('\n>>> [DEF-03] Checking Dead Links & javascript:void(0)...');
  const deadLinks = await desktopPage.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.map(l => ({
      href: l.getAttribute('href'),
      text: (l.textContent || '').trim().slice(0, 40),
      onclick: l.getAttribute('onclick'),
      tag: l.tagName.toLowerCase()
    })).filter(l => !l.href || l.href.includes('javascript:void') || l.href === '#');
  });

  console.log(`Dead links remaining: ${deadLinks.length}`);
  deadLinks.forEach(dl => console.log(`  - [${dl.text}] href="${dl.href}" | onclick="${dl.onclick}"`));

  regressionReport.def03_dead_links = {
    count: deadLinks.length,
    links: deadLinks,
    verdict: deadLinks.length === 0 ? 'PASS' : 'FAIL (STILL HAS DEAD LINKS)'
  };
  if (deadLinks.length === 0) regressionReport.summary.passed++; else regressionReport.summary.failed++;

  // ====================================================
  // TEST DEF-05: HEADER LOGO SIZE & BOX
  // ====================================================
  console.log('\n>>> [DEF-05] Checking Header Logo Size and Margins...');
  const headerLogoInfo = await desktopPage.evaluate(() => {
    const img = document.querySelector('header img[src*="k_logo.svg"]');
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const styleAttr = img.getAttribute('style') || '';
    const computed = window.getComputedStyle(img);
    return {
      renderedWidth: Math.round(rect.width),
      renderedHeight: Math.round(rect.height),
      styleAttr,
      classes: img.className,
      marginTop: computed.marginTop,
      marginRight: computed.marginRight,
      marginBottom: computed.marginBottom,
      marginLeft: computed.marginLeft
    };
  });
  console.log('Header Logo Info:', headerLogoInfo);

  // Take screenshot of header logo element
  const headerLogoEl = await desktopPage.$('header a[data-path="landing-page"]');
  if (headerLogoEl) {
    const pHeaderLogo = path.join(ARTIFACT_DIR, 'regression_r2_header_logo.png');
    await headerLogoEl.screenshot({ path: pHeaderLogo });
    console.log(`[Screenshot] Saved R2 header logo: ${pHeaderLogo}`);
  }

  // Header logo passes if rendered height <= 34px and rendered width <= 34px and no crazy negative margins
  const headerLogoPassed = headerLogoInfo && headerLogoInfo.renderedHeight <= 34 && !headerLogoInfo.styleAttr.includes('-15px');
  regressionReport.def05_header_logo = {
    ...headerLogoInfo,
    verdict: headerLogoPassed ? 'PASS' : 'FAIL (LOGO STILL OVERSIZED / PROPORTION BROKEN)'
  };
  if (headerLogoPassed) regressionReport.summary.passed++; else regressionReport.summary.failed++;

  // ====================================================
  // TEST DEF-06: FOOTER LOGO SIZE & BOX
  // ====================================================
  console.log('\n>>> [DEF-06] Checking Footer Logo Size and Margins...');
  const footerLogoInfo = await desktopPage.evaluate(() => {
    const img = document.querySelector('footer img[src*="k_logo.svg"]');
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const styleAttr = img.getAttribute('style') || '';
    const computed = window.getComputedStyle(img);
    return {
      renderedWidth: Math.round(rect.width),
      renderedHeight: Math.round(rect.height),
      styleAttr,
      classes: img.className,
      marginTop: computed.marginTop,
      marginRight: computed.marginRight,
      marginBottom: computed.marginBottom,
      marginLeft: computed.marginLeft
    };
  });
  console.log('Footer Logo Info:', footerLogoInfo);

  const footerLogoEl = await desktopPage.$('footer div.flex.items-center.gap-1\\.5');
  if (footerLogoEl) {
    const pFooterLogo = path.join(ARTIFACT_DIR, 'regression_r2_footer_logo.png');
    await footerLogoEl.screenshot({ path: pFooterLogo });
    console.log(`[Screenshot] Saved R2 footer logo: ${pFooterLogo}`);
  }

  const footerLogoPassed = footerLogoInfo && footerLogoInfo.renderedHeight <= 30 && !footerLogoInfo.styleAttr.includes('-15px');
  regressionReport.def06_footer_logo = {
    ...footerLogoInfo,
    verdict: footerLogoPassed ? 'PASS' : 'FAIL (FOOTER LOGO STILL OVERSIZED)'
  };
  if (footerLogoPassed) regressionReport.summary.passed++; else regressionReport.summary.failed++;

  // ====================================================
  // TEST DEF-04: HERO MAIN GRAPHIC (MOCKUP VS REAL IMAGE)
  // ====================================================
  console.log('\n>>> [DEF-04] Checking Hero Main Product Mockup...');
  const heroGraphicInfo = await desktopPage.evaluate(() => {
    const heroSection = document.querySelector('section.animate-fade-up') || document.querySelector('section');
    const hasStudioMockWindow = document.body.innerText.includes('KelvinFlow Quotation Studio v2.4');
    const hasOriginalProductImage = Boolean(document.querySelector('img[alt*="KelvinFlow Quotation Review Interface Preview"]') || document.querySelector('img[src*="googleusercontent.com/aida-public"]'));
    const heroImgEl = heroSection ? heroSection.querySelector('img.object-contain') : null;
    return {
      hasStudioMockWindow,
      hasOriginalProductImage,
      heroImgSrc: heroImgEl ? heroImgEl.src : null
    };
  });
  console.log('Hero Graphic Info:', heroGraphicInfo);

  const heroSectionEl = await desktopPage.$('section.animate-fade-up') || await desktopPage.$('main > div > section:first-child');
  if (heroSectionEl) {
    const pHeroGraphic = path.join(ARTIFACT_DIR, 'regression_r2_hero_graphic.png');
    await heroSectionEl.screenshot({ path: pHeroGraphic });
    console.log(`[Screenshot] Saved R2 hero graphic: ${pHeroGraphic}`);
  }

  // If user says "主图帮我随便更换了", user wants either the original high-fidelity image or design fidelity restored
  const def04Passed = heroGraphicInfo.hasOriginalProductImage || !heroGraphicInfo.hasStudioMockWindow;
  regressionReport.def04_hero_main_graphic = {
    ...heroGraphicInfo,
    verdict: def04Passed ? 'PASS (RESTORED TO DESIGN)' : 'FAIL (STILL USING ARBITRARY MOCKUP WINDOW)'
  };
  if (def04Passed) regressionReport.summary.passed++; else regressionReport.summary.failed++;

  // ====================================================
  // TEST DEF-07: THREE METRIC/FEATURE CARDS STYLE
  // ====================================================
  console.log('\n>>> [DEF-07] Checking Three Metric/Feature Cards Style...');
  const metricCardsInfo = await desktopPage.evaluate(() => {
    const bodyText = document.body.innerText;
    const hasOriginalBigNumbers = bodyText.includes('逐行解析') && bodyText.includes('10 秒') && bodyText.includes('零密码');
    const hasModifiedCards = bodyText.includes('逐行精准拆解') && bodyText.includes('10秒极速生成') && bodyText.includes('零授权零密码');
    return {
      hasOriginalBigNumbers,
      hasModifiedCards
    };
  });
  console.log('Metric Cards Info:', metricCardsInfo);

  const metricsSectionEl = await desktopPage.$('section.bg-surface-container-low:has(div.grid-cols-1.md\\:grid-cols-3)');
  if (metricsSectionEl) {
    const pMetricCards = path.join(ARTIFACT_DIR, 'regression_r2_metric_cards.png');
    await metricsSectionEl.screenshot({ path: pMetricCards });
    console.log(`[Screenshot] Saved R2 metric cards: ${pMetricCards}`);
  }

  const def07Passed = metricCardsInfo.hasOriginalBigNumbers && !metricCardsInfo.hasModifiedCards;
  regressionReport.def07_metric_cards = {
    ...metricCardsInfo,
    verdict: def07Passed ? 'PASS (ALIGNED WITH DESIGN)' : 'FAIL (STILL USING MODIFIED STYLE)'
  };
  if (def07Passed) regressionReport.summary.passed++; else regressionReport.summary.failed++;

  // ====================================================
  // TEST DEF-08: REMEMBER DEVICE DEFAULT UNCHECKED
  // ====================================================
  console.log('\n>>> [DEF-08] Checking Inbound Modal "Remember Device" Default State...');
  await desktopPage.evaluate(() => openInboundModal('login'));
  await desktopPage.waitForTimeout(300);

  const rememberDeviceCheck = await desktopPage.evaluate(() => {
    const el = document.getElementById('inbound-remember-device');
    return {
      exists: Boolean(el),
      checked: el ? el.checked : null,
      hasCheckedAttribute: el ? el.hasAttribute('checked') : null
    };
  });
  console.log('Remember device check:', rememberDeviceCheck);

  const def08Passed = rememberDeviceCheck.exists && rememberDeviceCheck.checked === false && !rememberDeviceCheck.hasCheckedAttribute;
  regressionReport.def08_remember_device_default = {
    ...rememberDeviceCheck,
    verdict: def08Passed ? 'PASS (DEFAULT UNCHECKED)' : 'FAIL (STILL DEFAULT CHECKED)'
  };
  if (def08Passed) regressionReport.summary.passed++; else regressionReport.summary.failed++;

  // ====================================================
  // TEST DEF-09: MODAL FOCUS TRAP
  // ====================================================
  console.log('\n>>> [DEF-09] Checking Modal Focus Trap...');
  await desktopPage.focus('#inbound-modal button[aria-label="关闭弹窗"]');
  const tabSequence = [];
  for (let i = 0; i < 15; i++) {
    await desktopPage.keyboard.press('Tab');
    const focused = await desktopPage.evaluate(() => {
      const active = document.activeElement;
      if (!active) return null;
      return {
        tag: active.tagName.toLowerCase(),
        id: active.id,
        isInModal: Boolean(active.closest('#inbound-modal'))
      };
    });
    tabSequence.push(focused);
  }
  const didFocusEscape = tabSequence.some(t => t && !t.isInModal);
  console.log(`Did focus escape modal? ${didFocusEscape}`);

  const def09Passed = !didFocusEscape;
  regressionReport.def09_focus_trap = {
    didFocusEscape,
    tabSequence,
    verdict: def09Passed ? 'PASS (FOCUS TRAPPED)' : 'FAIL (FOCUS TRAP MISSING)'
  };
  if (def09Passed) regressionReport.summary.passed++; else regressionReport.summary.failed++;

  await desktopPage.evaluate(() => closeInboundModal());
  await desktopPage.waitForTimeout(300);

  // ====================================================
  // TEST DEF-10: MOBILE TOUCH TARGETS (375x812)
  // ====================================================
  console.log('\n>>> [DEF-10] Checking Mobile Touch Targets on 375x812 Viewport...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();

  mobilePage.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`[Console Error - Mobile] ${msg.text()}`);
      regressionReport.cod01_runtime_console_errors.push({ viewport: 'mobile', text: msg.text() });
    }
  });

  await mobilePage.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);

  const pMobFullR2 = path.join(ARTIFACT_DIR, 'regression_r2_mobile_full.png');
  await mobilePage.screenshot({ path: pMobFullR2, fullPage: true });
  console.log(`[Screenshot] Saved R2 mobile full page: ${pMobFullR2}`);

  const mobileTargets = await mobilePage.evaluate(() => {
    const clickables = Array.from(document.querySelectorAll('button, a, input[type="checkbox"], input[type="radio"], [role="button"]'));
    return clickables.map(el => {
      const rect = el.getBoundingClientRect();
      const text = (el.textContent || el.getAttribute('aria-label') || el.id || '').trim().slice(0, 30);
      const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id,
        text,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        isVisible,
        isUnder44: isVisible && (rect.width < 44 || rect.height < 44)
      };
    }).filter(t => t.isVisible);
  });

  const under44Items = mobileTargets.filter(t => t.isUnder44);
  console.log(`Total mobile clickable elements: ${mobileTargets.length}`);
  console.log(`Clickable elements with touch target < 44px: ${under44Items.length}`);
  under44Items.forEach(item => {
    console.log(`  - <${item.tag}> id="${item.id}" text="${item.text}": ${item.width}x${item.height}px`);
  });

  const def10Passed = under44Items.length === 0;
  regressionReport.def10_mobile_touch_targets = {
    total: mobileTargets.length,
    under44Count: under44Items.length,
    under44Items,
    verdict: def10Passed ? 'PASS' : `FAIL (${under44Items.length} ITEMS < 44PX)`
  };
  if (def10Passed) regressionReport.summary.passed++; else regressionReport.summary.failed++;

  // ====================================================
  // COD-03: TYPESCRIPT & UNIT TESTS
  // ====================================================
  console.log('\n>>> [COD-03] Running TypeScript Compilation & Unit Tests...');
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    regressionReport.cod03_typecheck = { verdict: 'PASS', errors: 0 };
  } catch (e) {
    regressionReport.cod03_typecheck = { verdict: 'FAIL', errors: 1 };
  }

  try {
    const testOut = execSync('npm test', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 });
    const passedSuitesMatch = testOut.match(/Test Suites:\s*([^\n]+)/);
    const passedTestsMatch = testOut.match(/Tests:\s*([^\n]+)/);
    regressionReport.cod03_unit_tests = {
      verdict: 'PASS',
      suites: passedSuitesMatch ? passedSuitesMatch[1] : 'All passed',
      tests: passedTestsMatch ? passedTestsMatch[1] : 'All passed'
    };
  } catch (e) {
    regressionReport.cod03_unit_tests = { verdict: 'FAIL', output: e.message };
  }

  // Write detailed JSON artifact
  const r2JsonPath = path.join(ARTIFACT_DIR, 'regression_round2_result.json');
  fs.writeFileSync(r2JsonPath, JSON.stringify(regressionReport, null, 2), 'utf8');
  console.log(`\nDetailed Regression JSON saved to: ${r2JsonPath}`);

  console.log('====================================================');
  console.log(`REGRESSION AUDIT ROUND 2 FINISHED`);
  console.log(`SUMMARY: ${regressionReport.summary.passed} PASSED, ${regressionReport.summary.failed} FAILED (OUT OF 10 DEFECTS)`);
  console.log('====================================================\n');

  await browser.close();
})();
