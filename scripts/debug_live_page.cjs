const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('LIVE LOG:', msg.text()));
  page.on('pageerror', err => console.log('LIVE ERROR:', err.message));

  console.log('Navigating to https://quote.kelvinflow.com/ ...');
  const resp = await page.goto('https://quote.kelvinflow.com/', { waitUntil: 'networkidle0' });
  console.log('Status code:', resp.status());
  console.log('Final URL:', page.url());

  const info = await page.evaluate(() => {
    const footerLink = document.getElementById('footer-contact-founder');
    const allLinks = Array.from(document.querySelectorAll('a')).map(a => ({ text: a.textContent.trim(), id: a.id, href: a.getAttribute('href') }));
    const paymentModal = document.getElementById('payment-modal');
    return {
      title: document.title,
      footerLinkExists: !!footerLink,
      allLinksCount: allLinks.length,
      linksMatchingFounder: allLinks.filter(l => l.text.includes('联系创始人')),
      hasPaymentModal: !!paymentModal
    };
  });

  console.log('Page info:', JSON.stringify(info, null, 2));

  await browser.close();
})();
