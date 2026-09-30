// comprehensive_live_qa_test.mjs
// 全链路真实生产环境端到端自动化测试脚本
import fs from 'fs';

const BASE_LANDING_URL = 'https://kelvinflow.com';
const BASE_API_URL = 'https://quote.kelvinflow.com';
const N8N_FLOW_URL = 'https://flow.kelvinflow.com';
const N8N_DIRECT_URL = 'https://n8n.08200909.xyz';

const testRunId = Date.now().toString().slice(-6);
const testUser = {
  phone: `13888${testRunId}`,
  email: `qa_tester_${testRunId}@foshan-hardware.com`,
  password: `QaPass_${testRunId}!`,
  name: `黄总_${testRunId}`,
  company: `佛山顺德精工五金实业有限公司`,
  category: `智能升降五金与外贸支架`
};

const results = [];

function recordResult(caseId, name, status, details, durationMs) {
  const item = { caseId, name, status, durationMs, details };
  results.push(item);
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`${icon} [${caseId}] ${name} (${durationMs}ms): ${status}`);
  if (details) {
    console.log(`   ${typeof details === 'object' ? JSON.stringify(details) : details}`);
  }
}

async function runAllTests() {
  console.log('================================================================');
  console.log(`🚀 开始对 KelvinFlow 生产全链路执行端到端深度测试 (Run ID: ${testRunId})`);
  console.log(`📡 官网地址: ${BASE_LANDING_URL}`);
  console.log(`📡 报价/工作台地址: ${BASE_API_URL}`);
  console.log(`📡 n8n 工作流入口: ${N8N_FLOW_URL} / ${N8N_DIRECT_URL}`);
  console.log(`👤 模拟注册用户: ${testUser.name} (${testUser.phone} / ${testUser.email})`);
  console.log('================================================================\n');

  let registeredTenantId = 'default';
  let userToken = '';
  let generatedQuotationNumber = '';

  // -------------------------------------------------------------
  // 用例 1: 官网首页访问与留资接口连通性
  // -------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const resp = await fetch(`${BASE_LANDING_URL}/`);
      const text = await resp.text();
      const hasTitle = text.includes('KelvinFlow') || text.includes('报价');
      const hasCTA = text.includes('免费试用') || text.includes('7天') || text.includes('立即体验');
      
      // 测试留资接口
      const leadResp = await fetch(`${BASE_API_URL}/api/inbound/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: testUser.name,
          companyName: testUser.company,
          contact: testUser.phone,
          dailyRfqs: '15~20 封',
          productCategory: testUser.category,
          source: 'QA自动化测试'
        })
      });
      const leadJson = await leadResp.json();

      recordResult(
        'TC-01',
        '官网 Landing Page 加载与留资通道测试',
        resp.status === 200 && hasTitle && leadJson.success ? 'PASS' : 'WARN',
        { httpStatus: resp.status, htmlLength: text.length, leadSubmitted: leadJson.success },
        Date.now() - start
      );
    } catch (e) {
      recordResult('TC-01', '官网 Landing Page 加载与留资通道测试', 'FAIL', e.message, Date.now() - start);
    }
  }

  // -------------------------------------------------------------
  // 用例 2: 7 天免费试用完整注册流程 (带防刷限流与底价表初始化)
  // -------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const resp = await fetch(`${BASE_API_URL}/api/v1/auth/trial-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testUser.phone,
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
          company: testUser.company,
          category: testUser.category,
          channelSource: 'qa-test-portal'
        })
      });
      const data = await resp.json();
      if (resp.status === 200 && data.success) {
        registeredTenantId = data.tenantId || data.tenant?.id;
        userToken = data.token;
        recordResult(
          'TC-02',
          '7天免费试用注册与免密直通登录',
          'PASS',
          {
            tenantId: registeredTenantId,
            remainingDays: data.remainingDays || 7,
            hasToken: !!userToken,
            accountType: data.isPaid ? 'paid' : 'trial'
          },
          Date.now() - start
        );
      } else {
        recordResult('TC-02', '7天免费试用注册与免密直通登录', 'FAIL', data, Date.now() - start);
      }
    } catch (e) {
      recordResult('TC-02', '7天免费试用注册与免密直通登录', 'FAIL', e.message, Date.now() - start);
    }
  }

  // -------------------------------------------------------------
  // 用例 3: 试用期状态校验与账号探知接口
  // -------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const resp = await fetch(`${BASE_API_URL}/api/v1/auth/trial-status?phone=${testUser.phone}&tenant_id=${registeredTenantId}`);
      const data = await resp.json();
      const isValid = data.success && data.exists && data.remainingDays >= 6;
      recordResult(
        'TC-03',
        '试用期状态与权限探针 (7天倒计时)',
        isValid ? 'PASS' : 'WARN',
        { exists: data.exists, isTrial: data.isTrial, remainingDays: data.remainingDays, expiresAt: data.expiresAt },
        Date.now() - start
      );
    } catch (e) {
      recordResult('TC-03', '试用期状态与权限探针 (7天倒计时)', 'FAIL', e.message, Date.now() - start);
    }
  }

  // -------------------------------------------------------------
  // 用例 4: 付费用户升级核销闭环 (管理员极速激活)
  // -------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const resp = await fetch(`${BASE_API_URL}/api/v1/admin/upgrade-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'key_default_admin_2026'
        },
        body: JSON.stringify({
          phoneOrEmail: testUser.phone,
          plan: 'geek',
          months: 3,
          amountPaid: 897,
          note: 'QA 自动化全链路升级测试'
        })
      });
      const data = await resp.json();
      
      // 再次检查试用状态确认已变为正式付费
      const verifyResp = await fetch(`${BASE_API_URL}/api/v1/auth/trial-status?phone=${testUser.phone}`);
      const verifyData = await verifyResp.json();

      const upgraded = data.success && verifyData.isPaid && verifyData.plan === 'geek';
      recordResult(
        'TC-04',
        '试用用户开通为正式付费用户 (升级核销闭环)',
        upgraded ? 'PASS' : 'FAIL',
        { upgradedSuccess: data.success, plan: verifyData.plan, isPaid: verifyData.isPaid, expiresAt: verifyData.expiresAt },
        Date.now() - start
      );
    } catch (e) {
      recordResult('TC-04', '试用用户开通为正式付费用户 (升级核销闭环)', 'FAIL', e.message, Date.now() - start);
    }
  }

  // -------------------------------------------------------------
  // 用例 5: 多场景客户询盘邮件解析与出单 (标准询盘 - 高置信度)
  // -------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const emailPayload = {
        tenantId: registeredTenantId,
        from: 'purchasing@nordic-home-import.se',
        to: testUser.email,
        subject: 'RFQ: Urgent Price Request for Ergonomic Office Desk Bracket (500 units)',
        text: `Hi Kelvin,\n\nHope you are doing well.\nWe are looking to place an urgent order for Nordic market:\n1. SKU: ST-2026-A - Ergonomic Monitor Stand, Qty: 1500 pcs\n2. SKU: ERG-PRO-V2 - Heavy Duty Dual Arm Bracket, Qty: 500 pcs\n\nOptions needed:\n- Finish: Matte Black Powder Coating\n- Custom Laser Engraved Logo on backplate\n\nTrade terms: FOB Shenzhen.\nPayment: T/T 30% deposit, balance against B/L.\nCurrency: USD.\nTarget shipment: within 30 days.\n\nPlease provide formal quotation PDF today.\n\nBest regards,\nLars Lindqvist\nSenior Procurement Officer | Nordic Home Imports Stockholm`
      };

      const resp = await fetch(`${BASE_API_URL}/api/inbound/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload)
      });
      const data = await resp.json();

      if (resp.status === 200 && data.success) {
        generatedQuotationNumber = data.quotationNumber;
        recordResult(
          'TC-05',
          '场景A: 标准海外多SKU询盘解析与自动核价出单',
          'PASS',
          {
            quotationNumber: data.quotationNumber,
            deliveryMode: data.deliveryMode,
            reviewUrl: data.reviewUrl,
            draftInjected: data.draftInjected,
            reviewEmailSent: data.reviewEmailSent
          },
          Date.now() - start
        );
      } else {
        recordResult('TC-05', '场景A: 标准海外多SKU询盘解析与自动核价出单', 'FAIL', data, Date.now() - start);
      }
    } catch (e) {
      recordResult('TC-05', '场景A: 标准海外多SKU询盘解析与自动核价出单', 'FAIL', e.message, Date.now() - start);
    }
  }

  // -------------------------------------------------------------
  // 用例 6: 异常与低置信度/非标定制询盘容错测试 (场景B)
  // -------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const ambiguousPayload = {
        tenantId: registeredTenantId,
        from: 'custom_buyer@dubai-traders.ae',
        to: testUser.email,
        subject: 'Custom OEM bracket inquiry with unknown model',
        text: `Hello,\nWe need quotation for 2000 units of custom steel bracket model UNKNOWN-XYZ-999 with special thickness 4.5mm and custom gold plating.\nAlso need 100 units of ST-2026-B.\nDelivery to Jebel Ali Port, CIF Dubai.\nLet me know price ASAP.`
      };

      const resp = await fetch(`${BASE_API_URL}/api/inbound/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ambiguousPayload)
      });
      const data = await resp.json();

      // 系统应该平稳降级，而不是 500 崩溃
      const isHandled = resp.status === 200 && data.success && data.quotationNumber;
      recordResult(
        'TC-06',
        '场景B: 非标未知SKU与定制工艺异常询盘平稳降级测试',
        isHandled ? 'PASS' : 'WARN',
        {
          handled: isHandled,
          quotationNumber: data.quotationNumber,
          reviewUrl: data.reviewUrl
        },
        Date.now() - start
      );
    } catch (e) {
      recordResult('TC-06', '场景B: 非标未知SKU与定制工艺异常询盘平稳降级测试', 'FAIL', e.message, Date.now() - start);
    }
  }

  // -------------------------------------------------------------
  // 用例 7: 在线微调审单台闭环与二次调价测试 (Workbench)
  // -------------------------------------------------------------
  if (generatedQuotationNumber) {
    const start = Date.now();
    try {
      // 1. 获取报价单详情
      const quoteResp = await fetch(`${BASE_API_URL}/api/v1/quotes/${generatedQuotationNumber}`);
      const quoteData = await quoteResp.json();

      // 2. 模拟用户在工作台滑块微调利润率或修改单价
      const updateResp = await fetch(`${BASE_API_URL}/api/v1/quotes/${generatedQuotationNumber}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profitMargin: 0.35, // 从 30% 调高到 35%
          exchangeRate: 7.25,
          incoterm: 'FOB'
        })
      });
      const updateData = await updateResp.json();

      recordResult(
        'TC-07',
        '工作台在线审单台数据拉取与利润率微调重算',
        updateData.success ? 'PASS' : 'WARN',
        {
          quoteFound: quoteData.success,
          originalTotal: quoteData.data?.totalAmountForeign,
          updatedTotal: updateData.data?.totalAmountForeign,
          pdfRegenerated: !!updateData.data?.pdfBase64
        },
        Date.now() - start
      );
    } catch (e) {
      recordResult('TC-07', '工作台在线审单台数据拉取与利润率微调重算', 'FAIL', e.message, Date.now() - start);
    }
  }

  // -------------------------------------------------------------
  // 用例 8: n8n 共享工作流 Webhook 监听入口连通性测试
  // -------------------------------------------------------------
  {
    const start = Date.now();
    try {
      // 测试 flow.kelvinflow.com 或 n8n.08200909.xyz 上的 webhook
      const webhookUrls = [
        `${N8N_FLOW_URL}/webhook/kelvinflow-quote-webhook`,
        `${N8N_DIRECT_URL}/webhook/kelvinflow-quote-webhook`
      ];

      let webhookPass = false;
      let webhookDetail = {};

      for (const url of webhookUrls) {
        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId: registeredTenantId,
              from: 'webhook_tester@buyer.com',
              to: testUser.email,
              subject: 'RFQ via n8n Webhook Pipeline Test',
              content: 'Please quote ST-2026-A 1000 pcs, FOB Shenzhen, USD currency.'
            })
          });
          const text = await resp.text();
          webhookDetail[url] = { status: resp.status, body: text.slice(0, 150) };
          if (resp.status === 200) {
            webhookPass = true;
            break;
          }
        } catch (err) {
          webhookDetail[url] = { error: err.message };
        }
      }

      recordResult(
        'TC-08',
        'n8n 统一多租户共享 Webhook 连通性测试',
        webhookPass ? 'PASS' : 'WARN',
        webhookDetail,
        Date.now() - start
      );
    } catch (e) {
      recordResult('TC-08', 'n8n 统一多租户共享 Webhook 连通性测试', 'FAIL', e.message, Date.now() - start);
    }
  }

  console.log('\n================================================================');
  console.log('🏁 测试执行完毕，统计概览:');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const warnCount = results.filter(r => r.status === 'WARN').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`总用例数: ${results.length} | 通过: ${passCount} | 警告: ${warnCount} | 失败: ${failCount}`);
  console.log('================================================================');

  fs.writeFileSync('F:/order_workflow/tests/live_qa_results.json', JSON.stringify({
    testRunId,
    timestamp: new Date().toISOString(),
    summary: { total: results.length, passCount, warnCount, failCount },
    results
  }, null, 2));
}

runAllTests().catch(console.error);
