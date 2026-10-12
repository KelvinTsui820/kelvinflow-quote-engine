import paramiko
import sys
import time

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

host = "192.255.145.11"
port = 22
username = "root"
password = "tsuikelvin820"

for attempt in range(3):
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        print(f"Connecting to {host}... (attempt {attempt + 1})")
        ssh.connect(host, port=port, username=username, password=password, timeout=15, banner_timeout=30)
        print("Connected!")
        
        cmds = [
            "ls -la /var/www/quote_app/data/tenants/",
            "ls -la /var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/ 2>&1",
            "ls -la /var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/pricing_sheets/ 2>&1",
            "ls -la /var/www/quote_app/data/active_pricing.xlsx 2>&1",
            "ls -la /var/www/quote_app/data/quotes/ 2>&1"
        ]
        
        for c in cmds:
            print(f"\n>>> {c}")
            stdin, stdout, stderr = ssh.exec_command(c)
            out = stdout.read().decode('utf-8', errors='replace')
            err = stderr.read().decode('utf-8', errors='replace')
            if out:
                print(out.strip())
            if err:
                print("ERR:", err.strip())
                
        ssh.close()
        break
    except Exception as e:
        print(f"Attempt {attempt + 1} failed: {e}")
        time.sleep(2)
