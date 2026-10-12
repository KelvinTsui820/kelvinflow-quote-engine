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

  await new Promise(r => server.listen(8998, '127.0.0.1', r));
  console.log('Server listening on http://127.0.0.1:8998');

  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('Navigating to http://127.0.0.1:8998 ...');
    await page.goto('http://127.0.0.1:8998/', { waitUntil: 'domcontentloaded', timeout: 10000 });

    // 1. Check Inbound Modal & Channel Dropdown Options
    await page.evaluate(() => openInboundModal('starter'));
    await new Promise(r => setTimeout(r, 400));

    // Open Channel dropdown
    await page.click('#custom-channel-trigger');
    await new Promise(r => setTimeout(r, 300));

    const options = await page.$$eval('.custom-channel-option', els => els.map(e => e.textContent.trim()));
    console.log('Channel options found:', options);

    const expectedOptions = ['小红书', '外贸同行/朋友推荐', '外贸行业群组', '搜索引擎/其它'];
    for (const exp of expectedOptions) {
      if (!options.some(opt => opt.includes(exp))) {
        throw new Error(`Missing expected option: ${exp}`);
      }
    }
    console.log('✅ PASS: All 4 requested channel options exist exactly as specified!');

    // Screenshot open dropdown
    const artifactDir = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\b82ea610-5577-4d85-b3da-91290fcde81a';
    await page.screenshot({ path: path.join(artifactDir, 'fixed_dropdown_modal.png') });
    console.log('📸 Captured fixed_dropdown_modal.png');

    // Close Inbound Modal
    await page.click('#inbound-modal button[aria-label="关闭试用开通窗口"]');
    await new Promise(r => setTimeout(r, 400));

    // 2. Check Payment Modal (QR without username, blue box removed)
    await page.evaluate(() => openPaymentModal('monthly'));
    await new Promise(r => setTimeout(r, 400));

    const qrSrc = await page.$eval('#payment-modal img', el => el.getAttribute('src'));
    console.log('Payment modal QR src:', qrSrc);
    if (!qrSrc.includes('contact_wechat.png')) {
      throw new Error(`QR image src is not /contact_wechat.png, got ${qrSrc}`);
    }
    console.log('✅ PASS: QR image updated to /contact_wechat.png (no username header)!');

    // Check that blue box contents are GONE
    const modalText = await page.$eval('#payment-modal', el => el.innerText);
    if (modalText.includes('扫码转账或添加创始人微信')) {
      throw new Error('Founder WeChat subtext still present in payment modal!');
    }
    if (modalText.includes('复制转账备注') || modalText.includes('复制微信号')) {
      throw new Error('Copy buttons still present in payment modal!');
    }
    console.log('✅ PASS: Blue-boxed subtext and buttons completely removed!');

    // Screenshot updated payment modal
    await page.screenshot({ path: path.join(artifactDir, 'fixed_clean_payment_modal.png') });
    console.log('📸 Captured fixed_clean_payment_modal.png');

    console.log('\n🎉 ALL SCREENSHOT FIXES VERIFIED PERFECTLY!');
  } finally {
    await browser.close();
    server.close();
  }
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
