const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

function getChromePath() {
  const winPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
  ];
  for (const p of winPaths) { if (fs.existsSync(p)) return p; }
  throw new Error('Chrome not found');
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: getChromePath(), headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const artifactDir = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\b82ea610-5577-4d85-b3da-91290fcde81a';

  console.log('Testing live homepage on https://kelvinflow.com/ ...');
  await page.goto('https://kelvinflow.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.updateNavForLoggedInUser === 'function');
  await page.evaluate(() => {
    localStorage.setItem('kelvinflow_user_email', 'tsxkelvin820@gmail.com');
    window.updateNavForLoggedInUser();
  });
  await new Promise(r => setTimeout(r, 400));
  const navEmail = await page.evaluate(() => document.getElementById('nav-user-phone')?.textContent?.trim());
  console.log('Live homepage navbar unmasked email:', navEmail);

  // Open payment modal
  await page.evaluate(() => openPaymentModal('monthly'));
  await new Promise(r => setTimeout(r, 400));
  const payModalEl = await page.$('#payment-modal > div');
  if (payModalEl) {
    await payModalEl.screenshot({ path: path.join(artifactDir, 'live_verified_payment_modal.png') });
    console.log('Saved live_verified_payment_modal.png');
  }

  // Open referral modal
  await page.evaluate(async () => {
    closePaymentModal();
    await openReferralShareModal();
  });
  await page.waitForSelector('#referral-share-modal:not(.hidden)', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 400));
  const refModalEl = await page.$('#referral-share-modal > div');
  if (refModalEl) {
    await refModalEl.screenshot({ path: path.join(artifactDir, 'live_verified_referral_modal.png') });
    console.log('Saved live_verified_referral_modal.png');
  }

  // Workbench check
  console.log('Testing live workbench...');
  await page.goto('https://quote.kelvinflow.com/review/QT-20260904-888', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('kelvinflow_user_email', 'tsxkelvin820@gmail.com');
    localStorage.setItem('saas_auth_token', 'test_live_token');
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 800));

  // Open quick quote modal
  await page.evaluate(() => {
    const btn = document.querySelector('button[id="tour-step-2"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Click text tab
  await page.evaluate(() => {
    const textTab = Array.from(document.querySelectorAll('#new-po-modal-overlay button')).find(b => b.textContent.includes('粘贴英文正文'));
    if (textTab) textTab.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const quickQuoteEl = await page.$('#new-po-modal-overlay > div');
  if (quickQuoteEl) {
    await quickQuoteEl.screenshot({ path: path.join(artifactDir, 'live_verified_quick_quote_modal.png') });
    console.log('Saved live_verified_quick_quote_modal.png');
  }

  // Workbench logout test
  await page.evaluate(() => {
    const closeBtn = document.querySelector('#new-po-modal-overlay button[aria-label="关闭询盘导入窗口"]');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  await page.evaluate(() => {
    const logoutBtn = document.querySelector('button[title="退出登录或切换账号"]');
    if (logoutBtn) logoutBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  await page.evaluate(() => {
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('确认退出'));
    if (confirmBtn) confirmBtn.click();
  });

  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 600));

  console.log('Live URL after logout:', page.url());
  await page.screenshot({ path: path.join(artifactDir, 'live_verified_logged_out_landing.png') });
  console.log('Saved live_verified_logged_out_landing.png');

  await browser.close();
  console.log('ALL LIVE PRODUCTION VERIFICATIONS DONE!');
})();
