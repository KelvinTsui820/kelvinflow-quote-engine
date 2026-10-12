const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const postData = JSON.stringify(body);
    const req = https.request({
      hostname: u.hostname,
      port: 443,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function verifyRemaining() {
  console.log('=== 2. DEFECT-01: Quick Quote API inquiryText Compatibility ===');
  const qqRes = await post('https://quote.kelvinflow.com/api/inbound/quick-quote', {
    buyerEmail: 'live_test_verifier@apex-import.com',
    inquiryText: 'Please quote 2000 pcs ST-2026-A dual motor desk frame FOB Shenzhen USD'
  });
  console.log('Quick quote status (/api/inbound):', qqRes.status);
  console.log('Quick quote response:', qqRes.data.slice(0, 300));

  const qqRes2 = await post('https://quote.kelvinflow.com/api/v1/inbound/quick-quote', {
    buyerEmail: 'live_test_verifier@apex-import.com',
    inquiryText: 'Please quote 2000 pcs ST-2026-A dual motor desk frame FOB Shenzhen USD'
  });
  console.log('Quick quote status (/api/v1/inbound alias):', qqRes2.status);
  console.log('Quick quote alias response:', qqRes2.data.slice(0, 300));

  console.log('\n=== 3. DEFECT-10: Referral Info Graceful 200 Fallback ===');
  const refRes = await get('https://quote.kelvinflow.com/api/v1/auth/referral-info');
  console.log('Referral info status:', refRes.status);
  console.log('Referral response:', refRes.data);

  console.log('\n=== 4. DEFECT-08 & 09 & 15: KelvinFlow Landing Page Checks ===');
  const lpRes = await get('https://kelvinflow.com');
  console.log('Landing page status:', lpRes.status);
  console.log('Has 39/month pricing:', lpRes.data.includes('¥39') && lpRes.data.includes('首月'));
  console.log('Has #hero-live-timer:', lpRes.data.includes('hero-live-timer'));
  console.log('Has #hero-live-substatus:', lpRes.data.includes('hero-live-substatus'));
  console.log('Has <!--email_off-->:', lpRes.data.includes('<!--email_off-->'));

  console.log('\n=== 5. DEFECT-05, 12, 13, 14: Review SPA Checks ===');
  const revRes = await get('https://quote.kelvinflow.com/review/QT-20260904-888');
  console.log('Review SPA status:', revRes.status);
  console.log('Has token in return URL:', revRes.data.includes('&token='));
  console.log('Has table-desc-area responsive fix:', revRes.data.includes('max-height: 120px') || revRes.data.includes('table-desc-area'));
  console.log('Has mobile tour step hidden:', revRes.data.includes('min-[400px]:inline-flex'));
  console.log('Has rateTipVisible toggle:', revRes.data.includes('rateTipVisible'));
}

verifyRemaining().catch(console.error);
