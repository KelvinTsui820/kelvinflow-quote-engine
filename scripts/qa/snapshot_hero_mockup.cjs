const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function snapshot() {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME_PATH });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  
  const heroMockup = await page.locator('[aria-label="KelvinFlow Quotation Review Interface Preview"]');
  const count = await heroMockup.count();
  if (count > 0) {
    await heroMockup.first().screenshot({ path: 'public/hero_preview.jpg', type: 'jpeg', quality: 95 });
    const targetDir = path.join('F:', 'gemini test report', 'screenshots');
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    await heroMockup.first().screenshot({ path: path.join(targetDir, 's2_v13_quotation_studio_r6.png') });
    console.log('Saved public/hero_preview.jpg and s2_v13_quotation_studio_r6.png successfully!');
  } else {
    console.error('Could not find hero mockup element');
  }
  await browser.close();
}

snapshot().catch(err => {
  console.error(err);
  process.exit(1);
});
