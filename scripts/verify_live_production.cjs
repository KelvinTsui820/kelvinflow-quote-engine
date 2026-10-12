const https = require('https');

https.get('https://quote.kelvinflow.com/review/QT-20260904-888', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Contains 个人极客版:', data.includes('个人极客版'));
    console.log('Contains 模式1 (should be false):', data.includes('模式1'));
    console.log('Contains accept png/jpg:', data.includes('accept=".png,.jpg,.jpeg"'));
    console.log('Contains setNoLogo:', data.includes('setNoLogo'));
    if (res.statusCode === 200 && data.includes('个人极客版') && !data.includes('模式1') && data.includes('setNoLogo')) {
      console.log('🎉 Production server verified 100% SUCCESS!');
    } else {
      console.error('❌ Verification failed on production!');
      process.exit(1);
    }
  });
}).on('error', (e) => {
  console.error('Error connecting to production:', e);
  process.exit(1);
});
