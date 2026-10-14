import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.255.145.11', 22, 'root', 'tsuikelvin820')
stdin, stdout, stderr = ssh.exec_command('grep -rn "Currency not specified" /var/www/quote_app/data/')
print(stdout.read().decode())
ssh.close()
