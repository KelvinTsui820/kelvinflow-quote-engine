const fs = require('fs');

const html = fs.readFileSync('public/review.html', 'utf-8');

// The main app script is the last script
const lastScriptStart = html.lastIndexOf('<script>');
const appStart = html.indexOf('<div id="app"');
const template = html.substring(appStart, lastScriptStart);

// Get setup return
const setupMatch = html.match(/return\s*\{([\s\S]*?)\};\s*\}\s*\}\)\.mount/);
if (!setupMatch) {
  console.error('setup return not found');
  process.exit(1);
}
const returnBlock = setupMatch[1];
const returnedVars = new Set(
  returnBlock.split(',').map(s => s.trim().split(':')[0].trim()).filter(Boolean)
);

// Built-ins or template locals
const builtins = new Set([
  'true', 'false', 'null', 'undefined', 'item', 'index', 'idx', 'term', 'c', 'step',
  'Math', 'Number', 'String', 'Array', 'Object', 'Boolean', 'window', 'document',
  'quotation', 'terms', 'saving', 'formatNumber', 'formatModelName'
]);

// Find all template expressions
const exprRegex = /(?:v-if|v-else-if|v-show|:class|:value|v-model|@click|@input|@change)="([^"]+)"|\{\{([^}]+)\}\}/g;
let match;
const usedVars = new Set();

while ((match = exprRegex.exec(template)) !== null) {
  const expr = match[1] || match[2];
  const words = expr.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g) || [];
  for (const w of words) {
    if (!builtins.has(w) && !w.startsWith('fa') && !w.startsWith('text') && !w.startsWith('bg') && !w.startsWith('border')) {
      usedVars.add(w);
    }
  }
}

const missing = [];
for (const v of usedVars) {
  if (!returnedVars.has(v) && !builtins.has(v)) {
    missing.push(v);
  }
}

console.log('Template length:', template.length);
console.log('Total used variables in template:', usedVars.size);
console.log('Total returned variables:', returnedVars.size);
console.log('Missing from setup return:', missing);
