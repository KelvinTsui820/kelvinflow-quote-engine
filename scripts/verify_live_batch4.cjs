const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

function getChromePath() {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return paths[0];
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: getChromePath(), headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const artifactDir = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\b82ea610-5577-4d85-b3da-91290fcde81a';

  console.log('Testing live homepage payment modal on https://kelvinflow.com/ ...');
  await page.goto('https://kelvinflow.com/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    if (typeof openPaymentModal === 'function') openPaymentModal('monthly');
  });
  await new Promise(r => setTimeout(r, 400));

  const payModalEl = await page.$('#payment-modal > div');
  if (payModalEl) {
    await payModalEl.screenshot({ path: path.join(artifactDir, 'live_batch4_verified_payment_modal.png') });
    console.log('Saved live_batch4_verified_payment_modal.png');
  }

  console.log('Testing live workbench descModal on https://quote.kelvinflow.com/review/QT-20260904-888 ...');
  await page.goto('https://quote.kelvinflow.com/review/QT-20260904-888', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('kelvinflow_user_email', 'tsxkelvin820@gmail.com');
    localStorage.setItem('saas_auth_token', 'test_live_token');
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 800));

  // Dismiss any tour if visible
  await page.evaluate(() => {
    const skipBtn = document.querySelector('button[title="跳过向导"]');
    if (skipBtn) skipBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  // Open description modal for row 1
  await page.evaluate(() => {
    const editBtns = document.querySelectorAll('button[title*="放大全景"]');
    if (editBtns && editBtns.length > 0) editBtns[0].click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Append ' abc' to textarea
  await page.evaluate(() => {
    const ta = document.querySelector('textarea[placeholder*="在此自由查看与编辑完整品名规格描述"]');
    if (ta) {
      ta.value += ' abc';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 300));

  // Click close 'x' button
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[aria-label="关闭商品规格详情窗口"]');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const tableValAfterCancel = await page.evaluate(() => {
    const cell = document.querySelector('table tbody tr:first-child textarea');
    return cell ? cell.value : '';
  });
  console.log('Live workbench: table val after cancel contains abc?:', tableValAfterCancel.includes('abc'));

  // Open again, append ' def', confirm
  await page.evaluate(() => {
    const editBtns = document.querySelectorAll('button[title*="放大全景"]');
    if (editBtns && editBtns.length > 0) editBtns[0].click();
  });
  await new Promise(r => setTimeout(r, 400));

  await page.evaluate(() => {
    const ta = document.querySelector('textarea[placeholder*="在此自由查看与编辑完整品名规格描述"]');
    if (ta) {
      ta.value += ' def';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 300));

  await page.evaluate(() => {
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('完成确认'));
    if (confirmBtn) confirmBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const tableValAfterConfirm = await page.evaluate(() => {
    const cell = document.querySelector('table tbody tr:first-child textarea');
    return cell ? cell.value : '';
  });
  console.log('Live workbench: table val after confirm contains def?:', tableValAfterConfirm.includes('def'));

  await browser.close();
  console.log('ALL LIVE BATCH 4 VERIFICATIONS COMPLETE!');
})();
