const fs = require('fs');
const lines = fs.readFileSync('public/review.html', 'utf8').split('\n');

const start = lines.findIndex(l => l.includes('v-if="imapModal.show"'));
const nextModal = lines.findIndex(l => l.includes('v-if="showConfirmModal"'));

let bal = 0;
for (let i = start; i < nextModal; i++) {
  const line = lines[i];
  const mo = (line.match(/<div(\s|>)/gi) || []).length;
  const mc = (line.match(/<\/div>/gi) || []).length;
  bal += (mo - mc);
  if (mo !== mc) {
    console.log(`Line ${i + 1} (bal: ${bal}): ${line.trim().slice(0, 70)}`);
  }
}
console.log('Final balance before showConfirmModal:', bal);
