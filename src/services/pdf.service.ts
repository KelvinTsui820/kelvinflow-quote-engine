import PDFDocument from 'pdfkit';
import fs from 'fs';
import { QuotationResult } from '../types/index.js';
import { TenantService } from './tenant.service.js';

export interface PDFOptions {
  companyName?: string;
  salesRepName?: string;
  salesRepEmail?: string;
  logoPath?: string;
}

/**
 * 辅助函数：将美元金额转换为英文大写文字（国际贸易标准）
 */
export function numberToWordsUSD(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount) || amount < 0) {
    return 'SAY TOTAL US DOLLARS ZERO AND 00/100 ONLY';
  }

  const units = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  
  // Total cents avoids the 100/100 rounding overflow
  const totalCents = Math.round(amount * 100);
  const dollars = Math.floor(totalCents / 100);
  const cents = totalCents % 100;

  function convertGroup(n: number): string {
    let str = '';
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' HUNDRED ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += units[n] + ' ';
    }
    return str.trim();
  }

  if (dollars === 0) {
    return 'SAY TOTAL US DOLLARS ZERO AND ' + cents.toString().padStart(2, '0') + '/100 ONLY';
  }

  const billions = Math.floor(dollars / 1000000000);
  const millions = Math.floor((dollars % 1000000000) / 1000000);
  const thousands = Math.floor((dollars % 1000000) / 1000);
  const remainder = dollars % 1000;

  let result = 'SAY TOTAL US DOLLARS ';
  if (billions > 0) result += convertGroup(billions) + ' BILLION ';
  if (millions > 0) result += convertGroup(millions) + ' MILLION ';
  if (thousands > 0) result += convertGroup(thousands) + ' THOUSAND ';
  if (remainder > 0) result += convertGroup(remainder) + ' ';

  result += 'AND ' + cents.toString().padStart(2, '0') + '/100 ONLY';
  return result.replace(/\s+/g, ' ').trim();
}

/**
 * 检查文本是否包含中文字符
 */
function containsChinese(str?: string): boolean {
  if (!str) return false;
  return /[\u4e00-\u9fa5]/.test(str);
}

/**
 * 规范化国际外贸出口商企业抬头名称（杜绝中英文混杂与 UTF-8 字节被 PDFKit 渲染为乱码）
 */
export function cleanExporterCompanyName(rawName?: string): string {
  if (!rawName) return 'KelvinFlow Global Technology Co., Ltd.';
  let name = rawName
    .replace(/外贸同行/g, '')
    .replace(/外贸业务员/g, '')
    .replace(/外贸工作室/g, 'Global Technology Co., Ltd.')
    .replace(/个人工作室/g, 'Export Co., Ltd.')
    .replace(/工作室/g, 'Studio')
    .replace(/进出口有限公司/g, 'Import & Export Co., Ltd.')
    .replace(/进出口贸易有限公司/g, 'Import & Export Trading Co., Ltd.')
    .replace(/贸易有限公司/g, 'Trading Co., Ltd.')
    .replace(/实业有限公司/g, 'Industry Co., Ltd.')
    .replace(/科技有限公司/g, 'Technology Co., Ltd.')
    .replace(/有限公司/g, 'Co., Ltd.');

  // 如果依然包含中文字符，将中文部分剔除或转换为安全英文字符
  if (/[\u4e00-\u9fa5]/.test(name)) {
    const latinPart = name.replace(/[\u4e00-\u9fa5]+/g, ' ').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
    if (latinPart.length >= 3) {
      name = latinPart.endsWith('Co., Ltd.') ? latinPart : `${latinPart} Co., Ltd.`;
    } else {
      name = 'KelvinFlow Global Technology Co., Ltd.';
    }
  }
  return name.trim();
}

/**
 * 格式化外贸国际电话号码（支持国内手机号自动补齐 +86 国际区号及空格微排版）
 */
function formatInternationalPhone(raw?: string): string {
  if (!raw) return '+86 185 6609 0282';
  let clean = raw.trim();
  if (clean.includes('-')) {
    clean = clean.replace(/-/g, ' ');
  }
  const digitsOnly = clean.replace(/\D/g, '');
  if (/^1[3-9]\d{9}$/.test(digitsOnly)) {
    return `+86 ${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 7)} ${digitsOnly.slice(7)}`;
  }
  if (/^861[3-9]\d{9}$/.test(digitsOnly)) {
    const num = digitsOnly.slice(2);
    return `+86 ${num.slice(0, 3)} ${num.slice(3, 7)} ${num.slice(7)}`;
  }
  return clean.startsWith('+') ? clean : `+86 ${clean}`;
}

/**
 * 清洗外贸业务员/出口总监姓名，杜绝系统占位符与中文乱码 (Helvetica 字体无 CJK 字形)
 */
export function cleanSalesRepName(raw?: string): string {
  if (!raw) return '';
  let cleaned = raw
    .replace(/\(Compat\)/gi, '')
    .replace(/DEFAULT\s*Admin/gi, '')
    .replace(/DEFAULT/gi, '')
    .replace(/Admin/gi, '')
    .replace(/外贸同行/g, '')
    .replace(/外贸业务员/g, '');

  // 过滤中文等非 ASCII 字符，避免在标准 Helvetica 字体中乱码
  cleaned = cleaned.replace(/[\u4e00-\u9fa5]+/g, ' ').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();

  if (cleaned.length < 2) {
    return '';
  }
  return cleaned;
}

