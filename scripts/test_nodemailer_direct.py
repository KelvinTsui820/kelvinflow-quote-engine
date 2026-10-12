import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.255.145.11', 22, 'root', 'tsuikelvin820')

remote_code = '''
const nodemailer = require('nodemailer');
const dns = require('dns').promises;

async function testDirectSend() {
  const targetEmail = '550578343@qq.com';
  const domain = targetEmail.split('@')[1];
  
  console.log('Resolving MX for domain:', domain);
  const mxRecords = await dns.resolveMx(domain);
  mxRecords.sort((a, b) => a.priority - b.priority);
  console.log('Found MX records:', mxRecords);

  const bestMx = mxRecords[0].exchange;
  console.log('Using best MX:', bestMx);

  const transporter = nodemailer.createTransport({
    host: bestMx,
    port: 25,
    secure: false,
    tls: {
      rejectUnauthorized: false
    },
    name: 'quote.kelvinflow.com'
  });

  const info = await transporter.sendMail({
    from: '"KelvinFlow 验证中心" <noreply@kelvinflow.com>',
    to: targetEmail,
    subject: '【KelvinFlow】Node.js 直投测试验证码: 729154',
    text: '您的测试验证码为: 729154，有效期 10 分钟。'
  });

  console.log('Message sent successfully:', info.messageId, info.response);
}

testDirectSend().catch(err => {
  console.error('Error sending direct mail:', err);
});
'''

sftp = ssh.open_sftp()
with sftp.file('/tmp/test_nodemailer_direct.js', 'w') as f:
    f.write(remote_code)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('cd /var/www/quote_app && node /tmp/test_nodemailer_direct.js')
print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))
ssh.close()
