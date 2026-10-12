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

function searchDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const matches = [];
  for (const f of files) {
    try {
      const content = fs.readFileSync(path.join(dir, f), 'utf-8');
      if (content.includes('TEST-001') || content.includes('TEST Aluminum Test Bracket')) {
        const obj = JSON.parse(content);
        matches.push({
          file: path.join(dir, f),
          id: obj.quotationNumber,
          tenantId: obj.tenantId,
          createdAt: obj.date || obj.createdAt,
          totalAmount: obj.totalAmountForeign || obj.totalAmount,
          itemCount: obj.items?.length
        });
      }
    } catch {}
  }
  return matches;
}

const dir1 = '/var/www/quote_app/data/quotes';
const dir2 = '/var/www/quote_app/data/tenants/default/quotes';
const dir3 = '/var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/quotes';

console.log('=== Matches in /data/quotes ===', JSON.stringify(searchDir(dir1), null, 2));
console.log('=== Matches in /data/tenants/default/quotes ===', JSON.stringify(searchDir(dir2), null, 2));
console.log('=== Matches in tenant quotes ===', JSON.stringify(searchDir(dir3), null, 2));
"""

stdin, stdout, stderr = ssh.exec_command(f"node -e \"{script}\"")
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print("ERR:", err)

ssh.close()
