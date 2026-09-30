const fs = require('fs');

const reviewHtml = fs.readFileSync('public/review.html', 'utf8');
console.log('review.html length:', reviewHtml.length);

const appMatch = reviewHtml.match(/<div[^>]*id=["']app["'][^>]*>/);
console.log('App tag:', appMatch ? appMatch[0] : 'not found');

// Find closing div for app
// Check where referralModal is located
const refIndex = reviewHtml.indexOf('referralModal.show');
console.log('referralModal.show index:', refIndex);

// Check if referralModal is inside #app
const appIndex = reviewHtml.indexOf('id="app"');
console.log('id="app" index:', appIndex);

// Let's check the script in review.html
const scriptMatches = [...reviewHtml.matchAll(/<script[\s\S]*?<\/script>/gi)];
console.log('Script count:', scriptMatches.length);

// Extract the main Vue script
const mainScript = scriptMatches[scriptMatches.length - 1][0];
console.log('Main script length:', mainScript.length);

// Check if there are syntax errors in the main script
const scriptContent = mainScript.replace(/<\/?script[^>]*>/gi, '');
try {
  new Function(scriptContent);
  console.log('Vue script syntax is valid!');
} catch (err) {
  console.error('Vue script syntax ERROR:', err.message);
  console.error(err.stack);
}
