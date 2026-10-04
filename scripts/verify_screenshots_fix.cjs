const puppeteer = require('puppeteer-core');
const fs = require('fs');

function getChromePath() {
  const winPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
  ];
  for (const p of winPaths) {
    if (fs.existsSync(p)) return p;
  }
  return '/usr/bin/google-chrome';
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/review/QT-20260904-888', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.setItem('kelvinflow_user_phone', '18566690282');
    localStorage.setItem('saas_auth_token', 'test_auth_token');
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
    localStorage.setItem('kelvinflow_user_plan', 'trial');
    localStorage.setItem('kelvinflow_user_is_paid', 'false');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  
  // 1. 打开 IMAP 弹窗并展开指引抽屉
  await page.evaluate(() => {
    window.__vm.openImapModal();
    window.__vm.imapModal.showGuideDrawer = true;
  });
  await new Promise(r => setTimeout(r, 600));

  // 截取 Tab 1 弹窗图
  const modalEl = await page.$('.bg-white.rounded-2xl.max-w-2xl');
  if (modalEl) {
    await modalEl.screenshot({ path: 'test_tab1_screenshot.png' });
    console.log('✅ Tab 1 弹窗截图已保存为 test_tab1_screenshot.png');
  }

  // 检查 5 个邮箱厂商按钮是否存在省略号或截断
  const tab1Buttons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => 
      b.textContent.includes('腾讯') || b.textContent.includes('阿里') || b.textContent.includes('网易') || b.textContent.includes('微软') || b.textContent.includes('谷歌')
    );
    return btns.map(b => {
      const rect = b.getBoundingClientRect();
      const span = b.querySelector('span');
      return {
        text: span ? span.textContent.trim() : b.textContent.trim(),
        width: Math.round(rect.width),
        spanWidth: span ? Math.round(span.getBoundingClientRect().width) : 0,
        scrollWidth: span ? span.scrollWidth : 0,
        clientWidth: span ? span.clientWidth : 0,
        isTruncated: span ? (span.scrollWidth > span.clientWidth + 1) : false
      };
    });
  });
  console.log('\n[Tab 1 厂商标签截断检测]');
  console.table(tab1Buttons);

  // 2. 切换至 Tab 2 检查极客版专属特权与锁屏文案
  await page.evaluate(() => {
    window.__vm.imapModal.tab = 'draft';
  });
  await new Promise(r => setTimeout(r, 500));
  if (modalEl) {
    await modalEl.screenshot({ path: 'test_tab2_screenshot.png' });
    console.log('✅ Tab 2 弹窗截图已保存为 test_tab2_screenshot.png');
  }

  const tab2Check = await page.evaluate(() => {
    const modal = document.querySelector('.bg-white.rounded-2xl.max-w-2xl');
    const h4 = modal.querySelector('h4')?.textContent.trim();
    const upgradeBtns = Array.from(modal.querySelectorAll('button')).map(b => b.textContent.trim().replace(/\s+/g, ' ')).filter(t => t.includes('升级'));
    const tabHeaders = Array.from(modal.querySelectorAll('.rounded-2xl button')).map(b => b.textContent.trim().replace(/\s+/g, ' '));
    const allText = modal.innerText;
    return {
      tabHeaders,
      h4,
      upgradeBtns,
      hasZhuanye: allText.includes('专业版')
    };
  });
  console.log('\n[Tab 2 文案与版本命名一致性检测]');
  console.log(JSON.stringify(tab2Check, null, 2));

  await browser.close();
})();
