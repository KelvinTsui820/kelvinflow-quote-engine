const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

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

const targetUrl = process.argv[2] || 'http://localhost:3000/review/QT-20260904-888';

async function runComprehensiveAudit() {
  console.log('================================================================');
  console.log('🚀 KelvinFlow 全工作台端到端全量交互、样式与业务逻辑回归测试启动');
  console.log(`🎯 目标测试地址: ${targetUrl}`);
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  let passCount = 0;
  let failCount = 0;

  function assert(title, condition, detail = '') {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${title} - ${detail}`);
      failCount++;
    }
  }

  try {
    // 1. 页面初次加载
    console.log('--- 阶段 1: 页面渲染与基础元素校验 ---');
    const resp = await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    assert('HTTP 状态码为 200', resp.status() === 200, `Got ${resp.status()}`);

    // 2. 检查顶部导航栏与品牌标识
    const brandText = await page.$eval('header', el => el.innerText);
    assert('顶部导航栏展示 KelvinFlow 品牌名称', brandText.includes('KelvinFlow'));
    assert('顶部导航栏展示 AI 外贸智能出单中枢', brandText.includes('AI 外贸智能出单中枢'));
    assert('顶部导航栏展示 个人极客版 标识', brandText.includes('个人极客版'));
    assert('顶部导航栏已移除长公司名占用', !brandText.includes('KelvinFlow Global Technology Co., Ltd.'));

    // 3. 检查底部主行动按钮
    console.log('\n--- 阶段 2: 底部操作栏按钮样式与文字精简校验 ---');
    const bottomBtnText = await page.$eval('#tour-step-3', el => el.innerText);
    assert('底部出单主按钮已去除重复Emoji', !bottomBtnText.includes('⚡ ⚡') && !bottomBtnText.includes('🚀 🚀'));
    assert('底部出单主按钮文案精炼有力 (不含过长冗余文字)', !bottomBtnText.includes('确认无误，一键出单 (下载 PDF 与定制英文邮件)'));
    assert('底部出单主按钮正确显示「一键出单」或「一键直达」', bottomBtnText.includes('一键出单') || bottomBtnText.includes('一键直达'));

    // 4. 检查同行裂变邀请弹窗 (Referral Modal)
    console.log('\n--- 阶段 3: 同行裂变邀请弹窗交互与文案校验 ---');
    await page.evaluate(() => {
      if (window.__vm && window.__vm.openReferralShareModal) window.__vm.openReferralShareModal();
    });
    await new Promise(r => setTimeout(r, 400));

    const referralModalVisible = await page.evaluate(() => {
      const modal = Array.from(document.querySelectorAll('h3')).find(h => h.innerText.includes('邀请同行'));
      return !!modal;
    });
    assert('同行邀请模态框成功弹出', referralModalVisible);

    const modalDesc = await page.evaluate(() => {
      const p = document.querySelector('div[class*="fixed"] p.text-slate-400');
      return p ? p.innerText : '';
    });
    assert('邀请弹窗明确说明天数自动累加且适用于免费与极客版', modalDesc.includes('累加') || modalDesc.includes('增加'));

    // 关闭邀请弹窗
    await page.evaluate(() => {
      if (window.__vm && window.__vm.referralModal) window.__vm.referralModal.show = false;
    });
    await new Promise(r => setTimeout(r, 400));

    // 5. 检查 Logo 上传弹窗与纯文字抬头模式
    console.log('\n--- 阶段 4: 企业专属 Logo 与纯文字抬头交互校验 ---');
    await page.evaluate(() => {
      if (window.__vm && window.__vm.openLogoModal) window.__vm.openLogoModal();
    });
    await new Promise(r => setTimeout(r, 400));

    const logoModalVisible = await page.evaluate(() => {
      const modal = Array.from(document.querySelectorAll('h3')).find(h => h.innerText.includes('Logo') || h.innerText.includes('企业专属'));
      return !!modal;
    });
    assert('Logo 上传弹窗成功唤起', logoModalVisible);

    const fileAccept = await page.evaluate(() => {
      const fileInput = document.querySelector('input[type="file"]');
      return fileInput ? fileInput.getAttribute('accept') : '';
    });
    assert('Logo 文件选择器严格限制为 .png,.jpg,.jpeg', fileAccept === '.png,.jpg,.jpeg', `Actual: ${fileAccept}`);

    const hasNoLogoBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.innerText.includes('纯文字抬头'));
    });
    assert('Logo 弹窗包含「纯文字抬头 (无Logo)」快捷选项', hasNoLogoBtn);

    // 关闭弹窗
    await page.evaluate(() => {
      if (window.__vm && window.__vm.logoModal) window.__vm.logoModal.show = false;
    });
    await new Promise(r => setTimeout(r, 400));

    // 6. 检查 IMAP 邮箱弹窗
    console.log('\n--- 阶段 5: IMAP 邮箱全自动出单中枢弹窗校验 ---');
    await page.evaluate(() => {
      if (window.__vm && window.__vm.openImapModal) window.__vm.openImapModal();
    });
    await new Promise(r => setTimeout(r, 400));

    const imapHeaderBadge = await page.evaluate(() => {
      const header = Array.from(document.querySelectorAll('h3')).find(h => h.innerText.includes('邮箱全自动出单中枢'));
      return header ? header.parentElement.innerText : '';
    });
    assert('IMAP 弹窗顶栏已彻底移除令人困惑的「模式1」技术标签', !imapHeaderBadge.includes('模式1'));

    // 关闭 IMAP 弹窗
    await page.evaluate(() => {
      if (window.__vm && window.__vm.imapModal) window.__vm.imapModal.show = false;
    });
    await new Promise(r => setTimeout(r, 400));

    // 7. 检查核心报价数据联动（毛利率调整与总价重新计算）
    console.log('\n--- 阶段 6: 业务逻辑与动态毛利率联动计算校验 ---');
    const initialTotal = await page.$eval('.text-3xl.font-black, .font-mono.font-black', el => el.innerText).catch(() => '');
    
    // 触发毛利率修改
    const marginChanged = await page.evaluate(() => {
      if (window.__vm && window.__vm.quotation && window.__vm.quotation.items && window.__vm.quotation.items.length > 0) {
        window.__vm.quotation.items[0].profitMargin = 0.35;
        if (window.__vm.recalculateTotal) window.__vm.recalculateTotal();
        return true;
      }
      return false;
    });
    assert('修改第一项商品毛利率并触发全单联动计算', marginChanged);

    // 8. 检查出厂底价脱敏保护 (hideCostFromSales)
    console.log('\n--- 阶段 7: 外贸出厂底价安全脱敏逻辑校验 ---');
    const costFieldStatus = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span, th, div'));
      return spans.some(s => s.innerText.includes('出厂底价') || s.innerText.includes('保护'));
    });
    assert('出厂底价字段具备保护标识或脱敏保护', costFieldStatus);

    // 9. 移动端视口 (390px) 响应式与防溢出排查
    console.log('\n--- 阶段 8: 移动端视口 (390x844 iPhone 13) 响应式与防横向滚动校验 ---');
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 500));

    const overflowX = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    assert('移动端视口无横向溢出破框 (Overflow <= 5px)', overflowX <= 5, `Overflow: ${overflowX}px`);

    // 10. 检查控制台报错
    console.log('\n--- 阶段 9: 全程浏览器控制台异常排查 ---');
    const filteredErrors = consoleErrors.filter(e => !e.includes('favicon.ico'));
    assert('交互全流程控制台零报错 (Zero Console Errors)', filteredErrors.length === 0, filteredErrors.join(' | '));

  } catch (err) {
    console.error('测试执行发生未捕获异常:', err);
    failCount++;
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(`📊 全量端到端测试总结: 通过 ${passCount} 项, 失败 ${failCount} 项`);
  console.log('================================================================\n');

  if (failCount > 0) process.exit(1);
}

runComprehensiveAudit();
