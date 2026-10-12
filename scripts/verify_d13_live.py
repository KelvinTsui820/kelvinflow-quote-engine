import paramiko

host = "192.255.145.11"
port = 22
username = "root"
password = "tsuikelvin820"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, port=port, username=username, password=password, timeout=15)

sftp = ssh.open_sftp()
remote_script_path = '/tmp/verify_d13.mjs'

code = """
import { ExcelAdapter } from '/var/www/quote_app/dist/adapters/excel.adapter.js';
import { PricingService } from '/var/www/quote_app/dist/services/pricing.service.js';

const pricingPath = '/var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/active_pricing.xlsx';
const parsed = ExcelAdapter.parse(pricingPath);

console.log('--- 租户底价表已加载商品数:', parsed.priceItems.length);
const item002 = parsed.priceItems.find(p => p.rawSku === 'TEST-002');
const item003 = parsed.priceItems.find(p => p.rawSku === 'TEST-003');
console.log('TEST-002 底价配置:', JSON.stringify(item002));
console.log('TEST-003 底价配置:', JSON.stringify(item003));

const poData = {
  PONumber: 'PO-D13-LIVE-VERIFY',
  BuyerName: 'QA Verifier',
  Currency: 'USD',
  Items: [
    { SKU: 'TEST-002', Description: '0% Margin Product', Quantity: 500 },
    { SKU: 'TEST-003', Description: 'Default Margin Product', Quantity: 500 }
  ]
};

const quote = PricingService.calculate(poData, parsed.priceItems, parsed.exchangeRates, {
  tenantId: 'tenant_trial_tsuikelvin0804_gmail',
  defaultProfitMargin: 0.20
});

console.log('--- 核价计算结果 ---');
quote.items.forEach(it => {
  console.log(`SKU: ${it.sku} | 毛利率: ${(it.profitMargin * 100).toFixed(1)}% | 单价: $${it.unitPriceForeign} | 小计: $${it.subTotalForeign}`);
});
console.log('总金额 Grand Total:', quote.currency, quote.totalAmountForeign);
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
