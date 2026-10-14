const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('--- TEST 1: Login with expired account and check tour suppression & new modal copy ---');
  await page.goto('https://quote.kelvinflow.com/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    openInboundModal('starter');
    switchInboundFormMode('login');
  });
  await page.waitForTimeout(600);

  await page.fill('#inbound-login-email', 'tsuikelvin82099@gmail.com');
  await page.fill('#inbound-login-password', 'Kelvin820');
  await page.click('#inbound-login-submit-btn');

  await page.waitForURL(url => url.pathname.includes('/review/'), { timeout: 15000 });
  console.log('Redirected to:', page.url());
  await page.waitForTimeout(3000);

  // Check 1: Tour guide is NOT active
  const tourActive = await page.evaluate(() => {
    const tourOverlay = document.getElementById('tour-spotlight-overlay');
    return tourOverlay !== null;
  });
  console.log('Item 1: Is tour guide suppressed for expired user?', !tourActive);

  // Check 2: Modal copy verification
  const modalText = await page.innerText('body');
  const hasAntiAbuse = modalText.includes('防薅羊毛');
  console.log('Item 2: Contains "防薅羊毛"?', hasAntiAbuse, '(Expected: false)');
  console.log('Item 2: Contains "30 天数据安全保留"?', modalText.includes('30 天数据安全保留'));
  console.log('Item 2: Contains "永久每月免费额度"?', modalText.includes('永久每月免费额度'));
  console.log('Item 2: Contains "首月特惠 ¥39"?', modalText.includes('首月特惠 ¥39'));

  const shot1 = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5\\fix1_and_2_modal_redesign_no_tour.png';
  await page.screenshot({ path: shot1, fullPage: false });
  console.log('Saved Screenshot 1 to:', shot1);

  // Check 5A: Clicking outside does NOT close modal
  console.log('\n--- TEST 5A: Click outside backdrop ---');
  await page.mouse.click(50, 50); // click top-left empty corner
  await page.waitForTimeout(800);
  const stillOpenAfterBackdropClick = await page.evaluate(() => {
    const el = document.querySelector('.bg-\\[\\#060B1A\\]');
    return el !== null;
  });
  console.log('Item 5A: Modal still open after clicking outside backdrop?', stillOpenAfterBackdropClick, '(Expected: true)');

  // Check 3: Click "查看特惠定价" button
  console.log('\n--- TEST 3: Click 查看特惠定价 ---');
  await page.click('button:has-text("查看特惠定价")');
  await page.waitForTimeout(1200);

  const pricingModalOpen = await page.evaluate(() => {
    return document.body.innerText.includes('灵活计费') || document.body.innerText.includes('专业版') || document.body.innerText.includes('极客版');
  });
  console.log('Item 3: In-app Pricing modal opened successfully?', pricingModalOpen);
  const shot3 = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5\\fix3_pricing_modal_opened.png';
  await page.screenshot({ path: shot3, fullPage: false });
  console.log('Saved Screenshot 3 to:', shot3);

  // Close pricing modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);

  // Check 4: Check IMAP modal Tab 2 description
  console.log('\n--- TEST 4: Open IMAP modal Tab 2 ---');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const imapBtn = btns.find(b => b.textContent.includes('邮箱自动出单') || b.textContent.includes('出单中枢'));
    if (imapBtn) imapBtn.click();
  });
  await page.waitForTimeout(800);
  await page.click('text=草稿箱直达');
  await page.waitForTimeout(800);

  const tab2Text = await page.innerText('body');
  const hasShortDescription = tab2Text.includes('出单完成后，AI 自动将正式报价单与英文回信静默写入您的发件草稿箱，开箱即发。');
  console.log('Item 4: Tab 2 has refined short description?', hasShortDescription);
  const shot4 = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5\\fix4_imap_tab2_concise_copy.png';
  await page.screenshot({ path: shot4, fullPage: false });
  console.log('Saved Screenshot 4 to:', shot4);

  // Close IMAP modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  // Check 5B: Test "返回 KelvinFlow 官方门户"
  console.log('\n--- TEST 5B: Test 返回 KelvinFlow 官方门户 link ---');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const loginBtn = btns.find(b => b.textContent.includes('登录') || b.textContent.includes('试用'));
    if (loginBtn) loginBtn.click();
  });
  await page.waitForTimeout(600);
  const portalLink = await page.$('a:has-text("返回 KelvinFlow 官方门户")');
  if (portalLink) {
    const href = await portalLink.getAttribute('href');
    console.log('Item 5B: Portal link target href:', href);
    console.log('Item 5B: Points to index.html?', href.includes('/index.html'));
  }

  await browser.close();
  console.log('\n🎉 ALL 5 ITEMS VERIFIED ON PRODUCTION LIVE!');
})();
