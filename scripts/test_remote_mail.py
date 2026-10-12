import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.255.145.11', 22, 'root', 'tsuikelvin820')

remote_code = '''
import smtplib
from email.mime.text import MIMEText

msg = MIMEText("Test email from KelvinFlow verification server", "plain", "utf-8")
msg["Subject"] = "Test Verification"
msg["From"] = "noreply@kelvinflow.com"
msg["To"] = "550578343@qq.com"

try:
    s = smtplib.SMTP("mx1.qq.com", 25, timeout=10)
    s.set_debuglevel(1)
    s.ehlo("quote.kelvinflow.com")
    res = s.sendmail("noreply@kelvinflow.com", ["550578343@qq.com"], msg.as_string())
    print("SEND_RESULT:", res)
    s.quit()
    print("SUCCESS")
except Exception as e:
    print("FAILED:", str(e))
'''

sftp = ssh.open_sftp()
with sftp.file('/tmp/test_mail.py', 'w') as f:
    f.write(remote_code)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('python3 /tmp/test_mail.py')
print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))
ssh.close()
