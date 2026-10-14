const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage();
  
  await page.goto('https://quote.kelvinflow.com/index.html#pricing', { waitUntil: 'networkidle' });
  console.log('URL for /index.html#pricing:', page.url());
  console.log('Title:', await page.title());

  const btn1 = await page.$('#pricing-card1-btn');
  console.log('btn1 class:', btn1 ? await btn1.getAttribute('class') : 'null');
  const btnPay = await page.$('#pricing-pay-btn');
  console.log('btnPay class:', btnPay ? await btnPay.getAttribute('class') : 'null');
  const btn3 = await page.$('#pricing-team-subnote');
  console.log('btn3 parent button:', btn3 ? 'found' : 'null');

  const html = await page.content();
  console.log('has scale-98"?', html.includes('scale-98"'));
  console.log('has active:scale-[0.98]?', html.includes('active:scale-[0.98]'));
  console.log('has py-0.2?', html.includes('py-0.2'));
  console.log('has py-0.5?', html.includes('py-0.5'));

  // Mobile drawer on /index.html
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('https://quote.kelvinflow.com/index.html', { waitUntil: 'networkidle' });
  const mobileBtn = await page.$('#mobile-menu-btn');
  console.log('mobileBtn on /index.html:', mobileBtn ? 'FOUND' : 'null');

  await browser.close();
})();
