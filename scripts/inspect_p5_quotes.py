import paramiko

host = '192.255.145.11'
port = 22
username = 'root'
password = 'tsuikelvin820'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, port=port, username=username, password=password, timeout=15)

cmd1 = 'find /var/www/quote_app/data -name "*559124*" -o -name "*052398*"'
stdin, stdout, stderr = ssh.exec_command(cmd1)
print('=== Find result for 559124 and 052398 ===')
print(stdout.read().decode())

cmd2 = 'ls -la /var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/quotes/ 2>/dev/null; ls -la /var/www/quote_app/data/quotes/ 2>/dev/null'
stdin, stdout, stderr = ssh.exec_command(cmd2)
print('=== All quotes on server ===')
print(stdout.read().decode())

cmd3 = 'find /var/www/quote_app/data/tenants -name "*.json" | grep quotes'
stdin, stdout, stderr = ssh.exec_command(cmd3)
print('=== All tenant quote JSONs ===')
print(stdout.read().decode())

ssh.close()
