const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL = 'https://kelvinflow.com';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots_audit');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runComprehensiveAudit() {
  console.log(`[DevTools Audit] Launching Chrome against ${TARGET_URL}...`);
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080'
    ]
  });

  const report = {
    url: TARGET_URL,
    timestamp: new Date().toISOString(),
    viewports: {},
    consoleErrors: [],
    consoleWarnings: [],
    networkErrors: [],
    tests: {},
    overflowIssues: [],
    summary: { status: 'UNKNOWN' }
  };

  const page = await browser.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      report.consoleErrors.push(text);
      console.log(`[Console ERROR] ${text}`);
    } else if (msg.type() === 'warn') {
      report.consoleWarnings.push(text);
    }
  });

  page.on('pageerror', err => {
    report.consoleErrors.push(err.toString());
    console.error(`[Page ERROR] ${err.toString()}`);
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      report.networkErrors.push({
        url: res.url(),
        status: res.status()
      });
      console.log(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });

  // 1. Initial Desktop Load (1440x900)
  console.log('\n--- 1. Desktop Initial Load (1440x900) ---');
  await page.setViewport({ width: 1440, height: 900 });
  const resp = await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  report.httpStatus = resp.status();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_desktop_hero.png') });

  // 2. Billing Cycle Toggle Test
  console.log('\n--- 2. Testing Billing Cycle Toggle ---');
  const billingTest = await page.evaluate(async () => {
    const btnAnnual = document.getElementById('btn-billing-annual');
    const btnMonthly = document.getElementById('btn-billing-monthly');
    const priceAmount = document.getElementById('pricing-amount');
    const priceCycle = document.getElementById('pricing-cycle');
    const btnPayText = document.getElementById('btn-pay-text');

    const initialAmount = priceAmount?.innerText.trim();
    const initialCycle = priceCycle?.innerText.trim();

    // Click Annual
    btnAnnual?.click();
    await new Promise(r => setTimeout(r, 200));
    const annualAmount = priceAmount?.innerText.trim();
    const annualCycle = priceCycle?.innerText.trim();
    const annualPayText = btnPayText?.innerText.trim();

    // Click Monthly
    btnMonthly?.click();
    await new Promise(r => setTimeout(r, 200));
    const monthlyAmount = priceAmount?.innerText.trim();
    const monthlyCycle = priceCycle?.innerText.trim();
    const monthlyPayText = btnPayText?.innerText.trim();

    return {
      pass: annualAmount === '890' && monthlyAmount === '99',
      initial: { amount: initialAmount, cycle: initialCycle },
      annual: { amount: annualAmount, cycle: annualCycle, payText: annualPayText },
      monthly: { amount: monthlyAmount, cycle: monthlyCycle, payText: monthlyPayText }
    };
  });
  report.tests.billingCycle = billingTest;
  console.log('Billing Toggle Test:', billingTest);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_pricing_monthly.png') });

  // 3. FAQ Accordions Smooth Test
  console.log('\n--- 3. Testing FAQ Accordions ---');
  const faqTest = await page.evaluate(async () => {
    const results = [];
    for (let i = 1; i <= 6; i++) {
      const btn = document.querySelector(`#faq-card-${i} button`);
      const body = document.getElementById(`faq-body-${i}`);
      const icon = document.getElementById(`faq-icon-${i}`);
      if (!btn || !body) continue;

      btn.click();
      await new Promise(r => setTimeout(r, 350));

      const isOpen = body.classList.contains('open');
      const isRotated = icon?.classList.contains('rotate-180');
      
      // Check other items are closed
      let othersClosed = true;
      for (let j = 1; j <= 6; j++) {
        if (j !== i) {
          const otherBody = document.getElementById(`faq-body-${j}`);
          if (otherBody?.classList.contains('open')) othersClosed = false;
        }
      }

      results.push({
        index: i,
        isOpen,
        isRotated,
        othersClosed
      });
    }
    return {
      total: results.length,
      allPassed: results.every(r => r.isOpen && r.isRotated && r.othersClosed),
      results
    };
  });
  report.tests.faqAccordions = faqTest;
  console.log('FAQ Accordions Test:', faqTest.allPassed ? 'ALL PASS' : 'ISSUES FOUND', faqTest);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_faq_expanded.png') });

  // 4. Inbound Modal Interactive Test
  console.log('\n--- 4. Testing Inbound Modal (Register/Login Tabs & Eye Toggle) ---');
  const inboundTest = await page.evaluate(async () => {
    const heroBtn = document.getElementById('hero-trial-btn');
    heroBtn?.click();
    await new Promise(r => setTimeout(r, 350));

    const modal = document.getElementById('inbound-modal');
    const modalVisible = modal && window.getComputedStyle(modal).opacity !== '0' && !modal.classList.contains('hidden');

    // Switch to Login tab
    const subtabLogin = document.getElementById('inbound-subtab-login');
    subtabLogin?.click();
    await new Promise(r => setTimeout(r, 200));

    const regForm = document.getElementById('inbound-form');
    const loginForm = document.getElementById('inbound-login-form');
    const isLoginActive = loginForm && !loginForm.classList.contains('hidden') && regForm?.classList.contains('hidden');

    // Password visibility toggle test
    const loginPwdInput = document.getElementById('inbound-login-password');
    const pwdToggleBtn = loginForm?.querySelector('button[onclick*="togglePasswordVisibility"]');
    const initialPwdType = loginPwdInput?.type;
    pwdToggleBtn?.click();
    await new Promise(r => setTimeout(r, 100));
    const toggledPwdType = loginPwdInput?.type;
    pwdToggleBtn?.click();
    await new Promise(r => setTimeout(r, 100));
    const restoredPwdType = loginPwdInput?.type;

    // Switch back to Register tab
    const subtabReg = document.getElementById('inbound-subtab-reg');
    subtabReg?.click();
    await new Promise(r => setTimeout(r, 200));
    const isRegActive = regForm && !regForm.classList.contains('hidden') && loginForm?.classList.contains('hidden');

    // Custom Channel Dropdown test
    const channelTrigger = document.getElementById('custom-channel-trigger');
    const channelMenu = document.getElementById('custom-channel-menu');
    channelTrigger?.click();
    await new Promise(r => setTimeout(r, 100));
    const isMenuOpen = channelMenu && !channelMenu.classList.contains('hidden');
    
    // Select option
    const optionXhs = document.querySelector('.custom-channel-option[data-val="xiaohongshu"]');
    optionXhs?.click();
    await new Promise(r => setTimeout(r, 100));
    const channelLabel = document.getElementById('custom-channel-label')?.innerText.trim();
    const hiddenSourceVal = document.getElementById('inbound-channel-source')?.value;

    // Close Modal
    const closeBtn = modal?.querySelector('button[onclick*="closeInboundModal"]');
    closeBtn?.click();
    await new Promise(r => setTimeout(r, 350));
    const modalClosed = modal && (modal.classList.contains('hidden') || window.getComputedStyle(modal).opacity === '0');

    return {
      pass: modalVisible && isLoginActive && toggledPwdType === 'text' && restoredPwdType === 'password' && isRegActive && hiddenSourceVal === 'xiaohongshu' && modalClosed,
      modalVisible,
      isLoginActive,
      passwordToggleWorks: initialPwdType === 'password' && toggledPwdType === 'text' && restoredPwdType === 'password',
      isRegActive,
      channelDropdownWorks: isMenuOpen && hiddenSourceVal === 'xiaohongshu',
      modalClosed
    };
  });
  report.tests.inboundModal = inboundTest;
  console.log('Inbound Modal Test:', inboundTest);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_inbound_modal_closed.png') });

  // 5. Payment Modal Test
  console.log('\n--- 5. Testing Payment Modal (QR Code & Cycle Switch) ---');
  const paymentTest = await page.evaluate(async () => {
    const payBtn = document.getElementById('pricing-pay-btn');
    payBtn?.click();
    await new Promise(r => setTimeout(r, 350));

    const modal = document.getElementById('payment-modal');
    const modalVisible = modal && !modal.classList.contains('hidden') && window.getComputedStyle(modal).opacity !== '0';

    const qrImg = modal?.querySelector('img');
    const qrLoaded = qrImg && qrImg.naturalWidth > 0;

    const switchAnnual = document.getElementById('pay-switch-annual');
    switchAnnual?.click();
    await new Promise(r => setTimeout(r, 150));
    const noteEl = document.getElementById('payment-note-text');
    const annualNote = noteEl?.innerText.trim();

    const switchMonthly = document.getElementById('pay-switch-monthly');
    switchMonthly?.click();
    await new Promise(r => setTimeout(r, 150));
    const monthlyNote = noteEl?.innerText.trim();

    // Close Modal
    const closeBtn = modal?.querySelector('button[onclick*="closePaymentModal"]');
    closeBtn?.click();
    await new Promise(r => setTimeout(r, 350));
    const modalClosed = modal && (modal.classList.contains('hidden') || window.getComputedStyle(modal).opacity === '0');

    return {
      pass: modalVisible && qrLoaded && annualNote?.includes('890') && monthlyNote?.includes('99') && modalClosed,
      modalVisible,
      qrLoaded,
      qrDimensions: qrImg ? { width: qrImg.naturalWidth, height: qrImg.naturalHeight } : null,
      annualNote,
      monthlyNote,
      modalClosed
    };
  });
  report.tests.paymentModal = paymentTest;
  console.log('Payment Modal Test:', paymentTest);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_payment_modal_closed.png') });

  // 6. Multi-Viewport Responsiveness & Element Boundary Analysis
  console.log('\n--- 6. Multi-Viewport Responsiveness & Element Boundary Analysis ---');
  const viewports = [
    { name: 'Desktop-1920', width: 1920, height: 1080 },
    { name: 'Desktop-1440', width: 1440, height: 900 },
    { name: 'Tablet-1024', width: 1024, height: 768 },
    { name: 'Tablet-768', width: 768, height: 1024 },
    { name: 'Mobile-414', width: 414, height: 896 },
    { name: 'Mobile-390', width: 390, height: 844 },
    { name: 'Mobile-375', width: 375, height: 667 },
    { name: 'Mobile-320', width: 320, height: 568 }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise(r => setTimeout(r, 300));

    const vpMetrics = await page.evaluate((w) => {
      const docW = document.documentElement.scrollWidth;
      const bodyW = document.body.scrollWidth;
      const windowW = window.innerWidth;
      const pageOverflow = docW > windowW || bodyW > windowW;

      // Scan all non-ambient elements that exceed bounds
      const protrudingElements = [];
      const allEls = document.querySelectorAll('body *');
      for (const el of allEls) {
        if (el.classList.contains('ambient-glow')) continue;
        const rect = el.getBoundingClientRect();
        if (rect.right > windowW + 1.5 && rect.width > 0) {
          protrudingElements.push({
            tagName: el.tagName,
            id: el.id || '',
            className: (el.className || '').toString().substring(0, 100),
            innerText: (el.innerText || '').substring(0, 40).replace(/\n/g, ' '),
            right: Math.round(rect.right),
            width: Math.round(rect.width)
          });
          if (protrudingElements.length >= 8) break;
        }
      }

      return {
        windowW,
        docW,
        bodyW,
        pageOverflow,
        protrudingElements
      };
    }, vp.width);

    report.viewports[vp.name] = vpMetrics;
    if (vpMetrics.pageOverflow || vpMetrics.protrudingElements.length > 0) {
      console.warn(`[Viewport ${vp.name}] Protrusions detected:`, vpMetrics.protrudingElements);
      report.overflowIssues.push({ viewport: vp.name, ...vpMetrics });
    } else {
      console.log(`[Viewport ${vp.name}] PASS. Perfect boundary adherence.`);
    }

    // Test Mobile Hamburger Drawer on viewports < 768
    if (vp.width < 768) {
      const drawerTest = await page.evaluate(async () => {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const drawer = document.getElementById('mobile-nav-drawer');
        const icon = document.getElementById('mobile-menu-icon');

        const isInitiallyHidden = drawer?.classList.contains('hidden');
        menuBtn?.click();
        await new Promise(r => setTimeout(r, 200));
        const isOpen = !drawer?.classList.contains('hidden') && icon?.classList.contains('fa-xmark');

        menuBtn?.click();
        await new Promise(r => setTimeout(r, 200));
        const isClosedAgain = drawer?.classList.contains('hidden') && icon?.classList.contains('fa-bars');

        return {
          menuBtnFound: !!menuBtn,
          toggleWorks: isInitiallyHidden && isOpen && isClosedAgain
        };
      });
      report.tests[`drawer_${vp.name}`] = drawerTest;
      console.log(`Mobile Nav Drawer on ${vp.name}:`, drawerTest.toggleWorks ? 'PASS' : 'FAIL');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `vp_${vp.name}.png`) });
  }

  // Summary
  const allTestsPassed = Object.values(report.tests).every(t => t.pass !== false && t.allPassed !== false && t.toggleWorks !== false);
  const noConsoleErrors = report.consoleErrors.length === 0;
  const noNetworkErrors = report.networkErrors.length === 0;
  const noPageOverflow = report.overflowIssues.filter(o => o.pageOverflow).length === 0;

  report.summary = {
    status: (allTestsPassed && noConsoleErrors && noNetworkErrors && noPageOverflow) ? 'PASS' : 'ISSUES_FOUND',
    allTestsPassed,
    noConsoleErrors,
    noNetworkErrors,
    noPageOverflow,
    protrusionIssueCount: report.overflowIssues.length
  };

  const jsonPath = path.join(__dirname, 'detailed_audit_result.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n================ AUDIT FINISHED ================`);
  console.log(`Final Status: ${report.summary.status}`);
  console.log(`Protrusion issues found: ${report.summary.protrusionIssueCount}`);
  console.log(`Saved detailed report to: ${jsonPath}`);

  await browser.close();
  return report;
}

runComprehensiveAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
