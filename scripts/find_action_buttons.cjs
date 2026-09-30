const fs = require('fs');

const reviewHtml = fs.readFileSync('public/review.html', 'utf-8');
const lines = reviewHtml.split('\n');

// Find lines with button tags and their surrounding context
lines.forEach((line, idx) => {
  if (line.includes('<button') && (line.includes('出单') || line.includes('PDF') || line.includes('草稿') || line.includes('发送') || line.includes('copy') || line.includes('download') || line.includes('send') || line.includes('核对') || line.includes('审核'))) {
    console.log(`--- Line ${idx + 1} ---`);
    for (let i = Math.max(0, idx - 2); i <= Math.min(lines.length - 1, idx + 4); i++) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
  }
});
