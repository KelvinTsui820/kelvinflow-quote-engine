const { chromium } = require('playwright-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME_PATH });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Navigate directly with hash #features
  await page.goto('http://localhost:3000/#features');
  await page.waitForTimeout(1000);
  
  const scrollY = await page.evaluate(() => window.scrollY);
  console.log('Direct hash #features scrollY:', scrollY);
  await page.screenshot({ path: 'scratch_direct_hash_features.png' });
  
  await browser.close();
})();
