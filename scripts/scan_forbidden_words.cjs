const fs = require('fs');
const path = require('path');

const FORBIDDEN_WORDS = [
  '99.4%',
  '一键',
  '一键出单',
  '实时汇率',
  '中国银行',
  '自动获取',
  'Sinosure',
  '180,000+',
  '10 秒'
];

// Directories to scan: src, public
const scanDirs = ['src', 'public'];
const rootDir = path.resolve(__dirname, '..');

const found = [];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  for (const word of FORBIDDEN_WORDS) {
    if (content.toLowerCase().includes(word.toLowerCase())) {
      // Find line number
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(word.toLowerCase())) {
          found.push({
            file: path.relative(rootDir, filePath),
            line: idx + 1,
            word,
            text: line.trim()
          });
        }
      });
    }
  }
}

function traverse(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
        traverse(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.ts', '.js', '.html', '.json', '.vue', '.css', '.md'].includes(ext)) {
        scanFile(fullPath);
      }
    }
  }
}

for (const dir of scanDirs) {
  const fullDir = path.join(rootDir, dir);
  if (fs.existsSync(fullDir)) {
    traverse(fullDir);
  }
}

console.log(`=== FORBIDDEN WORDS SCAN RESULT ===`);
console.log(`Forbidden words checked: ${FORBIDDEN_WORDS.join(', ')}`);
console.log(`Total occurrences found in src/ and public/: ${found.length}`);
if (found.length > 0) {
  found.forEach(item => {
    console.log(`- [${item.word}] ${item.file}:${item.line} -> ${item.text.slice(0, 80)}`);
  });
  process.exit(1);
} else {
  console.log('✅ ALL CLEAR! 0 occurrences of forbidden words found.');
  process.exit(0);
}
