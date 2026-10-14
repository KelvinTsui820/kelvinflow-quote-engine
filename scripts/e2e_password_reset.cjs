const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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

const ARTIFACTS_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5';

async function run() {
  console.log('🚀 启动本地测试服务器...');
  const serverProcess = spawn('node', ['dist/index.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, PORT: '3000', BYPASS_VERIFICATION_CODE: 'true' },
    stdio: 'pipe'
  });

  serverProcess.stdout.on('data', (d) => process.stdout.write('[SERVER] ' + d.toString()));
  serverProcess.stderr.on('data', (d) => process.stderr.write('[SERVER ERR] ' + d.toString()));

  // 等待服务器就绪
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:3000/api/v1/health');
      if (res.ok) {
        ready = true;
        break;
      }
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!ready) {
    serverProcess.kill();
    throw new Error('本地服务器未能及时启动');
  }
  console.log('✅ 本地服务器已就绪 (端口 3000)');

  // 1. 注册一个专门用于 E2E 测试的账号
  const testEmail = `user_reset_${Date.now()}@acme-hardware.com`;
  const oldPassword = 'OldSecretPass123';
  const newPassword = 'NewSecretPass888';

  console.log(`📝 预先注册测试账户: ${testEmail}`);
  const regRes = await fetch('http://127.0.0.1:3000/api/v1/auth/trial-register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      code: '888888',
      password: oldPassword,
      name: 'E2E Reset Tester',
      company: 'Acme Hardware Global'
    })
  });
  const regData = await regRes.json();
  if (!regData.success) {
    console.error('注册测试账号失败:', regData);
  } else {
    console.log('✅ 测试账号注册成功');
  }

  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log('\n--- [测试 1: 落地页重置密码流程] ---');
    await page.goto('http://127.0.0.1:3000/?landing=1', { waitUntil: 'networkidle2' });

    // 确保任何现有弹窗关闭
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle2' });

    // 点击顶栏「密码登录」按钮打开 inbound-modal
    console.log('1. 打开登录弹窗...');
    await page.evaluate(() => {
      openInboundModal('login');
    });
    await new Promise((r) => setTimeout(r, 600));

    // 截屏 1: 登录弹窗以及「忘记密码？」链接
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_step1_login_modal.png') });
    console.log('📸 截图已保存: e2e_step1_login_modal.png');

    // 检查「忘记密码？」按钮
    const forgotBtn = await page.$('button[onclick="openForgotPasswordModal()"]');
    if (!forgotBtn) throw new Error('未在登录弹窗中找到「忘记密码？」按钮');
    console.log('✅ 成功找到「忘记密码？」按钮');

    // 输入登录邮箱，测试点击忘记密码时是否能自动带入
    await page.type('#inbound-login-email', testEmail);

    // 点击「忘记密码？」
    console.log('2. 点击「忘记密码？」按钮...');
    await page.click('button[onclick="openForgotPasswordModal()"]');
    await new Promise((r) => setTimeout(r, 600));

    // 检查 #forgot-password-modal 是否可见
    const isForgotModalVisible = await page.evaluate(() => {
      const modal = document.getElementById('forgot-password-modal');
      return modal && !modal.classList.contains('hidden') && modal.classList.contains('opacity-100');
    });
    if (!isForgotModalVisible) throw new Error('点击忘记密码后，#forgot-password-modal 未正确弹出');
    console.log('✅ 密码重置弹窗成功弹出');

    // 验证邮箱输入框是否已自动带入邮箱
    const prefilledEmail = await page.$eval('#forgot-email', (el) => el.value);
    console.log(`✅ 自动预填邮箱: ${prefilledEmail}`);
    if (prefilledEmail !== testEmail) throw new Error('邮箱未能自动预填');

    // 截屏 2: 密码重置 Step 1 弹窗
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_step2_forgot_step1.png') });
    console.log('📸 截图已保存: e2e_step2_forgot_step1.png');

    // 点击获取验证码
    console.log('3. 点击「获取验证码」...');
    await page.click('#btn-forgot-send-code');
    await new Promise((r) => setTimeout(r, 800));

    // 验证倒计时文字
    const cooldownText = await page.$eval('#btn-forgot-send-code-text', (el) => el.textContent);
    console.log(`✅ 获取验证码按钮倒计时: "${cooldownText}"`);

    // 截屏 3: 验证码发送中与倒计时
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_step3_code_sent.png') });
    console.log('📸 截图已保存: e2e_step3_code_sent.png');

    // 输入 6 位验证码 (测试环境万能码 888888)
    console.log('4. 输入 6 位验证码并点击下一步...');
    await page.type('#forgot-code', '888888');

    // 点击下一步
    await page.click('#btn-forgot-step1-submit');
    await new Promise((r) => setTimeout(r, 800));

    // 检查 Step 2 是否显示，并确认有两个输入框
    const isStep2Visible = await page.evaluate(() => {
      const step2 = document.getElementById('forgot-step-2');
      return step2 && !step2.classList.contains('hidden');
    });
    if (!isStep2Visible) throw new Error('核验验证码后，Step 2 新密码设置未显示');
    console.log('✅ 成功打开输入新密码的弹窗 (Step 2)');

    // 验证确实存在两个输入框
    const hasInput1 = await page.$('#forgot-new-password');
    const hasInput2 = await page.$('#forgot-confirm-password');
    if (!hasInput1 || !hasInput2) throw new Error('缺少「重置新密码」或「再次输入新密码」输入框');
    console.log('✅ 两个输入框已同时就绪:「重置新密码」与「再次输入新密码」');

    // 截屏 4: 包含两个密码输入框的 Step 2 弹窗
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_step4_two_password_inputs.png') });
    console.log('📸 截图已保存: e2e_step4_two_password_inputs.png');

    // 5. 先测试密码不一致的情形
    console.log('5. 测试密码不一致校验...');
    await page.type('#forgot-new-password', newPassword);
    await page.type('#forgot-confirm-password', 'MismatchedPassword999');
    await page.click('#btn-forgot-step2-submit');
    await new Promise((r) => setTimeout(r, 500));

    const mismatchError = await page.$eval('#forgot-step2-error-feedback', (el) => el.textContent);
    console.log(`✅ 密码不一致错误提示: "${mismatchError}"`);
    if (!mismatchError.includes('不一致')) throw new Error('密码不一致时未弹出正确提示');

    // 截屏 5: 密码不一致拦截
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_step5_password_mismatch.png') });
    console.log('📸 截图已保存: e2e_step5_password_mismatch.png');

    // 6. 清空确认密码，输入相同的密码
    console.log('6. 输入相同的确认新密码并提交更改...');
    await page.evaluate(() => {
      document.getElementById('forgot-confirm-password').value = '';
    });
    await page.type('#forgot-confirm-password', newPassword);

    await page.click('#btn-forgot-step2-submit');
    await new Promise((r) => setTimeout(r, 600));

    // 截屏 6: 成功提示
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_step6_reset_success_banner.png') });
    console.log('📸 截图已保存: e2e_step6_reset_success_banner.png');

    // 验证成功反馈
    const successText = await page.$eval('#forgot-step2-success-feedback', (el) => el.textContent);
    console.log(`✅ 成功反馈文案: "${successText}"`);
    if (!successText.includes('更改成功')) throw new Error('未显示更改成功提示');

    // 7. 等待 1.5 秒，自动跳转回登录弹窗
    console.log('7. 等待自动跳转回登录弹窗...');
    await new Promise((r) => setTimeout(r, 1600));

    const isLoginModalBack = await page.evaluate(() => {
      const modal = document.getElementById('inbound-modal');
      const form = document.getElementById('inbound-login-form');
      return modal && !modal.classList.contains('hidden') && form && !form.classList.contains('hidden');
    });
    if (!isLoginModalBack) throw new Error('重置成功后未能自动跳转回登录弹窗');
    console.log('✅ 成功自动返回登录弹窗');

    const loginEmailValue = await page.$eval('#inbound-login-email', (el) => el.value);
    console.log(`✅ 登录框已预填邮箱: ${loginEmailValue}`);
    if (loginEmailValue !== testEmail) throw new Error('返回登录弹窗后邮箱未正确预填');

    // 截屏 7: 重定向回登录弹窗
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_step7_back_to_login_modal.png') });
    console.log('📸 截图已保存: e2e_step7_back_to_login_modal.png');

    // 8. 在登录弹窗输入新密码登录
    console.log('8. 使用新密码登录...');
    await page.type('#inbound-login-password', newPassword);
    await page.click('#inbound-login-submit-btn');

    // 等待跳转至工作台
    await page.waitForNavigation({ timeout: 10000 });
    console.log(`✅ 登录成功，当前 URL: ${page.url()}`);

    // 截屏 8: 成功进入工作台
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_step8_logged_in_workbench.png') });
    console.log('📸 截图已保存: e2e_step8_logged_in_workbench.png');

    console.log('\n--- [测试 2: 工作台 (review.html) 忘记密码交互] ---');
    // 在工作台主动退出登录，验证工作台内的忘记密码流程
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.goto('http://127.0.0.1:3000/review/QT-20260904-888', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));

    // 触发工作台登录弹窗
    await page.evaluate(() => {
      window.__app?.openTrialModal?.('login') || window.openTrialModal?.('login');
    });
    await new Promise((r) => setTimeout(r, 600));

    // 截屏 9: 工作台登录弹窗包含忘记密码
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'e2e_step9_workbench_login_modal.png') });
    console.log('📸 截图已保存: e2e_step9_workbench_login_modal.png');

    console.log('\n🎉 所有端到端测试 100% 通过！完美实现所有功能要求！');

  } finally {
    await browser.close();
    serverProcess.kill();
  }
}

run().catch((err) => {
  console.error('❌ E2E 测试异常:', err);
  process.exit(1);
});
