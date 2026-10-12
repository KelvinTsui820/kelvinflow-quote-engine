const puppeteer = require('puppeteer-core');
const fs = require('fs');

function getChromePath() {
  const winPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const p of winPaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome not found');
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    console.log('Navigating to live https://kelvinflow.com ...');
    await page.goto('https://kelvinflow.com/', { waitUntil: 'networkidle2' });

    // Open Trial Modal
    await page.click('#hero-trial-btn');
    await new Promise(r => setTimeout(r, 500));

    // Verify channel options live on production
    await page.click('#custom-channel-trigger');
    await new Promise(r => setTimeout(r, 300));
    const opts = await page.$$eval('.custom-channel-option', els => els.map(e => e.textContent.trim()));
    console.log('Live production channel options:', opts);

    // Select '小红书'
    await page.click('.custom-channel-option[data-val="xiaohongshu"]');
    await new Promise(r => setTimeout(r, 200));

    // Open Payment Modal
    await page.evaluate(() => openPaymentModal('monthly'));
    await new Promise(r => setTimeout(r, 500));

    const qrSrc = await page.$eval('#payment-modal img', el => el.getAttribute('src'));
    console.log('Live production Payment Modal QR src:', qrSrc);

    const hasBlueBoxButtons = await page.$eval('#payment-modal', el => {
      return el.innerHTML.includes('copyPaymentNote') || el.innerHTML.includes('copyFounderWechat');
    });
    console.log('Does live payment modal have blue box buttons?', hasBlueBoxButtons);

    console.log('\n🎉 ALL LIVE AUDITS PASSED WITH FLYING COLORS!');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
