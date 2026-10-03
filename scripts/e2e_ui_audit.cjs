/**
 * KelvinFlow 端到端 (E2E) 真实浏览器自动化 UI 巡检脚本
 * 使用 Puppeteer-core 连接真实 Chrome 浏览器，检测 DOM 树挂载、弹窗交互、样式断言与控制台报错
 * 彻底告别「手工测试工具人」！
 */
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
  const linuxPaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];
  for (const p of linuxPaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('未找到 Chrome / Chromium 可执行文件，请设置环境变量 CHROME_PATH');
}

const rawUrl = process.env.BASE_URL || process.argv[2] || 'http://localhost:3000';
let landingUrl = rawUrl.replace(/\/+$/, '');
let reviewUrl = `${landingUrl}/review/QT-20260904-888`;

if (landingUrl.includes('kelvinflow.com')) {
  landingUrl = 'https://kelvinflow.com';
  reviewUrl = 'https://quote.kelvinflow.com/review/QT-20260904-888';
}

console.log(`\n========================================================`);
console.log(`🚀 KelvinFlow E2E 全链路 UI 自动化断言测试启动`);
console.log(`🎯 官网落地页目标: ${landingUrl}`);
console.log(`🎯 审单工作台目标: ${reviewUrl}`);
console.log(`========================================================\n`);

