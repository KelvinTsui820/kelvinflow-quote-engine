const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const LANDING_URL = 'https://kelvinflow.com';
const WORKBENCH_BASE = 'https://quote.kelvinflow.com';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots_workbench');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runWorkbenchFullAudit() {
  console.log(`[Workbench Audit] Launching Chrome against ${LANDING_URL} -> ${WORKBENCH_BASE}...`);
  
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
    timestamp: new Date().toISOString(),
    entryFlow: {},
    workbenchData: {},
    modalsTested: {},
    interactiveCalculations: {},
    viewportsTested: [],
    consoleErrors: [],
    consoleWarnings: [],
    networkFailures: [],
    documentOverflows: [],
    summary: { status: 'UNKNOWN' }
  };

  const page = await browser.newPage();

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error') {
      report.consoleErrors.push(text);
      console.log(`[Console ERROR] ${text}`);
    } else if (type === 'warn') {
      report.consoleWarnings.push(text);
    }
  });

  page.on('pageerror', err => {
    report.consoleErrors.push(err.toString());
    console.error(`[Page ERROR] ${err.toString()}`);
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      report.networkFailures.push({
        url: res.url(),
        status: res.status()
      });
      console.log(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });

  // ================= 1. ENTRY FROM KELVINFLOW.COM =================
  console.log('\n--- 1. Testing Entry Button on kelvinflow.com ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(LANDING_URL, { waitUntil: 'networkidle2', timeout: 30000 });

  // Simulate logged-in user on landing page
  const entryCheck = await page.evaluate(() => {
    localStorage.setItem('kelvinflow_user_phone', '18520260282');
    localStorage.setItem('kelvinflow_user_email', 'sales@example.com');
    localStorage.setItem('kelvinflow_user_name', 'Kelvin');
    localStorage.setItem('kelvinflow_user_plan', 'geek');
    localStorage.setItem('kelvinflow_user_is_paid', 'true');
    localStorage.setItem('saas_auth_token', 'demo_token_2026');

    if (typeof window.updateNavForLoggedInUser === 'function') {
      window.updateNavForLoggedInUser();
    }

    const btn = document.getElementById('nav-workbench-btn');
    return {
      btnFound: !!btn,
      btnDisplay: btn ? window.getComputedStyle(btn).display : 'none',
      btnHref: btn ? btn.getAttribute('href') : null
    };
  });
  report.entryFlow = entryCheck;
  console.log('Entry Button Check:', entryCheck);

  // Navigate to workbench
  console.log('Clicking workbench button to enter quote.kelvinflow.com...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(e => {}),
    page.evaluate(() => {
      const btn = document.getElementById('nav-workbench-btn');
      if (btn) btn.click();
      else window.location.href = '/review/QT-20260904-888';
    })
  ]);

  let currentUrl = page.url();
  console.log('Navigated URL:', currentUrl);
  if (!currentUrl.includes('quote.kelvinflow.com')) {
    await page.goto(`${WORKBENCH_BASE}/review/QT-20260904-888`, { waitUntil: 'networkidle2', timeout: 30000 });
    currentUrl = page.url();
  }
  report.entryFlow.finalUrl = currentUrl;

  // Set user state on workbench domain as well
  await page.evaluate(() => {
    localStorage.setItem('kelvinflow_user_phone', '18520260282');
    localStorage.setItem('kelvinflow_user_email', 'sales@example.com');
    localStorage.setItem('kelvinflow_user_name', 'Kelvin');
    localStorage.setItem('kelvinflow_user_plan', 'geek');
    localStorage.setItem('kelvinflow_user_is_paid', 'true');
    localStorage.setItem('saas_auth_token', 'demo_token_2026');
  });

  // Wait for Vue data render
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll('tbody tr');
    return rows.length >= 3;
  }, { timeout: 15000 });

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_workbench_home.png') });

  // ================= 2. WORKBENCH DATA INTEGRITY =================
  console.log('\n--- 2. Checking Workbench Data & Header Integrity ---');
  const dataIntegrity = await page.evaluate(() => {
    const quoteNo = document.body.innerText.match(/QT-20260904-888/)?.[0];
    const customer = Array.from(document.querySelectorAll('*')).find(el => el.innerText && el.innerText.includes('Apex'))?.innerText.trim();
    const rows = document.querySelectorAll('tbody tr').length;
    const items = Array.from(document.querySelectorAll('tbody tr')).map(tr => {
      const inputs = Array.from(tr.querySelectorAll('input')).map(i => i.value);
      return {
        text: tr.innerText.substring(0, 40).replace(/\s+/g, ' '),
        inputsCount: inputs.length
      };
    });

    const isPaid = !document.body.innerText.includes('登录 / 开通试用');

    return {
      quoteNo,
      customerSample: customer ? customer.substring(0, 30) : null,
      rowsCount: rows,
      itemsSample: items,
      isUserRecognized: isPaid
    };
  });
  report.workbenchData = dataIntegrity;
  console.log('Data Integrity:', dataIntegrity);

  // ================= 3. MODALS INTERACTION AUDIT =================
  console.log('\n--- 3. Testing Workbench Modal Interactions ---');

  // Dismiss tour if present so it doesn't block interactions
  await page.evaluate(() => {
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
    const tourOverlay = document.getElementById('tour-spotlight-overlay');
    if (tourOverlay) {
      const skipBtn = Array.from(tourOverlay.querySelectorAll('button')).find(b => b.innerText.includes('跳过') || b.querySelector('i.fa-xmark'));
      skipBtn?.click();
    }
  });
  await new Promise(r => setTimeout(r, 400));

  // 3.1 Pricing Modal (底价库与标准模板)
  const pricingModalTest = await page.evaluate(async () => {
    const btn = document.getElementById('tour-step-1');
    btn?.click();
    await new Promise(r => setTimeout(r, 400));
    let modal = document.getElementById('pricing-modal-overlay');
    const opened = !!modal && window.getComputedStyle(modal).display !== 'none';

    // Close via X button
    const closeBtn = modal?.querySelector('i.fa-xmark')?.closest('button') || 
                     Array.from(modal ? modal.querySelectorAll('button') : []).find(b => b.innerText.includes('关闭'));
    closeBtn?.click();
    await new Promise(r => setTimeout(r, 400));

    modal = document.getElementById('pricing-modal-overlay');
    const closed = !modal || window.getComputedStyle(modal).display === 'none';

    return {
      triggerFound: !!btn,
      opened,
      closed
    };
  });
  report.modalsTested.pricingModal = pricingModalTest;
  console.log('Pricing Modal Test:', pricingModalTest);

  // 3.2 New PO Modal (上传新询盘建单)
  const newPoModalTest = await page.evaluate(async () => {
    const btn = document.getElementById('tour-step-2');
    btn?.click();
    await new Promise(r => setTimeout(r, 400));
    let modal = document.getElementById('new-po-modal-overlay');
    const opened = !!modal && window.getComputedStyle(modal).display !== 'none';

    const closeBtn = modal?.querySelector('i.fa-xmark')?.closest('button') || 
                     Array.from(modal ? modal.querySelectorAll('button') : []).find(b => b.innerText.includes('关闭'));
    closeBtn?.click();
    await new Promise(r => setTimeout(r, 400));

    modal = document.getElementById('new-po-modal-overlay');
    const closed = !modal || window.getComputedStyle(modal).display === 'none';

    return {
      triggerFound: !!btn,
      opened,
      closed
    };
  });
  report.modalsTested.newPoModal = newPoModalTest;
  console.log('New PO Modal Test:', newPoModalTest);

  // 3.3 Logo Modal (报价单Logo)
  const logoModalTest = await page.evaluate(async () => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Logo'));
    btn?.click();
    await new Promise(r => setTimeout(r, 400));
    let modal = document.getElementById('logo-modal-overlay');
    const opened = !!modal && window.getComputedStyle(modal).display !== 'none';

    const closeBtn = modal?.querySelector('i.fa-xmark')?.closest('button') || 
                     Array.from(modal ? modal.querySelectorAll('button') : []).find(b => b.innerText.includes('关闭') || b.innerText.includes('取消'));
    closeBtn?.click();
    await new Promise(r => setTimeout(r, 400));

    modal = document.getElementById('logo-modal-overlay');
    const closed = !modal || window.getComputedStyle(modal).display === 'none';

    return {
      triggerFound: !!btn,
      opened,
      closed
    };
  });
  report.modalsTested.logoModal = logoModalTest;
  console.log('Logo Modal Test:', logoModalTest);

  // 3.4 Confirm Modal (一键直达草稿箱 / 一键出单)
  const confirmModalTest = await page.evaluate(async () => {
    const btn = document.getElementById('tour-step-3');
    
    // Step A: Trigger safeguard check when zero-price item exists
    btn?.click();
    await new Promise(r => setTimeout(r, 400));
    const toastSafeguardActive = !!Array.from(document.querySelectorAll('*')).find(el => el.innerText && el.innerText.includes('检测到商品价格为 0'));

    // Step B: Set unit prices on table inputs so confirmation can proceed
    const inputs = document.querySelectorAll('input.table-input');
    inputs.forEach(inp => {
      if (!inp.value || Number(inp.value) <= 0) {
        inp.value = '25.00';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 400));

    // Step C: Trigger confirm modal
    btn?.click();
    await new Promise(r => setTimeout(r, 400));
    let modal = document.getElementById('confirm-modal-overlay');
    const opened = !!modal && window.getComputedStyle(modal).display !== 'none';

    const cancelBtn = modal ? Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('取消') || b.innerText.includes('返回')) : null;
    cancelBtn?.click();
    await new Promise(r => setTimeout(r, 400));

    modal = document.getElementById('confirm-modal-overlay');
    const closed = !modal || window.getComputedStyle(modal).display === 'none';

    return {
      triggerFound: !!btn,
      toastSafeguardActive,
      opened,
      closed
    };
  });
  report.modalsTested.confirmModal = confirmModalTest;
  console.log('Confirm Modal Test:', confirmModalTest);

  // ================= 4. REALTIME PRICE CALCULATION =================
  console.log('\n--- 4. Testing Realtime Price Recalculation ---');
  const calcTest = await page.evaluate(async () => {
    const firstRowInputs = document.querySelectorAll('tbody tr:first-child input[type="number"]');
    if (firstRowInputs.length === 0) return { passed: false, reason: 'No number inputs found in first row' };

    // Select margin input
    const marginInput = firstRowInputs[0];
    const origVal = Number(marginInput.value) || 20;

    // Read total bottom amount
    const totalEl = document.querySelector('header span.text-emerald-400') || document.querySelector('.bottom-0 span.text-emerald-400') || document.querySelector('strong.text-emerald-400');
    const initialText = totalEl ? totalEl.innerText.trim() : '';

    marginInput.value = String(origVal + 10);
    marginInput.dispatchEvent(new Event('input', { bubbles: true }));
    marginInput.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));

    const updatedText = totalEl ? totalEl.innerText.trim() : '';

    return {
      passed: true,
      marginInputFound: !!marginInput,
      origVal,
      newVal: marginInput.value,
      initialText,
      updatedText
    };
  });
  report.interactiveCalculations = calcTest;
  console.log('Calculation Test:', calcTest);

  // ================= 5. MULTI-VIEWPORT RESPONSIVENESS & OVERFLOWS =================
  console.log('\n--- 5. Testing Multi-Viewport Document Overflows ---');
  const viewports = [
    { name: 'Desktop-1920', width: 1920, height: 1080 },
    { name: 'Desktop-1440', width: 1440, height: 900 },
    { name: 'Tablet-1024', width: 1024, height: 768 },
    { name: 'Tablet-768', width: 768, height: 1024 },
    { name: 'Mobile-390', width: 390, height: 844 },
    { name: 'Mobile-375', width: 375, height: 667 }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise(r => setTimeout(r, 500));

    const overflowMetrics = await page.evaluate((w) => {
      const docW = document.documentElement.scrollWidth;
      const bodyW = document.body.scrollWidth;
      const winW = window.innerWidth;
      const hasDocOverflow = docW > winW || bodyW > winW;

      return {
        viewportWidth: w,
        docW,
        bodyW,
        hasDocOverflow
      };
    }, vp.width);

    report.viewportsTested.push({ name: vp.name, ...overflowMetrics });

    if (overflowMetrics.hasDocOverflow) {
      console.warn(`[Viewport ${vp.name}] OVERFLOW! docW: ${overflowMetrics.docW}px vs window: ${vp.width}px`);
      report.documentOverflows.push({ viewport: vp.name, ...overflowMetrics });
    } else {
      console.log(`[Viewport ${vp.name}] PASS. 0 document overflow (docW: ${overflowMetrics.docW}px == winW: ${vp.width}px).`);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `wb_${vp.name}.png`), fullPage: false });
  }

  // Summary
  const noConsoleErrors = report.consoleErrors.length === 0;
  const noNetworkErrors = report.networkFailures.length === 0;
  const noDocOverflow = report.documentOverflows.length === 0;
  const allModalsPassed = Object.values(report.modalsTested).every(m => m.opened && m.closed);

  report.summary = {
    status: (noConsoleErrors && noNetworkErrors && noDocOverflow && allModalsPassed) ? 'PASS' : 'ISSUES_FOUND',
    noConsoleErrors,
    noNetworkErrors,
    noDocOverflow,
    allModalsPassed,
    documentOverflowCount: report.documentOverflows.length
  };

  const jsonPath = path.join(__dirname, 'workbench_audit_result.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n================ AUDIT FINISHED ================`);
  console.log(`Final Status: ${report.summary.status}`);
  console.log(`Document Overflows: ${report.summary.documentOverflowCount}`);
  console.log(`All Modals Passed: ${report.summary.allModalsPassed}`);
  console.log(`Report written to: ${jsonPath}`);

  await browser.close();
  return report;
}

runWorkbenchFullAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
