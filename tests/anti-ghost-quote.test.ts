import fs from 'fs';
import path from 'path';
import { DraftService } from '../src/services/draft.service.js';
import { QuoteStoreService } from '../src/services/quote-store.service.js';
import { QuotationResult } from '../src/types/index.js';

describe('Anti-Ghost Quote Defense System (防幽灵单拦截器与门禁测试)', () => {
  const testTenantId = 'tenant_anti_ghost_test';
  const testQuoteId = 'QT-ANTI-GHOST-999999';

  const mockQuote: QuotationResult = {
    quotationNumber: testQuoteId,
    customerName: 'Test Buyer Corp',
    buyerName: 'Test Buyer',
    buyerEmail: 'buyer@test.com',
    date: '2026-10-13',
    currency: 'USD',
    rateUsed: 7.2,
    totalAmountForeign: 1500,
    incotermUsed: 'FOB Shenzhen Port',
    paymentTerms: 'T/T 30% Deposit',
    leadTime: '15 days',
    tenantId: testTenantId,
    hasWarnings: false,
    warnings: [],
    riskDisclaimers: [],
    termsAndConditions: 'Standard FOB Terms',
    paymentTermAdjustmentPercent: 0,
    paymentTermAdjustmentAmount: 0,
    subTotalBeforeAdjustmentForeign: 1500,
    aiConfidenceScore: 95,
    aiModelUsed: 'gemini-3.5-flash',
    processedAt: new Date().toISOString(),
    items: [
      {
        sku: 'TEST-001',
        description: 'Test Product 1',
        quantity: 100,
        basePriceRMB: 50,
        fobCostRMB: 5,
        profitMargin: 0.3,
        unitPriceForeign: 15,
        subTotalForeign: 1500,
        status: 'OK',
        itemConfidenceScore: 95
      }
    ]
  };

  afterEach(() => {
    // 清理测试租户数据
    const tenantDir = path.join(process.cwd(), 'data', 'tenants', testTenantId);
    if (fs.existsSync(tenantDir)) {
      fs.rmSync(tenantDir, { recursive: true, force: true });
    }
  });

  describe('DraftService.sendReviewEmail 门禁拦截', () => {
    test('当单据在存储中不存在时，坚决阻断外发邮件并返回 blocked_ghost_quote', async () => {
      const ghostId = 'QT-NON-EXISTENT-888';
      const result = await DraftService.sendReviewEmail({
        to: 'buyer@test.com',
        subject: 'Ghost Quote Subject',
        text: 'Ghost Quote Body',
        quotationNumber: ghostId,
        tenantId: testTenantId
      });

      expect(result.sent).toBe(false);
      expect(result.method).toBe('blocked_ghost_quote');
      expect(result.error).toContain('幽灵邮件防范阻断');
      expect(result.error).toContain(ghostId);
    });

    test('当单据在存储中真实存在且持久化正常时，通过门禁检查', async () => {
      // 先保存单据
      QuoteStoreService.saveQuote(mockQuote, Buffer.from('%PDF-1.4 mock'), testTenantId);
      
      const persisted = QuoteStoreService.getQuote(testQuoteId, testTenantId);
      expect(persisted).not.toBeNull();
      expect(persisted?.quotationNumber).toBe(testQuoteId);

      // 验证 sendReviewEmail 不会被 blocked_ghost_quote 拦截
      const result = await DraftService.sendReviewEmail({
        to: 'buyer@test.com',
        subject: 'Valid Quote Subject',
        text: 'Valid Quote Body',
        quotationNumber: testQuoteId,
        tenantId: testTenantId
      });

      // 在无外部 SMTP/Resend key 时，平滑进入 workbench_store，绝不是 blocked_ghost_quote
      expect(result.method).not.toBe('blocked_ghost_quote');
    });
  });

  describe('DraftService.appendDraft 草稿箱门禁拦截', () => {
    test('当单据在存储中不存在时，坚决阻断注入草稿并报错', async () => {
      const ghostId = 'QT-NON-EXISTENT-777';
      const result = await DraftService.appendDraft({
        userEmail: 'sales@test.com',
        authCode: 'mockAuthCode',
        to: 'buyer@test.com',
        subject: 'Ghost Draft',
        text: 'Ghost Draft Body',
        quotationNumber: ghostId,
        tenantId: testTenantId
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('幽灵草稿防范阻断');
      expect(result.error).toContain(ghostId);
    });
  });
});
