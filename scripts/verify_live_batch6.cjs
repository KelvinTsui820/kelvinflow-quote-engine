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
  throw new Error('Chrome executable not found');
}

(async () => {
  console.log('🌐 连接线上生产环境验证: https://quote.kelvinflow.com/review/QT-20260904-888 ...');
  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 预先写入登录凭证模拟真实登录状态，并关闭新手向导
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('saas_auth_token', 'live_verified_token_qq');
    localStorage.setItem('kelvinflow_user_email', '550578343@qq.com');
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
  });

  await page.goto('https://quote.kelvinflow.com/review/QT-20260904-888', { 
    waitUntil: 'networkidle2', 
    timeout: 35000 
  });
  await page.waitForFunction(() => !!window.__vm);
  console.log('✅ 线上生产页面加载完成，Vue 应用成功挂载！');

  // 确保向导彻底关闭
  await page.evaluate(() => {
    if (window.__vm.tourActive) window.__vm.tourActive = false;
  });

  // =========================================================================
  // 1. 验证用户账号 Navbar 实时同步 (Issue 1)
  // =========================================================================
  console.log('\n--- 线上验证 1: 用户账号 Navbar 同步 ---');
  await new Promise(r => setTimeout(r, 600));

  const navbarUser = await page.evaluate(() => {
    const el = document.querySelector('header span.font-mono.text-cyan-300');
    return {
      maskedPhone: window.__vm.maskedPhone,
      domText: el ? el.innerText.trim() : ''
    };
  });
  console.log(`线上 Navbar 账号显示: "${navbarUser.domText}" (计算属性: ${navbarUser.maskedPhone})`);
  if (navbarUser.domText !== '550578343@qq.com') {
    throw new Error(`线上 Navbar 未正确显示 550578343@qq.com，实际为: ${navbarUser.domText}`);
  }
  console.log('✅ 线上 Navbar 账号同步验证成功！');

  // =========================================================================
  // 2. 验证低于 MOQ 悬浮角标与行高零破坏 (Issue 2)
  // =========================================================================
  console.log('\n--- 线上验证 2: 低于 MOQ 悬浮角标与行高零破坏 ---');
  const row0HeightBefore = await page.evaluate(() => {
    return document.querySelector('tbody tr').getBoundingClientRect().height;
  });

  // 修改商品 0 数量为 10 (低于起订量 500/1000)
  await page.evaluate(() => {
    window.__vm.quotation.items[0].quantity = 10;
    window.__vm.onQtyChange(window.__vm.quotation.items[0]);
  });
  await new Promise(r => setTimeout(r, 400));

  const row0InfoAfter = await page.evaluate(() => {
    const tr = document.querySelector('tbody tr');
    const moqBadge = tr.querySelector('span.bg-amber-500');
    return {
      height: tr.getBoundingClientRect().height,
      hasMoqBadge: !!moqBadge,
      moqText: moqBadge ? moqBadge.innerText.trim() : ''
    };
  });

  console.log(`线上行 0 原始高度: ${row0HeightBefore}px, 触发低于 MOQ 后高度: ${row0InfoAfter.height}px, 高度差: ${row0InfoAfter.height - row0HeightBefore}px`);
  console.log(`线上 MOQ 角标显示: ${row0InfoAfter.hasMoqBadge}, 文本: "${row0InfoAfter.moqText}"`);
  if (!row0InfoAfter.hasMoqBadge || !row0InfoAfter.moqText.includes('MOQ')) {
    throw new Error('线上未检测到低于 MOQ 悬浮角标！');
  }
  if (Math.abs(row0InfoAfter.height - row0HeightBefore) > 1) {
    throw new Error(`低于 MOQ 破坏了表格行高！高度由 ${row0HeightBefore}px 增加到了 ${row0InfoAfter.height}px！`);
  }
  console.log('✅ 线上零行高破坏验证通过！MOQ 悬浮角标 0 撑大表格行高！');

  // 截取表格局部精准图 (精准截取 table 容器)
  const tableEl = await page.$('div.overflow-x-auto');
  if (tableEl) {
    await tableEl.screenshot({
      path: path.resolve(__dirname, 'live_batch6_verified_table_moq.png')
    });
  }

  // =========================================================================
  // 3 & 4. 验证邮箱中枢 Tab 1 & Tab 2 文案 (Issue 3 & 4)
  // =========================================================================
  console.log('\n--- 线上验证 3 & 4: 邮箱中枢 Tab 1 & Tab 2 文案 ---');
  await page.evaluate(() => {
    window.__vm.openImapModal();
  });
  await new Promise(r => setTimeout(r, 500));

  // 1. 验证 enabled: true 时展示【草稿箱直达】且不包含旧版【模式 2】
  const liveTab1Text = await page.evaluate(() => document.body.innerText);
  const liveOldZeroRisk = liveTab1Text.includes('(0风控通道)');
  const liveHasDraftDirect = liveTab1Text.includes('【草稿箱直达】');
  console.log(`线上 Tab 1 是否已剔除 "(0风控通道)": ${!liveOldZeroRisk}`);
  console.log(`线上 Tab 1 当前状态卡片是否为 "【草稿箱直达】": ${liveHasDraftDirect}`);
  if (liveOldZeroRisk) {
    throw new Error('线上 Tab 1 仍残留 "(0风控通道)"！');
  }
  if (!liveHasDraftDirect) {
    throw new Error('线上 Tab 1 未找到 "【草稿箱直达】"！');
  }

  // 2. 模拟普通未配置邮箱试用用户 (enabled: false)，验证展示【邮件自动转发】
  await page.evaluate(() => {
    if (window.__vm.imapModal.savedConfig) {
      window.__vm.imapModal.savedConfig.enabled = false;
    }
  });
  await new Promise(r => setTimeout(r, 200));
  const liveTab1TextMode1 = await page.evaluate(() => document.body.innerText);
  const liveNewMode = liveTab1TextMode1.includes('【邮件自动转发】');
  const liveOldDeliver = liveTab1TextMode1.includes('待审收件箱交付');
  console.log(`线上 Tab 1 未配置时卡片是否为 "【邮件自动转发】": ${liveNewMode}`);
  console.log(`线上 Tab 1 是否已彻底消除旧版 "待审收件箱交付": ${!liveOldDeliver}`);
  if (!liveNewMode) {
    throw new Error('线上未配置状态未展示 "【邮件自动转发】"！');
  }
  if (liveOldDeliver) {
    throw new Error('线上仍残留 "待审收件箱交付"！');
  }

  // 截取 Tab 1 完整模态框
  const modalBox = await page.$('div.bg-white.rounded-3xl');
  if (modalBox) {
    await modalBox.screenshot({
      path: path.resolve(__dirname, 'live_batch6_verified_email_tab1.png')
    });
  }

  // 切换到 Tab 2
  await page.evaluate(() => {
    window.__vm.imapModal.tab = 'draft';
    // 切换为试用模式以校验升级卡片中的主流邮箱兼容文案
    window.__vm.trialState.isTrial = true;
    window.__vm.trialState.isPaid = false;
    if (window.__vm.currentTenant) {
      window.__vm.currentTenant.plan = 'trial';
    }
    localStorage.setItem('kelvinflow_user_plan', 'trial');
  });
  await new Promise(r => setTimeout(r, 400));

  const liveTab2Text = await page.evaluate(() => document.body.innerText);
  const liveMailboxCompatibility = liveTab2Text.includes('全面支持阿里企业邮、网易企业邮、腾讯企业邮/Foxmail、Outlook、Gmail等主流外贸企业邮箱及个人邮箱');
  console.log(`线上 Tab 2 是否包含主流外贸企业邮箱及个人邮箱全兼容文案: ${liveMailboxCompatibility}`);
  if (!liveMailboxCompatibility) {
    throw new Error('线上 Tab 2 未找到主流邮箱全兼容文案！');
  }

  // 截取 Tab 2 完整模态框
  if (modalBox) {
    await modalBox.screenshot({
      path: path.resolve(__dirname, 'live_batch6_verified_email_tab2.png')
    });
  }

  // 关闭模态框
  await page.evaluate(() => {
    window.__vm.imapModal.show = false;
  });
  await new Promise(r => setTimeout(r, 300));

  // =========================================================================
  // 5. 验证高对比度居中高亮浮动 Toast 弹窗 (Issue 5)
  // =========================================================================
  console.log('\n--- 线上验证 5: 全局居中高对比度 Toast 提示 ---');
  await page.evaluate(() => {
    window.__vm.showToast('🎉 恭喜！询盘报价与商业条款已成功同步更新！', 'success');
  });
  await new Promise(r => setTimeout(r, 400));

  const liveToast = await page.evaluate(() => {
    const toastEl = document.querySelector('div.fixed.top-6.left-1\\/2');
    const toastCard = toastEl ? toastEl.querySelector('div.pointer-events-auto') : null;
    if (!toastCard) return null;
    const rect = toastCard.getBoundingClientRect();
    const style = window.getComputedStyle(toastCard);
    return {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      bgColor: style.backgroundColor,
      color: style.color,
      text: toastCard.innerText.trim()
    };
  });
  console.log('线上 Toast 节点信息:', liveToast);
  if (!liveToast) {
    throw new Error('线上未找到居中悬浮 Toast 节点！');
  }
  const screenCenter = 1440 / 2;
  const toastCenter = liveToast.left + liveToast.width / 2;
  console.log(`屏幕中线: ${screenCenter}px, Toast 中心: ${toastCenter}px, 偏差: ${Math.abs(screenCenter - toastCenter)}px`);
  if (Math.abs(screenCenter - toastCenter) > 20) {
    throw new Error(`线上 Toast 未水平居中: ${toastCenter} vs ${screenCenter}`);
  }

  // 截图 Toast 居中效果 (直接截取 Toast 卡片元素)
  const toastCardEl = await page.$('div.fixed.top-6.left-1\\/2 div.pointer-events-auto');
  if (toastCardEl) {
    await toastCardEl.screenshot({
      path: path.resolve(__dirname, 'live_batch6_verified_toast.png')
    });
  }

  console.log('\n🎉🎉🎉 线上真实服务器环境 (https://quote.kelvinflow.com) 全部 5 项修复百分之百验证通过！');

  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('❌ 线上验证失败:', err);
  process.exit(1);
});
