const assert = require('assert');

async function testMuse16Logic() {
  console.log('--- 开始验证 Muse 16 邮件结构与称呼中性化 ---');
  const { cleanExporterCompanyName, cleanSalesRepName, PDFService } = await import('../dist/services/pdf.service.js');
  const { InboundProcessorService } = await import('../dist/services/inbound-processor.service.js');
  const { TenantService } = await import('../dist/services/tenant.service.js');
  const { DraftService } = await import('../dist/services/draft.service.js');

  // 1. 测试 cleanExporterCompanyName
  const cleanedComp = cleanExporterCompanyName('外贸同行 Global Trading Co., Ltd.');
  console.log('cleanedComp:', cleanedComp);
  assert.strictEqual(cleanedComp, 'Global Trading Co., Ltd.');

  // 2. 测试 cleanSalesRepName
  const cleanedRep1 = cleanSalesRepName('外贸同行');
  console.log('cleanedRep1 (外贸同行):', `"${cleanedRep1}"`);
  assert.strictEqual(cleanedRep1, '');

  const cleanedRep2 = cleanSalesRepName('Kelvin Tsui');
  console.log('cleanedRep2 (Kelvin Tsui):', `"${cleanedRep2}"`);
  assert.strictEqual(cleanedRep2, 'Kelvin Tsui');

  // 3. 截获 DraftService.sendReviewEmail 验证待审出单邮件结构与内容
  let capturedEmail = null;
  const originalSendReviewEmail = DraftService.sendReviewEmail;
  DraftService.sendReviewEmail = async (params) => {
    capturedEmail = params;
    return { sent: true, mode: 'test_mock' };
  };

  try {
    const testTenantId = 'tenant_p32_test_' + Date.now();
    // 租户配置为带有占位符与中文的企业资料
    TenantService.updateTenantProfile(testTenantId, {
      companyName: '外贸同行 Global Trading Co., Ltd.',
      managerName: '外贸同行',
      contactEmail: 'sales@p32-test.com'
    });

    const inboundResult = await InboundProcessorService.processInboundInquiry({
      tenantId: testTenantId,
      from: 'buyer@european-client.com',
      to: `rfq-${testTenantId}@quote.kelvinflow.com`,
      subject: 'Inquiry for Ergonomic Chairs',
      text: 'Please quote 500 pcs ST-2026-A FOB Shenzhen.'
    });

    console.log('Inbound result quotationNumber:', inboundResult.quotationNumber);
    assert(capturedEmail !== null, '必须触发并捕获到待审出单邮件');
    
    console.log('\n--- 捕获到的邮件主题 ---');
    console.log(capturedEmail.subject);
    
    console.log('\n--- 捕获到的邮件正文 ---');
    console.log(capturedEmail.text);

    const emailBody = capturedEmail.text;

    // 验证项 1: 问候语为中性 "您好："
    assert(emailBody.startsWith('您好：\n\n'), '待审出单邮件必须以中性“您好：”开头');
    assert(!emailBody.includes('您好 外贸同行：'), '待审出单邮件绝对不能包含“您好 外贸同行：”');
    assert(!emailBody.includes('您好 外贸业务员：'), '待审出单邮件绝对不能包含“您好 外贸业务员：”');

    // 验证项 2: 英文签名无 "外贸同行" 人名，只保留公司名
    assert(!emailBody.includes('Best regards,\n外贸同行'), '英文回信签名绝不能出现人名外贸同行');
    assert(emailBody.includes('Best regards,\nGlobal Trading Co., Ltd.'), '英文回信签名必须为经 ASCII 处理后的公司名');

    // 验证项 3: 邮件结构重排 (前为英文回信，后为内部审单信息，以分隔符隔离)
    const separator = '⛔ 以下为内部审单信息，请勿转发给客户 ⛔';
    assert(emailBody.includes(separator), '邮件正文必须包含严密防转发分隔符');

    const [forwardablePart, internalPart] = emailBody.split(separator);
    assert(forwardablePart.includes('Dear Valued Customer') || forwardablePart.includes('Dear buyer') || forwardablePart.includes('Dear '), '转发区必须包含正式英文回信正文');
    assert(forwardablePart.includes('Best regards,\nGlobal Trading Co., Ltd.'), '转发区必须以公司签名结尾');
    assert(!forwardablePart.includes('【单据概览】'), '转发区绝对不能泄露内部【单据概览】');
    assert(!forwardablePart.includes('汇率基准'), '转发区绝对不能泄露【汇率基准】');
    assert(!forwardablePart.includes('✂️'), '转发区绝对不能出现【✂️内部审单台】');
    assert(!forwardablePart.includes('AI 综合置信度'), '转发区绝对不能泄露【AI 综合置信度】');

    assert(internalPart.includes('【单据概览】'), '内部区必须包含【单据概览】');
    assert(internalPart.includes('汇率基准'), '内部区必须包含【汇率基准】');
    assert(internalPart.includes('【在线微调审单链接】'), '内部区必须包含【在线微调审单链接】');
    assert(internalPart.includes('✂️'), '内部区必须包含【✂️内部审单台】');

    console.log('✅ 待审出单邮件结构与中性称呼验证全部通过！');

    // 4. 验证附件 PDF 中 Export Manager
    assert(capturedEmail.attachments && capturedEmail.attachments.length > 0, '邮件必须附带 PDF 报价单');
    const pdfAttachment = capturedEmail.attachments[0];
    const pdfRawText = pdfAttachment.content.toString('binary');
    
    // PDF 不得包含乱码或中文 Export Manager
    assert(!pdfRawText.includes('Export Manager: 外贸同行'), 'PDF 绝不能包含中文 Export Manager');
    assert(!pdfRawText.includes('Export Director: 外贸同行'), 'PDF 绝不能包含中文 Export Director');

    console.log('✅ PDF 业务员中性化与防乱码验证全部通过！');

  } finally {
    DraftService.sendReviewEmail = originalSendReviewEmail;
  }
}

testMuse16Logic().catch(err => {
  console.error('❌ 验证失败:', err);
  process.exit(1);
});
