const { chromium } = require('playwright-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME_PATH });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000');
  
  // Click Features
  await page.click('a[href="#features"]');
  await page.waitForTimeout(800);
  
  const scrollY = await page.evaluate(() => window.scrollY);
  const sec2 = await page.evaluate(() => {
    const el = document.getElementById('features');
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, height: r.height, offsetTop: el.offsetTop };
  });
  console.log('Features scrollY:', scrollY);
  console.log('Features rect:', sec2);
  
  await page.screenshot({ path: 'scratch_scroll_features.png' });
  await browser.close();
})();
