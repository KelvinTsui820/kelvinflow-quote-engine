const puppeteer = require('puppeteer-core');
const path = require('path');

function getChromePath() {
  return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: 'new'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('saas_auth_token', 'live_verified_token_qq');
    localStorage.setItem('kelvinflow_user_email', '550578343@qq.com');
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
  });

  await page.goto('https://quote.kelvinflow.com/review/QT-20260904-888', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !!window.__vm);

  await page.evaluate(() => {
    window.__vm.skipTour();
    window.__vm.tourActive = false;
    window.__vm.openImapModal();
    window.__vm.imapModal.tab = 'forward';
    if (window.__vm.imapModal.savedConfig) {
      window.__vm.imapModal.savedConfig.enabled = false;
    }
  });
  await new Promise(r => setTimeout(r, 600));

  const modalBox = await page.$('div.bg-white.rounded-2xl.max-w-2xl');
  if (modalBox) {
    await modalBox.screenshot({
      path: 'C:/Users/tsuik/.gemini/antigravity/brain/b82ea610-5577-4d85-b3da-91290fcde81a/live_batch6_email_tab1.png'
    });
    console.log('Saved live_batch6_email_tab1.png');
  }

  // Switch to Tab 2
  await page.evaluate(() => {
    window.__vm.imapModal.tab = 'draft';
    window.__vm.trialState.isTrial = true;
    window.__vm.trialState.isPaid = false;
    if (window.__vm.currentTenant) {
      window.__vm.currentTenant.plan = 'trial';
    }
  });
  await new Promise(r => setTimeout(r, 500));

  if (modalBox) {
    await modalBox.screenshot({
      path: 'C:/Users/tsuik/.gemini/antigravity/brain/b82ea610-5577-4d85-b3da-91290fcde81a/live_batch6_email_tab2.png'
    });
    console.log('Saved live_batch6_email_tab2.png');
  }

  await browser.close();
  console.log('Done capturing live email tabs!');
})();
