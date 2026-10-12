const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  
  page.on('console', msg => console.log('LIVE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('LIVE ERROR:', err.message));

  console.log('Navigating to live server: https://quote.kelvinflow.com/review/QT-20260904-888 ...');
  await page.goto('https://quote.kelvinflow.com/review/QT-20260904-888', { waitUntil: 'networkidle0' });

  // Set logged in user with phone
  await page.evaluate(() => {
    localStorage.setItem('kelvinflow_user_phone', '18566690282');
    localStorage.setItem('saas_auth_token', 'test_token');
  });

  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // Find the button by selector
  const btn = await page.$('button[title="退出登录或切换账号"]');
  console.log('Live logout button found:', !!btn);

  if (btn) {
    console.log('Clicking button on live server...');
    await btn.click();
    await new Promise(r => setTimeout(r, 1200));

    const check = await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('确认退出当前账号'));
      if (!heading) return { visible: false, reason: 'heading not found' };
      const card = heading.closest('.bg-\\[\\#0B132B\\]') || heading.parentElement;
      const rect = card.getBoundingClientRect();
      const style = window.getComputedStyle(card);
      return {
        visible: rect.width > 0 && rect.height > 0 && style.display !== 'none',
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        display: style.display,
        opacity: style.opacity
      };
    });
    console.log('Live modal check result:', JSON.stringify(check, null, 2));
    await page.screenshot({ path: 'live_test_logout.png' });
    console.log('Saved live screenshot to live_test_logout.png');
  }

  await browser.close();
})();
