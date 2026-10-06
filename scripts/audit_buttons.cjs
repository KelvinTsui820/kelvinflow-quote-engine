const fs = require('fs');

const content = fs.readFileSync('public/review.html', 'utf8');
const regex = /<button[\s\S]*?<\/button>/gi;
let match;
const unlabelledList = [];

while ((match = regex.exec(content)) !== null) {
  const full = match[0];
  const text = full.replace(/<[^>]+>/g, '').trim();
  if (!text && !/aria-label=/i.test(full)) {
    const lineNo = content.substring(0, match.index).split('\n').length;
    const titleMatch = full.match(/title=["']([^"']+)["']/);
    const title = titleMatch ? titleMatch[1] : '';
    unlabelledList.push({ lineNo, title, full });
  }
}

console.log('Total unlabelled in review.html:', unlabelledList.length);
unlabelledList.forEach(item => {
  console.log(`Line ${item.lineNo}: title="${item.title}" -> ${item.full.substring(0, 70).replace(/\r?\n/g, ' ')}`);
});
