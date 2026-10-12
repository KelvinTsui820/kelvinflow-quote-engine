import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.255.145.11', username='root', password='tsuikelvin820', timeout=10)

stdin, stdout, stderr = ssh.exec_command('grep "/api/inbound" /var/log/nginx/access.log | tail -n 30')
print('=== Nginx Inbound logs ===')
print(stdout.read().decode('utf-8', errors='ignore'))

stdin, stdout, stderr = ssh.exec_command('grep -i "email" /var/log/nginx/access.log | tail -n 30')
print('=== Nginx email logs ===')
print(stdout.read().decode('utf-8', errors='ignore'))

stdin, stdout, stderr = ssh.exec_command('pm2 logs quote-app --nostream --lines 100')
print('=== PM2 logs ===')
print(stdout.read().decode('utf-8', errors='ignore')[-3000:])

ssh.close()
