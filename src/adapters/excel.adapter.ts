import * as XLSX from 'xlsx';
import fs from 'fs';
import {
  StandardPriceItem,
  StandardExchangeRate,
  StandardAddonItem,
  StandardIncotermRule,
  StandardPaymentTerm
} from '../types/index.js';
import { normalizeSKU, parseSafeNumber } from '../utils/sku-normalizer.js';
import { matchColumns, scoreRowAsHeader, ColumnMappingRules, DEFAULT_COLUMN_RULES } from './schema-matcher.js';

export interface ExcelParseOptions {
  defaultProfitMargin?: number;
  defaultFobCost?: number;
  customRules?: ColumnMappingRules;
}

export interface ExcelParseResult {
  success: boolean;
  priceItems: StandardPriceItem[];
  exchangeRates: StandardExchangeRate[];
  addons: StandardAddonItem[];
  incotermRules: StandardIncotermRule[];
  paymentTerms: StandardPaymentTerm[];
  parsedSheets: string[];
  detectedHeaders: Record<string, string[]>;
  warnings: string[];
  errorReason?: string;
  defaultProfitMargin?: number;
  floorMargin?: number;
  sampleMultiplier?: number;
  defaultCurrency?: string;
  defaultIncoterm?: string;
  priceValidity?: string;
  leadTime?: string;
  samplePolicy?: string;
  containerSpecs?: any[];
}

export class ExcelAdapter {
  /**
   * 從本地文件路徑或內存 Buffer 智能解析 7-Sheet 終極企業版 Excel
   */
  static parse(
    fileInput: string | Buffer,
    options: ExcelParseOptions = {}
  ): ExcelParseResult {
    const defaultMargin = options.defaultProfitMargin ?? 0.3;
    const defaultFob = options.defaultFobCost ?? 0;
    const rules = options.customRules || DEFAULT_COLUMN_RULES;

    const xlsxLib: any = (XLSX as any).default || XLSX;
    let buffer: Buffer;

    try {
      buffer = typeof fileInput === 'string' ? fs.readFileSync(fileInput) : fileInput;
    } catch (err: any) {
      return {
        success: false,
        priceItems: [],
        exchangeRates: [],
        addons: [],
        incotermRules: [],
        paymentTerms: [],
        parsedSheets: [],
        detectedHeaders: {},
        warnings: [`文件讀取失敗: ${err.message}`],
        errorReason: '無法讀取 Excel 文件，可能文件已損壞或不存在'
      };
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = xlsxLib.read(buffer, { type: 'buffer' });
    } catch (err: any) {
      return {
        success: false,
        priceItems: [],
        exchangeRates: [],
        addons: [],
        incotermRules: [],
        paymentTerms: [],
        parsedSheets: [],
        detectedHeaders: {},
        warnings: [`Excel 文件格式損壞: ${err.message}`],
        errorReason: 'Excel 文件格式損壞或受密碼保護'
      };
    }

    const priceItems: StandardPriceItem[] = [];
    const exchangeRates: StandardExchangeRate[] = [];
    const addons: StandardAddonItem[] = [];
    const incotermRules: StandardIncotermRule[] = [];
    const paymentTerms: StandardPaymentTerm[] = [];
    const parsedSheets: string[] = [];
    const detectedHeadersMap: Record<string, string[]> = {};
    const warnings: string[] = [];
    let detectedDefaultMargin: number | undefined = undefined;
    let detectedDefaultCurrency: string | undefined = undefined;
    let detectedDefaultIncoterm: string | undefined = undefined;
    let detectedPriceValidity: string | undefined = undefined;
    let detectedLeadTime: string | undefined = undefined;
    let detectedSamplePolicy: string | undefined = undefined;
    let detectedFloorMargin: number | undefined = undefined;
    let detectedSampleMultiplier: number | undefined = undefined;
    const containerSpecs: any[] = [];

    // 遍歷所有 Sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet || !sheet['!ref']) continue;

      const rawMatrix: any[][] = xlsxLib.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!rawMatrix || rawMatrix.length === 0) continue;

