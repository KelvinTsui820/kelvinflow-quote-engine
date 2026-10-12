import paramiko

host = "192.255.145.11"
port = 22
username = "root"
password = "tsuikelvin820"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, port=port, username=username, password=password, timeout=15)

script = """
import('./dist/services/auth.service.js').then(async ({ AuthService }) => {
  const { TenantService } = await import('./dist/services/tenant.service.js');
  const { ExcelAdapter } = await import('./dist/adapters/excel.adapter.js');

  const tenantId = 'tenant_trial_tsuikelvin0804_gmail';
  const token = AuthService.generateToken({
    userId: 'usr_test_kelvin',
    email: 'tsuikelvin0804@gmail.com',
    name: 'Kelvin',
    role: 'admin',
    tenantId: tenantId
  });

  console.log('Generated token for tenant:', tenantId);

  // Test 1: what does TenantService.getActivePricingBuffer return?
  const buf = TenantService.getActivePricingBuffer(tenantId);
  console.log('Buffer exists?', !!buf, 'Size:', buf ? buf.buffer.length : 0);
  if (buf) {
    const parsed = ExcelAdapter.parse(buf.buffer);
    console.log('Parsed items count from buffer:', parsed.priceItems.length);
    console.log('Parsed items SKUs:', parsed.priceItems.map(p => p.rawSku));
  }

  // Test 2: Make actual internal HTTP request to /api/v1/quotes/QT-20260904-888
  const http = await import('http');
  const req = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/quotes/QT-20260904-888',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('\\n=== GET /api/v1/quotes/QT-20260904-888 Response Status:', res.statusCode);
      const json = JSON.parse(d);
      console.log('Quote tenantId in response:', json.quotation?.tenantId);
      console.log('CatalogItems count in response:', json.catalogItems?.length);
      console.log('CatalogItems SKUs in response:', json.catalogItems?.map(x => x.sku));
    });
  });
  req.end();

  // Test 3: Make internal HTTP request to /api/v1/catalog
  const req2 = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/catalog',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('\\n=== GET /api/v1/catalog Response Status:', res.statusCode);
      const json = JSON.parse(d);
      console.log('CatalogItems count in /catalog:', json.catalogItems?.length);
      console.log('CatalogItems SKUs in /catalog:', json.catalogItems?.map(x => x.sku));
    });
  });
  req2.end();

}).catch(console.error);
"""

stdin, stdout, stderr = ssh.exec_command(f"cd /var/www/quote_app && node --input-type=module -e \"{script}\"")
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print("ERR:", err)

ssh.close()
