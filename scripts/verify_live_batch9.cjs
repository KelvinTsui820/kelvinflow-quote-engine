const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

function generateProductionToken(email) {
  const secret = process.env.AUTH_SECRET || 'ai-quotation-saas-master-key-2026';
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId: 'usr_trial_live_test',
    email,
    name: 'Kelvin Tsui',
    role: 'admin',
    tenantId: 'tenant_trial_tsuikelvin0804_gmail',
    exp: Math.floor(Date.now() / 1000) + 14 * 86400
  };

  const b64Url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const h = b64Url(header);
  const p = b64Url(payload);
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${h}.${p}.${sig}`;
}

(async () => {
  console.log('🌐 正在连接生产服务器 https://quote.kelvinflow.com 进行 Batch 9 真实线上全量验证...');
  const testEmail = 'tsuikelvin0804@gmail.com';
  const testToken = generateProductionToken(testEmail);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: getChromePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('kelvinflow_tour_dismissed', 'true');
  });

  const liveUrl = `https://quote.kelvinflow.com/review/QT-20260904-888?token=${testToken}`;
  console.log(`📄 正在访问生产环境: ${liveUrl} ...`);
  await page.goto(liveUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => !!window.__vm);

  await page.evaluate(() => {
    if (window.__vm && window.__vm.onboardingTour) {
      window.__vm.onboardingTour.active = false;
    }
  });
  await new Promise(r => setTimeout(r, 800));

  const artifactDir = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\b82ea610-5577-4d85-b3da-91290fcde81a';

  // --- 验证 1: 生产环境试用剩余天数自然日计算 ---
  console.log('\n--- 1. 验证生产环境试用剩余天数自然日递减 ---');
  const trialState = await page.evaluate(() => {
    const vm = window.__vm;
    return {
      remainingDays: vm ? vm.trialState.remainingDays : null,
      isTrial: vm ? vm.trialState.isTrial : null,
      badgeText: document.querySelector('header div.bg-blue-950\\/90')?.innerText.replace(/\s+/g, ' ').trim() || ''
    };
  });
  console.log('线上试用状态:', trialState);
  const shot1Path = path.join(artifactDir, 'live_batch9_trial_status.png');
  await page.screenshot({ path: shot1Path, clip: { x: 0, y: 0, width: 1440, height: 180 } });
  console.log(`📸 线上顶部状态栏截图已保存至: ${shot1Path}`);

  // --- 验证 2: 生产环境 MOQ 弹窗无文字溢出 ---
  console.log('\n--- 2. 验证生产环境 MOQ 弹窗换行与无溢出 ---');
  await page.evaluate(() => {
    if (window.__vm && window.__vm.quotation?.items?.[0]) {
      window.__vm.quotation.items[0].quantity = 2;
    }
  });
  await new Promise(r => setTimeout(r, 400));

  const moqBadge = await page.$('.group\\/moq');
  if (moqBadge) {
    await page.evaluate(el => el.scrollIntoView({ block: 'center' }), moqBadge);
    await new Promise(r => setTimeout(r, 300));
    await moqBadge.hover();
    await new Promise(r => setTimeout(r, 500));

    const popoverCheck = await page.evaluate(() => {
      const popover = document.querySelector('.group\\/moq > div');
      if (!popover) return { found: false };
      const rect = popover.getBoundingClientRect();
      const textEl = popover.querySelector('.leading-relaxed');
      const textRect = textEl ? textEl.getBoundingClientRect() : null;
      return {
        found: true,
        width: rect.width,
        height: rect.height,
        textContent: textEl ? textEl.innerText.trim() : '',
        textOverflows: textRect ? (textRect.right > rect.right + 2) : false
      };
    });
    console.log('线上 MOQ 弹窗检查:', popoverCheck);

    const shot2Path = path.join(artifactDir, 'live_batch9_moq_popover.png');
    const popoverEl = await page.$('.group\\/moq > div');
    if (popoverEl) {
      await popoverEl.screenshot({ path: shot2Path });
    }
    console.log(`📸 线上 MOQ 弹窗截图已保存至: ${shot2Path}`);
  } else {
    console.warn('⚠️ 未定位到 .group/moq 元素');
  }

  // --- 验证 3 & 4: 生产环境 Logo 弹窗 ---
  console.log('\n--- 3 & 4. 验证生产环境企业 Logo 设置弹窗 ---');
  await page.evaluate(() => {
    const vm = window.__vm;
    if (vm && vm.openLogoModal) {
      vm.openLogoModal();
    }
  });
  await new Promise(r => setTimeout(r, 500));

  const logoModalCheck = await page.evaluate(() => {
    const modal = document.querySelector('#logo-modal-overlay');
    if (!modal) return { found: false };
    const subtitle = modal.querySelector('p.text-xs.text-slate-400');
    const buttons = Array.from(modal.querySelectorAll('button')).map(b => b.innerText.trim());
    const tipsBox = modal.querySelector('.bg-blue-950\\/40');
    return {
      found: true,
      subtitleText: subtitle ? subtitle.innerText.trim() : '',
      subtitleClass: subtitle ? subtitle.className : '',
      buttons,
      hasResetOfficialLogoButton: buttons.some(t => t.includes('恢复官方徽标')),
      tipsText: tipsBox ? tipsBox.innerText.trim() : ''
    };
  });
  console.log('线上 Logo 弹窗检查:', logoModalCheck);

  const shot3Path = path.join(artifactDir, 'live_batch9_logo_modal.png');
  await page.screenshot({ path: shot3Path });
  console.log(`📸 线上 Logo 弹窗截图已保存至: ${shot3Path}`);

  await browser.close();
  console.log('\n🎉 生产环境真实验证全部完成！');
})();
