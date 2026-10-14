const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://192.255.145.11:3000/review/QT-20260904-888?t=' + Date.now(), { waitUntil: 'networkidle2' });
  
  await new Promise(r => setTimeout(r, 600));

  // Click 跳过引导 if visible
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const skipBtn = buttons.find(b => b.innerText && b.innerText.includes('跳过引导'));
    if (skipBtn) skipBtn.click();
    
    // Also remove driver elements
    document.querySelectorAll('.driver-overlay, .driver-popover, #driver-popover-item, #driver-page-overlay').forEach(el => el.remove());
    document.body.classList.remove('driver-active');
  });

  await new Promise(r => setTimeout(r, 600));

  const containerEl = await page.$('.lg\\:col-span-9');
  if (containerEl) {
    const cardsShotPath = path.join(ARTIFACT_DIR, 'verified_workbench_cards_bright.png');
    await containerEl.screenshot({ path: cardsShotPath });
    console.log(`📸 Screenshot saved: ${cardsShotPath}`);
  }

  await browser.close();
}

main().catch(console.error);
