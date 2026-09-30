const fs = require('fs');

const content = fs.readFileSync('public/review.html', 'utf8');

// 1. Tag balance check
let clean = content.replace(/<!--[\s\S]*?-->/g, m => ' '.repeat(m.length));
clean = clean.replace(/<script[\s\S]*?<\/script>/gi, m => ' '.repeat(m.length));
clean = clean.replace(/<style[\s\S]*?<\/style>/gi, m => ' '.repeat(m.length));

const tagRegex = /<\/?([a-zA-Z0-9\-]+)(?:\s+[^>]*)?\/?>/g;
const selfClosing = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

const stack = [];
let match;
let mismatches = 0;

function getLine(idx) {
  return content.substring(0, idx).split('\n').length;
}

while ((match = tagRegex.exec(clean)) !== null) {
  const full = match[0];
  const name = match[1].toLowerCase();
  const isClosing = full.startsWith('</');
  const isSelf = full.endsWith('/>') || selfClosing.has(name);
  const lineNum = getLine(match.index);

  if (['svg', 'path', 'polygon', 'circle', 'rect', 'g', 'defs', 'clippath'].includes(name)) {
    if (name === 'svg' && isClosing) {
      while (stack.length && stack[stack.length - 1].name !== 'svg') stack.pop();
      if (stack.length) stack.pop();
    } else if (name === 'svg' && !isSelf) {
      stack.push({ name: 'svg', line: lineNum });
    }
    continue;
  }

  if (isSelf) continue;

  if (isClosing) {
    if (stack.length === 0) {
      console.log(`[L${lineNum}] EXTRA CLOSING TAG </${name}>`);
      mismatches++;
    } else {
      const top = stack.pop();
      if (top.name !== name) {
        console.log(`[L${lineNum}] MISMATCH </${name}> vs <${top.name}> at L${top.line}`);
        mismatches++;
      }
    }
  } else {
    stack.push({ name, line: lineNum });
  }
}

console.log('review.html tag mismatches:', mismatches, 'Remaining unclosed:', stack.length);

// 2. Check Vue script
const scripts = [...content.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
console.log('Inline scripts count in review.html:', scripts.length);
scripts.forEach((s, idx) => {
  try {
    new Function(s[1]);
    console.log(`Script #${idx+1} syntax OK.`);
  } catch (err) {
    console.error(`Script #${idx+1} syntax error:`, err.message);
  }
});

// 3. Check position of referralModal relative to #app
const appStart = content.indexOf('<div id="app"');
const appEnd = content.lastIndexOf('</div>\n\n  <script>');
const referralModalPos = content.indexOf('<!-- 同行专属推荐分享弹窗 (Referral Share Modal) -->');

console.log('referralModal inside #app?', referralModalPos > appStart && referralModalPos < appEnd);

// 4. Check defense-in-depth on referralModal
const modalDiv = content.substring(referralModalPos, referralModalPos + 500);
console.log('Has v-cloak?', modalDiv.includes('v-cloak'));
console.log('Has style="display: none;"?', modalDiv.includes('style="display: none;"'));
console.log('Has Module 3?', content.includes('微信/同行群一键分享文案'));
