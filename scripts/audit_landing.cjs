const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

const checks = [
  ['Quotation Studio v2.4', html.includes('KelvinFlow Quotation Studio v2.4')],
  ['USD/CNY 7.2340 (手动设定)', html.includes('USD/CNY 7.2340 (手动设定)')],
  ['buyer@globalautomotive.de', html.includes('buyer@globalautomotive.de')],
  ['KF-209-PRO', html.includes('KF-209-PRO')],
  ['24.8% (达标)', html.includes('24.8% (达标)')],
  ['逐行精准拆解', html.includes('逐行精准拆解')],
  ['10秒极速生成', html.includes('10秒极速生成')],
  ['零授权零密码', html.includes('零授权零密码')],
  ['NO old quote.kelvinflow.com/inbox', !html.includes('quote.kelvinflow.com/inbox')],
  ['NO rfq-88492', !html.includes('rfq-88492')],
  ['NO overscroll-behavior:none', !html.includes('overscroll-behavior:none')],
  ['NO webkit-scrollbar display:none', !html.includes('::-webkit-scrollbar{display:none;}')],
  ['Agreement unchecked default', !html.includes('id="inbound-agreement-checkbox" checked')],
  ['Agreement checkbox exists', html.includes('id="inbound-agreement-checkbox"')],
  ['Remember device checked default', /<input[^>]*id="inbound-remember-device"[^>]*checked|<input[^>]*checked[^>]*id="inbound-remember-device"/.test(html)],
  ['NO agreement dead links', !html.includes('href="javascript:void(0)">《用户服务协议》')],
  ['Custom channel dropdown exists', html.includes('id="custom-channel-btn"') && html.includes('小红书') && html.includes('谷歌搜索')],
  ['Scroll reveal on 3 cards', html.includes('data-reveal-delay="0"') && html.includes('data-reveal-delay="100"') && html.includes('data-reveal-delay="200"')],
  ['Modal style display: none', html.includes('id="inbound-modal" style="display: none;"')]
];

let allPassed = true;
checks.forEach(([name, passed]) => {
  console.log((passed ? 'PASS: ' : 'FAIL: ') + name);
  if (!passed) allPassed = false;
});

const prohibitedWords = ['99.4%', '180,000+', '95%', '一键', '实时汇率', '中国银行', '自动获取', 'Sinosure'];
prohibitedWords.forEach(w => {
  const count = (html.split(w).length - 1);
  console.log('Prohibited word: "' + w + '" count = ' + count);
  if (count > 0) allPassed = false;
});

console.log('--- ALL CHECKS OVERALL: ' + (allPassed ? 'PASS' : 'FAIL') + ' ---');
process.exit(allPassed ? 0 : 1);
