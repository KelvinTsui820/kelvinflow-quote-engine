const { chromium } = require('playwright-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME_PATH });
  
  // Desktop
  const pageD = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await pageD.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await pageD.screenshot({ path: 'scratch_desktop_hero_view.png' });
  
  // Scroll to footer to see footer logo
  await pageD.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pageD.waitForTimeout(400);
  await pageD.screenshot({ path: 'scratch_desktop_footer_view.png' });

  // Mobile
  const pageM = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await pageM.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await pageM.click('#nav-trial-btn');
  await pageM.waitForTimeout(400);
  await pageM.screenshot({ path: 'scratch_mobile_modal_view.png' });

  await browser.close();
  console.log('Visual audit screenshots generated successfully.');
})();
