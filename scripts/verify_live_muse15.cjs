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

async function runVerification() {
  console.log('🚀 启动 muse_15 自动化验证流程...');
  const { AuthService } = require('../dist/services/auth.service.js');
  const token = AuthService.generateToken({
    id: 'trial_user_tsuikelvin0804_gmail',
    email: 'tsuikelvin0804@gmail.com',
    name: 'Kelvin Tsui',
    role: 'admin',
    tenantId: 'tenant_trial_tsuikelvin0804_gmail'
  });

  const baseUrl = 'https://quote.kelvinflow.com';

  // 1. 确保有一次性测试单据供删除 (红线：坚决不删 QT-771259 与 QT-20260904-888)
  let tempQuoteId = 'QT-TEST-DISPOSABLE-01';
  console.log(`- 验证测试单据: ${tempQuoteId}...`);
  // 如果需要创建新的，通过 /api/inbound/quick-quote 创建 (不触发邮件外发，防止幽灵邮件)
  const checkRes = await fetch(`${baseUrl}/api/v1/quotes/${tempQuoteId}?token=${token}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!checkRes.ok) {
    console.log(`- 测试单据不存在，通过 /api/inbound/quick-quote 自动生成可安全删除的新测试单据...`);
    const qqRes = await fetch(`${baseUrl}/api/inbound/quick-quote`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        tenantId: 'tenant_trial_tsuikelvin0804_gmail',
        inquiryText: 'Please quote 10 units of TEST-001 for disposable delete verification.',
        buyerName: 'Disposable Test Buyer'
      })
    });
    const qqData = await qqRes.json();
    tempQuoteId = qqData.quotationNumber;
    console.log(`  成功生成可删除的无邮件测试单据: ${tempQuoteId}`);
  } else {
    console.log(`  已确认可用测试单据: ${tempQuoteId}`);
  }

  // 2. 启动 Puppeteer
  const executablePath = getChromePath();
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.evaluateOnNewDocument((tok) => {
    localStorage.setItem('saas_auth_token', tok);
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
  }, token);

  const targetUrl = `${baseUrl}/review/QT-771259?token=${token}`;
  console.log(`- 访问页面: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 2000));

  // 3. 打开历史单据弹窗
  console.log('- 触发打开租户历史报价单切换弹窗...');
  await page.evaluate(() => {
    window.__vm.openQuotesHistoryModal();
  });
  await new Promise(r => setTimeout(r, 1000));

  const historyQuotes = await page.evaluate(() => {
    return window.__vm.userQuotesList.map(q => q.quotationNumber);
  });
  console.log(`- 当前历史列表中的单据:`, historyQuotes);

  if (!historyQuotes.includes(tempQuoteId)) {
    throw new Error(`测试单据 ${tempQuoteId} 未出现在历史列表中`);
  }

  // 4. 点击 tempQuoteId 上的彻底删除按钮
  console.log(`- 针对 ${tempQuoteId} 触发 confirmDeleteQuote...`);
  await page.evaluate((qId) => {
    window.__vm.confirmDeleteQuote(qId);
  }, tempQuoteId);
  await new Promise(r => setTimeout(r, 600));

  // 5. 验证 deleteQuoteModal 的可见性与层级
  const modalInspection = await page.evaluate(() => {
    const qModal = document.querySelector('div[v-if="deleteQuoteModal.show"]') || 
                   Array.from(document.querySelectorAll('div')).find(el => el.textContent.includes('确认删除整份报价单？') && el.classList.contains('fixed'));
    const hModal = Array.from(document.querySelectorAll('div')).find(el => el.textContent.includes('租户历史报价单切换') && el.classList.contains('fixed'));
    
    if (!qModal) return { error: '未找到 deleteQuoteModal' };
    const qZ = window.getComputedStyle(qModal).zIndex;
    const hZ = hModal ? window.getComputedStyle(hModal).zIndex : 'none';

    // 查找“取消保留”按钮
    const cancelBtn = Array.from(qModal.querySelectorAll('button')).find(b => b.textContent.includes('取消保留'));
    let hitCancel = null;
    if (cancelBtn) {
      const rect = cancelBtn.getBoundingClientRect();
      const elAtPoint = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      hitCancel = elAtPoint ? (elAtPoint === cancelBtn || cancelBtn.contains(elAtPoint)) : false;
    }

    // 查找“确认彻底删除”按钮
    const confirmBtn = Array.from(qModal.querySelectorAll('button')).find(b => b.textContent.includes('确认彻底删除'));
    let hitConfirm = null;
    if (confirmBtn) {
      const rect = confirmBtn.getBoundingClientRect();
      const elAtPoint = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      hitConfirm = elAtPoint ? (elAtPoint === confirmBtn || confirmBtn.contains(elAtPoint)) : false;
    }

    return {
      qZ,
      hZ,
      hitCancel,
      hitConfirm,
      qNumberShown: qModal.textContent.includes(window.__vm.deleteQuoteModal.quotationNumber)
    };
  });

  console.log('🔍 二次确认弹窗检查结果:', modalInspection);

  // 截图 1: 二次确认弹窗置顶呈现（位于历史弹窗之上，居中显示）
  const screenshot1Path = path.join(process.cwd(), 'scratch', 'muse15_step1_modal_on_top.png');
  fs.mkdirSync(path.dirname(screenshot1Path), { recursive: true });
  await page.screenshot({ path: screenshot1Path });
  console.log(`📸 截图 1 保存至: ${screenshot1Path}`);

  if (modalInspection.error) throw new Error(modalInspection.error);
  if (!modalInspection.hitCancel) throw new Error('取消保留按钮被遮挡，无法直接点击！');

  // 6. 测试点击“取消保留”
  console.log('- 点击“取消保留”按钮...');
  await page.evaluate(() => {
    const qModal = Array.from(document.querySelectorAll('div')).find(el => el.textContent.includes('确认删除整份报价单？') && el.classList.contains('fixed'));
    const cancelBtn = Array.from(qModal.querySelectorAll('button')).find(b => b.textContent.includes('取消保留'));
    cancelBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const afterCancelState = await page.evaluate((qId) => {
    return {
      deleteModalVisible: window.__vm.deleteQuoteModal.show,
      historyModalVisible: window.__vm.quotesHistoryModal.show,
      quoteStillInList: window.__vm.userQuotesList.some(q => q.quotationNumber === qId)
    };
  }, tempQuoteId);
  console.log('- 取消保留后状态:', afterCancelState);
  if (afterCancelState.deleteModalVisible !== false) throw new Error('取消保留后 deleteQuoteModal 未关闭');
  if (afterCancelState.historyModalVisible !== true) throw new Error('取消保留后 quotesHistoryModal 未保持打开');
  if (afterCancelState.quoteStillInList !== true) throw new Error('取消保留后单据丢失');

  // 截图 2: 点击取消保留后，历史弹窗仍在且单据保留
  const screenshot2Path = path.join(process.cwd(), 'scratch', 'muse15_step2_cancel_keep_success.png');
  await page.screenshot({ path: screenshot2Path });
  console.log(`📸 截图 2 保存至: ${screenshot2Path}`);

  // 7. 再次点击“彻底删除此报价单”，并点击“确认彻底删除”
  console.log(`- 再次触发 confirmDeleteQuote 并执行彻底删除...`);
  await page.evaluate((qId) => {
    window.__vm.confirmDeleteQuote(qId);
  }, tempQuoteId);
  await new Promise(r => setTimeout(r, 600));

  console.log('- 点击“确认彻底删除”按钮...');
  await page.evaluate(() => {
    const qModal = Array.from(document.querySelectorAll('div')).find(el => el.textContent.includes('确认删除整份报价单？') && el.classList.contains('fixed'));
    const confirmBtn = Array.from(qModal.querySelectorAll('button')).find(b => b.textContent.includes('确认彻底删除'));
    confirmBtn.click();
  });

  // 等待删除网络请求完成与列表刷新
  await new Promise(r => setTimeout(r, 2000));

  const afterDeleteState = await page.evaluate((qId) => {
    return {
      deleteModalVisible: window.__vm.deleteQuoteModal.show,
      historyModalVisible: window.__vm.quotesHistoryModal.show,
      quoteStillInList: window.__vm.userQuotesList.some(q => q.quotationNumber === qId),
      remainingQuotes: window.__vm.userQuotesList.map(q => q.quotationNumber)
    };
  }, tempQuoteId);
  console.log('- 彻底删除后状态:', afterDeleteState);
  if (afterDeleteState.deleteModalVisible !== false) throw new Error('彻底删除后 deleteQuoteModal 未关闭');
  if (afterDeleteState.quoteStillInList === true) throw new Error('彻底删除后单据仍存在于历史列表中');

  // 截图 3: 彻底删除后历史列表动态刷新，单据消失
  const screenshot3Path = path.join(process.cwd(), 'scratch', 'muse15_step3_deleted_and_refreshed.png');
  await page.screenshot({ path: screenshot3Path });
  console.log(`📸 截图 3 保存至: ${screenshot3Path}`);

  // 8. 验证 QT-771259 和 QT-20260904-888 完整保留
  const preservedQuotes = ['QT-771259', 'QT-20260904-888'];
  for (const pq of preservedQuotes) {
    if (!afterDeleteState.remainingQuotes.includes(pq)) {
      throw new Error(`⚠️ 警报：基准保留单据 ${pq} 不存在！`);
    }
  }
  console.log('✅ 红线核验：QT-771259 和 QT-20260904-888 完好无损！');

  await browser.close();
  console.log('🎉 全部 muse_15 验收步骤验证通过！');
}

runVerification().catch(err => {
  console.error('❌ 验证失败:', err);
  process.exit(1);
});
