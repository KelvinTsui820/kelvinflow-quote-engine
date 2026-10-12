const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/review/QT-20260904-888', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.setItem('kelvinflow_user_phone', '18566690282');
    localStorage.setItem('saas_auth_token', 'test_token');
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
  });
  await page.reload({ waitUntil: 'networkidle0' });

  // Test opening upgradeModal
  const res = await page.evaluate(() => {
    // Click on "升级极客版 ➔" button
    const upBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('升级极客版'));
    if (upBtn) upBtn.click();
    return {
      upBtnFound: !!upBtn
    };
  });
  console.log('Clicked upgrade button:', res);
  await new Promise(r => setTimeout(r, 600));

  const after = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim());
    return { headings };
  });
  console.log('Headings after clicking upgrade:', after);

  await browser.close();
})();
