const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\dd190252-6867-43b6-8a91-8aa4a3e1f425';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('====================================================');
  console.log('AUDIT DIM-2 (INTERACTION), DIM-3 (FUNC), DIM-4 (LOGIC)');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH
  });

  const report = {
    modals: {},
    checkbox_compliance: {},
    cooldown_anti_abuse: {},
    custom_dropdown: {},
    keyboard_accessibility: {},
    scroll_lock_lifecycle: {},
    forgot_password_flow: {},
    logout_modal: {},
    faq_accordion: {},
    password_visibility: {}
  };

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.error(`[Console Error] ${msg.text()}`);
  });

  await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // ----------------------------------------------------
  // TEST 1: INBOUND MODAL & CHECKBOX COMPLIANCE (DIM-3, FUN-01 & FUN-05)
  // ----------------------------------------------------
  console.log('\n--- 1. Testing Inbound Modal & Checkbox Defaults ---');
  await page.evaluate(() => openInboundModal('starter'));
  await page.waitForTimeout(400);

  const regModalScreenshot = path.join(ARTIFACT_DIR, 'vis_modal_register.png');
  const inboundModalEl = await page.$('#inbound-modal > div:nth-child(2)');
  if (inboundModalEl) {
    await inboundModalEl.screenshot({ path: regModalScreenshot });
    console.log(`[Screenshot] Register Modal saved: ${regModalScreenshot}`);
  }

  const checkboxDefaults = await page.evaluate(() => {
    const agree = document.getElementById('inbound-agreement-checkbox');
    const remember = document.getElementById('inbound-remember-device');
    return {
      agreementChecked: agree ? agree.checked : null,
      agreementRequired: agree ? agree.required : null,
      rememberChecked: remember ? remember.checked : null
    };
  });
  console.log('Checkbox Defaults:', checkboxDefaults);
  report.checkbox_compliance = {
    ...checkboxDefaults,
    agreementVerdict: checkboxDefaults.agreementChecked === false ? 'PASS' : 'FAIL',
    rememberVerdict: checkboxDefaults.rememberChecked === false ? 'PASS' : 'FAIL (Defect: Default Checked!)'
  };

  // Switch to Login Tab
  console.log('\n--- Switching to Password Login Tab ---');
  await page.evaluate(() => switchInboundFormMode('login'));
  await page.waitForTimeout(300);

  const loginModalScreenshot = path.join(ARTIFACT_DIR, 'vis_modal_login.png');
  if (inboundModalEl) {
    await inboundModalEl.screenshot({ path: loginModalScreenshot });
    console.log(`[Screenshot] Login Modal saved: ${loginModalScreenshot}`);
  }

  // ----------------------------------------------------
  // TEST 2: PASSWORD VISIBILITY TOGGLE (DIM-4, LOG-03)
  // ----------------------------------------------------
  console.log('\n--- 2. Testing Password Visibility Toggle ---');
  const pwdToggleResult = await page.evaluate(() => {
    const pwdInput = document.getElementById('inbound-login-password');
    const toggleBtn = pwdInput ? pwdInput.nextElementSibling : null;
    const initialType = pwdInput ? pwdInput.type : null;
    
    if (toggleBtn) toggleBtn.click();
    const afterClick1 = pwdInput ? pwdInput.type : null;
    
    if (toggleBtn) toggleBtn.click();
    const afterClick2 = pwdInput ? pwdInput.type : null;

    return { initialType, afterClick1, afterClick2 };
  });
  console.log('Password toggle sequence:', pwdToggleResult);
  report.password_visibility = {
    ...pwdToggleResult,
    verdict: pwdToggleResult.afterClick1 === 'text' && pwdToggleResult.afterClick2 === 'password' ? 'PASS' : 'FAIL'
  };

  // Switch back to register mode to test dropdown & countdown
  await page.evaluate(() => switchInboundFormMode('register'));
  await page.waitForTimeout(200);

  // ----------------------------------------------------
  // TEST 3: CUSTOM CHANNEL DROPDOWN (DIM-2, INT-04)
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Custom Channel Dropdown ---');
  const dropdownTest = await page.evaluate(async () => {
    const btn = document.getElementById('custom-channel-btn');
    const menu = document.getElementById('custom-channel-menu');
    const hiddenInput = document.getElementById('inbound-channel-select');
    const label = document.getElementById('custom-channel-label');

    btn.click();
    const isOpenAfterClick = !menu.classList.contains('hidden');
    const ariaExpanded = btn.getAttribute('aria-expanded');

    // Select 'xiaohongshu' option
    const opt = menu.querySelector('[data-value="xiaohongshu"]');
    if (opt) opt.click();

    const isClosedAfterSelect = menu.classList.contains('hidden');
    const selectedVal = hiddenInput ? hiddenInput.value : null;
    const labelText = label ? label.textContent : null;

    return {
      isOpenAfterClick,
      ariaExpanded,
      isClosedAfterSelect,
      selectedVal,
      labelText
    };
  });
  console.log('Dropdown Test Results:', dropdownTest);
  report.custom_dropdown = {
    ...dropdownTest,
    verdict: dropdownTest.selectedVal === 'xiaohongshu' && dropdownTest.isClosedAfterSelect ? 'PASS' : 'FAIL'
  };

  // ----------------------------------------------------
  // TEST 4: 60s COOLDOWN & ANTI-ABUSE (DIM-3, FUN-04)
  // ----------------------------------------------------
  console.log('\n--- 4. Testing 60s Verification Code Cooldown & Network Isolation ---');
  const cooldownResult = await page.evaluate(async () => {
    const emailInput = document.getElementById('inbound-email');
    const btn = document.getElementById('btn-send-code');
    const btnText = document.getElementById('btn-send-code-text');

    if (emailInput) emailInput.value = 'test_qa_lead@foreign-trade-corp.com';
    
    // Trigger send code
    btn.click();
    
    const immediateDisabled = btn.disabled;
    const immediateText = btnText ? btnText.textContent : '';

    return {
      immediateDisabled,
      immediateText
    };
  });
  console.log('Cooldown Immediate state:', cooldownResult);
  report.cooldown_anti_abuse = {
    ...cooldownResult,
    verdict: cooldownResult.immediateDisabled === true && cooldownResult.immediateText.includes('60s') ? 'PASS' : 'FAIL'
  };

  // ----------------------------------------------------
  // TEST 5: SCROLL LOCK & ESCAPE LIFECYCLE (DIM-4, LOG-01 & DIM-2, INT-03)
  // ----------------------------------------------------
  console.log('\n--- 5. Testing Scroll Lock and Escape Key Hierarchy ---');
  const scrollLockCheck1 = await page.evaluate(() => {
    return {
      docOverflow: document.documentElement.style.overflow,
      isModalOpen: !document.getElementById('inbound-modal').classList.contains('hidden')
    };
  });
  console.log('Modal Open Scroll State:', scrollLockCheck1);

  // Press Escape to close Inbound Modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);

  const scrollLockCheck2 = await page.evaluate(() => {
    return {
      docOverflow: document.documentElement.style.overflow,
      isModalClosed: document.getElementById('inbound-modal').classList.contains('hidden'),
      hasPhantomFixedMask: Array.from(document.querySelectorAll('.fixed.inset-0')).some(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity === '0' && style.pointerEvents !== 'none';
      })
    };
  });
  console.log('Modal Closed Scroll State:', scrollLockCheck2);
  report.scroll_lock_lifecycle = {
    openState: scrollLockCheck1,
    closeState: scrollLockCheck2,
    verdict: scrollLockCheck1.docOverflow === 'hidden' && scrollLockCheck2.docOverflow === '' && !scrollLockCheck2.hasPhantomFixedMask ? 'PASS' : 'FAIL'
  };

  // ----------------------------------------------------
  // TEST 6: FORGOT PASSWORD 2-STEP FLOW (DIM-3, FUN-02)
  // ----------------------------------------------------
  console.log('\n--- 6. Testing 2-Step Forgot Password Flow ---');
  await page.evaluate(() => openForgotPasswordModal());
  await page.waitForTimeout(300);

  const forgotModalScreenshot = path.join(ARTIFACT_DIR, 'vis_modal_forgot_step1.png');
  const forgotModalCard = await page.$('#forgot-password-modal > div:nth-child(2)');
  if (forgotModalCard) {
    await forgotModalCard.screenshot({ path: forgotModalScreenshot });
    console.log(`[Screenshot] Forgot Password Modal saved: ${forgotModalScreenshot}`);
  }

  const forgotStepCheck = await page.evaluate(() => {
    const step1 = document.getElementById('forgot-step1-form');
    const step2 = document.getElementById('forgot-step2-form');
    return {
      step1Visible: step1 && !step1.classList.contains('hidden'),
      step2Hidden: step2 && step2.classList.contains('hidden')
    };
  });
  console.log('Forgot Password Initial Form State:', forgotStepCheck);
  report.forgot_password_flow = {
    ...forgotStepCheck,
    verdict: forgotStepCheck.step1Visible && forgotStepCheck.step2Hidden ? 'PASS' : 'FAIL'
  };

  // Close forgot password modal
  await page.evaluate(() => closeForgotPasswordModal());
  await page.waitForTimeout(300);

  // ----------------------------------------------------
  // TEST 7: LOGOUT CONFIRMATION MODAL (DIM-3, FUN-03)
  // ----------------------------------------------------
  console.log('\n--- 7. Testing Logout Confirmation Modal ---');
  await page.evaluate(() => {
    localStorage.setItem('kelvinflow_user_email', 'lead_qa_auditor@globaltrade.de');
    openLogoutModal();
  });
  await page.waitForTimeout(300);

  const logoutModalScreenshot = path.join(ARTIFACT_DIR, 'vis_modal_logout.png');
  const logoutModalCard = await page.$('#logout-dialog-overlay > div:nth-child(2)');
  if (logoutModalCard) {
    await logoutModalCard.screenshot({ path: logoutModalScreenshot });
    console.log(`[Screenshot] Logout Modal saved: ${logoutModalScreenshot}`);
  }

  const logoutInfo = await page.evaluate(() => {
    const emailEl = document.getElementById('logout-user-email');
    const modal = document.getElementById('logout-dialog-overlay');
    return {
      emailText: emailEl ? emailEl.textContent : null,
      isOpen: modal && !modal.classList.contains('hidden')
    };
  });
  console.log('Logout Modal Info:', logoutInfo);
  report.logout_modal = {
    ...logoutInfo,
    verdict: logoutInfo.emailText === 'lead_qa_auditor@globaltrade.de' && logoutInfo.isOpen ? 'PASS' : 'FAIL'
  };

  await page.evaluate(() => closeLogoutModal());
  await page.waitForTimeout(300);

  // ----------------------------------------------------
  // TEST 8: FAQ ACCORDION (DIM-2, INT-05)
  // ----------------------------------------------------
  console.log('\n--- 8. Testing FAQ Accordion Mutual Exclusivity ---');
  const accordionResult = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.faq-accordion-item'));
    if (items.length < 2) return { status: 'less than 2 items found' };

    const btn1 = items[0].querySelector('button');
    const btn2 = items[1].querySelector('button');

    // Click item 1
    btn1.click();
    const item1Open = items[0].classList.contains('is-open');
    const item2Closed = !items[1].classList.contains('is-open');

    // Click item 2
    btn2.click();
    const item1ClosedNow = !items[0].classList.contains('is-open');
    const item2OpenNow = items[1].classList.contains('is-open');

    return {
      item1Open,
      item2Closed,
      item1ClosedNow,
      item2OpenNow
    };
  });
  console.log('Accordion Test Results:', accordionResult);
  report.faq_accordion = {
    ...accordionResult,
    verdict: accordionResult.item1ClosedNow && accordionResult.item2OpenNow ? 'PASS' : 'FAIL'
  };

  // Write full JSON
  const jsonPath = path.join(ARTIFACT_DIR, 'dim2_dim3_dim4_audit_result.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nAudit results written to: ${jsonPath}`);

  await browser.close();
  console.log('\nDIM-2, DIM-3, DIM-4 AUDIT COMPLETE.');
})();
