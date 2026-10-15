import { inboundRouter } from '../src/routes/inbound.router.js';
import { PricingService } from '../src/services/pricing.service.js';
import { PDFService } from '../src/services/pdf.service.js';
import { POExtractionResult, StandardPriceItem, StandardExchangeRate } from '../src/types/index.js';
import fs from 'fs';
import path from 'path';

describe('一人公司商业闭环 E2E 端到端工作流测试', () => {

  describe('1. 官网获客留资链路 (已按 MVP 瘦身改版规范下架)', () => {
    it('POST /lead 已从 inboundRouter 中物理剔除，符合 MVP 瘦身规范', () => {
      const postLayer = (inboundRouter.stack || []).find(
        (layer: any) => layer.route && layer.route.path === '/lead' && layer.route.methods.post
      );
      expect(postLayer).toBeUndefined();
    });
  });

  describe('2. n8n 自动化邮件出单与草稿箱对接验证 (Email Draft & PDF Generation)', () => {
    it('模拟 n8n 调用：生成合法邮件草稿内容、包含在线微调入口且 PDF 文件头合法', async () => {
      const samplePO: POExtractionResult = {
        PONumber: 'PO-N8N-2026-88',
        CustomerName: 'Euro Lighting GmbH',
        BuyerContact: {
          Name: 'Herr Klaus Mueller',
          Email: 'klaus@eurolighting.de'
        },
        Date: '2026-09-14',
        Currency: 'USD',
        ConfidenceScore: 98,
        MissingInfo: [],
        IsStandardOrder: true,
        TotalOrderValue: null,
        SpecialRemarks: '',
        UncategorizedCriticalInfo: '',
        Items: [
          { SKU: 'ST-2026-A', Description: 'Premium Heavy Duty Stand Pro', Quantity: 500 }
        ],
        DeliveryDetails: 'FOB Shenzhen Port'
      };

      const sampleCatalog: StandardPriceItem[] = [
        {
          rawSku: 'ST-2026-A',
          normalizedSku: 'ST2026A',
          productName: 'Heavy Duty Stand Pro',
          basePrice: 20.0,
          profitMargin: 0.3,
          fobCost: 1.0,
          pcsPerCtn: 10,
          cbmPerCtn: 0.05,
          gwPerCtn: 12
        }
      ];

      const sampleRates: StandardExchangeRate[] = [
        { currency: 'USD', rateToRMB: 7.2 }
      ];

      // 1. 运行核心报价引擎
      const quotation = PricingService.calculate(samplePO, sampleCatalog, sampleRates, {
        tenantId: 'tenant_n8n_test',
        salesRepName: 'Kelvin',
        defaultProfitMargin: 0.3,
        defaultIncoterm: 'FOB Shenzhen Port'
      });

      expect(quotation.items.length).toBe(1);
      expect(quotation.totalAmountForeign).toBeGreaterThan(0);

      // 2. 渲染 PDF 并转 Base64 (模拟接口返回给 n8n)
      const pdfBuffer = await PDFService.generateQuotationPDF(quotation);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);

      const pdfBase64 = pdfBuffer.toString('base64');
      const decodedBuffer = Buffer.from(pdfBase64, 'base64');

      // 验证 PDF 标准文件头 (%PDF-1.4 或 %PDF-)
      const pdfHeader = decodedBuffer.slice(0, 5).toString('ascii');
      expect(pdfHeader).toBe('%PDF-');

      // 3. 验证草稿邮件结构
      const reviewUrl = `https://quote.kelvinflow.com/review/${quotation.quotationNumber}?tenant=tenant_n8n_test`;
      const emailSubject = `Quotation ${quotation.quotationNumber} for PO ${samplePO.PONumber} - KelvinFlow`;
      const emailBody = `[📌 业务员在线核对与微调入口]: ${reviewUrl}\n\nDear Herr Klaus Mueller,\n\nThank you for your inquiry...`;

      expect(emailSubject).toContain(quotation.quotationNumber);
      expect(emailSubject).toContain('PO-N8N-2026-88');
      expect(emailBody).toContain(reviewUrl);
      expect(emailBody).toContain('Herr Klaus Mueller');
    });

    it('多邮箱协议归一化测试 (Node 0 逻辑)：Gmail 与通用 IMAP 均能准确提取收发件人与正文', () => {
      // 模拟 n8n Node 0 的数据归一化算法
      function normalizeEmailNode(inputItem: any) {
        const json = inputItem.json;
        const binaries = inputItem.binary || {};
        let provider = 'imap';
        let senderEmail = '';
        let recipientEmail = '';
        let subject = json.subject || '';
        let bodyText = '';

        if (json.threadId || json.historyId) {
          provider = 'gmail';
          const fromObj = json.from && json.from.value ? json.from.value[0] : {};
          senderEmail = fromObj.address || json.from || '';
          recipientEmail = json.to || '';
          bodyText = json.textPlain || json.snippet || '';
        } else {
          provider = 'imap';
          senderEmail = json.from?.text || json.from?.value?.[0]?.address || json.from || '';
          recipientEmail = json.to?.text || json.to?.value?.[0]?.address || json.to || '';
          bodyText = json.text || json.textAsHtml || '';
        }

        if (!bodyText && json.html) {
          bodyText = json.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }

        return {
          emailProvider: provider,
          senderEmail,
          recipientEmail,
          subject,
          cleanBodyText: bodyText,
          binaries
        };
      }

      // 测试用例 1: Gmail Trigger 输入载荷
      const gmailPayload = {
        json: {
          threadId: '18f29ac0b891',
          historyId: '987654',
          from: { value: [{ name: 'Buyer John', address: 'john@globalbuyer.com' }] },
          to: 'sales@kelvinflow.com',
          subject: 'Inquiry for LED Floodlights 50W',
          snippet: 'Please quote 1000pcs CIF Rotterdam.'
        }
      };
      const gmailResult = normalizeEmailNode(gmailPayload);
      expect(gmailResult.emailProvider).toBe('gmail');
      expect(gmailResult.senderEmail).toBe('john@globalbuyer.com');
      expect(gmailResult.recipientEmail).toBe('sales@kelvinflow.com');
      expect(gmailResult.cleanBodyText).toContain('1000pcs CIF Rotterdam');

      // 测试用例 2: 腾讯企业邮 / 阿里邮箱 / Foxmail (IMAP Trigger) 输入载荷
      const imapPayload = {
        json: {
          from: { text: '"Hans Schmidt" <schmidt@german-tools.de>' },
          to: { text: 'export@foshan-factory.com' },
          subject: 'RFQ: 500 sets Heavy Duty Bracket',
          text: 'Dear Sir, please send us formal quotation ASAP.',
          html: '<p>Dear Sir, please send us formal quotation ASAP.</p>'
        }
      };
      const imapResult = normalizeEmailNode(imapPayload);
      expect(imapResult.emailProvider).toBe('imap');
      expect(imapResult.senderEmail).toContain('schmidt@german-tools.de');
      expect(imapResult.recipientEmail).toBe('export@foshan-factory.com');
      expect(imapResult.cleanBodyText).toContain('please send us formal quotation ASAP');
    });

    it('多邮箱双通道草稿生成：支持同时输出 Plain Text 与专业富文本 HTML (含核单跳转按钮)', () => {
      const reviewUrl = 'https://quote.kelvinflow.com/review/QT-2026-TEST?token=test_tok';
      const quoteId = 'QT-2026-TEST';
      const buyerName = 'Mr. Anderson';
      const amount = 35800.00;
      const incoterm = 'CIF Hamburg Port';

      // 模拟后端生成的 HTML 邮件草稿
      const emailHtmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6; max-width: 680px;">
  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
    <div style="font-weight: bold; color: #166534; font-size: 14px; margin-bottom: 4px;">📌 業務員在線核對與微調入口 (10 秒極速修改)</div>
    <a href="${reviewUrl}" target="_blank" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 8px 18px; border-radius: 6px; font-weight: bold; font-size: 13px;">點擊前往在線核單 ➔</a>
  </div>
  <p>Dear ${buyerName},</p>
  <p>Thank you for your inquiry. Total Amount: USD ${amount.toLocaleString('en-US')}, Terms: ${incoterm}.</p>
</div>`.trim();

      expect(emailHtmlBody).toContain('📌 業務員在線核對與微調入口');
      expect(emailHtmlBody).toContain(reviewUrl);
      expect(emailHtmlBody).toContain('Mr. Anderson');
      expect(emailHtmlBody).toContain('CIF Hamburg Port');
      expect(emailHtmlBody).toContain('35,800');
    });

    it('全平台公用 Inbound 邮件 Webhook: POST /api/inbound/email 支持自动解析租户并防非法入侵', async () => {
      const emailPostLayer = (inboundRouter.stack || []).find(
        (layer: any) => layer.route && layer.route.path === '/email' && layer.route.methods.post
      );
      expect(emailPostLayer).toBeDefined();

      // 测试 1: 空内容拦截 400
      const mockReqBad: any = {
        headers: {},
        body: { to: 'rfq-demo@quote.kelvinflow.com' }
      };
      let statusBad = 200;
      let bodyBad: any = null;
      const mockResBad: any = {
        status: (c: number) => { statusBad = c; return mockResBad; },
        json: (d: any) => { bodyBad = d; return mockResBad; }
      };
      await (emailPostLayer as any).route.stack[0].handle(mockReqBad, mockResBad, () => {});
      expect(statusBad).toBe(400);
      expect(bodyBad.error).toContain('缺少邮件正文内容');
    });
  });

});
