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

  console.log('Testing workbench on file:/// ...');
  const reviewPath = path.resolve(__dirname, '../public/review.html').replace(/\\/g, '/');
  await page.goto('file:///' + reviewPath, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 800));

  // Dismiss tour
  await page.evaluate(() => {
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
    const skipBtn = document.querySelector('button[title="跳过向导"]');
    if (skipBtn) skipBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Open description modal for first item
  console.log('Opening desc modal...');
  await page.evaluate(() => {
    const editBtns = document.querySelectorAll('button[title*="放大全景"]');
    if (editBtns && editBtns.length > 0) {
      editBtns[0].click();
    }
  });
  await new Promise(r => setTimeout(r, 500));

  // Check initial textarea value
  const initialVal = await page.evaluate(() => {
    const ta = document.querySelector('textarea[placeholder*="在此自由查看与编辑完整品名规格描述"]');
    return ta ? ta.value : '';
  });
  console.log('Initial textarea val length:', initialVal.length);

  // Type ' abc' into textarea
  await page.evaluate(() => {
    const ta = document.querySelector('textarea[placeholder*="在此自由查看与编辑完整品名规格描述"]');
    if (ta) {
      ta.value += ' abc';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 300));

  // Click close 'x' button
  console.log('Clicking close X button...');
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button[aria-label="关闭商品规格详情窗口"]');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Check table description cell
  const tableValAfterCancel = await page.evaluate(() => {
    const cell = document.querySelector('table tbody tr:first-child textarea');
    return cell ? cell.value : '';
  });
  console.log('Table val after cancel contains abc?:', tableValAfterCancel.includes('abc'));
  if (tableValAfterCancel.includes('abc')) {
    console.error('FAIL: Cell should NOT contain abc after clicking X!');
    process.exit(1);
  } else {
    console.log('PASS: Cell correctly preserved original text after clicking X!');
  }

  // Open modal again, append ' def', click confirm
  console.log('Opening desc modal again...');
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

  console.log('Clicking 完成确认 button...');
  await page.evaluate(() => {
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('完成确认'));
    if (confirmBtn) confirmBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  const tableValAfterConfirm = await page.evaluate(() => {
    const cell = document.querySelector('table tbody tr:first-child textarea');
    return cell ? cell.value : '';
  });
  console.log('Table val after confirm contains def?:', tableValAfterConfirm.includes('def'));
  if (!tableValAfterConfirm.includes('def')) {
    console.error('FAIL: Cell SHOULD contain def after clicking 完成确认!');
    process.exit(1);
  } else {
    console.log('PASS: Cell correctly updated text after clicking 完成确认!');
  }

  await browser.close();
  console.log('All Item 5 tests passed successfully!');
})();
