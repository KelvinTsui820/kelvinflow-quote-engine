const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to review page on localhost:3000...');
  await page.goto('http://localhost:3000/review/QT-20260904-888', { waitUntil: 'networkidle0' });

  await page.evaluate(() => {
    localStorage.setItem('kelvinflow_user_phone', '18566690282');
    localStorage.setItem('saas_auth_token', 'test_token');
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  const btnInfo = await page.evaluate(() => {
    const btn = document.querySelector('button[title="退出登录或切换账号"]');
    if (!btn) return { exists: false };
    const rect = btn.getBoundingClientRect();
    return {
      exists: true,
      html: btn.outerHTML,
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
    };
  });
  console.log('Button found on page:', btnInfo);

  // Dispatch click and wait
  await page.evaluate(() => {
    const btn = document.querySelector('button[title="退出登录或切换账号"]');
    console.log('Dispatching click event on button in evaluate...');
    btn.click();
  });

  await new Promise(r => setTimeout(r, 1000));

  const afterWaitResult = await page.evaluate(() => {
    const isShow = window.__testScope ? window.__testScope.logoutModal.value.show : null;
    const modalHeading = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('确认退出当前账号'));
    const modalEl = document.querySelector('.z-\\[120\\]');
    return {
      isShow,
      modalHeadingFound: !!modalHeading,
      modalElFound: !!modalEl,
      modalElClasses: modalEl ? modalEl.className : null,
      headingText: modalHeading ? modalHeading.textContent : null
    };
  });
  console.log('After wait result:', JSON.stringify(afterWaitResult, null, 2));

  await browser.close();
})();
