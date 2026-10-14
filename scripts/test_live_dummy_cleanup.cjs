const https = require('https');

function postJSON(urlStr, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const body = JSON.stringify(data);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let resData = '';
      res.on('data', c => resData += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: resData });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getJSON(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET'
    }, (res) => {
      let resData = '';
      res.on('data', c => resData += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: resData });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function testDummyCleanup() {
  console.log('--- TEST LIVE DUMMY QUOTE AUTO CLEANUP ---');
  const msgId = `<live-cleanup-test-${Date.now()}@test.com>`;

  // 1. Send inquiry that produces dummy placeholder quote (e.g. unrecognizable text)
  console.log('Step 1: Sending vague email with no recognizable SKUs...');
  const res1 = await postJSON('https://quote.kelvinflow.com/api/inbound/email', {
    from: 'buyer@test.com',
    to: 'quote@kelvinflow.com',
    subject: 'Inquiry without SKUs',
    text: 'Hello, please send us your catalog and price list.',
    messageId: msgId
  });

  console.log('Result 1:', res1.status, res1.data);
  const dummyQuoteNum = res1.data?.quotationNumber;
  if (!dummyQuoteNum) {
    console.log('No quote created for empty email, skipping cleanup test');
    return;
  }

  // Verify dummy quote exists
  const check1 = await getJSON(`https://quote.kelvinflow.com/api/v1/quotes/${dummyQuoteNum}`);
  console.log('Dummy quote exists?', check1.status, check1.data?.quotation?.items?.[0]?.sku);

  // 2. Now send valid inquiry with the SAME messageId
  console.log('Step 2: Sending valid inquiry with same Message-ID...');
  const res2 = await postJSON('https://quote.kelvinflow.com/api/inbound/email', {
    from: 'buyer@test.com',
    to: 'quote@kelvinflow.com',
    subject: 'Inquiry with valid items',
    text: 'TEST-005 - 500 pcs\nTEST-002 - 300 pcs\nThanks, Mark / Global Sourcing',
    messageId: msgId
  });
  console.log('Result 2:', res2.status, res2.data);
  const validQuoteNum = res2.data?.quotationNumber;

  // 3. Verify dummy quote has been cleaned up (should be 404)
  const checkDummy = await getJSON(`https://quote.kelvinflow.com/api/v1/quotes/${dummyQuoteNum}`);
  console.log('Dummy quote status after replacement (should be 404):', checkDummy.status);

  // 4. Verify valid quote exists
  const checkValid = await getJSON(`https://quote.kelvinflow.com/api/v1/quotes/${validQuoteNum}`);
  console.log('Valid quote status (should be 200):', checkValid.status, 'Items count:', checkValid.data?.quotation?.items?.length);
}

testDummyCleanup().catch(console.error);