export class PDFService {
  /**
   * 生成专业级国际外贸商业报价单 PDF (标准 A4 单页完美版面，大字号、高呼吸感)
   */
  static async generateQuotationPDF(
    quotation: QuotationResult,
    options: PDFOptions = {}
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const tenantId = quotation.tenantId || 'default';
      const tenantProfile = TenantService.getTenantProfile(tenantId);

      const rawCompany = options.companyName || tenantProfile.companyName || process.env.COMPANY_NAME || 'KelvinFlow Global Technology Co., Ltd.';
      const company = cleanExporterCompanyName(rawCompany);
      const companySubtitle = tenantProfile.companySubtitle || 'Manufacturer & Exporter of Precision Ergonomic Hardware & Seating Solutions';
      const companyAddress = tenantProfile.companyAddress || 'International High-Tech Innovation Center, Foshan, Guangdong, China (528000)';
      const salesRep = cleanSalesRepName(quotation.salesRepName || options.salesRepName || tenantProfile.managerName || '');
      const salesEmail = options.salesRepEmail || tenantProfile.contactEmail || process.env.DEFAULT_MANAGER_EMAIL || 'sales@kelvinflow.com';
      const rawPhone = tenantProfile.contactPhone || process.env.DEFAULT_MANAGER_PHONE || '';
      const salesPhone = rawPhone ? formatInternationalPhone(rawPhone) : '';
      const website = tenantProfile.website || 'www.kelvinflow.com';

      // A4 规格: 595.28 x 841.89 pt。统一边距 left/right: 30pt, bottom: 20pt, 最大可用宽度 531pt
      const doc = new PDFDocument({ margins: { top: 24, bottom: 20, left: 30, right: 30 }, size: 'A4', autoFirstPage: true, bufferPages: true });
      const buffers: Buffer[] = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      // 注册中文字体以支持中文公司名/客户名（支持 Windows 和 Linux 生产环境路径）
      let hasChineseFont = false;
      const fontCandidates = [
        'C:/Windows/Fonts/simhei.ttf',
        'C:/Windows/Fonts/msyh.ttc',
        '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
        '/usr/share/fonts/wqy-zenhei/wqy-zenhei.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc'
      ];
      for (const fontPath of fontCandidates) {
        if (fs.existsSync(fontPath)) {
          try {
            doc.registerFont('ChineseFont', fontPath);
            doc.registerFont('ChineseFont-Bold', fontPath);
            hasChineseFont = true;
            break;
          } catch (e) {
            // ignore font load error
          }
        }
      }

      const getFont = (bold = false, textToCheck = '') => {
        if (hasChineseFont && containsChinese(textToCheck)) {
          return bold ? 'ChineseFont-Bold' : 'ChineseFont';
        }
        return bold ? 'Helvetica-Bold' : 'Helvetica';
      };

      const startX = 32;
      const pageWidth = 531;
      let currentY = 24;

      // =========================================================================
      // 1. 公司 Header 栏与文档大标题 (统一纯文字公司抬头版式，左右分栏，动态行高防碰撞)
      // =========================================================================

      // 智能清洗联系方式行 (过滤测试租户假域名，确保单行优雅展示)
      const cleanWebsite = (website && !website.includes('tenant_trial_') && !website.includes('tenant_') && website !== 'www.kelvinflow.com' && website.includes('.'))
        ? website
        : '';
      const contactParts: string[] = [];
      if (salesPhone) contactParts.push(`Tel: ${salesPhone}`);
      if (salesEmail) contactParts.push(`Email: ${salesEmail}`);
      if (cleanWebsite) contactParts.push(`Web: ${cleanWebsite}`);
      const contactText = contactParts.join('  |  ');

      // 左右分栏几何参数设定 (全宽 531pt，两栏之间强制保留 16pt 以上安全呼吸通道，杜绝水平重叠)
      const rightWidth = 205;
      const rightStartX = startX + pageWidth - rightWidth;
      const maxLeftTextX = rightStartX - 16;
      
      const textStartX = startX;
      const leftMaxWidth = Math.max(180, maxLeftTextX - textStartX);

      // 左侧企业信息动态流水排版 (严格根据每段文字实际折行与高度累加 Y 坐标，彻底杜绝任何重叠碰撞)
      let leftY = 20;

      // 1. 出口企业法定/英文抬头 (根据长短自适应选择 10.5pt 或 9.5pt，确保高视觉冲击力)
      const companyUpper = company.toUpperCase();
      let compFontSize = 10.5;
      doc.font(getFont(true, companyUpper)).fontSize(compFontSize);
      if (doc.widthOfString(companyUpper) > leftMaxWidth) {
        compFontSize = 9.5;
        doc.fontSize(compFontSize);
      }
      doc.fillColor('#0f2942').text(companyUpper, textStartX, leftY, { width: leftMaxWidth, lineGap: 1 });
      leftY += doc.heightOfString(companyUpper, { width: leftMaxWidth, lineGap: 1 }) + 3;

      // 2. 企业副标题 / 业务范围 Slogan
      if (companySubtitle) {
        doc.font(getFont(false, companySubtitle)).fontSize(7).fillColor('#64748b');
        doc.text(companySubtitle, textStartX, leftY, { width: leftMaxWidth, lineGap: 1 });
        leftY += doc.heightOfString(companySubtitle, { width: leftMaxWidth, lineGap: 1 }) + 2.5;
      }

      // 3. 企业生产与办公实体地址
      if (companyAddress) {
        const fullAddress = companyAddress.toLowerCase().startsWith('address') ? companyAddress : 'Address: ' + companyAddress;
        doc.font(getFont(false, fullAddress)).fontSize(7).fillColor('#475569');
        doc.text(fullAddress, textStartX, leftY, { width: leftMaxWidth, lineGap: 1 });
        leftY += doc.heightOfString(fullAddress, { width: leftMaxWidth, lineGap: 1 }) + 2.5;
      }

      // 4. 外贸联络方式 (电话、外销邮箱、官方网址)
      if (contactText) {
        doc.font(getFont(false, contactText)).fontSize(7).fillColor('#475569');
        doc.text(contactText, textStartX, leftY, { width: leftMaxWidth, lineGap: 1 });
        leftY += doc.heightOfString(contactText, { width: leftMaxWidth, lineGap: 1 });
      }

      // 右侧：商业报价单标题与单号信息 (加粗加大，清晰可辨，排版严整，右对齐)
      let rightY = 20;

      doc
        .fontSize(17)
        .font(getFont(true))
        .fillColor('#2563eb')
        .text('FORMAL QUOTATION', rightStartX, rightY, { width: rightWidth, align: 'right' });
      rightY += 19;

      doc
        .fontSize(9.5)
        .font(getFont(true))
        .fillColor('#0f2942')
        .text('REF NO: ' + quotation.quotationNumber, rightStartX, rightY, { width: rightWidth, align: 'right' });
      rightY += 13;

      const issueDateStr = quotation.date || new Date().toISOString().split('T')[0];
      const validityDays = (quotation.priceValidity && quotation.priceValidity.match(/\d+/))
        ? parseInt(quotation.priceValidity.match(/\d+/)![0], 10)
        : 30;
      let validUntilStr = '';
      try {
        const d = new Date(issueDateStr);
        if (!isNaN(d.getTime())) {
          d.setDate(d.getDate() + validityDays);
          validUntilStr = d.toISOString().split('T')[0];
        }
      } catch {}
      const validityDisplay = validUntilStr
        ? `Price Validity: ${validityDays} Days (Until: ${validUntilStr})`
        : `Price Validity: ${validityDays} Calendar Days`;

      doc
        .fontSize(7.5)
        .font(getFont(false))
        .fillColor('#64748b')
        .text('Date of Issue: ' + issueDateStr, rightStartX, rightY, { width: rightWidth, align: 'right' });
      rightY += 11;

      doc
        .fontSize(7.5)
        .font(getFont(false))
        .fillColor('#64748b')
        .text(validityDisplay, rightStartX, rightY, { width: rightWidth, align: 'right' });
      rightY += 11;

      if (salesRep) {
        doc
          .fontSize(7.5)
          .font(getFont(false))
          .fillColor('#475569')
          .text('Export Manager: ' + salesRep, rightStartX, rightY, { width: rightWidth, align: 'right' });
        rightY += 11;
      }

      // 贯穿高质感装饰分割线 (自适应沉降到所有 Header 元素最底端之下，留足 6pt 安全呼吸边距)
      const headerBottomY = Math.max(leftY, rightY, 82);
      const dividerY = headerBottomY + 6;

      doc
        .strokeColor('#2563eb')
        .lineWidth(1.5)
        .moveTo(startX, dividerY)
        .lineTo(startX + pageWidth, dividerY)
        .stroke();

      currentY = dividerY + 12;

      // =========================================================================
      // 2. 商务双卡片：买家信息 (BILL TO) 与 履约条款 (COMMERCIAL TERMS)
      // 动态自适应：长企业名称智能缩字号并支持双行折行，双卡片高度对称对齐，杜绝省略号
      // =========================================================================
      const boxWidth = 259;
      const boxInnerWidth = boxWidth - 24;

      const buyerComp = quotation.customerName || 'Acme Global Trading Ltd.';
      const buyerCompFont = getFont(true, buyerComp);
      doc.font(buyerCompFont);
      let buyerCompFontSize = 9;
      while (buyerCompFontSize > 7.5 && doc.fontSize(buyerCompFontSize).widthOfString(buyerComp) > boxInnerWidth) {
        buyerCompFontSize -= 0.5;
      }
      doc.fontSize(buyerCompFontSize);
      const buyerCompHeight = doc.heightOfString(buyerComp, { width: boxInnerWidth, lineGap: -1 });
      const isCompanyMultiLine = buyerCompHeight > 14;
      const boxHeight = Math.max(78, Math.ceil(78 + (buyerCompHeight - 12)));

      // 左卡片：买家企业与对接人
      doc.roundedRect(startX, currentY, boxWidth, boxHeight, 4).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.font(getFont(true)).fontSize(8.5).fillColor('#0f2942').text('CONSIGNEE / BUYER INFORMATION:', startX + 12, currentY + 7);
      
      doc.font(buyerCompFont).fontSize(buyerCompFontSize).fillColor('#1e293b')
        .text(buyerComp, startX + 12, currentY + 20, { width: boxInnerWidth, lineGap: -1 });
      
      const buyerPerson = quotation.buyerName || 'Purchasing Director';
      const leftNextY = currentY + 20 + buyerCompHeight + 3;
      doc.font(getFont(false, buyerPerson)).fontSize(8).fillColor('#475569').text('Attn: ' + buyerPerson, startX + 12, leftNextY);
      doc.font(getFont(false)).fontSize(8).fillColor('#475569').text('Email: ' + (quotation.buyerEmail || 'buyer@acmeglobal.de'), startX + 12, leftNextY + 13);

      // 第 4 行：目的港口与买家区域（实现左右双卡片完全 4 行等高对称）
      let buyerDest = 'Hamburg Port, Germany';
      const anyQuote = quotation as any;
      if (anyQuote.destinationPort) {
        buyerDest = anyQuote.destinationPort;
      } else if (anyQuote.buyerAddress && anyQuote.buyerAddress.length > 3) {
        buyerDest = anyQuote.buyerAddress;
      } else {
        const fullRemarks = `${anyQuote.deliveryDetails || ''} ${anyQuote.specialRemarks || ''} ${anyQuote.termsAndConditions || ''}`;
        const portMatch = fullRemarks.match(/(?:to|destination|cif|cfr|fob)\s*[:：]?\s*([A-Za-z\s]+(?:Port|Harbour|Harbor))/i);
        if (portMatch && portMatch[1]) {
          buyerDest = portMatch[1].trim();
        } else if (quotation.customerName?.includes('GmbH') || quotation.buyerEmail?.endsWith('.de')) {
          buyerDest = 'Hamburg Port, Germany';
        } else if (quotation.buyerEmail?.endsWith('.uk') || quotation.customerName?.includes('UK')) {
          buyerDest = 'Felixstowe Port, United Kingdom';
        } else if (quotation.buyerEmail?.endsWith('.fr')) {
          buyerDest = 'Le Havre Port, France';
        } else if (quotation.buyerEmail?.endsWith('.nl')) {
          buyerDest = 'Rotterdam Port, Netherlands';
        } else if (quotation.buyerEmail?.endsWith('.us') || quotation.customerName?.includes('USA') || quotation.customerName?.includes('LLC') || quotation.customerName?.includes('Inc')) {
          buyerDest = 'Long Beach Port, USA';
        } else {
          buyerDest = 'Hamburg Port, Germany';
        }
      }

      // 目的港自适应字号（防止超长港口名称溢出）
      let destFontSize = 8;
      const destFullText = 'Destination (POD): ' + buyerDest;
      doc.font(getFont(false));
      while (destFontSize > 7 && doc.fontSize(destFontSize).widthOfString(destFullText) > boxInnerWidth) {
        destFontSize -= 0.5;
      }
      doc.font(getFont(false)).fontSize(destFontSize).fillColor('#475569')
        .text('Destination (POD): ', startX + 12, leftNextY + 26, { continued: true })
        .font(getFont(true)).fillColor('#0f2942').text(buyerDest);

      // 右卡片：国际贸易与交割条款
      const rightBoxX = startX + boxWidth + 13;
      doc.roundedRect(rightBoxX, currentY, boxWidth, boxHeight, 4).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.font(getFont(true)).fontSize(8.5).fillColor('#0f2942').text('COMMERCIAL & SHIPMENT SPECIFICATIONS:', rightBoxX + 12, currentY + 7);
      
      let displayIncoterm = quotation.incotermUsed || 'FOB Shenzhen';
      if (/^CIF/i.test(displayIncoterm)) {
        displayIncoterm = `CIF ${buyerDest}`;
      } else if (/^CFR/i.test(displayIncoterm)) {
        displayIncoterm = `CFR ${buyerDest}`;
      } else if (/^FOB/i.test(displayIncoterm)) {
        displayIncoterm = displayIncoterm.replace(/\s*\(.*?\)/g, '').trim();
        if (!displayIncoterm.toLowerCase().includes('port') && !displayIncoterm.toLowerCase().includes('shenzhen') && !displayIncoterm.toLowerCase().includes('guangzhou')) {
          displayIncoterm = `${displayIncoterm} Shenzhen Port, China`;
        }
      } else if (/^EXW/i.test(displayIncoterm)) {
        displayIncoterm = 'EXW Foshan Factory, China';
      } else {
        displayIncoterm = displayIncoterm.replace(/\s*\(.*?\)/g, '').trim();
      }

      // 起运港与航线闭环 (动态自适应：优先来自询盘/租户，默认中国深水出口港)
      const portOfLoading = anyQuote.portOfLoading || (tenantProfile as any)?.defaultPortOfLoading || 'Shenzhen Port, China';

      const rightStep = isCompanyMultiLine ? 15 : 13.5;

      // 贸易术语自适应字号
      let termFontSize = 8;
      const termFullText = 'Trade Terms (Incoterm): ' + displayIncoterm;
      doc.font(getFont(false));
      while (termFontSize > 7 && doc.fontSize(termFontSize).widthOfString(termFullText) > boxInnerWidth) {
        termFontSize -= 0.5;
      }
      doc.font(getFont(false)).fontSize(termFontSize).fillColor('#475569')
        .text('Trade Terms (Incoterm): ', rightBoxX + 12, currentY + 21, { continued: true })
        .font(getFont(true)).fillColor('#2563eb').text(displayIncoterm);

      const effectiveCurr = (!quotation.currency || quotation.currency === 'N/A') ? 'USD' : quotation.currency;
      const currFullName = effectiveCurr === 'USD' ? 'USD (US Dollars)' : (effectiveCurr === 'EUR' ? 'EUR (Euro)' : (effectiveCurr === 'GBP' ? 'GBP (British Pounds)' : effectiveCurr));
      doc.font(getFont(false)).fontSize(8).fillColor('#475569')
        .text('Settlement Currency: ', rightBoxX + 12, currentY + 21 + rightStep, { continued: true })
        .font(getFont(true)).fillColor('#0f2942').text(currFullName);

      // 动态生产交期 (来自询盘/选项，并加上图纸签样前置条件)
      const rawLead = (quotation.leadTime || '25 - 30 Working Days')
        .replace(/upon.*$/i, '')
        .replace(/after.*$/i, '')
        .trim();
      const dynamicLeadTime = rawLead ? `${rawLead} upon Approval` : '25 - 30 Working Days upon Approval';
      let leadFontSize = 8;
      const leadFullText = 'Production Lead Time: ' + dynamicLeadTime;
      doc.font(getFont(false));
      while (leadFontSize > 7 && doc.fontSize(leadFontSize).widthOfString(leadFullText) > boxInnerWidth) {
        leadFontSize -= 0.5;
      }
      doc.font(getFont(false)).fontSize(leadFontSize).fillColor('#475569')
        .text('Production Lead Time: ', rightBoxX + 12, currentY + 21 + rightStep * 2, { continued: true })
        .font(getFont(true)).fillColor('#0f2942').text(dynamicLeadTime);

      // 港口航线闭环
      const isOceanTerm = /CIF|CFR|FOB/i.test(displayIncoterm);
      const shipmentRouteText = isOceanTerm ? `POL: ${portOfLoading}` : 'Ex-Works Loaded';
      doc.font(getFont(false)).fontSize(8).fillColor('#475569')
        .text('Shipment Origin: ', rightBoxX + 12, currentY + 21 + rightStep * 3, { continued: true })
        .font(getFont(true)).fillColor('#0f2942').text(shipmentRouteText);

      currentY += boxHeight + 14;

      // =========================================================================
      // 3. 报价商品规格明细表 (支持动态计算行高、紧凑模式与多页自适应流式排版)
      // =========================================================================
      const tableHeaderHeight = 22;
      const isCompact = quotation.items.length >= 5 && quotation.items.length <= 6;
      const rowMinHeight = isCompact ? 28 : 34;

      // 列坐标分配 (全宽 531pt，黄金重平衡：拉开单价与数量间距，消除表头粘连)
      const colX = {
        idx: startX + 4,
        sku: startX + 28,
        desc: startX + 130,
        qty: startX + 314,
        unitPrice: startX + 378,
        subtotal: startX + 456
      };

      function renderTableHeader(y: number): number {
        doc.rect(startX, y, pageWidth, tableHeaderHeight).fill('#0f2942');
        doc.font(getFont(true)).fontSize(7.5).fillColor('#ffffff');
        doc.text('#', colX.idx, y + 6, { width: 20, align: 'center' });
        doc.text('ITEM / MODEL NO.', colX.sku, y + 6, { width: 96 });
        doc.text('DESCRIPTION & SPECIFICATIONS', colX.desc, y + 6, { width: 178 });
        doc.text('QTY (PCS)', colX.qty, y + 6, { width: 52, align: 'right' });
        doc.text('UNIT PRICE', colX.unitPrice, y + 6, { width: 70, align: 'right' });
        doc.text('TOTAL (' + effectiveCurr + ')', colX.subtotal, y + 6, { width: 71, align: 'right' });
        return y + tableHeaderHeight;
      }

      function renderContinuationHeader(): number {
        let y = 24;
        doc.font(getFont(true)).fontSize(10).fillColor('#0f2942')
          .text('QUOTATION ITEMS LIST (CONTINUED)', startX, y);
        doc.font(getFont(false)).fontSize(8).fillColor('#64748b')
          .text('Quotation Ref: ' + quotation.quotationNumber, startX + 300, y, { width: 231, align: 'right' });
        y += 16;
        doc.strokeColor('#2563eb').lineWidth(1.5).moveTo(startX, y).lineTo(startX + pageWidth, y).stroke();
        return y + 10;
      }

      currentY = renderTableHeader(currentY);

      // 渲染商品明细行
      (quotation.items || []).forEach((item, index) => {
        const isAlt = index % 2 === 1;
        const rawDesc = item.description || 'Standard Export Appliance Spec';
        let descText = rawDesc;
        if (!descText.toLowerCase().includes('hs code') && !descText.toLowerCase().includes('hs:')) {
          let hsCode = (item as any).hsCode;
          if (!hsCode) {
            const skuUpper = (item.sku || '').toUpperCase();
            const descUpper = rawDesc.toUpperCase();
            if (skuUpper.includes('CHAIR') || descUpper.includes('CHAIR') || skuUpper.includes('ERG')) {
              hsCode = '9401.30';
            } else if (skuUpper.includes('SCREW') || descUpper.includes('SCREW') || skuUpper.includes('BOLT')) {
              hsCode = '7318.15';
            } else if (skuUpper.includes('BRACKET') || descUpper.includes('BRACKET') || skuUpper.includes('AL-') || skuUpper.includes('ACME-991')) {
              hsCode = '7616.99';
            } else if (descUpper.includes('ALUMINUM') || descUpper.includes('ALLOY')) {
              hsCode = '7616.99';
            }
          }
          if (hsCode) {
            descText = `[HS: ${hsCode}] ${rawDesc}`;
          }
        }

        doc.font(getFont(false, descText)).fontSize(8);
        const descHeight = doc.heightOfString(descText, { width: 178, lineGap: 1 });
        const itemRowHeight = Math.max(rowMinHeight, Math.ceil(descHeight) + (isCompact ? 8 : 12));

        // 智能安全分页检测 (730pt 为第一页安全阈值)
        if (currentY + itemRowHeight > 730) {
          doc.addPage();
          currentY = renderContinuationHeader();
          currentY = renderTableHeader(currentY);
        }

        if (isAlt) {
          doc.rect(startX, currentY, pageWidth, itemRowHeight).fill('#f8fafc');
        }

        // 序号
        doc.font(getFont(false)).fontSize(8).fillColor('#64748b');
        doc.text(String(index + 1), colX.idx, currentY + (isCompact ? 5 : 7), { width: 20, align: 'center' });

        // 买家型号 SKU
        const skuSafe = item.sku || `ITEM-${index + 1}`;
        doc.font(getFont(true, skuSafe)).fontSize(8.5).fillColor('#0f2942');
        doc.text(skuSafe, colX.sku, currentY + (isCompact ? 5 : 7), { width: 96, ellipsis: true });

        // 品名与技术参数描述 (含 HS Code)
        doc.font(getFont(false, descText)).fontSize(8).fillColor('#334155');
        doc.text(descText, colX.desc, currentY + (isCompact ? 5 : 7), { width: 178, lineGap: 1 });

        // 数量
        doc.font(getFont(false)).fontSize(8.5).fillColor('#0f172a');
        const qtyNum = Number(item.quantity) || 1;
        doc.text(qtyNum.toLocaleString(), colX.qty, currentY + (isCompact ? 5 : 7), { width: 52, align: 'right' });

        // 单价与小计
        const unitPriceNum = Number(item.unitPriceForeign || 0);
        const subtotalNum = Number(item.subTotalForeign ?? (item.quantity * unitPriceNum));

        doc.font(getFont(false)).fontSize(8.5).fillColor('#0f172a');
        doc.text(unitPriceNum.toFixed(2), colX.unitPrice, currentY + (isCompact ? 5 : 7), { width: 70, align: 'right' });

        doc.font(getFont(true)).fontSize(9).fillColor('#0f2942');
        doc.text(subtotalNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colX.subtotal, currentY + (isCompact ? 5 : 7), { width: 71, align: 'right' });

        // 细微行底分割线
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(startX, currentY + itemRowHeight).lineTo(startX + pageWidth, currentY + itemRowHeight).stroke();

        currentY += itemRowHeight;
      });

      currentY += (isCompact ? 8 : 12);

      // =========================================================================
      // 4. 财务总计与大写金额 (Grand Total & Amount in Words)
      // =========================================================================
      const totalSectionHeight = isCompact ? 44 : 48;
      if (currentY + totalSectionHeight > 730) {
        doc.addPage();
        currentY = renderContinuationHeader();
      }

      // 右侧总金额卡片宽度拓宽至 195pt，与上方表格更均衡；左侧大写金额宽度自动适配
      const totalBoxWidth = 195;
      const totalBoxX = startX + pageWidth - totalBoxWidth;
      const inWordsWidth = pageWidth - totalBoxWidth - 10;

      // 左侧：国际电汇标准英文大写金额
      const inWords = numberToWordsUSD(quotation.totalAmountForeign);
      doc.roundedRect(startX, currentY, inWordsWidth, totalSectionHeight, 4).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.font(getFont(true)).fontSize(7).fillColor('#64748b').text('AMOUNT IN WORDS (INTERNATIONAL TRADE STANDARD):', startX + 10, currentY + 6);
      doc.font(getFont(true)).fontSize(8).fillColor('#0f2942').text(inWords, startX + 10, currentY + 18, { width: inWordsWidth - 20, lineGap: 1.5 });

      // 右侧：官方核算总金额 (采用国际大厂上下分层结构，彻底杜绝左右撞车)
      doc.roundedRect(totalBoxX, currentY, totalBoxWidth, totalSectionHeight, 4).lineWidth(1).fillAndStroke('#0f2942', '#1e3a5f');
      
      // 上层：小标签与贸易条款标识 (左侧 GRAND TOTAL，右侧贸易术语如 CIF HAMBURG)
      const incotermCode = (quotation.incotermUsed || 'CIF').split(' ')[0];
      const tradeDestShort = buyerDest ? buyerDest.replace(/\s*Port.*/i, '').trim() : '';
      const termTag = tradeDestShort ? `${incotermCode} ${tradeDestShort}` : incotermCode;

      doc.font(getFont(true)).fontSize(7.5).fillColor('#94a3b8').text('GRAND TOTAL', totalBoxX + 14, currentY + (isCompact ? 7 : 9));
      doc.font(getFont(true)).fontSize(7).fillColor('#38bdf8').text(termTag.toUpperCase(), totalBoxX + 14, currentY + (isCompact ? 7 : 9), { width: totalBoxWidth - 28, align: 'right' });

      // 下层：纯白超大号金额 (通栏展开，右对齐，去除重复 $ 符号)
      const totalAmountSafe = Number(quotation.totalAmountForeign) || 0;
      const formattedTotal = effectiveCurr + ' ' + totalAmountSafe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      doc.font(getFont(true)).fontSize(16).fillColor('#ffffff').text(
        formattedTotal,
        totalBoxX + 14,
        currentY + (isCompact ? 21 : 23),
        { width: totalBoxWidth - 28, align: 'right' }
      );

      currentY += totalSectionHeight + (isCompact ? 8 : 12);

      // 货柜装载容积速查与配载提示胶囊条
      let fitRecommendation = 'Standard Ocean Freight';
      if (quotation.containerEstimate && quotation.containerEstimate.totalCBM > 0) {
        const ce = quotation.containerEstimate;
        if (ce.recommendedContainer && ce.recommendedContainer !== 'Standard Ocean Freight') {
          fitRecommendation = ce.recommendedContainer;
        } else {
          const cbm = ce.totalCBM;
          if (cbm <= 15) {
            fitRecommendation = `LCL Consolidation (Approx. ${cbm} CBM)`;
          } else if (cbm <= 28) {
            fitRecommendation = `1x 20'GP FCL (~${Math.round((cbm / 28) * 100)}% load)`;
          } else if (cbm <= 58) {
            fitRecommendation = `1x 40'GP FCL (~${Math.round((cbm / 58) * 100)}% load)`;
          } else if (cbm <= 68) {
            fitRecommendation = `1x 40'HQ High-Cube (~${Math.round((cbm / 68) * 100)}% load)`;
          } else {
            const hq = Math.floor(cbm / 68);
            const rem = Math.round((cbm % 68) * 10) / 10;
            fitRecommendation = rem <= 12
              ? `${hq}x 40'HQ (68 CBM) + LCL (${rem} CBM) or 1x 20'GP`
              : (rem <= 28 ? `${hq}x 40'HQ + 1x 20'GP` : `${hq + 1}x 40'HQ High-Cube`);
          }
        }

        const bannerH = 18;
        if (currentY + bannerH > 730) {
          doc.addPage();
          currentY = renderContinuationHeader();
        }
        doc.roundedRect(startX, currentY, pageWidth, bannerH, 3).fillAndStroke('#f0fdf4', '#bbf7d0');
        doc.font(getFont(true)).fontSize(7.5).fillColor('#15803d').text('PACKAGING & CONTAINER FIT: ', startX + 8, currentY + 5, { continued: true });
        doc.font(getFont(false)).fontSize(7.5).fillColor('#166534').text(
          `${ce.totalCartons} Cartons  |  Approx. ${ce.totalCBM} CBM${ce.totalGW ? '  |  GW: ' + ce.totalGW.toLocaleString() + ' KG' : ''}  |  Recommended: ${fitRecommendation}`,
          { width: pageWidth - 16, ellipsis: true }
        );
        currentY += bannerH + (isCompact ? 8 : 12);
      }

      // =========================================================================
      // 5. 商业条款与合规承诺 (两列悬挂缩进排版，核心术语加粗对比)
      // =========================================================================
      if (currentY + 110 > 730) {
        doc.addPage();
        currentY = renderContinuationHeader();
      }

      doc.font(getFont(true)).fontSize(9).fillColor('#0f2942').text('COMMERCIAL TERMS & QUALITY ASSURANCE', startX, currentY);
      doc.strokeColor('#2563eb').lineWidth(1).moveTo(startX, currentY + 13).lineTo(startX + pageWidth, currentY + 13).stroke();
      currentY += 18;

      // 1. 动态生成付款条款 (自适应支持各种不同国际付款条件)
      let payHighlight = '30% T/T Deposit';
      let payRest = ' upon Proforma Invoice (PI) confirmation; 70% balance paid within 5 working days against copy of Ocean Bill of Lading (B/L) and full shipping documents. All wire transfer fees outside China for Buyer\'s account.';

      if (quotation.paymentTerms) {
        const rawPt = quotation.paymentTerms;
        if (/100%\s*(T\/T|advance)/i.test(rawPt)) {
          payHighlight = '100% T/T in Advance';
          payRest = ' upon Proforma Invoice (PI) confirmation prior to mass production scheduling. All wire transfer fees outside China for Buyer\'s account.';
        } else if (/L\/?C/i.test(rawPt)) {
          payHighlight = '100% Irrevocable L/C at Sight';
          payRest = ' issued by first-class international bank upon order confirmation. All overseas banking charges for Buyer\'s account.';
        } else if (/O\/?A|Net\s*\d+/i.test(rawPt)) {
          payHighlight = rawPt;
          payRest = ' open account credit terms subject to export credit insurance underwriting approval.';
        } else if (/EXW/i.test(quotation.incotermUsed || '')) {
          payHighlight = '30% T/T Deposit';
          payRest = ' upon Proforma Invoice (PI) confirmation; 70% balance paid prior to dispatch against photo/video inspection pass certificate. Wire fees outside China for Buyer\'s account.';
        } else {
          payHighlight = '30% T/T Deposit';
          payRest = ' upon Proforma Invoice (PI) confirmation; 70% balance paid within 5 working days against copy of Ocean Bill of Lading (B/L) and full shipping documents. All wire transfer fees outside China for Buyer\'s account.';
        }
      }

      // 2. 动态生成报价有效期与汇率保护条款
      const currCode = effectiveCurr.toUpperCase();
      const rateVal = quotation.rateUsed ? Number(quotation.rateUsed).toFixed(4).replace(/\.?0+$/, '') : '';
      const fxBenchClause = rateVal && currCode !== 'CNY'
        ? ` based on benchmark exchange rate (${currCode}/CNY = ${rateVal}) and`
        : '';
      const validityHighlight = `${validityDays} Calendar Days`;
      const validityRest = ` strictly valid from date of issue (until ${validUntilStr || 'specified date'}). Prices${fxBenchClause} subject to mutual adjustment if foreign exchange rate fluctuates by more than ±3%. Re-confirmation required upon expiration.`;

      // 3. 动态质量保障条款 (优先支持询盘要求/配置，默认 AQL抽检 + 产线全测 + 开放第三方验货)
      const warrantyHighlight = (quotation as any).qualityStandard || 'AQL 2.5 / 4.0 Standard';
      const warrantyRest = (quotation as any).qualityWarranty || ' pre-shipment sampling inspection & 100% functional testing on production line. 12-Month factory warranty. Buyer\'s third-party inspection (SGS / TÜV / BV) warmly welcomed prior to loading.';

      // 4. 包装与防震防跌落条款 (优先支持询盘要求的托盘/电商包装，默认 ISTA-1A 5层瓦楞)
      const packagingHighlight = (quotation as any).packagingStandard || 'Export Standard 5-Ply';
      const packagingRest = (quotation as any).packagingTerms || ' heavy-duty corrugated cartons, reinforced with strapping bands & moisture-proof lining. ISTA-1A drop-test certified. Fumigated wooden pallets available upon request.';

      const structuredTerms = [
        { label: 'Payment Terms:', highlight: payHighlight, rest: payRest },
        { label: 'Price & Validity:', highlight: validityHighlight, rest: validityRest },
        { label: 'Quality Warranty:', highlight: warrantyHighlight, rest: warrantyRest },
        { label: 'Packaging & Delivery:', highlight: packagingHighlight, rest: packagingRest }
      ];

      const labelColWidth = 105;
      const contentColWidth = pageWidth - labelColWidth;

      structuredTerms.forEach(item => {
        const itemY = currentY;
        doc.font(getFont(true)).fontSize(7.5).fillColor('#2563eb').text(item.label, startX, itemY, { width: labelColWidth });
        
        doc.font(getFont(true)).fontSize(7.5).fillColor('#0f2942')
          .text(item.highlight, startX + labelColWidth, itemY, { continued: true, width: contentColWidth })
          .font(getFont(false)).fillColor('#475569')
          .text(item.rest, { width: contentColWidth, lineGap: 1.5 });
        
        const fullText = item.highlight + item.rest;
        doc.font(getFont(false)).fontSize(7.5);
        const h = Math.max(doc.heightOfString(fullText, { width: contentColWidth, lineGap: 1.5 }), 12);
        currentY = itemY + h + (isCompact ? 3.5 : 4.5);
      });

      // =========================================================================
      // 6. 出口增值服务与合规承诺卡片 (VALUE-ADDED SERVICES & EXPORT ASSURANCES)
      //    在商业报价阶段，以 1% 免费备件、OEM 麦头、出货验货报告与原产地证 CO 权益促成买家立项决策
      // =========================================================================
      const signBlockHeight = 72;
      const assuranceCardHeight = 44;
      const maxContentY = 782; // 距离页脚 (794) 留出 12pt 安全边距

      // 精确空间演算：确保只有当卡片与签字区都能在当前页完整呈现时才渲染增值卡片，绝不产生单孤签字页
      const spaceNeededForBoth = (isCompact ? 4 : 6) + assuranceCardHeight + 8 + 14 + signBlockHeight;
      const canFitAssuranceCard = (currentY + spaceNeededForBoth) <= maxContentY;

      if (canFitAssuranceCard) {
        currentY += (isCompact ? 4 : 6);
        
        // 增值权益卡片背景：浅灰微底 + 典雅细边框 + 品牌蓝左侧强调条
        doc.roundedRect(startX, currentY, pageWidth, assuranceCardHeight, 4).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.rect(startX, currentY, 3, assuranceCardHeight).fill('#2563eb');

        // 卡片标题
        doc.font(getFont(true)).fontSize(7.5).fillColor('#0f2942')
          .text('VALUE-ADDED SERVICES & EXPORT COMPLIANCE ASSURANCES (BUYER BENEFITS)', startX + 10, currentY + 6);

        // 动态支持：优先读取报价自定义或租户配置的 4 项增值权益，具备工业级精炼单行兜底
        interface AssuranceItem {
          label: string;
          text: string;
          highlight?: boolean;
        }
        const defaultAssurances: AssuranceItem[] = [
          { label: '1% F.O.C. Parts: ', text: 'Free maintenance spare parts included.' },
          { label: 'Pre-Shipment QC: ', text: 'Full inspection report & photos before loading.' },
          { label: 'OEM Marks: ', text: 'Free customized carton marks & barcodes.' },
          { label: 'Customs Clearance: ', text: 'Certificate of Origin (CO / FTA) supported.', highlight: true }
        ];

        const rawAssurances = (quotation as any).valueAddedServices || (tenantProfile as any)?.valueAddedServices || defaultAssurances;
        const assurances: AssuranceItem[] = Array.isArray(rawAssurances) && rawAssurances.length >= 4 ? rawAssurances : defaultAssurances;

        // 左右两列 4 项核心促成交权益 (严整单行排版，限制宽度并开启省略截断，彻底杜绝折行与下底溢出)
        const colWidth = 245;
        const col1X = startX + 10;
        const col2X = startX + 272;
        const r1Y = currentY + 18;
        const r2Y = currentY + 30;

        // 第 1 列 (左上 + 左下)
        doc.font(getFont(true)).fontSize(7).fillColor('#0f2942')
          .text(assurances[0].label, col1X, r1Y, { continued: true, width: colWidth })
          .font(getFont(false)).fillColor('#475569')
          .text(assurances[0].text, { width: colWidth, ellipsis: true });

        doc.font(getFont(true)).fontSize(7).fillColor('#0f2942')
          .text(assurances[1].label, col1X, r2Y, { continued: true, width: colWidth })
          .font(getFont(false)).fillColor('#475569')
          .text(assurances[1].text, { width: colWidth, ellipsis: true });

        // 第 2 列 (右上 + 右下)
        doc.font(getFont(true)).fontSize(7).fillColor('#0f2942')
          .text(assurances[2].label, col2X, r1Y, { continued: true, width: colWidth })
          .font(getFont(false)).fillColor('#475569')
          .text(assurances[2].text, { width: colWidth, ellipsis: true });

        doc.font(getFont(true)).fontSize(7).fillColor('#0f2942')
          .text(assurances[3].label, col2X, r2Y, { continued: true, width: colWidth })
          .font(getFont(assurances[3].highlight ? true : false)).fillColor(assurances[3].highlight ? '#2563eb' : '#475569')
          .text(assurances[3].text, { width: colWidth, ellipsis: true });

        currentY += assuranceCardHeight + (isCompact ? 4 : 6);
      }

      // =========================================================================
      // 7. 买卖双方正式签字盖章栏 (自适应安全高度，带官方印章签核专区与订单启动指引)
      // =========================================================================
      // 订单确认行动号召指引条 (CTA Notice: 消除买家疑虑，指引下一步 PI 流程)
      const ctaY = currentY + 4;
      doc.font(getFont(true)).fontSize(6.5).fillColor('#2563eb')
        .text('ORDER CONFIRMATION NEXT STEP: ', startX, ctaY, { continued: true });
      doc.font(getFont(false)).fontSize(6.5).fillColor('#64748b')
        .text('Please countersign and return to lock production. Official Proforma Invoice (PI) with banking coordinates follows immediately.');

      const naturalSignY = ctaY + 14;
      let signY = naturalSignY;
      if (naturalSignY + signBlockHeight > maxContentY) {
        doc.addPage();
        currentY = renderContinuationHeader();
        signY = currentY + 16;
      } else {
        const anchorBottomY = 696;
        signY = (naturalSignY < anchorBottomY && (anchorBottomY + signBlockHeight <= maxContentY))
          ? anchorBottomY
          : naturalSignY;
      }

      const signColWidth = 245;
      const signLineY = signY + 48;

      // 左侧：卖方官方签核
      doc.font(getFont(true, company)).fontSize(8.5).fillColor('#0f2942').text('FOR AND ON BEHALF OF EXPORTER:', startX, signY);
      let sellerSignFontSize = 8.5;
      doc.font(getFont(true, company));
      while (sellerSignFontSize > 7 && doc.fontSize(sellerSignFontSize).widthOfString(company.toUpperCase()) > signColWidth) {
        sellerSignFontSize -= 0.5;
      }
      doc.font(getFont(true, company)).fontSize(sellerSignFontSize).fillColor('#2563eb').text(company.toUpperCase(), startX, signY + 13, { width: signColWidth });
      
      // 卖方印章指引占位
      doc.font(getFont(false)).fontSize(6.5).fillColor('#94a3b8').text('[ Official Corporate Seal & Sign-off ]', startX + signColWidth - 120, signY + 36, { width: 120, align: 'right' });

      doc.strokeColor('#94a3b8').lineWidth(0.8).dash(3, { space: 2 }).moveTo(startX, signLineY).lineTo(startX + signColWidth, signLineY).stroke().undash();
      doc.font(getFont(false)).fontSize(7.5).fillColor('#64748b').text('Authorized Signature & Corporate Stamp', startX, signLineY + 5);
      doc.font(getFont(true)).fontSize(8).fillColor('#1e293b').text(salesRep ? 'Export Director: ' + salesRep : 'Export Director', startX, signLineY + 16);

      // 右侧：买家签回确认
      const buyerSignX = startX + pageWidth - signColWidth;
      doc.font(getFont(true, buyerComp)).fontSize(8.5).fillColor('#0f2942').text('ACCEPTED & CONFIRMED BY BUYER:', buyerSignX, signY);
      let buyerSignFontSize = 8.5;
      doc.font(getFont(true, buyerComp));
      while (buyerSignFontSize > 7 && doc.fontSize(buyerSignFontSize).widthOfString(buyerComp.toUpperCase()) > signColWidth) {
        buyerSignFontSize -= 0.5;
      }
      doc.font(getFont(true, buyerComp)).fontSize(buyerSignFontSize).fillColor('#2563eb').text(buyerComp.toUpperCase(), buyerSignX, signY + 13, { width: signColWidth });

      // 买家印章指引占位
      doc.font(getFont(false)).fontSize(6.5).fillColor('#94a3b8').text('[ Buyer Corporate Stamp & Sign-off ]', buyerSignX + signColWidth - 125, signY + 36, { width: 125, align: 'right' });

      doc.strokeColor('#94a3b8').lineWidth(0.8).dash(3, { space: 2 }).moveTo(buyerSignX, signLineY).lineTo(buyerSignX + signColWidth, signLineY).stroke().undash();
      doc.font(getFont(false)).fontSize(7.5).fillColor('#64748b').text('Authorized Buyer Signature & Date', buyerSignX, signLineY + 5);
      doc.font(getFont(true)).fontSize(8).fillColor('#1e293b').text('Representative: ' + buyerPerson, buyerSignX, signLineY + 16, { continued: true });
      doc.font(getFont(false)).fontSize(7.5).fillColor('#94a3b8').text('   Date: _______________');

      // =========================================================================
      // 7. 页面防伪机打序列号与页脚 (统一计算总页数 Page X of Y)
      // =========================================================================
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        const footerY = 794;
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(startX, footerY).lineTo(startX + pageWidth, footerY).stroke();
        const cleanFooterComp = company.length > 40 ? (company.slice(0, 37) + '...') : company;
        doc.font(getFont(false)).fontSize(7).fillColor('#94a3b8').text(
          `Page ${i + 1} of ${range.count}  |  Quotation Ref: ${quotation.quotationNumber}  |  ${cleanFooterComp}  |  Confidential & Proprietary Commercial Offer`,
          startX,
          footerY + 4,
          { width: pageWidth, align: 'center', lineBreak: false, ellipsis: true }
        );
      }

      doc.end();
    });
  }
}
