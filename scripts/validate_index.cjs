const fs = require('fs');

const content = fs.readFileSync('public/index.html', 'utf8');

// Strip comments, scripts, styles
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

console.log('index.html mismatches:', mismatches, 'Remaining unclosed:', stack.length);

// Verify script syntax in index.html
const scripts = [...content.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
console.log('Inline scripts count in index.html:', scripts.length);
scripts.forEach((s, idx) => {
  try {
    new Function(s[1]);
  } catch (err) {
    console.error(`Script #${idx+1} syntax error:`, err.message);
  }
});
console.log('All inline scripts checked.');
