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

  // Open IMAP modal AND logout modal!
  await page.evaluate(() => {
    // We can open imap modal via its button
    const btn = document.querySelector('button[title*="转发邮箱"]');
    if (btn) btn.click();
    if (window.__testScope) {
      window.__testScope.logoutModal.value.show = true;
    }
  });

  await new Promise(r => setTimeout(r, 800));

  const check = await page.evaluate(() => {
    return {
      hasTextNow: document.body.innerHTML.includes('确认退出当前账号'),
      headingFound: Array.from(document.querySelectorAll('h3')).some(h => h.textContent.includes('确认退出当前账号'))
    };
  });
  console.log('Result when imap modal is open:', check);
  await browser.close();
})();
