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

async function runVerification() {
  console.log('🚀 Starting local HTTP server for testing index.html...');
  const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, '..', 'public', req.url === '/' ? 'index.html' : req.url);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.writeHead(200);
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise(r => server.listen(8999, '127.0.0.1', r));
  console.log('Server listening on http://127.0.0.1:8999');

  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const artifactDir = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\b82ea610-5577-4d85-b3da-91290fcde81a';

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('Navigating to http://127.0.0.1:8999 ...');
    await page.goto('http://127.0.0.1:8999/', { waitUntil: 'domcontentloaded', timeout: 10000 });

    // 1. Verify Pricing Card Button Symmetry (Images 3 & 4)
    console.log('\n--- 1. Testing Pricing Buttons Symmetry ---');
    const trialBtnBox = await page.$eval('#pricing-trial-btn', el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return { width: rect.width, height: rect.height, fontSize: style.fontSize, fontWeight: style.fontWeight };
    });

    const payBtnBox = await page.$eval('#pricing-pay-btn', el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return { width: rect.width, height: rect.height, fontSize: style.fontSize, fontWeight: style.fontWeight };
    });

    console.log('Trial Button Box & Style:', trialBtnBox);
    console.log('Pay Button Box & Style:', payBtnBox);

    const heightDiff = Math.abs(trialBtnBox.height - payBtnBox.height);
    if (heightDiff > 3) {
      throw new Error(`Button height mismatch! Trial: ${trialBtnBox.height}px, Pay: ${payBtnBox.height}px`);
    }
    console.log(`✅ PASS: Both buttons have symmetrical height (diff: ${heightDiff.toFixed(1)}px)!`);

    // Scroll pricing into view and capture screenshot
    await page.evaluate(() => {
      document.getElementById('pricing').scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(artifactDir, 'fixed_pricing_button_symmetry.png') });
    console.log('📸 Captured fixed_pricing_button_symmetry.png');

    // 2. Verify Payment Modal Optimization with Promo 39 Tab
    console.log('\n--- 2. Testing Payment Modal Optimization with Promo 39 ---');
    await page.evaluate(() => openPaymentModal('promo'));
    await new Promise(r => setTimeout(r, 400));

    // Verify modal elements
    const modalInfo = await page.evaluate(() => {
      const modal = document.getElementById('payment-modal');
      const title = modal.querySelector('h3')?.innerText;
      const hasValueBadges = modal.innerText.includes('无限询盘出单') && modal.innerText.includes('自定义企业Logo');
      const has3Steps = modal.innerText.includes('微信扫码转账') && modal.innerText.includes('5 分钟内');
      const hasCopyNote = !!document.getElementById('copy-pay-note-text');
      const hasCopyWechat = !!document.getElementById('copy-founder-wechat-text');
      const hasTrustFooter = modal.innerText.includes('30天数据保留') && modal.innerText.includes('到期不自动扣费');
      const noteText = document.getElementById('payment-note-text')?.innerText;
      return { title, hasValueBadges, has3Steps, hasCopyNote, hasCopyWechat, hasTrustFooter, noteText };
    });

    console.log('Payment Modal Diagnostics:', modalInfo);
    if (!modalInfo.hasValueBadges) throw new Error('Payment modal is missing value badges!');
    if (!modalInfo.has3Steps) throw new Error('Payment modal is missing 3-step guide!');
    if (!modalInfo.hasCopyNote) throw new Error('Payment modal is missing copy note button!');
    if (!modalInfo.hasCopyWechat) throw new Error('Payment modal is missing copy wechat fallback button!');
    if (!modalInfo.hasTrustFooter) throw new Error('Payment modal is missing trust guarantee badges!');
    if (!modalInfo.noteText.includes('39')) throw new Error(`Promo note text missing 39, got: ${modalInfo.noteText}`);

    console.log('✅ PASS: All payment modal enhancements & Promo ¥39 tab confirmed in DOM!');

    // Test cycle switch to annual
    await page.click('#pay-switch-annual');
    await new Promise(r => setTimeout(r, 200));
    const annualNote = await page.$eval('#payment-note-text', el => el.innerText);
    console.log('Annual note text after switch:', annualNote);
    if (!annualNote.includes('890')) {
      throw new Error(`Annual note text did not update to 890, got ${annualNote}`);
    }
    console.log('✅ PASS: Cycle switch to annual updates remark dynamically!');

    // Test cycle switch to monthly
    await page.click('#pay-switch-monthly');
    await new Promise(r => setTimeout(r, 200));
    const monthlyNote = await page.$eval('#payment-note-text', el => el.innerText);
    console.log('Monthly note text after switch:', monthlyNote);
    if (!monthlyNote.includes('99')) {
      throw new Error(`Monthly note text did not update to 99, got ${monthlyNote}`);
    }
    console.log('✅ PASS: Cycle switch to monthly updates remark dynamically!');

    // Capture screenshot of optimized payment modal
    await page.screenshot({ path: path.join(artifactDir, 'fixed_payment_modal_optimized.png') });
    console.log('📸 Captured fixed_payment_modal_optimized.png');

    console.log('\n🎉 ALL SCREENSHOT DEFECTS RESOLVED & VERIFIED WITH 100% SUCCESS!');
  } finally {
    await browser.close();
    server.close();
  }
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
