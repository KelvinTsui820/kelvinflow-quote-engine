import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.255.145.11', 22, 'root', 'tsuikelvin820')

cmd = "echo '[]' > /var/www/quote_app/data/trials.json && echo '[]' > /var/www/quote_app/data/inbound_leads.json && rm -rf /var/www/quote_app/data/tenants/tenant_trial_*"
stdin, stdout, stderr = ssh.exec_command(cmd)
print("OUT:", stdout.read().decode('utf-8'))
print("ERR:", stderr.read().decode('utf-8'))
print("DATABASE_RESET_COMPLETE")
ssh.close()