      const normSheetName = sheetName.toLowerCase().replace(/[\s_-]/g, '');

      // 0. 忽略使用說明 / Readme 工作表
      if (normSheetName.includes('readme') || normSheetName.includes('使用指南') || normSheetName.includes('使用说明') || normSheetName.includes('說明') || normSheetName.includes('指引')) {
        parsedSheets.push(`${sheetName} (使用指南)`);
        continue;
      }

      // 0.1 識別集裝箱裝載速算表
      if (normSheetName.includes('container') || normSheetName.includes('集装箱') || normSheetName.includes('集裝箱') || normSheetName.includes('装载速算')) {
        const rows: any[] = xlsxLib.utils.sheet_to_json(sheet, { defval: '' });
        parsedSheets.push(`${sheetName} (裝櫃速算庫)`);
        for (const row of rows) {
          const rawType = String(row['集装箱型号 (Container Type)'] || row['集装箱型号'] || row['型号'] || Object.values(row)[0] || '').trim();
          const match = rawType.match(/(20GP|40GP|40HQ|45HQ)/i);
          if (match) {
            const type = match[1].toUpperCase();
            const safeCBM = parseSafeNumber(row['安全装载容积 (CBM)'] || row['安全容积'] || row['容积'] || Object.values(row)[2], 0) || parseSafeNumber(Object.values(row)[1], 0);
            const maxKG = parseSafeNumber(row['最大载重 (KG)'] || row['最大载重'] || Object.values(row)[3], 0);
            const advice = String(row['装柜适用建议'] || Object.values(row)[4] || '').trim();
            if (!containerSpecs.some(x => x.type === type)) {
              containerSpecs.push({ type, label: rawType, safeCBM, maxKG, advice });
            }
          }
        }
        continue;
      }

      // 1. 工藝選配 Sheet 已按方案 A 切除，不導入任何工藝附加費庫

      // 2. 【專用 Sheet 識別】：貿易術語與港口雜費 (Incoterms)
      if (normSheetName.includes('incoterm') || normSheetName.includes('贸易术语') || normSheetName.includes('貿易術語') || normSheetName.includes('港口')) {
        const rows: any[] = xlsxLib.utils.sheet_to_json(sheet, { defval: '' });
        parsedSheets.push(`${sheetName} (貿易術語庫)`);
        for (const row of rows) {
          const incoterm = String(row['贸易术语 (Incoterm)'] || row['术语'] || row['Incoterm'] || Object.values(row)[0] || '').trim().toUpperCase();
          const port = String(row['指定港口/交货地点'] || row['港口'] || row['Port'] || Object.values(row)[1] || '').trim();
          const unitFee = parseSafeNumber(row['单件均摊杂费 (RMB)'] || row['单件杂费'] || Object.values(row)[2], 0);
          const fixedFee = parseSafeNumber(row['整单固定杂费 (RMB)'] || row['固定杂费'] || Object.values(row)[3], 0);

          if (incoterm) {
            incotermRules.push({ incoterm, port, unitFeeRMB: unitFee, fixedFeeRMB: fixedFee });
          }
        }
        continue;
      }

      // 3. 【專用 Sheet 識別】：付款方式與商務條款 (Payment_Terms)
      if (normSheetName.includes('payment') || normSheetName.includes('付款方式') || normSheetName.includes('条款') || normSheetName.includes('條款')) {
        const rows: any[] = xlsxLib.utils.sheet_to_json(sheet, { defval: '' });
        parsedSheets.push(`${sheetName} (付款條款庫)`);
        for (const row of rows) {
          const term = String(row['付款方式 (Payment Term)'] || row['付款方式'] || row['Term'] || Object.values(row)[0] || '').trim();
          const adj = parseSafeNumber(row['价格浮动比例 (%)'] || row['浮动比例'] || Object.values(row)[1], 0);
          if (term) {
            paymentTerms.push({ term, adjustmentPercent: adj });
          }
        }
        continue;
      }

