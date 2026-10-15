import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { simpleParser } from 'mailparser';

export const inboundRouter = Router();

// 内存级并发防重互斥锁 (杜绝毫秒级/秒级网络重试并发创建多个重复单据)
const inFlightInquiries = new Map<string, Promise<any>>();

import { GeminiAIService } from '../services/gemini.service.js';
import { PricingService } from '../services/pricing.service.js';
import { PDFService, cleanExporterCompanyName } from '../services/pdf.service.js';
import { QuoteStoreService } from '../services/quote-store.service.js';
import { TenantService } from '../services/tenant.service.js';
import { ExcelAdapter } from '../adapters/excel.adapter.js';
import { DraftService } from '../services/draft.service.js';
import { InboundProcessorService } from '../services/inbound-processor.service.js';
import { InquiryService } from '../services/inquiry.service.js';
import { AuthService } from '../services/auth.service.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

inboundRouter.use(authMiddleware);

const aiService = new GeminiAIService();


/**
 * 接收来自 Cloudflare Email Worker / n8n / 自动化邮件转发的入站邮件 Webhook
 * POST /api/inbound/email
 */
inboundRouter.post('/email', async (req: Request, res: Response): Promise<any> => {
  try {
    let { to, from, subject, text, html, attachments, messageId } = req.body;
    let rawText = text || html || subject || '';
    if (!rawText.trim() && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ success: false, error: '缺少邮件正文内容或附件 (text, html 或 attachments)' });
    }

    // 1. 若入站文本携带原生 RFC 822 MIME 邮件流特征，自动通过 simpleParser 进行全保真解包
    let parsedAttachments = Array.isArray(attachments) ? attachments.map((a: any) => ({
      filename: a.filename || 'attachment',
      contentType: a.contentType || 'application/octet-stream',
      content: Buffer.isBuffer(a.content)
        ? a.content
        : (typeof a.content === 'string'
            ? Buffer.from(a.content, a.content.startsWith('%PDF') || a.content.startsWith('PK') ? 'binary' : 'base64')
            : Buffer.from(''))
    })) : undefined;

    const isRawMime = typeof rawText === 'string' && (
      /^(?:Received:|MIME-Version:|Return-Path:|DKIM-Signature:|Content-Type:\s*multipart)/im.test(rawText) ||
      rawText.includes('Content-Transfer-Encoding:')
    );

    if (isRawMime) {
      try {
        const parsed = await simpleParser(rawText);
        if (!messageId && parsed.messageId) messageId = parsed.messageId;
        if (!from && parsed.from?.value?.[0]?.address) from = parsed.from.value[0].address;
        if (!subject && parsed.subject) subject = parsed.subject;
        if (!to && parsed.to) {
          const toArr = Array.isArray(parsed.to) ? parsed.to : [parsed.to];
          const toAddr = (toArr[0] as any)?.value?.[0]?.address;
          if (toAddr) to = toAddr;
        }

        const decodedBody = (parsed.text || parsed.html || '').trim();
        if (decodedBody) {
          rawText = decodedBody;
        }

        if (parsed.attachments && parsed.attachments.length > 0 && (!parsedAttachments || parsedAttachments.length === 0)) {
          parsedAttachments = parsed.attachments.map((att: any) => ({
            filename: att.filename || 'attachment',
            contentType: att.contentType || 'application/octet-stream',
            content: att.content
          }));
        }
      } catch (mimeErr: any) {
        console.warn('⚠️ [Inbound Router] simpleParser 解析 raw MIME 失败，回退原始文本:', mimeErr.message);
      }
    }

    // 2. 从收件人中解析专属别名 (如 rfq-13800000000@quote.kelvinflow.com -> tenantId: 'tenant_trial_13800000000')
    let tenantId = req.body.tenantId;
    if (!tenantId && to && typeof to === 'string') {
      const aliasMatch = to.match(/rfq-([a-zA-Z0-9_-]+)@/i);
      if (aliasMatch && aliasMatch[1]) {
        tenantId = TenantService.resolveTenantId(aliasMatch[1]);
      }
    }
    if (!tenantId) {
      tenantId = 'default';
    }

    // 3. 构建多维幂等防重键 (优先 Message-ID，无 Message-ID 时采用 租户+发件人+主题+正文特征 Hash)
    const cleanMsgId = (messageId || '').replace(/[<>]/g, '').trim();
    const contentSample = rawText.replace(/\s+/g, ' ').slice(0, 300);
    const dedupKey = cleanMsgId
      ? `${tenantId}_${cleanMsgId}`
      : `${tenantId}_hash_${createHash('sha256').update(`${from || ''}_${subject || ''}_${contentSample}`).digest('hex').slice(0, 24)}`;

    // 4. 并发互斥锁：若同一封邮件正在出单计算中（如 4-5 秒内连续重发/Webhook 竞态），等待第一路结果直接复用
    if (inFlightInquiries.has(dedupKey)) {
      console.log(`⏳ [Inbound Router] 检测到询盘 [${dedupKey}] 正在出单计算中（并发请求），等待第一路处理完成直接复用...`);
      try {
        const sharedResult = await inFlightInquiries.get(dedupKey)!;
        return res.status(200).json(sharedResult);
      } catch (_) {
        // 第一路若异常，本路继续执行
      }
    }

    // 5. 历史幂等检测：若本邮件先前已出具正式报价单（品项完整、总额正常），直接幂等返回已生成的单据，杜绝二次出单与重复邮件轰炸
    if (cleanMsgId) {
      const existingQuote = QuoteStoreService.findQuoteByMessageId(tenantId, cleanMsgId);
      if (existingQuote) {
        const isExistingDummy = existingQuote.items.length === 1 &&
          existingQuote.items[0].sku === 'PENDING-SKU-01' &&
          Number(existingQuote.totalAmountForeign || 0) === 0;

        if (!isExistingDummy) {
          console.log(`🛡️ [幂等去重拦截] 询盘 Message-ID [${cleanMsgId}] 已出具正式单据 [${existingQuote.quotationNumber}] (${existingQuote.items.length} 品项, 总额 ${existingQuote.currency} ${existingQuote.totalAmountForeign})，直接幂等返回！`);
          const baseUrl = process.env.PUBLIC_APP_URL?.replace(/\/+$/, '') || 'https://quote.kelvinflow.com';
          return res.status(200).json({
            success: true,
            quotationNumber: existingQuote.quotationNumber,
            reviewUrl: `${baseUrl}/review/${existingQuote.quotationNumber}`,
            deliveryMode: 'mode1_review_email',
            duplicated: true,
            message: `[幂等去重] 该邮件已于 ${existingQuote.processedAt} 生成报价单，已直接返回`
          });
        } else {
          console.log(`🔄 [占位空单自动覆盖升级] 询盘 Message-ID [${cleanMsgId}] 先前生成了占位空单 [${existingQuote.quotationNumber}]，本次请求将自动重新解析并覆盖清理旧空单！`);
        }
      }
    }

    // 6. 执行核心出单中枢并注册并发互斥 Promise
    const taskPromise = InboundProcessorService.processInboundInquiry({
      tenantId,
      from: from || '',
      to: to || '',
      subject: subject || '',
      text: rawText,
      html: html || '',
      attachments: parsedAttachments,
      messageId: cleanMsgId || undefined
    });

    inFlightInquiries.set(dedupKey, taskPromise);

    try {
      const result = await taskPromise;
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.status(200).json(result);
    } finally {
      inFlightInquiries.delete(dedupKey);
    }
  } catch (error: any) {
    console.error('❌ 处理入站邮件询盘失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '内部服务器错误'
    });
  }
});

