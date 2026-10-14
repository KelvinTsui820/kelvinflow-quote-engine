const https = require('https');

function postJSON(urlStr, data, headers = {}) {
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
        'Content-Length': Buffer.byteLength(body),
        ...headers
      }
    };
    const req = https.request(options, (res) => {
      let resData = '';
      res.on('data', (chunk) => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: resData });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getJSON(urlStr, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { ...headers }
    };
    const req = https.request(options, (res) => {
      let resData = '';
      res.on('data', (chunk) => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: resData });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runVerification() {
  console.log('🚀 === [LIVE PRODUCTION VERIFICATION: MUSE 19, 20, 21] === 🚀');

  // 1. Health check
  const health = await getJSON('https://quote.kelvinflow.com/api/v1/health');
  console.log('1. Health Check:', health.status, health.data?.service);

  // 2. Muse 19: Ultra-long 15-item inquiry
  console.log('\n2. Testing Muse 19: 15-Item Long Inquiry Extraction...');
  const msgId19 = `<muse19-live-${Date.now()}@acme.com>`;
  const items15Text = [
    'Subject: RFQ 15 Lots',
    'From: sarah@acme-global.com',
    '',
    'Dear KelvinFlow Team, please quote FOB Shenzhen for the following:',
    '1. TEST-005 - 500 pcs',
    '2. TEST-001 - 1000 pcs',
    '3. TEST-002 - 300 pcs',
    '4. TEST-003 - 800 pcs',
    '5. TEST-004 - 200 pcs',
    '6. TEST-005 - 600 pcs',
    '7. TEST-001 - 1200 pcs',
    '8. TEST-002 - 350 pcs',
    '9. TEST-003 - 750 pcs',
    '10. TEST-004 - 250 pcs',
    '11. TEST-005 - 700 pcs',
    '12. TEST-001 - 1500 pcs',
    '13. TEST-002 - 400 pcs',
    '14. TEST-003 - 900 pcs',
    '15. TEST-004 - 300 pcs',
    '',
    'Best regards,',
    'Sarah Jenkins',
    'Acme Global Procurement Ltd'
  ].join('\n');

  const res19 = await postJSON('https://quote.kelvinflow.com/api/inbound/email', {
    from: 'sarah@acme-global.com',
    to: 'quote@kelvinflow.com',
    subject: 'RFQ 15 Lots',
    text: items15Text,
    messageId: msgId19
  });
  console.log('Muse 19 Inbound Response:', res19.status, res19.data);
  const qNum19 = res19.data?.quotationNumber;
  if (qNum19) {
    const q19 = await getJSON(`https://quote.kelvinflow.com/api/quotes/${qNum19}`);
    console.log(`Muse 19 Quote ${qNum19} Items Count:`, q19.data?.items?.length);
    console.log(`Muse 19 Customer Name:`, q19.data?.customerName, '| Buyer:', q19.data?.buyerName);
  }

  // 3. Muse 20: Spanish RFQ
  console.log('\n3. Testing Muse 20: Spanish RFQ Parsing...');
  const msgId20 = `<muse20-live-${Date.now()}@importadora.com>`;
  const spanishText = [
    'From: "Carlos Méndez" <carlos@importadora.com>',
    'Subject: Solicitud de cotización - Juntas de goma',
    '',
    'Estimados señores,',
    'Por favor, envíennos su mejor cotización FOB para los siguientes productos:',
    '',
    '- TEST-005 - 500 piezas',
    '- TEST-002 - 800 piezas',
    '',
    'Saludos cordiales,',
    'Carlos Méndez / Importadora Andina'
  ].join('\n');

  const res20 = await postJSON('https://quote.kelvinflow.com/api/inbound/email', {
    from: 'carlos@importadora.com',
    to: 'quote@kelvinflow.com',
    subject: 'Solicitud de cotización - Juntas de goma',
    text: spanishText,
    messageId: msgId20
  });
  console.log('Muse 20 Inbound Response:', res20.status, res20.data);
  const qNum20 = res20.data?.quotationNumber;
  if (qNum20) {
    const q20 = await getJSON(`https://quote.kelvinflow.com/api/quotes/${qNum20}`);
    console.log(`Muse 20 Quote ${qNum20} Customer:`, q20.data?.customerName, '| Buyer:', q20.data?.buyerName);
    console.log(`Muse 20 Items:`, q20.data?.items?.map(i => ({ sku: i.sku, qty: i.quantity, price: i.unitPriceForeign })));
  }

  // 4. Muse 21: Idempotency / Duplicate Webhook within 5 seconds
  console.log('\n4. Testing Muse 21: Duplicate Inbound Post Deduplication...');
  const msgId21 = `<muse21-dup-test-${Date.now()}@acme.com>`;
  const payload21 = {
    from: 'buyer21@acme.com',
    to: 'quote@kelvinflow.com',
    subject: 'Urgent Idempotency Test',
    text: 'Please quote TEST-001 - 500 pcs FOB. Thanks, John / Acme Test',
    messageId: msgId21
  };

  console.log('Sending first POST...');
  const res21_1 = await postJSON('https://quote.kelvinflow.com/api/inbound/email', payload21);
  console.log('POST 1 Result:', res21_1.status, res21_1.data);

  console.log('Sending second POST (duplicate) immediately...');
  const res21_2 = await postJSON('https://quote.kelvinflow.com/api/inbound/email', payload21);
  console.log('POST 2 Result (should be duplicated: true and same quotationNumber):', res21_2.status, res21_2.data);

  console.log('\n🏁 Live Verification Finished!');
}

runVerification().catch(console.error);
