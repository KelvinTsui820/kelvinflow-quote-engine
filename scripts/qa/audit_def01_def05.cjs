const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const REPORT_DIR = 'F:\\gemini test report';
const ARTIFACT_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\55cf2dff-82cb-4e4f-ae6c-d5a1787d3a2a';

(async () => {
  console.log('====================================================');
  console.log('AUDIT DEF-01 TO DEF-05 & SELF-CHECKS VERIFICATION');
  console.log('====================================================\n');

  const browser = await chromium.launch({ 
    headless: false,
    executablePath: CHROME_PATH,
    args: ['--window-size=1920,1080']
  });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  const copyScreenshot = (filename) => {
    const src = path.join(REPORT_DIR, filename);
    const dest = path.join(ARTIFACT_DIR, filename);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  };

  // ==========================================
  // DEF-01: 注册表单错误提示残留已删除文档
  // ==========================================
  console.log('--- 1. Testing DEF-01: Inbound Agreement Error Message ---');
  await page.evaluate(() => openInboundModal('starter'));
  await page.waitForSelector('#inbound-modal', { state: 'visible' });
  await page.waitForTimeout(300);

  // Uncheck agreement checkbox if checked
  await page.evaluate(() => {
    const cb = document.getElementById('inbound-agreement-checkbox');
    if (cb) cb.checked = false;
    // Dispatch submit or call handler to test JS validation logic
    const form = document.getElementById('inbound-form');
    handleInboundSubmit(new Event('submit'));
  });
  await page.waitForTimeout(200);

  const def01Text = await page.$eval('#inbound-error-feedback-text', el => el.textContent.trim());
  const def01Visible = await page.$eval('#inbound-error-feedback', el => !el.classList.contains('hidden'));

  console.log(`DEF-01 Error text: "${def01Text}", Visible: ${def01Visible}`);
  if (!def01Visible || def01Text !== '请先阅读并同意用户服务协议') {
    throw new Error(`FAIL DEF-01: Expected "请先阅读并同意用户服务协议", got "${def01Text}"`);
  }

  const def01ModalEl = await page.locator('#inbound-modal .max-w-\\[480px\\]');
  await def01ModalEl.screenshot({ path: path.join(REPORT_DIR, 'v18_def01_agreement_error.png') });
  copyScreenshot('v18_def01_agreement_error.png');
  console.log('PASS: DEF-01 verified.\n');

  // Close modal
  await page.evaluate(() => closeInboundModal());
  await page.waitForTimeout(300);

  // ==========================================
  // DEF-02: 弱化 5 处 "10 秒" 绝对化时效宣称
  // ==========================================
  console.log('--- 2. Testing DEF-02: Weaken "10 秒" Across 5 Touchpoints ---');

  // 1) Hero H1
  const heroH1Html = await page.$eval('h1', el => el.innerHTML);
  console.log('Touchpoint 1 (Hero H1):', heroH1Html);
  if (!heroH1Html.includes('<span class="text-primary-container">快速生成</span>')) {
    throw new Error('FAIL DEF-02: Hero H1 does not contain <span class="text-primary-container">快速生成</span>');
  }
  const heroH1El = await page.locator('h1.font-display-lg');
  await heroH1El.screenshot({ path: path.join(REPORT_DIR, 'v18_def02_hero_h1.png') });
  copyScreenshot('v18_def02_hero_h1.png');

  // 2) Three Metric Cards (Middle card)
  const metricCard2Text = await page.evaluate(() => {
    const cards = document.querySelectorAll('#features .grid > div');
    const middleCard = cards[1];
    return middleCard ? middleCard.innerText : '';
  });
  console.log('Touchpoint 2 (Metric Card 2):', metricCard2Text.replace(/\n/g, ' '));
  if (!metricCard2Text.includes('高效') || !metricCard2Text.includes('出单交付省时省力')) {
    throw new Error('FAIL DEF-02: Metric Card 2 does not contain "高效" and "出单交付省时省力"');
  }
  const metricCard2El = (await page.locator('#features .grid > div')).nth(1);
  await metricCard2El.screenshot({ path: path.join(REPORT_DIR, 'v18_def02_metric_card.png') });
  copyScreenshot('v18_def02_metric_card.png');

  // 3) Bottom CTA Headline
  const bottomCtaH2 = await page.evaluate(() => {
    const h2s = Array.from(document.querySelectorAll('h2'));
    const target = h2s.find(h => h.textContent.includes('让下一封海外询盘'));
    return target ? target.textContent.trim() : '';
  });
  console.log('Touchpoint 3 (Bottom CTA H2):', bottomCtaH2);
  if (bottomCtaH2 !== '立即开始，让下一封海外询盘快速搞定') {
    throw new Error(`FAIL DEF-02: Expected "立即开始，让下一封海外询盘快速搞定", got "${bottomCtaH2}"`);
  }
  const bottomCtaH2El = await page.locator('h2:has-text("让下一封海外询盘")').first();
  await bottomCtaH2El.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await bottomCtaH2El.screenshot({ path: path.join(REPORT_DIR, 'v18_def02_bottom_cta.png') });
  copyScreenshot('v18_def02_bottom_cta.png');

  // 4) CTA Guarantees
  const ctaGuarantees = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('section span'));
    const target = items.find(s => s.textContent.includes('快速出单') || s.textContent.includes('10 秒出单'));
    return target ? target.textContent.trim() : '';
  });
  console.log('Touchpoint 4 (CTA Guarantee):', ctaGuarantees);
  if (!ctaGuarantees.includes('开箱即用，快速出单')) {
    throw new Error(`FAIL DEF-02: Expected "开箱即用，快速出单", got "${ctaGuarantees}"`);
  }
  const guaranteeEl = await page.locator('span:has-text("开箱即用，快速出单")').first();
  await guaranteeEl.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await guaranteeEl.screenshot({ path: path.join(REPORT_DIR, 'v18_def02_cta_guarantee.png') });
  copyScreenshot('v18_def02_cta_guarantee.png');

  // 5) Registration Modal Pill
  await page.evaluate(() => openInboundModal('starter'));
  await page.waitForSelector('#inbound-modal', { state: 'visible' });
  await page.waitForTimeout(200);

  const regModalPillText = await page.evaluate(() => {
    const pill = document.querySelector('#inbound-modal .bg-primary-fixed');
    return pill ? pill.textContent.trim().replace(/\s+/g, ' ') : '';
  });
  console.log('Touchpoint 5 (Registration Modal Pill):', regModalPillText);
  if (!regModalPillText.includes('无需信用卡 · 即刻开启，快速出单')) {
    throw new Error(`FAIL DEF-02: Expected "无需信用卡 · 即刻开启，快速出单", got "${regModalPillText}"`);
  }
  const pillEl = await page.locator('#inbound-modal .bg-primary-fixed');
  await pillEl.screenshot({ path: path.join(REPORT_DIR, 'v18_def02_reg_modal.png') });
  copyScreenshot('v18_def02_reg_modal.png');

  // Scan full landing HTML for "10 秒" and "10秒"
  const htmlContent = await page.content();
  const tenSecSpaced = (htmlContent.match(/10 秒/g) || []).length;
  const tenSecNoSpace = (htmlContent.match(/10秒/g) || []).length;
  console.log(`Full-page "10 秒" count: ${tenSecSpaced}, "10秒" count: ${tenSecNoSpace}`);
  if (tenSecSpaced > 0 || tenSecNoSpace > 0) {
    throw new Error(`FAIL DEF-02: "10 秒" or "10秒" still found in landing HTML!`);
  }
  console.log('PASS: DEF-02 verified (all 5 touchpoints changed, 0残留).\n');

  // ==========================================
  // DEF-03: 去掉绝对化保证 (特性卡 "大幅减少漏项误读")
  // ==========================================
  console.log('--- 3. Testing DEF-03: Feature Card Realistic Phrasing ---');
  await page.evaluate(() => closeInboundModal());
  await page.waitForTimeout(200);

  const def03Text = await page.evaluate(() => {
    const cards = document.querySelectorAll('#features .grid > div');
    const firstCard = cards[0];
    return firstCard ? firstCard.innerText : '';
  });
  console.log('DEF-03 Card 1 Text:', def03Text.replace(/\n/g, ' '));
  if (!def03Text.includes('大幅减少漏项误读')) {
    throw new Error(`FAIL DEF-03: Expected "大幅减少漏项误读", got: ${def03Text}`);
  }
  if (def03Text.includes('无漏项误读')) {
    throw new Error(`FAIL DEF-03: "无漏项误读" should be removed!`);
  }
  const card1El = (await page.locator('#features .grid > div')).nth(0);
  await card1El.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await card1El.screenshot({ path: path.join(REPORT_DIR, 'v18_def03_feature_card.png') });
  copyScreenshot('v18_def03_feature_card.png');
  console.log('PASS: DEF-03 verified.\n');

  // ==========================================
  // DEF-04: FAQ 数据保密文案 (租户之间相互隔离)
  // ==========================================
  console.log('--- 4. Testing DEF-04: FAQ Storage Policy Phrasing ---');
  const faqSection = await page.locator('#faq');
  await faqSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);

  // Toggle FAQ item 1
  const faq1Btn = await page.locator('#faq-accordion-group .faq-accordion-item:nth-child(1) button');
  await faq1Btn.click();
  // Wait for 320ms CSS grid animation
  await page.waitForTimeout(400);

  const faq1Content = await page.$eval('#faq-accordion-group .faq-accordion-item:nth-child(1) .faq-accordion-content', el => el.textContent.trim());
  console.log('FAQ Item 1 content:', faq1Content);
  if (!faq1Content.includes('您的底价表与客户数据保存在私有工作区，租户之间相互隔离，模型仅在单次报价时读取比对，不会用于公共模型训练。')) {
    throw new Error(`FAIL DEF-04: Expected "租户之间相互隔离", got: ${faq1Content}`);
  }
  if (faq1Content.includes('并加密存储')) {
    throw new Error(`FAIL DEF-04: "并加密存储" should be removed!`);
  }

  const faq1Item = await page.locator('#faq-accordion-group .faq-accordion-item:nth-child(1)');
  await faq1Item.screenshot({ path: path.join(REPORT_DIR, 'v18_def04_faq_accordion.png') });
  copyScreenshot('v18_def04_faq_accordion.png');
  console.log('PASS: DEF-04 verified.\n');

  // ==========================================
  // DEF-05: 获取验证码倒计时校验与行为验证
  // ==========================================
  console.log('--- 5. Testing DEF-05: Verification Code Validation & Countdown Timing ---');
  await page.evaluate(() => openInboundModal('starter'));
  await page.waitForSelector('#inbound-modal', { state: 'visible' });
  await page.waitForTimeout(200);

  const getCodeBtnState = async () => page.evaluate(() => {
    const btn = document.getElementById('btn-send-code');
    const text = document.getElementById('btn-send-code-text');
    const err = document.getElementById('inbound-error-feedback');
    const errText = document.getElementById('inbound-error-feedback-text');
    return {
      disabled: btn ? btn.disabled : false,
      text: text ? text.textContent.trim() : '',
      errVisible: err ? !err.classList.contains('hidden') : false,
      errText: errText ? errText.textContent.trim() : ''
    };
  });

  // State 1: Empty Email
  console.log('Testing State 1: Empty Email...');
  await page.fill('#inbound-email', '');
  await page.click('#btn-send-code');
  await page.waitForTimeout(200);

  const state1 = await getCodeBtnState();
  console.log('State 1 (Empty Email) Result:', state1);
  if (!state1.errVisible || state1.errText !== '请输入有效的工作邮箱' || state1.disabled || state1.text !== '获取验证码') {
    throw new Error(`FAIL DEF-05 State 1: Expected error "请输入有效的工作邮箱", disabled: false, text: "获取验证码". Got: ${JSON.stringify(state1)}`);
  }
  const modalBox = await page.locator('#inbound-modal .max-w-\\[480px\\]');
  await modalBox.screenshot({ path: path.join(REPORT_DIR, 'v18_def05_empty_email.png') });
  copyScreenshot('v18_def05_empty_email.png');

  // State 2: Illegal Domain
  console.log('Testing State 2: Illegal Domain...');
  await page.fill('#inbound-email', 'tester@invalid-domain');
  await page.click('#btn-send-code');
  await page.waitForTimeout(200);

  const state2 = await getCodeBtnState();
  console.log('State 2 (Illegal Domain) Result:', state2);
  if (!state2.errVisible || !state2.errText.includes('请提供真实的企业域名工作邮箱或常用公用邮箱') || state2.disabled || state2.text !== '获取验证码') {
    throw new Error(`FAIL DEF-05 State 2: Expected error "请提供真实的企业域名工作邮箱...", disabled: false, text: "获取验证码". Got: ${JSON.stringify(state2)}`);
  }
  await modalBox.screenshot({ path: path.join(REPORT_DIR, 'v18_def05_invalid_domain.png') });
  copyScreenshot('v18_def05_invalid_domain.png');

  // State 3: Legal Enterprise Email
  console.log('Testing State 3: Legal Enterprise Email...');
  await page.fill('#inbound-email', 'qa_inspector@acme-hardware.com');
  await page.click('#btn-send-code');
  await page.waitForTimeout(200);

  const state3 = await getCodeBtnState();
  console.log('State 3 (Legal Email) Result:', state3);
  if (!state3.disabled || !state3.text.includes('s可重发')) {
    throw new Error(`FAIL DEF-05 State 3: Expected countdown started (disabled: true, text like "60s可重发"). Got: ${JSON.stringify(state3)}`);
  }
  await modalBox.screenshot({ path: path.join(REPORT_DIR, 'v18_def05_valid_countdown.png') });
  copyScreenshot('v18_def05_valid_countdown.png');
  console.log('PASS: DEF-05 verified.\n');

  // ==========================================
  // 自查项 1: 登录/注册密码眼睛图标同步
  // ==========================================
  console.log('--- 6. Testing Self-Check 1: Password Eye Icon Sync ---');
  // Switch to login tab
  await page.click('#inbound-subtab-login');
  await page.waitForTimeout(200);

  const checkEyeToggle = async (btnSelector, inputId, iconId) => {
    const input = await page.locator(`#${inputId}`);
    const icon = await page.locator(`#${iconId}`);
    
    // Initial state
    const initType = await input.getAttribute('type');
    const initIcon = await icon.textContent();
    console.log(`Initial: type="${initType}", icon="${initIcon.trim()}"`);
    if (initType !== 'password' || initIcon.trim() !== 'visibility') {
      throw new Error(`FAIL Eye Check: expected password/visibility, got ${initType}/${initIcon}`);
    }

    // Click toggle to reveal
    await page.click(btnSelector);
    const toggledType = await input.getAttribute('type');
    const toggledIcon = await icon.textContent();
    console.log(`After click 1: type="${toggledType}", icon="${toggledIcon.trim()}"`);
    if (toggledType !== 'text' || toggledIcon.trim() !== 'visibility_off') {
      throw new Error(`FAIL Eye Check: expected text/visibility_off, got ${toggledType}/${toggledIcon}`);
    }

    // Click toggle to hide
    await page.click(btnSelector);
    const restoredType = await input.getAttribute('type');
    const restoredIcon = await icon.textContent();
    console.log(`After click 2: type="${restoredType}", icon="${restoredIcon.trim()}"`);
    if (restoredType !== 'password' || restoredIcon.trim() !== 'visibility') {
      throw new Error(`FAIL Eye Check: expected password/visibility, got ${restoredType}/${restoredIcon}`);
    }
  };

  await checkEyeToggle('#inbound-login-view button[aria-label="切换密码可见性"]', 'inbound-login-password', 'pwd-toggle-icon-login');
  console.log('PASS: Self-Check 1 verified (password eye toggle is 100% synchronous).\n');

  await page.evaluate(() => closeInboundModal());
  await page.waitForTimeout(200);

  // ==========================================
  // 自查项 2: FAQ 手风琴展开与收起
  // ==========================================
  console.log('--- 7. Testing Self-Check 2: FAQ Accordion Toggle ---');
  const faq2Btn = await page.locator('#faq-accordion-group .faq-accordion-item:nth-child(2) button');
  const faq1ItemEl = await page.locator('#faq-accordion-group .faq-accordion-item:nth-child(1)');
  const faq2ItemEl = await page.locator('#faq-accordion-group .faq-accordion-item:nth-child(2)');

  // Click Item 2 -> item 2 opens, item 1 closes
  await faq2Btn.click();
  await page.waitForTimeout(350);

  const item1Class = await faq1ItemEl.getAttribute('class');
  const item2Class = await faq2ItemEl.getAttribute('class');
  console.log('Item 1 class:', item1Class);
  console.log('Item 2 class:', item2Class);

  if (item1Class.includes('is-open') || !item2Class.includes('is-open')) {
    throw new Error('FAIL FAQ Accordion Check: item 2 should be open and item 1 should be closed!');
  }

  // Click Item 2 again -> item 2 closes
  await faq2Btn.click();
  await page.waitForTimeout(350);
  const item2ClassAfter = await faq2ItemEl.getAttribute('class');
  console.log('Item 2 class after second click:', item2ClassAfter);
  if (item2ClassAfter.includes('is-open')) {
    throw new Error('FAIL FAQ Accordion Check: item 2 should be closed after second click!');
  }
  console.log('PASS: Self-Check 2 verified (FAQ accordion functions reliably).\n');

  // ==========================================
  // 全文扫描禁用词
  // ==========================================
  console.log('--- 8. Full Page Prohibited Words Scan ---');
  const fullHtml = await page.content();
  const prohibitedList = ['99.4%', '一键', '实时汇率', '中国银行', '自动获取', 'sinosure', '10 秒', '10秒'];
  prohibitedList.forEach(word => {
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\\]/g, '\\$&'), 'gi');
    const matches = fullHtml.match(regex) || [];
    console.log(`Prohibited Word "${word}": ${matches.length} hits`);
    if (matches.length > 0) {
      throw new Error(`FAIL: Prohibited word "${word}" found in full page!`);
    }
  });

  console.log('\n====================================================');
  console.log('>>> ALL DEF-01~05 & SELF-CHECKS AUDITS PASSED <<<');
  console.log('====================================================');

  await browser.close();
})();
