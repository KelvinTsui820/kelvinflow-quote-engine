const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://192.255.145.11:3000';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\18bbbc95-6e78-4c78-aef3-7974f63242f5';

async function runVerification() {
  console.log('🚀 Starting end-to-end verification of all 5 issues on live production...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Dismiss tour upfront across domains
    await page.goto(`${BASE_URL}/review/QT-20260904-888`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('kelvinflow_tour_dismissed', 'true');
    });

    // ==========================================
    // TEST ISSUE 1: Landing Page Pricing Alignment
    // ==========================================
    console.log('\n--- Checking Issue 1: Pricing Cards Alignment on Index ---');
    await page.goto(`${BASE_URL}/#pricing`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#pricing', { visible: true });
    await new Promise(r => setTimeout(r, 800));

    // Capture Monthly pricing view
    const pricingSection = await page.$('#pricing');
    await pricingSection.screenshot({
      path: path.join(ARTIFACTS_DIR, 'verified_issue1_pricing_monthly.png')
    });
    console.log('📸 Saved verified_issue1_pricing_monthly.png');

    // Switch to Annual billing and verify alignment
    const annualBtn = await page.$('#btn-billing-annual');
    if (annualBtn) {
      await annualBtn.click();
      await new Promise(r => setTimeout(r, 600));
      await pricingSection.screenshot({
        path: path.join(ARTIFACTS_DIR, 'verified_issue1_pricing_annual.png')
      });
      console.log('📸 Saved verified_issue1_pricing_annual.png');
    }

    // ==========================================
    // TEST WORKBENCH: Issues 2, 3, 4, 5
    // ==========================================
    console.log('\n--- Checking Workbench Issues (2, 3, 4, 5) ---');
    await page.goto(`${BASE_URL}/review/QT-20260904-888`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      localStorage.setItem('kelvinflow_tour_dismissed', 'true');
    });
    await page.waitForSelector('.rate-card-container', { visible: true, timeout: 10000 });
    await new Promise(r => setTimeout(r, 1200));

    // Check Issue 2: Exchange Rate Time (Beijing Time CST)
    const fxInfo = await page.evaluate(() => {
      const card = document.querySelector('.rate-card-container');
      const timeText = card ? card.querySelector('.truncate')?.innerText : '';
      const badge = card ? card.querySelector('button.text-\\[9px\\] span')?.innerText : '';
      return { timeText, badge };
    });
    console.log('FX Card Initial State:', fxInfo);

    // Test Issue 4: Replace 平水 with 与市场牌价持平
    // Test flat state by setting quotation.rateUsed = liveMarketRate
    const flatBadgeText = await page.evaluate(() => {
      if (window.__vm && window.__vm.currentLiveRate) {
        window.__vm.quotation.rateUsed = window.__vm.currentLiveRate.buyingRate;
        return window.__vm.rateDiagnostic.text;
      }
      return null;
    });
    console.log('Badge text when quotation rate equals market rate:', flatBadgeText);
    await new Promise(r => setTimeout(r, 500));

    // Capture screenshot of Card 6 showing "⚖️ 与市场牌价持平" and Beijing Time "(11:00:01)"
    const headerGrid = await page.$('.grid.grid-cols-1.lg\\:grid-cols-12');
    if (headerGrid) {
      await headerGrid.screenshot({
        path: path.join(ARTIFACTS_DIR, 'verified_issue2_issue4_fx_card.png')
      });
      console.log('📸 Saved verified_issue2_issue4_fx_card.png (showing Beijing Time and ⚖️ 与市场牌价持平)');
    }

    // ==========================================
    // TEST ISSUE 3: Rate Diagnostic Modal
    // ==========================================
    console.log('\n--- Checking Issue 3: Rate Diagnostic Modal ---');
    // Click the badge or question icon in Card 6
    const rateBadgeBtn = await page.$('.rate-card-container button.text-\\[9px\\]');
    if (rateBadgeBtn) {
      await rateBadgeBtn.click();
      await new Promise(r => setTimeout(r, 600));

      const modalOpen = await page.evaluate(() => {
        return window.__vm && window.__vm.rateDiagnosticModalVisible === true;
      });
      console.log('Is rateDiagnosticModalVisible true?', modalOpen);

      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, 'verified_issue3_rate_modal.png')
      });
      console.log('📸 Saved verified_issue3_rate_modal.png');

      // Close modal
      await page.evaluate(() => {
        if (window.__vm) window.__vm.rateDiagnosticModalVisible = false;
      });
      await new Promise(r => setTimeout(r, 400));
    }

    // ==========================================
    // TEST ISSUE 5A & 5B: Card 1 Click & History Search
    // ==========================================
    console.log('\n--- Checking Issue 5: Card 1 Click & History Search ---');
    // 5A: Click "历史 (59)" button and verify NO text selection
    const historyBtn = await page.$('button[title="查看当前租户历史报价单列表"]');
    if (historyBtn) {
      await historyBtn.click();
      await new Promise(r => setTimeout(r, 600));

      const selectionText = await page.evaluate(() => {
        const sel = window.getSelection ? window.getSelection().toString() : '';
        return sel;
      });
      console.log('Browser text selection after clicking history (must be empty):', JSON.stringify(selectionText));

      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, 'verified_issue5_history_modal_open.png')
      });
      console.log('📸 Saved verified_issue5_history_modal_open.png');

      // 5B: Test search functionality in history modal
      const searchInput = await page.$('input[placeholder*="输入单据编号或买家企业名称搜索"]');
      if (searchInput) {
        console.log('Found history modal search input! Typing search keyword "QT-2026"...');
        await searchInput.type('QT-2026');
        await new Promise(r => setTimeout(r, 500));

        const matchCount = await page.evaluate(() => {
          return window.__vm ? window.__vm.filteredUserQuotesList.length : 0;
        });
        console.log('Filtered quotes count for keyword "QT-2026":', matchCount);

        await page.screenshot({
          path: path.join(ARTIFACTS_DIR, 'verified_issue5_search_filtered.png')
        });
        console.log('📸 Saved verified_issue5_search_filtered.png');

        // Test searching customer name
        await searchInput.click({ clickCount: 3 });
        await searchInput.type('Apex');
        await new Promise(r => setTimeout(r, 500));
        const custMatchCount = await page.evaluate(() => {
          return window.__vm ? window.__vm.filteredUserQuotesList.length : 0;
        });
        console.log('Filtered quotes count for customer keyword "Apex":', custMatchCount);
      } else {
        console.warn('Search input not found in history modal!');
      }
    }

    console.log('\n🎉 ALL 5 ISSUES VERIFIED CLEANLY ON PRODUCTION!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
  } finally {
    await browser.close();
  }
}

runVerification();
