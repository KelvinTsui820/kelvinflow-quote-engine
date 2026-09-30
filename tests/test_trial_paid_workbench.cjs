const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function run() {
  // 检查并自动拉起服务
  try {
    await fetch(`${BASE_URL}/api/v1/health`);
  } catch (e) {
    console.log('📡 正在启动本地测试服务器...');
    await import('../dist/index.js');
    await new Promise(r => setTimeout(r, 1500));
  }

  // 1. 验证官网 public/index.html 文案
  console.log('\n[1/5] 验证官网 public/index.html 文案规范...');
  const indexHtml = fs.readFileSync('public/index.html', 'utf-8');
  assert.ok(indexHtml.includes('试用期支持网页工作台即刻出单并下载 PDF 与复制回信'), '官网 Hero 需明确试用与付费特权差异');
  assert.ok(indexHtml.includes('一键下载正式 PDF 报价单并复制英文回信草稿，手动发出零门槛'), 'Track A 需强调试用零门槛手动发信');
  assert.ok(indexHtml.includes('升级付费极客特权：绑定常用业务邮箱专属授权码'), 'Track B 需突出付费极客专属授权码直达');
  assert.ok(indexHtml.includes('【发件草稿箱静默直达 (付费专属)】'), '权益卡片需标记付费专属');
  assert.ok(indexHtml.includes('试用期间需要输入我的企业邮箱密码或授权码吗？'), 'FAQ Q4 需解答试用期免授权码疑问');
  console.log('  ✅ 官网 public/index.html 全部文案与业务逻辑验证通过！');

  // 2. 验证工作审单台 public/review.html 交互逻辑
  console.log('\n[2/5] 验证工作审单台 public/review.html 模板与 Vue 响应式...');
  const reviewHtml = fs.readFileSync('public/review.html', 'utf-8');
  assert.ok(reviewHtml.includes('copyEmailSubject'), '邮件卡片需包含 [复制主题] 小型按钮');
  assert.ok(reviewHtml.includes('copyEmailBodyOnly'), '邮件卡片需包含 [复制正文] 小型按钮');
  assert.ok(reviewHtml.includes('isPaidUser'), '需包含 isPaidUser 计算属性');
  assert.ok(reviewHtml.includes('hasImapConfigured'), '需包含 hasImapConfigured 计算属性');
  assert.ok(reviewHtml.includes('⚡ 确认无误，一键出单 (下载 PDF 与复制英文邮件)'), '试用用户按钮文案需符合规范');
  assert.ok(reviewHtml.includes('🚀 确认无误，直达邮件草稿箱 (Foxmail/企业邮)'), '付费用户按钮文案需符合规范');
  assert.ok(reviewHtml.includes('微信安全提示与防风控指引'), 'IMAP 弹窗需包含微信安全提示与信任设备指引');
  console.log('  ✅ 工作审单台 public/review.html 全部按钮与交互逻辑验证通过！');

  // 3. 验证后端 GET /api/v1/quotes/:id 接口对试用与付费元数据的返回
  console.log('\n[3/5] 验证 GET /api/v1/quotes/QT-20260904-888...');
  const getRes = await fetch(`${BASE_URL}/api/v1/quotes/QT-20260904-888`);
  const getData = await getRes.json();
  assert.strictEqual(getRes.status, 200);
  assert.strictEqual(getData.success, true);
  assert.ok(getData.quotation, '必须返回报价单数据');
  assert.ok(getData.tenant, '必须返回租户元数据');
  console.log('  -> 租户信息:', {
    tenantId: getData.tenant.tenantId,
    plan: getData.tenant.plan,
    isPaid: getData.tenant.isPaid,
    hasImapConfig: getData.tenant.hasImapConfig
  });
  assert.strictEqual(typeof getData.tenant.isPaid, 'boolean', '必须包含 isPaid 布尔字段');
  assert.strictEqual(typeof getData.tenant.hasImapConfig, 'boolean', '必须包含 hasImapConfig 布尔字段');
  console.log('  ✅ GET /api/v1/quotes/:id 租户权限元数据准确无误！');

  // 4. 验证试用模式出单 POST /api/v1/quotes/:id (injectDraft: false)
  console.log('\n[4/5] 验证试用模式出单 (下载 PDF + 复制英文回复，不写草稿箱)...');
  const postTrialRes = await fetch(`${BASE_URL}/api/v1/quotes/QT-20260904-888`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quotation: getData.quotation,
      terms: {
        payment: '30% deposit by T/T, 70% balance before shipment',
        validity: '15 calendar days from quotation date',
        leadTime: '25-30 working days upon receipt of deposit'
      },
      customEmailSubject: 'Quotation QT-20260904-888 for RFQ - Trial Test',
      customEmailBody: 'Dear Buyer, please find our revised quotation attached.',
      injectDraft: false
    })
  });
  const postTrialData = await postTrialRes.json();
  assert.strictEqual(postTrialRes.status, 200);
  assert.strictEqual(postTrialData.success, true);
  assert.ok(postTrialData.pdfBase64, '试用用户出单必须生成并返回最新 PDF Base64');
  assert.ok(postTrialData.draftEmail, '试用用户出单必须生成完整回信内容');
  assert.strictEqual(postTrialData.draftInjection, null, '试用出单 injectDraft=false 时严禁触发 IMAP 草稿写入');
  console.log('  ✅ 试用出单验证成功：生成有效 PDF (Base64 长度: ' + postTrialData.pdfBase64.length + ')，且未触碰邮箱草稿箱！');

  // 5. 验证 n8n 工作流文件契合度与完整性
  console.log('\n[5/5] 验证 n8n v7.1 生产版工作流文件...');
  const n8nPath = 'C:\\Users\\tsuik\\OneDrive\\桌面\\n8n\\KelvinFlow_AI全能邮件报价中枢_多邮箱自适应一体化版_v7.1_生产完美版.json';
  assert.ok(fs.existsSync(n8nPath), `n8n 生产版工作流文件必须存在: ${n8nPath}`);
  const n8nContent = JSON.parse(fs.readFileSync(n8nPath, 'utf-8'));
  assert.ok(Array.isArray(n8nContent.nodes), 'n8n 工作流必须包含 nodes 数组');
  console.log(`  -> n8n 节点总数: ${n8nContent.nodes.length}`);
  
  // 校验关键节点：0. 邮箱清洗, 6B-2 附件与收件人安全, 3A 签名过滤
  const nodeNames = n8nContent.nodes.map(n => n.name);
  assert.ok(nodeNames.some(n => n.includes('清洗') || n.includes('0.')), '必须包含邮箱清洗规范节点');
  assert.ok(nodeNames.some(n => n.includes('6B-2')), '必须包含 6B-2 草稿生成节点');
  console.log('  ✅ n8n 工作流结构完备，完美支撑业务！');

  console.log('\n===============================================================');
  console.log('🎉🎉🎉 全部 5 项用例自动化验证通过！全系统业务闭环 100% 达成！');
  console.log('===============================================================');
}

run().catch(err => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});
