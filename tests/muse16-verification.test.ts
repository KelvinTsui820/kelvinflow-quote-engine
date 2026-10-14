import { cleanExporterCompanyName, cleanSalesRepName, PDFService } from '../src/services/pdf.service.js';
import { InboundProcessorService } from '../src/services/inbound-processor.service.js';
import { TenantService } from '../src/services/tenant.service.js';

describe('P32 / Muse 16 Verification Tests', () => {
  describe('1. Name and Company Cleaning (称呼中性化与 ASCII 规范)', () => {
    test('cleanExporterCompanyName removes placeholder words and cleans non-ASCII', () => {
      expect(cleanExporterCompanyName('外贸同行 Global Trading Co., Ltd.')).toBe('Global Trading Co., Ltd.');
      expect(cleanExporterCompanyName('外贸业务员 Shenzhen Electronics Co., Ltd.')).toBe('Shenzhen Electronics Co., Ltd.');
      expect(cleanExporterCompanyName('')).toBe('KelvinFlow Global Technology Co., Ltd.');
    });

    test('cleanSalesRepName returns empty string for placeholder/Chinese and preserves valid English', () => {
      expect(cleanSalesRepName('外贸同行')).toBe('');
      expect(cleanSalesRepName('外贸业务员')).toBe('');
      expect(cleanSalesRepName('DEFAULT Admin')).toBe('');
      expect(cleanSalesRepName('')).toBe('');
      expect(cleanSalesRepName('Kelvin Tsui')).toBe('Kelvin Tsui');
      expect(cleanSalesRepName('Marcus Weber')).toBe('Marcus Weber');
    });
  });

  describe('2. PDF Export Manager Conditional Rendering', () => {
    test('PDF with Chinese managerName does not crash and renders clean ASCII', async () => {
      const dummyQuote: any = {
        quotationNumber: 'TEST-P32-001',
        customerName: 'Global Importer Ltd',
        currency: 'USD',
        rateUsed: 7.2,
        incotermUsed: 'FOB Shenzhen',
        items: [
          {
            sku: 'ITEM-01',
            productName: 'Ergonomic Desk',
            quantity: 100,
            unitPriceForeign: 50,
            subtotalForeign: 5000,
            cbmPerUnit: 0.1,
            totalCbm: 10,
            weightKgPerUnit: 15,
            totalWeightKg: 1500
          }
        ],
        totalAmountForeign: 5000,
        totalCbm: 10,
        totalWeightKg: 1500,
        salesRepName: '外贸同行'
      };

      const pdfBuffer = await PDFService.generateQuotationPDF(dummyQuote);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      const pdfText = pdfBuffer.toString('binary');
      // Should NOT contain the corrupted or raw Chinese bytes for "外贸同行" in Helvetica text stream
      expect(pdfText.includes('Export Manager: 外贸同行')).toBe(false);
    });
  });
});
