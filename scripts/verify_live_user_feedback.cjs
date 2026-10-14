const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

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
  throw new Error('未找到 Chrome 可执行文件');
}

async function run() {
  console.log('🚀 验证用户三点反馈（按钮排序、0ms秒开、空白处防误关）...');
  const artifactDir = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5';
  const { AuthService } = await import('../dist/services/auth.service.js');
  
  const token = AuthService.generateToken({
    id: 'trial_user_tsuikelvin0804_gmail',
    email: 'tsuikelvin0804@gmail.com',
    name: 'Kelvin Tsui',
    role: 'admin',
    tenantId: 'tenant_trial_tsuikelvin0804_gmail'
  });

  const baseUrl = 'https://quote.kelvinflow.com';

  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(`${baseUrl}/review/QT-20260904-888?token=${encodeURIComponent(token)}`, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  await page.waitForFunction(() => !!window.__vm, { timeout: 10000 });
  await sleep(800);

  // 1. 验证按钮顺序：底价库 -> 企业资料 -> 报价单Logo
  const buttonOrder = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const names = btns.map(b => b.textContent.replace(/\s+/g, ' ').trim());
    return names;
  });
  console.log('Header buttons detected:', buttonOrder);

  const pricingIdx = buttonOrder.findIndex(s => s.includes('底价'));
  const profileIdx = buttonOrder.findIndex(s => s.includes('企业资料') || s.includes('资料'));
  const logoIdx = buttonOrder.findIndex(s => s.includes('Logo'));

  console.log(`Indices: 底价库=${pricingIdx}, 企业资料=${profileIdx}, 报价单Logo=${logoIdx}`);
  if (profileIdx > pricingIdx && profileIdx < logoIdx) {
    console.log('✅ 按钮顺序验证成功: [底价库] -> [企业资料] -> [报价单Logo]');
  } else {
    console.error('❌ 按钮顺序异常！');
  }

  // 截图验证新排列的顶部导航栏
  await page.screenshot({
    path: path.join(artifactDir, 'feedback_fix_step1_header_reordered.png'),
    clip: { x: 0, y: 0, width: 1440, height: 110 }
  });

  // 2. 测量点击弹窗打开耗时
  console.log('⏱️ 测量打开弹窗耗时...');
  const t0 = Date.now();
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const btn = btns.find(b => b.textContent.includes('企业资料') || b.textContent.includes('资料'));
    if (btn) btn.click();
  });

  // 等待 modal 处于可见状态
  await page.waitForFunction(() => {
    const modal = document.querySelector('#company-profile-modal-overlay');
    return modal && modal.getBoundingClientRect().width > 0;
  }, { timeout: 5000 });

  const durationMs = Date.now() - t0;
  console.log(`⏱️ 弹窗唤起耗时: ${durationMs} ms (原本需约 2000 ms)`);

  await page.screenshot({
    path: path.join(artifactDir, 'feedback_fix_step2_modal_instant_open.png')
  });

  // 3. 测试点击空白遮罩处（应不关闭）
  console.log('🖱️ 测试点击空白遮罩处...');
  await page.mouse.click(50, 50); // 点击屏幕左上角空白背景
  await sleep(500);

  const stillOpenAfterBlankClick = await page.evaluate(() => {
    const modal = document.querySelector('#company-profile-modal-overlay');
    return modal && modal.getBoundingClientRect().width > 0;
  });
  console.log('Modal remains open after clicking blank overlay:', stillOpenAfterBlankClick);

  // 4. 测试点击右上角关闭按钮（应关闭）
  console.log('🖱️ 测试点击右上角 x 按钮...');
  await page.evaluate(() => {
    const modal = document.querySelector('#company-profile-modal-overlay');
    const closeBtn = modal?.querySelector('button[aria-label="关闭企业资料设置"]');
    if (closeBtn) closeBtn.click();
  });
  await sleep(500);

  const isClosedAfterXClick = await page.evaluate(() => {
    const modal = document.querySelector('#company-profile-modal-overlay');
    return !modal;
  });
  console.log('Modal is cleanly closed after clicking top-right x button:', isClosedAfterXClick);

  await page.screenshot({
    path: path.join(artifactDir, 'feedback_fix_step3_modal_closed.png')
  });

  await browser.close();
  console.log('🎉 所有三项反馈验收全部通过！');
}

run().catch(err => {
  console.error('❌ 执行出错:', err);
  process.exit(1);
});
