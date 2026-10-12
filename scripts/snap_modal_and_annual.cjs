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
  await new Promise(r => setTimeout(r, 1000));

  // 1. 测试切换为年付
  await page.click('#btn-billing-annual');
  await new Promise(r => setTimeout(r, 600));
  const pricingEl = await page.$('#pricing');
  if (pricingEl) {
    await pricingEl.screenshot({ path: path.resolve(__dirname, '..', 'pricing_annual_live.png') });
    console.log('✅ Annual pricing screenshot saved');
  }

  // 2. 测试打开支付弹窗
  await page.click('#pricing-pay-btn');
  await new Promise(r => setTimeout(r, 600));
  const payModal = await page.$('#payment-modal');
  if (payModal) {
    await page.screenshot({ path: path.resolve(__dirname, '..', 'payment_modal_live.png') });
    console.log('✅ Payment modal screenshot saved');
  }

  await browser.close();
})();
