import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { quoteRouter } from '../src/routes/quote.router.js';
import { inboundRouter } from '../src/routes/inbound.router.js';
import { TenantService } from '../src/services/tenant.service.js';
import { AuthService } from '../src/services/auth.service.js';
import { ExcelAdapter } from '../src/adapters/excel.adapter.js';

describe('Task §2.6: KelvinFlow 官方标准底价表 (kelvinflow-pricing-template.xlsx) 适配与上传核算验证', () => {
  let app: express.Express;
  let server: any;
  let baseUrl: string;

  const testTenant = 'tenant_tmpl_verify';
  let adminToken: string;
  const templatePath = path.join(process.cwd(), 'public', 'templates', 'kelvinflow-pricing-template.xlsx');

  beforeAll(async () => {
    TenantService.init();
    app = express();
    app.use(express.json());
    app.use('/api/v1', quoteRouter);
    app.use('/api/inbound', inboundRouter);

    server = app.listen(0);
    const port = (server.address() as any).port;
    baseUrl = `http://127.0.0.1:${port}`;

    adminToken = AuthService.generateToken({
      id: 'usr_tmpl_admin',
      email: 'admin@tmpl-verify.com',
      name: 'Template Admin',
      role: 'admin',
      tenantId: testTenant
    });
  });

  afterAll((done) => {
    const tenantDir = path.join(process.cwd(), 'data', 'tenants', testTenant);
    if (fs.existsSync(tenantDir)) {
      fs.rmSync(tenantDir, { recursive: true, force: true });
    }

    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('1. 模板物理文件与 ExcelAdapter 纯净识别检验', () => {
    it('public/templates/ 目录应仅保留 1 个官方底价表模板 kelvinflow-pricing-template.xlsx', () => {
      const templatesDir = path.join(process.cwd(), 'public', 'templates');
      const xlsxFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.xlsx'));
      expect(xlsxFiles).toHaveLength(1);
      expect(xlsxFiles[0]).toBe('kelvinflow-pricing-template.xlsx');
    });

    it('public/templates/archive/ 目录应收录全部 9 个历史归档底价表', () => {
      const archiveDir = path.join(process.cwd(), 'public', 'templates', 'archive');
      expect(fs.existsSync(archiveDir)).toBe(true);
      const archived = fs.readdirSync(archiveDir).filter(f => f.endsWith('.xlsx'));
      expect(archived).toHaveLength(9);
    });

    it('ExcelAdapter 必须精准识别 4 大工作表，脱敏单不得被误判为商品库', () => {
      const parseResult = ExcelAdapter.parse(templatePath);
      expect(parseResult.success).toBe(true);
      expect(parseResult.parsedSheets).toEqual(
        expect.arrayContaining([
          expect.stringContaining('使用指南'),
          expect.stringContaining('全局參數庫'),
          expect.stringContaining('商品底價庫'),
          expect.stringContaining('对外脱敏单')
        ])
      );
      // 脱敏单绝对不可被计入商品库
      expect(parseResult.priceItems).toHaveLength(6);
    });

    it('有效列映射规范（SKU/别名/品名/出厂底价/MOQ/箱规/CBM/毛重/专属毛利率/交期/HS）', () => {
      const parseResult = ExcelAdapter.parse(templatePath);
      const stItem = parseResult.priceItems.find(p => p.rawSku === 'ST-2026-A');
      expect(stItem).toBeDefined();
      expect(stItem?.aliases).toContain('Stand Pro');
      expect(stItem?.basePrice).toBe(15.5);
      expect(stItem?.moq).toBe(500);
      expect(stItem?.pcsPerCtn).toBe(50);
      expect(stItem?.cbmPerCtn).toBe(0.045);
      expect(stItem?.gwPerCtn).toBe(14.5);
      expect(stItem?.profitMargin).toBe(0.15);
      expect(stItem?.leadTime).toBe('20-25 Days');
      expect(stItem?.hsCode).toBe('7616.99.9000');
    });

    it('Config sheet 的币种与汇率被正确读取', () => {
      const parseResult = ExcelAdapter.parse(templatePath);
      expect(parseResult.defaultCurrency).toBe('USD');
      const usdRate = parseResult.exchangeRates.find(r => r.currency === 'USD');
      expect(usdRate?.rateToRMB).toBe(7.2);
    });
  });

  describe('2. POST /api/v1/update-pricing 上传与 GET /pricing/status 验收', () => {
    it('能够成功上传 kelvinflow-pricing-template.xlsx 到租户底价库', async () => {
      const fileBuffer = fs.readFileSync(templatePath);
      const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const formData = new FormData();
      formData.append('pricing_file', blob, 'kelvinflow-pricing-template.xlsx');

      const res = await fetch(`${baseUrl}/api/v1/update-pricing`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`
        },
        body: formData
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.summary?.itemCount).toBe(6);
    });

    it('GET /api/v1/pricing/status 返回正确的商品总数 (6款商品)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/pricing/status`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.tenantId).toBe(testTenant);
      expect(data.itemCount).toBe(6);
      expect(data.hasCustomPricing).toBe(true);
    });

    it('GET /api/v1/template/pricing-sheet 能够成功下载 kelvinflow-pricing-template.xlsx', async () => {
      const res = await fetch(`${baseUrl}/api/v1/template/pricing-sheet`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      expect(res.status).toBe(200);
      const disposition = res.headers.get('content-disposition');
      expect(disposition).toContain('kelvinflow-pricing-template.xlsx');
    });
  });

  describe('3. 一轮 quick-quote 实测建单价格分毫不差', () => {
    it('根据上传底价库成功完成快速建单并精准计算价格', async () => {
      const rfqText = `
Hi Kelvin,
Please quote FOB Shenzhen Port:
1. Model: ST-2026-A, Qty: 1000 pcs
2. Model: ERG-PRO-V2, Qty: 100 pcs
Best regards,
David Miller
      `.trim();

      const res = await fetch(`${baseUrl}/api/inbound/quick-quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          inquiryText: rfqText,
          buyerName: 'David Miller',
          tenantId: testTenant
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.quotation).toBeDefined();
      expect(data.quotation.items.length).toBeGreaterThanOrEqual(2);

      const itemA = data.quotation.items.find((i: any) => i.sku === 'ST-2026-A');
      expect(itemA).toBeDefined();
      expect(itemA.quantity).toBe(1000);
      // ST-2026-A: basePrice 15.5 RMB, margin 15%, USD rate 7.2
      // target FOB price: 15.5 / (1 - 0.15) / 7.2 ≈ 2.53 USD
      expect(itemA.unitPriceForeign).toBeGreaterThan(2.0);
      expect(itemA.unitPriceForeign).toBeLessThan(3.0);

      const itemChair = data.quotation.items.find((i: any) => i.sku === 'ERG-PRO-V2');
      expect(itemChair).toBeDefined();
      expect(itemChair.quantity).toBe(100);
      // ERG-PRO-V2: basePrice 185 RMB, margin 25%, USD rate 7.2
      // target FOB price: 185 / (1 - 0.25) / 7.2 ≈ 34.26 USD
      expect(itemChair.unitPriceForeign).toBeGreaterThan(30.0);
      expect(itemChair.unitPriceForeign).toBeLessThan(40.0);
    });
  });
});
