const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const REPORT_DIR = 'F:\\gemini test report';
const ARTIFACT_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\55cf2dff-82cb-4e4f-ae6c-d5a1787d3a2a';

(async () => {
  console.log('====================================================');
  console.log('AUDIT USER FEEDBACK ROUND 9 - UNCLICKABLE HERO MOCKUP (ZERO INTERACTION)');
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

  // --- ITEM 1: HERO MOCKUP INERT & POINTER-EVENTS AUDIT ---
  console.log('--- Item 1: Inspecting Hero Mockup Pointer Events & Inert State ---');

  const heroMockupProps = await page.evaluate(() => {
    const el = document.querySelector('[aria-label="KelvinFlow Quotation Review Interface Preview"]');
    if (!el) return null;
    const style = window.getComputedStyle(el);
    return {
      found: true,
      hasPointerEventsNoneClass: el.classList.contains('pointer-events-none'),
      computedPointerEvents: style.pointerEvents,
      hasSelectNoneClass: el.classList.contains('select-none'),
      computedUserSelect: style.userSelect,
      hasInertAttr: el.hasAttribute('inert'),
      hasCursorDefaultClass: el.classList.contains('cursor-default'),
      rect: {
        x: el.getBoundingClientRect().x,
        y: el.getBoundingClientRect().y,
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height
      }
    };
  });

  console.log('Hero Mockup Properties:', heroMockupProps);

  if (!heroMockupProps || !heroMockupProps.found) {
    throw new Error('FAIL: Hero mockup container not found!');
  }
  if (!heroMockupProps.hasPointerEventsNoneClass || heroMockupProps.computedPointerEvents !== 'none') {
    throw new Error('FAIL: Hero mockup does not have pointer-events: none!');
  }
  if (!heroMockupProps.hasInertAttr) {
    throw new Error('FAIL: Hero mockup does not have inert attribute!');
  }

  // --- ITEM 2: CLICK AUDIT ON HERO MOCKUP (MUST NOT TRIGGER ANYTHING) ---
  console.log('\n--- Item 2: Verifying Hero Mockup is 100% Unclickable ---');

  const initialModalVisible = await page.evaluate(() => {
    const modal = document.getElementById('inbound-modal');
    return modal && !modal.classList.contains('hidden') && modal.style.display !== 'none';
  });
  console.log('Initial modal visible:', initialModalVisible);

  // Click at multiple points across the mockup
  const { x, y, width, height } = heroMockupProps.rect;
  const testClickPoints = [
    { name: 'Top-Left (macOS dots)', px: x + 40, py: y + 20 },
    { name: 'Address Bar', px: x + width / 2, py: y + 20 },
    { name: 'Sidebar Inbox', px: x + 80, py: y + 100 },
    { name: 'Header Work Bench Title', px: x + 350, py: y + 80 },
    { name: 'Sync Email Button Area', px: x + width - 120, py: y + 130 },
    { name: 'Filter Pill (全部询盘)', px: x + 260, py: y + 250 },
    { name: 'RFQ Mail Item', px: x + 350, py: y + 350 },
    { name: 'Generate Quote Button Area', px: x + width - 150, py: y + height - 50 }
  ];

  for (const pt of testClickPoints) {
    console.log(`Testing click at: ${pt.name} (${Math.round(pt.px)}, ${Math.round(pt.py)})...`);
    await page.mouse.click(pt.px, pt.py);
    await page.waitForTimeout(100);

    const isModalOpen = await page.evaluate(() => {
      const modal = document.getElementById('inbound-modal');
      return modal && !modal.classList.contains('hidden') && modal.style.display !== 'none';
    });

    if (isModalOpen) {
      throw new Error(`FAIL: Clicking inside hero mockup (${pt.name}) triggered a modal! It MUST NOT be clickable!`);
    }
  }

  console.log('>>> All click attempts inside hero mockup resulted in ZERO interaction (100% inert)!');

  // Scroll to hero mockup and take evidence screenshot
  const heroMockupEl = await page.locator('[aria-label="KelvinFlow Quotation Review Interface Preview"]');
  await heroMockupEl.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const heroScreenshotPath = path.join(REPORT_DIR, 'v16_hero_mockup_unclickable_inert.png');
  await page.screenshot({ path: heroScreenshotPath });
  fs.copyFileSync(heroScreenshotPath, path.join(ARTIFACT_DIR, 'v16_hero_mockup_unclickable_inert.png'));

  // --- ITEM 3: REAL CTA BUTTONS MUST STILL WORK ---
  console.log('\n--- Item 3: Verifying Real Hero CTA "免费开始试用" Works ---');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  // Click the real Hero CTA button
  await page.click('section button:has-text("免费开始试用")');
  await page.waitForTimeout(300);

  const modalOpenAfterRealCta = await page.evaluate(() => {
    const modal = document.getElementById('inbound-modal');
    return modal && !modal.classList.contains('hidden') && modal.style.display !== 'none';
  });
  console.log('Real Hero CTA triggers modal successfully:', modalOpenAfterRealCta);

  if (!modalOpenAfterRealCta) {
    throw new Error('FAIL: Real Hero CTA button failed to open modal!');
  }

  // Close modal
  await page.click('#inbound-modal button[aria-label="关闭弹窗"]');
  await page.waitForTimeout(300);

  // Check console errors
  console.log('\n--- Item 4: Console Error Audit ---');
  console.log('Total console errors:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
    throw new Error('FAIL: Console errors detected during audit!');
  }

  console.log('\n====================================================');
  console.log('>>> ALL ROUND 9 AUDIT & REGRESSION CHECKS PASSED <<<');
  console.log('====================================================');

  await browser.close();
})();
