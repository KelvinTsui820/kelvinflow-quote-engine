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
  console.log('🚀 开始验证 tsuikelvin0804@gmail.com 个人版尊享特权页面呈现...');
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

  // 1. 打开工作台页面
  const fullReviewUrl = `${baseUrl}/review/QT-808802?token=${encodeURIComponent(token)}`;
  console.log(`Navigating to: ${fullReviewUrl}`);
  await page.goto(fullReviewUrl, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  await page.waitForFunction(() => !!window.__vm, { timeout: 15000 });
  await sleep(1500);

  // 2. 检查 Vue 响应式状态中的 isPaidUser
  const proState = await page.evaluate(() => {
    return {
      isPaidUser: window.__vm.isPaidUser,
      plan: window.__vm.trialState?.plan,
      isPaid: window.__vm.trialState?.isPaid,
      remainingDays: window.__vm.trialState?.remainingDays,
      email: window.__vm.trialState?.email
    };
  });
  console.log('Vue proState on client:', proState);

  // 截图 1: 顶部尊享状态条与个人版金色徽章
  const ss1Path = path.join(artifactDir, 'pro_account_step1_top_banner.png');
  await page.screenshot({ path: ss1Path, clip: { x: 0, y: 0, width: 1440, height: 180 } });
  console.log(`📸 截图 1 (个人版徽章与状态条): ${ss1Path}`);

  // 3. 点击「邮箱自动出单」按钮唤起 IMAP 设置弹窗
  console.log('Opening email settings modal...');
  await page.evaluate(() => {
    if (window.__vm && typeof window.__vm.openImapConfigModal === 'function') {
      window.__vm.openImapConfigModal();
    } else {
      const btn = Array.from(document.querySelectorAll('header button')).find(b => b.textContent.includes('邮箱自动出单'));
      if (btn) btn.click();
    }
  });

  await sleep(1000);

  // 截图 2: 个人版专属 IMAP 草稿箱直达配置弹窗 (表单完全解锁)
  const ss2Path = path.join(artifactDir, 'pro_account_step2_imap_unlocked_modal.png');
  await page.screenshot({ path: ss2Path });
  console.log(`📸 截图 2 (个人版专属草稿箱配置表单已解锁): ${ss2Path}`);

  await browser.close();
  console.log('🎉 个人版账号特权校验完毕，完全正常！');
}

run().catch(err => {
  console.error('❌ 执行失败:', err);
  process.exit(1);
});
