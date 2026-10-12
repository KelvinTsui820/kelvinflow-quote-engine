import paramiko
import os

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.255.145.11', username='root', password='tsuikelvin820')
sftp = ssh.open_sftp()

remote_dir = "/var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/quotes"
local_default_dir = "F:\\order_workflow\\data\\tenants\\default\\quotes"
local_quotes_dir = "F:\\order_workflow\\data\\quotes"

for fname in ["QT-388788.json", "QT-388788.pdf"]:
    r_path = f"{remote_dir}/{fname}"
    l_path1 = os.path.join(local_default_dir, fname)
    l_path2 = os.path.join(local_quotes_dir, fname)
    sftp.get(r_path, l_path1)
    sftp.get(r_path, l_path2)
    print(f"Downloaded {fname} to local")

# Also copy on remote to default/quotes and tenant_trial_tsuikelvin82099_gmail/quotes
commands = [
    "cp /var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/quotes/QT-388788.* /var/www/quote_app/data/tenants/default/quotes/",
    "cp /var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/quotes/QT-388788.* /var/www/quote_app/data/quotes/",
    "cp /var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/quotes/QT-388788.* /var/www/quote_app/data/tenants/tenant_trial_tsuikelvin82099_gmail/quotes/"
]
for cmd in commands:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(f"Executed: {cmd}")

sftp.close()
ssh.close()
print("Done!")
