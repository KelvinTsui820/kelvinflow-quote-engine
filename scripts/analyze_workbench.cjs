const fs = require('fs');

const reviewHtml = fs.readFileSync('public/review.html', 'utf-8');
const indexHtml = fs.readFileSync('public/index.html', 'utf-8');

console.log('=== REVIEW.HTML BUTTONS & ACTIONS ===');
const reviewLines = reviewHtml.split('\n');
reviewLines.forEach((line, idx) => {
  if (line.includes('button') || line.includes('@click') || line.includes('href=')) {
    if (line.includes('出单') || line.includes('PDF') || line.includes('草稿') || line.includes('确认') || line.includes('下载') || line.includes('复制') || line.includes('发送') || line.includes('email') || line.includes('mail')) {
      console.log(`[review.html L${idx + 1}]: ${line.trim().slice(0, 120)}`);
    }
  }
});

console.log('\n=== INDEX.HTML BUTTONS & ACTIONS ===');
const indexLines = indexHtml.split('\n');
indexLines.forEach((line, idx) => {
  if (line.includes('button') || line.includes('@click') || line.includes('href=')) {
    if (line.includes('出单') || line.includes('PDF') || line.includes('草稿') || line.includes('确认') || line.includes('下载') || line.includes('复制') || line.includes('发送') || line.includes('工作台') || line.includes('试用')) {
      console.log(`[index.html L${idx + 1}]: ${line.trim().slice(0, 120)}`);
    }
  }
});
