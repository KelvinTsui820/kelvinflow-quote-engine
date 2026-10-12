import * as XLSX from 'xlsx';
import express from 'express';
import { quoteRouter } from '../src/routes/quote.router.js';
import { TenantService } from '../src/services/tenant.service.js';
import { normalizeSKU } from '../src/utils/sku-normalizer.js';
import { matchColumns } from '../src/adapters/schema-matcher.js';
import { ExcelAdapter } from '../src/adapters/excel.adapter.js';
import { PricingService } from '../src/services/pricing.service.js';
import { POExtractionResult } from '../src/types/index.js';

describe('1. SKU 歸一化測試', () => {
  it('應該消除空格、連字符、下劃線並統一轉為大寫', () => {
    expect(normalizeSKU('st-2026-a')).toBe('ST2026A');
    expect(normalizeSKU(' ST_2026.A ')).toBe('ST2026A');
    expect(normalizeSKU('ST 2026 A')).toBe('ST2026A');
    expect(normalizeSKU('st2026a')).toBe('ST2026A');
  });
});

describe('2. 表頭語義模糊匹配測試', () => {
  it('應該自動匹配中文、英文或混合表頭', () => {
    const headers1 = ['SKU (产品型号)', 'Product_Name (产品名称)', 'Base_Price (人民币底价)', 'Profit_Margin (预期毛利率)', 'FOB_Cost (单件均摊固定杂费/人民币)'];
    const matched1 = matchColumns(headers1);

    expect(matched1.sku).toBe('SKU (产品型号)');
    expect(matched1.basePrice).toBe('Base_Price (人民币底价)');
    expect(matched1.profitMargin).toBe('Profit_Margin (预期毛利率)');
    expect(matched1.fobCost).toBe('FOB_Cost (单件均摊固定杂费/人民币)');
  });

  it('應該自動匹配非標準的隨意表頭', () => {
    const headers2 = ['货物型号', '商品品名', '出厂底价', '加价率', '杂费'];
    const matched2 = matchColumns(headers2);

    expect(matched2.sku).toBe('货物型号');
    expect(matched2.basePrice).toBe('出厂底价');
    expect(matched2.profitMargin).toBe('加价率');
    expect(matched2.fobCost).toBe('杂费');
  });
});

describe('3. ExcelAdapter 本地表格解析測試', () => {
  it('能正確解析內存生成的 Excel Buffer', () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['型号', '品名', '出厂成本', '毛利率', '港口杂费'],
      ['ST-2026-A', '支架', 15.5, 0.3, 150],
      ['ST-2026-C', '螺丝', 5.0, 0.4, 10]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'PriceSheet');

    const ratesData = [
      ['外币币种', '锁定汇率'],
      ['USD', 7.2],
      ['EUR', 7.8]
    ];
    const ratesWs = XLSX.utils.aoa_to_sheet(ratesData);
    XLSX.utils.book_append_sheet(wb, ratesWs, 'ExchangeRates');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = ExcelAdapter.parse(buffer);

    expect(result.priceItems.length).toBe(2);
    expect(result.priceItems[0].normalizedSku).toBe('ST2026A');
    expect(result.priceItems[0].basePrice).toBe(15.5);
    expect(result.priceItems[0].profitMargin).toBe(0.3);
    expect(result.priceItems[0].fobCost).toBe(150);

    expect(result.exchangeRates.length).toBe(2);
    expect(result.exchangeRates[0].currency).toBe('USD');
    expect(result.exchangeRates[0].rateToRMB).toBe(7.2);
  });
});

