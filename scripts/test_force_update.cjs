const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/review/QT-20260904-888', { waitUntil: 'networkidle0' });

  const res = await page.evaluate(async () => {
    window.__vm.logoutModal.show = true;
    const vnode = window.__vm.$.render.call(window.__vm, window.__vm, []);
    
    const childrenSummary = vnode.children.map((c, idx) => ({
      idx,
      type: typeof c.type === 'string' ? c.type : (c.type ? c.type.toString().slice(0, 30) : 'null/symbol'),
      key: c.key,
      class: c.props ? c.props.class : null,
      childrenType: typeof c.children
    }));

    return {
      childrenSummary
    };
  });
  console.log('Children summary:', JSON.stringify(res.childrenSummary, null, 2));
  await browser.close();
})();
