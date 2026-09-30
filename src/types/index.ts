import { z } from 'zod';

// ==========================================
// 1. 通用容錯轉換器 (支持字符串、數組、數字、null、undefined)
// ==========================================
const stringOrArrayToString = z
  .union([z.string(), z.array(z.string()), z.number()])
  .nullish()
  .transform(val => {
    if (val === null || val === undefined) return '';
    if (Array.isArray(val)) return val.join('; ');
    return String(val).trim();
  });

const safeNumber = (defaultValue: number = 0) =>
  z
    .union([z.number(), z.string()])
    .nullish()
    .transform(val => {
      if (val === null || val === undefined) return defaultValue;
      if (typeof val === 'number') return isNaN(val) ? defaultValue : val;
      const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? defaultValue : parsed;
    });

// ==========================================
// 2. AI 提取數據的 Zod 校驗 Schema
// ==========================================
export const POItemSchema = z.object({
  SKU: z.string().nullish().transform(val => (val ? String(val).trim() : 'UNKNOWN-ITEM')),
  Description: stringOrArrayToString,
  Quantity: safeNumber(1).transform(val => (val > 0 ? val : 1)),
  ConfidenceScore: safeNumber(90).transform(val => Math.min(100, Math.max(0, val))).default(90),
  MatchStatus: z.enum(['EXACT', 'FUZZY', 'UNMATCHED']).nullish().transform(val => val || 'EXACT').default('EXACT'),
  ConfidenceRemark: stringOrArrayToString.default('')
});

export type POItem = {
  SKU: string;
  Description: string;
  Quantity: number;
  ConfidenceScore?: number;
  MatchStatus?: 'EXACT' | 'FUZZY' | 'UNMATCHED';
  ConfidenceRemark?: string;
};

export const POExtractionSchema = z.object({
  ConfidenceScore: safeNumber(85).transform(val => Math.min(100, Math.max(0, val))),
  MissingInfo: z
    .union([z.array(z.string()), z.string()])
    .nullish()
    .transform(val => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(String);
      return [String(val)];
    }),
  IsStandardOrder: z
    .union([z.boolean(), z.string()])
    .nullish()
    .transform(val => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') return val.toLowerCase() === 'true';
      return true;
    }),
  PONumber: stringOrArrayToString.transform(val => val || 'N/A'),
  CustomerName: stringOrArrayToString.transform(val => val || 'Valued Customer'),
  Date: stringOrArrayToString.transform(val => val || new Date().toISOString().split('T')[0]),
  TotalOrderValue: safeNumber(0).transform(val => (val > 0 ? val : null)),
  Currency: stringOrArrayToString.transform(val => (val ? val.toUpperCase() : 'USD')),
  DeliveryDetails: stringOrArrayToString,
  SpecialRemarks: stringOrArrayToString,
  UncategorizedCriticalInfo: stringOrArrayToString,
  BuyerContact: z
    .object({
      Name: stringOrArrayToString.transform(val => val || 'Purchasing Manager'),
      Email: stringOrArrayToString.transform(val => val || '')
    })
    .nullish()
    .transform(val => val || { Name: 'Purchasing Manager', Email: '' }),
  Items: z.array(POItemSchema).nullish().transform(val => (val && val.length > 0 ? val : []))
});

export type POExtractionResult = Omit<z.infer<typeof POExtractionSchema>, 'Items'> & {
  Items: POItem[];
};

// ==========================================
// 3. 底價表、選配庫、貿易術語、匯率與商務條款結構
// ==========================================
export interface StandardPriceItem {
  rawSku: string;              // 原始 SKU 文本
  normalizedSku: string;       // 歸一化 SKU（去空格、去符號、轉大寫）
  aliases?: string[];          // 買家常用別名與同義詞代碼 (如 ACME-991, Stand Pro)
  productName: string;         // 品名與規格描述
  basePrice: number;           // 人民幣基礎出廠底價 (階梯 1)
  floorPrice?: number;         // 最低保護紅線價 (防止報虧的防呆底線)
  profitMargin: number;        // 毛利率 (如 0.3)
  fobCost: number;             // 單件 FOB 港口雜費
  moq?: number;                // 最小起訂量 (Minimum Order Quantity)
  sampleMultiplier?: number;   // 樣品打樣費倍率 (如 2.5 ~ 3.0 倍)
  tier2Qty?: number;           // 階梯 2 起始數量 (例如 >= 5000)
  tier2BasePrice?: number;     // 階梯 2 大批量特惠底價
  tier3Qty?: number;           // 階梯 3 起始數量 (例如 >= 10000)
  tier3BasePrice?: number;     // 階梯 3 整櫃特惠底價
  pcsPerCtn?: number;          // 每箱裝量
  cbmPerCtn?: number;          // 每箱外箱體積
  gwPerCtn?: number;           // 每箱毛重 (kg)
  leadTime?: string;           // 生產交期
  hsCode?: string;             // 海關編碼
}

export interface StandardAddonItem {
  keywords: string[];          // 匹配關鍵詞 (如: Black Coating, 啞光黑)
  name: string;                // 選配工藝名稱
  addonPriceRMB: number;       // 加價金額 (RMB)
  scope?: string;              // 適用範圍
}

export interface StandardIncotermRule {
  incoterm: string;            // 貿易術語 (EXW, FOB, CIF)
  port?: string;               // 指定港口
  unitFeeRMB: number;          // 單件均攤雜費
  fixedFeeRMB: number;         // 單票固定雜費
}

