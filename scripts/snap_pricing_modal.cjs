const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5';

async function main() {
  console.log('🚀 Starting Pricing Modal UI Verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const url = 'http://192.255.145.11:3000/review/QT-20260904-888';
  console.log(`📡 Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait 1.5s for page to settle
  await new Promise(r => setTimeout(r, 1500));

  // Open Pricing Modal
  console.log('Opening pricing modal...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('底价库'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  // Inspect the download button
  const downloadBtnInfo = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('出厂底价表.xlsx'));
    return btn ? { text: btn.innerText.trim(), title: btn.getAttribute('title') } : null;
  });
  console.log('Download Button Info in Modal:', downloadBtnInfo);

  const screenshotPath = path.join(ARTIFACT_DIR, 'verified_pricing_modal_download_fix.png');
  await page.screenshot({ path: screenshotPath });
  console.log('📸 Saved', screenshotPath);

  await browser.close();
  console.log('🎉 Done!');
}

main().catch(console.error);