      // 3.5 【專用 Sheet 識別】：全局參數與核算控制台 (Config / Parameters)
      if (normSheetName.includes('config') || normSheetName.includes('全局') || normSheetName.includes('参数') || normSheetName.includes('參數') || normSheetName.includes('老板') || normSheetName.includes('setting')) {
        parsedSheets.push(`${sheetName} (全局參數庫)`);
        for (let r = 0; r < rawMatrix.length; r++) {
          const rowCells = rawMatrix[r] || [];
          for (let c = 0; c < rowCells.length; c++) {
            const label = String(rowCells[c] || '').trim();
            if (!label) continue;
            const nextColVal = (rowCells[c + 1] !== undefined && rowCells[c + 1] !== '') ? rowCells[c + 1] : '';
            const nextRowVal = (rawMatrix[r + 1] && rawMatrix[r + 1][c] !== undefined) ? rawMatrix[r + 1][c] : '';
            const candidateVal = nextColVal !== '' ? nextColVal : nextRowVal;

            // 1. 貨幣與匯率表提取
            if (/^(USD|EUR|GBP|AUD|CAD|JPY|HKD)$/i.test(label) && c === 0) {
              const rate = parseSafeNumber(rowCells[c + 1], 0);
              const symbol = String(rowCells[c + 2] || '').trim();
              const curr = label.toUpperCase();
              if (rate > 0 && !exchangeRates.some(x => x.currency === curr)) {
                exchangeRates.push({ currency: curr, rateToRMB: rate, symbol: symbol || curr });
              }
            } else if (/美元.*汇率|usd.*rate/i.test(label)) {
              const rate = parseSafeNumber(candidateVal, 0);
              if (rate > 0 && !exchangeRates.some(x => x.currency === 'USD')) {
                exchangeRates.push({ currency: 'USD', rateToRMB: rate, symbol: '$' });
              }
            } else if (/欧元.*汇率|eur.*rate/i.test(label)) {
              const rate = parseSafeNumber(candidateVal, 0);
              if (rate > 0 && !exchangeRates.some(x => x.currency === 'EUR')) {
                exchangeRates.push({ currency: 'EUR', rateToRMB: rate, symbol: '€' });
              }
            } else if (/英镑.*汇率|gbp.*rate/i.test(label)) {
              const rate = parseSafeNumber(candidateVal, 0);
              if (rate > 0 && !exchangeRates.some(x => x.currency === 'GBP')) {
                exchangeRates.push({ currency: 'GBP', rateToRMB: rate, symbol: '£' });
              }
            }

            // 2. 基準主幣種
            if (/主.*币种|default.*currency/i.test(label) || /基准.*币种/i.test(String(candidateVal))) {
              const curr = String(candidateVal).trim().toUpperCase();
              if (curr && curr.length === 3) {
                detectedDefaultCurrency = curr;
              } else if (!detectedDefaultCurrency) {
                detectedDefaultCurrency = 'USD';
              }
            }

            // 3. 全廠默認保底毛利率與紅線毛利
            if (/全厂.*毛利|统一.*毛利|默认.*毛利|default.*margin/i.test(label)) {
              let m = parseSafeNumber(candidateVal, -1);
              if (m >= 0) {
                if (m > 1 && m <= 100) m = m / 100;
                detectedDefaultMargin = m;
              }
            }
            if (/最低.*红线|红线.*毛利|floor.*margin/i.test(label)) {
              let fm = parseSafeNumber(candidateVal, -1);
              if (fm >= 0) {
                if (fm > 1 && fm <= 100) fm = fm / 100;
                detectedFloorMargin = fm;
              }
            }
            if (/样品.*倍率|打样.*倍率|sample.*multiplier/i.test(label)) {
              const sm = parseSafeNumber(candidateVal, 0);
              if (sm > 0) detectedSampleMultiplier = sm;
            }

            // 4. 生產交期與有效期
            if (/生产.*交期|默认.*交期|delivery.*time|lead.*time/i.test(label)) {
              const ltStr = String(candidateVal).trim();
              if (ltStr && ltStr.length > 1) {
                detectedLeadTime = ltStr;
              }
            }
            if (/报价.*有效期|validity/i.test(label)) {
              const valStr = String(candidateVal).trim();
              if (valStr && valStr.length > 1) {
                detectedPriceValidity = valStr;
              }
            }

            // 5. 貿易術語與雜費提取
            if (/^(EXW|FOB|CIF|DDP|DAP|CFR)$/i.test(label) && c === 0) {
              const inc = label.toUpperCase();
              const port = String(rowCells[c + 1] || '').trim();
              const unitFee = parseSafeNumber(rowCells[c + 2], 0);
              const fixedFee = parseSafeNumber(rowCells[c + 3], 0);
              if (!incotermRules.some(x => x.incoterm === inc)) {
                incotermRules.push({ incoterm: inc, port, unitFeeRMB: unitFee, fixedFeeRMB: fixedFee });
              }
            }

            // 6. 付款方式與浮動比例提取
            if ((label.includes('T/T') || label.includes('L/C') || label.includes('信用证')) && c === 0) {
              const adjRaw = String(rowCells[c + 1] || '');
              let adj = parseSafeNumber(adjRaw, 0);
              if (adjRaw.includes('%') || (Math.abs(adj) >= 1 && Math.abs(adj) <= 100)) {
                adj = adj / 100;
              }
              if (!paymentTerms.some(x => x.term === label)) {
                paymentTerms.push({ term: label, adjustmentPercent: adj });
              }
            }

            // 7. 集裝箱規格提取
            if (/^(20GP|40GP|40HQ)/i.test(label) && c === 0) {
              const match = label.match(/^(20GP|40GP|40HQ)/i);
              if (match) {
                const type = match[1].toUpperCase();
                const safeCBM = parseSafeNumber(rowCells[c + 1], 0);
                const maxKG = parseSafeNumber(rowCells[c + 3], 0);
                if (!containerSpecs.some(x => x.type === type)) {
                  containerSpecs.push({ type, label, safeCBM, maxKG });
                }
              }
            }
          }
        }
        continue;
      }

