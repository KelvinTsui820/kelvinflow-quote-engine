const fs = require('fs');
const lines = fs.readFileSync('public/review.html', 'utf8').split('\n');

const start = lines.findIndex(l => l.includes('v-if="imapModal.show"'));
const nextModal = lines.findIndex(l => l.includes('v-if="showConfirmModal"'));

let o = 0, c = 0;
for (let i = start; i < nextModal; i++) {
  const line = lines[i];
  const mo = line.match(/<div(\s|>)/gi);
  const mc = line.match(/<\/div>/gi);
  if (mo) o += mo.length;
  if (mc) c += mc.length;
}
console.log('Total opens:', o, 'Total closes:', c, 'Difference:', o - c);
