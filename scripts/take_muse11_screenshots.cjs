const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
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

async function takeFullScreenshots() {
  const testPort = 3009;
  const serverProcess = spawn('node', ['dist/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(testPort) },
    stdio: 'pipe'
  });

  await new Promise((resolve) => setTimeout(resolve, 2500));

  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });

  const ARTIFACTS_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5';

  try {
    await page.goto(`http://localhost:${testPort}/review/QT-388788`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // 关闭引导弹窗（如果存在）
    await page.evaluate(() => {
      const skipBtn = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText && b.innerText.includes('跳过引导'));
      if (skipBtn) skipBtn.click();
      const closeBtn = document.querySelector('button[aria-label="关闭"], button.tour-close');
      if (closeBtn) closeBtn.click();
    });

    await new Promise(r => setTimeout(r, 600));

    // 截图 1：顶部参数区与核算卡片（清晰显示 $ USD, 汇率 7.2, 报警红字保留, 最终核算总额 USD 23,765.00）
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'muse11_step1_top_parameters.png') });

    // 滚动到商品明细表与邮件草稿区
    await page.evaluate(() => {
      window.scrollTo(0, 600);
    });
    await new Promise(r => setTimeout(r, 600));

    // 截图 2：商品明细表（表头外币单价 (USD)、小计金额 (USD)、行项目 USD、底部悬浮栏 USD 23,765.00）
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'muse11_step2_items_table.png') });

    // 滚动到邮件草稿区
    await page.evaluate(() => {
      window.scrollTo(0, 1100);
    });
    await new Promise(r => setTimeout(r, 600));

    // 截图 3：邮件草稿正文区（Total Amount: USD 23,765.00）
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'muse11_step3_email_draft.png') });

    // 官网定价区与支付弹窗截图（验证 py-0.5 与 scale-[0.98]）
    await page.goto(`http://localhost:${testPort}/#pricing`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'muse11_step4_pricing_cta_buttons.png') });

    // 打开支付弹窗截图
    await page.evaluate(() => {
      const payBtn = document.querySelector('#pricing-pay-btn');
      if (payBtn) payBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'muse11_step5_payment_modal_badge.png') });

    console.log('✅ 全部 5 张高清验证截图已生成！');
  } finally {
    await browser.close();
    serverProcess.kill();
  }
}

takeFullScreenshots().catch(console.error);
