const fs = require('fs');

const reviewHtml = fs.readFileSync('public/review.html', 'utf-8');
const lines = reviewHtml.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('isTrial') || line.includes('plan') || line.includes('trialStatus') || line.includes('trialModal') || line.includes('currentUser') || line.includes('tenantId')) {
    if (line.includes('const ') || line.includes('let ') || line.includes('ref(') || line.includes('computed(') || line.includes('fetch(') || line.includes('axios')) {
      console.log(`L${idx + 1}: ${line.trim().slice(0, 120)}`);
    }
  }
});
