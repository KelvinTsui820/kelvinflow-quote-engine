const fs = require('fs');
const html = fs.readFileSync('public/review.html', 'utf-8');

const setupBody = html.substring(html.indexOf('setup() {'), html.lastIndexOf('return {'));
const defMatches = setupBody.match(/(?:const|let|var|function)\s+([a-zA-Z0-9_$]+)/g) || [];
const definedVars = new Set(defMatches.map(m => m.split(/\s+/)[1]));

const setupMatch = html.match(/return\s*\{([\s\S]*?)\};\s*\}\s*\}\)\.mount/);
const returnBlock = setupMatch[1];
const returnedVars = new Set(
  returnBlock.split(',').map(s => s.trim().split(':')[0].trim()).filter(Boolean)
);

const lastScriptStart = html.lastIndexOf('<script>');
const appStart = html.indexOf('<div id="app"');
const template = html.substring(appStart, lastScriptStart);

const definedNotReturned = [];
definedVars.forEach(v => {
  if (!returnedVars.has(v) && template.includes(v)) {
    definedNotReturned.push(v);
  }
});

console.log('Defined in setup, used in template, BUT NOT RETURNED:');
console.log(definedNotReturned);
