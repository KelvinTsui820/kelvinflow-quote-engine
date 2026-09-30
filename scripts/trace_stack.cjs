const fs = require('fs');
const content = fs.readFileSync('public/review.html', 'utf8');
const lines = content.split('\n');

const stack = [];
for (let i = 1998; i < 2270; i++) {
  const line = lines[i];
  const tagRegex = /<\/?([a-zA-Z0-9\-]+)(?:\s+[^>]*)?\/?>/g;
  let match;
  while ((match = tagRegex.exec(line)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    const isClosing = fullTag.startsWith('</');
    const isSelfClose = fullTag.endsWith('/>') || ['input', 'img', 'br', 'hr'].includes(tagName);
    if (isSelfClose) continue;
    if (isClosing) {
      if (stack.length > 0) {
        const top = stack.pop();
        // console.log(`Closed <${top.tagName}> (from line ${top.line}) with </${tagName}> at line ${i+1}`);
      }
    } else {
      stack.push({ tagName, line: i + 1, text: line.trim() });
    }
  }
  if (i >= 2250) {
    console.log(`At line ${i + 1}, open stack (${stack.length}):`, stack.map(s => `${s.tagName}@${s.line}`).join(' > '));
  }
}
