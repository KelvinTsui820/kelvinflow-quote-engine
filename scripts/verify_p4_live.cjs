const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  let browser;
  try {
    console.log('🚀 针对线上 https://quote.kelvinflow.com 进行 P4 验证...');
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://quote.kelvinflow.com/review/QT-20260904-888', { waitUntil: 'networkidle2', timeout: 30000 });

    const liveWebmailLinks = await page.evaluate(() => {
      const gmail = document.getElementById('btn-webmail-gmail');
      const outlook = document.getElementById('btn-webmail-outlook');
      return {
        gmail: gmail ? {
          tagName: gmail.tagName,
          href: gmail.getAttribute('href'),
          target: gmail.getAttribute('target'),
          text: gmail.innerText.trim()
        } : null,
        outlook: outlook ? {
          tagName: outlook.tagName,
          href: outlook.getAttribute('href'),
          target: outlook.getAttribute('target'),
          text: outlook.innerText.trim()
        } : null
      };
    });

    console.log('📬 线上 Webmail 链接检测结果:');
    console.log(JSON.stringify(liveWebmailLinks, null, 2));

    if (liveWebmailLinks.gmail && liveWebmailLinks.gmail.tagName === 'A' && liveWebmailLinks.gmail.href.includes('view=cm&fs=1')) {
      console.log('✅ [P4 验证通过] Gmail 按钮已成功变更为带 href 的 <a> 标签，且预填 compose 参数！');
    } else {
      console.error('❌ [P4 验证未通过]');
    }

  } catch (err) {
    console.error('❌ 验证异常:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
