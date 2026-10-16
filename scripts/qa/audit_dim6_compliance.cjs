const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('AUDIT DIM-6: CODE QUALITY & COMPLIANCE');
console.log('====================================================\n');

const results = {
  forbiddenWords: {},
  typeScript: {},
  unitTests: {},
  summary: { pass: 0, fail: 0 }
};

// 1. Forbidden Words Scan (8 items)
const FORBIDDEN_WORDS = [
  '99.4%',
  '180,000+',
  '95%',
  '一键',
  '实时汇率',
  '中国银行',
  '自动获取',
  'Sinosure'
];

function scanFiles(dir, extensions, ignoreDirs = ['node_modules', '.git', 'dist', 'screenshots']) {
  let fileList = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoreDirs.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fileList = fileList.concat(scanFiles(fullPath, extensions, ignoreDirs));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const targetFiles = [
  'public/index.html',
  'public/review.html',
  ...scanFiles('src', ['.ts', '.js'])
];

console.log(`[COD-02] Scanning 8 forbidden words across ${targetFiles.length} key source/public files...`);

let totalViolations = 0;
const wordHits = {};

for (const word of FORBIDDEN_WORDS) {
  wordHits[word] = [];
}

for (const filePath of targetFiles) {
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, lineIdx) => {
    for (const word of FORBIDDEN_WORDS) {
      const reg = new RegExp(word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
      let match;
      while ((match = reg.exec(line)) !== null) {
        totalViolations++;
        wordHits[word].push({
          file: filePath,
          line: lineIdx + 1,
          preview: line.trim().slice(0, 100)
        });
      }
    }
  });
}

console.log(`Scan Results for Forbidden Words:`);
for (const [word, hits] of Object.entries(wordHits)) {
  console.log(`  - "${word}": ${hits.length} occurrences`);
  if (hits.length > 0 && hits.length <= 5) {
    hits.forEach(h => console.log(`      -> ${h.file}:${h.line} | ${h.preview}`));
  } else if (hits.length > 5) {
    hits.slice(0, 3).forEach(h => console.log(`      -> ${h.file}:${h.line} | ${h.preview}`));
    console.log(`      -> ... and ${hits.length - 3} more occurrences`);
  }
}

results.forbiddenWords = {
  totalViolations,
  details: wordHits,
  verdict: totalViolations === 0 ? 'PASS' : 'FAIL'
};
if (totalViolations === 0) results.summary.pass++; else results.summary.fail++;

// 2. TypeScript Check
console.log('\n[COD-03-A] Running TypeScript compilation check (tsc --noEmit)...');
try {
  const tscOut = execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  console.log('TypeScript Compilation: 0 errors!');
  results.typeScript = { verdict: 'PASS', errors: 0, output: tscOut.trim() };
  results.summary.pass++;
} catch (err) {
  console.error('TypeScript Compilation FAILED:', err.stdout || err.message);
  results.typeScript = { verdict: 'FAIL', errors: 1, output: err.stdout };
  results.summary.fail++;
}

// 3. Jest Unit Tests
console.log('\n[COD-03-B] Running Jest test suite (npm test)...');
try {
  const testOut = execSync('npm test', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 });
  const passedSuitesMatch = testOut.match(/Test Suites:\s*([^\n]+)/);
  const passedTestsMatch = testOut.match(/Tests:\s*([^\n]+)/);
  console.log('Jest Test Results:');
  console.log('  ' + (passedSuitesMatch ? passedSuitesMatch[0] : 'Suites summary not found'));
  console.log('  ' + (passedTestsMatch ? passedTestsMatch[0] : 'Tests summary not found'));
  results.unitTests = {
    verdict: 'PASS',
    suites: passedSuitesMatch ? passedSuitesMatch[1] : 'All passed',
    tests: passedTestsMatch ? passedTestsMatch[1] : 'All passed'
  };
  results.summary.pass++;
} catch (err) {
  console.error('Jest Tests FAILED:', err.stdout || err.message);
  results.unitTests = { verdict: 'FAIL', output: err.stdout };
  results.summary.fail++;
}

console.log('\n----------------------------------------------------');
console.log(`DIM-6 AUDIT COMPLETE: ${results.summary.pass} PASSED, ${results.summary.fail} FAILED`);
console.log('----------------------------------------------------');

const outputPath = 'C:\\Users\\tsuik\\.gemini\\antigravity\\brain\\dd190252-6867-43b6-8a91-8aa4a3e1f425\\dim6_audit_result.json';
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
console.log(`Saved detailed result to: ${outputPath}`);
