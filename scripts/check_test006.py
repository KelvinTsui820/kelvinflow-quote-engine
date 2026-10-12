import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.255.145.11', 22, 'root', 'tsuikelvin820')

remote_script = """
const XLSX = require('/var/www/quote_app/node_modules/xlsx');
const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log('File:', filePath);
  try {
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    data.forEach((row, i) => {
      const rowStr = JSON.stringify(row);
      if (rowStr.includes('TEST')) {
        console.log(`  Row ${i + 1}:`, row[0], row[1], row[2]);
      }
    });
  } catch (err) {
    console.error('Error reading:', filePath, err.message);
  }
}

checkFile('/var/www/quote_app/data/active_pricing.xlsx');
checkFile('/var/www/quote_app/data/tenants/default/active_pricing.xlsx');
checkFile('/var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/active_pricing.xlsx');
checkFile('/var/www/quote_app/data/tenants/tenant_trial_kelvintsui0804_gmail/active_pricing.xlsx');
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/check_test_items.cjs', 'w') as f:
    f.write(remote_script)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('node /tmp/check_test_items.cjs')
print(stdout.read().decode())
print(stderr.read().decode())
ssh.close()
