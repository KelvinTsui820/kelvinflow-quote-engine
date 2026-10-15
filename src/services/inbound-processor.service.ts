import { GeminiAIService } from './gemini.service.js';
import { ExcelAdapter } from '../adapters/excel.adapter.js';
import { PricingService } from './pricing.service.js';
import { PDFService, cleanExporterCompanyName } from './pdf.service.js';
import { QuoteStoreService } from './quote-store.service.js';
import { TenantService } from './tenant.service.js';
import { DraftService } from './draft.service.js';
import { TrialService } from './trial.service.js';
import { AttachmentExtractorService } from './attachment-extractor.service.js';
import { InquiryService } from './inquiry.service.js';

export interface InboundEmailPayload {
  tenantId: string;
  from: string;
  to?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
  messageId?: string;
}

export interface InboundProcessResult {
  success: boolean;
  quotationNumber?: string;
  inquiryId?: string;
  reviewUrl?: string;
  deliveryMode?: 'mode2_draft' | 'mode1_review_email';
  draftInjected?: boolean;
  draftMailbox?: string;
  draftError?: string;
  reviewEmailSent?: boolean;
  reviewEmailRecipient?: string;
  error?: string;
}

export class InboundProcessorService {
  private static aiService = new GeminiAIService();

  /**
   * 处理入站买家询盘邮件：
   * 1. 动态加载租户专属底价表
   * 2. 调用最新 Gemini 大模型解析 SKU、数量、选配需求
   * 3. 自动精准核价 (底价+利润率+港杂+选配+汇率)
   * 4. 渲染正式外贸商业 PDF 报价单并持久化
   * 5. 双轨交付架构：
   *    - 模式 2 (优先)：若配置了客户端授权码，全自动静默写入 Foxmail / 网页邮箱【草稿箱】(只写不读)
   *    - 模式 1 (自动兜底)：若未配置授权码或写入异常，全自动将生成的正式 PDF 报价单与英文回信作为【待审出单邮件】发送至业务员工作邮箱/审单台！
   */
  static async processInboundInquiry(payload: InboundEmailPayload): Promise<InboundProcessResult> {
    const { tenantId, from, to, subject, text, html, attachments } = payload;
    let rawContent = (text || html || subject || '').trim();

    // 1. 抽取附件文本与表格明细 (PDF, Excel .xlsx/.xls, CSV 等)
    const attachmentNotices: string[] = [];
    const extractedAttachmentTexts: string[] = [];
    let detectedAttachmentNames: string[] = [];

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      detectedAttachmentNames = attachments.map(a => a.filename || 'attachment');
      console.log(`📎 [Inbound Processor] 发现 ${attachments.length} 份邮件附件，启动结构化解析...`);
      const extractedList = await AttachmentExtractorService.extractAllAttachments(attachments);

      for (const item of extractedList) {
        if (item.success && item.text) {
          extractedAttachmentTexts.push(`--- [ATTACHMENT: ${item.filename}] ---\n${item.text}`);
          attachmentNotices.push(`📎 检测到附件 [${item.filename}]，已自动提取明细并参与核价出单`);
          console.log(`✅ [Inbound Processor] 附件 [${item.filename}] 提取成功 (${item.text.length} 字符，预估 ${item.itemCountEstimate} 个商品)`);
        } else {
          const reason = item.error || '未识别到有效文本层';
          attachmentNotices.push(`⚠️ 检测到附件 [${item.filename}] (${reason})，请人工核对附件明细！`);
          console.warn(`⚠️ [Inbound Processor] 附件 [${item.filename}] 提取未果: ${reason}`);
        }
      }
    }

    // 2. 合并正文与附件内容
    let combinedContent = rawContent;
    if (extractedAttachmentTexts.length > 0) {
      combinedContent = (combinedContent ? combinedContent + '\n\n' : '') + extractedAttachmentTexts.join('\n\n');
    }

    if (!combinedContent.trim()) {
      return { success: false, error: '邮件正文及附件内容均为空，无法解析询盘' };
    }

