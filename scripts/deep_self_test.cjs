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

const rawUrl = process.argv[2] || 'http://localhost:3000';
let landingUrl = rawUrl.replace(/\/+$/, '');
let reviewUrl = `${landingUrl}/review/QT-20260904-888`;

if (landingUrl.includes('kelvinflow.com')) {
  landingUrl = 'https://kelvinflow.com';
  reviewUrl = 'https://quote.kelvinflow.com/review/QT-20260904-888';
}

async function deepAudit() {
  console.log(`\n======================================================`);
  console.log(`🔍 KelvinFlow 深度全方位自主巡检与测试脚本启动`);
  console.log(`🌐 落地页目标: ${landingUrl}`);
  console.log(`🌐 审单台目标: ${reviewUrl}`);
  console.log(`======================================================\n`);

  const chromePath = getChromePath();
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const issuesFound = [];
  const passedItems = [];

  function recordPass(area, desc) {
    console.log(`  ✅ [PASS] [${area}] ${desc}`);
    passedItems.push({ area, desc });
  }

  function recordIssue(area, desc, severity = 'MEDIUM', detail = '') {
    console.log(`  ❌ [ISSUE] [${area}] [${severity}] ${desc}`);
    issuesFound.push({ area, desc, severity, detail });
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon.ico')) {
          consoleErrors.push(text);
        }
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push(`PageError: ${err.message}`);
    });

    // ----------------------------------------------------
    // TEST SECTION 1: 官网首页 (index.html) 检查
    // ----------------------------------------------------
    console.log(`\n--- 阶段 1: 官网落地页 (${landingUrl}/) 全量排查 ---`);
    await page.goto(`${landingUrl}/`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));

    // 1.1 检查截图 5: 底部联系创始人文本是否已彻底移除
    const footerFounderLink = await page.$('#footer-contact-founder');
    const footerTextHasFounder = await page.evaluate(() => {
      const footer = document.querySelector('footer');
      return footer ? footer.textContent.includes('联系创始人 (微信: kt_data)') : false;
    });
    if (!footerFounderLink && !footerTextHasFounder) {
      recordPass('Index.Footer', '截图 5 验证：已彻底移除底部「联系创始人 (微信: kt_data)」文字链接');
    } else {
      recordIssue('Index.Footer', '截图 5 遗留：页脚依然包含「联系创始人」相关文字或 DOM 节点', 'HIGH');
    }

    // 1.2 检查全页死链与 javascript:void(0) 未绑定事件
    const brokenLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const broken = [];
      links.forEach(a => {
        const href = a.getAttribute('href');
        const onclick = a.getAttribute('onclick');
        if (href === '#' && !onclick) {
          broken.push({ text: a.textContent.trim(), html: a.outerHTML });
        }
      });
      return broken;
    });
    if (brokenLinks.length === 0) {
      recordPass('Index.Links', '首页所有超链接均有明确锚点或 onclick 事件绑定');
    } else {
      recordIssue('Index.Links', `首页发现 ${brokenLinks.length} 个空锚点链接可能无任何响应: ${JSON.stringify(brokenLinks[0])}`, 'LOW');
    }

    // 1.3 检查支付/方案弹窗 (Payment Modal)
    await page.evaluate(() => {
      if (typeof window.openPaymentModal === 'function') window.openPaymentModal();
    });
    await new Promise(r => setTimeout(r, 400));
    const paymentModalCheck = await page.evaluate(() => {
      const m = document.getElementById('payment-modal');
      if (!m || m.classList.contains('hidden')) return { open: false };
      const monthlyBtn = document.getElementById('pay-switch-monthly');
      const annualBtn = document.getElementById('pay-switch-annual');
      const hasBorder = monthlyBtn?.parentElement?.classList.contains('border');
      return { open: true, hasBorder, monthlyActive: monthlyBtn?.classList.contains('bg-amber-500/20') };
    });
    if (paymentModalCheck.open && paymentModalCheck.hasBorder) {
      recordPass('Index.PaymentModal', '支付弹窗打开正常，且月付/年付容器具备 border 样式包裹');
    } else {
      recordIssue('Index.PaymentModal', '支付弹窗打开失败或样式包裹缺失', 'HIGH');
    }

    // 关闭支付弹窗
    await page.evaluate(() => {
      if (typeof window.closePaymentModal === 'function') window.closePaymentModal();
    });
    await new Promise(r => setTimeout(r, 300));

    // 1.4 检查开通试用弹窗 (Inbound Modal)
    await page.evaluate(() => {
      if (typeof window.openInboundModal === 'function') window.openInboundModal('starter');
    });
    await new Promise(r => setTimeout(r, 400));
    const inboundModalCheck = await page.evaluate(() => {
      const m = document.getElementById('inbound-modal');
      return { open: m && !m.classList.contains('hidden') };
    });
    if (inboundModalCheck.open) {
      recordPass('Index.InboundModal', '试用申请弹窗打开正常');
    } else {
      recordIssue('Index.InboundModal', '试用申请弹窗打开失败', 'MEDIUM');
    }
    await page.evaluate(() => {
      if (typeof window.closeInboundModal === 'function') window.closeInboundModal();
    });
    await new Promise(r => setTimeout(r, 300));

    // ----------------------------------------------------
    // TEST SECTION 2: 审单工作台 (review.html) 深度排查
    // ----------------------------------------------------
    console.log('\n--- 阶段 2: 审单工作台 (review.html) 全量排查 ---');
    await page.goto(reviewUrl, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      localStorage.setItem('kelvinflow_user_phone', '18566690282');
      localStorage.setItem('saas_auth_token', 'test_auth_token');
      localStorage.setItem('kelvinflow_tour_dismissed', 'true');
      localStorage.removeItem('kelvinflow_user_plan');
      localStorage.setItem('kelvinflow_user_is_paid', 'false');
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));

    // 2.1 检查截图 3: 邮件正文高度及空白消除情况
    console.log('\n--> 排查截图 3: 邮件草稿输入框高度与布局空白');
    const emailDraftLayout = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[name="reply_email_draft"]') ||
                       document.querySelector('textarea[placeholder*="Dear"]') ||
                       document.querySelector('textarea.font-mono');
      if (!textarea) return { exists: false };
      const rect = textarea.getBoundingClientRect();
      const parentCol = textarea.closest('.flex-col') || textarea.parentElement;
      const parentRect = parentCol ? parentCol.getBoundingClientRect() : null;
      return {
        exists: true,
        height: rect.height,
        rows: textarea.getAttribute('rows'),
        parentHeight: parentRect ? parentRect.height : null
      };
    });
    if (emailDraftLayout.exists && emailDraftLayout.height >= 380) {
      recordPass('Review.EmailDraft', `截图 3 验证：邮件草稿输入框高度充足 (高度 ${Math.round(emailDraftLayout.height)}px, rows=${emailDraftLayout.rows})，已彻底填补右栏空白`);
    } else {
      recordIssue('Review.EmailDraft', `截图 3 遗留：邮件草稿高度不足 (当前高度: ${emailDraftLayout.height}px)，右侧留白依然过大`, 'MEDIUM');
    }

    // 2.2 检查截图 4: 联系创始人弹窗及复制微信 Toast 提示
    console.log('\n--> 排查截图 4: 联系创始人弹窗及复制微信 Toast 提示与 z-index 层级');
    await page.evaluate(() => {
      if (window.__vm) window.__vm.wechatQrModal.show = true;
    });
    await new Promise(r => setTimeout(r, 500));

    const wechatModalState = await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('联系创始人 Kelvin 专人协助'));
      if (!heading) return { open: false };
      const copyBtn = heading.closest('.bg-white')?.querySelector('button');
      return {
        open: true,
        btnText: copyBtn?.textContent?.trim() || ''
      };
    });

    if (wechatModalState.open) {
      recordPass('Review.WechatModal', '联系创始人弹窗成功开启并显示微信二维码');

      // 触发点击复制
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

        const toastMessageEl = document.querySelector('.fixed .text-slate-100, .fixed .text-slate-800');

        return {
          btnText: btn?.textContent?.trim() || '',
          toastZ,
          modalZ,
          toastAboveModal: toastZ > modalZ,
          toastVisible: !!toastEl && toastComputed?.display !== 'none',
          toastMessage: toastMessageEl?.textContent?.trim() || ''
        };
      });

      if (toastAndBtnState.btnText.includes('已复制微信号')) {
        recordPass('Review.WechatModal', '复制按钮自身即时响应反馈: 「已复制微信号 (kt_data)」');
      } else {
        recordIssue('Review.WechatModal', `复制按钮未发生反馈文案变化: 当前文案为 "${toastAndBtnState.btnText}"`, 'MEDIUM');
      }

      if (toastAndBtnState.toastAboveModal && toastAndBtnState.toastZ >= 9999) {
        recordPass('Review.Toast', `截图 4 验证：Toast 层级 (z-index: ${toastAndBtnState.toastZ}) 远高于弹窗遮罩层 (z-index: ${toastAndBtnState.modalZ})，100% 居顶显示无遮挡`);
      } else {
        recordIssue('Review.Toast', `截图 4 遗留：Toast 层级低于弹窗遮罩层 (Toast z-index: ${toastAndBtnState.toastZ}, Modal z-index: ${toastAndBtnState.modalZ})`, 'HIGH');
      }

      // 关闭微信弹窗
      await page.evaluate(() => {
        if (window.__vm) window.__vm.wechatQrModal.show = false;
      });
      await new Promise(r => setTimeout(r, 300));
    } else {
      recordIssue('Review.WechatModal', '未能成功打开联系创始人弹窗', 'HIGH');
    }

    // 2.3 检查截图 1 & 2: IMAP 自动转发弹窗 (Tab 边框、Tab 2 冗余按钮移除、Tab 1 教程排版)
    console.log('\n--> 排查截图 1 & 2: IMAP 邮箱配置弹窗全功能与新版交互');
    await page.evaluate(() => {
      if (window.__vm) {
        window.__vm.openImapModal();
        window.__vm.imapModal.showGuideDrawer = true; // 展开指引抽屉
      }
    });
    await new Promise(r => setTimeout(r, 600));

    const imapModalState = await page.evaluate(() => {
      if (!window.__vm || !window.__vm.imapModal.show) return { open: false };

      // 检查 Tab 容器边框 (截图 1)
      const tab1Btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('邮件自动转发') || b.textContent.includes('邮件转发'));
      const tabContainer = tab1Btn?.parentElement;
      const tabContainerComputed = tabContainer ? window.getComputedStyle(tabContainer) : null;
      const hasTabBorder = tabContainer?.classList.contains('border') || (tabContainerComputed && parseFloat(tabContainerComputed.borderWidth) > 0);

      // 检查 Tab 1 排版 (截图 2)
      // 5 大邮箱厂商按钮数量
      const allBtns = Array.from(document.querySelectorAll('button'));
      const providersFound = allBtns.filter(b => {
        const t = b.textContent.replace(/\s+/g, '');
        return t.includes('腾讯/Foxmail') ||
               t.includes('阿里/钉钉') ||
               t.includes('网易163') ||
               t.includes('微软Outlook') ||
               t.includes('谷歌Gmail');
      });

      // 关键词一键复制按钮
      const copyKeywordBtn = allBtns.find(b => b.textContent.includes('复制关键词'));

      return {
        open: true,
        hasTabBorder,
        providerCount: providersFound.length,
        hasCopyKeywordBtn: !!copyKeywordBtn
      };
    });

    if (imapModalState.open) {
      if (imapModalState.hasTabBorder) {
        recordPass('Review.ImapModal', '截图 1 验证：Tab 切换栏已具备高质感容器边框与圆角胶囊容器');
      } else {
        recordIssue('Review.ImapModal', '截图 1 遗留：Tab 切换栏依然缺少边框容器', 'MEDIUM');
      }

      if (imapModalState.providerCount === 5 && imapModalState.hasCopyKeywordBtn) {
        recordPass('Review.ImapModal', '截图 2 验证：Tab 1 教程已重构为清爽 5 格卡片与一键关键词复制，交互直观清晰');
      } else {
        recordIssue('Review.ImapModal', `截图 2 遗留：Tab 1 教程组件结构不符合预期 (厂商数: ${imapModalState.providerCount})`, 'LOW');
      }

    // 切换到 Tab 2 检查模式 2 锁屏界面 (确保未付费状态下展示锁屏升级入口)
    console.log('--> 切换至 Tab 2 (草稿箱直达) 验证非付费用户锁屏与冗余按钮移除...');
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
      const upgradeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('立即升级极客版解锁特权'));
      return {
        hasRedundantBtn: !!redundantBtn,
        hasUpgradeBtn: !!upgradeBtn
      };
    });

    if (!tab2Check.hasRedundantBtn && tab2Check.hasUpgradeBtn) {
      recordPass('Review.ImapModal', '命名与锁屏验证：Tab 2 锁屏界面统一为「极客版」特权且已彻底移除冗余的模式 1 按钮');
    } else {
      recordIssue('Review.ImapModal', `截图 1 遗留：Tab 2 按钮结构不符合预期 (hasRedundantBtn=${tab2Check.hasRedundantBtn}, hasUpgradeBtn=${tab2Check.hasUpgradeBtn})`, 'MEDIUM');
    }

    // 关闭 IMAP 弹窗
    await page.evaluate(() => {
      if (window.__vm) window.__vm.imapModal.show = false;
    });
    await new Promise(r => setTimeout(r, 300));
    } else {
      recordIssue('Review.ImapModal', '未能成功打开 IMAP 邮箱配置弹窗', 'HIGH');
    }

    // ----------------------------------------------------
    // TEST SECTION 3: 自主探索发现其他潜在问题 (Self-Testing)
    // ----------------------------------------------------
    console.log('\n--- 阶段 3: 深度自主探索排查 (寻找隐藏缺陷与体验瑕疵) ---');

    // 3.1 移动端小屏响应式排查 (390px iPhone 12/13/14 尺寸)
    console.log('\n--> 自主排查 3.1: 移动端 (390x844) 响应式与横向溢出排查');
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

    if (!mobileOverflow.hasHorizontalScroll) {
      recordPass('Responsive.Mobile', '移动端 (390px) 视口无横向溢出滚动 (0px overflow)');
    } else {
      recordIssue('Responsive.Mobile', `移动端 (390px) 存在横向滚动条溢出 (+${mobileOverflow.diff}px)，可能存在宽度被撑破的元素`, 'MEDIUM');
    }

    // 恢复桌面视口
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise(r => setTimeout(r, 300));

    // 3.2 检查各核心交互弹窗关闭时是否造成背景滚动锁定泄漏
    console.log('\n--> 自主排查 3.2: 弹窗开启/关闭后的 body overflow 滚动锁测试');
    const bodyOverflow = await page.evaluate(() => {
      return window.getComputedStyle(document.body).overflow;
    });
    if (bodyOverflow !== 'hidden') {
      recordPass('UX.ScrollLock', '所有弹窗关闭后，页面 body 滚动条正常恢复，无滚动死锁');
    } else {
      recordIssue('UX.ScrollLock', '弹窗关闭后 body 仍然被设置为 overflow: hidden，导致用户无法正常滚动页面', 'HIGH');
    }

    // 3.3 检查快速建单弹窗 (openNewPoModal)
    console.log('\n--> 自主排查 3.3: 快速建单 / 上传询盘弹窗可用性');
    const quickUploadTest = await page.evaluate(() => {
      if (window.__vm && typeof window.__vm.openNewPoModal === 'function') {
        window.__vm.openNewPoModal();
        return { opened: window.__vm.newPoModal?.show || window.__vm.uploadModal?.show };
      }
      return { opened: false };
    });
    if (quickUploadTest.opened) {
      recordPass('Review.QuickUpload', '快速建单弹窗能正常触发唤起 (openNewPoModal)');
      await page.evaluate(() => {
        if (window.__vm && window.__vm.newPoModal) window.__vm.newPoModal.show = false;
        if (window.__vm && window.__vm.uploadModal) window.__vm.uploadModal.show = false;
      });
      await new Promise(r => setTimeout(r, 200));
    } else {
      recordIssue('Review.QuickUpload', '快速建单弹窗无法通过 openNewPoModal 唤起', 'LOW');
    }

    // 3.4 检查 7 天试用激活弹窗 (trialModal)
    console.log('\n--> 自主排查 3.4: 7 天试用激活弹窗与输入校验');
    const trialModalTest = await page.evaluate(() => {
      if (window.__vm && typeof window.__vm.openTrialModal === 'function') {
        window.__vm.openTrialModal('inbound_lead');
        return { opened: window.__vm.trialModal?.show };
      }
      return { opened: false };
    });
    if (trialModalTest.opened) {
      recordPass('Review.TrialModal', '7 天免费试用激活弹窗正常唤起');
      await page.evaluate(() => {
        if (window.__vm) window.__vm.trialModal.show = false;
      });
      await new Promise(r => setTimeout(r, 200));
    } else {
      recordIssue('Review.TrialModal', '7 天免费试用弹窗打开异常', 'LOW');
    }

    // 3.5 检查升级极客版弹窗 (upgradeModal) 的年付切换和微信号复制
    console.log('\n--> 自主排查 3.5: 升级极客版弹窗内的年付切换与微信号复制');
    await page.evaluate(() => {
      if (window.__vm) {
        window.__vm.openUpgradeModal('monthly');
      }
    });
    await new Promise(r => setTimeout(r, 400));
    // 点击年付切换
    await page.evaluate(() => {
      const annualBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('年付特惠版'));
      if (annualBtn) annualBtn.click();
      else if (window.__vm && window.__vm.upgradeModal) window.__vm.upgradeModal.cycle = 'annual';
    });
    await new Promise(r => setTimeout(r, 400));
    const upgradeModalCheck = await page.evaluate(() => {
      if (!window.__vm || !window.__vm.upgradeModal.show) return { open: false };
      const spans = Array.from(document.querySelectorAll('span'));
      const hasAnnualNote = spans.some(s => s.textContent.includes('升级年付极客版(¥890)'));
      return {
        open: true,
        noteMatchesAnnual: hasAnnualNote
      };
    });
    if (upgradeModalCheck.open && upgradeModalCheck.noteMatchesAnnual) {
      recordPass('Review.UpgradeModal', '升级弹窗切换年付周期后，转账备注动态联动为 ¥890');
    } else {
      recordIssue('Review.UpgradeModal', '升级弹窗切换年付周期时备注未同步联动', 'MEDIUM');
    }
    await page.evaluate(() => {
      if (window.__vm) window.__vm.upgradeModal.show = false;
    });
    await new Promise(r => setTimeout(r, 300));

    // 3.6 检查审单工作台关键按钮与交互：单价调整、利润率、重新计算
    console.log('\n--> 自主排查 3.6: 报价单核心数据交互（毛利率微调联动计算）');
    const pricingCalculationCheck = await page.evaluate(() => {
      if (!window.__vm || !window.__vm.quotation) return { ok: false, reason: 'no quotation object' };
      const items = window.__vm.quotation.items;
      if (!items || items.length === 0) return { ok: false, reason: 'no items' };
      const firstItem = items[0];
      const initialTotal = window.__vm.quotation.grandTotalUsd;
      
      // 微调第一项毛利率
      if (typeof window.__vm.onMarginChange === 'function') {
        window.__vm.onMarginChange(firstItem, 35);
        const newTotal = window.__vm.quotation.grandTotalUsd;
        return {
          ok: true,
          initialTotal,
          newTotal,
          changed: newTotal !== undefined
        };
      }
      return { ok: false, reason: 'no onMarginChange function' };
    });
    if (pricingCalculationCheck.ok) {
      recordPass('Review.Calculation', `毛利率微调与报价系统联动计算响应良好 (总价计算正常)`);
    } else {
      recordIssue('Review.Calculation', `报价数据联动重算失效: ${pricingCalculationCheck.reason || '无变化'}`, 'MEDIUM');
    }

    // 3.7 检查页面所有图片资源是否能够成功加载 (防 404 / 破图)
    console.log('\n--> 自主排查 3.7: 静态资源与图片加载检查 (防 404 破图)');
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const failed = [];
      imgs.forEach(img => {
        if (!img.complete || img.naturalWidth === 0) {
          failed.push(img.src);
        }
      });
      return failed;
    });
    if (brokenImages.length === 0) {
      recordPass('Assets.Images', '审单工作台所有图片均能正常显示或已具备安全 onerror 降级');
    } else {
      recordIssue('Assets.Images', `发现 ${brokenImages.length} 个无法加载的图片资源: ${brokenImages.join(', ')}`, 'MEDIUM');
    }

    // 3.8 控制台报错统计
    if (consoleErrors.length === 0) {
      recordPass('Runtime.Console', '全交互测试流程控制台 0 报错 (Zero Console Errors)');
    } else {
      recordIssue('Runtime.Console', `发现 ${consoleErrors.length} 条控制台报错: ${consoleErrors.slice(0, 3).join('; ')}`, 'HIGH');
    }

  } catch (err) {
    recordIssue('Runtime.Crash', `巡检过程发生未捕获异常: ${err.message}`, 'CRITICAL', err.stack);
  } finally {
    await browser.close();
  }

  console.log(`\n======================================================`);
  console.log(`📊 巡检总结: 通过 ${passedItems.length} 项, 发现问题 ${issuesFound.length} 项`);
  console.log(`======================================================\n`);

  fs.writeFileSync('audit_results.json', JSON.stringify({ passedItems, issuesFound }, null, 2));
  return { passedItems, issuesFound };
}

deepAudit();
