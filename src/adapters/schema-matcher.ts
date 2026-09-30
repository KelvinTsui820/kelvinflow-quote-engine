export interface ColumnMappingRules {
  sku: string[];
  aliases: string[];
  productName: string[];
  basePrice: string[];
  floorPrice: string[];
  profitMargin: string[];
  fobCost: string[];
  targetCurrency: string[];
  rateToRMB: string[];
  moq: string[];
  sampleMultiplier: string[];
  tier2Qty: string[];
  tier2BasePrice: string[];
  tier3Qty: string[];
  tier3BasePrice: string[];
  pcsPerCtn: string[];
  cbmPerCtn: string[];
  grossWeight: string[];
  leadTime: string[];
  hsCode: string[];
}

export const DEFAULT_COLUMN_RULES: ColumnMappingRules = {
  sku: [
    'sku', '型号', '型號', 'item no', 'item_no', 'item number', 'product code', 
    'part no', 'part#', '货号', '貨號', '產品型號', '产品型号', 'code', '物料编码', '物料編碼'
  ],
  aliases: [
    'aliases', 'alias', '别名', '別名', '买家常用别名', '买家别名', '同义词', '同義詞', '买家代号', '買家代號', 
    '客户代码', '客戶代碼', '客户代号', '買家型號', '买家型号', '常用代称', 'buyer part', 'buyer sku'
  ],
  productName: [
    'product name', 'product_name', 'name', '品名', '产品名称', '產品名稱', 
    'description', '描述', '货物名称', '貨物名稱', '规格', '規格', '产品名称与规格'
  ],
  basePrice: [
    'base price', 'base_price', '底价', '底價', '成本', 'cost', '人民币底价', 
    '人民幣底價', 'rmb base', 'unit cost', '单价', '單價', '出厂价', '出廠價', '厂价', '廠價', '出厂底价'
  ],
  floorPrice: [
    'floor price', 'floor_price', '最低保护价', '最低保護價', '红线价', '紅線價', 
    '底线价', '底線價', '最低保护红线价', 'min price', 'walk away'
  ],
  profitMargin: [
    'profit margin', 'profit_margin', 'margin', '利润率', '利潤率', '毛利', 
    '毛利率', 'markup', '加价率', '加價率', '预期毛利率'
  ],
  fobCost: [
    'fob cost', 'fob_cost', 'fob', '杂费', '雜費', '固定费用', '固定費用', '单件均摊固定杂费', 
    '均摊杂费', 'local fee', 'port fee', '港口费', '港口費', '单件均摊杂费'
  ],
  targetCurrency: [
    'target currency', 'target_currency', 'currency', '币种', '幣種', '外币币种', '外幣幣種', '货币', '貨幣'
  ],
  rateToRMB: [
    'rate to rmb', 'rate_to_rmb', 'rate', '汇率', '匯率', '内部锁定汇率', '內部鎖定匯率', '锁定汇率', 'exchange rate'
  ],
  moq: [
    'moq', '起订量', '起訂量', '最小起订量', '最小起訂量', '最小订购量', '最小訂購量', 'min order', 'minimum order'
  ],
  sampleMultiplier: [
    'sample multiplier', 'sample', '打样倍率', '样品倍率', '打样费', '打樣費', '样品打样倍率', 'sample fee multiplier', 'sample price'
  ],
  tier2Qty: [
    'tier 2 qty', 'tier2_qty', '阶梯2数量', '階梯2數量', '大批量数量', '大批量數量', '5000件数量', '5000件數量', 'qty tier 2'
  ],
  tier2BasePrice: [
    'tier 2 price', 'tier2_price', '阶梯2底价', '階梯2底價', '大批量底价', '大批量底價', '5000件底价', '5000件底價', '5000件优惠底价', 'tier 2 cost'
  ],
  tier3Qty: [
    'tier 3 qty', 'tier3_qty', '阶梯3数量', '階梯3數量', '整柜数量', '整櫃數量', '10000件数量', '10000件數量', 'qty tier 3'
  ],
  tier3BasePrice: [
    'tier 3 price', 'tier3_price', '阶梯3底价', '階梯3底價', '整柜底价', '整櫃底價', '10000件底价', '10000件底價', '整柜特惠底价', 'tier 3 cost'
  ],
  pcsPerCtn: [
    'pcs/ctn', 'pcs per ctn', '装箱数', '裝箱數', '单箱装量', '單箱裝量', 'packing', 'pack qty'
  ],
  cbmPerCtn: [
    'cbm', 'cbm/ctn', '外箱体积', '外箱體積', '体积', '體積', 'carton volume'
  ],
  grossWeight: [
    'gw', 'g.w.', 'gross weight', '毛重', '单箱毛重', '單箱毛重', 'weight', '重量', 'kg/ctn'
  ],
  leadTime: [
    'lead time', 'lead_time', '交期', '生产交期', '生產交期', 'delivery time'
  ],
  hsCode: [
    'hs code', 'hs_code', 'hscode', '海关编码', '海關編碼', '税号', '稅號'
  ]
};

