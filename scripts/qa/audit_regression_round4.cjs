const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ARTIFACT_DIR = path.join(__dirname, '..', '..', '..', 'gemini test report', 'screenshots');
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const REPORT_OUTPUT_PATH = path.join(__dirname, '..', '..', '..', 'gemini test report', 'regression_round4_result.json');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('====================================================');
  console.log('KELVINFLOW REGRESSION AUDIT - ROUND 4 (DEF-11 to DEF-14)');
  console.log('====================================================\n');

  const round4Report = {
    timestamp: new Date().toISOString(),
    summary: { total: 4, passed: 0, failed: 0 },
    def11_logo_sizes: {},
    def12_nav_anchors: {},
    def13_agreement_interaction: {},
    def14_legal_modal_content: {},
    console_errors: []
  };

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`[Console Error] ${msg.text()}`);
      round4Report.console_errors.push(msg.text());
    }
  });

  await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // ====================================================
  // TEST DEF-11: LOGO SIZES (HEADER 22px, FOOTER 20px, MODAL 24px)
  // ====================================================
  console.log('>>> [DEF-11] Auditing Global Logo Optical Dimensions...');
  
  // 1. Header Logo
  const headerLogo = await page.evaluate(() => {
    const el = document.querySelector('header img[src*="k_logo.svg"]');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      classes: el.className,
      style: el.getAttribute('style') || '',
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  });

  // 2. Footer Logo
  const footerLogo = await page.evaluate(() => {
    const el = document.querySelector('footer img[src*="k_logo.svg"]');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      classes: el.className,
      style: el.getAttribute('style') || '',
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  });

  // 3. Modal Logo (Open Modal first)
  await page.evaluate(() => window.openInboundModal('starter'));
  await page.waitForTimeout(300);

  const modalLogo = await page.evaluate(() => {
    const el = document.querySelector('#inbound-modal img[src*="k_logo.svg"]');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      classes: el.className,
      style: el.getAttribute('style') || '',
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  });

  // Screenshot Modal Logo & Registration form
  const pModalForm = path.join(ARTIFACT_DIR, 'r4_modal_registration_aligned.png');
  const modalBodyEl = await page.$('#inbound-modal > div:nth-child(2)');
  if (modalBodyEl) {
    await modalBodyEl.screenshot({ path: pModalForm });
    console.log(`[Screenshot] Saved R4 modal registration form: ${pModalForm}`);
  }

  const def11Passed = headerLogo && headerLogo.width === 22 && headerLogo.height === 22
    && footerLogo && footerLogo.width === 20 && footerLogo.height === 20
    && modalLogo && modalLogo.width === 24 && modalLogo.height === 24;

  console.log(`- Header Logo: ${headerLogo.width}x${headerLogo.height}px (Target: 22x22px / w-5.5 h-5.5)`);
  console.log(`- Footer Logo: ${footerLogo.width}x${footerLogo.height}px (Target: 20x20px / w-5 h-5)`);
  console.log(`- Modal Logo:  ${modalLogo.width}x${modalLogo.height}px (Target: 24x24px / w-6 h-6)`);

  round4Report.def11_logo_sizes = {
    headerLogo,
    footerLogo,
    modalLogo,
    verdict: def11Passed ? 'PASS' : 'FAIL'
  };
  if (def11Passed) round4Report.summary.passed++; else round4Report.summary.failed++;

  // ====================================================
  // TEST DEF-12: NAVIGATION ANCHOR DECOUPLING
  // ====================================================
  console.log('\n>>> [DEF-12] Auditing Navigation Anchors (#features vs #excel-template)...');
  await page.evaluate(() => window.closeInboundModal());
  await page.waitForTimeout(300);

  const anchorAudit = await page.evaluate(() => {
    const secFeatures = document.getElementById('features');
    const secExcel = document.getElementById('excel-template');
    if (!secFeatures || !secExcel) {
      return { foundBoth: false };
    }
    const rectFeatures = secFeatures.getBoundingClientRect();
    const rectExcel = secExcel.getBoundingClientRect();
    const scrollY = window.scrollY;
    const absTopFeatures = rectFeatures.top + scrollY;
    const absTopExcel = rectExcel.top + scrollY;
    const distance = Math.abs(absTopExcel - absTopFeatures);

    return {
      foundBoth: true,
      featuresTag: secFeatures.tagName.toLowerCase(),
      featuresClasses: secFeatures.className,
      featuresTop: Math.round(absTopFeatures),
      excelTag: secExcel.tagName.toLowerCase(),
      excelClasses: secExcel.className,
      excelTop: Math.round(absTopExcel),
      distance: Math.round(distance),
      isSeparatedBy300px: distance >= 300
    };
  });

  console.log(`- #features Section Top: ${anchorAudit.featuresTop}px`);
  console.log(`- #excel-template Section Top: ${anchorAudit.excelTop}px`);
  console.log(`- Absolute Distance: ${anchorAudit.distance}px (Requirement: >= 300px)`);

  const def12Passed = anchorAudit.foundBoth && anchorAudit.isSeparatedBy300px;
  round4Report.def12_nav_anchors = {
    ...anchorAudit,
    verdict: def12Passed ? 'PASS' : 'FAIL'
  };
  if (def12Passed) round4Report.summary.passed++; else round4Report.summary.failed++;

  // ====================================================
  // TEST DEF-13 & DEF-14: AGREEMENT INTERACTION & LEGAL MODAL
  // ====================================================
  console.log('\n>>> [DEF-13 & DEF-14] Auditing Agreement Interaction & Legal Terms Modal...');

  // Open Inbound modal again
  await page.evaluate(() => window.openInboundModal('starter'));
  await page.waitForTimeout(200);

  // Check agreement buttons exist
  const agreementBtnsExist = await page.evaluate(() => {
    const termsBtn = document.querySelector('button[onclick*="openAgreementModal(\'terms\')"]');
    const privacyBtn = document.querySelector('button[onclick*="openAgreementModal(\'privacy\')"]');
    const checkbox = document.getElementById('inbound-agreement-checkbox');
    return {
      hasTermsBtn: Boolean(termsBtn),
      hasPrivacyBtn: Boolean(privacyBtn),
      hasCheckbox: Boolean(checkbox),
      isDefaultUnchecked: checkbox ? !checkbox.checked : false
    };
  });
  console.log('Agreement Checkbox & Buttons Audit:', agreementBtnsExist);

  // Click Terms button to open Agreement Modal
  await page.evaluate(() => window.openAgreementModal('terms'));
  await page.waitForTimeout(300);

  // Verify Terms Tab content
  const termsAudit = await page.evaluate(() => {
    const modal = document.getElementById('agreement-modal');
    const isVisible = modal && !modal.classList.contains('hidden') && modal.style.display !== 'none';
    const paneTerms = document.getElementById('agreement-pane-terms');
    const panePrivacy = document.getElementById('agreement-pane-privacy');
    const termsText = paneTerms ? paneTerms.innerText : '';
    const hasConduct = termsText.includes('平台用户服务协议') || termsText.includes('导言与服务说明');
    const hasCoreScope = termsText.includes('询盘要素解析') && termsText.includes('底价规则智能匹配');
    const hasIpClause = termsText.includes('用户私有数据绝对归属') && termsText.includes('严禁用于公共模型训练');
    return {
      modalVisible: isVisible,
      termsPaneVisible: paneTerms && !paneTerms.classList.contains('hidden'),
      privacyPaneHidden: panePrivacy && panePrivacy.classList.contains('hidden'),
      hasConduct,
      hasCoreScope,
      hasIpClause,
      textLength: termsText.length
    };
  });
  console.log('Terms Tab Audit:', termsAudit);

  // Screenshot Terms Modal
  const pTermsModal = path.join(ARTIFACT_DIR, 'r4_agreement_modal_terms.png');
  const agreeCardEl = await page.$('#agreement-modal > div:nth-child(2)');
  if (agreeCardEl) {
    await agreeCardEl.screenshot({ path: pTermsModal });
    console.log(`[Screenshot] Saved R4 agreement modal (Terms): ${pTermsModal}`);
  }

  // Switch to Privacy Tab
  await page.evaluate(() => window.switchAgreementTab('privacy'));
  await page.waitForTimeout(200);

  // Verify Privacy Tab content
  const privacyAudit = await page.evaluate(() => {
    const panePrivacy = document.getElementById('agreement-pane-privacy');
    const paneTerms = document.getElementById('agreement-pane-terms');
    const privacyText = panePrivacy ? panePrivacy.innerText : '';
    const hasZeroCredential = privacyText.includes('零密码侵入原则') || privacyText.includes('专属助理邮箱智能转发');
    const hasAes256 = privacyText.includes('AES-256') || privacyText.includes('银行级算法');
    const hasDoD = privacyText.includes('DoD 5220.22-M') || privacyText.includes('彻底物理销毁');
    const hasNoSelling = privacyText.includes('商业线索不倒卖承诺');
    return {
      privacyPaneVisible: panePrivacy && !panePrivacy.classList.contains('hidden'),
      termsPaneHidden: paneTerms && paneTerms.classList.contains('hidden'),
      hasZeroCredential,
      hasAes256,
      hasDoD,
      hasNoSelling,
      textLength: privacyText.length
    };
  });
  console.log('Privacy Tab Audit:', privacyAudit);

  // Screenshot Privacy Modal
  const pPrivacyModal = path.join(ARTIFACT_DIR, 'r4_agreement_modal_privacy.png');
  if (agreeCardEl) {
    await agreeCardEl.screenshot({ path: pPrivacyModal });
    console.log(`[Screenshot] Saved R4 agreement modal (Privacy): ${pPrivacyModal}`);
  }

  // Test "我已了解并同意" button click
  await page.evaluate(() => window.acceptAgreementFromModal());
  await page.waitForTimeout(300);

  const acceptActionAudit = await page.evaluate(() => {
    const agreeModal = document.getElementById('agreement-modal');
    const isAgreeModalClosed = !agreeModal || agreeModal.classList.contains('hidden') || agreeModal.style.display === 'none';
    const checkbox = document.getElementById('inbound-agreement-checkbox');
    const isCheckedNow = checkbox ? checkbox.checked : false;
    const inboundModal = document.getElementById('inbound-modal');
    const isInboundModalStillOpen = inboundModal && !inboundModal.classList.contains('hidden') && inboundModal.style.display !== 'none';
    return {
      isAgreeModalClosed,
      isCheckedNow,
      isInboundModalStillOpen
    };
  });
  console.log('Accept & Close Flow Audit:', acceptActionAudit);

  const def13Passed = agreementBtnsExist.hasTermsBtn && agreementBtnsExist.hasPrivacyBtn
    && acceptActionAudit.isCheckedNow && acceptActionAudit.isAgreeModalClosed;
  const def14Passed = termsAudit.hasConduct && termsAudit.hasCoreScope && termsAudit.hasIpClause
    && privacyAudit.hasZeroCredential && privacyAudit.hasAes256 && privacyAudit.hasDoD;

  round4Report.def13_agreement_interaction = {
    ...agreementBtnsExist,
    ...acceptActionAudit,
    verdict: def13Passed ? 'PASS' : 'FAIL'
  };
  if (def13Passed) round4Report.summary.passed++; else round4Report.summary.failed++;

  round4Report.def14_legal_modal_content = {
    termsAudit,
    privacyAudit,
    verdict: def14Passed ? 'PASS' : 'FAIL'
  };
  if (def14Passed) round4Report.summary.passed++; else round4Report.summary.failed++;

  // Close browser
  await browser.close();

  fs.writeFileSync(REPORT_OUTPUT_PATH, JSON.stringify(round4Report, null, 2), 'utf8');
  console.log(`\nDetailed Round 4 JSON saved to: ${REPORT_OUTPUT_PATH}`);
  console.log('====================================================');
  console.log(`ROUND 4 AUDIT SUMMARY: ${round4Report.summary.passed} PASSED, ${round4Report.summary.failed} FAILED`);
  console.log('====================================================');
})();
