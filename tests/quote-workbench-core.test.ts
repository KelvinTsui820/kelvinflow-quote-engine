import { describe, it, expect, beforeEach } from '@jest/globals';
import { PricingService } from '../src/services/pricing.service.js';
import { PDFService, numberToWordsUSD } from '../src/services/pdf.service.js';
import { QuoteStoreService } from '../src/services/quote-store.service.js';
import { TenantService } from '../src/services/tenant.service.js';
import { QuotationResult, StandardPriceItem, StandardExchangeRate, POExtractionResult } from '../src/types/index.js';

describe('TDD Suite: Quote Workbench Core Logic & Edge Cases', () => {
  beforeEach(() => {
    TenantService.init();
  });

  // =========================================================================
  // 1. PDF Service Number-to-Words & Robustness (Prove-It Pattern)
  // =========================================================================
  describe('PDFService Currency & Number-To-Words Edge Cases', () => {
    it('formats number to words avoiding 100/100 cents rounding overflow and supporting billions', () => {
      // 19.999 must round to TWENTY AND 00/100, NOT NINETEEN AND 100/100
      expect(numberToWordsUSD(19.999)).toBe('SAY TOTAL US DOLLARS TWENTY AND 00/100 ONLY');
      
      // Standard exact dollars
      expect(numberToWordsUSD(100.5)).toBe('SAY TOTAL US DOLLARS ONE HUNDRED AND 50/100 ONLY');

      // Billion scale
      expect(numberToWordsUSD(1500000000)).toBe('SAY TOTAL US DOLLARS ONE BILLION FIVE HUNDRED MILLION AND 00/100 ONLY');

      // Zero or null
      expect(numberToWordsUSD(0)).toBe('SAY TOTAL US DOLLARS ZERO AND 00/100 ONLY');
      expect(numberToWordsUSD(null)).toBe('SAY TOTAL US DOLLARS ZERO AND 00/100 ONLY');
      expect(numberToWordsUSD(undefined)).toBe('SAY TOTAL US DOLLARS ZERO AND 00/100 ONLY');
    });

    it('correctly handles amounts ending in .999 cents without producing 100/100 cents bug', async () => {
      // Bug: amount = 19.999 resulted in Math.floor(19.999)=19 and Math.round(0.999*100)=100 -> "NINETEEN AND 100/100"
      const quote: QuotationResult = {
        quotationNumber: 'QT-TEST-CENTS-999',
        tenantId: 'default',
        customerName: 'Cents Test Corp',
        buyerName: 'John Cents',
        buyerEmail: 'john@cents.com',
        date: '2026-10-06',
        currency: 'USD',
        rateUsed: 7.2,
        incotermUsed: 'FOB Shenzhen',
        items: [
          {
            sku: 'ITEM-CENTS',
            description: 'Item with .999 cents',
            quantity: 1,
            unitPriceForeign: 19.999,
            subTotalForeign: 19.999,
            basePriceRMB: 100,
            profitMargin: 0.2,
            fobCostRMB: 0,
            status: 'OK'
          }
        ],
        totalAmountForeign: 19.999,
        hasWarnings: false,
        warnings: [],
        riskDisclaimers: [],
        termsAndConditions: 'Standard Terms',
        paymentTerms: '30% T/T',
        paymentTermAdjustmentPercent: 0,
        paymentTermAdjustmentAmount: 0,
        subTotalBeforeAdjustmentForeign: 19.999,
        aiConfidenceScore: 95,
        aiModelUsed: 'gemini-flash',
        processedAt: new Date().toISOString()
      };

      const pdfBuffer = await PDFService.generateQuotationPDF(quote);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
    });

    it('handles billion-dollar scale contracts without overflow or NaN', async () => {
      const quote: QuotationResult = {
        quotationNumber: 'QT-TEST-BILLION',
        tenantId: 'default',
        customerName: 'Mega Infrastructure LLC',
        buyerName: 'Director Mega',
        buyerEmail: 'mega@infra.com',
        date: '2026-10-06',
        currency: 'USD',
        rateUsed: 7.2,
        incotermUsed: 'CIF Dubai',
        items: [
          {
            sku: 'INFRA-001',
            description: 'Heavy Industrial Turbine',
            quantity: 1,
            unitPriceForeign: 1500000000,
            subTotalForeign: 1500000000,
            basePriceRMB: 7000000000,
            profitMargin: 0.25,
            fobCostRMB: 0,
            status: 'OK'
          }
        ],
        totalAmountForeign: 1500000000,
        hasWarnings: false,
        warnings: [],
        riskDisclaimers: [],
        termsAndConditions: 'Standard Terms',
        paymentTerms: '100% L/C',
        paymentTermAdjustmentPercent: 0,
        paymentTermAdjustmentAmount: 0,
        subTotalBeforeAdjustmentForeign: 1500000000,
        aiConfidenceScore: 99,
        aiModelUsed: 'gemini-flash',
        processedAt: new Date().toISOString()
      };

      const pdfBuffer = await PDFService.generateQuotationPDF(quote);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
    });

    it('handles undefined or null totalAmountForeign without throwing TypeError', async () => {
      const quote: any = {
        quotationNumber: 'QT-TEST-UNDEFINED-TOTAL',
        tenantId: 'default',
        customerName: 'Zero Corp',
        buyerName: 'Jane Null',
        buyerEmail: 'jane@null.com',
        date: '2026-10-06',
        currency: 'USD',
        rateUsed: 7.2,
        incotermUsed: 'FOB Port',
        items: [],
        totalAmountForeign: undefined, // specifically undefined!
        hasWarnings: false,
        warnings: [],
        riskDisclaimers: [],
        termsAndConditions: 'Terms',
        paymentTerms: '30% T/T',
        paymentTermAdjustmentPercent: 0,
        paymentTermAdjustmentAmount: 0,
        subTotalBeforeAdjustmentForeign: 0,
        aiConfidenceScore: 80,
        processedAt: new Date().toISOString()
      };

      // Must not throw "Cannot read properties of undefined (reading 'toLocaleString')"
      const pdfBuffer = await PDFService.generateQuotationPDF(quote);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
    });

    it('renders empty items array or items with missing fields safely without crashing', async () => {
      const quote: any = {
        quotationNumber: 'QT-TEST-MISSING-FIELDS',
        tenantId: 'default',
        customerName: 'Edge Test',
        buyerName: 'Test Buyer',
        buyerEmail: 'test@buyer.com',
        date: '2026-10-06',
        currency: 'USD',
        rateUsed: 7.2,
        incotermUsed: 'FOB Port',
        items: [
          {
            // Missing sku, description, quantity, unitPriceForeign
            sku: undefined,
            description: undefined,
            quantity: undefined,
            unitPriceForeign: undefined
          }
        ],
        totalAmountForeign: 0,
        hasWarnings: false,
        warnings: [],
        riskDisclaimers: [],
        termsAndConditions: 'Terms',
        paymentTerms: '30% T/T',
        paymentTermAdjustmentPercent: 0,
        paymentTermAdjustmentAmount: 0,
        subTotalBeforeAdjustmentForeign: 0,
        aiConfidenceScore: 80,
        processedAt: new Date().toISOString()
      };

      const pdfBuffer = await PDFService.generateQuotationPDF(quote);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
    });
  });

  // =========================================================================
  // 2. Pricing Engine Edge Cases & Safeguards
  // =========================================================================
  describe('PricingService Calculation & Business Guards', () => {
    const mockCatalog: StandardPriceItem[] = [
      {
        rawSku: 'CHAIR-PRO-01',
        normalizedSku: 'CHAIRPRO01',
        productName: 'Executive Ergonomic Chair',
        basePrice: 200,
        profitMargin: 0.25,
        fobCost: 0,
        moq: 50,
        floorPrice: 180,
        sampleMultiplier: 2.0,
        pcsPerCtn: 1,
        cbmPerCtn: 0.15,
        gwPerCtn: 18
      },
      {
        rawSku: 'ACC-BRACKET',
        normalizedSku: 'ACCBRACKET',
        productName: 'Steel Mounting Bracket',
        basePrice: 20,
        profitMargin: 0.3,
        fobCost: 0,
        moq: 500,
        floorPrice: 15,
        pcsPerCtn: 50,
        cbmPerCtn: 0.05,
        gwPerCtn: 25
      }
    ];

    const mockRates: StandardExchangeRate[] = [
      { currency: 'USD', rateToRMB: 7.2, symbol: '$' },
      { currency: 'EUR', rateToRMB: 7.8, symbol: '€' }
    ];

    function createMockPO(partial: Partial<POExtractionResult> & { Items: any[] }): POExtractionResult {
      return {
        ConfidenceScore: partial.ConfidenceScore ?? 90,
        MissingInfo: partial.MissingInfo ?? [],
        IsStandardOrder: partial.IsStandardOrder ?? true,
        PONumber: partial.PONumber ?? 'PO-TEST-001',
        CustomerName: partial.CustomerName ?? 'Test Customer',
        Date: partial.Date ?? '2026-10-06',
        TotalOrderValue: partial.TotalOrderValue ?? null,
        Currency: partial.Currency ?? 'USD',
        DeliveryDetails: partial.DeliveryDetails ?? '',
        SpecialRemarks: partial.SpecialRemarks ?? '',
        UncategorizedCriticalInfo: partial.UncategorizedCriticalInfo ?? '',
        BuyerContact: partial.BuyerContact ?? {
          Name: 'Buyer Contact',
          Email: 'buyer@test.com'
        },
        ...partial
      };
    }

    it('marks unmatched SKU as NEED_MANUAL_PRICE with unitPriceForeign 0 instead of crashing', () => {
      const po = createMockPO({
        PONumber: 'PO-UNKNOWN-1',
        CustomerName: 'Unknown Corp',
        ConfidenceScore: 85,
        Items: [
          {
            SKU: 'TOTALLY-NEW-MODEL-999',
            Description: 'Special Custom Prototype',
            Quantity: 100
          }
        ]
      });

      const result = PricingService.calculate(po, mockCatalog, mockRates);
      expect(result.items.length).toBe(1);
      expect(result.items[0].status).toBe('NEED_MANUAL_PRICE');
      expect(result.items[0].basePriceRMB).toBe(0);
      expect(result.items[0].unitPriceForeign).toBe(0);
      expect(result.items[0].subTotalForeign).toBe(0);
      expect(result.warnings.some(w => w.includes('not found in pricing catalog'))).toBe(true);
    });

    it('applies sample multiplier when quantity <= 3 and sampleMultiplier > 1', () => {
      const po = createMockPO({
        PONumber: 'PO-SAMPLE-TEST',
        CustomerName: 'Sample Buyer',
        ConfidenceScore: 90,
        Items: [
          {
            SKU: 'CHAIR-PRO-01',
            Description: 'Sample piece',
            Quantity: 2
          }
        ]
      });

      const result = PricingService.calculate(po, mockCatalog, mockRates);
      expect(result.items.length).toBe(1);
      // Base price 200 * sampleMultiplier 2.0 = 400 RMB
      expect(result.items[0].basePriceRMB).toBe(400);
      expect(result.items[0].appliedTier).toContain('Sample Tier (2x Rate)');
      expect(result.riskDisclaimers.some(d => d.includes('Sample Order Policy'))).toBe(true);
    });

    it('enforces floor price protection when catalog base price is adjusted below floorPrice', () => {
      const lowPriceCatalog: StandardPriceItem[] = [
        {
          rawSku: 'FLOOR-TEST',
          normalizedSku: 'FLOORTEST',
          productName: 'Floor Test Item',
          basePrice: 50,
          floorPrice: 70, // Floor price is higher than base price
          profitMargin: 0.2,
          fobCost: 0,
          moq: 1
        }
      ];

      const po = createMockPO({
        PONumber: 'PO-FLOOR-1',
        CustomerName: 'Floor Corp',
        ConfidenceScore: 90,
        Items: [
          {
            SKU: 'FLOOR-TEST',
            Description: 'Floor test item',
            Quantity: 10
          }
        ]
      });

      const result = PricingService.calculate(po, lowPriceCatalog, mockRates);
      expect(result.items[0].basePriceRMB).toBe(70); // Adjusted up to floor price
      expect(result.items[0].floorPriceWarning).toBeDefined();
    });

    it('generates MOQ notice when requested quantity is less than required MOQ', () => {
      const po = createMockPO({
        PONumber: 'PO-MOQ-1',
        CustomerName: 'MOQ Buyer',
        ConfidenceScore: 90,
        Items: [
          {
            SKU: 'ACC-BRACKET',
            Description: 'Bracket small qty',
            Quantity: 50 // MOQ is 500
          }
        ]
      });

      const result = PricingService.calculate(po, mockCatalog, mockRates);
      expect(result.items[0].moqWarning).toContain('MOQ Warning: Ordered 50 pcs, MOQ is 500 pcs');
      expect(result.warnings.some(w => w.includes('[MOQ NOTICE]'))).toBe(true);
    });

    it('correctly calculates container utilization and suggests proper container mode', () => {
      const po = createMockPO({
        PONumber: 'PO-CONTAINER-1',
        CustomerName: 'Big Order Buyer',
        ConfidenceScore: 95,
        Items: [
          {
            SKU: 'CHAIR-PRO-01', // 0.15 CBM per piece
            Description: 'Full container order',
            Quantity: 400 // 400 * 0.15 = 60 CBM -> fits 1x 40'HQ (68 CBM)
          }
        ]
      });

      const result = PricingService.calculate(po, mockCatalog, mockRates);
      expect(result.containerEstimate).toBeDefined();
      expect(result.containerEstimate?.totalCBM).toBe(60);
      expect(result.containerEstimate?.recommendedContainer).toContain("40'HQ High-Cube");
    });
  });

  // =========================================================================
  // 3. Multi-Tenant Quote Isolation & Persistence
  // =========================================================================
  describe('QuoteStoreService Multi-Tenant Isolation & Mutation Safety', () => {
    it('isolates quotations so Tenant B cannot access Tenant A quotes', () => {
      const tenantAQuote: QuotationResult = {
        quotationNumber: 'QT-TENANT-A-001',
        tenantId: 'tenant_alpha',
        customerName: 'Alpha Client',
        buyerName: 'Alpha Buyer',
        buyerEmail: 'client@alpha.com',
        date: '2026-10-06',
        currency: 'USD',
        rateUsed: 7.2,
        incotermUsed: 'FOB Shenzhen',
        items: [
          {
            sku: 'ALPHA-SKU',
            description: 'Alpha Exclusive Product',
            quantity: 100,
            basePriceRMB: 150,
            profitMargin: 0.3,
            fobCostRMB: 0,
            unitPriceForeign: 27.08,
            subTotalForeign: 2708,
            status: 'OK'
          }
        ],
        totalAmountForeign: 2708,
        hasWarnings: false,
        warnings: [],
        riskDisclaimers: [],
        termsAndConditions: 'Alpha Terms',
        paymentTerms: '30% T/T',
        paymentTermAdjustmentPercent: 0,
        paymentTermAdjustmentAmount: 0,
        subTotalBeforeAdjustmentForeign: 2708,
        aiConfidenceScore: 95,
        aiModelUsed: 'gemini-flash',
        processedAt: new Date().toISOString()
      };

      QuoteStoreService.saveQuote(tenantAQuote, undefined, 'tenant_alpha');

      // 1. Tenant Alpha gets its quote
      const fetchedByA = QuoteStoreService.getQuote('QT-TENANT-A-001', 'tenant_alpha');
      expect(fetchedByA).not.toBeNull();
      expect(fetchedByA?.customerName).toBe('Alpha Client');

      // 2. Tenant Beta attempting to get Tenant Alpha quote returns null (strictly prevented!)
      const fetchedByB = QuoteStoreService.getQuote('QT-TENANT-A-001', 'tenant_beta');
      expect(fetchedByB).toBeNull();
    });
  });
});
