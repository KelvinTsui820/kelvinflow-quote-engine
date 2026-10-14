import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import express from 'express';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { quoteRouter } from '../src/routes/quote.router.js';
import { QuoteStoreService } from '../src/services/quote-store.service.js';
import { TenantService } from '../src/services/tenant.service.js';
import { AuthService } from '../src/services/auth.service.js';
import { QuotationResult } from '../src/types/index.js';

describe('TDD Suite: Quote & Catalog Item Deletion APIs (D-12 Security & Audit)', () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    TenantService.init();
    app = express();
    app.use(express.json());
    app.use('/api/v1', quoteRouter);

    server = app.listen(0);
    const port = (server.address() as any).port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });


  // -------------------------------------------------------------------------
  // 1. 報價單整單刪除測試
  // -------------------------------------------------------------------------
  describe('Quote Deletion (DELETE /api/v1/quotes/:id)', () => {
    const quoteAlpha: QuotationResult = {
      quotationNumber: 'QT-TEST-ALPHA-DEL-01',
      tenantId: 'tenant_alpha',
      customerName: 'Alpha Corp',
      buyerName: 'Alpha Buyer',
      buyerEmail: 'buyer@alpha.com',
      date: '2026-10-13',
      currency: 'USD',
      rateUsed: 7.2,
      incotermUsed: 'FOB Shenzhen',
      items: [
        {
          sku: 'A-1',
          description: 'Item 1',
          quantity: 10,
          basePriceRMB: 50,
          profitMargin: 0.2,
          fobCostRMB: 5,
          unitPriceForeign: 100,
          subTotalForeign: 1000,
          status: 'OK'
        }
      ],
      totalAmountForeign: 1000,
      hasWarnings: false,
      warnings: [],
      riskDisclaimers: [],
      termsAndConditions: 'Standard Terms',
      paymentTerms: '30% T/T',
      paymentTermAdjustmentPercent: 0,
      paymentTermAdjustmentAmount: 0,
      subTotalBeforeAdjustmentForeign: 1000,
      aiConfidenceScore: 95,
      aiModelUsed: 'gemini-flash',
      processedAt: new Date().toISOString()
    };

    const quoteBeta: QuotationResult = {
      quotationNumber: 'QT-TEST-BETA-DEL-01',
      tenantId: 'tenant_beta',
      customerName: 'Beta Corp',
      buyerName: 'Beta Buyer',
      buyerEmail: 'buyer@beta.com',
      date: '2026-10-13',
      currency: 'USD',
      rateUsed: 7.2,
      incotermUsed: 'FOB Shenzhen',
      items: [
        {
          sku: 'B-1',
          description: 'Item 2',
          quantity: 5,
          basePriceRMB: 30,
          profitMargin: 0.2,
          fobCostRMB: 3,
          unitPriceForeign: 50,
          subTotalForeign: 250,
          status: 'OK'
        }
      ],
      totalAmountForeign: 250,
      hasWarnings: false,
      warnings: [],
      riskDisclaimers: [],
      termsAndConditions: 'Standard Terms',
      paymentTerms: '30% T/T',
      paymentTermAdjustmentPercent: 0,
      paymentTermAdjustmentAmount: 0,
      subTotalBeforeAdjustmentForeign: 250,
      aiConfidenceScore: 95,
      aiModelUsed: 'gemini-flash',
      processedAt: new Date().toISOString()
    };

    it('successfully deletes own quote with 200 OK', async () => {
      QuoteStoreService.saveQuote(quoteAlpha, undefined, 'tenant_alpha');
      expect(QuoteStoreService.getQuote('QT-TEST-ALPHA-DEL-01', 'tenant_alpha')).not.toBeNull();

      // 用 tenant_alpha 身份登錄生成 Token
      const tokenAlpha = AuthService.generateToken({
        id: 'alpha_user_1',
        name: 'Alpha User',
        email: 'user@alpha.com',
        role: 'sales',
        tenantId: 'tenant_alpha'
      });

      const res = await fetch(`${baseUrl}/quotes/QT-TEST-ALPHA-DEL-01`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokenAlpha}`
        }
      });
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('QT-TEST-ALPHA-DEL-01');

      // 數據庫中已刪除
      expect(QuoteStoreService.getQuote('QT-TEST-ALPHA-DEL-01', 'tenant_alpha')).toBeNull();
    });

    it('strictly intercepts cross-tenant quote deletion with 403 Forbidden (D-12 Red Line)', async () => {
      QuoteStoreService.saveQuote(quoteBeta, undefined, 'tenant_beta');
      expect(QuoteStoreService.getQuote('QT-TEST-BETA-DEL-01', 'tenant_beta')).not.toBeNull();

      // 用 tenant_alpha 身份嘗試刪除 tenant_beta 的單據
      const tokenAlpha = AuthService.generateToken({
        id: 'alpha_user_1',
        name: 'Alpha User',
        email: 'user@alpha.com',
        role: 'sales',
        tenantId: 'tenant_alpha'
      });

      const res = await fetch(`${baseUrl}/quotes/QT-TEST-BETA-DEL-01`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokenAlpha}`
        }
      });
      const data: any = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('越权拦截');

      // 確保 tenant_beta 的單據仍然完好無損
      expect(QuoteStoreService.getQuote('QT-TEST-BETA-DEL-01', 'tenant_beta')).not.toBeNull();
    });

    it('returns 404 Not Found when attempting to delete non-existent quote', async () => {
      const tokenAlpha = AuthService.generateToken({
        id: 'alpha_user_1',
        name: 'Alpha User',
        email: 'user@alpha.com',
        role: 'sales',
        tenantId: 'tenant_alpha'
      });

      const res = await fetch(`${baseUrl}/quotes/QT-NON-EXISTENT-999999`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokenAlpha}`
        }
      });
      const data: any = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('supports POST /quotes/:id/delete alias route', async () => {
      const quoteAlias: QuotationResult = {
        ...quoteAlpha,
        quotationNumber: 'QT-TEST-ALIAS-DEL-01'
      };
      QuoteStoreService.saveQuote(quoteAlias, undefined, 'tenant_alpha');

      const tokenAlpha = AuthService.generateToken({
        id: 'alpha_user_1',
        name: 'Alpha User',
        email: 'user@alpha.com',
        role: 'sales',
        tenantId: 'tenant_alpha'
      });

      const res = await fetch(`${baseUrl}/quotes/QT-TEST-ALIAS-DEL-01/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenAlpha}`
        }
      });
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(QuoteStoreService.getQuote('QT-TEST-ALIAS-DEL-01', 'tenant_alpha')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 2. 底價庫條目刪除測試
  // -------------------------------------------------------------------------
  describe('Catalog Item Deletion (DELETE /api/v1/catalog/:sku)', () => {
    const testTenantId = 'tenant_delete_test';
    const xlsxLib: any = (XLSX as any).default || XLSX;

    beforeEach(() => {
      // 爲 testTenantId 準備一個包含受保護條目和待刪除條目的 Excel 底價表
      const wb = xlsxLib.utils.book_new();
      const productRows = [
        ['产品型号 / SKU (必填)', '产品英文品名与规格描述 (必填)', '出厂底价 (RMB Cost·必填安全底价)'],
        ['TEST-001', 'Protected Product 1', 100],
        ['TEST-002', 'Protected Product 2', 200],
        ['TEST-003', 'Protected Product 3', 300],
        ['TEST-004', 'Protected Product 4', 400],
        ['TEST-005', 'Test Item To Delete 5', 50],
        ['TEST-006', 'Test Item To Delete 6', 60],
        ['CUSTOM-SKU-99', 'Custom Regular Item', 88]
      ];
      const sheet = xlsxLib.utils.aoa_to_sheet(productRows);
      xlsxLib.utils.book_append_sheet(wb, sheet, '📦 商品出厂底价库 (Products)');

      const buffer = xlsxLib.write(wb, { type: 'buffer', bookType: 'xlsx' });
      TenantService.saveActivePricing(testTenantId, buffer);
    });


    it('strictly blocks deletion of protected SKUs (TEST-001 ~ TEST-004) with 400 Bad Request', async () => {
      const token = AuthService.generateToken({
        id: 'test_user_del',
        name: 'Del User',
        email: 'del@test.com',
        role: 'sales',
        tenantId: testTenantId
      });

      for (const protectedSku of ['TEST-001', 'TEST-002', 'TEST-003', 'TEST-004']) {
        const res = await fetch(`${baseUrl}/catalog/${protectedSku}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data: any = await res.json();

        expect(res.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('系统保护');
      }
    });

    it('successfully deletes unprotected items (TEST-005, TEST-006) with 200 OK', async () => {
      const token = AuthService.generateToken({
        id: 'test_user_del',
        name: 'Del User',
        email: 'del@test.com',
        role: 'sales',
        tenantId: testTenantId
      });

      // 1. 刪除 TEST-005
      const res5 = await fetch(`${baseUrl}/catalog/TEST-005`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data5: any = await res5.json();
      expect(res5.status).toBe(200);
      expect(data5.success).toBe(true);

      // 2. 刪除 TEST-006
      const res6 = await fetch(`${baseUrl}/catalog/TEST-006`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data6: any = await res6.json();
      expect(res6.status).toBe(200);
      expect(data6.success).toBe(true);

      // 驗證 Excel 文件中 TEST-005 和 TEST-006 已被移除，而 TEST-001~004 與 CUSTOM-SKU-99 完好
      const pricingPath = TenantService.getActivePricingPath(testTenantId);
      const updatedWb = xlsxLib.read(fs.readFileSync(pricingPath), { type: 'buffer' });
      const sheet = updatedWb.Sheets['📦 商品出厂底价库 (Products)'];
      const rows: any[][] = xlsxLib.utils.sheet_to_json(sheet, { header: 1 });
      const remainingSkus = rows.slice(1).map(r => r[0]);


      expect(remainingSkus).not.toContain('TEST-005');
      expect(remainingSkus).not.toContain('TEST-006');
      expect(remainingSkus).toContain('TEST-001');
      expect(remainingSkus).toContain('TEST-002');
      expect(remainingSkus).toContain('TEST-003');
      expect(remainingSkus).toContain('TEST-004');
      expect(remainingSkus).toContain('CUSTOM-SKU-99');
    });

    it('returns 404 when deleting a non-existent SKU', async () => {
      const token = AuthService.generateToken({
        id: 'test_user_del',
        name: 'Del User',
        email: 'del@test.com',
        role: 'sales',
        tenantId: testTenantId
      });

      const res = await fetch(`${baseUrl}/catalog/NON-EXISTENT-SKU-XYZ`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data: any = await res.json();
      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 3. 審計日誌持久化驗證
  // -------------------------------------------------------------------------
  describe('Audit Logging Verification', () => {
    it('records deletion and forbidden attempts in audit log file', () => {
      const auditFile = path.join(process.cwd(), 'data', 'audit.log');
      expect(fs.existsSync(auditFile)).toBe(true);
      const content = fs.readFileSync(auditFile, 'utf-8');
      expect(content).toContain('[AUDIT]');
      expect(content).toContain('DELETE_QUOTE');
      expect(content).toContain('DELETE_CATALOG_ITEM');
    });
  });
});
