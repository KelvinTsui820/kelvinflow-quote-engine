const { chromium } = require('playwright-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  console.log('Connecting to https://kelvinflow.com in real Chrome...');
  const browser = await chromium.launch({ headless: true, executablePath: CHROME_PATH });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('https://kelvinflow.com');
  await page.waitForLoadState('networkidle');

  const liveChecks = await page.evaluate(() => {
    const footer = document.querySelector('footer');
    const links = footer ? Array.from(footer.querySelectorAll('a')) : [];
    const mailLink = links.find(a => a.href.includes('sales@kelvinflow.com') || a.textContent.includes('sales@kelvinflow.com'));
    const heroMockup = document.querySelector('[aria-label="KelvinFlow Quotation Review Interface Preview"]');
    const heroStyle = heroMockup ? window.getComputedStyle(heroMockup) : null;
    const getLogoAlignment = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const style = window.getComputedStyle(el);
      const text = el.querySelector('span');
      const textStyle = text ? window.getComputedStyle(text) : null;
      return {
        alignItems: style.alignItems,
        fontSize: textStyle ? textStyle.fontSize : null,
        color: textStyle ? textStyle.color : null
      };
    };

    return {
      title: document.title,
      footerEmailText: mailLink ? mailLink.textContent.trim() : null,
      footerEmailHref: mailLink ? mailLink.href : null,
      heroPointerEvents: heroStyle ? heroStyle.pointerEvents : null,
      heroInert: heroMockup ? heroMockup.hasAttribute('inert') : false,
      hasScrollbarGutter: getComputedStyle(document.documentElement).scrollbarGutter.includes('stable'),
      headerLogo: getLogoAlignment('header a[data-path="landing-page"]'),
      footerLogo: getLogoAlignment('footer a[aria-label="KelvinFlow 首页"]'),
      sidebarLogo: getLogoAlignment('[aria-label="KelvinFlow Quotation Review Interface Preview"] aside .flex.items-end')
    };
  });

  console.log('LIVE PRODUCTION CHECKS RESULT:');
  console.log(JSON.stringify(liveChecks, null, 2));

  await browser.close();
})();
