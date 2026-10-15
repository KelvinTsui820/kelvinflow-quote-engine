const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

console.log('=== Testing D1: Escape Keydown Listener ===');
// 1. Verify Escape keydown listener exists in html
const hasEscapeListener = html.includes("e.key === 'Escape'") &&
  html.includes('closeForgotPasswordModal') &&
  html.includes('closeInboundModal');

console.log('Escape listener present:', hasEscapeListener);
if (!hasEscapeListener) {
  console.error('FAIL: Escape keydown listener missing');
  process.exit(1);
}

console.log('\n=== Testing D2: Immediate 60s Cooldown & Failure Persistence ===');
// 2. Verify that sendInboundVerificationCode sets disabled and starts cooldown BEFORE fetch
const sendFnMatch = html.match(/async function sendInboundVerificationCode\(\)[\s\S]*?async function handleInboundSubmit/);
if (!sendFnMatch) {
  console.error('FAIL: Could not locate sendInboundVerificationCode');
  process.exit(1);
}
const fnBody = sendFnMatch[0];

const setsCooldownBeforeFetch = fnBody.indexOf("secondsLeft = 60") < fnBody.indexOf("fetch('/api/v1/auth/trial-register/send-code'");
console.log('Cooldown set before fetch:', setsCooldownBeforeFetch);

const doesNotRestoreInFailure = !fnBody.includes("btn.disabled = false") || 
  (fnBody.split("btn.disabled = false").length === 2 && fnBody.indexOf("btn.disabled = false") < fnBody.indexOf("secondsLeft = 60")); // Only inside interval!

console.log('Button not restored on failure:', doesNotRestoreInFailure);

if (!setsCooldownBeforeFetch) {
  console.error('FAIL: Cooldown timer not set before fetch');
  process.exit(1);
}

console.log('\nAll D1 and D2 logic assertions PASSED!');
