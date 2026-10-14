import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.255.145.11', 22, 'root', 'tsuikelvin820')
stdin, stdout, stderr = ssh.exec_command('find /var/www/quote_app/data -name "*QT-455325*"')
print('Found files on VPS:\n' + stdout.read().decode())
ssh.close()
