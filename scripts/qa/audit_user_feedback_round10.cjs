const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const REPORT_DIR = 'F:\\gemini test report';
const ARTIFACT_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\55cf2dff-82cb-4e4f-ae6c-d5a1787d3a2a';

(async () => {
  console.log('====================================================');
  console.log('AUDIT USER FEEDBACK ROUND 10 - TRIPLE LOGO ALIGNMENT SYNCHRONIZATION');
  console.log('====================================================\n');

  const browser = await chromium.launch({ 
    headless: false,
    executablePath: CHROME_PATH,
    args: ['--window-size=1920,1080']
  });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Helper function to extract logo metrics
  const getLogoMetrics = async (selector, label) => page.evaluate(({ selector, label }) => {
    const root = document.querySelector(selector);
    if (!root) return { label, found: false };
    const img = root.querySelector('img[src*="k_logo.svg"]');
    const textSpan = Array.from(root.querySelectorAll('span')).find(s => s.textContent.trim().startsWith('KelvinFlow'));
    const aiBadge = Array.from(root.querySelectorAll('span')).find(s => s.textContent.trim() === 'AI');

    const rootRect = root.getBoundingClientRect();
    const imgRect = img ? img.getBoundingClientRect() : null;
    const textRect = textSpan ? textSpan.getBoundingClientRect() : null;
    const aiRect = aiBadge ? aiBadge.getBoundingClientRect() : null;

    const rootStyle = window.getComputedStyle(root);
    const textStyle = textSpan ? window.getComputedStyle(textSpan) : null;

    return {
      label,
      found: true,
      display: rootStyle.display,
      alignItems: rootStyle.alignItems,
      gap: rootStyle.gap,
      fontSize: textStyle ? textStyle.fontSize : null,
      fontWeight: textStyle ? textStyle.fontWeight : null,
      textColor: textStyle ? textStyle.color : null,
      imgBottom: imgRect ? imgRect.bottom : null,
      textBottom: textRect ? textRect.bottom : null,
      aiBottom: aiRect ? aiRect.bottom : null,
      // Calculate alignment delta between img bottom and text bottom
      deltaImgTextBottom: (imgRect && textRect) ? Math.abs(imgRect.bottom - textRect.bottom) : null,
      rootRect,
      imgRect,
      textRect,
      aiRect
    };
  }, { selector, label });

  // 1. Benchmark: Top-left Header Logo
  console.log('--- 1. Inspecting Top-Left Header Logo (Standard Benchmark) ---');
  const headerLogo = await getLogoMetrics('header a[data-path="landing-page"]', 'Top-Left Header Logo');
  console.log('Top-Left Logo:', {
    alignItems: headerLogo.alignItems,
    fontSize: headerLogo.fontSize,
    textColor: headerLogo.textColor,
    deltaImgTextBottom: headerLogo.deltaImgTextBottom
  });

  // Screenshot header logo
  const headerEl = await page.locator('header a[data-path="landing-page"]');
  const headerLogoPath = path.join(REPORT_DIR, 'v17_header_logo_alignment.png');
  await headerEl.screenshot({ path: headerLogoPath });
  fs.copyFileSync(headerLogoPath, path.join(ARTIFACT_DIR, 'v17_header_logo_alignment.png'));

  // 2. Target 1: Bottom-Left Footer Logo
  console.log('\n--- 2. Inspecting Bottom-Left Footer Logo ---');
  const footerLogo = await getLogoMetrics('footer a[aria-label="KelvinFlow 首页"]', 'Bottom-Left Footer Logo');
  console.log('Bottom-Left Logo:', {
    alignItems: footerLogo.alignItems,
    fontSize: footerLogo.fontSize,
    textColor: footerLogo.textColor,
    deltaImgTextBottom: footerLogo.deltaImgTextBottom
  });

  if (footerLogo.alignItems !== headerLogo.alignItems) {
    throw new Error(`FAIL: Footer logo alignItems (${footerLogo.alignItems}) does not match header logo (${headerLogo.alignItems})!`);
  }
  if (footerLogo.fontSize !== headerLogo.fontSize) {
    throw new Error(`FAIL: Footer logo fontSize (${footerLogo.fontSize}) does not match header logo (${headerLogo.fontSize})!`);
  }

  // Scroll to footer and take screenshot
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const footerEl = await page.locator('footer a[aria-label="KelvinFlow 首页"]');
  const footerLogoPath = path.join(REPORT_DIR, 'v17_footer_logo_alignment.png');
  await footerEl.screenshot({ path: footerLogoPath });
  fs.copyFileSync(footerLogoPath, path.join(ARTIFACT_DIR, 'v17_footer_logo_alignment.png'));

  // 3. Target 2: Mockup Sidebar Logo
  console.log('\n--- 3. Inspecting Hero Mockup Sidebar Logo ---');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  const sidebarLogo = await getLogoMetrics('[aria-label="KelvinFlow Quotation Review Interface Preview"] aside .flex.items-end', 'Mockup Sidebar Logo');
  console.log('Mockup Sidebar Logo:', {
    alignItems: sidebarLogo.alignItems,
    fontSize: sidebarLogo.fontSize,
    textColor: sidebarLogo.textColor,
    deltaImgTextBottom: sidebarLogo.deltaImgTextBottom
  });

  if (!sidebarLogo.found) {
    throw new Error('FAIL: Mockup sidebar logo with items-end not found!');
  }
  if (sidebarLogo.alignItems !== headerLogo.alignItems) {
    throw new Error(`FAIL: Sidebar logo alignItems (${sidebarLogo.alignItems}) does not match header logo (${headerLogo.alignItems})!`);
  }
  if (sidebarLogo.fontSize !== headerLogo.fontSize) {
    throw new Error(`FAIL: Sidebar logo fontSize (${sidebarLogo.fontSize}) does not match header logo (${headerLogo.fontSize})!`);
  }

  // Screenshot mockup sidebar logo
  const sidebarLogoEl = await page.locator('[aria-label="KelvinFlow Quotation Review Interface Preview"] aside .flex.items-end');
  const sidebarLogoPath = path.join(REPORT_DIR, 'v17_sidebar_logo_alignment.png');
  await sidebarLogoEl.screenshot({ path: sidebarLogoPath });
  fs.copyFileSync(sidebarLogoPath, path.join(ARTIFACT_DIR, 'v17_sidebar_logo_alignment.png'));

  // Overall Hero & Navbar visual comparison screenshot
  const heroMockupEl = await page.locator('[aria-label="KelvinFlow Quotation Review Interface Preview"]');
  await heroMockupEl.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const compPath = path.join(REPORT_DIR, 'v17_triple_logo_comparison.png');
  await page.screenshot({ path: compPath });
  fs.copyFileSync(compPath, path.join(ARTIFACT_DIR, 'v17_triple_logo_comparison.png'));

  // Console error audit
  console.log('\n--- 4. Console Error Audit ---');
  console.log('Total console errors:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    throw new Error('FAIL: Console errors detected during audit!');
  }

  console.log('\n====================================================');
  console.log('>>> ALL ROUND 10 LOGO ALIGNMENT AUDITS PASSED <<<');
  console.log('====================================================');

  await browser.close();
})();
