const fs = require('fs');

const content = fs.readFileSync('public/review.html', 'utf8');
const lines = content.split('\n');

// Find line where logoutModal.show is
const targetLineIndex = lines.findIndex(l => l.includes('v-if="logoutModal.show"'));
console.log('Target line index:', targetLineIndex + 1);

// Let's trace tags up to targetLineIndex
const tagRegex = /<\/?([a-zA-Z0-9-]+)(\s+[^>]*)?>/g;
let stack = [];
let match;

// We only process lines inside the template, from <div id="app" to targetLineIndex
const appLine = lines.findIndex(l => l.includes('id="app"'));
const snippet = lines.slice(appLine, targetLineIndex).join('\n');

const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

while ((match = tagRegex.exec(snippet)) !== null) {
  const fullTag = match[0];
  const tagName = match[1].toLowerCase();
  const isClosing = fullTag.startsWith('</');
  const isSelfClosing = fullTag.endsWith('/>') || voidTags.has(tagName);

  if (isClosing) {
    // pop stack until we find matching tag
    let idx = stack.length - 1;
    while (idx >= 0 && stack[idx].tagName !== tagName) {
      idx--;
    }
    if (idx >= 0) {
      stack.splice(idx, stack.length - idx);
    }
  } else if (!isSelfClosing) {
    stack.push({
      tagName,
      raw: fullTag.slice(0, 100),
      hasVIf: fullTag.includes('v-if'),
      vIf: fullTag.match(/v-if="([^"]+)"/)?.[1] || null
    });
  }
}

console.log('Parent stack of logoutModal:');
stack.forEach((item, i) => {
  console.log(`${'  '.repeat(i)}<${item.tagName}> ${item.vIf ? `[v-if="${item.vIf}"]` : ''} (${item.raw.replace(/\s+/g, ' ')})`);
});
