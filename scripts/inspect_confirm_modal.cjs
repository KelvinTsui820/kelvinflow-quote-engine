const fs = require('fs');
const content = fs.readFileSync('public/review.html', 'utf-8').replace(/\r\n/g, '\n');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('showConfirmModal'));
console.log('Found showConfirmModal at line:', idx + 1);
for (let i = Math.max(0, idx - 2); i <= Math.min(lines.length - 1, idx + 50); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