export interface StandardPaymentTerm {
  term: string;                // 付款方式 (100% T/T, 30/70, L/C, OA)
  adjustmentPercent: number;   // 價格浮動比例 (-0.02, +0.015)
}

export interface StandardExchangeRate {
  currency: string;            // 幣種 (USD, EUR, GBP, CAD, AUD, AED)
  rateToRMB: number;           // 兌人民幣匯率
  symbol?: string;             // 幣種符號 ($, €, £)
}

// ==========================================
// 4. 報價計算結果
// ==========================================
export type QuotedItemStatus = 'OK' | 'NEED_MANUAL_PRICE' | 'CALCULATION_ERROR';

export interface AppliedAddon {
  name: string;
  addonRMB: number;
}

export interface QuotedItem {
  sku: string;
  matchedSku?: string;         // 命中的真實內部 SKU
  description: string;
  quantity: number;
  basePriceRMB: number;
  itemConfidenceScore?: number; // 單項商品 AI 置信度 (0-100)
  matchStatus?: 'EXACT' | 'FUZZY' | 'UNMATCHED'; // 匹配狀態
  confidenceRemark?: string;   // 存疑備註或原因
  appliedTier?: string;        // 命中的階梯 (例如 "Standard Tier", "Sample Order (2.5x)", "Tier 2 (>=5000pcs)")
  appliedAddons?: AppliedAddon[]; // 命中的選配工藝加價
  profitMargin: number;
  fobCostRMB: number;
  unitPriceForeign: number;    // 外幣單價
  subTotalForeign: number;     // 外幣小計
  status: QuotedItemStatus;
  warning?: string;
  moqWarning?: string;         // 起訂量不足警報
  floorPriceWarning?: string;  // 低於紅線價保護警報
}

export interface ContainerEstimate {
  totalCartons: number;
  totalCBM: number;
  totalGW?: number;            // 預估貨物總毛重 (KG)
  units20GP?: number;          // 20GP 安全裝載總件數預估 (28 CBM)
  units40HQ?: number;          // 40HQ 安全裝載總件數預估 (68 CBM)
  recommendedContainer?: string; // 推薦裝櫃模式 (如 "1x 20'GP (52% Full)", "LCL (拼箱)")
  loadingRate?: number;        // 配載率百分比 (如 52)
}

export interface QuotationResult {
  quotationNumber: string;
  tenantId?: string;           // 所屬租戶 ID
  createdBy?: string;          // 創建人 Email/ID
  salesRepName?: string;       // 業務員姓名
  customerName: string;
  buyerName: string;
  buyerEmail: string;
  date: string;
  currency: string;
  rateUsed: number;
  incotermUsed?: string;       // 採用的貿易術語 (FOB Shenzhen, EXW 等)
  items: QuotedItem[];
  totalAmountForeign: number;
  hasWarnings: boolean;
  warnings: string[];
  riskDisclaimers: string[];   // 匯率與不可抗力風控條款
  containerEstimate?: ContainerEstimate; // 整櫃裝載速算
  termsAndConditions: string;
  paymentTerms?: string;
  paymentTermAdjustmentPercent?: number; // 付款方式浮动比例 (-0.02 为直降2%, +0.045 为账期利息)
  paymentTermAdjustmentAmount?: number;  // 付款方式调整的外币金额 (折扣为负数，账期利息为正数)
  subTotalBeforeAdjustmentForeign?: number; // 调整前的商品小计外币总额
  priceValidity?: string;
  leadTime?: string;
  samplePolicy?: string;
  aiConfidenceScore: number;
  aiModelUsed: string;
  processedAt: string;
}

// ==========================================
// 5. 租戶、用戶與 RBAC 權限體系
// ==========================================
export type UserRole = 'admin' | 'sales' | 'viewer';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
}

export interface TenantProfile {
  tenantId: string;
  companyName: string;
  managerName?: string;
  alias?: string;
  companySubtitle?: string;
  companyAddress?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  logoUrl?: string;            // 企業自定義 Logo 圖片網址 (如 /uploads/logos/default.png)
  logoPath?: string;           // 企業自定義 Logo 本地文件絕對路徑
  hideCostFromSales: boolean;  // 是否對普通業務員隱藏出廠底價 (防洩密)
  defaultProfitMargin: number; // 默認毛利率 (如 0.3)
  defaultCurrency: string;     // 默認幣種 (如 USD)
  plan?: 'trial' | 'monthly' | 'annual' | 'geek' | 'starter' | 'pro' | 'enterprise';
  status?: 'active' | 'suspended' | 'expired';
  expiresAt?: string;          // 服務到期時間 (ISO 8601)
  dataRetentionUntil?: string; // 歷史數據安全封存截止時間 (ISO 8601, 試用到期後保留 60 天 / 2 個月)
  apiKeys?: string[];          // API 金鑰列表
  imapConfig?: {
    enabled: boolean;
    email: string;
    authCode: string; // 客戶端專用授權碼
    host?: string;     // 如 imap.qiye.163.com
    port?: number;     // 默認 993
    secure?: boolean;  // 默認 true
    lastPollAt?: string;
    lastPollStatus?: string;
    inquiriesAutoProcessed?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// 6. API 響應結構
// ==========================================
export interface ProcessQuoteResponse {
  success: boolean;
  quotation: QuotationResult;
  draftEmail: {
    subject: string;
    body: string;
    htmlBody?: string;
    emailProvider?: 'gmail' | 'imap' | 'smtp';
    pdfFileName: string;
  };
  pdfBase64?: string;
  error?: string;
}
