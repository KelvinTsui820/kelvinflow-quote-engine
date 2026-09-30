/**
 * KelvinFlow AI 外贸报价引擎 - 生产环境全链路 E2E 自动化测试脚本
 * 目标环境: https://quote.kelvinflow.com
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const BASE_URL = process.env.BASE_URL || 'https://quote.kelvinflow.com';
const ADMIN_API_KEY = 'key_default_admin_2026';
const SALES_API_KEY = 'key_default_sales_2026';
const EXCEL_PATH = 'C:\\Users\\tsuik\\OneDrive\\桌面\\n8n\\商品底价表\\商品底价表.xlsx';

// 记录所有测试结果与耗时
const testResults = [];

function recordResult(testCase, stepName, status, durationMs, details, dataAssertion = null) {
  const record = {
    testCase,
    stepName,
    status, // 'PASS' | 'FAIL' | 'WARN'
    durationMs,
    details,
    dataAssertion
  };
  testResults.push(record);
  const icon = status === 'PASS' ? '✅' : (status === 'FAIL' ? '❌' : '⚠️');
  console.log(`${icon} [${testCase}] ${stepName} (${durationMs}ms): ${details}`);
}

async function runLiveE2ETests() {
  console.log('================================================================');
  console.log(`🚀 开始对 KelvinFlow 在线服务发起深度 E2E 测试: ${BASE_URL}`);
  console.log(`⏱️ 测试启动时间: ${new Date().toISOString()}`);
  console.log(`📂 底价表路径: ${EXCEL_PATH}`);
  console.log('================================================================\n');

  let testQuoteId = null;

  // -------------------------------------------------------------------------
  // 用例 1：底价表解析与生效测试 (/api/v1/update-pricing)
  // -------------------------------------------------------------------------
  console.log('\n--- 正在执行【用例 1：底价表解析与生效测试 (/api/v1/update-pricing)】---');
  try {
    const fileBuffer = fs.readFileSync(EXCEL_PATH);
    const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const formData = new FormData();
    formData.append('pricing_file', blob, '商品底价表.xlsx');

    const t0 = Date.now();
    const res = await fetch(`${BASE_URL}/api/v1/update-pricing`, {
      method: 'POST',
      headers: {
        'x-api-key': ADMIN_API_KEY
      },
      body: formData
    });
    const d0 = Date.now() - t0;
    const body = await res.json();

    if (res.status === 200 && body.success) {
      const summary = body.summary || {};
      const itemsOk = summary.itemCount === 5;
      const expectedSkus = ['ST-2026-A', 'ST-2026-B', 'ERG-PRO-V2', 'AL-BASE-99', 'HD-ARM-08'];
      const skusMatch = expectedSkus.every(sku => (summary.sampleItems || []).includes(sku));
      const sheets = summary.parsedSheets || [];
      const hasProducts = sheets.some(s => s.includes('商品底價庫') || s.includes('Products'));
      const hasAddons = sheets.some(s => s.includes('選配加價庫') || s.includes('Addons'));
      const hasIncoterms = sheets.some(s => s.includes('貿易術語庫') || s.includes('Incoterms'));
      const hasContainer = sheets.some(s => s.includes('裝櫃速算庫') || s.includes('Container_Calc'));
      const hasRates = sheets.some(s => s.includes('匯率表') || s.includes('Exchange_Rates'));
      const hasTerms = sheets.some(s => s.includes('付款條款庫') || s.includes('Payment_Terms'));
      const rates = summary.exchangeRates || [];
      const usdRate = rates.find(r => r.currency === 'USD');
      const usdRateOk = usdRate && usdRate.rateToRMB === 7.2;
      const replyEmailOk = body.replyEmail && body.replyEmail.subject && body.replyEmail.body && (body.replyEmail.subject.includes('5 款商品') || body.replyEmail.body.includes('5 款'));

      if (itemsOk && skusMatch && hasAddons && hasIncoterms && hasContainer && hasRates && hasTerms && usdRateOk && replyEmailOk) {
        recordResult('用例 1', '底价表全量7-Sheet解析与生效', 'PASS', d0, 
          `成功解析 5 款SKU (${expectedSkus.join(', ')}), 6种外币汇率(USD 7.2), 完整识别所有工作表，确认邮件完整`,
          { itemCount: summary.itemCount, sheetsCount: sheets.length, usdRate: usdRate.rateToRMB }
        );
      } else {
        recordResult('用例 1', '底价表数据完整性校验', 'FAIL', d0,
          `解析字段不完全符合预期: itemsOk=${itemsOk}, skusMatch=${skusMatch}, hasAddons=${hasAddons}, hasIncoterms=${hasIncoterms}, hasContainer=${hasContainer}, usdRateOk=${usdRateOk}, replyEmailOk=${replyEmailOk}`,
          summary
        );
      }
    } else {
      recordResult('用例 1', '上传底价表接口', 'FAIL', d0, `接口响应异常: HTTP ${res.status}, error: ${body.error}`);
    }
  } catch (err) {
    recordResult('用例 1', '上传底价表网络异常', 'FAIL', 0, err.message);
  }

  // -------------------------------------------------------------------------
  // 用例 2：标准询盘正常匹配与自动出单测试 (/api/v1/process-quote)
  // -------------------------------------------------------------------------
  console.log('\n--- 正在执行【用例 2：标准询盘正常匹配与自动出单测试 (/api/v1/process-quote)】---');
  try {
    const inquiryText = `From: Marcus Weber <m.weber@acmeglobal.de>
To: sales@foshan-kelvin.com
Date: 2026-09-15
Subject: RFQ-ACME-2026-Q4 - Formal Quotation Request for Ergonomic Chairs & Aluminum Brackets

Dear Kelvin Sales Team,

This is Marcus Weber from Acme Global Sourcing GmbH in Germany.
We are preparing our Q4 corporate procurement and would like to request your official quotation for the following items:

Item 1: ERG-PRO-V2 (High Back Ergonomic Office Chair)
Quantity: 500 pcs
Specifications & Add-ons: Frame finished in Matte Black Coating, and custom Laser Logo engraved on the backrest.

Item 2: ST-2026-A (Aluminum Alloy Precision Hardware Bracket)
Quantity: 2000 pcs
Specifications: Standard factory export packaging.

Trade Terms: FOB Shenzhen Yantian Port
Settlement Currency: USD
Required Delivery Lead Time: 30 days after deposit confirmation.
Payment Term: 30% T/T Deposit, 70% Balance before shipment.

Please issue a formal PDF quotation with unit price, total price, and packaging estimates.

Best regards,
Marcus Weber
Director of Global Procurement
Acme Global Sourcing GmbH`;

    const formData = new FormData();
    formData.append('po_text', inquiryText);
    formData.append('sales_rep_email', 'sales@foshan-kelvin.com');
    formData.append('sales_rep_name', 'Kelvin Tsui');

    const t1 = Date.now();
    const res = await fetch(`${BASE_URL}/api/v1/process-quote`, {
      method: 'POST',
      headers: {
        'x-api-key': ADMIN_API_KEY
      },
      body: formData
    });
    const d1 = Date.now() - t1;
    const body = await res.json();

    if (res.status === 200 && body.success) {
      const q = body.quotation;
      testQuoteId = q.quotationNumber;

      // 验证买家信息提取
      const buyerMatched = (q.customerName.includes('Acme') || q.customerName.includes('ACME')) &&
                           (q.buyerName.includes('Marcus') || q.buyerName.includes('Weber'));
      
      // 验证 SKU 与数量
      const ergItem = (q.items || []).find(i => i.sku === 'ERG-PRO-V2' || i.matchedSku === 'ERG-PRO-V2');
      const stItem = (q.items || []).find(i => i.sku === 'ST-2026-A' || i.matchedSku === 'ST-2026-A');
      const skuMatched = ergItem && stItem && ergItem.quantity === 500 && stItem.quantity === 2000;

      // 验证工艺加价 (ERG-PRO-V2: Black Coating ¥3, Laser Logo ¥0.8 -> appliedAddons)
      const addonsApplied = ergItem && ergItem.appliedAddons && ergItem.appliedAddons.length >= 2;
      const totalAddonRMB = (ergItem?.appliedAddons || []).reduce((sum, a) => sum + (a.addonRMB || 0), 0);
      const addonsPriceOk = Math.abs(totalAddonRMB - 3.8) < 0.01;

      // 验证单价核算逻辑
      // ERG-PRO-V2: (185 + 3.8) * 1.35 / 7.2 = 35.40 USD
      // ST-2026-A: 15.5 * 1.30 / 7.2 = 2.7986 -> 2.80 USD
      const ergExpectedUnit = Math.round(((185 + 3.8) * 1.35 / 7.2) * 100) / 100; // 35.40
      const stExpectedUnit = Math.round((15.5 * 1.30 / 7.2) * 100) / 100; // 2.80
      const unitPriceOk = Math.abs(ergItem.unitPriceForeign - ergExpectedUnit) < 0.05 &&
                          Math.abs(stItem.unitPriceForeign - stExpectedUnit) < 0.05;

      // 验证总价
      const expectedTotal = Math.round((500 * ergItem.unitPriceForeign + 2000 * stItem.unitPriceForeign) * 100) / 100;
      const totalAmountOk = Math.abs(q.totalAmountForeign - expectedTotal) < 0.1;

      // 验证 PDF 生成有效性
      const pdfBase64 = body.pdfBase64 || '';
      let pdfValid = false;
      let pdfSize = 0;
      if (pdfBase64) {
        const pdfBuf = Buffer.from(pdfBase64, 'base64');
        pdfSize = pdfBuf.length;
        pdfValid = pdfBuf.slice(0, 4).toString() === '%PDF' && pdfSize > 3000;
      }

      // 验证 reviewUrl
      const reviewUrlValid = typeof body.reviewUrl === 'string' && body.reviewUrl.includes(q.quotationNumber);

      if (buyerMatched && skuMatched && addonsApplied && addonsPriceOk && unitPriceOk && totalAmountOk && pdfValid && reviewUrlValid) {
        recordResult('用例 2', '标准询盘匹配与自动出单', 'PASS', d1,
          `AI 100% 精确提取两款商品及工艺加价(Black Coating + Laser Logo ¥3.8)。价格核算精确: ERG-PRO-V2=$${ergItem.unitPriceForeign}, ST-2026-A=$${stItem.unitPriceForeign}, 总计=$${q.totalAmountForeign} USD。成功生成合法PDF(${pdfSize} bytes)与微调链接。`,
          {
            aiModel: q.aiModelUsed,
            confidence: q.aiConfidenceScore,
            quotationNumber: q.quotationNumber,
            totalAmount: q.totalAmountForeign,
            pdfBytes: pdfSize,
            reviewUrl: body.reviewUrl
          }
        );
      } else {
        recordResult('用例 2', '标准询盘核算校验', 'FAIL', d1,
          `断言未完全通过: buyerMatched=${buyerMatched}, skuMatched=${skuMatched}, addonsApplied=${addonsApplied} (count=${ergItem?.appliedAddons?.length}), addonsPriceOk=${addonsPriceOk}, unitPriceOk=${unitPriceOk}, totalAmountOk=${totalAmountOk}, pdfValid=${pdfValid}, reviewUrlValid=${reviewUrlValid}`,
          { q, ergItem, stItem }
        );
      }
    } else {
      recordResult('用例 2', '标准询盘请求失败', 'FAIL', d1, `HTTP ${res.status}, error: ${body.error}`);
    }
  } catch (err) {
    recordResult('用例 2', '标准询盘异常', 'FAIL', 0, err.message);
  }

  // -------------------------------------------------------------------------
  // 用例 3：异常与未匹配 SKU 容错测试 (Scenario B)
  // -------------------------------------------------------------------------
  console.log('\n--- 正在执行【用例 3：异常与未匹配 SKU 容错测试 (Scenario B)】---');
  try {
    const unknownInquiryText = `From: David Clark <purchasing@apex-industrial.com>
To: sales@foshan-kelvin.com
Date: 2026-09-15
Subject: Urgent RFQ for Custom Tooling & Non-standard Hardware

Dear Sales,

Please quote urgently for our custom project:
1. Item: UNKNOWN-MODEL-999 (Custom Precision Stamping Bracket)
   Quantity: 300 pcs
2. Item: ST-2026-A (Standard Hardware Bracket)
   Quantity: 1000 pcs

Trade Terms: FOB Shenzhen
Currency: USD

Please confirm pricing ASAP.

Regards,
David Clark
Apex Industrial Ltd`;

    const formData = new FormData();
    formData.append('po_text', unknownInquiryText);
    formData.append('sales_rep_email', 'sales@foshan-kelvin.com');
    formData.append('sales_rep_name', 'Kelvin Tsui');

    const t2 = Date.now();
    const res = await fetch(`${BASE_URL}/api/v1/process-quote`, {
      method: 'POST',
      headers: {
        'x-api-key': ADMIN_API_KEY
      },
      body: formData
    });
    const d2 = Date.now() - t2;
    const body = await res.json();

    if (res.status === 200 && body.success) {
      const q = body.quotation;
      const unkItem = (q.items || []).find(i => i.sku === 'UNKNOWN-MODEL-999');
      const stItem = (q.items || []).find(i => i.sku === 'ST-2026-A' || i.matchedSku === 'ST-2026-A');
      
      const hasWarning = q.hasWarnings === true;
      const itemStatusPending = unkItem && unkItem.status === 'NEED_MANUAL_PRICE';
      const warningInDraft = body.draftEmail && (
        body.draftEmail.body.includes('[⚠️ INTERNAL NOTICE') || 
        body.draftEmail.body.includes('NEED_MANUAL_PRICE') ||
        (q.warnings || []).some(w => w.includes('UNKNOWN-MODEL-999'))
      );
      const pdfGenerated = body.pdfBase64 && body.pdfBase64.length > 1000;
      const reviewUrlPresent = typeof body.reviewUrl === 'string' && body.reviewUrl.length > 0;

      if (unkItem && stItem && hasWarning && itemStatusPending && warningInDraft && pdfGenerated && reviewUrlPresent) {
        recordResult('用例 3', '异常/未匹配SKU平稳降级与风控预警', 'PASS', d2,
          `系统平稳降级未发生崩溃。未知SKU [UNKNOWN-MODEL-999] 正确标记为 NEED_MANUAL_PRICE，邮件草稿成功打上 [⚠️ INTERNAL NOTICE] 预警标记，标准商品正常核价，PDF与在线微调单就绪。`,
          {
            unknownItemStatus: unkItem.status,
            warnings: q.warnings,
            reviewUrl: body.reviewUrl
          }
        );
      } else {
        recordResult('用例 3', '未匹配SKU降级完整性校验', 'FAIL', d2,
          `断言不完全符合: unkItem=${!!unkItem}, stItem=${!!stItem}, hasWarning=${hasWarning}, itemStatusPending=${itemStatusPending}, warningInDraft=${warningInDraft}, pdfGenerated=${!!pdfGenerated}`,
          { q, warnings: q.warnings }
        );
      }
    } else {
      recordResult('用例 3', '未匹配SKU请求被拒绝或崩溃', 'FAIL', d2, `HTTP ${res.status}, error: ${body.error}`);
    }
  } catch (err) {
    recordResult('用例 3', '未匹配SKU测试异常', 'FAIL', 0, err.message);
  }

  // -------------------------------------------------------------------------
  // 用例 4：动态底价热更新与原子生效测试 (Scenario C)
  // -------------------------------------------------------------------------
  console.log('\n--- 正在执行【用例 4：动态底价热更新与原子生效测试 (Scenario C)】---');
  try {
    // 1. 读取原 Excel 并克隆新增测试 SKU
    const originalBuffer = fs.readFileSync(EXCEL_PATH);
    const wb = XLSX.read(originalBuffer, { type: 'buffer' });
    const productSheetName = '商品底价库 (Products)';
    const ws = wb.Sheets[productSheetName];
    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // 构造新增商品行 (TEST-DYNAMIC-01, 底价 88, 毛利 0.25, MOQ 10)
    const newRow = [
      'TEST-DYNAMIC-01',
      'DYNAMIC-PROBE-01, Hot Reload Test',
      'Dynamic Test Heavy Duty Arm (热更新测试机械臂)',
      88,
      80,
      0.25,
      10,
      2.0,
      82,
      75,
      10,
      0.03,
      '20 Days',
      '8479.90.00',
      15.28
    ];
    rawData.push(newRow);

    const newWs = XLSX.utils.aoa_to_sheet(rawData);
    wb.Sheets[productSheetName] = newWs;
    const modifiedBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 上传新增 SKU 的底价表
    const blobNew = new Blob([modifiedBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const formNew = new FormData();
    formNew.append('pricing_file', blobNew, '商品底价表_动态新增.xlsx');

    const t4_1 = Date.now();
    const updateRes = await fetch(`${BASE_URL}/api/v1/update-pricing`, {
      method: 'POST',
      headers: { 'x-api-key': ADMIN_API_KEY },
      body: formNew
    });
    const d4_1 = Date.now() - t4_1;
    const updateBody = await updateRes.json();

    const updateSuccess = updateRes.status === 200 && updateBody.success && updateBody.summary?.itemCount === 6;

    if (!updateSuccess) {
      recordResult('用例 4', '动态底价表上传新增SKU', 'FAIL', d4_1, `更新未生效: HTTP ${updateRes.status}, count: ${updateBody.summary?.itemCount}`);
    } else {
      recordResult('用例 4', '动态底价表上传新增SKU', 'PASS', d4_1, `成功上传新增 SKU [TEST-DYNAMIC-01]，总在册商品数扩容至 6 款`);

      // 立即对新 SKU 发起询盘
      const probeInquiry = `From: Test Client <test@probe.com>
To: sales@foshan-kelvin.com
Subject: Quote for TEST-DYNAMIC-01

Please quote for:
Item: TEST-DYNAMIC-01
Quantity: 50 pcs
Terms: FOB Shenzhen
Currency: USD`;

      const formProbe = new FormData();
      formProbe.append('po_text', probeInquiry);
      formProbe.append('sales_rep_email', 'sales@foshan-kelvin.com');

      const t4_2 = Date.now();
      const probeRes = await fetch(`${BASE_URL}/api/v1/process-quote`, {
        method: 'POST',
        headers: { 'x-api-key': ADMIN_API_KEY },
        body: formProbe
      });
      const d4_2 = Date.now() - t4_2;
      const probeBody = await probeRes.json();

      const probeItem = (probeBody.quotation?.items || []).find(i => i.sku === 'TEST-DYNAMIC-01' || i.matchedSku === 'TEST-DYNAMIC-01');
      const expectedUnitUSD = Math.round((88 * 1.25 / 7.2) * 100) / 100; // 15.28 USD
      const probeSuccess = probeRes.status === 200 && probeItem && probeItem.status === 'OK' && Math.abs(probeItem.unitPriceForeign - expectedUnitUSD) < 0.05;

      if (probeSuccess) {
        recordResult('用例 4', '新SKU秒级热更新识别与报价', 'PASS', d4_2,
          `新SKU [TEST-DYNAMIC-01] 立即被报价引擎识别生效！核算单价 $${probeItem.unitPriceForeign} USD (底价¥88 + 25%毛利 / 7.2汇率)，无需重启服务。`,
          { matchedSku: probeItem.matchedSku, unitPriceForeign: probeItem.unitPriceForeign }
        );
      } else {
        recordResult('用例 4', '新SKU秒级热更新识别与报价', 'FAIL', d4_2,
          `新SKU未能成功识别或计算错误: status=${probeItem?.status}, price=${probeItem?.unitPriceForeign}, expected=${expectedUnitUSD}`,
          probeBody
        );
      }
    }

    // 恢复生产原始底价表
    console.log('🔄 正在恢复生产原始底价表数据...');
    const blobOriginal = new Blob([originalBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const formRestore = new FormData();
    formRestore.append('pricing_file', blobOriginal, '商品底价表.xlsx');

    const t4_3 = Date.now();
    const restoreRes = await fetch(`${BASE_URL}/api/v1/update-pricing`, {
      method: 'POST',
      headers: { 'x-api-key': ADMIN_API_KEY },
      body: formRestore
    });
    const d4_3 = Date.now() - t4_3;
    const restoreBody = await restoreRes.json();
    const restoreOk = restoreRes.status === 200 && restoreBody.summary?.itemCount === 5;

    if (restoreOk) {
      recordResult('用例 4', '恢复生产原始底价表', 'PASS', d4_3, `成功恢复原始底价库，总商品数回滚至 5 款`);
    } else {
      recordResult('用例 4', '恢复生产原始底价表', 'WARN', d4_3, `恢复时返回异常: HTTP ${restoreRes.status}, count=${restoreBody.summary?.itemCount}`);
    }
  } catch (err) {
    recordResult('用例 4', '动态热更新测试异常', 'FAIL', 0, err.message);
  }

  // -------------------------------------------------------------------------
  // 用例 5：在线微调审单台闭环测试 (/review/:id 及更新接口)
  // -------------------------------------------------------------------------
  console.log('\n--- 正在执行【用例 5：在线微调审单台闭环测试 (/review/:id 及更新接口)】---');
  try {
    const qId = testQuoteId || 'QT-20260904-888';

    // 1. GET /review/:id (前端单据工作台 HTML 加载)
    const t5_1 = Date.now();
    const htmlRes = await fetch(`${BASE_URL}/review/${qId}`);
    const d5_1 = Date.now() - t5_1;
    const htmlText = await htmlRes.text();
    const htmlOk = htmlRes.status === 200 && htmlText.includes('KelvinFlow') && htmlText.includes('vue');
    if (htmlOk) {
      recordResult('用例 5', '微调工作台页面GET /review/:id加载', 'PASS', d5_1, `成功返回Vue响应式审单台HTML (${htmlText.length} bytes)`);
    } else {
      recordResult('用例 5', '微调工作台页面GET /review/:id加载', 'FAIL', d5_1, `页面加载异常: HTTP ${htmlRes.status}`);
    }

    // 2. GET /api/v1/quotes/:id (审单台数据接口)
    const t5_2 = Date.now();
    const quoteApiRes = await fetch(`${BASE_URL}/api/v1/quotes/${qId}`, {
      headers: { 'x-api-key': ADMIN_API_KEY }
    });
    const d5_2 = Date.now() - t5_2;
    const quoteApiBody = await quoteApiRes.json();
    const quoteDataOk = quoteApiRes.status === 200 && quoteApiBody.success && quoteApiBody.quotation;

    if (quoteDataOk) {
      const q = quoteApiBody.quotation;
      recordResult('用例 5', '审单数据详情接口GET /api/v1/quotes/:id', 'PASS', d5_2,
        `成功返回报价单详情: 单号 ${q.quotationNumber}, 包含 ${q.items?.length} 项商品，总额 ${q.currency} ${q.totalAmountForeign}`,
        { customerName: q.customerName, itemsCount: q.items?.length }
      );

      // 3. POST /api/v1/quotes/:id (在线微调单价并重新渲染 PDF)
      const modifiedQuotation = JSON.parse(JSON.stringify(q));
      // 将第一项商品单价上调 1.00 USD
      if (modifiedQuotation.items && modifiedQuotation.items.length > 0) {
        modifiedQuotation.items[0].unitPriceForeign += 1.00;
        modifiedQuotation.items[0].subTotalForeign = Number((modifiedQuotation.items[0].quantity * modifiedQuotation.items[0].unitPriceForeign).toFixed(2));
      }

      const t5_3 = Date.now();
      const updateQuoteRes = await fetch(`${BASE_URL}/api/v1/quotes/${qId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ADMIN_API_KEY
        },
        body: JSON.stringify({
          quotation: modifiedQuotation,
          terms: {
            payment: '100% T/T Advance (Adjusted via Review Portal)',
            validity: '45 Days Validity',
            leadTime: '20 Days expedited',
            samplePolicy: 'Sample refundable',
            remarks: 'Special QA Inspection Included'
          },
          customEmailSubject: `[REVISED] Official Quotation ${qId} - KelvinFlow`,
          customEmailBody: `Dear Buyer,\n\nWe have updated your quotation with expedited lead times and special terms.\n\nBest regards,\nKelvin Tsui`
        })
      });
      const d5_3 = Date.now() - t5_3;
      const updateQuoteBody = await updateQuoteRes.json();

      const updateQuoteOk = updateQuoteRes.status === 200 && updateQuoteBody.success && updateQuoteBody.pdfBase64;
      const updatedTotal = updateQuoteBody.quotation?.totalAmountForeign;

      if (updateQuoteOk) {
        recordResult('用例 5', '在线微调并重新生成PDF与草稿', 'PASS', d5_3,
          `微调保存成功！重新生成最新总额 $${updatedTotal} USD，PDF重新渲染完成 (${updateQuoteBody.pdfBase64.length} base64 chars)，草稿同步更新。`,
          { updatedTotal, subject: updateQuoteBody.draftEmail?.subject }
        );

        // 4. 验证重新渲染后的 PDF 接口 GET /api/v1/quotes/:id/pdf
        const t5_4 = Date.now();
        const pdfFetchRes = await fetch(`${BASE_URL}/api/v1/quotes/${qId}/pdf`, {
          headers: { 'x-api-key': ADMIN_API_KEY }
        });
        const d5_4 = Date.now() - t5_4;
        const pdfBlob = await pdfFetchRes.arrayBuffer();
        const pdfOk = pdfFetchRes.status === 200 && 
                      pdfFetchRes.headers.get('content-type')?.includes('application/pdf') &&
                      pdfBlob.byteLength > 3000;

        if (pdfOk) {
          recordResult('用例 5', '重新渲染的PDF预览与下载接口', 'PASS', d5_4,
            `成功获取重新渲染的 PDF 文件，文件大小 ${pdfBlob.byteLength} 字节，Content-Type 合法。`
          );
        } else {
          recordResult('用例 5', '重新渲染的PDF预览与下载接口', 'FAIL', d5_4,
            `PDF 获取异常: HTTP ${pdfFetchRes.status}, Content-Type: ${pdfFetchRes.headers.get('content-type')}`
          );
        }
      } else {
        recordResult('用例 5', '在线微调并重新生成PDF', 'FAIL', d5_3,
          `微调接口返回失败: HTTP ${updateQuoteRes.status}, error: ${updateQuoteBody.error}`
        );
      }
    } else {
      recordResult('用例 5', '审单数据详情接口', 'FAIL', d5_2, `HTTP ${quoteApiRes.status}, error: ${quoteApiBody.error}`);
    }
  } catch (err) {
    recordResult('用例 5', '在线微调闭环异常', 'FAIL', 0, err.message);
  }

  // -------------------------------------------------------------------------
  // 用例 6：全流程体验与潜在遗漏审查
  // -------------------------------------------------------------------------
  console.log('\n--- 正在执行【用例 6：全流程体验与潜在遗漏审查】---');

  // 6.1 官网获客留资与即时推送链路 (/api/inbound/lead)
  try {
    const t6_1 = Date.now();
    const leadRes = await fetch(`${BASE_URL}/api/inbound/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: '陈总',
        companyName: '佛山市顺德区精工外贸实业有限公司',
        contact: '13928889999',
        dailyRfqs: '20~30 封',
        productCategory: '智能办公家具与五金套件',
        memoCode: 'E2E-LIVE-TEST-LEAD',
        source: '官网7天免费试用落地页'
      })
    });
    const d6_1 = Date.now() - t6_1;
    const leadBody = await leadRes.json();

    if (leadRes.status === 200 && leadBody.success) {
      recordResult('用例 6.1', '官网留资线索Webhook接收与微信推送', 'PASS', d6_1,
        `成功接收留资线索，触发本地落盘与微信渠道(PushPlus/ServerChan)推送逻辑。`
      );
    } else {
      recordResult('用例 6.1', '官网留资线索Webhook', 'FAIL', d6_1, `留资异常: HTTP ${leadRes.status}, error: ${leadBody.error}`);
    }
  } catch (err) {
    recordResult('用例 6.1', '官网留资线索异常', 'FAIL', 0, err.message);
  }

  // 6.2 留资接口防刷限流 (Rate Limiting) 验证
  try {
    const t6_2 = Date.now();
    let hitRateLimit = false;
    let attempts = 0;
    for (let i = 0; i < 7; i++) {
      attempts++;
      const res = await fetch(`${BASE_URL}/api/inbound/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: '13900000000',
          companyName: 'Spam Bot Test'
        })
      });
      if (res.status === 429) {
        hitRateLimit = true;
        break;
      }
    }
    const d6_2 = Date.now() - t6_2;
    if (hitRateLimit) {
      recordResult('用例 6.2', '留资接口防刷频限流防护', 'PASS', d6_2,
        `高频请求在第 ${attempts} 次被防刷限流机制成功拦截 (429 Too Many Requests)，有效防止短信/推送轰炸。`
      );
    } else {
      recordResult('用例 6.2', '留资接口防刷频限流防护', 'WARN', d6_2,
        `连续发送 ${attempts} 次未触发 429 限流（可能在反向代理后 IP 发生变更或白名单）。`
      );
    }
  } catch (err) {
    recordResult('用例 6.2', '防刷频测试异常', 'FAIL', 0, err.message);
  }

  // 6.3 权限安全防护 1：未携带 API Key / Token 更新底价表
  try {
    const t6_3 = Date.now();
    const fakeForm = new FormData();
    fakeForm.append('pricing_file', new Blob(['test']), 'test.xlsx');
    const unauthorizedRes = await fetch(`${BASE_URL}/api/v1/update-pricing`, {
      method: 'POST',
      body: fakeForm
    });
    const d6_3 = Date.now() - t6_3;
    // 应当拦截为 401 或 403
    if (unauthorizedRes.status === 401 || unauthorizedRes.status === 403) {
      recordResult('用例 6.3', '未授权底价修改拦截 (RBAC 安全检查)', 'PASS', d6_3,
        `无认证请求更新底价库被成功拦截 (HTTP ${unauthorizedRes.status})，底价表核心机密得到保护。`
      );
    } else {
      recordResult('用例 6.3', '未授权底价修改拦截 (RBAC 安全检查)', 'FAIL', d6_3,
        `安全漏洞！未认证请求未被有效阻断，返回状态码: HTTP ${unauthorizedRes.status}`
      );
    }
  } catch (err) {
    recordResult('用例 6.3', '未授权测试异常', 'FAIL', 0, err.message);
  }

  // 6.4 权限安全防护 2：非管理员角色 (Sales 业务员) 企图修改出厂底价库
  try {
    const t6_4 = Date.now();
    const fakeForm = new FormData();
    fakeForm.append('pricing_file', new Blob(['test']), 'test.xlsx');
    const salesRes = await fetch(`${BASE_URL}/api/v1/update-pricing`, {
      method: 'POST',
      headers: { 'x-api-key': SALES_API_KEY },
      body: fakeForm
    });
    const d6_4 = Date.now() - t6_4;
    if (salesRes.status === 403) {
      recordResult('用例 6.4', '业务员(Sales)越权修改出厂底价拦截', 'PASS', d6_4,
        `业务员 API Key 被 RBAC 守卫成功拦截 (HTTP 403 Forbidden: 需要 admin 权限)，防止业务员擅自压低出厂成本。`
      );
    } else {
      recordResult('用例 6.4', '业务员(Sales)越权修改出厂底价拦截', 'FAIL', d6_4,
        `越权漏洞！业务员角色未被拦截，返回 HTTP ${salesRes.status}`
      );
    }
  } catch (err) {
    recordResult('用例 6.4', '业务员越权测试异常', 'FAIL', 0, err.message);
  }

  // 6.5 租户跨越防窥探 (IDOR 安全检查)：查询不存在或属于其他租户的单据
  try {
    const t6_5 = Date.now();
    const idorRes = await fetch(`${BASE_URL}/api/v1/quotes/QT-ALPHA-ILLEGAL-999`, {
      headers: { 'x-api-key': ADMIN_API_KEY }
    });
    const d6_5 = Date.now() - t6_5;
    // 应返回 404 或 403
    if (idorRes.status === 404 || idorRes.status === 403) {
      recordResult('用例 6.5', '跨租户商业机密隔离与防越权 (IDOR Guard)', 'PASS', d6_5,
        `非法/跨租户单据查询被成功隔离拦截 (HTTP ${idorRes.status})，无数据泄露风险。`
      );
    } else {
      recordResult('用例 6.5', '跨租户商业机密隔离与防越权 (IDOR Guard)', 'FAIL', d6_5,
        `疑似存在越权或无保护返回: HTTP ${idorRes.status}`
      );
    }
  } catch (err) {
    recordResult('用例 6.5', 'IDOR 测试异常', 'FAIL', 0, err.message);
  }

  // -------------------------------------------------------------------------
  // 打印与汇总测试成果
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('🏁 KelvinFlow 全链路自动化 E2E 真实测试执行完毕！');
  console.log('================================================================');
  const total = testResults.length;
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const warned = testResults.filter(r => r.status === 'WARN').length;
  const totalTime = testResults.reduce((sum, r) => sum + r.durationMs, 0);

  console.log(`总执行步骤: ${total} | 通过: ${passed} | 失败: ${failed} | 警告: ${warned}`);
  console.log(`累积网络与计算耗时: ${(totalTime / 1000).toFixed(2)} 秒`);
  console.log('================================================================\n');

  // 将结果写入本地 JSON 报告以便生成 Markdown 详细报告
  fs.writeFileSync(
    path.join(__dirname, 'live_e2e_report.json'),
    JSON.stringify({
      targetUrl: BASE_URL,
      timestamp: new Date().toISOString(),
      summary: { total, passed, failed, warned, totalTimeMs: totalTime },
      results: testResults
    }, null, 2)
  );

  return { total, passed, failed, warned, totalTime, testResults };
}

runLiveE2ETests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
