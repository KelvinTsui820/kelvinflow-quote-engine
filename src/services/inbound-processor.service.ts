import { GeminiAIService } from './gemini.service.js';
import { ExcelAdapter } from '../adapters/excel.adapter.js';
import { PricingService } from './pricing.service.js';
import { PDFService } from './pdf.service.js';
import { QuoteStoreService } from './quote-store.service.js';
import { TenantService } from './tenant.service.js';
import { DraftService } from './draft.service.js';

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
}

export interface InboundProcessResult {
  success: boolean;
  quotationNumber?: string;
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
    const { tenantId, from, to, subject, text, html } = payload;
    const emailContent = (text || html || subject || '').trim();

    if (!emailContent) {
      return { success: false, error: '邮件正文内容为空，无法解析询盘' };
    }

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
      addons: parsedExcel.addons,
      incotermRules: parsedExcel.incotermRules,
      paymentTerms: parsedExcel.paymentTerms
    });
    quotation.tenantId = tenantId;
    quotation.aiModelUsed = extractionResult.modelUsed;

    // 4. 生成正式商业 PDF 报价单
    const pdfBuffer = await PDFService.generateQuotationPDF(quotation);
    QuoteStoreService.saveQuote(quotation, pdfBuffer, tenantId);

    const baseUrl = process.env.PUBLIC_APP_URL?.replace(/\/+$/, '') || 'https://quote.kelvinflow.com';
    const reviewUrl = `${baseUrl}/review/${quotation.quotationNumber}`;
    const tenantCompany = tenantProfile.companyName || process.env.COMPANY_NAME || 'KelvinFlow Global Technology';
    
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

    let tearOffHeader = '';
    if (!hasLowConfidence) {
      // 绿色通道：全部商品高置信度 (>= 80%)，提供快捷复核通道
      tearOffHeader = `✂️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━✂️\n` +
        `🔒【KelvinFlow 内部审单台 · 发送给客户前请整块删除本虚线框】\n` +
        `🔗 专属在线工作台核单/调价链接: ${reviewUrl}\n` +
        `📊 本单 AI 综合置信度: ${Math.round(minItemConfidence)}% (全项精准匹配，底价核对无误)\n` +
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
        `--------------------------------------------------\n` +
        `待核验非标明细：\n` +
        `${itemWarnings}\n` +
        `--------------------------------------------------\n` +
        `👉 请点击上方链接进入工作台直接补填底价或调整单价，系统将自动重新计算并刷新 PDF！\n` +
        `✂️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━✂️\n\n`;
    }

    // 纯净的客户往来英文正文（业务员删掉上方虚线框后，内容 100% 纯净地道，无任何中文与内部链接）
    const cleanCustomerLetter = `Dear ${quotation.buyerName || 'Valued Customer'},\n\n` +
      `Thank you for your inquiry. Attached please find our formal quotation (${quotation.quotationNumber}) prepared for your review.\n\n` +
      `Order Summary:\n` +
      `- Total Amount: ${quotation.currency} ${quotation.totalAmountForeign.toFixed(2)}\n` +
      `- Trade Terms: ${quotation.incotermUsed}\n` +
      `- Payment Terms: ${quotation.paymentTerms || 'T/T 30% Deposit'}\n` +
      (quotation.leadTime ? `- Production Lead Time: ${quotation.leadTime}\n` : '') +
      `\nOfficial commercial PDF with detailed specifications and container load breakdown is attached.\n\n` +
      `Please let us know if you have any questions or require custom specifications.\n\n` +
      `Best regards,\n${tenantProfile.managerName || 'Sales Department'}\n${tenantCompany}`;

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
    let recipientEmail = tenantProfile.imapConfig?.email || tenantProfile.contactEmail || '';
    if (!recipientEmail && from && from.includes('@') && !from.includes('mailer-daemon')) {
      recipientEmail = from;
    }

    if (deliveryMode !== 'mode2_draft') {
      console.log(`🛡️ [模式 1 兜底触发] 租户 [${tenantId}] 未启用授权码或写入草稿失败，执行收件箱待审邮件交付至 [${recipientEmail || '审单台'}]...`);

      const reviewEmailSubject = `[待审出单] Quotation ${quotation.quotationNumber} for RFQ - ${quotation.customerName || 'Buyer'}`;
      const reviewEmailBody = `您好 ${tenantProfile.managerName || '外贸业务员'}：\n\nKelvinFlow AI 已为您将收到的买家询盘全自动完成核价与排版出单！\n正式商业 PDF 报价单已生成并作为附件附于本邮件。\n\n【单据概览】\n- 报价单号：${quotation.quotationNumber}\n- 海外买家：${quotation.customerName || quotation.buyerName || '海外买家'}\n- 报价总额：${quotation.currency} ${quotation.totalAmountForeign.toFixed(2)}\n- 贸易条款：${quotation.incotermUsed}\n- 汇率基准：${quotation.rateUsed}\n\n【在线微调审单链接】\n${reviewUrl}\n\n--------------------------------------------------\n【准备发送给海外买家的正式英文回信如下，可直接转发】：\n--------------------------------------------------\n${buyerDraftBody}\n`;

      if (recipientEmail) {
        reviewEmailResult = await DraftService.sendReviewEmail({
          to: recipientEmail,
          subject: reviewEmailSubject,
          text: reviewEmailBody,
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