    // 3. 过滤可能随 Webhook 附带的底层邮件传输头 (Received, Content-Type, DKIM 等)，防止干扰大模型提取
    let cleanedContent = combinedContent
      .replace(/^Received:[\s\S]*?(?=\r?\n[A-Za-z0-9_-]+:|\r?\n\r?\n)/gim, '')
      .replace(/^(?:ARC-[A-Za-z0-9_-]+|DKIM-[A-Za-z0-9_-]+|Authentication-Results|Return-Path|Message-ID|X-[A-Za-z0-9_-]+|MIME-Version|Content-Type|Content-Transfer-Encoding):[^\r\n]*(?:\r?\n\s+[^\r\n]*)*/gim, '')
      .replace(/\[\s*(?:Note|QA|Test|Regression|Notice|Disclaimer)[^\]]*\]/gi, '')
      .trim();

    const emailContent = cleanedContent || combinedContent;

    // 1. 加载租户底价表
    const tenantPricing = TenantService.getActivePricingBuffer(tenantId) || TenantService.getActivePricingBuffer('default');
    if (!tenantPricing) {
      return { success: false, error: `租户 [${tenantId}] 尚未初始化底价库，请先在审单台上传商品底价表` };
    }

    const parsedExcel = ExcelAdapter.parse(tenantPricing.buffer);
    const tenantProfile = TenantService.getTenantProfile(tenantId);

    // 2. Gemini 最新大模型解析买家询盘
    console.log(`🤖 [Inbound Processor] 正在调用 Gemini 最新模型为租户 [${tenantId}] 解析询盘...`);
    const extractionResult = await this.aiService.extractPOFromText(emailContent);
    const poData = extractionResult.data;

    // 过滤掉误将邮件传输头或测试备注当作商品的垃圾行 (如 "D14_QA_TEST_GUIDE", "UTF-8")
    if (poData && Array.isArray(poData.Items)) {
      const invalidSkus = new Set(['UTF-8', 'CONTENT-TYPE', 'CHARSET', 'D14_QA_TEST_GUIDE', 'TEST_REPORT', 'DISCLAIMER', 'NOTE', 'TEST_GUIDE', 'N/A']);
      poData.Items = poData.Items.filter(item => {
        const skuUpper = (item.SKU || '').toUpperCase().trim();
        if (invalidSkus.has(skuUpper)) return false;
        if (/^(?:UTF-?8|CONTENT[-_]TYPE|CHARSET)$/i.test(skuUpper)) return false;
        if (/^\[?Note:?/i.test(item.SKU || '')) return false;
        if (item.Description && /D14_QA_TEST_GUIDE|Content-Type|charset=/i.test(item.Description)) return false;
        return true;
      });
    }

    // 净化 BuyerContact 姓名，杜绝将 Received 传输头识别为对接人 (如 "d unknown by gmailapi.google.com with")
    if (poData?.BuyerContact?.Name) {
      const bName = poData.BuyerContact.Name.toLowerCase();
      if (bName.includes('gmailapi') || bName.includes('google.com') || bName.includes('received') || bName.includes('unknown by') || bName.includes('mailer-daemon')) {
        poData.BuyerContact.Name = 'Valued Customer';
      }
    }

    // 若检测到附件但未识别出有效商品（如纯图片扫描件），在占位商品中明确注明附件文件名
    if (detectedAttachmentNames.length > 0 && poData?.Items) {
      const isOnlyPlaceholder = poData.Items.length === 1 && poData.Items[0].SKU === 'PENDING-SKU-01';
      if (isOnlyPlaceholder) {
        poData.Items[0].Description = `Inquiry Item (Pending SKU Confirmation - Detected Attachment: ${detectedAttachmentNames.join(', ')})`;
        poData.Items[0].ConfidenceRemark = `检测到附件 [${detectedAttachmentNames.join(', ')}]，请人工确认明细`;
        if (!poData.MissingInfo) poData.MissingInfo = [];
        poData.MissingInfo.unshift(`检测到附件 [${detectedAttachmentNames.join(', ')}]，未能自动提取文本，已生成待核验单据，请人工核对`);
      }
    }

    // 3. 自动精准核价
    const quotation = PricingService.calculate(poData, parsedExcel.priceItems, parsedExcel.exchangeRates, {
      tenantId,
      createdBy: from || 'inbound-email@customer.com',
      salesRepName: tenantProfile.managerName || 'Sales Team',
      defaultProfitMargin: parsedExcel.defaultProfitMargin ?? tenantProfile.defaultProfitMargin ?? 0.3,
      defaultIncoterm: parsedExcel.defaultIncoterm,
      priceValidity: parsedExcel.priceValidity,
      leadTime: parsedExcel.leadTime,
      samplePolicy: parsedExcel.samplePolicy,
      defaultFobCost: Number(process.env.DEFAULT_FOB_COST || 0),
      fallbackExchangeRate: Number(process.env.DEFAULT_FALLBACK_RATE || 7.2),
      incotermRules: parsedExcel.incotermRules,
      paymentTerms: parsedExcel.paymentTerms,
      inquiryMessageId: payload.messageId ? payload.messageId.replace(/[<>]/g, '').trim() : undefined
    });
    quotation.tenantId = tenantId;
    quotation.aiModelUsed = extractionResult.modelUsed;
    if (payload.messageId) {
      quotation.inquiryMessageId = payload.messageId.replace(/[<>]/g, '').trim();
    }

    // 4. 生成正式商业 PDF 报价单并持久化落盘
    const pdfBuffer = await PDFService.generateQuotationPDF(quotation);
    try {
      QuoteStoreService.saveQuote(quotation, pdfBuffer, tenantId);
    } catch (saveErr: any) {
      const persistErr = `🚨 [持久化严重故障] 报价单 [${quotation.quotationNumber}] 保存至存储失败: ${saveErr.message}`;
      console.error(persistErr);
      return {
        success: false,
        error: persistErr,
        quotationNumber: quotation.quotationNumber
      };
    }

    // 4.0 询盘一等实体落盘 (Task §2.5 data/tenants/<tenantId>/inquiries/INQ-*.json)
    let persistedInquiryId: string | undefined = undefined;
    try {
      const itemsSummary = (quotation.items || []).map(it => ({
        sku: it.sku,
        description: it.description,
        quantity: it.quantity,
        unit: 'pcs'
      }));
      const attachmentsMeta = (attachments || []).map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.content?.length
      }));
      const inquiryEntity = InquiryService.createInquiryFromInbound({
        tenantId,
        from: from || '',
        to: to || '',
        subject: subject || 'RFQ Inquiry',
        content: emailContent,
        quotationNumber: quotation.quotationNumber,
        inquiryMessageId: payload.messageId ? payload.messageId.replace(/[<>]/g, '').trim() : undefined,
        parseStatus: 'parsed',
        buyerName: quotation.buyerName || quotation.customerName,
        itemsSummary,
        attachments: attachmentsMeta.length > 0 ? attachmentsMeta : undefined
      });
      persistedInquiryId = inquiryEntity.inquiryId;
      quotation.inquiryId = persistedInquiryId;
      console.log(`📥 [询盘箱实体落盘] 租户 [${tenantId}] 询盘已成功落盘: [${persistedInquiryId}] -> 报价单 [${quotation.quotationNumber}]`);
    } catch (inqErr: any) {
      console.warn('⚠️ [询盘箱实体落盘异常，不阻断主出单流]:', inqErr.message);
    }

    // 4.0 占位空单自适应自动清理：若本单成功提取出有效商品，而同 Message-ID 先前存在占位空单，静默清理旧空单杜绝工作台污染
    if (payload.messageId) {
      const isCurrentValid = quotation.items.length > 0 && !(quotation.items.length === 1 && quotation.items[0].sku === 'PENDING-SKU-01' && quotation.totalAmountForeign === 0);
      if (isCurrentValid) {
        try {
          const tenantQuotes = QuoteStoreService.listQuotes(tenantId);
          const cleanTargetMsgId = payload.messageId.replace(/[<>]/g, '').trim().toLowerCase();
          for (const q of tenantQuotes) {
            if (q.quotationNumber !== quotation.quotationNumber && (q.inquiryMessageId || '').replace(/[<>]/g, '').trim().toLowerCase() === cleanTargetMsgId) {
              const isOldDummy = q.items.length === 1 && q.items[0].sku === 'PENDING-SKU-01' && Number(q.totalAmountForeign || 0) === 0;
              if (isOldDummy) {
                console.log(`🧹 [自动清理旧占位空单] 询盘 [${payload.messageId}] 成功出具完整单据 [${quotation.quotationNumber}]，自动清理先前旧占位单 [${q.quotationNumber}]！`);
                QuoteStoreService.deleteQuote(q.quotationNumber, tenantId);
              }
            }
          }
        } catch (cleanupErr: any) {
          console.warn('⚠️ 检查与清理旧占位空单异常:', cleanupErr.message);
        }
      }
    }

    // 4.1 发送前防御性校验：核验单据已成功持久化落盘且审单链接可解析（防幽灵单拦截）
    const persistedCheck = QuoteStoreService.getQuote(quotation.quotationNumber, tenantId);
    if (!persistedCheck || persistedCheck.quotationNumber !== quotation.quotationNumber) {
      const verifyErr = `🚨 [防幽灵单拦截器] 报价单 [${quotation.quotationNumber}] 持久化二次验证未通过，审单链接无法解析！已紧急阻断发信并终止流程。`;
      console.error(verifyErr);
      return {
        success: false,
        error: verifyErr,
        quotationNumber: quotation.quotationNumber
      };
    }

    const baseUrl = process.env.PUBLIC_APP_URL?.replace(/\/+$/, '') || 'https://quote.kelvinflow.com';
    const reviewUrl = `${baseUrl}/review/${quotation.quotationNumber}`;
    const tenantCompany = cleanExporterCompanyName(tenantProfile.companyName || process.env.COMPANY_NAME);
    
    // 待核验主题安全锁：提示业务员发送前核验并删除标签
    const buyerDraftSubject = `【待核验·发前删此标签】Quotation ${quotation.quotationNumber} for RFQ - ${tenantCompany}`;
    const cleanBuyerEmailSubject = `Quotation ${quotation.quotationNumber} for RFQ - ${tenantCompany}`;

    // 4.1 智能逐项置信度检测与自适应草稿分支
    const minItemConfidence = quotation.items.length > 0
      ? Math.min(...quotation.items.map(i => i.itemConfidenceScore ?? 100))
      : (quotation.aiConfidenceScore || 85);

    const lowConfidenceItems = quotation.items.filter(
      i => (i.itemConfidenceScore !== undefined && i.itemConfidenceScore < 80) ||
           i.status === 'NEED_MANUAL_PRICE' ||
           i.matchStatus === 'UNMATCHED'
    );

    const hasLowConfidence = lowConfidenceItems.length > 0 || minItemConfidence < 80;
    const attachmentBanner = attachmentNotices.length > 0
      ? `--------------------------------------------------\n📎 附件解析状态：\n${attachmentNotices.map(n => `  ${n}`).join('\n')}\n`
      : '';

    let tearOffHeader = '';
    if (!hasLowConfidence) {
      // 绿色通道：全部商品高置信度 (>= 80%)，提供快捷复核通道
      tearOffHeader = `✂️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━✂️\n` +
        `🔒【KelvinFlow 内部审单台 · 发送给客户前请整块删除本虚线框】\n` +
        `🔗 专属在线工作台核单/调价链接: ${reviewUrl}\n` +
        `📊 本单 AI 综合置信度: ${Math.round(minItemConfidence)}% (全项精准匹配，底价核对无误)\n` +
        attachmentBanner +
        `💡 提示：如需微调单价、给折扣或确认交期，点击上方链接 10 秒修改并一键刷新 PDF！\n` +
        `✂️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━✂️\n\n`;
    } else {
      // 黄色预警通道：包含低置信度/非标定制品，在剪切框内醒目列出待核验明细
      const itemWarnings = lowConfidenceItems.map(it => {
        const score = it.itemConfidenceScore ?? 45;
        const reason = it.confidenceRemark || (it.status === 'NEED_MANUAL_PRICE' ? '底价库未收录标准价格' : '定制非标规格');
        return `  • SKU [${it.sku}]: AI置信度 ${score}% | 提示: ${reason}`;
      }).join('\n');

      tearOffHeader = `✂️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━✂️\n` +
        `⚠️【KelvinFlow 内部审单台 · 存在非标定制品 · 发送前请删此框】\n` +
        `🔗 专属在线审单/调价通道: ${reviewUrl}\n` +
        `📊 本单 AI 综合置信度: ${Math.round(minItemConfidence)}% (检测到非标定制品或未知型号，需人工核定成本)\n` +
        attachmentBanner +
        `--------------------------------------------------\n` +
        `待核验非标明细：\n` +
        `${itemWarnings}\n` +
        `--------------------------------------------------\n` +
        `👉 请点击上方链接进入工作台直接补填底价或调整单价，系统将自动重新计算并刷新 PDF！\n` +
        `✂️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━✂️\n\n`;
    }

    // 纯净的客户往来英文正文（业务员删掉上方虚线框后，内容 100% 纯净地道，无任何中文与内部链接）
    const safeCurrency = (!quotation.currency || quotation.currency === 'N/A') ? 'USD' : quotation.currency;
    const cleanCustomerLetter = `Dear ${quotation.buyerName || 'Valued Customer'},\n\n` +
      `Thank you for your inquiry. Attached please find our formal quotation (${quotation.quotationNumber}) prepared for your review.\n\n` +
      `Order Summary:\n` +
      `- Total Amount: ${safeCurrency} ${quotation.totalAmountForeign.toFixed(2)}\n` +
      `- Trade Terms: ${quotation.incotermUsed}\n` +
      `- Payment Terms: ${quotation.paymentTerms || 'T/T 30% Deposit'}\n` +
      (quotation.leadTime ? `- Production Lead Time: ${quotation.leadTime}\n` : '') +
      `\nOfficial commercial PDF with detailed specifications and container load breakdown is attached.\n\n` +
      `Please let us know if you have any questions or require custom specifications.\n\n` +
      `Best regards,\n${tenantCompany}`;

    const buyerDraftBody = tearOffHeader + cleanCustomerLetter;
    const pdfFileName = `${(quotation.customerName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_')}_Quotation_${quotation.quotationNumber}.pdf`;

    // 5. 模式判定与交付执行
    let deliveryMode: 'mode2_draft' | 'mode1_review_email' = 'mode1_review_email';
    let draftInjectionResult: any = null;
    let reviewEmailResult: any = null;

    // 5.1 尝试模式 2：若租户启用了 IMAP 客户端授权码，静默注入到该用户的草稿箱 (Drafts)
    const hasImapConfig = Boolean(
      tenantProfile.imapConfig?.enabled && 
      tenantProfile.imapConfig.email && 
      tenantProfile.imapConfig.authCode
    );

    if (hasImapConfig) {
      console.log(`🚀 [模式 2 触发] 租户 [${tenantId}] 已配置 IMAP 授权码，尝试写入 [${tenantProfile.imapConfig!.email}] 草稿箱...`);
      try {
        draftInjectionResult = await DraftService.appendDraft({
          userEmail: tenantProfile.imapConfig!.email,
          authCode: tenantProfile.imapConfig!.authCode,
          imapHost: tenantProfile.imapConfig!.host,
          imapPort: tenantProfile.imapConfig!.port,
          secure: tenantProfile.imapConfig!.secure,
          to: from || '',
          subject: buyerDraftSubject,
          text: buyerDraftBody,
          quotationNumber: quotation.quotationNumber,
          tenantId,
          attachments: [{
            filename: pdfFileName,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }]
        });

        if (draftInjectionResult && draftInjectionResult.success) {
          deliveryMode = 'mode2_draft';
          console.log(`✅ [模式 2 成功] 报价草稿已注入 [${tenantProfile.imapConfig!.email}] 的草稿箱 [${draftInjectionResult.mailbox}]`);
        }
      } catch (err: any) {
        console.warn('⚠️ [模式 2 异常] 草稿注入失败，将平稳回退至模式 1 待审出单:', err.message);
        draftInjectionResult = { success: false, error: err.message };
      }
    }

    // 5.2 若模式 2 未配置或写入失败，自动触发【模式 1：零配置收件箱待审出单】
    let recipientEmail = tenantProfile.imapConfig?.email || '';
    if (!recipientEmail && tenantProfile.contactEmail && !tenantProfile.contactEmail.startsWith('sales@tenant_')) {
      recipientEmail = tenantProfile.contactEmail;
    }
    if (!recipientEmail) {
      const trial = TrialService.getTrialByTenantId(tenantId);
      if (trial?.email) {
        recipientEmail = trial.email;
      }
    }
    if (!recipientEmail && from && from.includes('@') && !from.includes('mailer-daemon')) {
      recipientEmail = from;
    }

    if (deliveryMode !== 'mode2_draft') {
      console.log(`🛡️ [模式 1 兜底触发] 租户 [${tenantId}] 未启用授权码或写入草稿失败，执行收件箱待审邮件交付至 [${recipientEmail || '审单台'}]...`);

      const reviewEmailSubject = `[待审出单] Quotation ${quotation.quotationNumber} for RFQ - ${quotation.customerName || 'Buyer'}`;
      const reviewEmailBody = `您好：\n\n` +
        `KelvinFlow AI 已完成核价排版，PDF 见附件。\n\n` +
        `--------------------------------------------------\n` +
        `【准备发送给海外买家的正式英文回信（可直接复制或转发）】：\n` +
        `--------------------------------------------------\n` +
        `${cleanCustomerLetter}\n\n` +
        `==================================================\n` +
        `⛔ 以下为内部审单信息，请勿转发给客户 ⛔\n` +
        `==================================================\n\n` +
        `【单据概览】\n` +
        `- 报价单号：${quotation.quotationNumber}\n` +
        `- 海外买家：${quotation.customerName || quotation.buyerName || '海外买家'}\n` +
        `- 报价总额：${safeCurrency} ${quotation.totalAmountForeign.toFixed(2)}\n` +
        `- 贸易条款：${quotation.incotermUsed}\n` +
        `- 汇率基准：${quotation.rateUsed}\n\n` +
        `【在线微调审单链接】\n` +
        `${reviewUrl}\n\n` +
        (tearOffHeader ? `${tearOffHeader}\n` : '');

      if (recipientEmail) {
        reviewEmailResult = await DraftService.sendReviewEmail({
          to: recipientEmail,
          subject: reviewEmailSubject,
          text: reviewEmailBody,
          quotationNumber: quotation.quotationNumber,
          tenantId,
          attachments: [{
            filename: pdfFileName,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }]
        });
      }
    }

    console.log(`🏁 [Inbound Processor] 询盘出单闭环完成: 租户 [${tenantId}], 单号 [${quotation.quotationNumber}], 交付模式: ${deliveryMode}`);

    return {
      success: true,
      quotationNumber: quotation.quotationNumber,
      inquiryId: persistedInquiryId,
      reviewUrl,
      deliveryMode,
      draftInjected: draftInjectionResult?.success || false,
      draftMailbox: draftInjectionResult?.mailbox,
      draftError: draftInjectionResult?.error,
      reviewEmailSent: reviewEmailResult?.sent || false,
      reviewEmailRecipient: recipientEmail
    };
  }
}
