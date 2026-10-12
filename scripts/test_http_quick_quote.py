import paramiko

host = "192.255.145.11"
port = 22
username = "root"
password = "tsuikelvin820"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, port=port, username=username, password=password, timeout=15)

sftp = ssh.open_sftp()
remote_script_path = '/tmp/test_http_quick_quote.mjs'

code = """
import { AuthService } from '/var/www/quote_app/dist/services/auth.service.js';
import http from 'http';

const tenantId = 'tenant_trial_tsuikelvin0804_gmail';
const token = AuthService.generateToken({
  userId: 'usr_test_kelvin',
  email: 'tsuikelvin0804@gmail.com',
  name: 'Kelvin',
  role: 'admin',
  tenantId: tenantId
});

const postData = JSON.stringify({
  inquiryText: 'Hi Kelvin, please quote TEST-002 qty 500 pcs, and TEST-003 qty 500 pcs FOB Shenzhen. Thanks!',
  buyerName: 'Global Test Buyer',
  currency: 'USD'
});

const req = http.request({
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/inbound/quick-quote',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': 'Bearer ' + token
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', async () => {
    console.log('HTTP Status:', res.statusCode);
    try {
      const data = JSON.parse(body);
      console.log('Quotation Number:', data.quotation?.quotationNumber);
      console.log('Tenant ID:', data.quotation?.tenantId);
      console.log('Items Count:', data.quotation?.items?.length);
      data.quotation?.items?.forEach(i => {
        console.log(`SKU: ${i.sku} | Base: ${i.basePriceRMB} | Margin: ${i.profitMargin} | Price: $${i.unitPriceForeign} | Qty: ${i.quantity} | Subtotal: $${i.subTotalForeign}`);
      });
      console.log('Total Amount:', data.quotation?.currency, data.quotation?.totalAmountForeign);
      // Clean up the created quotation so it doesn't leave test debris
      if (data.quotation?.quotationNumber) {
        const fs = await import('fs');
        const qId = data.quotation.quotationNumber;
        const p1 = `/var/www/quote_app/data/tenants/${tenantId}/quotes/${qId}.json`;
        const p2 = `/var/www/quote_app/data/quotes/${qId}.json`;
        if (fs.existsSync(p1)) fs.unlinkSync(p1);
        if (fs.existsSync(p2)) fs.unlinkSync(p2);
        console.log('Cleaned up transient verification quote:', qId);
      }
    } catch (e) {
      console.log('Response body:', body);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(postData);
req.end();
"""

with sftp.file(remote_script_path, 'w') as f:
    f.write(code)

stdin, stdout, stderr = ssh.exec_command(f"node {remote_script_path}")
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print("ERR:", err)

ssh.exec_command(f"rm -f {remote_script_path}")
sftp.close()
ssh.close()
