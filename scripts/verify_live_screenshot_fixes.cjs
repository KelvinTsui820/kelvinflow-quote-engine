const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5';

async function main() {
  console.log('🚀 Starting Verification on Live Production Environment...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Verify Image 1: Referral Modal on index.html
  console.log('\n--- Checking 1: Referral Modal on Landing Page ---');
  await page.goto('http://192.255.145.11:3000/?t=' + Date.now(), { waitUntil: 'networkidle2' });
  
  await page.evaluate(async () => {
    localStorage.setItem('kelvinflow_user_email', 'tsuikelvin0804@gmail.com');
    if (typeof openReferralShareModal === 'function') {
      await openReferralShareModal();
    }
  });

  await new Promise(r => setTimeout(r, 800));

  const referralModalCheck = await page.evaluate(() => {
    const modal = document.getElementById('referral-share-modal');
    const isVisible = modal && !modal.classList.contains('hidden');
    const textarea = document.getElementById('modal-ref-text');
    const fullTextBtn = document.getElementById('btn-copy-fulltext');
    const modalText = modal ? modal.innerText : '';
    const hasFullCopyText = modalText.includes('完整推荐文案') || modalText.includes('一键复制推荐文案');
    return {
      isVisible,
      hasTextarea: !!textarea,
      hasFullTextBtn: !!fullTextBtn,
      hasFullCopyText
    };
  });
  console.log('Referral Modal Check Result:', referralModalCheck);

  const referralModalEl = await page.$('#referral-share-modal > div');
  if (referralModalEl) {
    const shotPath = path.join(ARTIFACT_DIR, 'verified_referral_modal_removed_copy.png');
    await referralModalEl.screenshot({ path: shotPath });
    console.log(`📸 Screenshot saved: ${shotPath}`);
  }

  // 2. Verify Image 2: Workbench Form Cards on review.html
  console.log('\n--- Checking 2: Workbench Form Cards Alignment on review.html ---');
  await page.goto('http://192.255.145.11:3000/review/QT-20260904-888?t=' + Date.now(), { waitUntil: 'networkidle2' });

  // Wait for data to load
  await page.waitForSelector('.lg\\:col-span-9', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1200));

  const cardDetails = await page.evaluate(() => {
    const container = document.querySelector('[class*="lg:col-span-9"]');
    if (!container) return 'container not found';
    const cardEls = container.children;
    const res = [];
    for (let i = 0; i < 9; i++) {
      const c = cardEls[i];
      if (!c) continue;
      const header = c.querySelector('div:first-child > div:first-child, div:first-child > label:first-child');
      const input = c.querySelector('input') || c.querySelector('.header-input') || c.querySelector('.cursor-default');
      const bottom = c.children[1] || c.querySelector('div:last-child');
      res.push({
        idx: i + 1,
        title: (header ? header.innerText.split('\n')[0].trim() : 'unknown'),
        cardY: Math.round(c.getBoundingClientRect().top),
        cardH: Math.round(c.getBoundingClientRect().height),
        headerY: header ? Math.round(header.getBoundingClientRect().top) : null,
        headerH: header ? Math.round(header.getBoundingClientRect().height) : null,
        inputY: input ? Math.round(input.getBoundingClientRect().top) : null,
        inputH: input ? Math.round(input.getBoundingClientRect().height) : null,
        bottomY: bottom ? Math.round(bottom.getBoundingClientRect().top) : null,
        bottomH: bottom ? Math.round(bottom.getBoundingClientRect().height) : null,
        gapInputToBottom: (bottom && input) ? Math.round(bottom.getBoundingClientRect().top - input.getBoundingClientRect().bottom) : null
      });
    }
    return res;
  });

  console.log('Form Cards Metrics:\n', JSON.stringify(cardDetails, null, 2));

  // Take a screenshot of the 9-col container
  const containerEl = await page.$('.lg\\:col-span-9');
  if (containerEl) {
    const cardsShotPath = path.join(ARTIFACT_DIR, 'verified_workbench_cards_aligned.png');
    await containerEl.screenshot({ path: cardsShotPath });
    console.log(`📸 Screenshot saved: ${cardsShotPath}`);
  }

  await browser.close();
  console.log('\n✅ Verification Completed!');
}

main().catch(console.error);
