const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage();
  const BASE_URL = 'https://quote.kelvinflow.com';

  console.log('=== TEST 1: TC-WB-KPI-03 (40HQ 标尺 26.0T on QT-20260904-888) ===');
  await page.goto(BASE_URL + '/review/QT-20260904-888', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const text888 = await page.innerText('body');
  const has26T = text888.includes('标尺: 68 CBM / 限重 26.0T') || text888.includes('68 CBM / 限重 26.0T');
  const hasNo26_8T = !text888.includes('26.8T');
  console.log('TC-WB-KPI-03 has 26.0T?', has26T, '| has no 26.8T?', hasNo26_8T);

  console.log('\n=== TEST 2: TC-WB-CURR-01 & WARN-01 on QT-455325 ===');
  await page.goto(BASE_URL + '/review/QT-455325', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const text455 = await page.innerText('body');
  const hasNA = text455.includes('[N/A]');
  const hasWarn = text455.includes('Currency not specified, defaulted to USD. Used fallback rate: 7.2');
  console.log('QT-455325 has [N/A]?', hasNA, '| has warning?', hasWarn);

  console.log('\n=== TEST 3: TC-PRICE-06 (active:scale-[0.98]) ===');
  await page.goto(BASE_URL + '/#pricing', { waitUntil: 'networkidle' });
  const html = await page.content();
  const hasNoScale98 = !html.includes('scale-98"');
  const hasActiveScale = html.includes('active:scale-[0.98]');
  console.log('TC-PRICE-06 no scale-98"?', hasNoScale98, '| has active:scale-[0.98]?', hasActiveScale);

  console.log('\n=== TEST 4: TC-PAY-04 (py-0.5) ===');
  const hasNoPy02 = !html.includes('py-0.2');
  const hasPy05 = html.includes('py-0.5');
  console.log('TC-PAY-04 no py-0.2?', hasNoPy02, '| has py-0.5?', hasPy05);

  console.log('\n=== TEST 5: TC-NAV-02 (390px drawer) ===');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL + '/', { waitUntil: 'networkidle' });
  const mobileBtn = await page.$('#mobile-menu-btn');
  console.log('TC-NAV-02 mobile-menu-btn found?', mobileBtn !== null);

  await browser.close();
})();
