import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export const inboundRouter = Router();

// 内存级 IP 简易限流 (防刷：单 IP 60 秒内最多 5 次)
const ipRequestHistory = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 5;

  const timestamps = (ipRequestHistory.get(ip) || []).filter(t => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    return false;
  }
  timestamps.push(now);
  ipRequestHistory.set(ip, timestamps);
  return true;
}

/**
 * 推送线索至微信 (支持 PushPlus 与 Server酱)
 */
async function pushToWeChat(lead: any): Promise<{ pushed: boolean; channel?: string; error?: string }> {
  const pushplusToken = process.env.PUSHPLUS_TOKEN?.trim();
  const serverchanKey = process.env.SERVERCHAN_SENDKEY?.trim();

  const title = `🔥【KelvinFlow】收到高意向外贸客户留资！`;
  const markdownContent = `
### 🏢 客户企业：${lead.companyName || '未填写'}
- **联系人**：${lead.customerName || '未提供'}
- **联系电话/微信**：\`${lead.contact || '未提供'}\`
- **日均询盘量**：${lead.dailyRfqs || '未提供'}
- **主营品类**：${lead.productCategory || '通用外贸'}
- **核验口令/标识**：\`${lead.memoCode || '无'}\`
- **来源页面**：${lead.source || '官网首页/价格卡片'}
- **提交时间**：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

---
> 💡 **建议操作**：建议在 15 分钟内通过微信添加对方或致电沟通，转化率提升 80%！
`.trim();

  // 1. 尝试 PushPlus (推加)
  if (pushplusToken) {
    try {
      const resp = await fetch('http://www.pushplus.plus/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: pushplusToken,
          title,
          content: markdownContent,
          template: 'markdown'
        })
      });
      const resJson: any = await resp.json();
      if (resJson.code === 200) {
        console.log(`📲 [线索推送成功] 已通过 PushPlus 成功推送至创始人微信`);
        return { pushed: true, channel: 'PushPlus' };
      }
      console.warn(`⚠️ [PushPlus 推送返回异常]:`, resJson);
    } catch (e: any) {
      console.error(`❌ PushPlus 推送失败:`, e.message);
    }
  }

  // 2. 尝试 Server酱 (ServerChan Turbo)
  if (serverchanKey) {
    try {
      const resp = await fetch(`https://sctapi.ftqq.com/${serverchanKey}.send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          desp: markdownContent
        })
      });
      const resJson: any = await resp.json();
      if (resJson.code === 0) {
        console.log(`📲 [线索推送成功] 已通过 Server酱 成功推送至创始人微信`);
        return { pushed: true, channel: 'ServerChan' };
      }
      console.warn(`⚠️ [Server酱 推送返回异常]:`, resJson);
    } catch (e: any) {
      console.error(`❌ Server酱 推送失败:`, e.message);
    }
  }

  return { pushed: false };
}

/**
 * 本地持久化保存线索（防止微信推送网络故障时丢失）
 */
function saveLeadLocally(lead: any): void {
  try {
    const leadsDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(leadsDir)) {
      fs.mkdirSync(leadsDir, { recursive: true });
    }
    const leadsFile = path.join(leadsDir, 'inbound_leads.json');
    let list: any[] = [];
    if (fs.existsSync(leadsFile)) {
      try {
        list = JSON.parse(fs.readFileSync(leadsFile, 'utf-8'));
      } catch {}
    }
    list.unshift({
      ...lead,
      createdAt: new Date().toISOString()
    });
    fs.writeFileSync(leadsFile, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err: any) {
    console.error('❌ 保存本地线索失败:', err.message);
  }
}

import { GeminiAIService } from '../services/gemini.service.js';
import { PricingService } from '../services/pricing.service.js';
import { PDFService } from '../services/pdf.service.js';
import { QuoteStoreService } from '../services/quote-store.service.js';
import { TenantService } from '../services/tenant.service.js';
import { ExcelAdapter } from '../adapters/excel.adapter.js';
import { DraftService } from '../services/draft.service.js';
import { InboundProcessorService } from '../services/inbound-processor.service.js';

const aiService = new GeminiAIService();

/**
 * 接收来自官网 Landing Page 的留资线索
 * POST /api/inbound/lead
 */
inboundRouter.post('/lead', async (req: Request, res: Response): Promise<any> => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      success: false,
      error: '请求过于频繁，请稍后再试。'
    });
  }

  const { customerName, companyName, contact, dailyRfqs, productCategory, memoCode, source } = req.body;

  if (!contact && !companyName) {
    return res.status(400).json({
      success: false,
      error: '请提供联系方式（手机/微信）或企业名称'
    });
  }

  const leadRecord = {
    customerName: customerName || '外贸老板',
    companyName: companyName || '未知企业',
    contact: contact || '未填',
    dailyRfqs: dailyRfqs || '5~10 封',
    productCategory: productCategory || '外贸日用/工贸',
    memoCode: memoCode || '',
    source: source || '官网首页',
    ip: clientIp
  };

  // 1. 本地落盘
  saveLeadLocally(leadRecord);

  // 2. 异步微信推送
  pushToWeChat(leadRecord).catch(err => console.error('异步微信通知出错:', err));

  return res.json({
    success: true,
    message: '线索已成功接收，创始人将尽快联系您！'
  });
});

/**
 * 接收来自 Cloudflare Email Worker / n8n / 自动化邮件转发的入站邮件 Webhook
 * POST /api/inbound/email
 */
inboundRouter.post('/email', async (req: Request, res: Response): Promise<any> => {
  try {
    const { to, from, subject, text, html } = req.body;
    const emailText = text || html || subject || '';
    if (!emailText.trim()) {
      return res.status(400).json({ success: false, error: '缺少邮件正文内容 (text 或 html)' });
    }

    // 1. 从收件人中解析专属别名 (如 rfq-13800000000@quote.kelvinflow.com -> tenantId: 'tenant_trial_13800000000')
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

    // 2. 调用核心出单中枢：支持 Gemini 提取、精准算价、PDF生成、模式2草稿写入与模式1待审出单自动兜底
    const result = await InboundProcessorService.processInboundInquiry({
      tenantId,
      from: from || '',
      to: to || '',
      subject: subject || '',
      text: text || '',
      html: html || ''
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
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
    const { tenantId = 'default', email, authCode, host, port, enabled = true } = req.body;
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
    const rawText = req.body.inquiryText || req.body.emailBody || req.body.content || req.body.text || '';
    const inquiryText = typeof rawText === 'string' ? rawText.trim() : '';
    const { tenantId = 'default', buyerName = 'Valued Customer', targetProfitMargin } = req.body;
    if (!inquiryText) {
      return res.status(400).json({ success: false, error: '请粘贴或输入询盘正文内容' });
    }

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

    // 3. 自动核价
    const quotation = PricingService.calculate(poData, parsedExcel.priceItems, parsedExcel.exchangeRates, {
      tenantId,
      createdBy: 'web-workbench@kelvinflow.com',
      salesRepName: tenantProfile.managerName || 'KelvinFlow Sales',
      defaultProfitMargin: targetProfitMargin ? Number(targetProfitMargin) : (parsedExcel.defaultProfitMargin ?? tenantProfile.defaultProfitMargin ?? 0.3),
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

    // 4. 渲染 PDF 并持久化
    const pdfBuffer = await PDFService.generateQuotationPDF(quotation);
    QuoteStoreService.saveQuote(quotation, pdfBuffer, tenantId);

    const baseUrl = process.env.PUBLIC_APP_URL?.replace(/\/+$/, '') || 'https://quote.kelvinflow.com';
    const reviewUrl = `${baseUrl}/review/${quotation.quotationNumber}`;
    const tenantCompany = tenantProfile.companyName || 'KelvinFlow Global Technology';
    const safeAmount = Number(quotation.totalAmountForeign || 0).toFixed(2);
    const safeCustomer = (quotation.customerName || quotation.buyerName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeQuoteNum = quotation.quotationNumber || 'DRAFT';

    const draftText = `Dear ${quotation.buyerName || 'Customer'},\n\nThank you for your inquiry. Attached is our formal quotation (${safeQuoteNum}).\n\nTotal Amount: ${quotation.currency || 'USD'} ${safeAmount}\nTrade Terms: ${quotation.incotermUsed || 'FOB'}\nPayment Terms: ${quotation.paymentTerms || '30% T/T Deposit, Balance Before Shipment'}\nDelivery Lead Time: ${quotation.leadTime || '15-20 days'}\n\nPlease review the attached official PDF quotation with technical specs.\n\nBest regards,\n${tenantProfile.managerName || 'Sales Team'}\n${tenantCompany}`;

    return res.json({
      success: true,
      quotationNumber: quotation.quotationNumber,
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

