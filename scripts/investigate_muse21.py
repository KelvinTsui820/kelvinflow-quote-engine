import sys
import paramiko
import json

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.255.145.11', username='root', password='tsuikelvin820', timeout=20)

remote_code = """
import json

with open('/var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/quotes/QT-450839.json') as f1:
    q1 = json.load(f1)
with open('/var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/quotes/QT-455325.json') as f2:
    q2 = json.load(f2)

all_keys = set(q1.keys()).union(set(q2.keys()))
for k in sorted(all_keys):
    if k == 'items':
        print(f'items: q1 has {len(q1.get(k, []))}, q2 has {len(q2.get(k, []))}')
    elif q1.get(k) != q2.get(k):
        print(f'Field [{k}]:')
        print(f'  q1: {q1.get(k)}')
        print(f'  q2: {q2.get(k)}')
"""

sftp = ssh.open_sftp()
with sftp.file('/tmp/diff_quotes.py', 'w') as f:
    f.write(remote_code)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('python3 /tmp/diff_quotes.py')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))
ssh.close()
