const https = require('https');
const fs = require('fs');
const vm = require('vm');

const getUrl = (url, cb) => {
  https.get(url, res => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      const nextUrl = res.headers.location.startsWith('http') ? res.headers.location : 'https://unpkg.com' + res.headers.location;
      return getUrl(nextUrl, cb);
    }
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => cb(data));
  }).on('error', err => {
    console.error('Download error:', err.message);
  });
};

getUrl('https://unpkg.com/vue@3/dist/vue.global.prod.js', vueCode => {
  console.log('Vue loaded, bytes:', vueCode.length);
  const window = {
    location: { href: 'http://localhost:3000/review/QT-20260904-888', search: '', origin: 'http://localhost:3000' },
    localStorage: { getItem: () => null, setItem: () => null },
    addEventListener: () => {}
  };
  const context = vm.createContext({ window, document: {}, console });
  vm.runInContext(vueCode, context);
  console.log('Vue available:', !!context.Vue);

  const html = fs.readFileSync('public/review.html', 'utf-8');
  const appStart = html.indexOf('<div id="app"');
  const lastScriptStart = html.lastIndexOf('<script>');
  const template = html.substring(appStart, lastScriptStart);
  const innerTemplate = template.replace(/^<div id="app"[^>]*>/, '').replace(/<\/div>\s*$/, '');

  try {
    const render = context.Vue.compile(innerTemplate);
    console.log('🎉 Template compilation SUCCESS!');
  } catch (err) {
    console.error('💥 Template compilation FAILED:', err.message);
    console.error(err);
  }
});