/**
 * 测试 IMAP 邮箱客户端授权码有效性
 * POST /api/inbound/test-imap
 */
inboundRouter.post('/test-imap', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, authCode, host, port } = req.body;
    if (!email || !authCode) {
      return res.status(400).json({ success: false, error: '缺少邮箱地址或客户端授权码' });
    }
    const testResult = await DraftService.testConnection(email, authCode, host, port ? Number(port) : undefined);
    return res.json(testResult);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || '测试失败' });
  }
});

/**
 * 保存租户 IMAP 配置（激活 Foxmail / 企业邮箱草稿箱只写不读模式）
 * POST /api/inbound/save-imap
 */
inboundRouter.post('/save-imap', async (req: Request, res: Response): Promise<any> => {
  try {
    let resolvedTenantId: string | undefined = undefined;
    if (req.user) {
      if (req.user.role === 'admin' && req.body?.tenantId) {
        resolvedTenantId = req.body.tenantId;
      } else {
        resolvedTenantId = req.user.tenantId;
      }
    } else {
      const authHeader = req.headers?.authorization || (typeof req.get === 'function' ? req.get('authorization') : undefined);
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const payload = AuthService.verifyToken(token);
        if (payload?.tenantId) resolvedTenantId = payload.tenantId;
      }
    }
    const tenantId = resolvedTenantId || (process.env.NODE_ENV === 'test' ? (req.body?.tenantId || 'default') : (req.tenantId || 'default'));
    const { email, authCode, host, port, enabled = true } = req.body;
    if (!email || !authCode) {
      return res.status(400).json({ success: false, error: '缺少邮箱地址或客户端授权码' });
    }
    const updatedProfile = TenantService.updateTenantProfile(tenantId, {
      imapConfig: {
        enabled: Boolean(enabled),
        email: email.trim(),
        authCode: authCode.trim(),
        host: host?.trim() || undefined,
        port: port ? Number(port) : 993,
        secure: true
      }
    });

    return res.json({
      success: true,
      message: 'IMAP 授权码配置保存成功，已激活 Foxmail / 企业邮箱草稿箱全自动静默直达！',
      imapConfig: {
        enabled: updatedProfile.imapConfig?.enabled,
        email: updatedProfile.imapConfig?.email,
        host: updatedProfile.imapConfig?.host,
        port: updatedProfile.imapConfig?.port
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || '保存失败' });
  }
});

