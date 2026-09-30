/**
 * SKU 字符串歸一化工具
 * 目的：消除大小寫、空格、連字符、下劃線、點號帶來的匹配差異
 * 例如："ST-2026-A" / "st 2026_a" / "St-2026.A" -> 統一轉化為 "ST2026A"
 */
export function normalizeSKU(sku: string | undefined | null): string {
  if (!sku) return "";
  return String(sku)
    .replace(/[\s\-_.\/\\#]/g, "")
    .toUpperCase()
    .trim();
}

/**
 * 數字安全轉換工具（去除非數字字符、貨幣符號如 $、¥）
 */
export function parseSafeNumber(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === "") return fallback;
  if (typeof val === "number") return isNaN(val) ? fallback : val;
  
  const cleanStr = String(val).replace(/[^0-9.-]+/g, "");
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? fallback : parsed;
}