      // 4. 【通用 Sheet 智能嗅探】：商品底價庫 or 匯率表
      let bestHeaderIndex = -1;
      let highestScore = 0;
      const scanLimit = Math.min(10, rawMatrix.length);

      for (let i = 0; i < scanLimit; i++) {
        const rowCells = rawMatrix[i];
        if (!rowCells || rowCells.length === 0) continue;
        const score = scoreRowAsHeader(rowCells, rules);
        if (score > highestScore) {
          highestScore = score;
          bestHeaderIndex = i;
        }
      }

      if (bestHeaderIndex === -1 || highestScore < 5) continue;

      // 0.2 【单表极简版·老板全局控制区智能提取】
      if (bestHeaderIndex > 0) {
        for (let r = 0; r < bestHeaderIndex; r++) {
          const rowCells = rawMatrix[r] || [];
          for (let c = 0; c < rowCells.length; c++) {
            const label = String(rowCells[c] || '').trim();
            if (!label) continue;
            const nextRowVal = (rawMatrix[r + 1] && rawMatrix[r + 1][c] !== undefined) ? rawMatrix[r + 1][c] : '';
            const nextColVal = (rowCells[c + 1] !== undefined) ? rowCells[c + 1] : '';
            const candidateVal = nextRowVal !== '' ? nextRowVal : nextColVal;

            if (/美元.*汇率|usd.*rate/i.test(label)) {
              const rate = parseSafeNumber(candidateVal, 0);
              if (rate > 0 && !exchangeRates.some(x => x.currency === 'USD')) {
                exchangeRates.push({ currency: 'USD', rateToRMB: rate, symbol: '$' });
              }
            } else if (/欧元.*汇率|eur.*rate/i.test(label)) {
              const rate = parseSafeNumber(candidateVal, 0);
              if (rate > 0 && !exchangeRates.some(x => x.currency === 'EUR')) {
                exchangeRates.push({ currency: 'EUR', rateToRMB: rate, symbol: '€' });
              }
            } else if (/英镑.*汇率|gbp.*rate/i.test(label)) {
              const rate = parseSafeNumber(candidateVal, 0);
              if (rate > 0 && !exchangeRates.some(x => x.currency === 'GBP')) {
                exchangeRates.push({ currency: 'GBP', rateToRMB: rate, symbol: '£' });
              }
            } else if (/澳元.*汇率|aud.*rate/i.test(label)) {
              const rate = parseSafeNumber(candidateVal, 0);
              if (rate > 0 && !exchangeRates.some(x => x.currency === 'AUD')) {
                exchangeRates.push({ currency: 'AUD', rateToRMB: rate, symbol: 'A$' });
              }
            } else if (/加元.*汇率|cad.*rate/i.test(label)) {
              const rate = parseSafeNumber(candidateVal, 0);
              if (rate > 0 && !exchangeRates.some(x => x.currency === 'CAD')) {
                exchangeRates.push({ currency: 'CAD', rateToRMB: rate, symbol: 'C$' });
              }
            } else if (/日元.*汇率|jpy.*rate/i.test(label)) {
              const rate = parseSafeNumber(candidateVal, 0);
              if (rate > 0 && !exchangeRates.some(x => x.currency === 'JPY')) {
                exchangeRates.push({ currency: 'JPY', rateToRMB: rate, symbol: '¥' });
              }
            } else if (/港币.*汇率|hkd.*rate/i.test(label)) {
              const rate = parseSafeNumber(candidateVal, 0);
              if (rate > 0 && !exchangeRates.some(x => x.currency === 'HKD')) {
                exchangeRates.push({ currency: 'HKD', rateToRMB: rate, symbol: 'HK$' });
              }
            } else if (/([A-Za-z]{3}).*(?:汇率|rate)|(?:汇率|rate).*([A-Za-z]{3})/i.test(label)) {
              const match = label.match(/([A-Za-z]{3}).*(?:汇率|rate)/i) || label.match(/(?:汇率|rate).*([A-Za-z]{3})/i);
              if (match) {
                const detectedCurr = (match[1] || match[2]).toUpperCase();
                const rate = parseSafeNumber(candidateVal, 0);
                if (rate > 0 && detectedCurr !== 'RMB' && !exchangeRates.some(x => x.currency === detectedCurr)) {
                  exchangeRates.push({ currency: detectedCurr, rateToRMB: rate, symbol: detectedCurr });
                }
              }
            } else if (/主.*币种|default.*currency/i.test(label)) {
              const curr = String(candidateVal).trim().toUpperCase();
              if (curr && curr.length === 3) {
                detectedDefaultCurrency = curr;
              }
            } else if (/全厂.*毛利|统一.*毛利|默认.*毛利|default.*margin/i.test(label)) {
              let m = parseSafeNumber(candidateVal, -1);
              if (m >= 0) {
                if (m > 1 && m <= 100) m = m / 100;
                detectedDefaultMargin = m;
              }
            } else if (/交货条款|默认条款|出货条款|incoterm/i.test(label)) {
              const termStr = String(candidateVal).trim();
              if (termStr && termStr.length > 2) {
                detectedDefaultIncoterm = termStr;
              }
            } else if (/付款方式|payment.*term/i.test(label)) {
              const payStr = String(candidateVal).trim();
              if (payStr && payStr.length > 3 && !paymentTerms.some(p => p.term === payStr)) {
                paymentTerms.push({ term: payStr, adjustmentPercent: 0 });
              }
            } else if (/报价.*有效期|validity/i.test(label)) {
              const valStr = String(candidateVal).trim();
              if (valStr && valStr.length > 1) {
                detectedPriceValidity = valStr;
              }
            } else if (/生产.*交期|默认.*交期|delivery.*time|lead.*time/i.test(label)) {
              const ltStr = String(candidateVal).trim();
              if (ltStr && ltStr.length > 1) {
                detectedLeadTime = ltStr;
              }
            } else if (/样品.*政策|样品.*费|sample.*policy/i.test(label)) {
              const spStr = String(candidateVal).trim();
              if (spStr && spStr.length > 1) {
                detectedSamplePolicy = spStr;
              }
            }
          }
        }
      }