/**
 * 收件箱轮询端点（已升级为纯转发架构说明）
 * POST /api/inbound/poll-now
 */
inboundRouter.post('/poll-now', async (_req: Request, res: Response): Promise<any> => {
  return res.json({
    success: true,
    message: '系统已全面升级为 100% 自动邮件转发架构 (零异地风控通道)，收件完全通过企业邮箱规则自动触发，无需轮询！'
  });
});

/**
 * 轨道 A：Web 工作台极速出单接口（粘贴询盘文本即出单）
 * POST /api/inbound/quick-quote
 */
inboundRouter.post('/quick-quote', async (req: Request, res: Response): Promise<any> => {
  try {
    const rawText = req?.body?.inquiryText || req?.body?.emailBody || req?.body?.content || req?.body?.text || '';
    const inquiryText = typeof rawText === 'string' ? rawText.trim() : '';

    if (!inquiryText) {
      return res.status(400).json({ success: false, error: '请粘贴或输入询盘正文内容' });
    }

    // 优先从 authMiddleware 注入的 req.user / req.tenantId 或 Authorization Header 解析真实租户
    let resolvedTenantId: string | undefined = undefined;
    if (req.user) {
      if (req.user.role === 'admin' && req.body?.tenantId) {
        resolvedTenantId = req.body.tenantId;
      } else {
        resolvedTenantId = req.user.tenantId;
      }
    } else {
      const authHeader = req.headers?.authorization || (typeof req.get === 'function' ? req.get('authorization') : undefined);
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const payload = AuthService.verifyToken(token);
        if (payload?.tenantId) resolvedTenantId = payload.tenantId;
      }
    }

    // 匿名调用严禁冒用私有租户，仅允许白名单公共租户 default
    const tenantId = resolvedTenantId || 'default';
    const { buyerName = 'Valued Customer', targetProfitMargin } = req.body || {};

    // 1. 加载底价表
    const tenantPricing = TenantService.getActivePricingBuffer(tenantId) || TenantService.getActivePricingBuffer('default');
    if (!tenantPricing) {
      return res.status(400).json({
        success: false,
        error: `租户 [${tenantId}] 尚未初始化底价库，请先在控制台上传底价表`
      });
    }

    const parsedExcel = ExcelAdapter.parse(tenantPricing.buffer);
    const tenantProfile = TenantService.getTenantProfile(tenantId);

    // 2. AI 语意提取
    const extractionResult = await aiService.extractPOFromText(inquiryText);
    const poData = extractionResult.data;
    if (!poData.CustomerName && buyerName) {
      poData.CustomerName = buyerName;
    }

    // 3. 自动核价 (支持 0% 指定毛利)
    const effectiveDefaultMargin = (targetProfitMargin !== undefined && targetProfitMargin !== null && targetProfitMargin !== '')
      ? Number(targetProfitMargin)
      : (parsedExcel.defaultProfitMargin ?? tenantProfile.defaultProfitMargin ?? 0.3);

    const quotation = PricingService.calculate(poData, parsedExcel.priceItems, parsedExcel.exchangeRates, {
      tenantId,
      createdBy: 'web-workbench@kelvinflow.com',
      salesRepName: tenantProfile.managerName || 'KelvinFlow Sales',
      defaultProfitMargin: effectiveDefaultMargin,
      defaultIncoterm: parsedExcel.defaultIncoterm,
      priceValidity: parsedExcel.priceValidity,
      leadTime: parsedExcel.leadTime,
      samplePolicy: parsedExcel.samplePolicy,
      defaultFobCost: Number(process.env.DEFAULT_FOB_COST || 0),
      fallbackExchangeRate: Number(process.env.DEFAULT_FALLBACK_RATE || 7.2),
      incotermRules: parsedExcel.incotermRules,
      paymentTerms: parsedExcel.paymentTerms
    });
    quotation.tenantId = tenantId;
    quotation.aiModelUsed = extractionResult.modelUsed;

    // 4. 渲染 PDF 并持久化
    const pdfBuffer = await PDFService.generateQuotationPDF(quotation);
    QuoteStoreService.saveQuote(quotation, pdfBuffer, tenantId);

    // 4.1 持久化询盘一等实体 (Task §2.5 data/tenants/<tenantId>/inquiries/INQ-*.json)
    let persistedInquiryId: string | undefined = undefined;
    try {
      const itemsSummary = (quotation.items || []).map(it => ({
        sku: it.sku,
        description: it.description,
        quantity: it.quantity,
        unit: 'pcs'
      }));
      const inquiryEntity = InquiryService.createInquiryFromInbound({
        tenantId,
        from: 'web-workbench@kelvinflow.com',
        subject: `Web RFQ Inquiry - ${quotation.customerName || buyerName}`,
        content: inquiryText,
        quotationNumber: quotation.quotationNumber,
        parseStatus: 'parsed',
        buyerName: quotation.buyerName || quotation.customerName,
        itemsSummary
      });
      persistedInquiryId = inquiryEntity.inquiryId;
      quotation.inquiryId = persistedInquiryId;
    } catch (inqErr: any) {
      console.warn('⚠️ [Web 快速出单询盘落盘异常]:', inqErr.message);
    }

    const baseUrl = process.env.PUBLIC_APP_URL?.replace(/\/+$/, '') || 'https://quote.kelvinflow.com';
    const reviewUrl = `${baseUrl}/review/${quotation.quotationNumber}`;
    const tenantCompany = cleanExporterCompanyName(tenantProfile.companyName);
    const safeAmount = Number(quotation.totalAmountForeign || 0).toFixed(2);
    const safeCustomer = (quotation.customerName || quotation.buyerName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeQuoteNum = quotation.quotationNumber || 'DRAFT';

    const safeCurrency = (!quotation.currency || quotation.currency === 'N/A') ? 'USD' : quotation.currency;
    const draftText = `Dear ${quotation.buyerName || 'Customer'},\n\nThank you for your inquiry. Attached is our formal quotation (${safeQuoteNum}).\n\nTotal Amount: ${safeCurrency} ${safeAmount}\nTrade Terms: ${quotation.incotermUsed || 'FOB'}\nPayment Terms: ${quotation.paymentTerms || '30% T/T Deposit, Balance Before Shipment'}\nDelivery Lead Time: ${quotation.leadTime || '15-20 days'}\n\nPlease review the attached official PDF quotation with technical specs.\n\nBest regards,\n${tenantCompany}`;

    return res.json({
      success: true,
      quotationNumber: quotation.quotationNumber,
      inquiryId: persistedInquiryId,
      quotation,
      reviewUrl,
      draftText,
      pdfFileName: `${safeCustomer}_Quotation_${safeQuoteNum}.pdf`,
      pdfBase64: pdfBuffer.toString('base64'),
      modelUsed: extractionResult.modelUsed
    });
  } catch (error: any) {
    console.error('❌ Web 快速出单失败:', error);
    return res.status(500).json({ success: false, error: error.message || '内部核价失败' });
  }
});

