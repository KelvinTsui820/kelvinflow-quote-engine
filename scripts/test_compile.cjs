const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  // Connect to actual localhost review page, but intercept Vue to print any render errors or warnings
  page.on('console', msg => console.log('REAL CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('REAL PAGE ERROR:', err.message));

  await page.goto('http://localhost:3000/review/QT-20260904-888', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.setItem('kelvinflow_user_phone', '18566690282');
    localStorage.setItem('saas_auth_token', 'test_token');
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
  });
  await page.reload({ waitUntil: 'networkidle0' });

  // Now let's inspect the Vue instance on #app!
  const vueInfo = await page.evaluate(() => {
    const appEl = document.querySelector('#app');
    const vnode = appEl.__vue_app__;
    return {
      hasApp: !!vnode,
      // Find where in the DOM tree the logout button is
      btn: !!document.querySelector('button[title="退出登录或切换账号"]'),
      // Find where in the template logoutModal is
      // Let's check if the logout modal DOM exists anywhere
      hasLogoutEl: !!document.querySelector('.z-\\[120\\]')
    };
  });
  console.log('Vue info:', vueInfo);

  // Now let's trigger logoutModal.value.show = true
  const triggerResult = await page.evaluate(() => {
    window.__testScope.logoutModal.value.show = true;
    return {
      showVal: window.__testScope.logoutModal.value.show
    };
  });
  console.log('Triggered show:', triggerResult);

  await new Promise(r => setTimeout(r, 600));

  // Now let's search every single element in document
  const inspectElements = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const headings = all.filter(el => el.tagName === 'H3').map(h => h.textContent.trim());
    const fixeds = all.filter(el => el.classList.contains('fixed')).map(el => ({
      class: el.className.slice(0, 40),
      text: el.textContent.trim().slice(0, 30)
    }));
    return { headings, fixeds };
  });
  console.log('Inspect elements:', inspectElements);

  await browser.close();
})();
