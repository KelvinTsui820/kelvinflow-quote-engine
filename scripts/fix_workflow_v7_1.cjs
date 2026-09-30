const fs = require('fs');
const path = require('path');

const originalPath = 'C:\\Users\\tsuik\\OneDrive\\桌面\\n8n\\KelvinFlow_AI全能邮件报价中枢_多邮箱自适应一体化版_v7.json';
const targetDesktopPath = 'C:\\Users\\tsuik\\OneDrive\\桌面\\n8n\\KelvinFlow_AI全能邮件报价中枢_多邮箱自适应一体化版_v7.1_生产完美版.json';
const targetWorkspacePath = 'F:\\order_workflow\\kelvinflow_quotation_workflow_v7.1.json';

if (!fs.existsSync(originalPath)) {
  console.error('❌ 未找到原版文件:', originalPath);
  process.exit(1);
}

const raw = fs.readFileSync(originalPath, 'utf-8');
const wf = JSON.parse(raw);

wf.name = 'KelvinFlow_AI全能邮件报价中枢_多邮箱自适应一体化版_v7.1_生产完美版';

// 1. 完善 Node 0: 多邮箱协议归一化与渠道打标
const node0 = wf.nodes.find(n => n.name.includes('0. 多邮箱协议归一化'));
if (node0) {
  node0.parameters.jsCode = `// 0. 统一不同邮件来源的数据格式，并注入渠道标签
const item = $input.first();
const json = item.json;
const binaries = item.binary || {};

function extractPureEmail(val) {
  if (!val) return '';
  if (typeof val !== 'string') return '';
  const match = val.match(/<([^>]+)>/);
  if (match && match[1]) return match[1].trim();
  const emailMatch = val.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/);
  return emailMatch ? emailMatch[0].trim() : val.trim();
}

// 识别来源
let provider = 'imap';
let senderEmail = '';
let recipientEmail = '';
let subject = json.subject || '';
let bodyText = '';

if (json.threadId || json.historyId) {
  // 1. 来自 Gmail Trigger
  provider = 'gmail';
  const fromObj = json.from && json.from.value ? json.from.value[0] : {};
  senderEmail = extractPureEmail(fromObj.address || json.from || '');
  recipientEmail = extractPureEmail(json.to || '');
  bodyText = json.textPlain || json.snippet || '';
} else if (json.internetMessageId || json.conversationId || json.bodyPreview !== undefined) {
  // 2. 来自 Microsoft Outlook / Office 365 Trigger
  provider = 'outlook';
  senderEmail = extractPureEmail(json.from?.emailAddress?.address || json.sender?.emailAddress?.address || '');
  recipientEmail = extractPureEmail(json.toRecipients?.[0]?.emailAddress?.address || '');
  bodyText = json.bodyPreview || (json.body?.content ? json.body.content.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim() : '');
} else {
  // 3. 来自 通用 IMAP Trigger (腾讯企邮、阿里、网易企业邮，以及 QQ、163/126 等个人邮箱)
  provider = 'imap';
  senderEmail = extractPureEmail(json.from?.value?.[0]?.address || json.from?.text || json.from || '');
  recipientEmail = extractPureEmail(json.to?.value?.[0]?.address || json.to?.text || json.to || '');
  bodyText = json.text || json.textAsHtml || '';
}

if (!bodyText && json.html) {
  bodyText = json.html.replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim();
}

return [{
  json: {
    ...json,
    emailProvider: provider,
    senderEmail,
    recipientEmail,
    subject,
    cleanBodyText: bodyText
  },
  binary: binaries
}];`;
}

