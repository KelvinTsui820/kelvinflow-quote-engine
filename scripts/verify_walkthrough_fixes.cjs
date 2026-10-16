const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\55cf2dff-82cb-4e4f-ae6c-d5a1787d3a2a';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  console.log('Navigating to http://localhost:3000/index.html...');
  await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // ==========================================
  // L1 Check: Logo viewBox & Rendered Sizes
  // ==========================================
  console.log('\n--- Checking L1: Logo sizes across 4 locations ---');
  const logoInfo = await page.evaluate(() => {
    const headerImg = document.querySelector('header img[src*="k_logo.svg"]');
    const footerImg = document.querySelector('footer img[src*="k_logo.svg"]');
    const heroImg = document.querySelector('section img[src*="k_logo.svg"]');

    return {
      header: headerImg ? {
        width: headerImg.getBoundingClientRect().width,
        height: headerImg.getBoundingClientRect().height,
        classes: headerImg.className
      } : null,
      footer: footerImg ? {
        width: footerImg.getBoundingClientRect().width,
        height: footerImg.getBoundingClientRect().height,
        classes: footerImg.className,
        style: footerImg.getAttribute('style')
      } : null,
      heroWorkbench: heroImg ? {
        width: heroImg.getBoundingClientRect().width,
        height: heroImg.getBoundingClientRect().height
      } : null
    };
  });
  console.log('Header logo rect:', logoInfo.header);
  console.log('Footer logo rect:', logoInfo.footer);
  console.log('Hero workbench logo rect:', logoInfo.heroWorkbench);

  // Take screenshot of header logo BEFORE modal is opened
  const headerLogoEl = await page.$('header a[data-path="landing-page"]');
  if (headerLogoEl) {
    const p = path.join(ARTIFACT_DIR, 'l1_header_logo.png');
    await headerLogoEl.screenshot({ path: p });
    console.log(`Saved: ${p}`);
  }

  // Open register modal to check modal header logo
  await page.evaluate(() => {
    openInboundModal('starter');
  });
  await page.waitForTimeout(500);

  const modalLogoInfo = await page.evaluate(() => {
    const modalImg = document.querySelector('#inbound-modal img[src*="k_logo.svg"]');
    return modalImg ? {
      width: modalImg.getBoundingClientRect().width,
      height: modalImg.getBoundingClientRect().height,
      classes: modalImg.className
    } : null;
  });
  console.log('Modal logo rect:', modalLogoInfo);

  const modalLogoEl = await page.$('#inbound-modal .flex.flex-col.items-center.text-center');
  if (modalLogoEl) {
    const p = path.join(ARTIFACT_DIR, 'l1_modal_logo.png');
    await modalLogoEl.screenshot({ path: p });
    console.log(`Saved: ${p}`);
  }

  // ==========================================
  // L2 Check: Agreement Links Removed
  // ==========================================
  console.log('\n--- Checking L2: Agreement plain text & no deadlinks ---');
  const agreementInfo = await page.evaluate(() => {
    const label = document.querySelector('label[for="inbound-agreement-checkbox"]');
    const aTags = label ? label.querySelectorAll('a') : [];
    const checkbox = document.getElementById('inbound-agreement-checkbox');
    return {
      text: label ? label.textContent.trim().replace(/\s+/g, ' ') : '',
      aTagCount: aTags.length,
      isChecked: checkbox ? checkbox.checked : null
    };
  });
  console.log('Agreement label info:', agreementInfo);
  if (agreementInfo.aTagCount !== 0) {
    console.error('FAIL L2: <a> tags still found in agreement label!');
  } else {
    console.log('PASS L2: 0 <a> tags found, pure plain text confirmed.');
  }

  // ==========================================
  // L4 Check: Custom Channel Dropdown
  // ==========================================
  console.log('\n--- Checking L4: Custom Channel Dropdown ---');
  const initialDropdownState = await page.evaluate(() => {
    const btn = document.getElementById('custom-channel-btn');
    const label = document.getElementById('custom-channel-label');
    const menu = document.getElementById('custom-channel-menu');
    const input = document.getElementById('inbound-channel-select');
    return {
      label: label ? label.textContent.trim() : '',
      isMenuHidden: menu ? menu.classList.contains('hidden') : null,
      inputValue: input ? input.value : null,
      ariaExpanded: btn ? btn.getAttribute('aria-expanded') : null
    };
  });
  console.log('Initial dropdown state:', initialDropdownState);

  // Click to open dropdown
  await page.click('#custom-channel-btn');
  await page.waitForTimeout(300);

  const openDropdownState = await page.evaluate(() => {
    const menu = document.getElementById('custom-channel-menu');
    const options = Array.from(document.querySelectorAll('.channel-option')).map(opt => ({
      val: opt.getAttribute('data-value'),
      text: opt.querySelector('span')?.textContent.trim()
    }));
    return {
      isMenuHidden: menu ? menu.classList.contains('hidden') : null,
      optionsCount: options.length,
      options
    };
  });
  console.log('Open dropdown state:', openDropdownState);

  // Hover over second option ('小红书')
  const xhsOption = await page.$('.channel-option[data-value="xiaohongshu"]');
  if (xhsOption) {
    await xhsOption.hover();
    await page.waitForTimeout(200);
  }

  // Screenshot of custom dropdown expanded state (clipped to include popup menu)
  const dropdownClip = await page.evaluate(() => {
    const btn = document.getElementById('custom-channel-dropdown');
    const menu = document.getElementById('custom-channel-menu');
    const r1 = btn.getBoundingClientRect();
    const r2 = menu.getBoundingClientRect();
    return {
      x: Math.min(r1.left, r2.left) - 8,
      y: Math.min(r1.top, r2.top) - 8,
      width: Math.max(r1.right, r2.right) - Math.min(r1.left, r2.left) + 16,
      height: Math.max(r1.bottom, r2.bottom) - Math.min(r1.top, r2.top) + 16
    };
  });
  const pDrop = path.join(ARTIFACT_DIR, 'l4_custom_dropdown_expanded.png');
  await page.screenshot({ path: pDrop, clip: dropdownClip });
  console.log(`Saved: ${pDrop}`);

  // Full modal screenshot with dropdown open
  const modalBox = await page.$('#inbound-modal > div:nth-child(2)');
  if (modalBox) {
    const p = path.join(ARTIFACT_DIR, 'l4_modal_dropdown_open.png');
    await modalBox.screenshot({ path: p });
    console.log(`Saved: ${p}`);
  }

  // Test Escape key closes dropdown without closing modal
  console.log('Testing Escape on open dropdown...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  const afterEscapeDropdown = await page.evaluate(() => {
    const menu = document.getElementById('custom-channel-menu');
    const modal = document.getElementById('inbound-modal');
    return {
      dropdownHidden: menu ? menu.classList.contains('hidden') : null,
      modalHidden: modal ? modal.classList.contains('hidden') : null
    };
  });
  console.log('After Escape:', afterEscapeDropdown);
  if (afterEscapeDropdown.dropdownHidden && !afterEscapeDropdown.modalHidden) {
    console.log('PASS L4: Escape successfully closed dropdown while parent modal remains open!');
  } else {
    console.error('FAIL L4: Escape handling incorrect:', afterEscapeDropdown);
  }

  // Re-open and select an option
  console.log('Selecting option "小红书"...');
  await page.click('#custom-channel-btn');
  await page.waitForTimeout(300);
  await page.click('.channel-option[data-value="xiaohongshu"]');
  await page.waitForTimeout(300);

  const selectedState = await page.evaluate(() => {
    const label = document.getElementById('custom-channel-label');
    const input = document.getElementById('inbound-channel-select');
    const menu = document.getElementById('custom-channel-menu');
    const xhsCheck = document.querySelector('.channel-option[data-value="xiaohongshu"] .check-icon');
    return {
      label: label ? label.textContent.trim() : '',
      value: input ? input.value : '',
      isMenuHidden: menu ? menu.classList.contains('hidden') : null,
      hasCheckmark: xhsCheck ? !xhsCheck.classList.contains('hidden') : null
    };
  });
  console.log('Selected state:', selectedState);
  if (selectedState.value === 'xiaohongshu' && selectedState.hasCheckmark && selectedState.isMenuHidden) {
    console.log('PASS L4: Option selection, checkmark, and menu close verified.');
  } else {
    console.error('FAIL L4: Option selection failed:', selectedState);
  }

  // Close modal via Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // ==========================================
  // L3 Check: Navigation Hover Highlight
  // ==========================================
  console.log('\n--- Checking L3: Nav hover highlight ---');
  const navLinks = await page.$$('header nav a');
  console.log(`Found ${navLinks.length} nav links`);

  // Hover over the first link "功能特性"
  if (navLinks.length > 0) {
    await navLinks[0].hover();
    await page.waitForTimeout(200);

    const navHoverStyles = await page.evaluate(() => {
      const link = document.querySelector('header nav a');
      const comp = window.getComputedStyle(link);
      return {
        text: link.textContent.trim(),
        classes: link.className,
        color: comp.color,
        transition: comp.transition
      };
    });
    console.log('Nav link hover computed style:', navHoverStyles);

    const header = await page.$('header');
    if (header) {
      const p = path.join(ARTIFACT_DIR, 'l3_nav_hover_state.png');
      await header.screenshot({ path: p });
      console.log(`Saved: ${p}`);
    }
  }

  // ==========================================
  // Footer Logo Screenshot
  // ==========================================
  console.log('\n--- Checking Footer Logo ---');
  await page.evaluate(() => {
    const footer = document.getElementById('footer');
    if (footer) footer.scrollIntoView();
  });
  await page.waitForTimeout(600);

  const footer = await page.$('#footer');
  if (footer) {
    const p = path.join(ARTIFACT_DIR, 'l1_footer_logo.png');
    await footer.screenshot({ path: p });
    console.log(`Saved: ${p}`);
  }

  // ==========================================
  // Console Error Check
  // ==========================================
  console.log('\n--- Console Errors Check ---');
  console.log(`Total console errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('Errors found:', consoleErrors);
  } else {
    console.log('PASS: console 0 error confirmed!');
  }

  await browser.close();
  console.log('\n=== ALL VERIFICATION FINISHED ===');
})();
