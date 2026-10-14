import paramiko
import json

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.255.145.11', 22, 'root', 'tsuikelvin820')

print("1. Updating /var/www/quote_app/data/trials.json for tsuikelvin82099@gmail.com...")
stdin, stdout, stderr = ssh.exec_command('cat /var/www/quote_app/data/trials.json')
trials = json.loads(stdout.read().decode())

target_email = "tsuikelvin82099@gmail.com"
found = False
for t in trials:
    if t.get('email') == target_email:
        t['expiresAt'] = "2026-10-14T00:30:00.000Z"
        t['status'] = "expired"
        t['passwordHash'] = "bb4730323b411aedc2ae080941343a5381912b06d14313bf33ac82cb562aad2e" # Kelvin820
        found = True
        break

if not found:
    raise Exception(f"Account {target_email} not found in trials.json")

# Write back trials.json
sftp = ssh.open_sftp()
with sftp.file('/var/www/quote_app/data/trials.json', 'w') as f:
    f.write(json.dumps(trials, ensure_ascii=False, indent=2))
print("   trials.json updated successfully!")

print("2. Updating profile.json for tenant_trial_tsuikelvin82099_gmail...")
profile_path = '/var/www/quote_app/data/tenants/tenant_trial_tsuikelvin82099_gmail/profile.json'
with sftp.file(profile_path, 'r') as f:
    profile = json.loads(f.read().decode('utf-8'))

profile['expiresAt'] = "2026-10-14T00:30:00.000Z"
profile['status'] = "expired"
profile['plan'] = "trial"
profile['dataRetentionUntil'] = "2026-11-13T00:30:00.000Z"

with sftp.file(profile_path, 'w') as f:
    f.write(json.dumps(profile, ensure_ascii=False, indent=2))
print("   profile.json updated successfully!")

sftp.close()
ssh.close()
print("Done! Test account tsuikelvin82099@gmail.com is now in EXPIRED state.")
