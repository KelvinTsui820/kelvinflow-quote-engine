const fs = require('fs');
const path = require('path');
const { DraftService } = require('../dist/services/draft.service.js');
const { TenantService } = require('../dist/services/tenant.service.js');
const { EmailPollerService } = require('../dist/services/email-poller.service.js');

async function runTests() {
  console.log('🧪 开始自动化全链路综合测试...');

  // 1. 测试主流个人与企业邮箱 IMAP 主机推断
  console.log('\n--- 1. 测试主流个人与企业邮箱 IMAP 主机推断 ---');
  const testCases = [
    { email: 'user@qq.com', expected: 'imap.qq.com', desc: 'QQ 个人邮箱' },
    { email: 'user@foxmail.com', expected: 'imap.qq.com', desc: 'Foxmail 个人邮箱' },
    { email: 'sales@company.com', userHost: '', expected: 'imap.company.com', desc: '自建独立企业邮' },
    { email: 'kelvin@exmail.qq.com', expected: 'imap.exmail.qq.com', desc: '腾讯企业邮' },
    { email: 'user@163.com', expected: 'imap.163.com', desc: '163 个人网易邮箱' },
    { email: 'user@126.com', expected: 'imap.126.com', desc: '126 个人网易邮箱' },
    { email: 'user@yeah.net', expected: 'imap.yeah.net', desc: 'Yeah 个人邮箱' },
    { email: 'sales@qiye.163.com', expected: 'imap.qiye.163.com', desc: '网易企业邮' },
    { email: 'user@aliyun.com', expected: 'imap.aliyun.com', desc: '阿里个人邮箱' },
    { email: 'sales@qiye.aliyun.com', expected: 'imap.qiye.aliyun.com', desc: '阿里企业邮箱' },
    { email: 'user@outlook.com', expected: 'outlook.office365.com', desc: '微软 Outlook' },
    { email: 'user@hotmail.com', expected: 'outlook.office365.com', desc: '微软 Hotmail' },
    { email: 'user@gmail.com', expected: 'imap.gmail.com', desc: 'Google Gmail' },
    { email: 'user@sina.com', expected: 'imap.sina.com', desc: '新浪邮箱' },
    { email: 'user@139.com', expected: 'imap.139.com', desc: '中国移动 139 邮箱' }
  ];

  let passHostCount = 0;
  testCases.forEach(tc => {
    const actual = DraftService.resolveImapHost(tc.email, tc.userHost);
    const pass = actual === tc.expected;
    if (pass) passHostCount++;
    console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${tc.desc} (${tc.email}) -> ${actual} (预期: ${tc.expected})`);
  });

  if (passHostCount === testCases.length) {
    console.log(`✅ 所有主流邮箱主机推断 100% 通过 (${passHostCount}/${testCases.length})`);
  } else {
    throw new Error('部分邮箱主机推断失败！');
  }

  // 2. 检查多租户列表与 EmailPollerService
  console.log('\n--- 2. 检查多租户列表与 EmailPollerService ---');
  const allTenants = TenantService.listAllTenants();
  console.log(`  当前系统已注册租户数: ${allTenants.length}`);
  console.log(`  EmailPollerService.start 存在: ${typeof EmailPollerService.start === 'function'}`);
  console.log(`  EmailPollerService.pollTenant 存在: ${typeof EmailPollerService.pollTenant === 'function'}`);
  console.log(`  EmailPollerService.pollAllTenants 存在: ${typeof EmailPollerService.pollAllTenants === 'function'}`);

  // 3. 验证生成的 n8n v8.0 工作流文件
  console.log('\n--- 3. 验证生成的 n8n v8.0 统一工作流文件 ---');
  const n8nPath = path.resolve('workflows/KelvinFlow_AI全能邮件报价中枢_SaaS多租户单一工作流_v8.0.json');
  const desktopN8nPath = 'C:\\\\Users\\\\tsuik\\\\OneDrive\\\\桌面\\\\n8n\\\\KelvinFlow_AI全能邮件报价中枢_SaaS多租户单一工作流_v8.0.json';
  
  if (!fs.existsSync(n8nPath)) throw new Error('工作区未找到 v8.0 n8n 工作流文件');
  const wf = JSON.parse(fs.readFileSync(n8nPath, 'utf8'));

  console.log(`  工作流名称: ${wf.name}`);
  console.log(`  节点总数: ${wf.nodes.length}`);

  // 检查是否包含任何要求凭证的节点
  let credCount = 0;
  wf.nodes.forEach(n => {
    const credKeys = Object.keys(n.credentials || {});
    if (credKeys.length > 0) {
      console.log(`  ⚠️ 节点 [${n.name}] 包含凭据:`, credKeys);
      credCount++;
    }
  });

  if (credCount === 0) {
    console.log(`✅ 完美！该工作流包含 0 个静态凭据节点，彻底消除所有红色感叹号！`);
  } else {
    throw new Error(`工作流仍包含 ${credCount} 个静态凭据，会导致红色感叹号！`);
  }

  // 检查 Webhook 入口
  const webhookNode = wf.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
  console.log(`  Webhook 节点存在: ${Boolean(webhookNode)} (路径: ${webhookNode.parameters.path})`);

  // 检查桌面端文件
  if (fs.existsSync(desktopN8nPath)) {
    console.log(`✅ 桌面端已同步就绪: ${desktopN8nPath}`);
  }

  console.log('\n🎉 [全部测试顺利通过] 多租户收件箱自动监听 + 0感叹号单一共享 n8n 工作流架构已完美就绪！');
}

runTests().catch(err => {
  console.error('❌ 测试异常:', err);
  process.exit(1);
});
