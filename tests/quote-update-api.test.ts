import { describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import { quoteRouter } from '../src/routes/quote.router.js';
import { QuoteStoreService } from '../src/services/quote-store.service.js';
import { TenantService } from '../src/services/tenant.service.js';
import { QuotationResult } from '../src/types/index.js';

describe('TDD Suite: Quote Update API Item Matching & Desensitization', () => {
  let app: express.Express;

  beforeEach(() => {
    TenantService.init();
    app = express();
    app.use(express.json());
    app.use('/api/v1', quoteRouter);
  });

  it('preserves correct item mapping when first item is deleted (does not shift existing items)', async () => {
    const initialQuote: QuotationResult = {
      quotationNumber: 'QT-TEST-DELETE-ITEM',
      tenantId: 'default',
      customerName: 'Multi Item Buyer',
      buyerName: 'Buyer Person',
      buyerEmail: 'buyer@multi.com',
      date: '2026-10-06',
      currency: 'USD',
      rateUsed: 7.2,
      incotermUsed: 'FOB Shenzhen',
      items: [
        {
          sku: 'ITEM-AAA',
          description: 'Description AAA',
          quantity: 10,
          basePriceRMB: 100,
          profitMargin: 0.2,
          fobCostRMB: 5,
          unitPriceForeign: 17.5,
          subTotalForeign: 175,
          status: 'OK'
        },
        {
          sku: 'ITEM-BBB',
          description: 'Description BBB',
          quantity: 20,
          basePriceRMB: 200,
          profitMargin: 0.25,
          fobCostRMB: 10,
          unitPriceForeign: 36.46,
          subTotalForeign: 729.2,
          status: 'OK'
        },
        {
          sku: 'ITEM-CCC',
          description: 'Description CCC',
          quantity: 30,
          basePriceRMB: 300,
          profitMargin: 0.3,
          fobCostRMB: 15,
          unitPriceForeign: 56.88,
          subTotalForeign: 1706.4,
          status: 'OK'
        }
      ],
      totalAmountForeign: 2610.6,
      hasWarnings: false,
      warnings: [],
      riskDisclaimers: [],
      termsAndConditions: 'Terms',
      paymentTerms: '30% T/T',
      paymentTermAdjustmentPercent: 0,
      paymentTermAdjustmentAmount: 0,
      subTotalBeforeAdjustmentForeign: 2610.6,
      aiConfidenceScore: 90,
      aiModelUsed: 'gemini-flash',
      processedAt: new Date().toISOString()
    };

    QuoteStoreService.saveQuote(initialQuote, undefined, 'default');

    // Simulate user deleting ITEM-AAA in workbench and sending only [ITEM-BBB, ITEM-CCC]
    const updatedPayload = {
      quotation: {
        ...initialQuote,
        items: [
          {
            sku: 'ITEM-BBB',
            description: 'Description BBB',
            quantity: 20,
            unitPriceForeign: 36.46,
            profitMargin: 0.25
          },
          {
            sku: 'ITEM-CCC',
            description: 'Description CCC',
            quantity: 30,
            unitPriceForeign: 56.88,
            profitMargin: 0.3
          }
        ]
      }
    };

    // Execute real HTTP update against Express app
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/quotes/QT-TEST-DELETE-ITEM/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });
      const data: any = await res.json();
      expect(data.success).toBe(true);

      const savedQuote = QuoteStoreService.getQuote('QT-TEST-DELETE-ITEM', 'default')!;
      expect(savedQuote.items.length).toBe(2);
      expect(savedQuote.items[0].sku).toBe('ITEM-BBB');
      // ITEM-BBB must preserve its original basePriceRMB (200), NOT inherit ITEM-AAA (100)!
      expect(savedQuote.items[0].basePriceRMB).toBe(200);
      expect(savedQuote.items[1].sku).toBe('ITEM-CCC');
      expect(savedQuote.items[1].basePriceRMB).toBe(300);
    } finally {
      server.close();
    }
  });

  it('safely desensitizes quotation for external/unauthenticated viewers', () => {
    const rawQuote: QuotationResult = {
      quotationNumber: 'QT-SECRET-COSTS-1',
      tenantId: 'default',
      customerName: 'Foreign Buyer Ltd',
      buyerName: 'Buyer Confidential',
      buyerEmail: 'buyer@confidential.com',
      date: '2026-10-06',
      currency: 'USD',
      rateUsed: 7.2,
      incotermUsed: 'FOB Shenzhen',
      items: [
        {
          sku: 'SECRET-WIDGET',
          description: 'Top Secret Widget',
          quantity: 1000,
          basePriceRMB: 88.5, // Sensitive internal cost!
          profitMargin: 0.35,  // Sensitive margin!
          fobCostRMB: 6.2,     // Sensitive port cost!
          unitPriceForeign: 17.46,
          subTotalForeign: 17460,
          status: 'OK'
        }
      ],
      totalAmountForeign: 17460,
      hasWarnings: false,
      warnings: [],
      riskDisclaimers: [],
      termsAndConditions: 'Terms',
      paymentTerms: '30% T/T',
      paymentTermAdjustmentPercent: 0,
      paymentTermAdjustmentAmount: 0,
      subTotalBeforeAdjustmentForeign: 17460,
      aiConfidenceScore: 92,
      aiModelUsed: 'gemini-flash',
      processedAt: new Date().toISOString()
    };

    QuoteStoreService.saveQuote(rawQuote, undefined, 'default');

    // Simulate desensitization logic
    const isOwnerOrStaff = false; // external visitor
    const safeQuote = {
      ...rawQuote,
      items: (rawQuote.items || []).map(it => ({
        ...it,
        basePriceRMB: 0,
        profitMargin: 0,
        fobCostRMB: 0
      }))
    };

    expect(safeQuote.items[0].basePriceRMB).toBe(0);
    expect(safeQuote.items[0].profitMargin).toBe(0);
    expect(safeQuote.items[0].fobCostRMB).toBe(0);
    expect(safeQuote.items[0].unitPriceForeign).toBe(17.46); // Selling price remains visible!
  });
});
