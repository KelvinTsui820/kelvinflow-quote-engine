import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { GeminiAIService } from './gemini.service.js';
import { ModelDiscoveryService } from './model-discovery.service.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { scoreRowAsHeader, matchColumns, DEFAULT_COLUMN_RULES } from '../adapters/schema-matcher.js';
import { StandardPriceItem } from '../types/index.js';
import { normalizeSKU, parseSafeNumber } from '../utils/sku-normalizer.js';

export interface NormalizationResult {
  success: boolean;
  itemCount: number;
  outputPath: string;
  detectedHeaders: Record<string, string | null>;
  sampleItems: StandardPriceItem[];
  warnings: string[];
  usedAI: boolean;
  error?: string;
}

export class PricingNormalizerService {
  /**
   * 自动清洗任意客户原始非标 Excel，生成标准 active_pricing.xlsx
   */
  static async normalizeCustomerExcel(
    inputFilePath: string,
    outputFilePath: string,
    options: {
      defaultProfitMargin?: number;
      defaultCurrency?: string;
      fallbackRate?: number;
    } = {}
  ): Promise<NormalizationResult> {
    const defaultMargin = options.defaultProfitMargin ?? 0.3;
    const defaultCurrency = options.defaultCurrency ?? 'USD';
    const fallbackRate = options.fallbackRate ?? 7.2;

    const xlsxLib: any = (XLSX as any).default || XLSX;
    const warnings: string[] = [];

    if (!fs.existsSync(inputFilePath)) {
      return {
        success: false,
        itemCount: 0,
        outputPath: outputFilePath,
        detectedHeaders: {},
        sampleItems: [],
        warnings: ['输入文件不存在'],
        usedAI: false,
        error: `输入文件不存在: ${inputFilePath}`
      };
    }

    const fileBuffer = fs.readFileSync(inputFilePath);
    let workbook: XLSX.WorkBook;
    try {
      workbook = xlsxLib.read(fileBuffer, { type: 'buffer' });
    } catch (e: any) {
      return {
        success: false,
        itemCount: 0,
        outputPath: outputFilePath,
        detectedHeaders: {},
        sampleItems: [],
        warnings: [`Excel 读取失败: ${e.message}`],
        usedAI: false,
        error: e.message
      };
    }

    // 1. 查找最有可能是主价格表的 Sheet
    let targetSheetName = workbook.SheetNames[0];
    for (const name of workbook.SheetNames) {
      const lower = name.toLowerCase();
      if (
        lower.includes('price') || 
        lower.includes('报价') || 
        lower.includes('底价') || 
        lower.includes('catalog') || 
        lower.includes('产品') ||
        lower.includes('sheet1')
      ) {
        targetSheetName = name;
        break;
      }
    }

    const sheet = workbook.Sheets[targetSheetName];
    const rawRows: any[][] = xlsxLib.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return {
        success: false,
        itemCount: 0,
        outputPath: outputFilePath,
        detectedHeaders: {},
        sampleItems: [],
        warnings: ['表格内容为空'],
        usedAI: false,
        error: '选中的 Sheet 没有任何数据行'
      };
    }

    // 2. 探寻表头所在行
    let bestHeaderRowIdx = 0;
    let highestScore = -1;
    const searchLimit = Math.min(rawRows.length, 15);

    for (let r = 0; r < searchLimit; r++) {
      const row = rawRows[r];
      if (Array.isArray(row) && row.length > 0) {
        const score = scoreRowAsHeader(row);
        if (score > highestScore) {
          highestScore = score;
          bestHeaderRowIdx = r;
        }
      }
    }

    const rawHeaderRow = (rawRows[bestHeaderRowIdx] || []).map(c => String(c || '').trim());
    let detectedMapping = matchColumns(rawHeaderRow, DEFAULT_COLUMN_RULES);
    let usedAI = false;

