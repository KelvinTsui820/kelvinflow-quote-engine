const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5';

async function main() {
  console.log('🚀 Verifying payment modal without outer border on live production...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://192.255.145.11:3000/?t=' + Date.now(), { waitUntil: 'networkidle2' });

  // Open payment modal
  await page.evaluate(() => {
    if (typeof openPaymentModal === 'function') {
      openPaymentModal('monthly');
    }
  });

  await new Promise(r => setTimeout(r, 600));

  const modalCheck = await page.evaluate(() => {
    const btnMonthly = document.getElementById('pay-switch-monthly');
    const container = btnMonthly ? btnMonthly.parentElement : null;
    return {
      containerClassName: container ? container.className : null,
      hasOuterBorder: container ? container.className.includes('border') : false,
      hasOuterBg: container ? container.className.includes('bg-') : false,
      hasOuterPadding: container ? container.className.includes('p-1') : false
    };
  });

  console.log('Payment modal check result:', modalCheck);

  const modalEl = await page.$('#payment-modal > div');
  if (modalEl) {
    const shotPath = path.join(ARTIFACT_DIR, 'verified_payment_modal_no_outer_border.png');
    await modalEl.screenshot({ path: shotPath });
    console.log(`📸 Screenshot saved: ${shotPath}`);
  }

  await browser.close();
}

main().catch(console.error);
