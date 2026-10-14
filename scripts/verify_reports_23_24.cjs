const https = require('https');

function postJSON(urlStr, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(d) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: d });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function verifyReports23And24() {
  console.log('=== VERIFYING REPORT 24: PASSWORD ERROR COPY ===');
  // Send wrong password for an active account (e.g. tsuikelvin0804@gmail.com)
  const badLogin = await postJSON('https://quote.kelvinflow.com/api/v1/auth/login', {
    email: 'tsuikelvin0804@gmail.com',
    password: 'WrongPassword999'
  });
  console.log('Bad login response:', badLogin.data);
  const errText = badLogin.data?.error || '';
  console.log('Contains new text "可点击\"忘记密码？\"自助重置"?', errText.includes('可点击"忘记密码？"自助重置'));
  console.log('Contains old text "扫码添加创始人微信协助"?', errText.includes('扫码添加创始人微信协助'));

  console.log('\n=== VERIFYING REPORT 23: EXPIRED ACCOUNT (tsuikelvin82099@gmail.com) ===');
  const expLogin = await postJSON('https://quote.kelvinflow.com/api/v1/auth/login', {
    email: 'tsuikelvin82099@gmail.com',
    password: 'Kelvin820'
  });
  console.log('Expired login response:', expLogin.data);
  const msg = expLogin.data?.message || '';
  console.log('expired === true?', expLogin.data?.expired === true);
  console.log('code === TRIAL_EXPIRED?', expLogin.data?.code === 'TRIAL_EXPIRED');
  console.log('Formatted date YYYY年M月D日 HH:mm present?', /\d{4}年\d{1,2}月\d{1,2}日 \d{2}:\d{2}/.test(msg));
  console.log('Contains "少喝一杯星巴克"?', msg.includes('少喝一杯星巴克'));
  console.log('Contains "每月仍享有 10 笔免费出单额度"?', msg.includes('每月仍享有 10 笔免费出单额度'));
  console.log('Contains "底价库与历史单据已为您安全保留 30 天"?', msg.includes('底价库与历史单据已为您安全保留 30 天'));
}

verifyReports23And24().catch(console.error);
