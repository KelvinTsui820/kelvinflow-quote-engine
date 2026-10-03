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
        // Ignore expected favicon 404 or analytics if any
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

    // 1.1 验证底部「联系创始人」按钮与支付弹窗
    console.log(`\n--> 测试用例 1.1: 底部「联系创始人」弹窗复用验证`);
    const footerBtnExists = await page.$('#footer-contact-founder');
    assert(!!footerBtnExists, '底部联系创始人按钮 (#footer-contact-founder) 存在');

    if (footerBtnExists) {
      await page.click('#footer-contact-founder');
      await new Promise(r => setTimeout(r, 500));

      const modalInfo = await page.evaluate(() => {
        const modal = document.getElementById('payment-modal');
        const enterprise = document.getElementById('enterprise-modal');
        const oldCopyNote = document.getElementById('copy-pay-note-text');
        const oldCopyWechat = document.getElementById('copy-founder-wechat-text');
        const monthlyBtn = document.getElementById('pay-switch-monthly');
        const annualBtn = document.getElementById('pay-switch-annual');

        if (!modal) return { exists: false };
        const rect = modal.getBoundingClientRect();
        const style = window.getComputedStyle(modal);

        return {
          exists: true,
          display: style.display,
          opacity: style.opacity,
          hidden: modal.classList.contains('hidden'),
          enterpriseExists: !!enterprise,
          oldCopyButtonsRemoved: !oldCopyNote && !oldCopyWechat,
          hasBorderWrapper: monthlyBtn?.parentElement?.classList.contains('border'),
          monthlyActive: monthlyBtn?.classList.contains('bg-amber-500/20')
        };
      });

      assert(modalInfo.exists && !modalInfo.hidden && modalInfo.display === 'flex', '支付弹窗成功弹出且样式为 display: flex');
      assert(!modalInfo.enterpriseExists, '已彻底移除冗余的独立 enterprise-modal');
      assert(modalInfo.oldCopyButtonsRemoved, '已成功精简移除底部冗余复制按钮');
      assert(modalInfo.hasBorderWrapper, '月付/年付切换按钮已拥有精致外边框容器 (border wrapper)');

      // 1.2 切换至年付
      console.log(`\n--> 测试用例 1.2: 年付/月付无缝切换与转账备注响应`);
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
    }

    // ==========================================
    // 2. 在线审单工作台 (review.html) 交互与闭环审计
    // ==========================================
    console.log(`\n[Stage 2] 正在检测审单控制台 (${reviewUrl})...`);
    
    // 首先导航至审单工作台
    await page.goto(reviewUrl, { waitUntil: 'networkidle0' });

    // 在审单域名下注入已登录态
    await page.evaluate(() => {
      localStorage.setItem('kelvinflow_user_phone', '18566690282');
      localStorage.setItem('saas_auth_token', 'test_auth_token');
      localStorage.setItem('kelvinflow_tour_dismissed', 'true');
    });

    // 刷新页面激活登录状态与 Vue 实例
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));

    // 2.1 退出登录弹窗测试 (排查由于 HTML 结构闭合错误导致的 swallowed DOM)
    console.log(`\n--> 测试用例 2.1: 退出登录按钮 (排查 DOM 吞噬与事件失效)`);
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
      assert(logoutModalState.display === 'flex' && logoutModalState.opacity === '1', '退出弹窗处于完全可见状态 (opacity: 1, display: flex)');

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

    // 2.2 审单页内升级极客版弹窗验证
    console.log(`\n--> 测试用例 2.2: 审单工作台「升级极客版」弹窗`);
    const upgradeTriggered = await page.evaluate(() => {
      if (window.__vm && typeof window.__vm.openUpgradeModal === 'function') {
        window.__vm.openUpgradeModal('monthly');
        return true;
      }
      return false;
    });

    if (upgradeTriggered) {
      await new Promise(r => setTimeout(r, 500));
      const upgradeModalState = await page.evaluate(() => {
        const h4 = Array.from(document.querySelectorAll('h4')).find(h => h.textContent.includes('开通 / 续费外贸智能中枢'));
        return {
          found: !!h4,
          title: h4?.textContent?.trim()
        };
      });
      assert(upgradeModalState.found, '审单页内升级极客版弹窗成功打开并渲染');
    }

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
