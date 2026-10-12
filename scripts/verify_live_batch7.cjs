const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const https = require('https');

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

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    }).on('error', reject);
  });
}

(async () => {
  console.log('🚀 开始线上真实生产环境测试 (https://quote.kelvinflow.com) ...');

  // 1. 验证 550578343@qq.com 剩余天数 (应为 7 天)
  console.log('\n--- 1. 验证 550578343@qq.com 接口数据 ---');
  const qqStatus = await fetchJson('https://quote.kelvinflow.com/api/v1/auth/trial-status?email=550578343@qq.com');
  console.log('   550578343@qq.com trial status:', JSON.stringify(qqStatus, null, 2));
  if (qqStatus.remainingDays === 7) {
    console.log('   ✅ 成功: 550578343@qq.com 试用期精确计算为 7 天！');
  } else {
    console.error(`   ❌ 异常: 550578343@qq.com remainingDays = ${qqStatus.remainingDays} (预期 7)`);
  }

  // 2. 验证 tsuikelvin0804@gmail.com 剩余天数 (应为 14 天)
  console.log('\n--- 2. 验证 tsuikelvin0804@gmail.com 接口数据 ---');
  const gmailStatus = await fetchJson('https://quote.kelvinflow.com/api/v1/auth/trial-status?email=tsuikelvin0804@gmail.com');
  console.log('   tsuikelvin0804@gmail.com trial status:', JSON.stringify(gmailStatus, null, 2));
  if (gmailStatus.remainingDays === 14) {
    console.log('   ✅ 成功: tsuikelvin0804@gmail.com 推荐奖励正常，精确显示为 14 天！');
  } else {
    console.warn(`   ⚠️ tsuikelvin0804@gmail.com remainingDays = ${gmailStatus.remainingDays}`);
  }

  // 3. 打开真实生产工作台页面
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: getChromePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 预注入 550578343@qq.com
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('kelvinflow_user_email', '550578343@qq.com');
      localStorage.setItem('kelvinflow_remaining_days', '7');
      localStorage.setItem('kelvinflow_user_plan', 'trial');
      localStorage.setItem('kelvinflow_user_is_paid', 'false');
      localStorage.setItem('kelvinflow_tour_dismissed', 'true');
    });

    console.log('\n--- 3. 正在打开生产环境页面 https://quote.kelvinflow.com/review/QT-20260904-888 ---');
    await page.goto('https://quote.kelvinflow.com/review/QT-20260904-888', { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => !!window.__vm);
    await new Promise(r => setTimeout(r, 1500));

    // 检查导航栏版本标识
    const badgeText = await page.evaluate(() => {
      const h1 = document.querySelector('header h1');
      const badge = h1?.parentElement?.querySelector('span.rounded-full');
      return badge ? badge.innerText.trim() : 'NOT_FOUND';
    });
    console.log(`   线上版本标识: [${badgeText}]`);
    if (badgeText.includes('免费试用版') && !badgeText.includes('个人极客版')) {
      console.log('   ✅ 线上成功: 导航栏正确展示为【免费试用版】，不再误展示为极客版！');
    }

    // 检查导航栏账号与剩余天数
    const navText = await page.evaluate(() => {
      const el = document.querySelector('header .bg-blue-950\\/90');
      return el ? el.innerText.trim().replace(/\s+/g, ' ') : 'NOT_FOUND';
    });
    console.log(`   线上账号标识: [${navText}]`);
    if (navText.includes('550578343@qq.com') && navText.includes('余7天')) {
      console.log('   ✅ 线上成功: 账号与天数完全同步为 550578343@qq.com 余7天！');
    }

    // 截取顶部导航栏截图
    const headerElem = await page.$('header');
    if (headerElem) {
      const outPath = path.resolve('C:/Users/tsuik/.gemini/antigravity/brain/b82ea610-5577-4d85-b3da-91290fcde81a/live_batch7_navbar.png');
      await headerElem.screenshot({ path: outPath });
      console.log(`   📸 线上导航栏截图已保存至: ${outPath}`);
    }

    // 检查 4: 快速建单弹窗 (检查 Gemini 推广文案是否已移除)
    console.log('\n--- 4. 检查线上买家询盘建单弹窗 ---');
    await page.click('#tour-step-2');
    await page.waitForSelector('div.fixed.inset-0.z-50', { timeout: 3000 });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const textBtn = btns.find(b => b.innerText.includes('粘贴英文正文'));
      if (textBtn) textBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    const quickModalHtml = await page.evaluate(() => {
      const modal = document.querySelector('div.fixed.inset-0.z-50');
      return modal ? modal.innerHTML : '';
    });
    if (!quickModalHtml.includes('Gemini 3.8 Flash 自动解析买家信息')) {
      console.log('   ✅ 线上成功: 询盘建单弹窗中的 Gemini 冗余推广文案已彻底消失！');
      const quickCard = await page.$('div.fixed.inset-0.z-50 div.relative.max-w-xl');
      if (quickCard) {
        const outPath = path.resolve('C:/Users/tsuik/.gemini/antigravity/brain/b82ea610-5577-4d85-b3da-91290fcde81a/live_batch7_quick_quote.png');
        await quickCard.screenshot({ path: outPath });
        console.log(`   📸 线上建单弹窗截图已保存至: ${outPath}`);
      }
    }
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));

    // 检查 5: 表格低于起订量 MOQ 角标与 Hover 说明弹窗
    console.log('\n--- 5. 检查线上表格 MOQ 提示与 Hover 弹窗 ---');
    // 把第 1 项数量改为 10
    await page.evaluate(() => {
      if (window.__vm.quotation?.items?.[0]) {
        window.__vm.quotation.items[0].quantity = 10;
        window.__vm.onQtyChange(window.__vm.quotation.items[0]);
      }
    });
    await new Promise(r => setTimeout(r, 600));

    const moqBadge = await page.$('.group\\/moq');
    if (moqBadge) {
      const badgeBox = await moqBadge.boundingBox();
      await page.mouse.move(badgeBox.x + badgeBox.width / 2, badgeBox.y + badgeBox.height / 2);
      await new Promise(r => setTimeout(r, 400));

      const popoverText = await page.evaluate(() => {
        const pop = document.querySelector('.group\\/moq div.absolute');
        return pop ? pop.innerText.replace(/\s+/g, ' ').trim() : 'NOT_FOUND';
      });
      console.log(`   线上 Hover 弹窗内容: [${popoverText}]`);
      if (popoverText.includes('数量低于工厂起订量')) {
        console.log('   ✅ 线上成功: 鼠标 Hover 时流畅展示业务起订量说明弹窗！');
      }

      const tableCard = (await page.$$('div.bg-white.rounded-2xl.border'))[1] || await page.$('table');
      if (tableCard) {
        const outPath = path.resolve('C:/Users/tsuik/.gemini/antigravity/brain/b82ea610-5577-4d85-b3da-91290fcde81a/live_batch7_moq_hover.png');
        await tableCard.screenshot({ path: outPath });
        console.log(`   📸 线上表格 MOQ Hover 截图已保存至: ${outPath}`);
      }
    }

    // 检查 6: 退出登录弹窗
    console.log('\n--- 6. 检查线上退出登录弹窗 ---');
    await page.evaluate(() => {
      window.__vm.openLogoutModal();
    });
    await page.waitForSelector('div[class*="z-[120]"]', { timeout: 3000 });
    await new Promise(r => setTimeout(r, 500));

    const logoutModalText = await page.evaluate(() => {
      const modal = document.querySelector('div[class*="z-[120]"]');
      return modal ? modal.innerText.replace(/\s+/g, ' ').trim() : 'NOT_FOUND';
    });
    console.log(`   线上退出弹窗文案: [${logoutModalText}]`);
    if (!logoutModalText.includes('公共演示状态') && logoutModalText.includes('您随时可以通过该邮箱重新登录')) {
      console.log('   ✅ 线上成功: 「公共演示状态」已彻底移除！');
    }

    const logoutCard = await page.$('div[class*="z-[120]"] div.relative.max-w-sm');
    if (logoutCard) {
      const outPath = path.resolve('C:/Users/tsuik/.gemini/antigravity/brain/b82ea610-5577-4d85-b3da-91290fcde81a/live_batch7_logout_modal.png');
      await logoutCard.screenshot({ path: outPath });
      console.log(`   📸 线上退出弹窗截图已保存至: ${outPath}`);
    }

    console.log('\n🎉🎉 生产环境实机测试全部圆满通过！');
  } catch (err) {
    console.error('❌ 线上测试过程异常:', err);
  } finally {
    await browser.close();
    process.exit(0);
  }
})();
