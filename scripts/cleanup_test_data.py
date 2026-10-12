import paramiko

host = "192.255.145.11"
port = 22
username = "root"
password = "tsuikelvin820"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, port=port, username=username, password=password, timeout=15)

script = """
const fs = require('fs');
const path = require('path');

const targets = [
  // 1. default 租户脏草稿
  '/var/www/quote_app/data/tenants/default/quotes/QT-633808.json',
  '/var/www/quote_app/data/tenants/default/quotes/QT-633808.pdf',
  '/var/www/quote_app/data/tenants/default/quotes/QT-689407.json',
  '/var/www/quote_app/data/tenants/default/quotes/QT-689407.pdf',
  '/var/www/quote_app/data/quotes/QT-633808.json',
  '/var/www/quote_app/data/quotes/QT-633808.pdf',
  '/var/www/quote_app/data/quotes/QT-689407.json',
  '/var/www/quote_app/data/quotes/QT-689407.pdf',

  // 2. 当前租户回归测试生成
  '/var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/quotes/QT-052398.json',
  '/var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/quotes/QT-052398.pdf',
  '/var/www/quote_app/data/quotes/QT-052398.json',
  '/var/www/quote_app/data/quotes/QT-052398.pdf',

  // 3. Sample PO 样本单
  '/var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/quotes/QT-PO-2026-EU-9812.json',
  '/var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/quotes/QT-PO-2026-EU-9812.pdf',
  '/var/www/quote_app/data/quotes/QT-PO-2026-EU-9812.json',
  '/var/www/quote_app/data/quotes/QT-PO-2026-EU-9812.pdf'
];

console.log('--- 检查目标文件状态并执行清理 ---');
const report = [];
for (const p of targets) {
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
      report.push({ file: p, status: 'DELETED' });
    } catch (e) {
      report.push({ file: p, status: 'ERROR', error: e.message });
    }
  } else {
    report.push({ file: p, status: 'NOT_FOUND_ALREADY_CLEAN' });
  }
}
console.log(JSON.stringify(report, null, 2));

// 验证租户底价库中 TEST-001 ~ TEST-004 是否完好保留
const tenantDbPath = '/var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/pricing_table.json';
if (fs.existsSync(tenantDbPath)) {
  const content = JSON.parse(fs.readFileSync(tenantDbPath, 'utf-8'));
  const testItems = (content.priceItems || []).filter(item => item.rawSku && item.rawSku.startsWith('TEST-'));
  console.log('--- 租户底价库 TEST-001~004 保留状态 ---');
  console.log(`已确认保留 ${testItems.length} 个 TEST 条目:`);
  testItems.forEach(t => console.log(`  SKU: ${t.rawSku}, Base: ${t.basePrice}, Margin: ${t.profitMargin}`));
} else {
  console.log('未找到 tenant pricing_table.json 文件');
}
"""

stdin, stdout, stderr = ssh.exec_command(f"node -e \"{script}\"")
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print("ERR:", err)

ssh.close()
