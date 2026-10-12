import paramiko

host = "192.255.145.11"
port = 22
username = "root"
password = "tsuikelvin820"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, port=port, username=username, password=password, timeout=15)

script = """
import('./dist/services/tenant.service.js').then(async ({ TenantService }) => {
  const { ExcelAdapter } = await import('./dist/adapters/excel.adapter.js');
  const { PricingService } = await import('./dist/services/pricing.service.js');

  const tenantId = 'tenant_trial_tsuikelvin0804_gmail';
  const buf = TenantService.getActivePricingBuffer(tenantId);
  const parsed = ExcelAdapter.parse(buf.buffer);

  console.log('Parsed items in tenant buffer:', parsed.priceItems.length);
  const testItem = parsed.priceItems.find(p => p.rawSku === 'TEST-001');
  console.log('TEST-001 found in catalog?', testItem);

  const poData = {
    PONumber: 'PO-TEST-001',
    BuyerName: 'Acme Test',
    Items: [
      { SKU: 'TEST-001', Description: 'Test item 001', Quantity: 1000 }
    ]
  };

  const quote = PricingService.calculate(poData, parsed.priceItems, parsed.exchangeRates);
  console.log('Quoted items count:', quote.items.length);
  console.log('Quoted item 0:', quote.items[0]);
}).catch(console.error);
"""

stdin, stdout, stderr = ssh.exec_command(f"cd /var/www/quote_app && node --input-type=module -e \"{script}\"")
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print("ERR:", err)

ssh.close()
