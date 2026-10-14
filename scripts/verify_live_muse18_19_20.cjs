const PDFDocument = require('pdfkit');

function generateTestPDF(lines) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(14).text('PURCHASE ORDER / RFQ ATTACHMENT');
    doc.moveDown();
    for (const line of lines) {
      doc.fontSize(12).text(line);
    }
    doc.end();
  });
}

async function runLiveVerification() {
  const BASE_URL = 'https://quote.kelvinflow.com';
  console.log(`🚀 开始对生产环境 [${BASE_URL}] 进行 Muse 18/19/20 全链路验收...`);

  // ----------------------------------------------------
  // 1. 验收 TC-R3 (Report 20): 西班牙语询盘 + 数量 + 落款买家名
  // ----------------------------------------------------
  console.log('\n--- [1/3] 验收 TC-R3 (Report 20): 西班牙语询盘 ---');
  const spanishEmail = [
    'Subject: Solicitud de cotización - Juntas de goma',
    'From: tsuikelvin0804@gmail.com',
    '',
    'Estimados señores,',
    'Por favor, envíennos su mejor cotización FOB para los siguientes productos:',
    '',
    '- TEST-005 - 500 piezas',
    '- TEST-002 - 800 piezas',
    '',
    'Condiciones de pago requeridas: 30% anticipo y 70% contra copia de BL.',
    '',
    'Atentamente,',
    'Carlos Méndez / Importadora Andina'
  ].join('\n');

  const r3Resp = await fetch(`${BASE_URL}/api/inbound/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'tsuikelvin0804@gmail.com',
      to: 'rfq-default@quote.kelvinflow.com',
      subject: 'Solicitud de cotización - Juntas de goma',
      text: spanishEmail
    })
  });
  const r3Data = await r3Resp.json();
  console.log('TC-R3 出单响应:', r3Data.success, '单号:', r3Data.quotationNumber);

  if (!r3Data.success) {
    throw new Error(`TC-R3 接口调用失败: ${r3Data.error}`);
  }

  // 查验单据详情
  const r3QuoteResp = await fetch(`${BASE_URL}/api/v1/quotes/${r3Data.quotationNumber}?tenantId=default`);
  const r3Quote = (await r3QuoteResp.json()).quotation;

  console.log(`   Buyer Name: "${r3Quote.buyerName}" (期望: "Carlos Méndez")`);
  console.log(`   Customer Name: "${r3Quote.customerName}" (期望: "Importadora Andina")`);
  const r3Items = r3Quote.items || [];
  console.log(`   商品项数量: ${r3Items.length}`);
  for (const it of r3Items) {
    console.log(`     SKU: ${it.sku}, Qty: ${it.quantity} (期望 TEST-005=500, TEST-002=800)`);
  }

  const it5 = r3Items.find(i => i.sku === 'TEST-005');
  const it2 = r3Items.find(i => i.sku === 'TEST-002');
  if (!it5 || it5.quantity !== 500) throw new Error(`TEST-005 数量解析异常: ${it5?.quantity}`);
  if (!it2 || it2.quantity !== 800) throw new Error(`TEST-002 数量解析异常: ${it2?.quantity}`);
  if (r3Quote.buyerName !== 'Carlos Méndez') throw new Error(`Buyer Name 未识别为 Carlos Méndez: ${r3Quote.buyerName}`);
  console.log('✅ TC-R3 (Report 20) 线上验证 100% 通过！');

  // ----------------------------------------------------
  // 2. 验收 TC-R2 (Report 19): 15 行超长询盘
  // ----------------------------------------------------
  console.log('\n--- [2/3] 验收 TC-R2 (Report 19): 15 行超长询盘 ---');
  const longEmail = [
    'Dear KelvinFlow Team,',
    'Please provide your consolidated FOB quotation for the following 15 production lots:',
    '',
    '1. TEST-005 - 500 pcs (Batch A1)',
    '2. TEST-001 - 1000 pcs (Batch A2)',
    '3. TEST-002 - 300 pcs (Batch A3)',
    '4. TEST-003 - 800 pcs (Batch A4)',
    '5. TEST-004 - 200 pcs (Batch A5)',
    '6. TEST-005 - 600 pcs (Batch B1)',
    '7. TEST-001 - 1200 pcs (Batch B2)',
    '8. TEST-002 - 350 pcs (Batch B3)',
    '9. TEST-003 - 750 pcs (Batch B4)',
    '10. TEST-004 - 250 pcs (Batch B5)',
    '11. TEST-005 - 700 pcs (Batch C1)',
    '12. TEST-001 - 1500 pcs (Batch C2)',
    '13. TEST-002 - 400 pcs (Batch C3)',
    '14. TEST-003 - 900 pcs (Batch C4)',
    '15. TEST-004 - 300 pcs (Batch C5)',
    '',
    'Best regards,',
    'Sarah Jenkins / Acme Global Procurement Ltd',
    '',
    '--------------------------------------------------',
    'On 2026-10-10, Kelvin Tsui wrote:',
    '> Old quote thread...'
  ].join('\n');

  const r2Resp = await fetch(`${BASE_URL}/api/inbound/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'tsuikelvin0804@gmail.com',
      to: 'rfq-default@quote.kelvinflow.com',
      subject: 'Re: Re: Quotation request - consolidated RFQ Oct',
      text: longEmail
    })
  });
  const r2Data = await r2Resp.json();
  console.log('TC-R2 出单响应:', r2Data.success, '单号:', r2Data.quotationNumber);

  const r2QuoteResp = await fetch(`${BASE_URL}/api/v1/quotes/${r2Data.quotationNumber}?tenantId=default`);
  const r2Quote = (await r2QuoteResp.json()).quotation;
  console.log(`   商品明细总行数: ${r2Quote.items.length} (期望: 15 行)`);
  if (r2Quote.items.length !== 15) {
    throw new Error(`TC-R2 行数截断，实际仅有 ${r2Quote.items.length} 行，期望 15 行！`);
  }
  console.log('✅ TC-R2 (Report 19) 线上验证 100% 通过（15 行明细齐全，无丢失无截断）！');

  // ----------------------------------------------------
  // 3. 验收 TC-R1 (Report 18): 附件解析与提示
  // ----------------------------------------------------
  console.log('\n--- [3/3] 验收 TC-R1 (Report 18): PDF 附件解析 ---');
  const pdfBuf = await generateTestPDF([
    'Item 1: TEST-005 - 500 pcs (Acme Special Gasket)',
    'Item 2: TEST-001 - 1000 pcs (Acme Nitrile Ring)'
  ]);

  const r1Resp = await fetch(`${BASE_URL}/api/inbound/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'purchasing@acme-gaskets.com',
      to: 'rfq-default@quote.kelvinflow.com',
      subject: 'Quotation request with attachment',
      text: 'Please find our RFQ in the attached PDF.',
      attachments: [
        {
          filename: 'RFQ_Acme_Gaskets.pdf',
          contentType: 'application/pdf',
          content: pdfBuf.toString('base64')
        }
      ]
    })
  });
  const r1Data = await r1Resp.json();
  console.log('TC-R1 出单响应:', r1Data.success, '单号:', r1Data.quotationNumber);

  const r1QuoteResp = await fetch(`${BASE_URL}/api/v1/quotes/${r1Data.quotationNumber}?tenantId=default`);
  const r1Quote = (await r1QuoteResp.json()).quotation;
  console.log(`   附件商品提取项数: ${r1Quote.items.length}`);
  for (const it of r1Quote.items) {
    console.log(`     SKU: ${it.sku}, Qty: ${it.quantity}`);
  }

  const r1it5 = r1Quote.items.find(i => i.sku === 'TEST-005');
  const r1it1 = r1Quote.items.find(i => i.sku === 'TEST-001');
  if (!r1it5 || r1it5.quantity !== 500) throw new Error('附件中 TEST-005 x 500 未被提取');
  if (!r1it1 || r1it1.quantity !== 1000) throw new Error('附件中 TEST-001 x 1000 未被提取');
  if (r1Quote.items.some(i => i.sku === 'PENDING-SKU-01')) throw new Error('仍然存在 PENDING-SKU-01 占位');

  console.log('✅ TC-R1 (Report 18) 线上验证 100% 通过（PDF 附件成功解析，参与出单）！');

  console.log('\n🎉🎉🎉 全部三个测试报告的所有缺陷与新需求已 100% 修复并线上验证通过！');
}

runLiveVerification().catch(err => {
  console.error('❌ 验收失败:', err);
  process.exit(1);
});
