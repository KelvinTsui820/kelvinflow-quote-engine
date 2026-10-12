const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

function getChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const winPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
  ];
  for (const p of winPaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome executable not found');
}

async function run() {
  console.log('🌐 Connecting to LIVE Production: https://quote.kelvinflow.com/review/QT-20260904-888 ...');
  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.toString()));
  page.on('console', msg => {
    if (msg.type() === 'error') pageErrors.push(msg.text());
  });

  try {
    await page.goto('https://quote.kelvinflow.com/review/QT-20260904-888', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // 1. Live Check: descModal
    console.log('Testing descModal on live server...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="放大全景查看并编辑完整规格"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const descBtnText = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[placeholder*="自由查看与编辑完整品名规格描述"]');
      const container = textarea ? textarea.closest('.bg-white') : null;
      const btn = container ? container.querySelector('button.bg-blue-600') : null;
      return btn ? btn.textContent.trim() : null;
    });
    console.log('Live descModal button text:', descBtnText);
    if (descBtnText !== '完成') throw new Error(`Live descModal button text is '${descBtnText}', expected '完成'`);

    // Test click 完成 does not error
    await page.evaluate(() => {
      const textarea = document.querySelector('textarea[placeholder*="自由查看与编辑完整品名规格描述"]');
      const container = textarea.closest('.bg-white');
      const btn = container.querySelector('button.bg-blue-600');
      btn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    const descModalClosed = await page.evaluate(() => !document.querySelector('textarea[placeholder*="自由查看与编辑完整品名规格描述"]'));
    console.log('Live descModal closed successfully:', descModalClosed);
    if (!descModalClosed) throw new Error('Live descModal failed to close on clicking 完成!');

    // 2. Live Check: termsModal
    console.log('Testing termsModal on live server...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="放大编辑付款条款"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const termsBtnText = await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="关闭条款编辑窗口"]');
      const modal = closeBtn ? closeBtn.closest('.bg-white') : null;
      if (!modal) return null;
      const btns = Array.from(modal.querySelectorAll('button.bg-blue-600'));
      const finishBtn = btns.find(b => b.textContent.includes('完成'));
      return finishBtn ? finishBtn.textContent.trim() : null;
    });
    console.log('Live termsModal button text:', termsBtnText);
    if (termsBtnText !== '完成') throw new Error(`Live termsModal button text is '${termsBtnText}', expected '完成'`);

    // Close termsModal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="关闭条款编辑窗口"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // 3. Live Check: emailFullscreenModal
    console.log('Testing emailFullscreenModal on live server...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="全屏沉浸式编辑与排版"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const emailBtnText = await page.evaluate(() => {
      const checkIcon = document.querySelector('.fa-check');
      const btn = checkIcon ? checkIcon.closest('button') : null;
      return btn ? btn.textContent.trim() : null;
    });
    console.log('Live emailFullscreenModal button text:', emailBtnText);
    if (emailBtnText !== '完成') throw new Error(`Live emailFullscreenModal button text is '${emailBtnText}', expected '完成'`);

    // Close email modal
    await page.evaluate(() => {
      const checkIcon = document.querySelector('.fa-check');
      if (checkIcon) checkIcon.closest('button').click();
    });
    await new Promise(r => setTimeout(r, 500));

    // 4. Live Check: newPoModal Tab 2
    console.log('Testing newPoModal Tab 2 on live server...');
    await page.evaluate(() => {
      const btn = document.querySelector('#tour-step-2');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const tab2 = tabs.find(t => t.textContent.includes('粘贴英文正文'));
      if (tab2) tab2.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const tab2BtnText = await page.evaluate(() => {
      const modal = document.querySelector('#new-po-modal-overlay');
      const btn = modal ? (modal.querySelector('div.space-y-3 button.bg-blue-600') || modal.querySelector('button.bg-blue-600')) : null;
      return btn ? btn.textContent.trim() : null;
    });
    console.log('Live newPoModal Tab 2 button text:', tab2BtnText);
    if (!tab2BtnText || !tab2BtnText.includes('开始 AI 智能建单')) {
      throw new Error(`Live Tab 2 button text is '${tab2BtnText}', expected to contain '开始 AI 智能建单'`);
    }

    const artifactDir = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\b82ea610-5577-4d85-b3da-91290fcde81a';
    await page.screenshot({ path: path.join(artifactDir, 'live_batch5_verified.png') });
    console.log('📸 Captured live_batch5_verified.png');

    console.log('\n🚀 ALL LIVE PRODUCTION VERIFICATIONS PASSED 100%!');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('❌ Live test failed:', err);
  process.exit(1);
});
