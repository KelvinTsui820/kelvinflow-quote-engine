const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE:', msg.type(), msg.text()));
  await page.goto('http://localhost:3000/review/QT-20260904-888', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.setItem('kelvinflow_user_phone', '18566690282');
    localStorage.setItem('saas_auth_token', 'test_token');
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  await page.evaluate(() => {
    const btn = document.querySelector('button[title="退出登录或切换账号"]');
    if (btn) {
      btn.addEventListener('click', (e) => {
        console.log('>>> DOM CLICK LISTENER FIRED on btn! target:', e.target.tagName);
      });
    }
  });

  const btn = await page.$('button[title="退出登录或切换账号"]');
  console.log('Puppeteer clicking button...');
  await btn.click();
  await new Promise(r => setTimeout(r, 1000));

  const afterClick = await page.evaluate(() => {
    const allText = document.body.innerText;
    const h3s = Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim());
    const hasModal = !!document.querySelector('.z-\\[120\\]');
    const hasLogoutText = document.body.innerHTML.includes('确认退出当前账号');
    return {
      hasModal,
      hasLogoutText,
      h3s,
      includesInText: allText.includes('确认退出当前账号')
    };
  });
  console.log('After click inspect:', JSON.stringify(afterClick, null, 2));
  await browser.close();
})();
