import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.255.145.11', 22, 'root', 'tsuikelvin820')

cmd = 'find /var/www/quote_app/data/ -name "QT-053649*"'
_in, _out, _err = ssh.exec_command(cmd)
files = _out.read().decode().strip().split('\n')
print("Found files:", files)

for f in files:
    if f.strip():
        print(f"Removing {f}...")
        ssh.exec_command(f"rm -f '{f}'")

print("Cleanup complete!")
ssh.close()
