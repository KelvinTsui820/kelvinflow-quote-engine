import fs from 'fs';
import path from 'path';
import { TrialService } from '../src/services/trial.service.js';
import { AuthService } from '../src/services/auth.service.js';
import { TenantService } from '../src/services/tenant.service.js';
import { QuoteStoreService } from '../src/services/quote-store.service.js';

async function runAudit() {
  console.log('========================================================================');
  console.log('🔍 KelvinFlow 官网、工作台与 n8n 工作流全链路业务逻辑与接口对齐专项测试');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;
  const issues: string[] = [];

  function check(name: string, condition: boolean, failReason?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${name}`);
    } else {
      console.error(`  ❌ [FAIL] ${name} -> ${failReason || '不符合预期'}`);
      issues.push(`${name}: ${failReason || '不符合预期'}`);
    }
  }

  // =========================================================================
  // 维度 1: 官网 (index.html & trial.service.ts)
  // =========================================================================
  console.log('--- 维度 1: 官网核心业务逻辑与体验审计 ---');
  const indexHtmlPath = path.resolve(process.cwd(), 'public', 'index.html');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

  // 1.1 官网密码策略与提示 (MVP 降摩擦与机密保护)
  check(
    '官网表单密码输入框要求至少 6 位',
    indexHtml.includes('minlength="6"') || indexHtml.includes('至少 6 位') || indexHtml.includes('至少6位'),
    '未设置 minlength="6" 或未提示 6 位'
  );
  check(
    '官网支持 6 位验证码免密直通或密码保护',
    indexHtml.includes('验证码') || indexHtml.includes('code'),
    '缺少验证码安全提示'
  );

  // 1.2 官网定价与支付专精通道 (首月特惠 ¥39，年付特惠 ¥890)
  check(
    '官网定价方案保持首月特惠 ¥39 与 ¥890/年',
    indexHtml.includes('39') && indexHtml.includes('890'),
    '定价与产品承诺不符'
  );
  check(
    '官网支付模态框专注于【微信直接转账】以沉淀高价值私域',
    indexHtml.includes('微信') && indexHtml.includes('contact_wechat.png') && indexHtml.includes('payment-note-text'),
    '未提供专注的微信转账流程'
  );
  check(
    '官网支持微信收款转账备注一键复制与微信号复制 (kt_data)',
    indexHtml.includes('copyPaymentNote') && indexHtml.includes('kt_data'),
    '缺少转账备注或微信号快捷复制'
  );

  // 1.3 官网渠道归因必填
  check(
    '官网留资表单包含获客渠道归因 (小红书/同行推荐等)',
    indexHtml.includes('channelSource') && indexHtml.includes('小红书'),
    '缺少渠道归因字段'
  );

  // =========================================================================
  // 维度 2: 工作台 (review.html & quote.router.ts)
  // =========================================================================
  console.log('\n--- 维度 2: 审单工作台逻辑与安全审计 ---');
  const reviewHtmlPath = path.resolve(process.cwd(), 'public', 'review.html');
  const reviewHtml = fs.readFileSync(reviewHtmlPath, 'utf-8');

  check(
    '工作台登录/开通模态框具备密码与验证码安全规则',
    (reviewHtml.includes('minlength="6"') || reviewHtml.includes('至少 6 位') || reviewHtml.includes('验证码')),
    '工作台密码校验规则与官网未对齐'
  );
  check(
    '工作台具备底价机密脱敏保护机制 (costMasked / 脱敏查看)',
    reviewHtml.includes('costMasked') || reviewHtml.includes('商业底价'),
    '工作台未实现商业底价脱敏机制'
  );
  check(
    '工作台支持实时调整毛利率并自动反算单价与总价',
    reviewHtml.includes('onMarginChange') && reviewHtml.includes('profitMargin'),
    '工作台缺少利润率滑块实时反算联动'
  );
  check(
    '工作台支持一键在线预览 PDF (实时重算对齐)',
    reviewHtml.includes('openPdfPreview') && reviewHtml.includes('/pdf'),
    '缺少 PDF 实时预览渲染能力'
  );
  check(
    '工作台支持多邮箱发信联动 (Foxmail/Outlook mailto协议、QQ、163、Gmail、纯复制)',
    reviewHtml.includes('executeCopyAndSendEmail') && reviewHtml.includes('mailto:'),
    '工作台未提供全场景邮件客户端联动'
  );

  // =========================================================================
  // 维度 3: n8n 自动化工作流契约对齐 (AI外貿報價助手.json)
  // =========================================================================
  console.log('\n--- 维度 3: n8n 自动化工作流与后端接口契约审计 ---');
  const n8nWorkflowPath = path.resolve('C:\\Users\\tsuik\\OneDrive\\桌面\\n8n\\AI外貿報價助手.json');
  let n8nWorkflow: any = null;
  if (fs.existsSync(n8nWorkflowPath)) {
    n8nWorkflow = JSON.parse(fs.readFileSync(n8nWorkflowPath, 'utf-8'));
  } else {
    const localWf = path.resolve(process.cwd(), 'kelvinflow_quotation_workflow.json');
    n8nWorkflow = JSON.parse(fs.readFileSync(localWf, 'utf-8'));
  }

  const nodes = n8nWorkflow.nodes || [];
  const node3A = nodes.find((n: any) => n.name?.includes('3A') || n.name?.includes('更新底價'));
  const node3B = nodes.find((n: any) => n.name?.includes('3B') || n.name?.includes('報價計算'));
  const node4B = nodes.find((n: any) => n.name?.includes('4B') || n.name?.includes('轉化 PDF'));
  const node5B = nodes.find((n: any) => n.name?.includes('5B') || n.name?.includes('自動生成報價郵件草稿'));

  check('n8n 工作流包含 3A 底价更新节点', !!node3A, '缺少 3A 节点');
  check('n8n 工作流包含 3B 询盘报价计算节点', !!node3B, '缺少 3B 节点');
  check('n8n 工作流包含 4B PDF 二进制转换节点', !!node4B, '缺少 4B 节点');
  check('n8n 工作流包含 5B Gmail 草稿自动写入节点', !!node5B, '缺少 5B 节点');

  // 3.1 字段契约检查
  if (node3A) {
    const bodyParams = node3A.parameters?.bodyParameters?.parameters || [];
    const hasFile = bodyParams.some((p: any) => p.name === 'pricing_file');
    const hasSender = bodyParams.some((p: any) => p.name === 'sender_email');
    check('3A 节点正确传递 pricing_file 二进制与 sender_email', hasFile && hasSender, '3A 缺少参数');
  }

  if (node3B) {
    const bodyParams = node3B.parameters?.bodyParameters?.parameters || [];
    const hasPoFile = bodyParams.some((p: any) => p.name === 'po_file');
    const hasPoText = bodyParams.some((p: any) => p.name === 'po_text');
    const hasSalesRep = bodyParams.some((p: any) => p.name === 'sales_rep_email');
    check('3B 节点正确传递 po_file、po_text 与 sales_rep_email', hasPoFile && hasPoText && hasSalesRep, '3B 缺少参数');
  }

  // 3.2 节点 4B 契约匹配后端 POST /api/v1/process-quote 返回结构
  if (node4B) {
    const code = node4B.parameters?.jsCode || '';
    const extractsPdf = code.includes('item.pdfBase64');
    const extractsReviewUrl = code.includes('item.reviewUrl');
    const extractsDraft = code.includes('item.draftEmail');
    check('4B 节点能够精准解构后端返回的 pdfBase64, reviewUrl 与 draftEmail', extractsPdf && extractsReviewUrl && extractsDraft, '4B 字段与后端不匹配');
  }

  // 3.3 节点 5B 草稿参数匹配
  if (node5B) {
    const p = node5B.parameters || {};
    const subjectMatches = p.subject?.includes('draftEmail.subject');
    const messageMatches = p.message?.includes('draftEmail.body');
    const attachmentBinary = p.options?.attachmentsUi?.attachmentsBinary?.[0]?.property === 'data';
    check('5B 节点将生成的 PDF 作为附件、使用 draftEmail 的主题与正文', subjectMatches && messageMatches && attachmentBinary, '5B 草稿配置不符合规范');
  }

  // 3.4 认证头与线上部署环境检查 (重大发现)
  const node3AHeaders = node3A?.parameters?.headerParameters?.parameters || [];
  const node3BHeaders = node3B?.parameters?.headerParameters?.parameters || [];
  const node3AHasApiKey = node3AHeaders.some((h: any) => h.name === 'x-api-key' || h.name === 'Authorization');
  const node3BHasApiKey = node3BHeaders.some((h: any) => h.name === 'x-api-key' || h.name === 'Authorization');

  check(
    '【安全性与生产鉴权审计】n8n 节点 3A / 3B 是否配置了 x-api-key 认证头',
    node3AHasApiKey && node3BHasApiKey,
    '当前 n8n 工作流缺少 x-api-key 请求头！在生产环境 (NODE_ENV=production) 中会被 RBAC 中间件返回 401 Unauthorized 阻断！建议在工作流中补齐 header: x-api-key: key_default_admin_2026'
  );

  const node3AUrl = node3A?.parameters?.url || '';
  const isCloudOrDynamicUrl = !node3AUrl.startsWith('http://localhost') || node3AUrl.includes('kelvinflow.com') || node3AUrl.includes('$env');

  check(
    '【跨机与容器通信审计】n8n 节点是否适配云端生产域名 (https://quote.kelvinflow.com)',
    isCloudOrDynamicUrl,
    '当前 URL 硬编码为 http://localhost:3000，若 n8n 运行在 Docker 容器或云端，无法通过 localhost 访问主服务！建议配置为 https://quote.kelvinflow.com'
  );

  console.log('\n========================================================================');
  console.log(`📊 审计执行完成：共 ${total} 项指标，通过 ${passed} 项，待关注/修复建议 ${total - passed} 项`);
  console.log('========================================================================\n');

  if (issues.length > 0) {
    console.log('⚠️ 需关注与建议项：');
    issues.forEach((item, idx) => console.log(`  ${idx + 1}. ${item}`));
  } else {
    console.log('🎉 恭喜！官网、工作台与 n8n 工作流全链路 100% 契合！');
  }
}

runAudit().catch(err => {
  console.error('审计执行失败:', err);
});
