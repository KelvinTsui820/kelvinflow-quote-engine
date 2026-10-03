const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[Console Error] ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(`[Page Error] ${err.message}`));

  console.log('Navigating to http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });

  // Verify footer button "联系创始人" exists
  const footerContactBtn = await page.evaluate(() => {
    const el = document.getElementById('footer-contact-founder');
    return el ? { text: el.textContent.trim(), found: true } : { found: false };
  });
  console.log('Footer contact button:', footerContactBtn);

  // Click the footer button
  console.log('Clicking footer contact button...');
  await page.click('#footer-contact-founder');
  await new Promise(r => setTimeout(r, 600));

  // Check payment modal state
  const modalState = await page.evaluate(() => {
    const modal = document.getElementById('payment-modal');
    if (!modal) return { exists: false };
    const rect = modal.getBoundingClientRect();
    const computed = window.getComputedStyle(modal);
    const monthlyBtn = document.getElementById('pay-switch-monthly');
    const annualBtn = document.getElementById('pay-switch-annual');
    const noteEl = document.getElementById('payment-note-text');
    const enterpriseModal = document.getElementById('enterprise-modal');
    
    // Check if old redundant bottom buttons exist
    const oldCopyNote = document.getElementById('copy-pay-note-text');
    const oldCopyWechat = document.getElementById('copy-founder-wechat-text');

    return {
      exists: true,
      hidden: modal.classList.contains('hidden'),
      opacity: computed.opacity,
      display: computed.display,
      monthlyClasses: monthlyBtn ? monthlyBtn.className : null,
      annualClasses: annualBtn ? annualBtn.className : null,
      currentNote: noteEl ? noteEl.textContent.trim() : null,
      enterpriseModalExists: !!enterpriseModal,
      oldCopyButtonsRemoved: !oldCopyNote && !oldCopyWechat
    };
  });
  console.log('Payment modal state after click:', JSON.stringify(modalState, null, 2));

  // Screenshot initial open
  await page.screenshot({ path: 'test_payment_modal_open.png' });
  console.log('Saved screenshot test_payment_modal_open.png');

  // Click annual switch
  console.log('Clicking Annual Switch (#pay-switch-annual)...');
  await page.click('#pay-switch-annual');
  await new Promise(r => setTimeout(r, 400));

  const annualState = await page.evaluate(() => {
    const noteEl = document.getElementById('payment-note-text');
    const annualBtn = document.getElementById('pay-switch-annual');
    return {
      note: noteEl ? noteEl.textContent.trim() : null,
      annualBtnClasses: annualBtn ? annualBtn.className : null
    };
  });
  console.log('Annual switch state:', annualState);

  // Screenshot annual switch
  await page.screenshot({ path: 'test_payment_modal_annual.png' });
  console.log('Saved screenshot test_payment_modal_annual.png');

  // Click close button
  console.log('Closing modal...');
  await page.click('#payment-modal button i.fa-xmark');
  await new Promise(r => setTimeout(r, 500));

  const closedState = await page.evaluate(() => {
    const modal = document.getElementById('payment-modal');
    return {
      hidden: modal ? modal.classList.contains('hidden') : null
    };
  });
  console.log('Modal closed state:', closedState);

  console.log('Recorded Errors:', errors);

  await browser.close();

  if (errors.length > 0) {
    console.error('TEST FAILED: Errors found during UI test');
    process.exit(1);
  } else if (!modalState.exists || modalState.hidden || modalState.enterpriseModalExists || !modalState.oldCopyButtonsRemoved) {
    console.error('TEST FAILED: Assertions failed');
    process.exit(1);
  } else {
    console.log('TEST PASSED: Payment modal UI verified successfully!');
  }
})();