/**
 * 計算某一行作為表頭的匹配權重得分 (智能跳行嗅探用)
 */
export function scoreRowAsHeader(rowCells: any[], rules: ColumnMappingRules = DEFAULT_COLUMN_RULES): number {
  if (!rowCells || !Array.isArray(rowCells) || rowCells.length === 0) return 0;

  // 1. 过滤有效非空单元格，单单元格说明行/标题行绝不是表头
  const nonEmptyCells = rowCells.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
  if (nonEmptyCells.length < 2) return 0;

  // 2. 如果存在超长文本单元格 (说明段落通常 > 60 字符)，排除该行为表头的可能
  if (nonEmptyCells.some(c => String(c).trim().length > 60)) {
    return 0;
  }

  let score = 0;
  let hasSku = false;
  let hasPrice = false;

  for (const cell of nonEmptyCells) {
    if (!cell) continue;
    const str = String(cell).toLowerCase().trim();
    if (!str) continue;

    // 檢查 SKU 關鍵字 (權重 5)
    if (rules.sku.some(kw => str.includes(kw.toLowerCase()))) {
      if (!hasSku) {
        score += 5;
        hasSku = true;
      }
    }

    // 檢查 底價 關鍵字 (權重 5)
    if (rules.basePrice.some(kw => str.includes(kw.toLowerCase()))) {
      if (!hasPrice) {
        score += 5;
        hasPrice = true;
      }
    }

    // 檢查 其他列 關鍵字
    if (rules.productName.some(kw => str.includes(kw.toLowerCase()))) score += 2;
    if (rules.aliases.some(kw => str.includes(kw.toLowerCase()))) score += 3;
    if (rules.floorPrice.some(kw => str.includes(kw.toLowerCase()))) score += 2;
    if (rules.sampleMultiplier.some(kw => str.includes(kw.toLowerCase()))) score += 2;
    if (rules.profitMargin.some(kw => str.includes(kw.toLowerCase()))) score += 2;
    if (rules.fobCost.some(kw => str.includes(kw.toLowerCase()))) score += 2;
    if (rules.moq.some(kw => str.includes(kw.toLowerCase()))) score += 2;
    if (rules.targetCurrency.some(kw => str.includes(kw.toLowerCase()))) score += 3;
    if (rules.rateToRMB.some(kw => str.includes(kw.toLowerCase()))) score += 3;
  }

  // 只有同時包含型號和底價（或幣種和匯率）的行才賦予極高優先級
  if (hasSku && hasPrice) score += 10;

  return score;
}

/**
 * 模糊表頭匹配器 (簡繁英全兼容)
 */
export function matchColumns(headers: string[], rules: ColumnMappingRules = DEFAULT_COLUMN_RULES) {
  const result: Record<string, string | null> = {};

  for (const [standardKey, keywords] of Object.entries(rules)) {
    let matchedHeader: string | null = null;

    for (const rawHeader of headers) {
      if (!rawHeader) continue;
      const normalizedHeader = String(rawHeader).toLowerCase().trim();

      // 精確包含匹配
      const isMatch = (keywords as string[]).some(kw => 
        normalizedHeader.includes(kw.toLowerCase()) || 
        normalizedHeader.replace(/[\s\-_()（）:：/]/g, '').includes(kw.toLowerCase().replace(/[\s\-_()（）:：/]/g, ''))
      );

      if (isMatch) {
        matchedHeader = rawHeader;
        break;
      }
    }

    result[standardKey] = matchedHeader;
  }

  return result;
}
