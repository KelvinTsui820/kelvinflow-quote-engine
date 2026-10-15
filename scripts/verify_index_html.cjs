const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

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

console.log('=== Checking required DOM IDs ===');
let allIdsPresent = true;
requiredIds.forEach(id => {
  const exists = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
  console.log(`${id}: ${exists ? 'FOUND' : 'MISSING'}`);
  if (!exists) allIdsPresent = false;
});

// Check if logo is k_logo.svg
const hasLogo = html.includes('/k_logo.svg') || html.includes('k_logo.svg');
console.log('Logo check (/k_logo.svg):', hasLogo);

// Check if favicons are linked
const hasFavicon = html.includes('favicon.svg') && html.includes('favicon.ico');
console.log('Favicon check (favicon.svg / favicon.ico):', hasFavicon);

// Check script syntax: extract all <script>...</script>
const scripts = html.match(/<script[\s\S]*?<\/script>/gi) || [];
console.log('\n=== Total scripts found: ' + scripts.length + ' ===');
let allScriptsValid = true;
scripts.forEach((s, idx) => {
  if (s.includes('src=')) {
    console.log(`Script #${idx} is external: OK`);
    return;
  }
  const jsCode = s.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
  try {
    new Function(jsCode);
    console.log(`Script #${idx} syntax: OK`);
  } catch (err) {
    console.error(`Script #${idx} syntax ERROR:`, err.message);
    allScriptsValid = false;
  }
});

// Prohibited words
const words = ['99.4%', '180,000+', '95%', '一键', '实时汇率', '中国银行', '自动获取', 'Sinosure'];
console.log('\n=== Prohibited Words Audit on public/index.html ===');
let hasProhibited = false;
words.forEach(w => {
  const matches = (html.match(new RegExp(w.replace('+', '\\+'), 'g')) || []).length;
  console.log(`${w}: ${matches}`);
  if (matches > 0) hasProhibited = true;
});

console.log('\n=== Summary ===');
console.log('All IDs present:', allIdsPresent);
console.log('Logo valid:', hasLogo);
console.log('Favicon valid:', hasFavicon);
console.log('All inline scripts syntax valid:', allScriptsValid);
console.log('Prohibited words count zero:', !hasProhibited);

if (!allIdsPresent || !hasLogo || !hasFavicon || !allScriptsValid || hasProhibited) {
  process.exit(1);
}
console.log('\nAll checks PASSED!');
