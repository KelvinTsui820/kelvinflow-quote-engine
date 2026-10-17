import { jest } from '@jest/globals';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import { GeminiAIService } from '../src/services/gemini.service.js';
import { InboundProcessorService } from '../src/services/inbound-processor.service.js';
import { AttachmentExtractorService } from '../src/services/attachment-extractor.service.js';
import { QuoteStoreService } from '../src/services/quote-store.service.js';
import { TenantService } from '../src/services/tenant.service.js';
import { InquiryService } from '../src/services/inquiry.service.js';

describe('Robustness QA Test Suite (Reports 18, 19, 20)', () => {
  jest.setTimeout(45000);
  const aiService = new GeminiAIService();

  // Helper to generate a PDF buffer with text
  function generateTestPDF(lines: string[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(14).text('PURCHASE ORDER / RFQ ATTACHMENT', { underline: true });
      doc.moveDown();
      for (const line of lines) {
        doc.fontSize(12).text(line);
      }
      doc.end();
    });
  }

  // Helper to generate an Excel buffer with rows
  function generateTestExcel(rows: Array<[string, number, string]>): Buffer {
    const wb = XLSX.utils.book_new();
    const wsData = [['Item SKU', 'Quantity', 'Specifications'], ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'RFQ_Items');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // ==========================================
  // Report 18 (TC-R1): Attachment Extraction
  // ==========================================
  describe('TC-R1 (Report 18): Attachment Extraction & Processing', () => {
    it('should extract SKUs and quantities from PDF attachment and participate in quotation calculation', async () => {
      const pdfBuffer = await generateTestPDF([
        'Item 1: TEST-005 - 500 pcs (Custom EPDM Gasket)',
        'Item 2: TEST-001 - 1000 pcs (Standard Nitrile O-Ring)'
      ]);

      const extraction = await AttachmentExtractorService.extractAttachment({
        filename: 'RFQ_Acme_Gaskets.pdf',
        contentType: 'application/pdf',
        content: pdfBuffer
      });

      expect(extraction.success).toBe(true);
      expect(extraction.text).toContain('TEST-005');
      expect(extraction.text).toContain('TEST-001');

      // Process inbound inquiry with attachment and brief one-sentence email body
      const result = await InboundProcessorService.processInboundInquiry({
        tenantId: 'default',
        from: 'buyer@acmegaskets.com',
        subject: 'RFQ Inquiry - Gaskets Oct 2026',
        text: 'Dear Sales Team, please find our official RFQ in the attached PDF. Looking forward to your prompt quote.',
        attachments: [
          {
            filename: 'RFQ_Acme_Gaskets.pdf',
            contentType: 'application/pdf',
            content: pdfBuffer
          }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.quotationNumber).toBeDefined();

      const savedQuote = QuoteStoreService.getQuote(result.quotationNumber!, 'default');
      expect(savedQuote).toBeDefined();
      expect(savedQuote?.items.length).toBeGreaterThanOrEqual(2);

      const item5 = savedQuote?.items.find(i => i.sku === 'TEST-005');
      const item1 = savedQuote?.items.find(i => i.sku === 'TEST-001');

      expect(item5).toBeDefined();
      expect(item5?.quantity).toBe(500);

      expect(item1).toBeDefined();
      expect(item1?.quantity).toBe(1000);

      // Verification: Quotation generated with 2 items from attachment (not PENDING-SKU-01)
      expect(savedQuote?.items.some(i => i.sku === 'PENDING-SKU-01')).toBe(false);
      expect(savedQuote?.items.length).toBe(2);
    });

    it('should calculate non-zero totalAmountForeign when PDF attachment contains catalog items', async () => {
      const pdfBuffer = await generateTestPDF([
        'Item 1: ST-2026-A - 500 pcs (Aluminum Alloy Bracket)',
        'Item 2: ERG-PRO-V2 - 200 pcs (Ergonomic Chair Base)'
      ]);

      const result = await InboundProcessorService.processInboundInquiry({
        tenantId: 'default',
        from: 'buyer@furniturepro.com',
        subject: 'PDF RFQ for Catalog Items',
        text: 'Please quote the attached PDF.',
        attachments: [
          {
            filename: 'Catalog_RFQ.pdf',
            contentType: 'application/pdf',
            content: pdfBuffer
          }
        ]
      });

      expect(result.success).toBe(true);
      const savedQuote = QuoteStoreService.getQuote(result.quotationNumber!, 'default');
      expect(savedQuote).toBeDefined();
      expect(savedQuote?.items.find(i => i.sku === 'ST-2026-A')?.quantity).toBe(500);
      expect(savedQuote?.items.find(i => i.sku === 'ERG-PRO-V2')?.quantity).toBe(200);
      expect(savedQuote?.totalAmountForeign).toBeGreaterThan(0);
    });

    it('should extract items from Excel (.xlsx) attachment and calculate quote', async () => {
      const excelBuffer = generateTestExcel([
        ['TEST-005', 300, 'Heavy duty gasket'],
        ['TEST-002', 400, 'Silicone seal']
      ]);

      const extraction = await AttachmentExtractorService.extractAttachment({
        filename: 'Inquiry_Parts.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        content: excelBuffer
      });

      expect(extraction.success).toBe(true);
      expect(extraction.text).toContain('TEST-005');
      expect(extraction.text).toContain('300');

      const result = await InboundProcessorService.processInboundInquiry({
        tenantId: 'default',
        from: 'purchasing@globaltrade.de',
        subject: 'Excel RFQ',
        text: 'Please quote the items listed in the attached spreadsheet.',
        attachments: [
          {
            filename: 'Inquiry_Parts.xlsx',
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            content: excelBuffer
          }
        ]
      });

      expect(result.success).toBe(true);
      const savedQuote = QuoteStoreService.getQuote(result.quotationNumber!, 'default');
      expect(savedQuote?.items.some(i => i.sku === 'TEST-005' && i.quantity === 300)).toBe(true);
      expect(savedQuote?.items.some(i => i.sku === 'TEST-002' && i.quantity === 400)).toBe(true);
    });

    it('should route unreadable attachment to manual processing in inquiry box without placeholder quote (Task 4b §5.4 & B8)', async () => {
      // Empty unreadable buffer
      const dummyBuffer = Buffer.from('NOT_A_VALID_PDF_STREAM');

      const result = await InboundProcessorService.processInboundInquiry({
        tenantId: 'default',
        from: 'buyer@emptyattachment.com',
        subject: 'Empty Attachment Inquiry',
        text: 'Please see attached.',
        attachments: [
          {
            filename: 'Scanned_Doc.pdf',
            contentType: 'application/pdf',
            content: dummyBuffer
          }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.requiresManualProcessing).toBe(true);
      expect(result.quotationNumber).toBeUndefined();
      expect(result.inquiryId).toBeDefined();

      const inq = InquiryService.getInquiry(result.inquiryId!, 'default');
      expect(inq).toBeDefined();
      expect(inq?.parseStatus).toBe('pending');
      expect(inq?.manualProcessingReason).toContain('Scanned_Doc.pdf');
    });
  });

  // ==========================================
  // Report 19 (TC-R2 / P34): 15-Item Ultra-Long Inquiry
  // ==========================================
  describe('TC-R2 (Report 19 / P34): Ultra-Long 15-Row Inquiry Parsing', () => {
    it('should parse all 15 product rows without truncation or dropped lines', async () => {
      const emailLines = [
        'Subject: Re: Re: Quotation request - consolidated RFQ Oct',
        'From: tsuikelvin0804@gmail.com',
        '',
        'Dear KelvinFlow Team,',
        'Please provide your consolidated FOB quotation for the following 15 production lots:',
        '',
        '1. TEST-005 - 500 pcs (Batch A1 high temp gasket)',
        '2. TEST-001 - 1000 pcs (Batch A2 standard o-ring)',
        '3. TEST-002 - 300 pcs (Batch A3 reinforced seal)',
        '4. TEST-003 - 800 pcs (Batch A4 flange washer)',
        '5. TEST-004 - 200 pcs (Batch A5 spiral gasket)',
        '6. TEST-005 - 600 pcs (Batch B1 high temp gasket)',
        '7. TEST-001 - 1200 pcs (Batch B2 standard o-ring)',
        '8. TEST-002 - 350 pcs (Batch B3 reinforced seal)',
        '9. TEST-003 - 750 pcs (Batch B4 flange washer)',
        '10. TEST-004 - 250 pcs (Batch B5 spiral gasket)',
        '11. TEST-005 - 700 pcs (Batch C1 high temp gasket)',
        '12. TEST-001 - 1500 pcs (Batch C2 standard o-ring)',
        '13. TEST-002 - 400 pcs (Batch C3 reinforced seal)',
        '14. TEST-003 - 900 pcs (Batch C4 flange washer)',
        '15. TEST-004 - 300 pcs (Batch C5 spiral gasket)',
        '',
        'Best regards,',
        'Sarah Jenkins',
        'Acme Global Procurement Ltd',
        '',
        '--------------------------------------------------',
        'On 2026-10-10, Kelvin Tsui wrote:',
        '> Dear Sarah, thank you for contacting us. We await your list of items.'
      ];

      const emailText = emailLines.join('\n');
      const extraction = await aiService.extractPOFromText(emailText);
      const items = extraction.data.Items;

      // Must have exactly 15 items!
      expect(items.length).toBe(15);

      // Verify every row quantity
      expect(items[0]).toMatchObject({ SKU: 'TEST-005', Quantity: 500 });
      expect(items[1]).toMatchObject({ SKU: 'TEST-001', Quantity: 1000 });
      expect(items[2]).toMatchObject({ SKU: 'TEST-002', Quantity: 300 });
      expect(items[3]).toMatchObject({ SKU: 'TEST-003', Quantity: 800 });
      expect(items[4]).toMatchObject({ SKU: 'TEST-004', Quantity: 200 });

      // Rows 6-15 must NOT be truncated
      expect(items[5]).toMatchObject({ SKU: 'TEST-005', Quantity: 600 });
      expect(items[6]).toMatchObject({ SKU: 'TEST-001', Quantity: 1200 });
      expect(items[7]).toMatchObject({ SKU: 'TEST-002', Quantity: 350 });
      expect(items[8]).toMatchObject({ SKU: 'TEST-003', Quantity: 750 });
      expect(items[9]).toMatchObject({ SKU: 'TEST-004', Quantity: 250 });
      expect(items[10]).toMatchObject({ SKU: 'TEST-005', Quantity: 700 });
      expect(items[11]).toMatchObject({ SKU: 'TEST-001', Quantity: 1500 });
      expect(items[12]).toMatchObject({ SKU: 'TEST-002', Quantity: 400 });
      expect(items[13]).toMatchObject({ SKU: 'TEST-003', Quantity: 900 });
      expect(items[14]).toMatchObject({ SKU: 'TEST-004', Quantity: 300 });

      // Full end-to-end inbound processing
      const inboundResult = await InboundProcessorService.processInboundInquiry({
        tenantId: 'default',
        from: 'tsuikelvin0804@gmail.com',
        subject: 'Re: Re: Quotation request - consolidated RFQ Oct',
        text: emailText
      });

      expect(inboundResult.success).toBe(true);
      const savedQuote = QuoteStoreService.getQuote(inboundResult.quotationNumber!, 'default');
      expect(savedQuote?.items.length).toBe(15);
    });
  });

  // ==========================================
  // Report 20 (TC-R3 / P35): Spanish Multilingual Inquiry
  // ==========================================
  describe('TC-R3 (Report 20 / P35): Spanish Multilingual Inquiry Parsing', () => {
    it('should parse Spanish units (piezas) and extract buyer & company from sign-off', async () => {
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

      const extraction = await aiService.extractPOFromText(spanishEmail);
      const poData = extraction.data;

      // 1. Quantities: 500 piezas and 800 piezas
      expect(poData.Items.length).toBe(2);
      expect(poData.Items[0].SKU).toBe('TEST-005');
      expect(poData.Items[0].Quantity).toBe(500);

      expect(poData.Items[1].SKU).toBe('TEST-002');
      expect(poData.Items[1].Quantity).toBe(800);

      // 2. Buyer name & Company name
      expect(poData.BuyerContact?.Name).toBe('Carlos Méndez');
      expect(poData.CustomerName).toBe('Importadora Andina');

      // 3. End-to-end inbound processing
      const result = await InboundProcessorService.processInboundInquiry({
        tenantId: 'default',
        from: 'tsuikelvin0804@gmail.com',
        subject: 'Solicitud de cotización - Juntas de goma',
        text: spanishEmail
      });

      expect(result.success).toBe(true);
      const quote = QuoteStoreService.getQuote(result.quotationNumber!, 'default');
      expect(quote).toBeDefined();

      expect(quote?.buyerName).toBe('Carlos Méndez');
      expect(quote?.customerName).toBe('Importadora Andina');
      expect(quote?.items.find(i => i.sku === 'TEST-005')?.quantity).toBe(500);
      expect(quote?.items.find(i => i.sku === 'TEST-002')?.quantity).toBe(800);
    });

    it('should recognize French, German, and Portuguese units as well', async () => {
      const multilingualText = [
        'TEST-005 - 450 unidades (Portuguese)',
        'TEST-001 - 650 pièces (French)',
        'TEST-003 - 750 Stück (German)',
        '',
        'Cordialement,',
        'Pierre Laurent / EuroTrade SAS'
      ].join('\n');

      const extraction = await aiService.extractPOFromText(multilingualText);
      const items = extraction.data.Items;

      expect(items.find(i => i.SKU === 'TEST-005')?.Quantity).toBe(450);
      expect(items.find(i => i.SKU === 'TEST-001')?.Quantity).toBe(650);
      expect(items.find(i => i.SKU === 'TEST-003')?.Quantity).toBe(750);
      expect(extraction.data.BuyerContact?.Name).toBe('Pierre Laurent');
      expect(extraction.data.CustomerName).toBe('EuroTrade SAS');
    });

    it('should correctly parse multiline sign-off without slash and handle quoted-printable', async () => {
      const qpEmail = [
        'From: "kelvin tsui" <tsuikelvin0804@gmail.com>',
        'Subject: Solicitud de cotización',
        '',
        'Estimados se=C3=B1ores,',
        'TEST-005 - 500 piezas',
        'TEST-002 - 800 piezas',
        '',
        'Saludos cordiales,',
        'Carlos M=C3=A9ndez',
        'Importadora Andina'
      ].join('\n');

      const extraction = await aiService.extractPOFromText(qpEmail);
      expect(extraction.data.BuyerContact?.Name).toBe('Carlos Méndez');
      expect(extraction.data.CustomerName).toBe('Importadora Andina');
      expect(extraction.data.Items.find(i => i.SKU === 'TEST-005')?.Quantity).toBe(500);
      expect(extraction.data.Items.find(i => i.SKU === 'TEST-002')?.Quantity).toBe(800);
    });
  });

  // ==========================================
  // Report 21: Idempotency, Deduplication & Dummy Quote Auto-Cleanup
  // ==========================================
  describe('Report 21: Inquiry Idempotency & De-duplication', () => {
    it('should record inquiryMessageId and allow finding quote by Message-ID', async () => {
      const testMsgId = `<inquiry-test-qa21-${Date.now()}@domain.com>`;
      const payload = {
        tenantId: 'default',
        from: 'buyer@acme-global.com',
        subject: 'Urgent RFQ Oct 2026',
        text: 'Please quote TEST-001 - 500 pcs FOB Shenzhen. Thanks, Sarah / Acme Corp',
        messageId: testMsgId
      };

      const result1 = await InboundProcessorService.processInboundInquiry(payload);
      expect(result1.success).toBe(true);
      const quoteNum1 = result1.quotationNumber!;

      // Second check: QuoteStoreService can find the quote by Message-ID
      const found = QuoteStoreService.findQuoteByMessageId('default', testMsgId);
      expect(found).toBeDefined();
      expect(found?.quotationNumber).toBe(quoteNum1);
      expect(found?.inquiryMessageId).toBe(testMsgId.replace(/[<>]/g, '').trim());
    });

    it('should automatically clean up placeholder dummy quote when a valid quote arrives for same Message-ID', async () => {
      const msgId = `qa21-replace-test-${Date.now()}`;
      // 1. First quote is a dummy placeholder quote
      const dummyQuote = {
        quotationNumber: `QT-DUMMY-${Date.now().toString().slice(-4)}`,
        tenantId: 'default',
        customerName: 'Valued Global Buyer',
        buyerName: 'Valued Purchasing Manager',
        buyerEmail: '',
        date: '2026-10-14',
        currency: 'USD',
        rateUsed: 7.2,
        items: [
          { sku: 'PENDING-SKU-01', description: 'Pending', quantity: 1000, basePriceRMB: 0, profitMargin: 0.2, fobCostRMB: 0, unitPriceForeign: 0, subTotalForeign: 0, status: 'NEED_MANUAL_PRICE' as any }
        ],
        totalAmountForeign: 0,
        hasWarnings: true,
        warnings: [],
        riskDisclaimers: [],
        termsAndConditions: '',
        aiConfidenceScore: 50,
        aiModelUsed: 'offline',
        processedAt: new Date().toISOString(),
        inquiryMessageId: msgId
      };
      QuoteStoreService.saveQuote(dummyQuote, undefined, 'default');
      expect(QuoteStoreService.getQuote(dummyQuote.quotationNumber, 'default')).toBeDefined();

      // 2. Second processing is a valid 2-item quote with the same messageId
      const realResult = await InboundProcessorService.processInboundInquiry({
        tenantId: 'default',
        from: 'buyer@real.com',
        subject: 'Valid RFQ',
        text: 'ST-2026-A - 500 pcs\nERG-PRO-V2 - 200 pcs\nBest regards,\nJohn Doe / Real Inc',
        messageId: msgId
      });
      expect(realResult.success).toBe(true);

      // The old dummy quote must be automatically deleted!
      expect(QuoteStoreService.getQuote(dummyQuote.quotationNumber, 'default')).toBeNull();

      // The new quote must exist and be valid
      const newQuote = QuoteStoreService.getQuote(realResult.quotationNumber!, 'default');
      expect(newQuote).toBeDefined();
      expect(newQuote?.items.length).toBeGreaterThanOrEqual(2);
      expect(newQuote?.totalAmountForeign).toBeGreaterThan(0);
    });
  });
});