async function runAudit() {
  const chromePath = getChromePath();
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  let testFailures = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ [FAIL] ${message}`);
      testFailures++;
    } else {
      console.log(`✅ [PASS] ${message}`);
    }
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const pageErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon.ico')) {
          pageErrors.push(`[Console Error] ${text}`);
        }
      }
    });
    page.on('pageerror', err => pageErrors.push(`[Page Crash] ${err.message}`));

    // ==========================================
    // 1. 官网首页 (index.html) 交互与样式审计
    // ==========================================
    console.log(`\n[Stage 1] 正在检测官网落地页 (${landingUrl}/)...`);
    await page.goto(`${landingUrl}/`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    assert(pageErrors.length === 0, `首页加载无致命 JS 控制台报错 (当前报错数: ${pageErrors.length})`);

    // 1.1 截图 5 验证：验证底部「联系创始人」文字与链接已彻底移除
    console.log(`\n--> 测试用例 1.1: 底部「联系创始人」精简移除验证 (截图 5)`);
    const footerBtnExists = await page.$('#footer-contact-founder');
    const footerHasFounderText = await page.evaluate(() => {
      const footer = document.querySelector('footer');
      return footer ? footer.textContent.includes('联系创始人 (微信: kt_data)') : false;
    });
    assert(!footerBtnExists && !footerHasFounderText, '截图 5 验证：已彻底移除底部「联系创始人 (微信: kt_data)」文字链接');

    // 1.2 验证支付/极客版订阅弹窗
    console.log(`\n--> 测试用例 1.2: 支付弹窗交互与年付/月付边框验证`);
    await page.evaluate(() => {
      if (typeof window.openPaymentModal === 'function') window.openPaymentModal();
    });
    await new Promise(r => setTimeout(r, 500));

    const modalInfo = await page.evaluate(() => {
      const modal = document.getElementById('payment-modal');
      const enterprise = document.getElementById('enterprise-modal');
      const monthlyBtn = document.getElementById('pay-switch-monthly');
      const annualBtn = document.getElementById('pay-switch-annual');

      if (!modal) return { exists: false };
      const style = window.getComputedStyle(modal);

      return {
        exists: true,
        display: style.display,
        hidden: modal.classList.contains('hidden'),
        enterpriseExists: !!enterprise,
        hasBorderWrapper: monthlyBtn?.parentElement?.classList.contains('border'),
        monthlyActive: monthlyBtn?.classList.contains('bg-amber-500/20')
      };
    });

    assert(modalInfo.exists && !modalInfo.hidden && modalInfo.display === 'flex', '支付弹窗成功弹出且样式为 display: flex');
    assert(!modalInfo.enterpriseExists, '已彻底移除冗余的独立 enterprise-modal');
    assert(modalInfo.hasBorderWrapper, '月付/年付切换按钮已拥有精致外边框容器 (border wrapper)');

    // 1.3 切换至年付
    console.log(`\n--> 测试用例 1.3: 年付/月付无缝切换与转账备注响应`);
    await page.click('#pay-switch-annual');
    await new Promise(r => setTimeout(r, 300));

    const annualSwitchState = await page.evaluate(() => {
      const annualBtn = document.getElementById('pay-switch-annual');
      const noteEl = document.getElementById('payment-note-text');
      return {
        annualActive: annualBtn?.classList.contains('bg-amber-500/20'),
        note: noteEl?.textContent.trim()
      };
    });

    assert(annualSwitchState.annualActive, '点击年付后激活高亮状态');
    assert(annualSwitchState.note && annualSwitchState.note.includes('890'), `备注动态更新为年付金额 (当前: ${annualSwitchState.note})`);

    // 关闭弹窗
    await page.click('#payment-modal button i.fa-xmark');
    await new Promise(r => setTimeout(r, 400));
    const isClosed = await page.evaluate(() => document.getElementById('payment-modal')?.classList.contains('hidden'));
    assert(isClosed, '支付弹窗点击关闭后正常隐藏');

    // ==========================================
    // 2. 在线审单工作台 (review.html) 交互与闭环审计
    // ==========================================
    console.log(`\n[Stage 2] 正在检测审单控制台 (${reviewUrl})...`);
    
    // 导航至审单工作台
    await page.goto(reviewUrl, { waitUntil: 'networkidle0' });

    // 注入基础状态
    await page.evaluate(() => {
      localStorage.setItem('kelvinflow_user_phone', '18566690282');
      localStorage.setItem('saas_auth_token', 'test_auth_token');
      localStorage.setItem('kelvinflow_tour_dismissed', 'true');
    });

    // 刷新页面激活状态与 Vue 实例
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));

    // 2.1 退出登录弹窗测试
    console.log(`\n--> 测试用例 2.1: 退出登录按钮交互验证`);
    const logoutBtn = await page.$('button[title="退出登录或切换账号"]');
    assert(!!logoutBtn, '右上角退出登录按钮成功渲染在 DOM 中');

    if (logoutBtn) {
      await logoutBtn.click();
      await new Promise(r => setTimeout(r, 600));

      const logoutModalState = await page.evaluate(() => {
        const heading = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('确认退出当前账号'));
        if (!heading) return { found: false };
        const overlay = heading.closest('.fixed.inset-0');
        const rect = heading.getBoundingClientRect();
        const style = window.getComputedStyle(overlay || heading);

        return {
          found: true,
          width: rect.width,
          height: rect.height,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity
        };
      });

      assert(logoutModalState.found, '退出确认弹窗 DOM 成功挂载并在屏幕中展开');
      assert(logoutModalState.display === 'flex' && logoutModalState.opacity === '1', '退出弹窗处于完全可见状态');

      // 取消退出 / 保留登录
      const cancelBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(btn => (btn.textContent.trim() === '保留登录' || btn.textContent.trim() === '取消') && btn.closest('.fixed.inset-0'));
        if (b) {
          b.click();
          return true;
        }
        return false;
      });
      assert(cancelBtn, '成功点击弹窗「保留登录」取消按钮');
      await new Promise(r => setTimeout(r, 400));

      const isLogoutClosed = await page.evaluate(() => {
        const heading = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('确认退出当前账号'));
        return !heading;
      });
      assert(isLogoutClosed, '退出弹窗点击取消后成功关闭并卸载');
    }

    // 2.2 截图 3 验证: 英文邮件草稿框高度与右栏留白彻底消除
    console.log(`\n--> 测试用例 2.2: 邮件草稿输入框高度与布局空白 (截图 3)`);
    const emailDraftLayout = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[name="reply_email_draft"]') ||
                       document.querySelector('textarea[placeholder*="Dear"]') ||
                       document.querySelector('textarea.font-mono');
      if (!textarea) return { exists: false };
      const rect = textarea.getBoundingClientRect();
      return {
        exists: true,
        height: rect.height,
        rows: textarea.getAttribute('rows')
      };
    });
    assert(emailDraftLayout.exists && emailDraftLayout.height >= 380, `截图 3 验证：邮件草稿输入框高度充实 (当前高度: ${Math.round(emailDraftLayout.height || 0)}px, rows=${emailDraftLayout.rows})，彻底填补右栏空白`);

    // 2.3 截图 4 验证: 联系创始人 Kelvin 专人协助弹窗 + Toast 层级
    console.log(`\n--> 测试用例 2.3: 联系创始人弹窗、按钮即时反馈与 Toast 层级 (截图 4)`);
    await page.evaluate(() => {
      if (window.__vm) window.__vm.wechatQrModal.show = true;
    });
    await new Promise(r => setTimeout(r, 500));

    const wechatModalState = await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('联系创始人 Kelvin 专人协助'));
      return { open: !!heading };
    });
    assert(wechatModalState.open, '联系创始人专人协助弹窗成功开启');

    // 点击一键复制微信号
    await page.evaluate(() => {
      if (window.__vm) window.__vm.copyWechatId();
    });
    await new Promise(r => setTimeout(r, 400));

    const toastAndBtnState = await page.evaluate(() => {
      const toastEl = document.querySelector('.fixed.top-6, .fixed.top-8, .fixed.top-18, .fixed.top-20');
      const heading = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('联系创始人 Kelvin 专人协助'));
      const modalContainer = heading?.closest('.fixed.inset-0');
      const btn = heading?.closest('.bg-white')?.querySelector('button');

      const toastComputed = toastEl ? window.getComputedStyle(toastEl) : null;
      const modalComputed = modalContainer ? window.getComputedStyle(modalContainer) : null;

      const toastZ = toastComputed ? parseInt(toastComputed.zIndex, 10) : 0;
      const modalZ = modalComputed ? parseInt(modalComputed.zIndex, 10) : 0;

      return {
        btnText: btn?.textContent?.trim() || '',
        toastZ,
        modalZ,
        toastAboveModal: toastZ > modalZ
      };
    });
    assert(toastAndBtnState.btnText.includes('已复制微信号'), '复制按钮具有即时响应状态: 「已复制微信号 (kt_data)」');
    assert(toastAndBtnState.toastAboveModal && toastAndBtnState.toastZ >= 9999, `截图 4 验证：Toast 层级 (z-index: ${toastAndBtnState.toastZ}) 居于弹窗遮罩层 (z-index: ${toastAndBtnState.modalZ}) 之上，100% 居顶无遮挡`);

    await page.evaluate(() => {
      if (window.__vm) window.__vm.wechatQrModal.show = false;
    });
    await new Promise(r => setTimeout(r, 300));

    // 2.4 截图 1 & 2 验证: IMAP 弹窗 Tab 边框、Tab 1 新版排版、Tab 2 冗余按钮移除
    console.log(`\n--> 测试用例 2.4: IMAP 自动出单弹窗 (截图 1 & 2)`);
    await page.evaluate(() => {
      if (window.__vm) {
        window.__vm.openImapModal();
        window.__vm.imapModal.showGuideDrawer = true;
      }
    });
    await new Promise(r => setTimeout(r, 600));

    const imapModalState = await page.evaluate(() => {
      if (!window.__vm || !window.__vm.imapModal.show) return { open: false };

      const tab1Btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('邮件自动转发') || b.textContent.includes('邮件转发'));
      const tabContainer = tab1Btn?.parentElement;
      const tabContainerComputed = tabContainer ? window.getComputedStyle(tabContainer) : null;
      const hasTabBorder = tabContainer?.classList.contains('border') || (tabContainerComputed && parseFloat(tabContainerComputed.borderWidth) > 0);

      const allBtns = Array.from(document.querySelectorAll('button'));
      const providersFound = allBtns.filter(b => {
        const t = b.textContent.replace(/\s+/g, '');
        return t.includes('腾讯/Foxmail') ||
               t.includes('阿里/钉钉') ||
               t.includes('网易163') ||
               t.includes('微软Outlook') ||
               t.includes('谷歌Gmail');
      });

      const copyKeywordBtn = allBtns.find(b => b.textContent.includes('复制关键词'));

      return {
        open: true,
        hasTabBorder,
        providerCount: providersFound.length,
        hasCopyKeywordBtn: !!copyKeywordBtn
      };
    });

    assert(imapModalState.open, 'IMAP 邮箱全自动出单弹窗成功开启');
    assert(imapModalState.hasTabBorder, '截图 1 验证：Tab 切换栏已具备高质感容器外边框 (border wrapper)');
    assert(imapModalState.providerCount === 5 && imapModalState.hasCopyKeywordBtn, '截图 2 验证：Tab 1 教程已重构为清爽 5 格卡片与一键关键词复制');

    // 切换至 Tab 2 (草稿箱直达) 验证非付费用户锁屏与冗余按钮移除
    await page.evaluate(() => {
      if (window.__vm) {
        if (window.__vm.trialState) {
          window.__vm.trialState.isTrial = true;
          window.__vm.trialState.isPaid = false;
        }
        localStorage.setItem('kelvinflow_user_plan', 'trial');
        localStorage.setItem('kelvinflow_user_is_paid', 'false');
        window.__vm.imapModal.tab = 'draft';
      }
    });
    await new Promise(r => setTimeout(r, 400));

    const tab2Check = await page.evaluate(() => {
      const redundantBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('继续使用模式 1'));
      const upgradeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('立即升级专业版解锁特权'));
      return {
        hasRedundantBtn: !!redundantBtn,
        hasUpgradeBtn: !!upgradeBtn
      };
    });

    assert(!tab2Check.hasRedundantBtn && tab2Check.hasUpgradeBtn, '截图 1 验证：Tab 2 锁屏界面已彻底移除冗余的「继续使用模式 1」按钮');

    await page.evaluate(() => {
      if (window.__vm) window.__vm.imapModal.show = false;
    });
    await new Promise(r => setTimeout(r, 300));

    // 2.5 移动端响应式排查
    console.log(`\n--> 测试用例 2.5: 移动端 (390x844) 横向溢出排查`);
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 400));

    const mobileOverflow = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      return {
        hasHorizontalScroll: scrollWidth > clientWidth,
        diff: scrollWidth - clientWidth
      };
    });
    assert(!mobileOverflow.hasHorizontalScroll, `移动端 (390px) 视口无横向溢出滚动 (0px overflow, diff=${mobileOverflow.diff}px)`);

  } catch (err) {
    console.error('❌ 执行测试过程发生未捕获异常:', err);
    testFailures++;
  } finally {
    await browser.close();
  }

  console.log(`\n========================================================`);
  if (testFailures === 0) {
    console.log(`🎉 恭喜！全部 UI 自动化端到端测试 100% 通过！零视觉穿透、零 DOM 塌陷！`);
    console.log(`========================================================\n`);
    process.exit(0);
  } else {
    console.error(`💥 测试失败！共检测到 ${testFailures} 处异常，请修正后重试！`);
    console.log(`========================================================\n`);
    process.exit(1);
  }
}

runAudit();
