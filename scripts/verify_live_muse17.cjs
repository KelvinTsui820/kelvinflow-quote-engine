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
  console.log('🚀 开始 Muse 17 真实询盘持久化与链接可解析性线上全链路验收...');
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

  // 1. 发送一封真实的测试询盘（参考 QT-451714 模式，使用标准品类触发完整模式 1 出单）
  console.log('📧 发送真实测试询盘至生产服务器...');
  const testInquiryRes = await fetch(`${baseUrl}/api/inbound/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId: 'tenant_trial_tsuikelvin0804_gmail',
      from: 'buyer-elena@nordic-retail.se',
      to: 'rfq-tsuikelvin0804_gmail@quote.kelvinflow.com',
      subject: 'Inquiry for 200 pcs TEST-001 - Nordic Retail Group',
      text: 'Hello KelvinFlow Sales Team,\nPlease provide a formal quotation for 200 units of TEST-001 on FOB Shenzhen terms.\nPayment terms: 30% T/T deposit.\nBest regards,\nElena Lindqvist\nNordic Retail Group AB'
    })
  });

  const inquiryResult = await testInquiryRes.json();
  console.log('Inbound inquiry response:', inquiryResult);

  if (!inquiryResult.success || !inquiryResult.quotationNumber) {
    throw new Error(`Inbound processing failed: ${JSON.stringify(inquiryResult)}`);
  }

  const quoteId = inquiryResult.quotationNumber;
  console.log(`✅ 真实询盘管线成功生成报价单号: ${quoteId}`);
  console.log(`🔗 邮件中所带审单链接: ${inquiryResult.reviewUrl}`);
  console.log(`✉️ 待审邮件是否投递: ${inquiryResult.reviewEmailSent} (收件人: ${inquiryResult.reviewEmailRecipient})`);

  // 2. 验证单据在 API 端是否真实存在且可解析
  console.log(`🔍 正在验证 API GET /api/v1/quotes/${quoteId}...`);
  const getRes = await fetch(`${baseUrl}/api/v1/quotes/${quoteId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!getRes.ok) {
    throw new Error(`单据 ${quoteId} 在 API 查询失败: HTTP ${getRes.status}`);
  }
  const quoteData = await getRes.json();
  console.log(`✅ 单据成功持久化！单据信息:`, {
    id: quoteData.quotation?.quotationNumber,
    buyer: quoteData.quotation?.customerName || quoteData.quotation?.buyerName,
    total: `${quoteData.quotation?.currency} ${quoteData.quotation?.totalAmountForeign}`,
    rate: quoteData.quotation?.rateUsed
  });

  // 3. 用真实无头浏览器模拟点击邮件中的链接打开审单工作台
  console.log('🖥️ 启动 Puppeteer 打开审单链接...');
  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const fullReviewUrl = `${baseUrl}/review/${quoteId}?token=${encodeURIComponent(token)}`;
  console.log(`Navigating to: ${fullReviewUrl}`);
  await page.goto(fullReviewUrl, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // 等待 Vue 挂载并渲染出报价单号
  await page.waitForFunction((expectedId) => {
    return document.body.textContent.includes(expectedId);
  }, { timeout: 15000 }, quoteId);

  await sleep(1500);

  // 检查界面上是否出现“未找到报价单”或报错
  const pageText = await page.evaluate(() => document.body.textContent);
  if (pageText.includes('未找到报价单') || pageText.includes('加载失败')) {
    throw new Error(`页面呈现加载失败或未找到报价单！`);
  }

  // 截图存证
  const screenshotPath = path.join(artifactDir, 'muse17_verification_quote_review.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`📸 审单工作台正常加载截图已存证: ${screenshotPath}`);

  await browser.close();

  // 4. 【测试规范守则】：全链路回归单据坚决不删除，永久保留在系统中作为可查验单据！
  console.log(`🛡️ [测试规范准则] 严禁删除该单据！单据 ${quoteId} 永久保留在工作台供 QA 和用户在线核验！`);
  console.log('🎉 Muse 17 真实询盘出单与防幽灵单验收圆满成功！');
}

run().catch(err => {
  console.error('❌ 执行失败:', err);
  process.exit(1);
});
