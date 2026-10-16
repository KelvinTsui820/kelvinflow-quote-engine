const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\dd190252-6867-43b6-8a91-8aa4a3e1f425';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('====================================================');
  console.log('AUDIT TAB FOCUS TRAP, FORM VALIDATIONS & REVIEW MODALS');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH
  });

  const report = {
    tabFocusCycle: {},
    formValidations: {},
    reviewModals: {}
  };

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // 1. Tab Focus Cycle inside Inbound Modal
  console.log('\n--- 1. Testing Tab Focus inside Inbound Modal ---');
  await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await page.evaluate(() => openInboundModal('starter'));
  await page.waitForTimeout(400);

  // Focus the close button or first input
  await page.focus('#inbound-modal button[aria-label="关闭弹窗"]');

  const focusedTags = [];
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const isInModal = Boolean(el.closest('#inbound-modal'));
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id,
        type: el.type,
        text: (el.textContent || '').trim().slice(0, 30),
        isInModal
      };
    });
    focusedTags.push(focused);
  }
  console.log('Tab Focus Sequence (15 steps):', focusedTags);

  const escapedModal = focusedTags.some(f => f && !f.isInModal);
  console.log(`Did focus escape modal? ${escapedModal}`);
  report.tabFocusCycle = {
    sequence: focusedTags,
    escapedModal,
    verdict: !escapedModal ? 'PASS (Focus trapped)' : 'FAIL (Focus trap missing: focus escaped to underlying page!)'
  };

  // 2. Form Validation Feedback States
  console.log('\n--- 2. Testing Form Validation Feedback in Register Modal ---');
  // Attempt submit without agreement
  await page.evaluate(() => {
    document.getElementById('inbound-email').value = 'valid.business@export-hub.com';
    document.getElementById('inbound-code').value = '123456';
    document.getElementById('inbound-password').value = 'Secret1234';
    document.getElementById('inbound-agreement-checkbox').checked = false;
    document.getElementById('inbound-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });
  await page.waitForTimeout(300);

  const agreementErrorCheck = await page.evaluate(() => {
    const feedback = document.getElementById('inbound-error-feedback');
    const text = document.getElementById('inbound-error-feedback-text');
    return {
      isVisible: feedback && !feedback.classList.contains('hidden'),
      text: text ? text.textContent : null
    };
  });
  console.log('Agreement Error Feedback:', agreementErrorCheck);

  // Take screenshot of modal with error
  const pErrShot = path.join(ARTIFACT_DIR, 'vis_modal_error_feedback.png');
  const modalBody = await page.$('#inbound-modal > div:nth-child(2)');
  if (modalBody) {
    await modalBody.screenshot({ path: pErrShot });
    console.log(`[Screenshot] Error feedback saved: ${pErrShot}`);
  }

  // Close inbound modal
  await page.evaluate(() => closeInboundModal());
  await page.waitForTimeout(300);

  // 3. Forgot Password Mismatch Test
  console.log('\n--- 3. Testing Password Mismatch in Forgot Password Step 2 ---');
  await page.evaluate(() => {
    openForgotPasswordModal();
    // Simulate Step 1 verified
    document.getElementById('forgot-step1-form').classList.add('hidden');
    document.getElementById('forgot-step2-form').classList.remove('hidden');
    document.getElementById('forgot-new-password').value = 'newPass123';
    document.getElementById('forgot-confirm-password').value = 'diffPass456';
    document.getElementById('forgot-step2-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });
  await page.waitForTimeout(300);

  const mismatchCheck = await page.evaluate(() => {
    const errBox = document.getElementById('forgot-step2-error-feedback');
    const errText = document.getElementById('forgot-step2-error-text');
    return {
      isVisible: errBox && !errBox.classList.contains('hidden'),
      text: errText ? errText.textContent : null
    };
  });
  console.log('Forgot Password Mismatch Check:', mismatchCheck);

  const pMismatchShot = path.join(ARTIFACT_DIR, 'vis_forgot_mismatch_error.png');
  const forgotBody = await page.$('#forgot-password-modal > div:nth-child(2)');
  if (forgotBody) {
    await forgotBody.screenshot({ path: pMismatchShot });
    console.log(`[Screenshot] Mismatch error saved: ${pMismatchShot}`);
  }

  await page.evaluate(() => closeForgotPasswordModal());
  await page.waitForTimeout(300);

  // 4. Workbench (review.html) Modal Tests
  console.log('\n--- 4. Testing Workbench Modals in review.html ---');
  await page.goto('http://localhost:3000/review.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Test Pricing Modal & New PO Modal in review.html
  const modalResults = await page.evaluate(async () => {
    const results = {};
    const appEl = document.getElementById('app');
    const vm = appEl?.__vue_app__?._instance?.proxy;
    if (vm) {
      // 1. New PO Modal
      if (vm.newPoModal) {
        vm.newPoModal.show = true;
        results.newPoOpened = Boolean(document.getElementById('new-po-modal-overlay'));
        vm.newPoModal.show = false;
      }
      // 2. Pricing Modal
      if (vm.pricingModal) {
        vm.pricingModal.show = true;
        results.pricingOpened = Boolean(document.getElementById('pricing-modal-overlay'));
        vm.pricingModal.show = false;
      }
      // 3. IMAP Modal
      if (vm.imapModal) {
        vm.imapModal.show = true;
        results.imapOpened = Boolean(document.getElementById('imap-modal-overlay'));
        vm.imapModal.show = false;
      }
    }
    return results;
  });
  console.log('Workbench Modals Lifecycle Test:', modalResults);
  report.reviewModals = modalResults;

  // Save report
  const outPath = path.join(ARTIFACT_DIR, 'audit_tab_and_validations.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Report written to: ${outPath}`);

  await browser.close();
})();
