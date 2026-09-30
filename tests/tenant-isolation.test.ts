import { AuthService } from '../src/services/auth.service.js';
import { TenantService } from '../src/services/tenant.service.js';
import { QuoteStoreService } from '../src/services/quote-store.service.js';
import { PDFService } from '../src/services/pdf.service.js';
import { QuotationResult } from '../src/types/index.js';

describe('多用戶與多租戶數據隔離及 RBAC 測試', () => {

  describe('1. 身份認證與 Token 簽發驗證 (AuthService)', () => {
    it('管理員賬號登錄成功並返回帶有 admin 角色的合法 Token', () => {
      const result = AuthService.authenticateUser('admin@foshan-kelvin.com', 'admin123');
      expect(result).not.toBeNull();
      expect(result?.user.role).toBe('admin');
      expect(result?.user.tenantId).toBe('default');

      const verified = AuthService.verifyToken(result!.token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(result?.user.id);
      expect(verified?.role).toBe('admin');
    });

    it('業務員賬號登錄成功並返回 sales 角色', () => {
      const result = AuthService.authenticateUser('sales@alpha-export.com', 'alpha123');
      expect(result).not.toBeNull();
      expect(result?.user.role).toBe('sales');
      expect(result?.user.tenantId).toBe('tenant_alpha');
    });

    it('錯誤密碼應認證失敗返回 null', () => {
      const result = AuthService.authenticateUser('admin@foshan-kelvin.com', 'wrong_pass');
      expect(result).toBeNull();
    });

    it('API Key 認證應正確映射到所屬租戶與角色', () => {
      const auth1 = AuthService.authenticateApiKey('key_default_admin_2026');
      expect(auth1).not.toBeNull();
      expect(auth1?.tenantId).toBe('default');
      expect(auth1?.user.role).toBe('admin');

      const auth2 = AuthService.authenticateApiKey('key_tenant_alpha_sales_test');
      expect(auth2).not.toBeNull();
      expect(auth2?.tenantId).toBe('tenant_alpha');
      expect(auth2?.user.role).toBe('sales');
    });
  });

  describe('2. 企業租戶配置檔案 (TenantProfile)', () => {
    it('各租戶能獨立加載專屬公司抬頭與風控設置', () => {
      const defaultProf = TenantService.getTenantProfile('default');
      expect(defaultProf.companyName).toContain('KelvinFlow');
      expect(defaultProf.hideCostFromSales).toBe(true);

      const alphaProf = TenantService.getTenantProfile('tenant_alpha');
      expect(alphaProf.companyName).toContain('Alpha Global');
      expect(alphaProf.defaultCurrency).toBe('USD');

      const betaProf = TenantService.getTenantProfile('tenant_beta');
      expect(betaProf.companyName).toContain('Beta Consumer Electronics');
      expect(betaProf.defaultCurrency).toBe('EUR');
    });

    it('更新租戶配置後應持久化生效且不污染其他租戶', () => {
      TenantService.updateTenantProfile('tenant_alpha', {
        companySubtitle: 'Top 1 Hardware Exporter'
      });

      const reloadedAlpha = TenantService.getTenantProfile('tenant_alpha');
      expect(reloadedAlpha.companySubtitle).toBe('Top 1 Hardware Exporter');

      // 檢查 default 租戶未受任何影響
      const defaultProf = TenantService.getTenantProfile('default');
      expect(defaultProf.companySubtitle).not.toBe('Top 1 Hardware Exporter');
    });
  });

  describe('3. 報價單物理隔離 (QuoteStoreService)', () => {
    const mockQuoteAlpha: QuotationResult = {
      quotationNumber: 'QT-ALPHA-TEST-001',
      tenantId: 'tenant_alpha',
      customerName: 'German Heavy Tech GMBH',
      buyerName: 'Hans Gruber',
      buyerEmail: 'hans@german-tech.de',
      date: '2026-09-04',
      currency: 'USD',
      rateUsed: 7.2,
      items: [
        {
          sku: 'BOLT-M8',
          description: 'Titanium Bolt M8x50',
          quantity: 1000,
          basePriceRMB: 2.5,
          profitMargin: 0.3,
          fobCostRMB: 0.1,
          unitPriceForeign: 0.46,
          subTotalForeign: 460.00,
          status: 'OK'
        }
      ],
      totalAmountForeign: 460.00,
      hasWarnings: false,
      warnings: [],
      riskDisclaimers: ['Subject to exchange rate fluctuation'],
      termsAndConditions: '30% deposit, 70% before shipment',
      aiConfidenceScore: 95,
      aiModelUsed: 'gemini-3.8-flash',
      processedAt: new Date().toISOString()
    };

    it('Tenant Alpha 保存的報價單，Tenant Alpha 能查到，但 Tenant Beta 絕對查不到', () => {
      QuoteStoreService.saveQuote(mockQuoteAlpha, undefined, 'tenant_alpha');

      // 1. Alpha 租戶查詢：應順利返回
      const foundAlpha = QuoteStoreService.getQuote('QT-ALPHA-TEST-001', 'tenant_alpha');
      expect(foundAlpha).not.toBeNull();
      expect(foundAlpha?.quotationNumber).toBe('QT-ALPHA-TEST-001');
      expect(foundAlpha?.tenantId).toBe('tenant_alpha');

      // 2. Beta 租戶查詢：嚴格隔離，應返回 null (防越權)
      const foundBeta = QuoteStoreService.getQuote('QT-ALPHA-TEST-001', 'tenant_beta');
      expect(foundBeta).toBeNull();
    });

    it('listQuotes 應僅列出當前租戶的報價單', () => {
      const alphaList = QuoteStoreService.listQuotes('tenant_alpha');
      expect(alphaList.some(q => q.quotationNumber === 'QT-ALPHA-TEST-001')).toBe(true);

      const betaList = QuoteStoreService.listQuotes('tenant_beta');
      expect(betaList.some(q => q.quotationNumber === 'QT-ALPHA-TEST-001')).toBe(false);
    });
  });

  describe('4. 租戶專屬動態品牌 PDF 渲染 (PDFService)', () => {
    it('為 Tenant Alpha 生成的 PDF 應正常返回 Buffer 且字節數大於 0', async () => {
      const mockQuoteAlpha: QuotationResult = {
        quotationNumber: 'QT-PDF-TEST-001',
        tenantId: 'tenant_alpha',
        customerName: 'German Heavy Tech GMBH',
        buyerName: 'Hans Gruber',
        buyerEmail: 'hans@german-tech.de',
        date: '2026-09-04',
        currency: 'USD',
        rateUsed: 7.2,
        items: [
          {
            sku: 'BOLT-M8',
            description: 'Titanium Bolt M8x50',
            quantity: 500,
            basePriceRMB: 2.5,
            profitMargin: 0.3,
            fobCostRMB: 0.1,
            unitPriceForeign: 0.46,
            subTotalForeign: 230.00,
            status: 'OK'
          }
        ],
        totalAmountForeign: 230.00,
        hasWarnings: false,
        warnings: [],
        riskDisclaimers: ['Exchange rate risk disclaimer'],
        termsAndConditions: 'Standard FOB terms',
        aiConfidenceScore: 92,
        aiModelUsed: 'gemini-3.8-flash',
        processedAt: new Date().toISOString()
      };

      const pdfBuf = await PDFService.generateQuotationPDF(mockQuoteAlpha);
      expect(Buffer.isBuffer(pdfBuf)).toBe(true);
      expect(pdfBuf.length).toBeGreaterThan(1000); // 正常 PDF 大小約在 3KB~10KB
    });
  });

});