describe('4. PricingService 報價核算與零漏報防護測試', () => {
  const mockPriceItems = [
    {
      rawSku: 'ST-2026-A',
      normalizedSku: 'ST2026A',
      productName: '支架',
      basePrice: 15.5,
      profitMargin: 0.3,
      fobCost: 150
    }
  ];

  const mockExchangeRates = [
    { currency: 'USD', rateToRMB: 7.2 }
  ];

  it('標準商品算術應正確：(15.5 * 1.3 + 150) / 7.2 = 23.63 USD', () => {
    const mockPO: POExtractionResult = {
      ConfidenceScore: 95,
      MissingInfo: [],
      IsStandardOrder: true,
      PONumber: 'PO-TEST-001',
      CustomerName: 'Global Hardware Ltd.',
      Date: '2026-06-05',
      TotalOrderValue: null,
      Currency: 'USD',
      DeliveryDetails: 'FOB Shenzhen',
      SpecialRemarks: 'Export wooden pallets',
      UncategorizedCriticalInfo: '',
      BuyerContact: { Name: 'Michael', Email: 'michael@global.com' },
      Items: [
        { SKU: 'st-2026-a', Description: 'Aluminum Bracket', Quantity: 1500, ConfidenceScore: 95, MatchStatus: 'EXACT', ConfidenceRemark: '' }
      ]
    };

    const quotation = PricingService.calculate(mockPO, mockPriceItems, mockExchangeRates);

    expect(quotation.items.length).toBe(1);
    expect(quotation.items[0].status).toBe('OK');
    expect(quotation.items[0].unitPriceForeign).toBe(23.63);
    expect(quotation.items[0].subTotalForeign).toBe(35445.00); // 23.63 * 1500
    expect(quotation.totalAmountForeign).toBe(35445.00);
    expect(quotation.hasWarnings).toBe(false);
  });

  it('【零漏報防護】PO 中包含未建檔 SKU 時，絕不靜默丟棄，應明確標註並輸出警告', () => {
    const mockPOWithMissing: POExtractionResult = {
      ConfidenceScore: 90,
      MissingInfo: [],
      IsStandardOrder: true,
      PONumber: 'PO-TEST-002',
      CustomerName: 'Global Hardware Ltd.',
      Date: '2026-06-05',
      TotalOrderValue: null,
      Currency: 'USD',
      DeliveryDetails: '',
      SpecialRemarks: '',
      UncategorizedCriticalInfo: '',
      BuyerContact: { Name: 'Michael', Email: '' },
      Items: [
        { SKU: 'ST-2026-A', Description: 'Bracket', Quantity: 1500, ConfidenceScore: 95, MatchStatus: 'EXACT', ConfidenceRemark: '' },
        { SKU: 'ST-2026-B', Description: 'Fastener (Missing in DB)', Quantity: 3000, ConfidenceScore: 85, MatchStatus: 'FUZZY', ConfidenceRemark: '' }
      ]
    };

    const quotation = PricingService.calculate(mockPOWithMissing, mockPriceItems, mockExchangeRates);

    expect(quotation.items.length).toBe(2);
    expect(quotation.items[0].status).toBe('OK');
    expect(quotation.items[1].sku).toBe('ST-2026-B');
    expect(quotation.items[1].status).toBe('NEED_MANUAL_PRICE');
    expect(quotation.hasWarnings).toBe(true);
    expect(quotation.warnings.some(w => w.includes('ST-2026-B'))).toBe(true);
  });

  it('【D-13 防迴歸】底價庫明確設置 0% 毛利時，絕不退回到全局預設毛利，應精確按 0% 計價', () => {
    const mockZeroMarginPriceItems = [
      {
        rawSku: 'TEST-002',
        normalizedSku: 'TEST002',
        productName: 'Zero Margin Product',
        basePrice: 100,
        profitMargin: 0, // 明确 0% 毛利
        fobCost: 0
      },
      {
        rawSku: 'TEST-003',
        normalizedSku: 'TEST003',
        productName: 'Default Margin Product',
        basePrice: 100,
        profitMargin: undefined as any, // 留空
        fobCost: 0
      }
    ];

    const mockPO: POExtractionResult = {
      ConfidenceScore: 90,
      MissingInfo: [],
      IsStandardOrder: true,
      PONumber: 'PO-D13-TEST',
      CustomerName: 'Test Buyer',
      Date: '2026-10-09',
      TotalOrderValue: null,
      Currency: 'USD',
      DeliveryDetails: '',
      SpecialRemarks: '',
      UncategorizedCriticalInfo: '',
      BuyerContact: { Name: 'Buyer', Email: '' },
      Items: [
        { SKU: 'TEST-002', Description: 'Zero Margin', Quantity: 500, ConfidenceScore: 95, MatchStatus: 'EXACT', ConfidenceRemark: '' },
        { SKU: 'TEST-003', Description: 'Default Margin', Quantity: 500, ConfidenceScore: 95, MatchStatus: 'EXACT', ConfidenceRemark: '' }
      ]
    };

    // 全局默认毛利设为 0.2 (20%)
    const quotation = PricingService.calculate(
      mockPO,
      mockZeroMarginPriceItems,
      [{ currency: 'USD', rateToRMB: 7.2 }],
      { defaultProfitMargin: 0.2 }
    );

    expect(quotation.items.length).toBe(2);
    
    // TEST-002: 100 * (1 + 0) / 7.2 = 13.8888... -> 13.89; subTotal = 13.89 * 500 = 6945.00
    const item002 = quotation.items.find(i => i.sku === 'TEST-002')!;
    expect(item002.profitMargin).toBe(0);
    expect(item002.unitPriceForeign).toBe(13.89);
    expect(item002.subTotalForeign).toBe(6945.00);

    // TEST-003: 100 * (1 + 0.2) / 7.2 = 16.6666... -> 16.67; subTotal = 16.67 * 500 = 8335.00
    const item003 = quotation.items.find(i => i.sku === 'TEST-003')!;
    expect(item003.profitMargin).toBe(0.2);
    expect(item003.unitPriceForeign).toBe(16.67);
    expect(item003.subTotalForeign).toBe(8335.00);
  });
});

describe('5. 出厂底价表模板下载接口测试 (/api/v1/template/pricing-sheet)', () => {
  it('应该正确下载《出厂底价表.xlsx》并包含双工作表配置与标准SKU', async () => {
    TenantService.init();
    const app = express();
    app.use('/api/v1', quoteRouter);
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/template/pricing-sheet`);
      expect(res.status).toBe(200);

      const disposition = res.headers.get('content-disposition') || '';
      expect(decodeURIComponent(disposition)).toContain('出厂底价表.xlsx');

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const wb = XLSX.read(buffer, { type: 'buffer' });
      expect(wb.SheetNames).toContain('⚙️ 全局核算参数 (Config)');
      expect(wb.SheetNames).toContain('📦 商品出厂底价库 (Products)');

      const productSheet = wb.Sheets['📦 商品出厂底价库 (Products)'];
      const rows = XLSX.utils.sheet_to_json(productSheet, { header: 1 }) as any[];
      expect(rows.length).toBeGreaterThan(1);
      expect(JSON.stringify(rows)).toContain('ST-2026-A');
    } finally {
      server.close();
    }
  });
});

