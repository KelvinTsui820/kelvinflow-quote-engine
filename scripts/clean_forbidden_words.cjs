const fs = require('fs');
const path = require('path');

const reviewHtmlPath = path.join(__dirname, '..', 'public', 'review.html');
let content = fs.readFileSync(reviewHtmlPath, 'utf8');

// Replacements in review.html
content = content.replace(/title="一键清空"/g, 'title="清空"');
content = content.replace(/aria-label="一键清空"/g, 'aria-label="清空"');
content = content.replace(/<!-- 一键清空按钮 -->/g, '<!-- 清空按钮 -->');
content = content.replace(/KelvinFlow 极简高雅输入框一键清空按钮/g, 'KelvinFlow 极简高雅输入框清空按钮');
content = content.replace(/可一键关闭/g, '可快速关闭');
content = content.replace(/一键存入/g, '存入');
content = content.replace(/点击一键秒切/g, '点击快速切换');
content = content.replace(/title="一键将今日银行/g, 'title="将今日银行');
content = content.replace(/<span>一键填入<\/span>/g, '<span>填入</span>');
content = content.replace(/<!-- 一键直达日常邮箱草稿箱/g, '<!-- 直达日常邮箱草稿箱');
content = content.replace(/⚡ 一键直达草稿箱/g, '⚡ 直达草稿箱');
content = content.replace(/一键套用/g, '快速套用');
content = content.replace(/一键复制微信号/g, '复制微信号');
content = content.replace(/<!-- 推荐关键词一键复制栏/g, '<!-- 推荐关键词快捷复制栏');
content = content.replace(/'一键复制关键词'/g, "'复制关键词'");
content = content.replace(/打开一键转发买家/g, '打开快速转发买家');
content = content.replace(/一键核算汇率港杂/g, '快速核算汇率港杂');
content = content.replace(/一键复制完整英文邮件内容/g, '复制完整英文邮件内容');
content = content.replace(/一键直发/g, '直接发送');
content = content.replace(/\/\/ 🌍 实时汇率引擎与安全垫诊断/g, '// 🌍 外汇参考牌价与安全垫诊断');
content = content.replace(/现汇买入参考牌价 \+ 一键填入/g, '现汇买入参考牌价 + 填入');

// Check if any "一键" or "实时汇率" remains
const words = ['99.4%', '180,000+', '95%', '一键', '实时汇率', '中国银行', '自动获取', 'Sinosure'];
words.forEach(w => {
  const count = (content.split(w).length - 1);
  if (count > 0) {
    console.log(`Still found "${w}": ${count} times`);
    // Find remaining lines
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      if (l.includes(w)) {
        console.log(`  Line ${idx + 1}: ${l.trim().slice(0, 80)}`);
      }
    });
  }
});

fs.writeFileSync(reviewHtmlPath, content, 'utf8');
console.log('review.html cleaned successfully.');
