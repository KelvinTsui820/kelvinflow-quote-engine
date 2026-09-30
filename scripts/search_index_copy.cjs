const fs = require('fs');

const indexHtml = fs.readFileSync('public/index.html', 'utf-8');
const lines = indexHtml.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('草稿') || line.includes('工作台') || line.includes('出单') || line.includes('试用') || line.includes('极客版') || line.includes('自动化')) {
    if (line.includes('<h') || line.includes('<p') || line.includes('<li') || line.includes('<strong>') || line.includes('class="text-')) {
      console.log(`L${idx + 1}: ${line.trim().slice(0, 120)}`);
    }
  }
});
