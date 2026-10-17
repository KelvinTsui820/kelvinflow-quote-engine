const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

const checks = [
  ['Hero Product Mockup Preview', html.includes('KelvinFlow Quotation Review Interface Preview')],
  ['Hero Headline 快速生成', html.includes('快速生成')],
  ['Metric Card 逐行解析', html.includes('逐行解析')],
  ['Metric Card 高效', html.includes('高效') && html.includes('出单交付省时省力')],
  ['Metric Card 零密码', html.includes('零密码')],
  ['NO overscroll-behavior:none', !html.includes('overscroll-behavior:none')],
  ['NO webkit-scrollbar display:none', !html.includes('::-webkit-scrollbar{display:none;}')],
  ['Agreement unchecked default', !html.includes('id="inbound-agreement-checkbox" checked') && !html.includes('checked="" id="inbound-agreement-checkbox"')],
  ['Agreement checkbox exists', html.includes('id="inbound-agreement-checkbox"')],
  ['Remember device unchecked default', !html.includes('id="inbound-remember-device" checked') && !html.includes('checked="" id="inbound-remember-device"')],
  ['NO agreement dead links', !html.includes('href="javascript:void(0)">《用户服务协议》') && !html.includes('javascript:void(0)')],
  ['Custom channel dropdown exists', html.includes('id="custom-channel-btn"') && html.includes('小红书') && html.includes('谷歌搜索')],
  ['Scroll reveal on 3 cards', html.includes('data-reveal-delay="0"') && html.includes('data-reveal-delay="100"') && html.includes('data-reveal-delay="200"')],
  ['Modal style display: none', html.includes('id="inbound-modal" style="display: none;"')],
  ['Header logo scaled (w-6 h-6)', html.includes('w-6 h-6 object-contain shrink-0')],
  ['Footer logo scaled (w-6 h-6)', html.includes('w-6 h-6 object-contain shrink-0')]
];

let allPassed = true;
checks.forEach(([name, passed]) => {
  console.log((passed ? 'PASS: ' : 'FAIL: ') + name);
  if (!passed) allPassed = false;
});

const prohibitedWords = ['99.4%', '180,000+', '95%', '一键', '实时汇率', '中国银行', '自动获取', 'Sinosure', '10 秒', '10秒'];
prohibitedWords.forEach(w => {
  const count = (html.split(w).length - 1);
  console.log('Prohibited word: "' + w + '" count = ' + count);
  if (count > 0) allPassed = false;
});

console.log('--- ALL CHECKS OVERALL: ' + (allPassed ? 'PASS' : 'FAIL') + ' ---');
process.exit(allPassed ? 0 : 1);