      const rawHeaders = rawMatrix[bestHeaderIndex].map(c => String(c).trim()).filter(Boolean);
      detectedHeadersMap[sheetName] = rawHeaders;

      const rawRows: any[] = xlsxLib.utils.sheet_to_json(sheet, {
        range: bestHeaderIndex,
        defval: ''
      });

      if (rawRows.length === 0) continue;

      const headers = Object.keys(rawRows[0]);
      const matched = matchColumns(headers, rules);

      // 判斷是否為匯率表 (若同時包含 SKU 與底價，則必然為主商品底價表，絕不可誤判為匯率表)
      if (matched.targetCurrency && matched.rateToRMB && !(matched.sku && matched.basePrice)) {
        parsedSheets.push(`${sheetName} (匯率表)`);
        for (const row of rawRows) {
          const curr = String(row[matched.targetCurrency] || '').trim().toUpperCase();
          const rate = parseSafeNumber(row[matched.rateToRMB], 0);
          if (curr && rate > 0) {
            if (!exchangeRates.some(r => r.currency === curr)) {
              exchangeRates.push({
                currency: curr,
                rateToRMB: rate,
                symbol: String(row['币种符号 (Symbol)'] || row['Symbol'] || '')
              });
            }
          }
        }
        continue;
      }

      // 判斷是否為商品底價表 (必須包含 SKU 與底價)
      if (matched.sku && matched.basePrice) {
        parsedSheets.push(`${sheetName} (商品底價庫)`);

        for (const row of rawRows) {
          const rawSku = String(row[matched.sku] || '').trim();
          if (!rawSku) continue;

          if (/^(total|subtotal|合計|小計|總計|總計金額|備註|說明)$/i.test(rawSku)) {
            continue;
          }

          const basePrice = parseSafeNumber(row[matched.basePrice], 0);
          if (basePrice <= 0) continue;

          const productName = matched.productName ? String(row[matched.productName] || '').trim() : '';

          // 解析別名庫
          let aliases: string[] = [];
          if (matched.aliases && row[matched.aliases]) {
            aliases = String(row[matched.aliases])
              .split(/[,，;|]/)
              .map(a => a.trim())
              .filter(Boolean);
          }

          // 解析紅線底價
          const floorPrice = matched.floorPrice ? parseSafeNumber(row[matched.floorPrice], 0) : undefined;

          // 解析樣品倍率
          const sampleMultiplier = matched.sampleMultiplier ? parseSafeNumber(row[matched.sampleMultiplier], 1) : undefined;

          const effectiveDefaultMargin = detectedDefaultMargin !== undefined ? detectedDefaultMargin : defaultMargin;
          const rawMarginVal = matched.profitMargin ? row[matched.profitMargin] : undefined;
          const hasExplicitMargin = rawMarginVal !== '' && rawMarginVal !== undefined && rawMarginVal !== null;
          let margin = hasExplicitMargin
            ? parseSafeNumber(rawMarginVal, effectiveDefaultMargin) 
            : effectiveDefaultMargin;
          if (margin > 1 && margin <= 100) margin = margin / 100;

          const fob = matched.fobCost ? parseSafeNumber(row[matched.fobCost], defaultFob) : defaultFob;
          const moq = matched.moq ? parseSafeNumber(row[matched.moq], 1) : 1;
          let tier2Qty = matched.tier2Qty ? parseSafeNumber(row[matched.tier2Qty], 0) : undefined;
          const tier2BasePrice = matched.tier2BasePrice ? parseSafeNumber(row[matched.tier2BasePrice], 0) : undefined;
          if ((!tier2Qty || tier2Qty <= 0) && matched.tier2BasePrice && tier2BasePrice && tier2BasePrice > 0) {
            const headerMatch = matched.tier2BasePrice.match(/(\d{2,})\s*(?:件|pcs|个|套)?/i);
            if (headerMatch) {
              tier2Qty = parseInt(headerMatch[1], 10);
            }
          }

          let tier3Qty = matched.tier3Qty ? parseSafeNumber(row[matched.tier3Qty], 0) : undefined;
          const tier3BasePrice = matched.tier3BasePrice ? parseSafeNumber(row[matched.tier3BasePrice], 0) : undefined;
          if ((!tier3Qty || tier3Qty <= 0) && matched.tier3BasePrice && tier3BasePrice && tier3BasePrice > 0) {
            const headerMatch = matched.tier3BasePrice.match(/(\d{2,})\s*(?:件|pcs|个|套)?/i);
            if (headerMatch) {
              tier3Qty = parseInt(headerMatch[1], 10);
            }
          }

          const pcsPerCtn = matched.pcsPerCtn ? parseSafeNumber(row[matched.pcsPerCtn], 0) : undefined;
          const cbmPerCtn = matched.cbmPerCtn ? parseSafeNumber(row[matched.cbmPerCtn], 0) : undefined;
          const gwPerCtn = matched.grossWeight ? parseSafeNumber(row[matched.grossWeight], 0) : undefined;
          const leadTime = matched.leadTime && row[matched.leadTime] !== '' 
            ? String(row[matched.leadTime]).trim() 
            : detectedLeadTime;
          const hsCode = matched.hsCode ? String(row[matched.hsCode]).trim() : undefined;

          priceItems.push({
            rawSku,
            normalizedSku: normalizeSKU(rawSku),
            aliases,
            productName,
            basePrice,
            floorPrice: floorPrice && floorPrice > 0 ? floorPrice : undefined,
            profitMargin: margin,
            fobCost: fob,
            moq: moq > 0 ? moq : 1,
            sampleMultiplier: sampleMultiplier && sampleMultiplier > 1 ? sampleMultiplier : undefined,
            tier2Qty: tier2Qty && tier2Qty > 0 ? tier2Qty : undefined,
            tier2BasePrice: tier2BasePrice && tier2BasePrice > 0 ? tier2BasePrice : undefined,
            tier3Qty: tier3Qty && tier3Qty > 0 ? tier3Qty : undefined,
            tier3BasePrice: tier3BasePrice && tier3BasePrice > 0 ? tier3BasePrice : undefined,
            pcsPerCtn: pcsPerCtn && pcsPerCtn > 0 ? pcsPerCtn : undefined,
            cbmPerCtn: cbmPerCtn && cbmPerCtn > 0 ? cbmPerCtn : undefined,
            gwPerCtn: gwPerCtn && gwPerCtn > 0 ? gwPerCtn : undefined,
            leadTime,
            hsCode
          });
        }
      }
    }

    if (priceItems.length === 0) {
      const allHeadersFound = Object.values(detectedHeadersMap).flat();
      const reason = allHeadersFound.length === 0
        ? '表格前 10 行未檢測到有效表頭，請確保包含「型號/SKU」與「底價/出廠價」關鍵列。'
        : `未能在表格中識別到「型號/SKU」或「底價/成本」列。檢測到的現有表頭為: [${allHeadersFound.slice(0, 8).join(', ')}]。`;

      return {
        success: false,
        priceItems: [],
        exchangeRates,
        addons: [],
        incotermRules: [],
        paymentTerms: [],
        parsedSheets,
        detectedHeaders: detectedHeadersMap,
        warnings,
        errorReason: reason
      };
    }

    if (detectedDefaultCurrency === 'RMB' && !exchangeRates.some(r => r.currency === 'RMB')) {
      exchangeRates.push({ currency: 'RMB', rateToRMB: 1.0, symbol: '¥' });
    }

    return {
      success: true,
      priceItems,
      exchangeRates,
      addons,
      incotermRules,
      paymentTerms,
      parsedSheets,
      detectedHeaders: detectedHeadersMap,
      warnings,
      defaultProfitMargin: detectedDefaultMargin,
      floorMargin: detectedFloorMargin,
      sampleMultiplier: detectedSampleMultiplier,
      defaultCurrency: detectedDefaultCurrency,
      defaultIncoterm: detectedDefaultIncoterm,
      priceValidity: detectedPriceValidity,
      leadTime: detectedLeadTime,
      samplePolicy: detectedSamplePolicy,
      containerSpecs
    };
  }
}
