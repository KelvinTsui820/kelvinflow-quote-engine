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

    const heroH1 = document.querySelector('h1.font-display-lg')?.textContent.trim();
    const metricCard2 = document.querySelectorAll('#features .grid > div')?.[1]?.innerText.replace(/\n/g, ' ');
    const featureCard1 = document.querySelectorAll('#features .grid > div')?.[0]?.innerText.replace(/\n/g, ' ');
    const bottomCtaH2 = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('让下一封海外询盘'))?.textContent.trim();
    const ctaGuarantee = Array.from(document.querySelectorAll('section span')).find(s => s.textContent.includes('快速出单'))?.textContent.trim();
    const faqItem1 = document.querySelector('#faq-accordion-group .faq-accordion-item:nth-child(1) .faq-accordion-content')?.textContent.trim();

    return {
      title: document.title,
      footerEmailText: mailLink ? mailLink.textContent.trim() : null,
      heroPointerEvents: heroStyle ? heroStyle.pointerEvents : null,
      heroInert: heroMockup ? heroMockup.hasAttribute('inert') : false,
      headerLogo: getLogoAlignment('header a[data-path="landing-page"]'),
      footerLogo: getLogoAlignment('footer a[aria-label="KelvinFlow 首页"]'),
      sidebarLogo: getLogoAlignment('[aria-label="KelvinFlow Quotation Review Interface Preview"] aside .flex.items-end'),
      // DEF-02 touchpoints
      def02_heroH1_has_fast_gen: heroH1?.includes('快速生成'),
      def02_heroH1_has_10s: heroH1?.includes('10 秒') || heroH1?.includes('10秒'),
      def02_metricCard2_has_efficient: metricCard2?.includes('高效') && metricCard2?.includes('出单交付省时省力'),
      def02_metricCard2_has_10s: metricCard2?.includes('10 秒') || metricCard2?.includes('10秒'),
      def02_bottomCtaH2: bottomCtaH2,
      def02_ctaGuarantee: ctaGuarantee,
      // DEF-03
      def03_featureCard1_has_reduced_read: featureCard1?.includes('大幅减少漏项误读'),
      def03_featureCard1_has_no_missed: featureCard1?.includes('无漏项误读'),
      // DEF-04
      def04_faq_tenant_isolated: faqItem1?.includes('保存在私有工作区，租户之间相互隔离'),
      def04_faq_has_encrypted_storage: faqItem1?.includes('并加密存储')
    };
  });

  console.log('LIVE PRODUCTION CHECKS RESULT:');
  console.log(JSON.stringify(liveChecks, null, 2));

  // Check 10秒 across live HTML
  const content = await page.content();
  const tenSecSpaced = (content.match(/10 秒/g) || []).length;
  const tenSecNoSpace = (content.match(/10秒/g) || []).length;
  console.log(`Live HTML "10 秒" count: ${tenSecSpaced}, "10秒" count: ${tenSecNoSpace}`);

  await browser.close();
})();
