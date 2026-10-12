import { ExchangeRateService } from '../src/services/exchangeRate.service.js';
import { PDFService } from '../src/services/pdf.service.js';
import { QuotationResult } from '../src/types/index.js';

describe('ExchangeRateService & FX Safety Engine Unit Tests', () => {
  test('ExchangeRateService.getLatestRates returns valid rates for all supported trade currencies', async () => {
    const result = await ExchangeRateService.getLatestRates();
    expect(result.success).toBe(true);
    expect(['sina_finance', 'open_er_api', 'local_cache']).toContain(result.source);
    expect(result.rates).toBeDefined();

    const expectedCurrencies = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'HKD'];
    for (const cur of expectedCurrencies) {
      const info = result.rates[cur];
      expect(info).toBeDefined();
      expect(info.currency).toBe(cur);
      expect(info.buyingRate).toBeGreaterThan(0);
      expect(info.sellingRate).toBeGreaterThan(0);
      expect(info.midRate).toBeGreaterThan(0);
      expect(info.buyingRate).toBeLessThanOrEqual(info.sellingRate); // 买入价必须不高于卖出价
      expect(info.time).toMatch(/^\d{2}:\d{2}(:\d{2})?$/);
      expect(info.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('ExchangeRateService.getRateForCurrency returns target currency correctly', async () => {
    const usdRate = await ExchangeRateService.getRateForCurrency('USD');
    expect(usdRate).not.toBeNull();
    expect(usdRate?.currency).toBe('USD');
    expect(usdRate?.buyingRate).toBeGreaterThan(5); // USD/CNY > 5

    const eurRate = await ExchangeRateService.getRateForCurrency('eur');
    expect(eurRate).not.toBeNull();
    expect(eurRate?.currency).toBe('EUR');

    const unknownRate = await ExchangeRateService.getRateForCurrency('XYZ_NON_EXISTENT');
    expect(unknownRate).toBeNull();
  });

  test('PDF Service includes exchange rate protection clause in Price & Validity', async () => {
    const mockQuote: QuotationResult = {
      quotationNumber: 'QT-TEST-FX-001',
      customerName: 'Global Trade Buyer Inc',
      buyerName: 'John Doe',
      buyerEmail: 'john@example.com',
      date: '2026-10-10',
      currency: 'USD',
      rateUsed: 7.1850,
      totalAmountForeign: 1000,
      hasWarnings: false,
      warnings: [],
      riskDisclaimers: [],
      termsAndConditions: '',
      aiConfidenceScore: 98,
      aiModelUsed: 'gemini-1.5-flash',
      processedAt: '2026-10-10T08:00:00Z',
      items: [
        {
          sku: 'SKU-001',
          description: 'High Quality Ceramic Mug',
          quantity: 100,
          basePriceRMB: 50,
          profitMargin: 0.2,
          fobCostRMB: 0,
          unitPriceForeign: 10,
          subTotalForeign: 1000,
          status: 'OK'
        }
      ],
      incotermUsed: 'FOB Shenzhen Port',
      paymentTerms: '30% T/T Deposit, 70% Balance against B/L'
    };

    const pdfBuffer = await PDFService.generateQuotationPDF(mockQuote, {
      companyName: 'Kelvin International Trading Co.'
    });

    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });
});
