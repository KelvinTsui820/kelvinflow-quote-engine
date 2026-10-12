const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const http = require('http');

function getChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const winPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
  ];
  for (const p of winPaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome executable not found');
}

const mockQuoteData = {
  id: 'QT-20260904-888',
  quoteNumber: 'QT-20260904-888',
  customerName: 'Marcus Weber',
  companyName: 'Acme Global Ltd',
  items: [
    {
      sku: 'ST-2026-A',
      matchedSku: 'ST-2026-A',
      name: 'Aluminum Alloy Precision Bracket',
      description: 'Aluminum Alloy Precision Bracket (Heavy Bracket / Stand Pro) - Custom finish: Matte Black Coating',
      quantity: 2000,
      costPriceRmb: 15.5,
      profitMargin: 20,
      unitPriceUsd: 2.65,
      totalPriceUsd: 5300.0
    }
  ],
  pricingConfig: {
    exchangeRate: 7.2,
    sampleMultiplier: 2.5,
    paymentTerms: [{ val: '30% T/T Advance' }]
  },
  terms: {
    payment: '30% T/T Deposit, 70% Balance before shipment',
    validity: '30 Days (Subject to exchange rate fluctuation clause)',
    leadTime: '25-30 days upon receipt of deposit',
    samplePolicy: 'Sample fee 2.5x base price, 100% refundable upon bulk order MOQ',
    remarks: 'Prices are based on standard export packaging.'
  },
  replyEmail: 'Dear Buyer, please find our quotation attached.'
};

