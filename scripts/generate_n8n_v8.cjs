const fs = require('fs');
const path = require('path');

const workflow = {
  "name": "KelvinFlow · AI全能邮件报价中枢 (SaaS多租户单一共享版 v8.0)",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "kelvinflow-quote-webhook",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "1. 统一多租户 Webhook 监听入口",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [ 240, 200 ],
      "id": "node-webhook-inbound",
      "notes": "零静态凭证绑定！全网所有付费用户共享此 Webhook 入口，彻底消除红色感叹号"
    },
    {
      "parameters": {
        "jsCode": `// 0. 多租户数据归一化与买家询盘文本清洗
const item = $input.item.json;
const body = item.body || item;

const tenantId = body.tenantId || 'default';
const userEmail = body.userEmail || body.to || 'sales@company.com';
const from = body.from || '';
const fromName = body.fromName || from;
const subject = body.subject || '(无主题询盘)';
const content = body.content || body.text || body.html || '';
const messageId = body.messageId || ('msg_' + Date.now());

// 识别是否为有效询盘正文
const isSpam = /mailer-daemon|postmaster|noreply|automatic reply|out of office/i.test(from + ' ' + subject);
const hasContent = content.trim().length > 10;

return {
  json: {
    tenantId,
    userEmail,
    from,
    fromName,
    subject,
    content,
    messageId,
    isValidInquiry: !isSpam && hasContent,
    receivedAt: new Date().toISOString()
  }
};`
      },
      "name": "2. 询盘清洗与多租户归一化",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [ 480, 200 ],
      "id": "node-sanitize-code"
    },
    {
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{ $json.isValidInquiry }}",
              "value2": true
            }
          ]
        }
      },
      "name": "3. 严格判定询盘合法性 (过滤退信/垃圾信)",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [ 720, 200 ],
      "id": "node-if-valid"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://quote.kelvinflow.com/api/inbound/email",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": `={
  "tenantId": "{{ $json.tenantId }}",
  "from": "{{ $json.from }}",
  "to": "{{ $json.userEmail }}",
  "subject": "{{ $json.subject }}",
  "text": {{ JSON.stringify($json.content) }}
}`,
        "options": {
          "timeout": 60000
        }
      },
      "name": "4. 调用 Gemini 最新模型与多租户报价中枢",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [ 980, 160 ],
      "id": "node-core-engine-http",
      "notes": "自动调用 Gemini 最新大模型语义提取 SKU、匹配该租户私有底价表、核算价格、渲染商业 PDF，并静默注入该付费用户的邮箱草稿箱！"
    },
    {
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{ $json.success }}",
              "value2": true
            }
          ]
        }
      },
      "name": "5. 判定出单与草稿注入结果",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [ 1240, 160 ],
      "id": "node-if-success"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": `={
  "status": "success",
  "message": "询盘已成功解析，正式 PDF 报价单与英文回复草稿已自动注入至您的邮箱草稿箱！",
  "quotationNumber": "{{ $json.quotationNumber }}",
  "reviewUrl": "{{ $json.reviewUrl }}",
  "draftInjected": {{ $json.draftInjected || false }},
  "draftMailbox": "{{ $json.draftMailbox || 'Drafts' }}"
}`,
        "options": {
          "responseCode": 200
        }
      },
      "name": "6A. 响应 Webhook 成功结果",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [ 1500, 80 ],
      "id": "node-respond-success"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": `={
  "status": "ignored",
  "message": "该邮件被识别为系统退信或无关通知，已自动忽略。"
}`,
        "options": {
          "responseCode": 200
        }
      },
      "name": "6B. 响应过滤结果 (跳过处理)",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [ 980, 360 ],
      "id": "node-respond-skip"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": `={
  "status": "error",
  "error": "{{ $json.error || '出单核价异常，请检查租户底价表' }}"
}`,
        "options": {
          "responseCode": 500
        }
      },
      "name": "6C. 响应异常结果",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [ 1500, 260 ],
      "id": "node-respond-error"
    }
  ],
  "connections": {
    "1. 统一多租户 Webhook 监听入口": {
      "main": [
        [
          {
            "node": "2. 询盘清洗与多租户归一化",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "2. 询盘清洗与多租户归一化": {
      "main": [
        [
          {
            "node": "3. 严格判定询盘合法性 (过滤退信/垃圾信)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "3. 严格判定询盘合法性 (过滤退信/垃圾信)": {
      "main": [
        [
          {
            "node": "4. 调用 Gemini 最新模型与多租户报价中枢",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "6B. 响应过滤结果 (跳过处理)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "4. 调用 Gemini 最新模型与多租户报价中枢": {
      "main": [
        [
          {
            "node": "5. 判定出单与草稿注入结果",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "5. 判定出单与草稿注入结果": {
      "main": [
        [
          {
            "node": "6A. 响应 Webhook 成功结果",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "6C. 响应异常结果",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {
    "executionOrder": "v1"
  },
  "versionId": "kelvinflow-saas-v8.0",
  "id": "kelvinflow-saas-v8.0",
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "kelvinflow-universal-instance"
  }
};

const outputDir = path.resolve('workflows');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const projectFile = path.join(outputDir, 'KelvinFlow_AI全能邮件报价中枢_SaaS多租户单一工作流_v8.0.json');
fs.writeFileSync(projectFile, JSON.stringify(workflow, null, 2), 'utf8');
console.log('✅ Generated in project:', projectFile);

const desktopDir = 'C:\\\\Users\\\\tsuik\\\\OneDrive\\\\桌面\\\\n8n';
if (fs.existsSync(desktopDir)) {
  const desktopFile = path.join(desktopDir, 'KelvinFlow_AI全能邮件报价中枢_SaaS多租户单一工作流_v8.0.json');
  fs.writeFileSync(desktopFile, JSON.stringify(workflow, null, 2), 'utf8');
  console.log('✅ Generated on desktop:', desktopFile);
}
