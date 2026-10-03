const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  
  // Listen for console logs and errors
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Navigate to local review page
  await page.goto('http://localhost:3000/review/QT-20260904-888', { waitUntil: 'networkidle0' });
  console.log('Page loaded');

  // Set logged in user
  await page.evaluate(() => {
    localStorage.setItem('kelvinflow_user_phone', '18566690282');
    localStorage.setItem('saas_auth_token', 'test_token');
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
  });

  // Reload to reflect logged in state
  await page.reload({ waitUntil: 'networkidle0' });
  console.log('Reloaded with user');

  // Wait a moment for Vue to mount
  await new Promise(r => setTimeout(r, 1500));

  // Find the logout button
  const logoutBtn = await page.$('button[title="退出登录或切换账号"]');
  console.log('Logout button found:', !!logoutBtn);

  if (logoutBtn) {
    console.log('Clicking logout button...');
    await logoutBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    // Check modal visibility
    const modalInfo = await page.evaluate(() => {
      // Find modal by content or class
      const heading = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('确认退出当前账号'));
      if (!heading) return { found: false, reason: 'heading not found' };
      const card = heading.closest('.bg-\\[\\#0B132B\\]') || heading.parentElement;
      const overlay = heading.closest('.fixed.inset-0');
      const rect = card.getBoundingClientRect();
      const style = window.getComputedStyle(overlay || card);
      return {
        found: true,
        headingText: heading.textContent,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        zIndex: style.zIndex,
        overlayTag: overlay ? overlay.tagName : null
      };
    });
    console.log('Modal Info after click:', JSON.stringify(modalInfo, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: 'test_logout_result.png' });
    console.log('Screenshot saved to test_logout_result.png');
  }

  await browser.close();
})();