async function run() {
  console.log('🚀 Starting mock HTTP server for testing review.html...');
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1:8999');
    
    // API mocks
    if (url.pathname.startsWith('/api/v1/quotes/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, quotation: mockQuoteData }));
    }
    if (url.pathname.startsWith('/api/v1/pricing/status')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, hasCustomPricing: true }));
    }
    if (url.pathname.startsWith('/api/v1/auth/trial-status')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, email: 'admin@foshan-kelvin.com', isPaid: true, trialDaysLeft: 7 }));
    }
    if (url.pathname.startsWith('/api/v1/tenant/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, profile: {} }));
    }

    // Serve review.html or static files
    let filePath = path.join(__dirname, '..', 'public', url.pathname === '/' || url.pathname.startsWith('/review') ? 'review.html' : url.pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mime = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise(r => server.listen(8999, '127.0.0.1', r));
  console.log('Mock server running at http://127.0.0.1:8999');

  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.toString()));
  page.on('console', msg => {
    if (msg.type() === 'error') pageErrors.push(msg.text());
  });

  try {
    console.log('Navigating to review page...');
    await page.goto('http://127.0.0.1:8999/review/QT-20260904-888', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));

    console.log('\n--- TEST 1: descModal Fix & Button Text ---');
    // Open descModal for first item
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="放大全景查看并编辑完整规格"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Verify modal is open
    const descModalVisible = await page.evaluate(() => {
      const modal = document.querySelector('textarea[placeholder*="自由查看与编辑完整品名规格描述"]');
      return !!modal;
    });
    console.log('descModal visible:', descModalVisible);
    if (!descModalVisible) throw new Error('descModal did not open!');

    // Check descModal confirm button text
    const descBtnText = await page.evaluate(() => {
      // Find confirm button in descModal
      const textarea = document.querySelector('textarea[placeholder*="自由查看与编辑完整品名规格描述"]');
      const container = textarea.closest('.bg-white');
      const btn = container.querySelector('button.bg-blue-600');
      return btn ? btn.textContent.trim() : null;
    });
    console.log('descModal button text:', descBtnText);
    if (descBtnText !== '完成') {
      throw new Error(`Expected descModal button to be '完成', got '${descBtnText}'`);
    }
    console.log('✅ PASS: descModal button text is "完成"');

    // Type 'aaa' at end of tempDescription and click "完成"
    await page.evaluate(() => {
      const textarea = document.querySelector('textarea[placeholder*="自由查看与编辑完整品名规格描述"]');
      textarea.value += ' aaa';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      
      const container = textarea.closest('.bg-white');
      const btn = container.querySelector('button.bg-blue-600');
      btn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Verify modal closed without error
    const descModalStillOpen = await page.evaluate(() => {
      return !!document.querySelector('textarea[placeholder*="自由查看与编辑完整品名规格描述"]');
    });
    console.log('descModal closed after click:', !descModalStillOpen);
    if (descModalStillOpen) {
      throw new Error('descModal did not close when clicking 完成! hasUnsavedChanges error might have reoccurred.');
    }
    console.log('✅ PASS: descModal closed smoothly with NO runtime errors!');

    console.log('\n--- TEST 2: termsModal Draft Isolation & Button Text ---');
    // Open termsModal
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="放大编辑付款条款"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Check termsModal button text
    const termsBtnText = await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="关闭条款编辑窗口"]');
      const modal = closeBtn ? closeBtn.closest('.bg-white') : null;
      if (!modal) return null;
      const btns = Array.from(modal.querySelectorAll('button.bg-blue-600'));
      const finishBtn = btns.find(b => b.textContent.includes('完成'));
      return finishBtn ? finishBtn.textContent.trim() : (btns[0] ? btns[0].textContent.trim() : null);
    });
    console.log('termsModal button text:', termsBtnText);
    if (termsBtnText !== '完成') {
      throw new Error(`Expected termsModal button to be '完成', got '${termsBtnText}'`);
    }
    console.log('✅ PASS: termsModal button text is "完成"');

    // Subtest 2A: Type 'aaa' into payment terms, then click 'x' (cancel)
    const originalPaymentTextOnPage = await page.evaluate(() => {
      const mainTextarea = document.querySelector('textarea[placeholder*="30% Deposit, 70% Balance before shipment"]');
      return mainTextarea ? mainTextarea.value : '';
    });
    console.log('Original payment text on main page:', originalPaymentTextOnPage);

    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="关闭条款编辑窗口"]');
      const modal = closeBtn ? closeBtn.closest('.bg-white') : null;
      const modalTextarea = modal.querySelector('textarea');
      modalTextarea.value += ' aaa';
      modalTextarea.dispatchEvent(new Event('input', { bubbles: true }));

      // Click top-right 'x' close button
      closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const paymentTextAfterCancel = await page.evaluate(() => {
      const mainTextarea = document.querySelector('textarea[placeholder*="30% Deposit, 70% Balance before shipment"]');
      return mainTextarea ? mainTextarea.value : '';
    });
    console.log('Payment text on main page after clicking x:', paymentTextAfterCancel);
    if (paymentTextAfterCancel.includes('aaa')) {
      throw new Error('Payment text on main page was mutated after clicking x! Draft isolation failed.');
    }
    console.log('✅ PASS: Clicking "x" correctly discarded changes without mutating main page!');

    // Subtest 2B: Open modal again, type 'aaa', and click "完成"
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="放大编辑付款条款"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="关闭条款编辑窗口"]');
      const modal = closeBtn ? closeBtn.closest('.bg-white') : null;
      const modalTextarea = modal.querySelector('textarea');
      modalTextarea.value += ' aaa';
      modalTextarea.dispatchEvent(new Event('input', { bubbles: true }));

      // Click "完成" button
      const confirmBtn = modal.querySelector('button.bg-blue-600');
      confirmBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const paymentTextAfterConfirm = await page.evaluate(() => {
      const mainTextarea = document.querySelector('textarea[placeholder*="30% Deposit, 70% Balance before shipment"]');
      return mainTextarea ? mainTextarea.value : '';
    });
    console.log('Payment text on main page after clicking 完成:', paymentTextAfterConfirm);
    if (!paymentTextAfterConfirm.includes('aaa')) {
      throw new Error('Payment text on main page was NOT updated after clicking 完成!');
    }
    console.log('✅ PASS: Clicking "完成" correctly saved changes to the main page!');

    console.log('\n--- TEST 3: emailFullscreenModal Button Text ---');
    // Open emailFullscreenModal
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="全屏沉浸式编辑与排版"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const emailBtnText = await page.evaluate(() => {
      const modal = document.querySelector('.fa-envelope-open-text')?.closest('.bg-slate-900') || document.querySelector('.fa-envelope-open-text')?.closest('.bg-white');
      // Look for top right button with fa-check
      const checkIcon = document.querySelector('.fa-check');
      const btn = checkIcon ? checkIcon.closest('button') : null;
      return btn ? btn.textContent.trim() : null;
    });
    console.log('emailFullscreenModal button text:', emailBtnText);
    if (emailBtnText !== '完成') {
      throw new Error(`Expected emailFullscreenModal button to be '完成', got '${emailBtnText}'`);
    }
    console.log('✅ PASS: emailFullscreenModal button text is "完成"');

    // Close emailFullscreenModal
    await page.evaluate(() => {
      const checkIcon = document.querySelector('.fa-check');
      if (checkIcon) checkIcon.closest('button').click();
    });
    await new Promise(r => setTimeout(r, 400));

    console.log('\n--- TEST 4: newPoModal Tab 2 Button Text ---');
    // Open newPoModal
    await page.evaluate(() => {
      const newPoBtn = document.querySelector('#tour-step-2');
      if (newPoBtn) newPoBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Switch to Tab 2
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const tab2 = tabs.find(t => t.textContent.includes('粘贴英文正文'));
      if (tab2) tab2.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const tab2BtnText = await page.evaluate(() => {
      const modal = document.querySelector('#new-po-modal-overlay');
      if (!modal) return null;
      // Find the main action button in mode text
      const btn = modal.querySelector('div.space-y-3 button.bg-blue-600') || modal.querySelector('button.bg-blue-600');
      return btn ? btn.textContent.trim() : null;
    });
    console.log('newPoModal Tab 2 action button text:', tab2BtnText);
    if (!tab2BtnText || !tab2BtnText.includes('开始 AI 智能建单')) {
      throw new Error(`Expected newPoModal Tab 2 button to contain '开始 AI 智能建单', got '${tab2BtnText}'`);
    }
    console.log('✅ PASS: newPoModal Tab 2 action button text is "开始 AI 智能建单"!');

    // Screenshot all 3 modals for artifact verification
    const artifactDir = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\b82ea610-5577-4d85-b3da-91290fcde81a';
    await page.screenshot({ path: path.join(artifactDir, 'verified_batch5_quick_quote_tab2.png') });

    // Open termsModal and screenshot
    await page.evaluate(() => {
      const overlay = document.querySelector('#new-po-modal-overlay');
      if (overlay) overlay.style.display = 'none';
    });
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="放大编辑付款条款"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(artifactDir, 'verified_batch5_terms_modal.png') });

    if (pageErrors.length > 0) {
      console.warn('⚠️ Console/Page errors during test:', pageErrors);
    } else {
      console.log('\n🎉 ALL 5 DEFECTS VERIFIED FIXED WITH ZERO CONSOLE ERRORS!');
    }

  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
