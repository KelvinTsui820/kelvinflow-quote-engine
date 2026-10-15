/**
 * Step 4a Automated QA Runner for Testing AI & CI/CD
 * Usage: node scripts/run_step4a_qa.cjs
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

console.log('====================================================');
console.log('🤖 KelvinFlow Step 4a Automated QA Test Harness');
console.log('====================================================\n');

const results = {
  timestamp: new Date().toISOString(),
  totalSuites: 5,
  passedSuites: 0,
  failedSuites: 0,
  details: {}
};

function runTest(name, fn) {
  process.stdout.write(`[TEST] Running: ${name} ... `);
  try {
    const detail = fn();
    console.log('✅ PASSED');
    results.passedSuites++;
    results.details[name] = { status: 'PASSED', detail };
  } catch (err) {
    console.log('❌ FAILED: ' + err.message);
    results.failedSuites++;
    results.details[name] = { status: 'FAILED', error: err.message };
  }
}

// 1. Prohibited words check
runTest('Prohibited Words Zero-Tolerance Audit', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const words = ['99.4%', '180,000+', '95%', '一键', '实时汇率', '中国银行', '自动获取', 'Sinosure'];
  const violations = {};
  words.forEach(w => {
    const matches = (html.match(new RegExp(w.replace('+', '\\+'), 'g')) || []).length;
    if (matches > 0) violations[w] = matches;
  });
  if (Object.keys(violations).length > 0) {
    throw new Error('Prohibited words found: ' + JSON.stringify(violations));
  }
  return { wordsChecked: words.length, violations: 0 };
});

// 2. DOM Hooks & IDs check
runTest('DOM Hooks & Critical Elements Integrity', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const requiredIds = [
    'inbound-modal',
    'inbound-form',
    'inbound-login-form',
    'forgot-password-modal',
    'forgot-step1-form',
    'forgot-step2-form',
    'mobile-menu-btn',
    'nav-trial-btn',
    'nav-login-btn',
    'nav-workbench-btn',
    'inbound-subtab-reg',
    'inbound-subtab-login',
    'btn-send-code',
    'features',
    'workflow',
    'faq'
  ];
  const missing = requiredIds.filter(id => !html.includes(`id="${id}"`) && !html.includes(`id='${id}'`));
  if (missing.length > 0) {
    throw new Error('Missing required DOM IDs: ' + missing.join(', '));
  }
  return { requiredIdsCount: requiredIds.length, missingCount: 0 };
});

// 3. Static Assets check
runTest('Static Assets Physical Existence', () => {
  const assets = [
    'public/k_logo.svg',
    'public/favicon.ico',
    'public/favicon.svg',
    'public/apple-touch-icon.png',
    'public/site.webmanifest'
  ];
  const missing = assets.filter(a => !fs.existsSync(path.join(__dirname, '..', a)));
  if (missing.length > 0) {
    throw new Error('Missing assets: ' + missing.join(', '));
  }
  return { assetsChecked: assets.length, missing: 0 };
});

// 4. Inline Scripts Syntax check
runTest('Inline Scripts Syntax Sandbox Validation', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const scripts = html.match(/<script[\s\S]*?<\/script>/gi) || [];
  let evaluated = 0;
  scripts.forEach((s, idx) => {
    if (s.includes('src=')) return;
    const jsCode = s.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
    new Function(jsCode);
    evaluated++;
  });
  return { evaluatedScripts: evaluated };
});

// 5. TypeScript Compilation Check
runTest('TypeScript Static Typecheck (tsc --noEmit)', () => {
  const out = cp.execSync('npx tsc --noEmit', { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  return { tscOutput: out.trim() || 'Zero errors' };
});

console.log('\n====================================================');
console.log(`QA Result: ${results.passedSuites}/${results.totalSuites} passed, ${results.failedSuites} failed.`);
console.log('====================================================');

const reportPath = path.join(__dirname, '..', 'STEP_4A_QA_RESULT.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
console.log(`Saved QA report to: ${reportPath}`);

if (results.failedSuites > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
