const fs = require('fs');
const content = fs.readFileSync('public/review.html', 'utf-8');
const lines = content.split(/\r?\n/);
for (let i = 820; i <= 836; i++) {
  console.log(`L${i + 1}: ${JSON.stringify(lines[i])}`);
}
