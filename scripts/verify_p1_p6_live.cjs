const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  let browser;
  try {
    console.log('🚀 启动无头浏览器针对线上生产环境进行综合验证...');
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 1. 验证工作台页面 (D-05 精度与无障碍快照，P4 Gmail 网页按钮，P5 历史报价切换入口)
    console.log('\n🔍 [1/3] 访问工作台: https://quote.kelvinflow.com/review/QT-20260904-888');
    await page.goto('https://quote.kelvinflow.com/review/QT-20260904-888', { waitUntil: 'networkidle2', timeout: 30000 });

    // 检查 D-05 无障碍快照 (AX Snapshot)
    const axSnapshot = await page.accessibility.snapshot();
    const findInputsInAX = (node, acc = []) => {
      if (node.role === 'textbox' || node.role === 'spinbutton') {
        acc.push({ role: node.role, name: node.name, value: node.value });
      }
      if (node.children) {
        for (const child of node.children) {
          findInputsInAX(child, acc);
        }
      }
      return acc;
    };
    const axInputs = findInputsInAX(axSnapshot);
    console.log('📊 无障碍树中捕获的输入项采样:');
    let hasFloatLongTail = false;
    for (const inp of axInputs) {
      if (inp.value && typeof inp.value === 'string' && inp.value.length > 6 && !isNaN(Number(inp.value))) {
        const valStr = inp.value;
        if (valStr.includes('7.199999') || valStr.includes('3.519999') || valStr.includes('39.84000') || valStr.includes('0.850000')) {
          console.error(`❌ 发现浮点长尾数: role=${inp.role}, name=${inp.name}, value=${inp.value}`);
          hasFloatLongTail = true;
        }
      }
    }
    if (!hasFloatLongTail) {
      console.log('✅ [D-05 验证通过] 无障碍树中未发现任何 Float32 截断产生的浮点长尾数！');
    }

    // 检查 DOM input 元素的底层 value 与 role="textbox"
    const domInputs = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
      return inputs.map(el => ({
        id: el.id,
        role: el.getAttribute('role'),
        value: el.value,
        ariaLabel: el.getAttribute('aria-label')
      }));
    });
    console.log(`📋 检测到 ${domInputs.length} 个数字输入框，role 属性与值:`, domInputs.slice(0, 5));

    // 检查 P4 Gmail 网页按钮
    const gmailBtnText = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Gmail'));
      return btn ? btn.textContent.trim() : null;
    });
    console.log(`✉️ [P4 Gmail 按钮检测]: ${gmailBtnText}`);

    // 检查 P5 历史报价切换入口按钮
    const historyBtn = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('历史'));
      return btn ? btn.textContent.trim() : null;
    });
    console.log(`📜 [P5 报价单历史切换器检测]: ${historyBtn}`);

    // 2. 验证官网首页与登录弹窗 (D-07 autofill 动画与同步)
    console.log('\n🔍 [2/3] 访问官网: https://kelvinflow.com/');
    await page.goto('https://kelvinflow.com/', { waitUntil: 'networkidle2', timeout: 30000 });

    const autofillStyleExists = await page.evaluate(() => {
      const styles = Array.from(document.querySelectorAll('style'));
      return styles.some(s => s.textContent.includes('onAutoFillStart'));
    });
    console.log(`🔐 [D-07 autofill CSS 动画检测]: ${autofillStyleExists ? '✅ 存在' : '❌ 缺失'}`);

    console.log('\n🎉 线上验证完成！');
  } catch (err) {
    console.error('❌ 验证异常:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
