const fs = require('fs');
const lines = fs.readFileSync('public/review.html', 'utf8').split('\n');

const start = lines.findIndex(l => l.includes('v-if="imapModal.show"'));
const nextModal = lines.findIndex(l => l.includes('v-if="showConfirmModal"'));

let stack = [];
for (let i = start; i < nextModal; i++) {
  const line = lines[i];
  const regex = /<\/?div(\s+[^>]*)?>/g;
  let m;
  while ((m = regex.exec(line)) !== null) {
    if (m[0].startsWith('</')) {
      if (stack.length === 0) {
        console.log('Extra close at line', i + 1);
      } else {
        stack.pop();
      }
    } else if (!m[0].endsWith('/>')) {
      stack.push({ line: i + 1, text: line.trim() });
    }
  }
}

console.log('Unclosed divs inside imapModal chunk (count = ' + stack.length + '):');
stack.forEach(s => console.log('Line', s.line, ':', s.text));
