const fs = require('fs');
const content = fs.readFileSync('design/stitch_kelvinflow_landing_page_design/code.html', 'utf8');
const regex = /id="([^"]+)"/g;
let m;
const ids = [];
while ((m = regex.exec(content)) !== null) {
  ids.push(m[1]);
}
console.log('Original design IDs:', ids);