// 2. 新增 Node 2A: 智能底价表格筛选 (解决 attachment_0 命中 logo 导致底价更新失败的缺陷)
const node2A = {
  parameters: {
    jsCode: `// 2A. 智能底价表格筛选与格式校验
const item = $input.first();
const binaries = item.binary || {};
const binaryKeys = Object.keys(binaries);
let pricingKey = null;

// 1. 严格优先查找 Excel / CSV 底价表格
for (const key of binaryKeys) {
  const file = binaries[key];
  const name = (file.fileName || '').toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    pricingKey = key;
    break;
  }
}

// 2. 兜底策略：若未按后缀直接匹配，过滤掉小于 20KB 的签名图后取首个文件
if (!pricingKey && binaryKeys.length > 0) {
  for (const key of binaryKeys) {
    const file = binaries[key];
    const name = (file.fileName || '').toLowerCase();
    const isSignature = name.includes('logo') || name.includes('icon') || name.includes('avatar') || name.includes('sig');
    if (!isSignature) {
      pricingKey = key;
      break;
    }
  }
  if (!pricingKey) {
    pricingKey = binaryKeys[0];
  }
}

const outBinary = {};
if (pricingKey && binaries[pricingKey]) {
  outBinary.pricing_file = binaries[pricingKey];
}

return [{
  json: {
    ...item.json,
    has_pricing_file: !!pricingKey,
    selected_pricing_file_name: pricingKey && binaries[pricingKey] ? binaries[pricingKey].fileName : null
  },
  binary: outBinary
}];`
  },
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [1360, -176],
  id: '7b8c2d1e-9a4f-4d3b-8c1e-2f5a6b7c8d9e',
  name: '2A. 智能底价表格筛选'
};

// 检查是否已经存在 2A
const existingIndex = wf.nodes.findIndex(n => n.name.includes('2A. 智能底价表格筛选'));
if (existingIndex >= 0) {
  wf.nodes[existingIndex] = node2A;
} else {
  wf.nodes.push(node2A);
}

// 3. 修改 Node 3A: inputDataFieldName 改为 pricing_file
const node3A = wf.nodes.find(n => n.name.includes('3A. 更新底价库'));
if (node3A) {
  node3A.position = [1580, -176];
  const param = node3A.parameters.bodyParameters?.parameters?.find(p => p.name === 'pricing_file');
  if (param) {
    param.inputDataFieldName = 'pricing_file';
  }
}

// 4. 修改 Node 3B: sales_rep_email 避免降级到海外买家
const node3B = wf.nodes.find(n => n.name.includes('3B. 询盘报价计算'));
if (node3B) {
  const repParam = node3B.parameters.bodyParameters?.parameters?.find(p => p.name === 'sales_rep_email');
  if (repParam) {
    repParam.value = "={{ $json.recipientEmail || 'sales@foshan-kelvin.com' }}";
  }
}

// 5. 修改 Node 6B-2: 修复 PDF 附件丢失 + 消除 toEmail 误发海外买家的严重隐患
const node6B2 = wf.nodes.find(n => n.name.includes('6B-2. IMAP/企业邮'));
if (node6B2) {
  node6B2.parameters.fromEmail = "={{ $json.recipientEmail || 'sales@foshan-kelvin.com' }}";
  // 严格锁死给业务员自己核对，绝不降级到 $json.senderEmail (海外客户)
  node6B2.parameters.toEmail = "={{ $json.recipientEmail || 'sales@foshan-kelvin.com' }}";
  node6B2.parameters.options = {
    allowUnauthorizedCerts: true,
    attachments: 'data' // 核心修复：注入 Node 4B 生成的 PDF 报价单附件
  };
}

// 6. 重组 connections: Node 2 Output 0 -> Node 2A -> Node 3A
wf.connections['2. 严格判定邮件类型 (防海外买家询盘误杀)'].main[0] = [
  {
    node: '2A. 智能底价表格筛选',
    type: 'main',
    index: 0
  }
];

wf.connections['2A. 智能底价表格筛选'] = {
  main: [
    [
      {
        node: '3A. 更新底价库 (/update-pricing)',
        type: 'main',
        index: 0
      }
    ]
  ]
};

const jsonStr = JSON.stringify(wf, null, 2);
fs.writeFileSync(targetDesktopPath, jsonStr, 'utf-8');
fs.writeFileSync(targetWorkspacePath, jsonStr, 'utf-8');

console.log('🎉 成功生成 v7.1 生产完美版工作流文件！');
console.log('1. 桌面生产版文件:', targetDesktopPath);
console.log('2. 项目同步副本:', targetWorkspacePath);
