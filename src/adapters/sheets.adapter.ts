import { StandardPriceItem, StandardExchangeRate } from '../types/index.js';
import { normalizeSKU, parseSafeNumber } from '../utils/sku-normalizer.js';
import { matchColumns } from './schema-matcher.js';
import * as XLSX from 'xlsx';

export interface GoogleSheetsAuthOptions {
  apiKey?: string;
  serviceAccountKeyJson?: any;
  oauth2Client?: any;
}

export class GoogleSheetsAdapter {
  /**
   * 從 Google Sheets 遠端讀取並解析底價與匯率表
   * 支持免密鑰公開鏈接讀取（極速容錯）與官方 API 讀取
   */
  static async parse(
    spreadsheetId: string,
    authOptions: GoogleSheetsAuthOptions = {},
    options: { defaultProfitMargin?: number; defaultFobCost?: number } = {}
  ): Promise<{
    priceItems: StandardPriceItem[];
    exchangeRates: StandardExchangeRate[];
  }> {
    const defaultMargin = options.defaultProfitMargin ?? 0.3;
    const defaultFob = options.defaultFobCost ?? 0;

    // 優先策略 1：嘗試通過 Google Sheets 公開導出鏈接（最穩定、免配置密鑰）
    try {
      console.log(`🌐 正在通過 Google 導出通道獲取表格: ${spreadsheetId}...`);
      const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
      const response = await fetch(exportUrl);

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        let priceItems: StandardPriceItem[] = [];
        let exchangeRates: StandardExchangeRate[] = [];

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
          if (rawRows.length === 0) continue;

          const headers = Object.keys(rawRows[0]);
          const matched = matchColumns(headers);

          // 匯率表
          if (matched.targetCurrency && matched.rateToRMB) {
            for (const row of rawRows) {
              const curr = String(row[matched.targetCurrency] || '').trim().toUpperCase();
              const rate = parseSafeNumber(row[matched.rateToRMB], 0);
              if (curr && rate > 0) {
                exchangeRates.push({ currency: curr, rateToRMB: rate });
              }
            }
            continue;
          }

          // 底價表
          if (matched.sku && matched.basePrice) {
            for (const row of rawRows) {
              const rawSku = String(row[matched.sku] || '').trim();
              if (!rawSku) continue;

              const basePrice = parseSafeNumber(row[matched.basePrice], 0);
              const productName = matched.productName ? String(row[matched.productName] || '').trim() : '';
              let margin = matched.profitMargin ? parseSafeNumber(row[matched.profitMargin], defaultMargin) : defaultMargin;
              if (margin > 1 && margin <= 100) margin = margin / 100;
              const fob = matched.fobCost ? parseSafeNumber(row[matched.fobCost], defaultFob) : defaultFob;

              priceItems.push({
                rawSku,
                normalizedSku: normalizeSKU(rawSku),
                productName,
                basePrice,
                profitMargin: margin,
                fobCost: fob
              });
            }
          }
        }

        if (priceItems.length > 0 || exchangeRates.length > 0) {
          console.log(`✅ 通過公開通道成功解析: ${priceItems.length} 個商品，${exchangeRates.length} 條匯率`);
          return { priceItems, exchangeRates };
        }
      }
    } catch (e: any) {
      console.warn(`⚠️ 公開導出通道嘗試失敗: ${e.message}，嘗試使用 API 讀取...`);
    }

    // 策略 2：使用 Google API
    const apiKey = authOptions.apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey && !authOptions.serviceAccountKeyJson && !authOptions.oauth2Client) {
      throw new Error('無法讀取 Google Sheets，請確保表格已設置為「知道鏈接的任何人可查看」，或配置 GOOGLE_API_KEY');
    }

    const { google } = await import('googleapis');
    let auth: any = apiKey;
    if (authOptions.oauth2Client) {
      auth = authOptions.oauth2Client;
    } else if (authOptions.serviceAccountKeyJson) {
      auth = new google.auth.JWT({
        email: authOptions.serviceAccountKeyJson.client_email,
        key: authOptions.serviceAccountKeyJson.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
    }

    const sheets = google.sheets({ version: 'v4', auth });
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetList = meta.data.sheets || [];

    let priceItems: StandardPriceItem[] = [];
    let exchangeRates: StandardExchangeRate[] = [];

    for (const sheetObj of sheetList) {
      const sheetTitle = sheetObj.properties?.title;
      if (!sheetTitle) continue;

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetTitle}!A1:Z500`,
      });

      const rows = res.data.values;
      if (!rows || rows.length < 2) continue;

      const headers: string[] = rows[0].map(h => String(h || ''));
      const matched = matchColumns(headers);

      if (matched.targetCurrency && matched.rateToRMB) {
        const currIndex = headers.indexOf(matched.targetCurrency);
        const rateIndex = headers.indexOf(matched.rateToRMB);

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const curr = String(row[currIndex] || '').trim().toUpperCase();
          const rate = parseSafeNumber(row[rateIndex], 0);
          if (curr && rate > 0) {
            exchangeRates.push({ currency: curr, rateToRMB: rate });
          }
        }
        continue;
      }

      if (matched.sku && matched.basePrice) {
        const skuIndex = headers.indexOf(matched.sku);
        const priceIndex = headers.indexOf(matched.basePrice);
        const nameIndex = matched.productName ? headers.indexOf(matched.productName) : -1;
        const marginIndex = matched.profitMargin ? headers.indexOf(matched.profitMargin) : -1;
        const fobIndex = matched.fobCost ? headers.indexOf(matched.fobCost) : -1;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const rawSku = String(row[skuIndex] || '').trim();
          if (!rawSku) continue;

          const basePrice = parseSafeNumber(row[priceIndex], 0);
          const productName = nameIndex >= 0 ? String(row[nameIndex] || '').trim() : '';

          let margin = marginIndex >= 0 ? parseSafeNumber(row[marginIndex], defaultMargin) : defaultMargin;
          if (margin > 1 && margin <= 100) margin = margin / 100;

          const fob = fobIndex >= 0 ? parseSafeNumber(row[fobIndex], defaultFob) : defaultFob;

          priceItems.push({
            rawSku,
            normalizedSku: normalizeSKU(rawSku),
            productName,
            basePrice,
            profitMargin: margin,
            fobCost: fob
          });
        }
      }
    }

    return { priceItems, exchangeRates };
  }
}