    // 如果未通过规则匹配出必填的 SKU 或 basePrice，且配置了 Gemini，则调用 AI 进行智能表头语义识别
    if ((!detectedMapping.sku || !detectedMapping.basePrice) && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) {
      try {
        const ai = new GeminiAIService();
        const sampleSnippet = rawRows.slice(0, 10).map((row, i) => `Row ${i}: ${JSON.stringify(row)}`).join('\n');
        const prompt = `你是一名资深外贸数据清洗工程师。请分析以下非标准 Excel 样本数据（前 10 行），找出「表头所在行索引」(0-indexed) 以及各关键字段在表头数组中的精确字段名或列名。
需要识别的字段：
- sku (产品型号/Item No/Part No)
- productName (产品品名/Description/Name)
- basePrice (人民币出厂底价/成本/含税出厂价)
- moq (起订量/最小起订量)
- cbmPerCtn (外箱体积CBM/外箱立方数)
- grossWeight (单箱毛重KG)
- pcsPerCtn (装箱数/PCS/CTN)

原始数据样本：
${sampleSnippet}

请仅输出标准的 JSON 格式：
{
  "headerRowIndex": number,
  "mapping": {
    "sku": "表头名称",
    "productName": "表头名称",
    "basePrice": "表头名称",
    "moq": "表头名称",
    "cbmPerCtn": "表头名称",
    "grossWeight": "表头名称",
    "pcsPerCtn": "表头名称"
  }
}`;

        const activeModels = await ModelDiscoveryService.getActiveModels();
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: activeModels.flashModel });
        const res = await model.generateContent(prompt);
        const aiResponse = res.response.text();
        if (aiResponse) {
          // AI 识别结果兜底
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (typeof parsed.headerRowIndex === 'number' && parsed.headerRowIndex < rawRows.length) {
              bestHeaderRowIdx = parsed.headerRowIndex;
            }
            if (parsed.mapping) {
              detectedMapping = { ...detectedMapping, ...parsed.mapping };
              usedAI = true;
            }
          }
        }
      } catch (aiErr: any) {
        warnings.push(`AI 表头推断未启动或失败: ${aiErr.message}`);
      }
    }

    // 3. 构建列索引 Map
    const colIndexMap: Record<string, number> = {};
    const headerCols = (rawRows[bestHeaderRowIdx] || []).map(c => String(c || '').trim());

    for (const [field, matchedName] of Object.entries(detectedMapping)) {
      if (matchedName) {
        const idx = headerCols.findIndex(h => h.toLowerCase() === matchedName.toLowerCase());
        if (idx !== -1) {
          colIndexMap[field] = idx;
        }
      }
    }

    // 再次保底：如果 SKU 或 basePrice 依然未绑定，按前几列默认位置猜测
    if (colIndexMap.sku === undefined) {
      colIndexMap.sku = 0; // 默认第一列为 SKU
      warnings.push(`未找到型号列，默认使用第 1 列作为 SKU`);
    }
    if (colIndexMap.basePrice === undefined) {
      // 遍历寻找包含数字且大于 0 的第一列
      for (let c = 1; c < headerCols.length; c++) {
        const testVal = parseSafeNumber(rawRows[bestHeaderRowIdx + 1]?.[c]);
        if (testVal > 0) {
          colIndexMap.basePrice = c;
          warnings.push(`自动探测将第 ${c + 1} 列 (${headerCols[c]}) 作为出厂底价列`);
          break;
        }
      }
      if (colIndexMap.basePrice === undefined) {
        colIndexMap.basePrice = 2; // 默认保底第 3 列
      }
    }

    // 4. 解析所有数据行
    const priceItems: StandardPriceItem[] = [];
    for (let r = bestHeaderRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const rawSku = String(row[colIndexMap.sku] || '').trim();
      const normSku = normalizeSKU(rawSku);
      if (!normSku || normSku.length < 2) continue;

      // 过滤统计行、合计行
      const lowerSku = rawSku.toLowerCase();
      if (lowerSku.includes('total') || lowerSku.includes('合计') || lowerSku.includes('汇总')) continue;

      const rawPrice = row[colIndexMap.basePrice];
      const basePrice = parseSafeNumber(rawPrice);
      if (basePrice <= 0) continue;

      const productName = colIndexMap.productName !== undefined ? String(row[colIndexMap.productName] || '').trim() : '';
      const moq = colIndexMap.moq !== undefined ? Math.max(1, parseSafeNumber(row[colIndexMap.moq])) : 1;
      const pcsPerCtn = colIndexMap.pcsPerCtn !== undefined ? parseSafeNumber(row[colIndexMap.pcsPerCtn]) : undefined;
      const cbmPerCtn = colIndexMap.cbmPerCtn !== undefined ? parseSafeNumber(row[colIndexMap.cbmPerCtn]) : undefined;
      const grossWeight = colIndexMap.grossWeight !== undefined ? parseSafeNumber(row[colIndexMap.grossWeight]) : undefined;

      priceItems.push({
        rawSku,
        normalizedSku: normSku,
        productName: productName || rawSku,
        basePrice,
        profitMargin: defaultMargin,
        fobCost: 0,
        moq,
        sampleMultiplier: 2.0,
        pcsPerCtn: pcsPerCtn ?? 10,
        cbmPerCtn: cbmPerCtn ?? 0.05,
        gwPerCtn: grossWeight ?? 5
      });
    }

    if (priceItems.length === 0) {
      return {
        success: false,
        itemCount: 0,
        outputPath: outputFilePath,
        detectedHeaders: detectedMapping,
        sampleItems: [],
        warnings,
        usedAI,
        error: '未能从该 Excel 中解析出任何有效商品及价格'
      };
    }

    // 5. 组装并生成标准的 6-Sheet 生产级 active_pricing.xlsx
    const outWb = xlsxLib.utils.book_new();

    // Sheet 1: 出厂底价库
    const sheet1Data = [
      [
        '产品型号 (SKU)',
        '产品品名 (Description)',
        '出厂底价 (RMB)',
        '预期毛利率',
        '目标外币币种',
        '锁定基准汇率',
        '最小起订量 (MOQ)',
        '样品打样倍率',
        '装箱件数 (PCS/CTN)',
        '外箱体积 (CBM)',
        '单箱毛重 (KG)',
        '买家别名代号 (Aliases)'
      ],
      ...priceItems.map(item => [
        item.rawSku,
        item.productName,
        item.basePrice,
        item.profitMargin,
        defaultCurrency,
        fallbackRate,
        item.moq,
        item.sampleMultiplier ?? 2.0,
        item.pcsPerCtn ?? 10,
        item.cbmPerCtn ?? 0.05,
        item.gwPerCtn ?? 5,
        item.aliases?.join(', ') || ''
      ])
    ];
    const ws1 = xlsxLib.utils.aoa_to_sheet(sheet1Data);
    xlsxLib.utils.book_append_sheet(outWb, ws1, '出厂底价库');

    // Sheet 2: 汇率基准表
    const sheet2Data = [
      ['币种 (Currency)', '对人民币基准汇率 (RateToRMB)', '更新时间'],
      ['USD', 7.20, '2026-09-01'],
      ['EUR', 7.85, '2026-09-01'],
      ['GBP', 9.15, '2026-09-01'],
      ['AUD', 4.75, '2026-09-01']
    ];
    const ws2 = xlsxLib.utils.aoa_to_sheet(sheet2Data);
    xlsxLib.utils.book_append_sheet(outWb, ws2, '汇率基准表');

    // Sheet 3: 可选工件与工艺加价
    const sheet3Data = [
      ['工艺或配件名称 (Addon Name)', '加价金额 (RMB/件)', '触发关键字 (Keywords)', '适用型号范围'],
      ['定制彩色包装盒 (Color Box)', 2.5, 'COLOR BOX,彩盒,定制包装', 'ALL'],
      ['重型防摔托盘 (Heavy Pallet)', 120.0, 'PALLET,托盘,木托', 'ALL'],
      ['UL/CE 认证专属镭雕', 1.0, 'UL,CE,LOGO,LASER,镭雕', 'ALL']
    ];
    const ws3 = xlsxLib.utils.aoa_to_sheet(sheet3Data);
    xlsxLib.utils.book_append_sheet(outWb, ws3, '可选工件与工艺加价');

    // Sheet 4: 贸易术语规则
    const sheet4Data = [
      ['贸易术语 (Incoterm)', '加价方式 (Type)', '费率或单价 (Value)', '默认港口或说明'],
      ['EXW', 'FixedPerItem', 0, 'Ex-Works Factory'],
      ['FOB Shenzhen', 'FixedPerItem', 1.2, 'Shenzhen Yantian/Shekou Port'],
      ['FOB Ningbo', 'FixedPerItem', 1.5, 'Ningbo Zhoushan Port'],
      ['CIF', 'Percentage', 0.05, 'Destination Port (Include Insurance & Freight)']
    ];
    const ws4 = xlsxLib.utils.aoa_to_sheet(sheet4Data);
    xlsxLib.utils.book_append_sheet(outWb, ws4, '贸易术语规则');

    // Sheet 5: 付款条款规则
    const sheet5Data = [
      ['付款方式代码 (Term)', '描述 (Description)', '额外附加风险贴水 (Risk Premium)'],
      ['TT_30_70', '30% T/T Deposit, 70% Balance before shipment', 0],
      ['LC_AT_SIGHT', '100% Irrevocable L/C at sight', 0.02],
      ['OA_60_DAYS', 'Open Account 60 Days', 0.06]
    ];
    const ws5 = xlsxLib.utils.aoa_to_sheet(sheet5Data);
    xlsxLib.utils.book_append_sheet(outWb, ws5, '付款条款规则');

    // 确保输出目录存在
    const outDir = path.dirname(outputFilePath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const outBuffer = xlsxLib.write(outWb, { type: 'buffer', bookType: 'xlsx' });
    fs.writeFileSync(outputFilePath, outBuffer);

    return {
      success: true,
      itemCount: priceItems.length,
      outputPath: outputFilePath,
      detectedHeaders: detectedMapping,
      sampleItems: priceItems.slice(0, 3),
      warnings,
      usedAI
    };
  }
}
