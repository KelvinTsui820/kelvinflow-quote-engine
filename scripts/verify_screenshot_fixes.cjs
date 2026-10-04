const fs = require('fs');
const html = fs.readFileSync('public/review.html', 'utf8');

let failed = false;

// Check 1: Top Navbar
if (html.includes("{{ tenantCompanyName || 'KelvinFlow' }}")) {
  console.error('FAIL: top navbar still contains tenantCompanyName binding');
  failed = true;
} else {
  console.log('PASS: top navbar does not contain dynamic tenant company name collision');
}

if (!html.includes('个人极客版')) {
  console.error('FAIL: top navbar missing 个人极客版 badge');
  failed = true;
} else {
  console.log('PASS: top navbar contains 个人极客版 badge');
}

// Check 2: IMAP Header badge
if (html.includes('模式1：待审就绪') || html.includes('模式1: 评审待发')) {
  console.error('FAIL: IMAP modal header still contains mode 1 badge');
  failed = true;
} else {
  console.log('PASS: IMAP modal header mode badge cleanly removed');
}

// Check 3: Logo input accept
if (html.includes('accept=".png,.jpg,.jpeg,.svg,.webp"')) {
  console.error('FAIL: logo input still accepts svg and webp');
  failed = true;
} else if (html.includes('accept=".png,.jpg,.jpeg"')) {
  console.log('PASS: logo input strictly accepts png/jpg/jpeg');
} else {
  console.error('FAIL: unexpected logo input accept');
  failed = true;
}

if (!html.includes('setNoLogo')) {
  console.error('FAIL: missing setNoLogo in review.html');
  failed = true;
} else {
  console.log('PASS: setNoLogo is present in review.html');
}

if (failed) {
  process.exit(1);
} else {
  console.log('All 3 screenshot fixes verified successfully!');
}
