import { describe, it, expect } from '@jest/globals';
import { POExtractionSchema, POExtractionResult, StandardPriceItem, StandardExchangeRate } from '../src/types/index.js';
import { PricingService } from '../src/services/pricing.service.js';
import { normalizeSKU } from '../src/utils/sku-normalizer.js';
import { ExcelAdapter } from '../src/adapters/excel.adapter.js';
import { PDFService } from '../src/services/pdf.service.js';
import { TenantService } from '../src/services/tenant.service.js';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

describe('外貿智能報價引擎 - 企業級數據治理與多租戶架構全自動化測試套件', () => {

  // =========================================================================
  // 維度 1: PO 數據解析與容錯測試 (Extraction Schema & Data Resiliency)
  // =========================================================================
  describe('【維度 1】PO 數據解析容錯性測試', () => {
    it('1.1 應正確處理 Gemini 將字段返回為數組 (Array) 的情況', () => {
      const rawAiOutput = {
        ConfidenceScore: 90,
        MissingInfo: ['Delivery Date'],
        IsStandardOrder: true,
        PONumber: 'PO-2026-X1',
        CustomerName: 'Acme Global Corp',
        Date: '2026-08-15',
        Currency: 'USD',
        DeliveryDetails: ['FOB Shanghai', 'August 30, 2026'],
        SpecialRemarks: ['Export wooden pallet packaging', '30% deposit'],
        UncategorizedCriticalInfo: ['Must provide CE cert'],
        BuyerContact: {
          Name: 'John Doe',
          Email: 'john@acme.com'
        },
        Items: [
          { SKU: 'ITEM-001', Description: 'Metal Bracket', Quantity: '1,500 pcs' }
        ]
      };

      const parsed = POExtractionSchema.parse(rawAiOutput);
      expect(parsed.DeliveryDetails).toBe('FOB Shanghai; August 30, 2026');
      expect(parsed.SpecialRemarks).toBe('Export wooden pallet packaging; 30% deposit');
      expect(parsed.UncategorizedCriticalInfo).toBe('Must provide CE cert');
      expect(parsed.Items[0].Quantity).toBe(1500);
    });

    it('1.2 應正確處理 null、undefined 和缺失字段（絕不崩潰）', () => {
      const minimalAiOutput = {
        ConfidenceScore: null,
        Items: [
          { SKU: 'SIMPLE-SKU', Description: null, Quantity: null }
        ]
      };

      const parsed = POExtractionSchema.parse(minimalAiOutput);
      expect(parsed.ConfidenceScore).toBe(85);
      expect(parsed.PONumber).toBe('N/A');
      expect(parsed.CustomerName).toBe('Valued Customer');
      expect(parsed.Currency).toBe('USD');
      expect(parsed.BuyerContact.Name).toBe('Purchasing Manager');
      expect(parsed.Items[0].Quantity).toBe(1);
    });

    it('1.3 應正確歸一化各種非標格式的 SKU 字符', () => {
      expect(normalizeSKU('  st-2026-a  ')).toBe('ST2026A');
      expect(normalizeSKU('ST 2026 A')).toBe('ST2026A');
      expect(normalizeSKU('st.2026_a')).toBe('ST2026A');
      expect(normalizeSKU('St-2026/A')).toBe('ST2026A');
    });
  });

  // =========================================================================
  // 維度 2: Excel 底價表自適應解析測試 (支持 MOQ 與 階梯價)
  // =========================================================================
  describe('【維度 2】Excel 底價表自適應模糊匹配與階梯解析測試', () => {
    it('2.1 應兼容中文表頭、英文表頭、百分比字符串以及 MOQ/階梯定價列', () => {
      const xlsxLib: any = (XLSX as any).default || XLSX;
      const wb = xlsxLib.utils.book_new();

      // 工作表 1: 帶 MOQ 與階梯定價的底價表
      const priceData = [
        ['產品型號', '品名描述', '出廠底價(RMB)', '利潤率', '港口雜費(RMB)', '最小起訂量', '5000件底價', '10000件底價'],
        ['ST-2026-A', '鋁合金支架', 15.5, '30%', 150, 1000, 13.5, 12.0],
        ['ST-2026-C', '不銹鋼管件', 50.0, '35%', 200, 500, 45.0, 40.0]
      ];
      const wsPrices = xlsxLib.utils.aoa_to_sheet(priceData);
      xlsxLib.utils.book_append_sheet(wb, wsPrices, '底價表');

      // 工作表 2: 匯率表
      const rateData = [
        ['外幣幣種', '兌人民幣匯率'],
        ['USD', 7.2],
        ['EUR', 7.8]
      ];
      const wsRates = xlsxLib.utils.aoa_to_sheet(rateData);
      xlsxLib.utils.book_append_sheet(wb, wsRates, '匯率表');

      const buffer = xlsxLib.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const parsed = ExcelAdapter.parse(buffer);

      expect(parsed.success).toBe(true);
      expect(parsed.priceItems.length).toBe(2);
      expect(parsed.priceItems[0].normalizedSku).toBe('ST2026A');
      expect(parsed.priceItems[0].profitMargin).toBe(0.3);
      expect(parsed.priceItems[0].moq).toBe(1000);
      expect(parsed.priceItems[0].tier2BasePrice).toBe(13.5);
      expect(parsed.priceItems[0].tier3BasePrice).toBe(12.0);
    });
  });

  // =========================================================================
  // 維度 3: 報價算術核心、階梯定價與風控條款測試
  // =========================================================================
  describe('【維度 3】報價精確計算、階梯定價與風控條款測試', () => {
    const priceCatalog: StandardPriceItem[] = [
      {
        rawSku: 'ST-2026-A',
        normalizedSku: 'ST2026A',
        productName: 'Aluminum Bracket',
        basePrice: 15.5,
        profitMargin: 0.3,
        fobCost: 150,
        moq: 1000,
        tier2Qty: 5000,
        tier2BasePrice: 13.5,
        tier3Qty: 10000,
        tier3BasePrice: 12.0
      },
      {
        rawSku: 'ST-2026-C',
        normalizedSku: 'ST2026C',
        productName: 'Stainless Pipe',
        basePrice: 50.0,
        profitMargin: 0.2,
        fobCost: 0,
        moq: 500
      }
    ];

    const exchangeRates: StandardExchangeRate[] = [
      { currency: 'USD', rateToRMB: 7.2 },
      { currency: 'EUR', rateToRMB: 7.8 }
    ];

    it('3.1 應精準命中階梯定價：當數量達到 5,000 件時自動採用階梯 2 底價', () => {
      const poData: POExtractionResult = {
        ConfidenceScore: 95,
        MissingInfo: [],
        IsStandardOrder: true,
        PONumber: 'PO-TIER-001',
        CustomerName: 'Big Hardware Corp',
        Date: '2026-08-16',
        TotalOrderValue: null,
        Currency: 'USD',
        DeliveryDetails: 'FOB Shenzhen',
        SpecialRemarks: '',
        UncategorizedCriticalInfo: '',
        BuyerContact: { Name: 'Tom', Email: 'tom@big.com' },
        Items: [
          { SKU: 'ST-2026-A', Description: 'Aluminum Bracket', Quantity: 6000 } // >= 5000
        ]
      };

      const quote = PricingService.calculate(poData, priceCatalog, exchangeRates);

      expect(quote.items[0].appliedTier).toContain('Tier 2');
      expect(quote.items[0].basePriceRMB).toBe(13.5);
      expect(quote.items[0].unitPriceForeign).toBe(23.27);
      expect(quote.items[0].subTotalForeign).toBe(23.27 * 6000);
    });

    it('3.2 起訂量防護：當採購數量低於 MOQ 時應觸發警報', () => {
      const poData: POExtractionResult = {
        ConfidenceScore: 90,
        MissingInfo: [],
        IsStandardOrder: true,
        PONumber: 'PO-MOQ-001',
        CustomerName: 'Small Retailer',
        Date: '2026-08-16',
        TotalOrderValue: null,
        Currency: 'USD',
        DeliveryDetails: '',
        SpecialRemarks: '',
        UncategorizedCriticalInfo: '',
        BuyerContact: { Name: 'Jerry', Email: '' },
        Items: [
          { SKU: 'ST-2026-A', Description: 'Bracket', Quantity: 200 } // < MOQ 1000
        ]
      };

      const quote = PricingService.calculate(poData, priceCatalog, exchangeRates);

      expect(quote.hasWarnings).toBe(true);
      expect(quote.items[0].moqWarning).toBeDefined();
      expect(quote.warnings.some(w => w.includes('below MOQ'))).toBe(true);
    });

    it('3.3 應在報價單中自動注入匯率波動保護與不可抗力風控條款', () => {
      const poData: POExtractionResult = {
        ConfidenceScore: 95,
        MissingInfo: [],
        IsStandardOrder: true,
        PONumber: 'PO-RISK-001',
        CustomerName: 'Euro Hardware Ltd',
        Date: '2026-08-16',
        TotalOrderValue: null,
        Currency: 'EUR',
        DeliveryDetails: '',
        SpecialRemarks: '',
        UncategorizedCriticalInfo: '',
        BuyerContact: { Name: 'Hans', Email: '' },
        Items: [
          { SKU: 'ST-2026-C', Description: 'Pipe', Quantity: 1000 }
        ]
      };

      const quote = PricingService.calculate(poData, priceCatalog, exchangeRates, {
        rateFluctuationPercent: 3
      });

      expect(quote.riskDisclaimers.length).toBeGreaterThanOrEqual(3);
      expect(quote.riskDisclaimers.some(d => d.includes('Exchange Rate Protection') && d.includes('±3%'))).toBe(true);
    });

    it('3.4 超低置信度（<70分/手寫掃描件）應觸發最高級別人工作業強警報', () => {
      const lowConfidencePO: POExtractionResult = {
        ConfidenceScore: 55,
        MissingInfo: ['Clear SKUs'],
        IsStandardOrder: false,
        PONumber: 'PO-SCANNED-001',
        CustomerName: 'Unknown Client',
        Date: '2026-08-16',
        TotalOrderValue: null,
        Currency: 'USD',
        DeliveryDetails: '',
        SpecialRemarks: '',
        UncategorizedCriticalInfo: '',
        BuyerContact: { Name: 'Buyer', Email: '' },
        Items: [
          { SKU: 'ST-2026-A', Description: 'Bracket', Quantity: 1000 }
        ]
      };

      const quote = PricingService.calculate(lowConfidencePO, priceCatalog, exchangeRates);

      expect(quote.hasWarnings).toBe(true);
      expect(quote.warnings[0]).toContain('CRITICAL REVIEW REQUIRED');
      expect(quote.warnings[0]).toContain('55%');
    });
  });

  // =========================================================================
  // 維度 4: PDF 渲染與風控條款輸出測試
  // =========================================================================
  describe('【維度 4】PDF 渲染質量與風控條款排版測試', () => {
    it('4.1 應成功渲染包含風控條款與階梯單價的完整 PDF', async () => {
      const testQuote = {
        quotationNumber: 'QT-TEST-999',
        customerName: 'Global Importers Inc.',
        buyerName: 'Alice Smith',
        buyerEmail: 'alice@importers.com',
        date: '2026-08-16',
        currency: 'USD',
        rateUsed: 7.2,
        items: [
          {
            sku: 'ST-2026-A',
            description: 'Aluminum Alloy Bracket',
            quantity: 5000,
            appliedTier: 'Tier 2 (>=5000 pcs)',
            basePriceRMB: 13.5,
            profitMargin: 0.3,
            fobCostRMB: 150,
            unitPriceForeign: 23.27,
            subTotalForeign: 116350,
            status: 'OK' as const
          }
        ],
        totalAmountForeign: 116350,
        hasWarnings: false,
        warnings: [],
        riskDisclaimers: [
          '1. Price Validity: 30 Days from quotation date.',
          '2. Exchange Rate Protection: Prices based on USD/RMB = 7.20. Subject to adjustment if exchange rate fluctuates by more than +-3%.'
        ],
        termsAndConditions: 'Special Remarks: FOB Shenzhen; Wooden pallets\n\nDelivery Details: August 30, 2026',
        aiConfidenceScore: 95,
        aiModelUsed: 'gemini-3.7-flash',
        processedAt: new Date().toISOString()
      };

      const pdfBuffer = await PDFService.generateQuotationPDF(testQuote);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1024);

      const header = pdfBuffer.slice(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
    });
  });

  // =========================================================================
  // 維度 5: 企業級數據治理與表頭智能跳行探測測試 (Data Governance & Fault Tolerance)
  // =========================================================================
  describe('【維度 5】企業級數據治理與智能表頭跳行探測測試', () => {
    it('5.1 智能跳行嗅探：頂部包含 2 行公司大標題/備註行時，應自動定位第 3 行為真實表頭', () => {
      const xlsxLib: any = (XLSX as any).default || XLSX;
      const wb = xlsxLib.utils.book_new();

      const messyData = [
        ['佛山市XX實業有限公司 2026年內部出廠價目表 (絕密)', '', ''],
        ['生效日期: 2026-08-01', '製表人: 張主管', '幣種: RMB'],
        ['產品型號', '品名描述', '出廠底價', '毛利率'], // <- 第 3 行 (真實表頭)
        ['MESSY-01', '沖壓支架', 28.5, '25%'],
        ['MESSY-02', '旋鈕開關', 14.0, '30%'],
        ['合計總計', '', '', ''] // <- 髒數據行應自動忽略
      ];

      const ws = xlsxLib.utils.aoa_to_sheet(messyData);
      xlsxLib.utils.book_append_sheet(wb, ws, '產品清單');

      const buffer = xlsxLib.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const parsed = ExcelAdapter.parse(buffer);

      expect(parsed.success).toBe(true);
      expect(parsed.priceItems.length).toBe(2);
      expect(parsed.priceItems[0].normalizedSku).toBe('MESSY01');
      expect(parsed.priceItems[0].basePrice).toBe(28.5);
      expect(parsed.priceItems[1].normalizedSku).toBe('MESSY02');
    });

    it('5.2 多工作表穿透聚合：應自動合併 Sheet 1 (五金件) 與 Sheet 2 (塑料件) 的全部商品', () => {
      const xlsxLib: any = (XLSX as any).default || XLSX;
      const wb = xlsxLib.utils.book_new();

      // Sheet 1
      const sheet1Data = [
        ['型號', '品名', '底價'],
        ['METAL-01', '鐵支架', 30]
      ];
      const ws1 = xlsxLib.utils.aoa_to_sheet(sheet1Data);
      xlsxLib.utils.book_append_sheet(wb, ws1, '五金車間');

      // Sheet 2
      const sheet2Data = [
        ['型號', '品名', '底價'],
        ['PLASTIC-01', '塑料外殼', 12]
      ];
      const ws2 = xlsxLib.utils.aoa_to_sheet(sheet2Data);
      xlsxLib.utils.book_append_sheet(wb, ws2, '注塑車間');

      // Sheet 3: 無關的備註頁
      const sheet3Data = [
        ['公司制度說明', '本表格僅供內部參考']
      ];
      const ws3 = xlsxLib.utils.aoa_to_sheet(sheet3Data);
      xlsxLib.utils.book_append_sheet(wb, ws3, '備註說明');

      const buffer = xlsxLib.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const parsed = ExcelAdapter.parse(buffer);

      expect(parsed.success).toBe(true);
      expect(parsed.priceItems.length).toBe(2);
      expect(parsed.priceItems.map(i => i.normalizedSku)).toEqual(['METAL01', 'PLASTIC01']);
    });

    it('5.3 體檢防呆與原子回滾：當表格無有效底價列時，應安全拒絕並返回清晰診斷原因', () => {
      const xlsxLib: any = (XLSX as any).default || XLSX;
      const wb = xlsxLib.utils.book_new();

      const invalidData = [
        ['序號', '產品名稱', '規格尺寸', '包裝方式'],
        [1, '空調支架', '500x300mm', '紙箱']
        // 缺少底價列
      ];
      const ws = xlsxLib.utils.aoa_to_sheet(invalidData);
      xlsxLib.utils.book_append_sheet(wb, ws, '無底價表');

      const buffer = xlsxLib.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const parsed = ExcelAdapter.parse(buffer);

      expect(parsed.success).toBe(false);
      expect(parsed.priceItems.length).toBe(0);
      expect(parsed.errorReason).toBeDefined();
      expect(parsed.errorReason).toContain('型號/SKU');
      expect(parsed.errorReason).toContain('底價');
    });
  });

  // =========================================================================
  // 維度 6: 多租戶架構與數據物理隔離測試 (Multi-Tenant Isolation)
  // =========================================================================
  describe('【維度 6】多租戶架構與數據物理隔離測試', () => {
    it('6.1 租戶解析器應能自動從企業郵箱域名或自定義參數中解析租戶 ID', () => {
      expect(TenantService.resolveTenantId('shunde_appliances')).toBe('shunde_appliances');
      expect(TenantService.resolveTenantId(undefined, 'sales@foshan-hardware.com')).toBe('foshan-hardware');
      expect(TenantService.resolveTenantId(undefined, 'boss@gmail.com')).toBe('tenant_boss');
    });

    it('6.2 租戶 A 與 租戶 B 的底價庫應實現物理目錄與數據完全隔離', () => {
      const xlsxLib: any = (XLSX as any).default || XLSX;

      // 構建租戶 A 底價
      const wbA = xlsxLib.utils.book_new();
      const wsA = xlsxLib.utils.aoa_to_sheet([['SKU', '底價'], ['TENANT-A-SKU', 100]]);
      xlsxLib.utils.book_append_sheet(wbA, wsA, 'Prices');
      const bufA = xlsxLib.write(wbA, { type: 'buffer', bookType: 'xlsx' });

      // 構建租戶 B 底價
      const wbB = xlsxLib.utils.book_new();
      const wsB = xlsxLib.utils.aoa_to_sheet([['SKU', '底價'], ['TENANT-B-SKU', 200]]);
      xlsxLib.utils.book_append_sheet(wbB, wsB, 'Prices');
      const bufB = xlsxLib.write(wbB, { type: 'buffer', bookType: 'xlsx' });

      // 保存至獨立租戶目錄
      TenantService.saveActivePricing('tenant_alpha', bufA);
      TenantService.saveActivePricing('tenant_beta', bufB);

      // 分別讀取驗證隔離性
      const readA = TenantService.getActivePricingBuffer('tenant_alpha');
      const readB = TenantService.getActivePricingBuffer('tenant_beta');

      expect(readA).not.toBeNull();
      expect(readB).not.toBeNull();

      const parsedA = ExcelAdapter.parse(readA!.buffer);
      const parsedB = ExcelAdapter.parse(readB!.buffer);

      expect(parsedA.priceItems[0].normalizedSku).toBe('TENANTASKU');
      expect(parsedA.priceItems[0].basePrice).toBe(100);

      expect(parsedB.priceItems[0].normalizedSku).toBe('TENANTBSKU');
      expect(parsedB.priceItems[0].basePrice).toBe(200);
    });
  });

  // =========================================================================
  // 維度 7: 旗艦外貿全場景測試 (別名映射、工藝選配加價、紅線底價與貿易術語)
  // =========================================================================
  describe('【維度 7】旗艦外貿全場景功能測試', () => {
    const flagshipCatalog: StandardPriceItem[] = [
      {
        rawSku: 'ST-2026-A',
        normalizedSku: 'ST2026A',
        aliases: ['ACME-991', 'Heavy Bracket', '991支架'],
        productName: 'Aluminum Precision Bracket',
        basePrice: 15.50,
        floorPrice: 13.00,
        profitMargin: 0.30,
        fobCost: 0.20,
        moq: 1000
      }
    ];

    const flagshipAddons = [
      { keywords: ['Black Coating', '哑光黑', '黑色喷涂'], name: '哑光黑静电喷涂', addonPriceRMB: 3.00 },
      { keywords: ['Laser Logo', '激光刻标', '丝印'], name: '激光刻标', addonPriceRMB: 0.80 }
    ];

    const rates = [{ currency: 'USD', rateToRMB: 7.20 }];

    it('7.1 買家別名映射：當 PO 中買家填寫客戶代碼 ACME-991 時，應自動匹配到 ST-2026-A 底價', () => {
      const poData: POExtractionResult = {
        ConfidenceScore: 95,
        MissingInfo: [],
        IsStandardOrder: true,
        PONumber: 'PO-ALIAS-01',
        CustomerName: 'ACME Corp',
        Date: '2026-08-22',
        TotalOrderValue: null,
        Currency: 'USD',
        DeliveryDetails: 'FOB Shenzhen',
        SpecialRemarks: '',
        UncategorizedCriticalInfo: '',
        BuyerContact: { Name: 'Mark', Email: '' },
        Items: [
          { SKU: 'ACME-991', Description: 'Custom Hardware', Quantity: 1500 }
        ]
      };

      const quote = PricingService.calculate(poData, flagshipCatalog, rates);

      expect(quote.items[0].status).toBe('OK');
      expect(quote.items[0].matchedSku).toBe('ST-2026-A');
      expect(quote.items[0].basePriceRMB).toBe(15.50);
    });

    it('7.2 工藝選配自動加價：當 PO 備註需要 Black Coating + Laser Logo 時，應自動累加選配加價 (15.5 + 3.0 + 0.8)', () => {
      const poData: POExtractionResult = {
        ConfidenceScore: 95,
        MissingInfo: [],
        IsStandardOrder: true,
        PONumber: 'PO-ADDON-01',
        CustomerName: 'Design Pro Ltd',
        Date: '2026-08-22',
        TotalOrderValue: null,
        Currency: 'USD',
        DeliveryDetails: 'FOB Shenzhen',
        SpecialRemarks: 'Requirement: Matt Black Coating and Laser Logo on bracket',
        UncategorizedCriticalInfo: '',
        BuyerContact: { Name: 'Sarah', Email: '' },
        Items: [
          { SKU: 'ST-2026-A', Description: 'Bracket with Black Coating', Quantity: 1000 }
        ]
      };

      const quote = PricingService.calculate(poData, flagshipCatalog, rates, {
        addons: flagshipAddons
      });

      expect(quote.items[0].appliedAddons).toBeDefined();
      expect(quote.items[0].appliedAddons!.length).toBe(2);
      
      // 計算: ((15.5 + 3.0 + 0.8) * 1.3 + 0.20) / 7.20 = (19.3 * 1.3 + 0.20) / 7.2 = (25.09 + 0.20) / 7.2 = 25.29 / 7.2 = 3.5125 -> 3.51 USD
      expect(quote.items[0].unitPriceForeign).toBe(3.51);
    });

    it('7.3 貿易術語切換：當客戶要求 EXW (出廠價) 時，港口雜費應自動歸 0', () => {
      const poData: POExtractionResult = {
        ConfidenceScore: 95,
        MissingInfo: [],
        IsStandardOrder: true,
        PONumber: 'PO-EXW-01',
        CustomerName: 'Local Exporter',
        Date: '2026-08-22',
        TotalOrderValue: null,
        Currency: 'USD',
        DeliveryDetails: 'Terms: EXW Factory Price',
        SpecialRemarks: '',
        UncategorizedCriticalInfo: '',
        BuyerContact: { Name: 'Kevin', Email: '' },
        Items: [
          { SKU: 'ST-2026-A', Description: 'Standard Bracket', Quantity: 1000 }
        ]
      };

      const quote = PricingService.calculate(poData, flagshipCatalog, rates);

      expect(quote.incotermUsed).toContain('EXW');
      expect(quote.items[0].fobCostRMB).toBe(0);
      // (15.5 * 1.3 + 0) / 7.2 = 20.15 / 7.2 = 2.7986 -> 2.80 USD
      expect(quote.items[0].unitPriceForeign).toBe(2.80);
    });
  });

  // =========================================================================
  // 維度 8: 終極企業版功能測試 (樣品防薅羊毛、整櫃裝載速算與 7-Sheet 解析)
  // =========================================================================
  describe('【維度 8】終極企業版外貿功能測試', () => {
    const ultimateCatalog: StandardPriceItem[] = [
      {
        rawSku: 'ST-2026-A',
        normalizedSku: 'ST2026A',
        productName: 'Aluminum Precision Bracket',
        basePrice: 15.50,
        profitMargin: 0.30,
        fobCost: 0,
        moq: 1000,
        sampleMultiplier: 2.5,
        pcsPerCtn: 50,
        cbmPerCtn: 0.045
      }
    ];

    const rates = [{ currency: 'USD', rateToRMB: 7.20 }];

    it('8.1 樣品單防薅羊毛：當買家只採購 2 件樣品時，應自動觸發 2.5 倍樣品倍率，並在條款中註明大貨全額退還', () => {
      const poData: POExtractionResult = {
        ConfidenceScore: 95,
        MissingInfo: [],
        IsStandardOrder: true,
        PONumber: 'PO-SAMPLE-01',
        CustomerName: 'New Buyer UK',
        Date: '2026-08-22',
        TotalOrderValue: null,
        Currency: 'USD',
        DeliveryDetails: 'EXW Factory',
        SpecialRemarks: 'Sample order for evaluation',
        UncategorizedCriticalInfo: '',
        BuyerContact: { Name: 'Tom', Email: '' },
        Items: [
          { SKU: 'ST-2026-A', Description: 'Sample Bracket', Quantity: 2 }
        ]
      };

      const quote = PricingService.calculate(poData, ultimateCatalog, rates);

      expect(quote.items[0].appliedTier).toContain('Sample Tier');
      // 樣品底價: 15.50 * 2.5 = 38.75 RMB
      expect(quote.items[0].basePriceRMB).toBe(38.75);
      // 美元單價: (38.75 * 1.3) / 7.2 = 50.375 / 7.2 = 6.996 -> 7.00 USD
      expect(quote.items[0].unitPriceForeign).toBe(7.00);
      expect(quote.riskDisclaimers.some(d => d.includes('Sample Order Policy') && d.includes('100% of sample surcharge will be fully credited/refunded'))).toBe(true);
    });

    it('8.2 集裝箱整櫃裝載速算：批量訂單應自動計算總箱數、總 CBM，並預估 20GP 與 40HQ 裝櫃能力', () => {
      const poData: POExtractionResult = {
        ConfidenceScore: 95,
        MissingInfo: [],
        IsStandardOrder: true,
        PONumber: 'PO-BULK-01',
        CustomerName: 'Major Retailer',
        Date: '2026-08-22',
        TotalOrderValue: null,
        Currency: 'USD',
        DeliveryDetails: 'FOB Shenzhen',
        SpecialRemarks: '',
        UncategorizedCriticalInfo: '',
        BuyerContact: { Name: 'David', Email: '' },
        Items: [
          { SKU: 'ST-2026-A', Description: 'Bulk Brackets', Quantity: 5000 }
        ]
      };

      const quote = PricingService.calculate(poData, ultimateCatalog, rates);

      expect(quote.containerEstimate).toBeDefined();
      // 5000 pcs / 50 pcs/ctn = 100 cartons
      expect(quote.containerEstimate!.totalCartons).toBe(100);
      // 100 ctns * 0.045 CBM = 4.5 CBM
      expect(quote.containerEstimate!.totalCBM).toBe(4.5);
      // 20GP (28 CBM / 0.045 = 622 ctns * 50 = 31100 pcs)
      expect(quote.containerEstimate!.units20GP).toBe(31100);
      // 40HQ (68 CBM / 0.045 = 1511 ctns * 50 = 75550 pcs)
      expect(quote.containerEstimate!.units40HQ).toBe(75550);
    });

    it('8.3 7-Sheet 終極企業版 Excel 完整解析驗證：應順利跳過 ReadMe 與 Container_Calc，並 100% 提取商品與匯率', () => {
      const parsed = ExcelAdapter.parse('F:/order_workflow/商品底价表.xlsx');

      expect(parsed.success).toBe(true);
      expect(parsed.priceItems.length).toBe(5);
      expect(parsed.exchangeRates.length).toBe(6);
      expect(parsed.addons.length).toBe(7);
      expect(parsed.incotermRules.length).toBe(5);
      expect(parsed.paymentTerms.length).toBe(4);
      expect(parsed.priceItems[0].sampleMultiplier).toBe(2.5);
    });
  });

});
