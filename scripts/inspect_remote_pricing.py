import paramiko

host = "192.255.145.11"
port = 22
username = "root"
password = "tsuikelvin820"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, port=port, username=username, password=password, timeout=15)

script = """
import('./dist/adapters/excel.adapter.js').then(({ ExcelAdapter }) => {
  const p = '/var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/active_pricing.xlsx';
  const parsed = ExcelAdapter.parse(p);
  console.log('Parsed success:', parsed.success);
  console.log('Total PriceItems count:', parsed.priceItems.length);
  console.log('Parsed sheets:', parsed.parsedSheets);
  console.log('All SKUs in file:');
  parsed.priceItems.forEach((x, i) => {
    console.log('  [' + (i+1) + '] SKU=' + x.rawSku + ', BasePrice=' + x.basePrice + ', MOQ=' + x.moq + ', Margin=' + x.profitMargin);
  });
}).catch(console.error);
"""

stdin, stdout, stderr = ssh.exec_command(f"cd /var/www/quote_app && node --input-type=module -e \"{script}\"")
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print("ERR:", err)

ssh.close()
