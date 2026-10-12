const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

function getChromePath() {
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

(async () => {
  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto('http://192.255.145.11:3000/#pricing', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  const pricingEl = await page.$('#pricing');
  if (pricingEl) {
    const shotPath = path.resolve(__dirname, '..', 'pricing_production_live.png');
    await pricingEl.screenshot({ path: shotPath });
    console.log('✅ Screenshot saved to:', shotPath);
  } else {
    console.log('❌ #pricing not found');
  }

  await browser.close();
})();
