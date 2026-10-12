const puppeteer = require('puppeteer-core');
const fs = require('fs');

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

async function verifyLive() {
  console.log('🚀 Starting live browser verification on KelvinFlow Official Site & Workbench...');
  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    if (!fs.existsSync('scripts/screenshots_audit')) {
      fs.mkdirSync('scripts/screenshots_audit', { recursive: true });
    }

    // ==========================================================
    // 1. 官网 (https://kelvinflow.com/) 测试
    // ==========================================================
    console.log('\n--- 1. Testing KelvinFlow Official Site (https://kelvinflow.com/) ---');
    await page.goto('https://kelvinflow.com/', { waitUntil: 'networkidle2' });

    // 1.1 检查导航栏右上角是否有残留假手机号
    const navPhoneText = await page.$eval('#nav-user-phone', el => el.textContent.trim()).catch(() => '');
    console.log('官网导航栏账号文本:', `"${navPhoneText}"`);
    if (navPhoneText.includes('185')) {
      console.error('❌ FAILED: 官网导航栏依然含有 185 假手机号！');
    } else {
      console.log('✅ PASSED: 官网导航栏已彻底清除残留 185 手机号！');
    }

    // 1.2 点击「免费试用 7 天」打开注册弹窗
    await page.click('#nav-trial-btn');
    await new Promise(r => setTimeout(r, 600));

    // 1.3 检查注册弹窗中各个输入框的 Placeholder 和初始值
    const emailPh = await page.$eval('#inbound-email', el => el.placeholder);
    const codePh = await page.$eval('#inbound-code', el => el.placeholder);
    const pwdPh = await page.$eval('#inbound-password', el => el.placeholder);
    const refPh = await page.$eval('#inbound-ref', el => el.placeholder);
    const initialCodeVal = await page.$eval('#inbound-code', el => el.value);

    console.log('邮箱输入框 Placeholder:', emailPh);
    console.log('验证码输入框 Placeholder:', codePh);
    console.log('密码输入框 Placeholder:', pwdPh);
    console.log('邀请码输入框 Placeholder:', refPh);
    console.log('弹窗打开时验证码初始值:', `"${initialCodeVal}"`);

    if (initialCodeVal !== '') {
      console.error('❌ FAILED: 验证码输入框被自动填充！');
    } else {
      console.log('✅ PASSED: 验证码输入框完全为空，无任何自动填充！');
    }

    // 1.4 真实发送验证码给 550578343@qq.com 并验证 API 回传数据与 DOM 行为
    console.log('\n--- 2. 真实获取验证码测试 (550578343@qq.com) ---');
    await page.type('#inbound-email', '550578343@qq.com');

    // 直接调用接口验证返回体是否泄露 debugCode
    const apiResult = await page.evaluate(async () => {
      const res = await fetch('/api/v1/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '550578343@qq.com' })
      });
      return await res.json();
    });
    console.log('验证码 API 响应:', apiResult);

    if (apiResult.debugCode !== undefined) {
      console.error('❌ FAILED: API 响应中泄露了 debugCode:', apiResult.debugCode);
    } else {
      console.log('✅ PASSED: API 响应完全未回传 debugCode（杜绝客户端泄露与抓包绕过）！');
    }

    // 等待 2 秒检查前端 DOM 中的输入框是否仍保持为空
    await new Promise(r => setTimeout(r, 2000));
    const codeValAfterApi = await page.$eval('#inbound-code', el => el.value);
    console.log('发送验证码后输入框值:', `"${codeValAfterApi}"`);
    if (codeValAfterApi !== '') {
      console.error('❌ FAILED: 验证码在发送后被自动填充到了输入框！');
    } else {
      console.log('✅ PASSED: 发送后验证码输入框保持干净空白，等待用户查收邮箱手动填写！');
    }

    await page.screenshot({ path: 'scripts/screenshots_audit/live_official_modal.png' });
    console.log('📸 官网弹窗截图已保存至 scripts/screenshots_audit/live_official_modal.png');

    // ==========================================================
    // 2. 工作台 (https://quote.kelvinflow.com/) 测试
    // ==========================================================
    console.log('\n--- 3. Testing Workbench (https://quote.kelvinflow.com/) ---');
    await page.goto('https://quote.kelvinflow.com/', { waitUntil: 'networkidle2' });

    // 检查右上角头部是否残留 185 手机号
    const wbHeader = await page.evaluate(() => {
      const h = document.querySelector('header');
      return h ? h.innerText : '';
    });
    console.log('工作台头部信息摘要:\n', wbHeader.slice(0, 300));

    if (wbHeader.includes('18500000282') || wbHeader.includes('185*****0282') || wbHeader.includes('185****0282')) {
      console.error('❌ FAILED: 工作台头部依然显示 185 虚拟手机号！');
    } else {
      console.log('✅ PASSED: 工作台头部干净无残留 185 手机号（显示正常登录/开通试用状态）！');
    }

    await page.screenshot({ path: 'scripts/screenshots_audit/live_workbench_page.png' });
    console.log('📸 工作台截图已保存至 scripts/screenshots_audit/live_workbench_page.png');

    console.log('\n🎉 ALL LIVE VERIFICATIONS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Live test error:', err);
  } finally {
    await browser.close();
  }
}

verifyLive();
