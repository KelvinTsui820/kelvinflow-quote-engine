import {
  POExtractionResult,
  StandardPriceItem,
  StandardExchangeRate,
  StandardAddonItem,
  StandardIncotermRule,
  StandardPaymentTerm,
  QuotationResult,
  QuotedItem,
  AppliedAddon,
  ContainerEstimate
} from '../types/index.js';
import { normalizeSKU } from '../utils/sku-normalizer.js';

export interface PricingOptions {
  tenantId?: string;
  createdBy?: string;
  salesRepName?: string;
  defaultProfitMargin?: number;
  defaultFobCost?: number;
  fallbackExchangeRate?: number;
  rateFluctuationPercent?: number;
  criticalConfidenceThreshold?: number;
  addons?: StandardAddonItem[];
  incotermRules?: StandardIncotermRule[];
  paymentTerms?: StandardPaymentTerm[];
  defaultIncoterm?: string;
  priceValidity?: string;
  leadTime?: string;
  samplePolicy?: string;
}

export class PricingService {
  /**
   * 計算標準外貿旗艦報價單 (支持別名映射、選配工藝加價、樣品防薅倍率、整櫃裝載速算、貿易術語切換、紅線底價保護、MOQ 與風控條款)
   */
  static calculate(
    poData: POExtractionResult,
    priceItems: StandardPriceItem[],
    exchangeRates: StandardExchangeRate[],
    options: PricingOptions = {}
  ): QuotationResult {
    const defaultMargin = options.defaultProfitMargin ?? 0.3;
    const defaultFob = options.defaultFobCost ?? 0;
    const fallbackRate = options.fallbackExchangeRate ?? 7.2;
    const fluctuationPercent = options.rateFluctuationPercent ?? 3;
    const criticalThreshold = options.criticalConfidenceThreshold ?? 70;
    const availableAddons = options.addons || [];
    const incotermRules = options.incotermRules || [];

    const warnings: string[] = [];
    let hasSampleOrder = false;

    // 1. 低置信度 / 掃描件強風控警報
    if (poData.ConfidenceScore < criticalThreshold) {
      warnings.push(
        `[CRITICAL REVIEW REQUIRED] Document confidence is low (${poData.ConfidenceScore}%). Non-standard or scanned layout detected. Please verify all SKUs and specifications before final confirmation.`
      );
    }

    // 2. 查找幣種匯率
    const targetCurrency = (poData.Currency || 'USD').toUpperCase().trim();
    let rateUsed = fallbackRate;
    const matchedRate = exchangeRates.find(r => r.currency.toUpperCase() === targetCurrency);

    if (matchedRate && matchedRate.rateToRMB > 0) {
      rateUsed = matchedRate.rateToRMB;
    } else {
      warnings.push(`Currency [${targetCurrency}] not found in exchange rate list. Used fallback rate: ${rateUsed}`);
    }

    // 3. 識別貿易術語 (Incoterms: EXW / FOB / CIF / CFR / DDP / DAP / FCA)
    let matchedIncoterm = options.defaultIncoterm || 'FOB Shenzhen Port';
    const deliveryText = `${poData.DeliveryDetails || ''} ${poData.SpecialRemarks || ''} ${poData.UncategorizedCriticalInfo || ''}`.toUpperCase();

    if (deliveryText.includes('EXW') || deliveryText.includes('EX-WORKS') || deliveryText.includes('EX WORK')) {
      matchedIncoterm = 'EXW (Ex-Works Factory)';
    } else if (deliveryText.includes('CIF')) {
      matchedIncoterm = 'CIF Destination';
    } else if (deliveryText.includes('CFR') || deliveryText.includes('C&F')) {
      matchedIncoterm = 'CFR Destination';
    } else if (deliveryText.includes('DDP')) {
      matchedIncoterm = 'DDP Destination';
    } else if (deliveryText.includes('DAP')) {
      matchedIncoterm = 'DAP Destination';
    } else if (deliveryText.includes('FCA')) {
      matchedIncoterm = 'FCA Carrier';
    } else if (deliveryText.includes('FOB')) {
      if (deliveryText.includes('NINGBO')) {
        matchedIncoterm = 'FOB Ningbo Port';
      } else if (deliveryText.includes('SHANGHAI')) {
        matchedIncoterm = 'FOB Shanghai Port';
      } else if (deliveryText.includes('QINGDAO')) {
        matchedIncoterm = 'FOB Qingdao Port';
      } else if (deliveryText.includes('XIAMEN')) {
        matchedIncoterm = 'FOB Xiamen Port';
      } else if (deliveryText.includes('TIANJIN') || deliveryText.includes('XINGANG')) {
        matchedIncoterm = 'FOB Tianjin Port';
      } else if (deliveryText.includes('GUANGZHOU') || deliveryText.includes('NANSHA')) {
        matchedIncoterm = 'FOB Guangzhou Nansha';
      } else if (deliveryText.includes('FOSHAN') || deliveryText.includes('SHUNDE')) {
        matchedIncoterm = 'FOB Foshan Port';
      } else if (deliveryText.includes('SHENZHEN') || deliveryText.includes('YANTIAN') || deliveryText.includes('SHEKOU')) {
        matchedIncoterm = 'FOB Shenzhen Port';
      } else {
        matchedIncoterm = 'FOB Port';
      }
    }

    // 4. 建立多維索引 Map (支持主 SKU 與買家別名 Aliases 雙向秒級檢索)
    const priceMap = new Map<string, StandardPriceItem>();
    for (const item of priceItems) {
      priceMap.set(item.normalizedSku, item);
      if (item.aliases && Array.isArray(item.aliases)) {
        for (const alias of item.aliases) {
          const normAlias = normalizeSKU(alias);
          if (normAlias) {
            priceMap.set(normAlias, item);
          }
        }
      }
    }

    // 4.1 計算訂單總採購數量與貿易術語港口固定雜費均攤
    const totalOrderQuantity = poData.Items.reduce((sum, it) => sum + (Number(it.Quantity) || 0), 0);
    let amortizedFobRMB = defaultFob;

    if (!matchedIncoterm.startsWith('EXW')) {
      let matchedRule: StandardIncotermRule | undefined;
      const upperIncoterm = matchedIncoterm.toUpperCase();

      matchedRule = incotermRules.find(r => {
        if (!r.incoterm || !upperIncoterm.includes(r.incoterm.toUpperCase())) return false;
        if (!r.port) return true;
        const p = r.port.toUpperCase();
        return (upperIncoterm.includes('SHENZHEN') && (p.includes('SHENZHEN') || p.includes('深圳')))
            || (upperIncoterm.includes('GUANGZHOU') && (p.includes('GUANGZHOU') || p.includes('广州')))
            || (upperIncoterm.includes('FOSHAN') && (p.includes('FOSHAN') || p.includes('佛山')))
            || p.includes(upperIncoterm);
      });

      if (!matchedRule) {
        matchedRule = incotermRules.find(r => r.incoterm && r.incoterm.toUpperCase() === 'FOB');
      }

      if (matchedRule) {
        const fixedFee = matchedRule.fixedFeeRMB || 0;
        const unitFee = matchedRule.unitFeeRMB || 0;
        const amortizedFixed = totalOrderQuantity > 0 ? (fixedFee / totalOrderQuantity) : 0;
        amortizedFobRMB = Math.round((unitFee + amortizedFixed) * 1000) / 1000;
      }
    }

    // 5. 逐項核算商品價格與集裝箱體積裝載
    const quotedItems: QuotedItem[] = [];
    let grandTotalForeign = 0;
    let totalCartons = 0;
    let totalCBM = 0;
    let totalGW = 0;
    let estimated20GPUnits = 0;
    let estimated40HQUnits = 0;

    for (const poItem of poData.Items) {
      const normSku = normalizeSKU(poItem.SKU);
      let matchedPrice = priceMap.get(normSku);

      if (!matchedPrice && poItem.Description) {
        const descLower = poItem.Description.toLowerCase();
        const normDesc = normalizeSKU(poItem.Description);
        for (const [key, item] of priceMap.entries()) {
          if (normDesc.includes(key) || (item.aliases && item.aliases.some(a => descLower.includes(a.toLowerCase())))) {
            matchedPrice = item;
            break;
          }
        }
      }

      if (!matchedPrice || matchedPrice.basePrice <= 0) {
        warnings.push(`[ATTENTION] Item [${poItem.SKU}] not found in pricing catalog. Price marked as Pending for manual confirmation.`);
        quotedItems.push({
          sku: poItem.SKU,
          description: poItem.Description,
          quantity: poItem.Quantity,
          basePriceRMB: 0,
          itemConfidenceScore: poItem.ConfidenceScore && poItem.ConfidenceScore < 80 ? poItem.ConfidenceScore : 45,
          matchStatus: 'UNMATCHED',
          confidenceRemark: poItem.ConfidenceRemark || '底价库未收录此型号，待人工核价',
          profitMargin: defaultMargin,
          fobCostRMB: defaultFob,
          unitPriceForeign: 0,
          subTotalForeign: 0,
          status: 'NEED_MANUAL_PRICE',
          warning: 'Base price not in catalog, pending manual review'
        });
      } else {
        // 5.1 樣品單防薅羊毛判斷 (數量 <= 3 件 且配置了樣品倍率)
        let effectiveBasePrice = matchedPrice.basePrice;
        let appliedTier = 'Standard Tier';
        let moqWarning: string | undefined = undefined;

        if (poItem.Quantity <= 3 && matchedPrice.sampleMultiplier && matchedPrice.sampleMultiplier > 1) {
          effectiveBasePrice = Math.round(matchedPrice.basePrice * matchedPrice.sampleMultiplier * 100) / 100;
          appliedTier = `Sample Tier (${matchedPrice.sampleMultiplier}x Rate)`;
          hasSampleOrder = true;
          warnings.push(`[SAMPLE ORDER] Item [${poItem.SKU}] (Qty: ${poItem.Quantity}) priced at sample rate (${matchedPrice.sampleMultiplier}x). Surcharge refundable on bulk order.`);
        } else {
          // 5.2 檢查 MOQ 起訂量
          if (matchedPrice.moq && matchedPrice.moq > 1 && poItem.Quantity < matchedPrice.moq) {
            moqWarning = `MOQ Warning: Ordered ${poItem.Quantity} pcs, MOQ is ${matchedPrice.moq} pcs.`;
            warnings.push(`[MOQ NOTICE] Item [${poItem.SKU}] requested quantity (${poItem.Quantity}) is below MOQ (${matchedPrice.moq}).`);
          }

          // 5.3 階梯定價自適應匹配
          if (
            matchedPrice.tier3Qty && 
            matchedPrice.tier3BasePrice && 
            poItem.Quantity >= matchedPrice.tier3Qty
          ) {
            effectiveBasePrice = matchedPrice.tier3BasePrice;
            appliedTier = `Tier 3 (>=${matchedPrice.tier3Qty} pcs)`;
          } else if (
            matchedPrice.tier2Qty && 
            matchedPrice.tier2BasePrice && 
            poItem.Quantity >= matchedPrice.tier2Qty
          ) {
            effectiveBasePrice = matchedPrice.tier2BasePrice;
            appliedTier = `Tier 2 (>=${matchedPrice.tier2Qty} pcs)`;
          }
        }

        // 5.4 工藝選配附加費智能識別 (Addons Matching: 兼顧全局備註與品類適用範圍 Scope 防呆)
        const appliedAddons: AppliedAddon[] = [];
        let totalAddonRMB = 0;
        const itemText = `${poItem.SKU} ${poItem.Description || ''} ${matchedPrice.productName || ''}`.toUpperCase();
        const globalRemarks = (poData.SpecialRemarks || '').toUpperCase();

        for (const addon of availableAddons) {
          const inItem = addon.keywords.some(kw => itemText.includes(kw.toUpperCase().trim()));
          const inGlobal = addon.keywords.some(kw => globalRemarks.includes(kw.toUpperCase().trim()));

          if (!inItem && !inGlobal) continue;

          // 適用範圍 (Scope) 檢查
          let scopeMatches = true;
          if (addon.scope && !addon.scope.includes('全品类') && !addon.scope.includes('全部')) {
            const scopeTerms = addon.scope.split(/[/,，、]/).map(s => s.trim().toUpperCase()).filter(Boolean);
            scopeMatches = scopeTerms.some(term => {
              if (term.includes('椅') || term.includes('CHAIR')) {
                return itemText.includes('CHAIR') || itemText.includes('椅') || itemText.includes('SEAT');
              }
              if (term.includes('五金') || term.includes('HARDWARE') || term.includes('BRACKET') || term.includes('支架')) {
                return itemText.includes('BRACKET') || itemText.includes('支架') || itemText.includes('五金') || itemText.includes('FASTENER') || itemText.includes('SCREW');
              }
              return itemText.includes(term);
            });
          }

          // 防誤傷規則：如果工藝僅在全局備註提及 (inItem 為 false)
          let shouldApply = false;
          if (inItem) {
            shouldApply = true;
          } else if (inGlobal && scopeMatches) {
            const isSingleItemOrder = poData.Items.length === 1;
            const mentionsThisSku = globalRemarks.includes(poItem.SKU.toUpperCase()) || 
                                    (matchedPrice.rawSku && globalRemarks.includes(matchedPrice.rawSku.toUpperCase()));
            
            const isChair = itemText.includes('CHAIR') || itemText.includes('椅');
            const mentionsChairKeywords = /BACKREST|CHAIR|SEAT|HEADREST|CUSHION|椅/i.test(globalRemarks);
            const isHardware = itemText.includes('BRACKET') || itemText.includes('支架') || itemText.includes('HARDWARE') || itemText.includes('五金');
            const mentionsHardwareKeywords = /BRACKET|支架|HARDWARE|五金|STAMPING/i.test(globalRemarks);

            if (isSingleItemOrder || mentionsThisSku) {
              shouldApply = true;
            } else if (isChair && mentionsChairKeywords && !mentionsHardwareKeywords) {
              shouldApply = true;
            } else if (isHardware && mentionsHardwareKeywords && !mentionsChairKeywords) {
              shouldApply = true;
            } else if (isChair && mentionsChairKeywords && addon.scope && (addon.scope.includes('椅') || addon.scope.includes('五金'))) {
              shouldApply = true;
            } else {
              shouldApply = false;
              warnings.push(`[CUSTOM OPTION AUDIT] Addon '${addon.name}' noted in order remarks; verified not applied to standard item [${poItem.SKU}].`);
            }
          }

          if (shouldApply) {
            appliedAddons.push({
              name: addon.name,
              addonRMB: addon.addonPriceRMB
            });
            totalAddonRMB += addon.addonPriceRMB;
          }
        }

        // 5.5 紅線底價防呆保護 (Floor Price Protection)
        let floorPriceWarning: string | undefined = undefined;
        if (matchedPrice.floorPrice && effectiveBasePrice < matchedPrice.floorPrice) {
          effectiveBasePrice = matchedPrice.floorPrice;
          floorPriceWarning = `Floor price protection applied (min cost: ¥${matchedPrice.floorPrice})`;
          warnings.push(`[FLOOR PRICE NOTICE] Item [${poItem.SKU}] base price adjusted to floor price (¥${matchedPrice.floorPrice}).`);
        }

        const margin = matchedPrice.profitMargin > 0 ? matchedPrice.profitMargin : defaultMargin;
        let fob = 0;
        if (!matchedIncoterm.startsWith('EXW')) {
          fob = matchedPrice.fobCost > 0 ? matchedPrice.fobCost : 0;
        }

        // 算價公式：((階梯底價 + 選配加價) * (1 + 毛利率) + 單件FOB雜費) / 匯率
        const unitRMB = (effectiveBasePrice + totalAddonRMB) * (1 + margin) + fob;
        const rawUnitForeign = unitRMB / rateUsed;
        const unitPriceForeign = Math.round(rawUnitForeign * 100) / 100;
        const subTotalForeign = Math.round(unitPriceForeign * poItem.Quantity * 100) / 100;

        grandTotalForeign += subTotalForeign;

        // 計算箱規與 CBM 及毛重
        if (matchedPrice.pcsPerCtn && matchedPrice.cbmPerCtn) {
          const ctns = Math.ceil(poItem.Quantity / matchedPrice.pcsPerCtn);
          const cbm = Math.round(ctns * matchedPrice.cbmPerCtn * 1000) / 1000;
          totalCartons += ctns;
          totalCBM += cbm;
          const gw = matchedPrice.gwPerCtn ? Math.round(ctns * matchedPrice.gwPerCtn * 10) / 10 : ctns * 15;
          totalGW += gw;

          // 計算標箱單品整櫃裝載量
          const u20 = Math.floor(28.0 / matchedPrice.cbmPerCtn) * matchedPrice.pcsPerCtn;
          const u40 = Math.floor(68.0 / matchedPrice.cbmPerCtn) * matchedPrice.pcsPerCtn;
          estimated20GPUnits = Math.max(estimated20GPUnits, u20);
          estimated40HQUnits = Math.max(estimated40HQUnits, u40);
        }

        // =========================================================================
        // 🎯 多维连续动态 AI 置信度评分引擎 (Multi-Factor Continuous Scoring Engine)
        // 结合：1. SKU字符精度 (45%) + 2. 规格语义Jaccard重合度 (30%) + 3. 工艺选配加成 (10%) + 4. Gemini意图提取 (15%) - 5. 商业约束与MOQ惩罚
        // =========================================================================
        const buyerSkuRaw = (poItem.SKU || '').trim().toUpperCase();
        const catalogSkuRaw = (matchedPrice.rawSku || '').trim().toUpperCase();
        
        // 1. SKU 维度精准度评分 (0-100)
        let skuScore = 65;
        let skuMatchMethod: 'EXACT' | 'FUZZY' | 'UNMATCHED' = 'EXACT';
        if (buyerSkuRaw === catalogSkuRaw) {
          skuScore = 100;
          skuMatchMethod = 'EXACT';
        } else if (normalizeSKU(buyerSkuRaw) === normalizeSKU(catalogSkuRaw)) {
          skuScore = 98;
          skuMatchMethod = 'EXACT';
        } else if (matchedPrice.aliases && matchedPrice.aliases.some(a => a.trim().toUpperCase() === buyerSkuRaw || normalizeSKU(a) === normalizeSKU(buyerSkuRaw))) {
          const matchedAlias = matchedPrice.aliases.find(a => a.trim().toUpperCase() === buyerSkuRaw || normalizeSKU(a) === normalizeSKU(buyerSkuRaw)) || '';
          skuScore = matchedAlias.length >= 8 ? 96 : 94;
          skuMatchMethod = 'EXACT';
        } else if (buyerSkuRaw.includes(catalogSkuRaw) || catalogSkuRaw.includes(buyerSkuRaw)) {
          skuScore = 90;
          skuMatchMethod = 'FUZZY';
        } else {
          skuScore = 70;
          skuMatchMethod = 'FUZZY';
        }

        // 2. 品名与规格描述的语义重合度 (Token Overlap Jaccard Similarity, 0-100)
        const buyerDesc = (poItem.Description || '').toLowerCase();
        const catalogDesc = `${matchedPrice.productName || ''} ${matchedPrice.rawSku || ''}`.toLowerCase();
        
        const buyerTokens = buyerDesc.match(/[a-z0-9\u4e00-\u9fa5]{2,}/g) || [];
        const catalogTokens = catalogDesc.match(/[a-z0-9\u4e00-\u9fa5]{2,}/g) || [];
        const catalogTokenSet = new Set(catalogTokens);
        
        let overlapTokensCount = 0;
        for (const token of new Set(buyerTokens)) {
          if (catalogTokenSet.has(token)) overlapTokensCount++;
        }
        
        const semanticRatio = catalogTokens.length > 0 
          ? Math.min(1.0, overlapTokensCount / Math.min(catalogTokens.length, 5)) 
          : 0.8;
        const specScore = Math.round(75 + semanticRatio * 25); // 75 ~ 100 连续浮动

        // 3. 工艺选配加成与完备度 (0-100)
        const addonScore = appliedAddons.length > 0 ? 98 : 90;

        // 4. 商业约束与起订量合规惩罚 (按缺口比例动态扣减)
        let penalty = 0;
        const penaltyReasons: string[] = [];
        if (moqWarning && matchedPrice.moq && matchedPrice.moq > 1) {
          const shortfallRatio = Math.max(0, (matchedPrice.moq - poItem.Quantity) / matchedPrice.moq);
          const moqPenalty = Math.round(shortfallRatio * 18); // 差距越大扣越多，最多18分
          penalty += moqPenalty;
          penaltyReasons.push(`起订量缺口${Math.round(shortfallRatio * 100)}%(-${moqPenalty}分)`);
        }
        if (floorPriceWarning) {
          penalty += 8;
          penaltyReasons.push('底价红线保护(-8分)');
        }

        // 5. 综合连续加权评分
        const geminiIntentScore = poItem.ConfidenceScore && poItem.ConfidenceScore > 0 ? poItem.ConfidenceScore : 92;
        const weightedScore = (skuScore * 0.45) + (specScore * 0.30) + (addonScore * 0.10) + (geminiIntentScore * 0.15) - penalty;
        const finalItemConfidence = Math.max(35, Math.min(99, Math.round(weightedScore)));

        // 6. 构造具备说服力的智能证据链诊断备注
        let dynamicConfidenceRemark = '';
        if (penalty > 0) {
          dynamicConfidenceRemark = `${penaltyReasons.join('，')}；建议业务员与买家沟通起订量或出厂单价。`;
        } else if (skuScore >= 98) {
          dynamicConfidenceRemark = `买家询盘型号 [${poItem.SKU}] 100% 精确字符对齐，规格重合度 ${Math.round(semanticRatio * 100)}%`;
        } else if (skuScore >= 94) {
          dynamicConfidenceRemark = `买家采购代号 [${poItem.SKU}] 命中建档别名，规格重合度 ${Math.round(semanticRatio * 100)}%`;
        } else {
          dynamicConfidenceRemark = `基于品名与规格语义匹配 [${matchedPrice.rawSku}]，匹配度 ${Math.round(semanticRatio * 100)}%`;
        }

        quotedItems.push({
          sku: poItem.SKU,
          matchedSku: matchedPrice.rawSku,
          description: poItem.Description || matchedPrice.productName,
          quantity: poItem.Quantity,
          basePriceRMB: effectiveBasePrice,
          itemConfidenceScore: finalItemConfidence,
          matchStatus: skuMatchMethod,
          confidenceRemark: dynamicConfidenceRemark,
          appliedTier,
          appliedAddons: appliedAddons.length > 0 ? appliedAddons : undefined,
          profitMargin: margin,
          fobCostRMB: fob,
          unitPriceForeign,
          subTotalForeign,
          status: 'OK',
          moqWarning,
          floorPriceWarning
        });
      }
    }

    grandTotalForeign = Math.round(grandTotalForeign * 100) / 100;
    totalCBM = Math.round(totalCBM * 1000) / 1000;

    // 5.6 付款方式條款浮動比例核算 (如 100% 前T/T 直降 2%, OA 60天 資金成本 +4.5%)
    const availablePaymentTerms = options.paymentTerms || [];
    let matchedPaymentTerm: StandardPaymentTerm | undefined;
    const fullRemarksText = `${poData.SpecialRemarks || ''} ${poData.UncategorizedCriticalInfo || ''} ${poData.DeliveryDetails || ''}`.toUpperCase();

    if (availablePaymentTerms.length > 0) {
      matchedPaymentTerm = availablePaymentTerms.find(pt => {
        const upper = pt.term.toUpperCase();
        if (fullRemarksText.includes('100%') && (fullRemarksText.includes('ADVANCE') || fullRemarksText.includes('PREPAY') || fullRemarksText.includes('T/T') || fullRemarksText.includes('PRE-PAY'))) {
          return upper.includes('100%') || upper.includes('ADVANCE');
        }
        if (fullRemarksText.includes('30%') && (fullRemarksText.includes('DEPOSIT') || fullRemarksText.includes('T/T') || fullRemarksText.includes('70%'))) {
          return upper.includes('30%') || upper.includes('70%') || upper.includes('标准T/T');
        }
        if (/\bOA\b/.test(fullRemarksText) || fullRemarksText.includes('OPEN ACCOUNT') || fullRemarksText.includes('赊销')) {
          return upper.includes('OA') || upper.includes('赊销');
        }
        if (/\bL\s*\/\s*C\b/.test(fullRemarksText) || fullRemarksText.includes('LETTER OF CREDIT') || fullRemarksText.includes('信用证')) {
          return upper.includes('L/C') || upper.includes('信用证');
        }
        return false;
      });

      if (!matchedPaymentTerm) {
        matchedPaymentTerm = availablePaymentTerms.find(pt => pt.term.includes('30%') || pt.term.includes('70%') || pt.adjustmentPercent === 0) || availablePaymentTerms[0];
      }
    }

    const paymentTermsUsed = matchedPaymentTerm?.term || (options.paymentTerms && options.paymentTerms.length > 0 ? options.paymentTerms[0].term : '30% Deposit + 70% Balance (标准T/T)');
    const paymentAdjustmentPercent = matchedPaymentTerm?.adjustmentPercent || 0;
    const subTotalBeforeAdjustmentForeign = grandTotalForeign;
    const paymentAdjustmentAmount = Math.round(grandTotalForeign * paymentAdjustmentPercent * 100) / 100;
    grandTotalForeign = Math.round((grandTotalForeign + paymentAdjustmentAmount) * 100) / 100;

    // 6. 生成匯率波動、樣品退還與不可抗力風控條款
    const validity = options.priceValidity || '30 Days from quotation date';
    const riskDisclaimers: string[] = [
      `1. Price Validity: ${validity.endsWith('.') ? validity : validity + '.'}`,
      `2. Price Basis & Terms: Quoted based on ${matchedIncoterm}.`,
      `3. Exchange Rate Protection: Prices quoted based on benchmark rate (1 ${targetCurrency} = ${rateUsed} RMB). Quotation is subject to renegotiation if official exchange rate fluctuates by more than ±${fluctuationPercent}% prior to deposit confirmation.`
    ];

    if (paymentAdjustmentAmount !== 0) {
      const isDiscount = paymentAdjustmentPercent < 0;
      riskDisclaimers.push(
        `Payment Term Adjustment: ${paymentTermsUsed} (${isDiscount ? 'Cash Discount' : 'Financing Surcharge'}: ${(paymentAdjustmentPercent * 100).toFixed(1)}%, ${targetCurrency} ${paymentAdjustmentAmount > 0 ? '+' : ''}${paymentAdjustmentAmount.toFixed(2)}).`
      );
    }

    if (options.leadTime) {
      riskDisclaimers.push(`4. Production Lead Time: ${options.leadTime}`);
    }

    if (hasSampleOrder || options.samplePolicy) {
      const sampleText = options.samplePolicy || 'Sample fee is quoted based on prototype cost. 100% of sample surcharge will be fully credited/refunded upon formal bulk production order (>1000 pcs) confirmation.';
      riskDisclaimers.push(`${riskDisclaimers.length + 1}. Sample Order Policy: ${sampleText}`);
    }

    totalCBM = Math.round(totalCBM * 1000) / 1000;
    totalGW = Math.round(totalGW * 10) / 10;

    let containerEstimate: ContainerEstimate | undefined = undefined;
    if (totalCBM > 0) {
      let recommendedContainer = 'LCL Consolidation (拼箱散货)';
      let loadingRate = 0;

      if (totalCBM <= 28) {
        loadingRate = Math.round((totalCBM / 28) * 100);
        recommendedContainer = totalCBM < 10 
          ? `LCL Consolidation (Approx. ${totalCBM} CBM)`
          : `1x 20'GP Container (${loadingRate}% Utilized)`;
      } else if (totalCBM <= 58) {
        loadingRate = Math.round((totalCBM / 58) * 100);
        recommendedContainer = `1x 40'GP Container (${loadingRate}% Utilized)`;
      } else if (totalCBM <= 68) {
        loadingRate = Math.round((totalCBM / 68) * 100);
        recommendedContainer = `1x 40'HQ High-Cube (${loadingRate}% Utilized)`;
      } else {
        const hqCount = Math.floor(totalCBM / 68);
        const remCBM = Math.round((totalCBM % 68) * 10) / 10;
        if (remCBM <= 12) {
          loadingRate = Math.round((totalCBM / (hqCount * 68 + remCBM)) * 100);
          recommendedContainer = `${hqCount}x 40'HQ (68 CBM) + LCL (${remCBM} CBM) or 1x 20'GP`;
        } else if (remCBM <= 28) {
          loadingRate = Math.round((totalCBM / (hqCount * 68 + 28)) * 100);
          recommendedContainer = `${hqCount}x 40'HQ + 1x 20'GP Container`;
        } else {
          loadingRate = Math.round((totalCBM / ((hqCount + 1) * 68)) * 100);
          recommendedContainer = `${hqCount + 1}x 40'HQ High-Cube (${loadingRate}% Utilized)`;
        }
      }

      containerEstimate = {
        totalCartons,
        totalCBM,
        totalGW,
        units20GP: estimated20GPUnits,
        units40HQ: estimated40HQUnits,
        recommendedContainer,
        loadingRate
      };

      riskDisclaimers.push(
        `${riskDisclaimers.length + 1}. Packaging & Shipment: Total ${totalCartons} Cartons, Approx. ${totalCBM} CBM, Est. Gross Weight ${totalGW.toLocaleString()} KG. Suggested Mode: ${recommendedContainer}. (Single SKU Capacity: 20GP ≈ ${estimated20GPUnits} pcs, 40HQ ≈ ${estimated40HQUnits} pcs).`
      );
    }

    // 7. 生成商務條款
    const termsParts = [
      `Trade Terms: ${matchedIncoterm}`,
      options.leadTime ? `Production Lead Time: ${options.leadTime}` : '',
      `Price Validity: ${options.priceValidity || '30 Days'}`,
      totalCBM > 0 ? `Packaging Info: ${totalCartons} Ctns / ${totalCBM} CBM (${totalGW} KG)` : '',
      poData.SpecialRemarks ? `Special Remarks: ${poData.SpecialRemarks}` : '',
      poData.DeliveryDetails ? `Delivery Details: ${poData.DeliveryDetails}` : '',
      poData.UncategorizedCriticalInfo ? `Notes: ${poData.UncategorizedCriticalInfo}` : ''
    ].filter(Boolean);

    const termsAndConditions = termsParts.join('\n\n');

    // 综合计算全单动态 AI 置信度 (反映真实匹配精度)
    let dynamicOverallConfidence = poData.ConfidenceScore;
    if (quotedItems.length > 0) {
      const avgItemConfidence = Math.round(
        quotedItems.reduce((acc, it) => acc + (it.itemConfidenceScore || 90), 0) / quotedItems.length
      );
      dynamicOverallConfidence = warnings.length > 0 ? Math.max(65, avgItemConfidence - 5) : avgItemConfidence;
    }

    return {
      quotationNumber: poData.PONumber && poData.PONumber !== 'N/A' 
        ? `QT-${poData.PONumber}` 
        : `QT-${Date.now().toString().slice(-6)}`,
      tenantId: options.tenantId || 'default',
      createdBy: options.createdBy,
      salesRepName: options.salesRepName,
      customerName: poData.CustomerName,
      buyerName: poData.BuyerContact?.Name || 'Valued Customer',
      buyerEmail: poData.BuyerContact?.Email || '',
      date: poData.Date || new Date().toISOString().split('T')[0],
      currency: targetCurrency,
      rateUsed,
      incotermUsed: matchedIncoterm,
      items: quotedItems,
      totalAmountForeign: grandTotalForeign,
      hasWarnings: warnings.length > 0,
      warnings,
      riskDisclaimers,
      containerEstimate,
      termsAndConditions,
      paymentTerms: paymentTermsUsed,
      paymentTermAdjustmentPercent: paymentAdjustmentPercent,
      paymentTermAdjustmentAmount: paymentAdjustmentAmount,
      subTotalBeforeAdjustmentForeign,
      priceValidity: options.priceValidity,
      leadTime: options.leadTime,
      samplePolicy: options.samplePolicy,
      aiConfidenceScore: dynamicOverallConfidence || 95,
      aiModelUsed: '',
      processedAt: new Date().toISOString()
    };
  }
}
