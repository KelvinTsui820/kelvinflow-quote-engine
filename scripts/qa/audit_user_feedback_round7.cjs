const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const REPORT_DIR = 'F:\\gemini test report';
const ARTIFACT_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\55cf2dff-82cb-4e4f-ae6c-d5a1787d3a2a';

(async () => {
  console.log('====================================================');
  console.log('AUDIT USER FEEDBACK ROUND 7 - VERIFICATION OF NEWEST DESIGN & MODAL FIX');
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
  // ITEM 1: Agreement Modal（删除弹框内的跨境数据隐私承诺，仅保留用户服务协议）
  // ----------------------------------------------------
  console.log('\n--- Item 1: Agreement Modal Privacy Removal ---');
  await page.evaluate(() => openInboundModal('starter'));
  await page.waitForTimeout(300);

  // Click on 《用户服务协议》 link inside the registration modal
  await page.evaluate(() => openAgreementModal('terms'));
  await page.waitForTimeout(400);

  const agreementModalCheck = await page.evaluate(() => {
    const modal = document.getElementById('agreement-modal');
    const isVisible = modal && !modal.classList.contains('hidden') && window.getComputedStyle(modal).display !== 'none';
    const headerTitle = modal ? modal.querySelector('h3')?.innerText : '';
    const hasPrivacyTab = !!document.getElementById('agreement-tab-privacy');
    const hasPrivacyPane = !!document.getElementById('agreement-pane-privacy');
    const allText = modal ? modal.innerText : '';
    const mentionsPrivacyCommitment = allText.includes('跨境数据隐私承诺');
    const termsPane = document.getElementById('agreement-pane-terms');
    const hasTerms = termsPane && (termsPane.innerText.includes('导言与服务说明') || termsPane.innerText.includes('服务说明'));

    return {
      isVisible,
      headerTitle,
      hasPrivacyTab,
      hasPrivacyPane,
      mentionsPrivacyCommitment,
      hasTerms
    };
  });

  console.log('Agreement Modal Inspection:', agreementModalCheck);

  if (!agreementModalCheck.isVisible) {
    throw new Error('FAIL: Agreement modal failed to open!');
  }
  if (agreementModalCheck.hasPrivacyTab || agreementModalCheck.hasPrivacyPane || agreementModalCheck.mentionsPrivacyCommitment) {
    throw new Error('FAIL: Agreement modal still contains privacy tab / privacy commitment!');
  }
  if (!agreementModalCheck.hasTerms) {
    throw new Error('FAIL: Agreement modal missing Terms of Service content!');
  }

  // Save screenshot of Agreement Modal
  const modalScreenshotPath = path.join(REPORT_DIR, 'v14_agreement_modal_terms_only.png');
  const artifactModalScreenshotPath = path.join(ARTIFACT_DIR, 'v14_agreement_modal_terms_only.png');
  await page.screenshot({ path: modalScreenshotPath });
  fs.copyFileSync(modalScreenshotPath, artifactModalScreenshotPath);
  console.log('Saved modal screenshot to:', modalScreenshotPath);

  // Test "我已了解并同意" button
  await page.evaluate(() => acceptAgreementFromModal());
  await page.waitForTimeout(300);

  const checkboxState = await page.evaluate(() => {
    const cb = document.getElementById('inbound-agreement-checkbox');
    return cb ? cb.checked : false;
  });
  console.log('Agreement checkbox checked after accept:', checkboxState);
  if (!checkboxState) {
    throw new Error('FAIL: Accept agreement did not check inbound-agreement-checkbox!');
  }

  await page.evaluate(() => closeInboundModal());
  await page.waitForTimeout(300);

  // ----------------------------------------------------
  // ITEM 2: Hero 主图 100% 对版 kelvinflow_faq/code.html
  // (方案 1: 全幅大视口极致拉伸 · 沉浸式宽屏展示)
  // ----------------------------------------------------
  console.log('\n--- Item 2: Hero Mockup Inspection ---');
  const heroMockupCheck = await page.evaluate(() => {
    const el = document.querySelector('[aria-label="KelvinFlow Quotation Review Interface Preview"]');
    if (!el) return { found: false };

    const outerClasses = el.className;
    const hasMaxW7xl = outerClasses.includes('max-w-7xl');
    const hasBackdropBlur = outerClasses.includes('backdrop-blur');

    // Browser tab bar simulation
    const addressBar = el.querySelector('.font-numeric-data');
    const addressText = addressBar ? addressBar.innerText.replace(/\s+/g, ' ') : '';
    const hasTls = addressText.includes('TLS 加密通道') || addressText.includes('TLS加密通道');
    const hasDomain = addressText.includes('quote.kelvinflow.com/inbox');

    // Sidebar
    const aside = el.querySelector('aside');
    const asideText = aside ? aside.innerText.replace(/\s+/g, ' ') : '';
    const hasInbox = asideText.includes('询盘箱');
    const hasQuote = asideText.includes('报价单');
    const hasBasePrice = asideText.includes('底价库');
    const hasUser = asideText.includes('张伟 Leo');

    // Main workspace
    const text = el.innerText.replace(/\s+/g, ' ');
    const hasAssistantMail = text.includes('quote-trial@assistant.kelvinflow.com');
    const hasFilterTabs = text.includes('全部询盘 24') && text.includes('待处理 5') && text.includes('已解析 18');
    const hasRfqEmail = text.includes('mark.stevens@apexindustrial.co.uk');
    const hasTableItem = text.includes('HH-F-902') && text.includes('12,000');
    const hasCifRotterdam = text.includes('CIF Rotterdam');
    const hasGenerateBtn = text.includes('生成报价单');

    // Check images in mockup for external google links
    const imgs = Array.from(el.querySelectorAll('img')).map(img => img.src);
    const hasGoogleExternal = imgs.some(src => src.includes('googleusercontent.com'));

    return {
      found: true,
      hasMaxW7xl,
      hasBackdropBlur,
      addressText,
      hasTls,
      hasDomain,
      hasInbox,
      hasQuote,
      hasBasePrice,
      hasUser,
      hasAssistantMail,
      hasFilterTabs,
      hasRfqEmail,
      hasTableItem,
      hasCifRotterdam,
      hasGenerateBtn,
      hasGoogleExternal,
      imageSources: imgs
    };
  });

  console.log('Hero Mockup Inspection:', heroMockupCheck);

  if (!heroMockupCheck.found) {
    throw new Error('FAIL: Hero mockup preview element not found!');
  }
  if (!heroMockupCheck.hasMaxW7xl) {
    throw new Error('FAIL: Hero mockup is missing max-w-7xl wide layout!');
  }
  if (!heroMockupCheck.hasDomain || !heroMockupCheck.hasTls) {
    throw new Error('FAIL: Hero mockup browser bar missing quote.kelvinflow.com/inbox or TLS badge!');
  }
  if (!heroMockupCheck.hasAssistantMail) {
    throw new Error('FAIL: Hero mockup missing assistant email box!');
  }
  if (!heroMockupCheck.hasFilterTabs) {
    throw new Error('FAIL: Hero mockup missing filter tabs!');
  }
  if (!heroMockupCheck.hasRfqEmail) {
    throw new Error('FAIL: Hero mockup missing RFQ email stream!');
  }
  if (!heroMockupCheck.hasTableItem || !heroMockupCheck.hasCifRotterdam) {
    throw new Error('FAIL: Hero mockup missing item extraction table or CIF Rotterdam!');
  }
  if (heroMockupCheck.hasGoogleExternal) {
    throw new Error('FAIL: Hero mockup contains external Google usercontent image!');
  }

  // Scroll to hero and save screenshot
  const heroElement = await page.$('[aria-label="KelvinFlow Quotation Review Interface Preview"]');
  if (heroElement) {
    await heroElement.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  }
  const heroScreenshotPath = path.join(REPORT_DIR, 'v14_hero_mockup_full_viewport.png');
  const artifactHeroScreenshotPath = path.join(ARTIFACT_DIR, 'v14_hero_mockup_full_viewport.png');
  await page.screenshot({ path: heroScreenshotPath });
  fs.copyFileSync(heroScreenshotPath, artifactHeroScreenshotPath);
  console.log('Saved hero screenshot to:', heroScreenshotPath);

  // ----------------------------------------------------
  // ITEM 3: Test CTA Button inside mockup
  // ----------------------------------------------------
  console.log('\n--- Item 3: Mockup CTA Interaction ---');
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="KelvinFlow Quotation Review Interface Preview"]');
    const btns = Array.from(el.querySelectorAll('button'));
    const genBtn = btns.find(b => b.innerText.includes('生成报价单'));
    if (genBtn) genBtn.click();
  });
  await page.waitForTimeout(400);

  const inboundModalState = await page.evaluate(() => {
    const modal = document.getElementById('inbound-modal');
    return modal && !modal.classList.contains('hidden') && window.getComputedStyle(modal).display !== 'none';
  });
  console.log('Inbound modal triggered by Mockup CTA:', inboundModalState);
  if (!inboundModalState) {
    throw new Error('FAIL: Mockup "生成报价单" button did not trigger registration modal!');
  }
  await page.evaluate(() => closeInboundModal());

  // ----------------------------------------------------
  // ITEM 4: Metric cards hover & Section 2 check
  // ----------------------------------------------------
  console.log('\n--- Item 4: Section 2 Metric Cards & Hover ---');
  const section2Check = await page.evaluate(() => {
    const sec = document.getElementById('features');
    if (!sec) return { found: false };
    const cards = Array.from(sec.querySelectorAll('.grid > div'));
    return {
      found: true,
      cardCount: cards.length,
      cardsWithHover: cards.filter(c => c.className.includes('hover:-translate-y-2') && c.className.includes('hover:shadow-xl')).length
    };
  });
  console.log('Section 2 Metric Cards:', section2Check);
  if (!section2Check.found || section2Check.cardsWithHover !== 3) {
    throw new Error('FAIL: Section 2 metric cards missing hover states!');
  }

  // ----------------------------------------------------
  // ITEM 5: Check Console Errors
  // ----------------------------------------------------
  console.log('\n--- Item 5: Console Errors ---');
  console.log('Total console errors:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    throw new Error('FAIL: Console errors detected: ' + consoleErrors.join('; '));
  }

  console.log('\n====================================================');
  console.log('>>> ALL ROUND 7 REGRESSION & AUDIT CHECKS PASSED <<<');
  console.log('====================================================');

  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('\n[AUDIT FAILED]:', err);
  process.exit(1);
});
