const puppeteer = require('puppeteer-core');
const path = require('path');
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
  throw new Error('未找到 Chrome 可执行文件');
}

async function testLiveUi() {
  console.log('🌐 启动 Puppeteer-core 测试生产环境 UI...');
  const executablePath = getChromePath();
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. 生成试用租户 Token 自动注入 localStorage
  const { AuthService } = require('../dist/services/auth.service.js');
  const token = AuthService.generateToken({
    id: 'trial_user_tsuikelvin0804_gmail',
    email: 'tsuikelvin0804@gmail.com',
    name: 'Kelvin Tsui',
    role: 'admin',
    tenantId: 'tenant_trial_tsuikelvin0804_gmail'
  });

  const targetUrl = `https://quote.kelvinflow.com/review/QT-771259?token=${token}`;
  console.log(`- 导航至保留单据页: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 35000 });

  await page.evaluate((tok) => {
    localStorage.setItem('saas_auth_token', tok);
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
  }, token);

  await new Promise(r => setTimeout(r, 2000));

  // 截图 1: 卡片 1 顶部按钮（包含“删除”按钮）
  const screenshot1Path = path.join(process.cwd(), 'scratch', 'muse14_step1_card1_delete_btn.png');
  fs.mkdirSync(path.dirname(screenshot1Path), { recursive: true });
  await page.screenshot({ path: screenshot1Path });
  console.log(`📸 截图 1 保存至: ${screenshot1Path}`);

  // 截图 2: 点击历史单据切换器打开弹窗
  console.log('- 打开历史报价单切换弹窗...');
  await page.evaluate(() => {
    window.__vm.openQuotesHistoryModal();
  });
  await new Promise(r => setTimeout(r, 800));
  const screenshot2Path = path.join(process.cwd(), 'scratch', 'muse14_step2_quotes_history_modal.png');
  await page.screenshot({ path: screenshot2Path });
  console.log(`📸 截图 2 保存至: ${screenshot2Path}`);

  // 获取历史列表中的单号
  const historyQuotes = await page.evaluate(() => {
    return window.__vm.filteredUserQuotesList.map(q => q.quotationNumber);
  });
  console.log(`- 历史单据弹窗中显示的单据列表:`, historyQuotes);

  // 关闭历史单据弹窗
  await page.evaluate(() => {
    window.__vm.quotesHistoryModal.show = false;
  });
  await new Promise(r => setTimeout(r, 500));

  // 截图 3: 打开选型中心弹窗
  console.log('- 打开出厂底价库选型中心...');
  await page.evaluate(() => {
    window.__vm.openCatalogModal();
  });
  await new Promise(r => setTimeout(r, 800));

  // 搜索 TEST 查看 TEST-001~TEST-004 受保护状态
  await page.evaluate(() => {
    window.__vm.catalogModal.search = 'TEST';
  });
  await new Promise(r => setTimeout(r, 800));
  const screenshot3Path = path.join(process.cwd(), 'scratch', 'muse14_step3_catalog_modal_protected.png');
  await page.screenshot({ path: screenshot3Path });
  console.log(`📸 截图 3 保存至: ${screenshot3Path}`);

  const testSkusInCatalog = await page.evaluate(() => {
    return window.__vm.filteredCatalogList.map(p => ({
      sku: p.sku,
      isProtected: window.__vm.isProtectedCatalogSku(p.sku)
    }));
  });
  console.log(`- 选型中心 TEST 搜索匹配项:`, testSkusInCatalog);

  // 截图 4: 访问已删除单据直接访问界面 (QT-367079)
  console.log('- 访问已删除单据页 QT-367079...');
  await page.goto(`https://quote.kelvinflow.com/review/QT-367079?token=${token}`, { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 1500));
  const screenshot4Path = path.join(process.cwd(), 'scratch', 'muse14_step4_deleted_quote_friendly_error.png');
  await page.screenshot({ path: screenshot4Path });
  console.log(`📸 截图 4 保存至: ${screenshot4Path}`);

  await browser.close();
  console.log('🎉 Puppeteer 测试与截图完成！');
}

testLiveUi().catch(console.error);
