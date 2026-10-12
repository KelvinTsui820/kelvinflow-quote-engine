const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5';

async function main() {
  console.log('🚀 Starting Muse_6 QA Defect Live Verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const url = 'http://192.255.145.11:3000/review/QT-20260904-888';
  console.log(`📡 Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  await page.waitForSelector('.rate-card-container', { timeout: 10000 });
  console.log('✅ Page loaded successfully');

  // Allow Vue reactivity and rates fetch to settle
  await new Promise(r => setTimeout(r, 2000));

  // --- D-16 Verification: Exchange Rate Time ---
  console.log('\n--- Verifying D-16 (Exchange Rate Time CST) ---');
  const rateCardInfo = await page.evaluate(() => {
    const card = document.querySelector('.rate-card-container');
    const timeSpan = card.querySelector('span.font-mono.hidden.xl\\:inline');
    return {
      text: timeSpan ? timeSpan.innerText : '',
      title: timeSpan ? timeSpan.getAttribute('title') : ''
    };
  });
  console.log('Card 6 Rate Time:', rateCardInfo);

  // Open Diagnostic Modal
  await page.evaluate(() => {
    const badge = document.querySelector('.rate-card-container button[title*="外贸汇率"]');
    if (badge) badge.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const diagnosticTimeText = await page.evaluate(() => {
    const modal = document.querySelector('body');
    const timeSpans = Array.from(modal.querySelectorAll('span')).filter(s => s.innerText && s.innerText.includes('北京时间:'));
    return timeSpans.map(s => s.innerText);
  });
  console.log('Diagnostic Modal Time Display:', diagnosticTimeText);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'muse6_d16_rate_diagnostic_modal.png') });
  console.log('📸 Saved muse6_d16_rate_diagnostic_modal.png');

  // Close Diagnostic Modal
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('我知道了'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // --- D-21 Verification: Card 9 Validity Tooltip ---
  console.log('\n--- Verifying D-21 (Card 9 Validity Input Title Tooltip) ---');
  const card9Info = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const validityInput = inputs.find(i => i.placeholder && i.placeholder.includes('30 Days'));
    if (!validityInput) return null;
    return {
      value: validityInput.value,
      title: validityInput.getAttribute('title')
    };
  });
  console.log('Card 9 Input Info:', card9Info);

  // --- D-20 Verification: 40HQ Load Gauge Text Truncation ---
  console.log('\n--- Verifying D-20 (40HQ Load Gauge AI Recommendation) ---');
  const gaugeInfo = await page.evaluate(() => {
    const group = document.querySelector('.group\\/aitip');
    if (!group) return null;
    const textSpan = group.querySelector('span.text-\\[10px\\]');
    const btn = group.querySelector('button');
    return {
      classes: textSpan ? textSpan.className : '',
      text: textSpan ? textSpan.innerText : '',
      hasTruncate: textSpan ? textSpan.className.includes('truncate') : false,
      buttonText: btn ? btn.innerText.trim() : ''
    };
  });
  console.log('40HQ Gauge Info:', gaugeInfo);

  // --- D-18, D-19, D-22 Verification: Quotes History Modal ---
  console.log('\n--- Verifying D-18, D-19, D-22 (History Switcher Modal) ---');
  // Click history button
  await page.evaluate(() => {
    const historyBtn = Array.from(document.querySelectorAll('button')).find(b => 
      (b.innerText && b.innerText.includes('历史')) || 
      (b.getAttribute('title') && b.getAttribute('title').includes('历史'))
    );
    if (historyBtn) {
      console.log('Found history button:', historyBtn.innerText);
      historyBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 1200));

  const historyModalInfo = await page.evaluate(() => {
    // Find the modal
    const modalHeaders = Array.from(document.querySelectorAll('h3')).filter(h => h.innerText && h.innerText.includes('租户历史报价单切换'));
    if (modalHeaders.length === 0) return { error: 'Modal not opened' };

    const modal = modalHeaders[0].closest('.fixed');
    const subtitle = modal.querySelector('p.text-\\[11px\\]');
    const searchInput = modal.querySelector('input[type="text"]');
    const computedPaddingLeft = searchInput ? window.getComputedStyle(searchInput).paddingLeft : '';
    
    // Check items
    const items = Array.from(modal.querySelectorAll('.group')).map(item => {
      const texts = Array.from(item.querySelectorAll('div, span')).map(e => e.innerText.trim()).filter(Boolean);
      return texts.join(' | ');
    });

    // Check specific QT-388788
    const qt388 = items.find(t => t.includes('QT-388788'));

    return {
      subtitleText: subtitle ? subtitle.innerText : '',
      inputClasses: searchInput ? searchInput.className : '',
      computedPaddingLeft,
      totalItems: items.length,
      sampleItems: items.slice(0, 5),
      qt388
    };
  });
  console.log('History Modal Info:', historyModalInfo);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'muse6_d18_d19_d22_history_modal.png') });
  console.log('📸 Saved muse6_d18_d19_d22_history_modal.png');

  // Test searching in History Modal
  console.log('\n--- Testing Search in History Modal ---');
  await page.evaluate(() => {
    const modalHeaders = Array.from(document.querySelectorAll('h3')).filter(h => h.innerText && h.innerText.includes('租户历史报价单切换'));
    const modal = modalHeaders[0].closest('.fixed');
    const searchInput = modal.querySelector('input[type="text"]');
    if (searchInput) {
      searchInput.value = 'QT-388';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 600));

  const filteredInfo = await page.evaluate(() => {
    const modalHeaders = Array.from(document.querySelectorAll('h3')).filter(h => h.innerText && h.innerText.includes('租户历史报价单切换'));
    const modal = modalHeaders[0].closest('.fixed');
    const subtitle = modal.querySelector('p.text-\\[11px\\]');
    const items = Array.from(modal.querySelectorAll('.group')).map(item => item.innerText.replace(/\n+/g, ' | ').trim());
    return {
      subtitleText: subtitle ? subtitle.innerText : '',
      items
    };
  });
  console.log('Filtered Search Info:', filteredInfo);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'muse6_d18_search_filtered.png') });
  console.log('📸 Saved muse6_d18_search_filtered.png');

  // Overall Workbench Screenshot
  await page.evaluate(() => {
    const modalHeaders = Array.from(document.querySelectorAll('h3')).filter(h => h.innerText && h.innerText.includes('租户历史报价单切换'));
    if (modalHeaders.length > 0) {
      const modal = modalHeaders[0].closest('.fixed');
      const closeBtn = modal.querySelector('button');
      if (closeBtn) closeBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'muse6_workbench_clean.png'), fullPage: false });
  console.log('📸 Saved muse6_workbench_clean.png');

  await browser.close();
  console.log('🎉 Verification completed successfully!');
}

main().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
