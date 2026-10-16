const http = require('http');
http.get('http://localhost:3000', res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTTP status:', res.statusCode);
    console.log('Length:', data.length);
    const idx = data.indexOf('id="features"');
    console.log('Index of id="features":', idx);
    if (idx !== -1) {
      console.log('Context:\n', data.slice(idx - 150, idx + 150));
    }
    const idx2 = data.indexOf('id="excel-template"');
    console.log('Index of id="excel-template":', idx2);
    if (idx2 !== -1) {
      console.log('Context:\n', data.slice(idx2 - 150, idx2 + 150));
    }
  });
});
