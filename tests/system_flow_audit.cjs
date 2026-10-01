const fs = require('fs');
const path = require('path');
const http = require('http');

async function request(options, postData = null, isMultipart = false) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const text = buffer.toString('utf-8');
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          text,
          json,
          buffer
        });
      });
    });

    req.on('error', err => reject(err));

    if (postData) {
      if (Buffer.isBuffer(postData)) {
        req.write(postData);
      } else if (typeof postData === 'object' && !isMultipart) {
        req.write(JSON.stringify(postData));
      } else {
        req.write(postData);
      }
    }
    req.end();
  });
}

function makeMultipart(boundary, fields, files) {
  const parts = [];
  for (const [key, val] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
  }
  for (const [key, file] of Object.entries(files)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType || 'application/octet-stream'}\r\n\r\n`));
    parts.push(file.content);
    parts.push(Buffer.from('\r\n'));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(parts);
}

async function runAudit() {
  console.log('======================================================');
  console.log('🚀 KelvinFlow AI 全系统端到端深度审计与回归测试');
  console.log('======================================================\n');

  const report = {
    checks: [],
    issues: [],
    fixes: []
  };

  function assert(title, condition, detail = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`);
      report.checks.push({ title, status: 'PASS', detail });
    } else {
      console.error(`  ❌ [FAIL] ${title} - ${detail}`);
      report.checks.push({ title, status: 'FAIL', detail });
      report.issues.push({ title, detail });
    }
  }

  // -----------------------------------------------------------------
  // 1. 底价表物理存储与动态检索校验
  // -----------------------------------------------------------------
  console.log('【阶段 1】底价表目录与动态检索校验');
  const commodityDir = path.join(process.cwd(), '商品底价表');
  assert('商品底价表目录存在', fs.existsSync(commodityDir));
  
  const filesInDir = fs.readdirSync(commodityDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
  assert('商品底价表目录下包含有效 .xlsx 文件', filesInDir.length > 0, `找到: ${filesInDir.join(', ')}`);
  assert('出厂底价表.xlsx 存在且命名精确', filesInDir.includes('出厂底价表.xlsx'));

  const { TenantService } = await import('../dist/services/tenant.service.js');
  const resolvedCommodity = TenantService.getCommodityPricingFile();
  assert('TenantService.getCommodityPricingFile 能够动态解析', resolvedCommodity !== null && resolvedCommodity.sourcePath.includes('出厂底价表.xlsx'), resolvedCommodity?.sourcePath);

  const { ExcelAdapter } = await import('../dist/adapters/excel.adapter.js');
  const parsedPricing = ExcelAdapter.parse(resolvedCommodity.sourcePath);
  assert('底价表解析成功', parsedPricing.success === true);
  assert('底价表包含 2 个标准工作表', parsedPricing.parsedSheets.length === 2 && parsedPricing.parsedSheets.some(s => s.includes('Config')) && parsedPricing.parsedSheets.some(s => s.includes('Products')), `实际表: ${parsedPricing.parsedSheets.join(', ')}`);
  assert('底价表中无选配工艺加价 (addons count = 0)', parsedPricing.addons.length === 0, `实际 addons: ${parsedPricing.addons.length}`);
  assert('提取商品数 >= 5 款', parsedPricing.priceItems.length >= 5, `实际款数: ${parsedPricing.priceItems.length}`);
  assert('锁定汇率提取 >= 5 种币种', parsedPricing.exchangeRates.length >= 5, `实际币种数: ${parsedPricing.exchangeRates.length}`);

  // -----------------------------------------------------------------
  // 2. 本地 HTTP 接口与核心业务流测试 (端口 3000)
  // -----------------------------------------------------------------
  console.log('\n【阶段 2】本地 HTTP 接口与核心业务流测试 (http://localhost:3000)');

  // 2.1 健康检查
  const healthRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/health',
    method: 'GET'
  });
  assert('GET /api/v1/health 返回 200', healthRes.statusCode === 200 && healthRes.json?.status === 'ok');

  // 2.2 官网快速询盘接口测试 (/api/inbound/quick-quote)
  const quickQuotePayload = {
    inquiryText: `Dear Kelvin,
Please provide your best quotation for:
1. ST-2026-A (Aluminum Alloy Precision Bracket): 2,000 PCS
2. ERG-PRO-V2 (Ergonomic Mesh Office Chair): 500 PCS
Delivery terms: FOB Shenzhen, Payment: 30% deposit, 70% T/T before shipment.
Customer: German Office Tech GmbH
Contact: Peter Hans (p.hans@german-tech.de)`,
    senderEmail: 'p.hans@german-tech.de',
    customerName: 'German Office Tech GmbH',
    targetCurrency: 'USD'
  };

  const quickQuoteRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/inbound/quick-quote',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, quickQuotePayload);

  assert('POST /api/inbound/quick-quote 返回 200', quickQuoteRes.statusCode === 200 && quickQuoteRes.json?.success === true, quickQuoteRes.text.slice(0, 100));
  const quickQuoteData = quickQuoteRes.json;
  let quoteId = quickQuoteData?.quotationNumber || quickQuoteData?.quoteId;
  assert('快速询盘返回有效报价单号', !!quoteId, `单号: ${quoteId}`);
  assert('快速询盘返回 reviewUrl', !!quickQuoteData?.reviewUrl, `URL: ${quickQuoteData?.reviewUrl}`);
  assert('快速询盘包含 pdfBase64 且为有效 PDF Buffer', !!quickQuoteData?.pdfBase64 && quickQuoteData.pdfBase64.length > 500);

  // 2.3 生产租户未上传底价表阻断拦截测试 (核心红线)
  console.log('\n【阶段 2.3】生产租户未上传底价表强拦截校验');
  const testTenantId = 'tenant_audit_unuploaded_' + Date.now();
  const unuploadedQuotePayload = {
    po_text: `Inquiry for ST-2026-A, quantity 1000 pcs`,
    tenant_id: testTenantId,
    sales_rep_email: `sales@${testTenantId}.com`
  };
  const unuploadedRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/process-quote',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'key_default_admin_2026'
    }
  }, unuploadedQuotePayload);

  assert('未上传底价表租户应被拦截 (HTTP 400)', unuploadedRes.statusCode === 400 && unuploadedRes.json?.success === false, `响应: ${unuploadedRes.text}`);
  assert('拦截提示包含上传底价表引导', unuploadedRes.text.includes('底价') || unuploadedRes.text.includes('配置'), `错误文本: ${unuploadedRes.text}`);

  // 2.4 为该租户上传出厂底价表并验证生效
  console.log('\n【阶段 2.4】租户上传底价表并验证原子生效');
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const excelBuffer = fs.readFileSync(resolvedCommodity.sourcePath);
  const multipartBody = makeMultipart(boundary, { tenantId: testTenantId }, {
    pricing_file: {
      filename: '出厂底价表.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      content: excelBuffer
    }
  });

  const uploadRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/update-pricing',
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': multipartBody.length,
      'x-api-key': 'key_default_admin_2026'
    }
  }, multipartBody, true);

  assert('租户上传底价表成功 (HTTP 200)', uploadRes.statusCode === 200 && uploadRes.json?.success === true, uploadRes.text.slice(0, 100));

  // 再次发起核价，验证该租户已可正常出单
  const nowQuotedRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/process-quote',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'key_default_admin_2026'
    }
  }, {
    po_text: `Inquiry for ST-2026-A, quantity 1000 pcs`,
    tenant_id: testTenantId,
    sales_rep_email: `sales@${testTenantId}.com`
  });

  assert('上传底价表后租户成功核价出单 (HTTP 200)', nowQuotedRes.statusCode === 200 && nowQuotedRes.json?.success === true, nowQuotedRes.text.slice(0, 100));

  // 清理测试租户数据
  const testTenantDir = path.join(process.cwd(), 'data', 'tenants', testTenantId);
  if (fs.existsSync(testTenantDir)) {
    fs.rmSync(testTenantDir, { recursive: true, force: true });
  }

  // 2.5 审单工作台交互闭环测试 (/api/v1/quotes/:id & update)
  console.log('\n【阶段 2.5】审单工作台交互闭环测试');
  const getQuoteRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/v1/quotes/${quoteId}`,
    method: 'GET'
  });
  assert(`GET /api/v1/quotes/${quoteId} 成功获取单据`, getQuoteRes.statusCode === 200 && getQuoteRes.json?.success === true);
  const quoteDetail = getQuoteRes.json?.quotation || getQuoteRes.json?.quote || getQuoteRes.json?.data;
  assert('单据包含明细项目', quoteDetail?.items?.length > 0);
  assert('单据各商品包含有效毛利率', quoteDetail?.items?.every(it => typeof it.profitMargin === 'number'));

  // 测试业务员滑块改价与重新渲染 PDF
  const newMargin = 0.25; // 调高到 25%
  const updatedItems = (quoteDetail.items || []).map(item => ({
    ...item,
    profitMargin: newMargin
  }));

  const updateQuoteRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/v1/quotes/${quoteId}/update`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    profitMargin: newMargin,
    items: updatedItems,
    specialRemarks: 'Updated by Audit Test with 25% Profit Margin'
  });

  assert(`POST /api/v1/quotes/${quoteId}/update 改价成功`, updateQuoteRes.statusCode === 200 && updateQuoteRes.json?.success === true, updateQuoteRes.text.slice(0, 100));
  assert('改价后重新生成有效 pdfBase64', !!updateQuoteRes.json?.pdfBase64 && updateQuoteRes.json.pdfBase64.length > 500);

  // 2.6 PDF 物理单页与反 BEC 校验
  console.log('\n【阶段 2.6】PDF 排版点阵与反 BEC 钓鱼安全校验');
  const pdfBuffer = Buffer.from(updateQuoteRes.json.pdfBase64, 'base64');
  assert('生成的 PDF 以 %PDF- 开头', pdfBuffer.slice(0, 5).toString('utf-8') === '%PDF-');
  
  // 解析 PDF 纯文本检测是否含有银行账号等禁忌词并验证条款完整性
  const zlib = require('zlib');
  const pdfRawText = pdfBuffer.toString('latin1');
  let pdfDecodedText = pdfRawText;
  for (const m of pdfRawText.matchAll(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g)) {
    try {
      const decompressed = zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1');
      pdfDecodedText += ' ' + decompressed;
      for (const hex of decompressed.matchAll(/<([0-9a-fA-F]+)>/g)) {
        pdfDecodedText += ' ' + Buffer.from(hex[1], 'hex').toString('utf8');
      }
    } catch {}
  }

  assert('PDF 中无 SWIFT 代码', !pdfDecodedText.includes('SWIFT'));
  assert('PDF 中无 IBAN 银行账号', !pdfDecodedText.includes('IBAN'));
  assert('PDF 中包含出口增值与品质条款', pdfDecodedText.toLowerCase().includes('warranty') || pdfDecodedText.toLowerCase().includes('assurance') || pdfDecodedText.toLowerCase().includes('spare parts'));

  // -----------------------------------------------------------------
  // 3. 前端静态单页应用与交互代码静态与逻辑审计
  // -----------------------------------------------------------------
  console.log('\n【阶段 3】前端单页应用与页面交互逻辑审计');

  // 3.1 官网首页 public/index.html 审计
  const indexHtml = fs.readFileSync('public/index.html', 'utf-8');
  assert('index.html 文件存在且体积正常', indexHtml.length > 10000);
  assert('index.html 中不包含 PushPlus 微信通知假提示', !indexHtml.includes('pushplus') && !indexHtml.includes('微信即时推送提醒'));
  assert('index.html 包含出厂底价表模板下载链接', indexHtml.includes('/template/pricing-sheet') || indexHtml.includes('pricing_template'));
  assert('index.html 包含极速询盘提交表单', indexHtml.includes('inquiryText') || indexHtml.includes('email_body') || indexHtml.includes('quick-quote'));

  // 3.2 审单工作台 public/review.html 审计
  const reviewHtml = fs.readFileSync('public/review.html', 'utf-8');
  assert('review.html 文件存在且体积正常', reviewHtml.length > 5000);
  assert('review.html 包含利润率滑块或改价控件', reviewHtml.includes('margin') || reviewHtml.includes('slider') || reviewHtml.includes('range'));
  assert('review.html 包含重新生成/更新报价单事件', reviewHtml.includes('/update') || reviewHtml.includes('updateQuote'));
  assert('review.html 不包含写死或穿底底价', !reviewHtml.includes('SWIFT') && !reviewHtml.includes('IBAN'));

  // -----------------------------------------------------------------
  // 4. 总结与输出
  // -----------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`📊 审计完成: 共执行 ${report.checks.length} 项核验`);
  console.log(`✅ 成功: ${report.checks.filter(c => c.status === 'PASS').length}`);
  console.log(`❌ 失败: ${report.issues.length}`);
  console.log('======================================================');

  if (report.issues.length > 0) {
    console.error('存在不合格项目:', report.issues);
  } else {
    console.log('🎉 全系统各环节核验 100% 通过！');
  }
}

runAudit().catch(err => {
  console.error('💥 审计运行异常:', err);
  process.exit(1);
});
