const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function createKelvinPricingTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '代码佬Kelvin (KelvinFlow)';
  workbook.lastModifiedBy = '代码佬Kelvin';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Palette definition (Apple/Stripe Inspired Minimalist Luxury)
  const colors = {
    navyDark: '1E293B',    // 深空蓝黑 (主标题/头部)
    techBlue: '2563EB',    // 科技蓝 (关键强调)
    accentAmber: 'D97706', // 琥珀橙 (注意/提示)
    cardBg: 'F8FAFC',      // 浅灰背景
    tableHeader: '0F172A',  // 表头深色
    subHeader: '334155',
    borderLight: 'E2E8F0',
    borderMedium: 'CBD5E1',
    successGreen: '059669', // 安全利润绿
    warningRed: 'DC2626',   // 亏损预警红
    zebraBg: 'F8FAFC'
  };

  // ==========================================
  // SHEET 1: 🔒 内部智能核价台 (业务员专享)
  // ==========================================
  const ws1 = workbook.addWorksheet('🔒 内部智能核价台(业务员专享)', {
    views: [{ showGridLines: true }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
  });

  // Set Column Widths
  ws1.columns = [
    { width: 4 },  // A (Margin)
    { width: 14 }, // B: SKU / 型号
    { width: 22 }, // C: 品名描述
    { width: 12 }, // D: 采购底价(RMB)
    { width: 12 }, // E: 选配工艺(RMB)
    { width: 12 }, // F: 外包装/箱(RMB)
    { width: 10 }, // G: 装箱数(PCS)
    { width: 12 }, // H: 港杂分摊(RMB)
    { width: 14 }, // I: 单件总成本(RMB)
    { width: 12 }, // J: 目标毛利率
    { width: 14 }, // K: 人民币出厂价
    { width: 12 }, // L: 核算汇率
    { width: 16 }, // M: FOB美元单价($)
    { width: 14 }, // N: 单件净利润($)
    { width: 14 }, // O: 利润红线状态
    { width: 4 }   // P (Margin)
  ];

  // Title Banner
  ws1.mergeCells('B2:O2');
  const title1 = ws1.getCell('B2');
  title1.value = '⚡ 2026 外贸智能核价与防泄露控制台 · Kelvin 极客版';
  title1.font = { name: '微软雅黑', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  title1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(2).height = 36;

  // Subtitle / Banner description
  ws1.mergeCells('B3:O3');
  const sub1 = ws1.getCell('B3');
  sub1.value = '【内部保密 · 业务员专享】本表内置动态公式与利润红线防御机制。本表所有成本底价与公式严禁直接发给买家！对外报价请直接复制下一页【对外商业报价单】。';
  sub1.font = { name: '微软雅黑', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
  sub1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  sub1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(3).height = 24;

  // Global Config Cards (Row 5 & 6)
  ws1.mergeCells('B5:D5');
  ws1.getCell('B5').value = '🌐 宏观汇率与港杂设定';
  ws1.getCell('B5').font = { name: '微软雅黑', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  ws1.getCell('B5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  ws1.getCell('B5').alignment = { vertical: 'middle', horizontal: 'center' };

  ws1.mergeCells('F5:H5');
  ws1.getCell('F5').value = '🛡️ 利润安全红线预警';
  ws1.getCell('F5').font = { name: '微软雅黑', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  ws1.getCell('F5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  ws1.getCell('F5').alignment = { vertical: 'middle', horizontal: 'center' };

  ws1.mergeCells('J5:O5');
  ws1.getCell('J5').value = '💡 技术老友 Kelvin 的独家防翻车提示';
  ws1.getCell('J5').font = { name: '微软雅黑', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
  ws1.getCell('J5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  ws1.getCell('J5').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Row 6: Config parameters
  ws1.getCell('B6').value = '实时基准汇率:';
  ws1.getCell('B6').font = { name: '微软雅黑', size: 9 };
  ws1.getCell('B6').alignment = { vertical: 'middle', horizontal: 'right' };
  ws1.getCell('C6').value = 7.20;
  ws1.getCell('C6').numFmt = '0.00';
  ws1.getCell('C6').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF2563EB' } };
  ws1.getCell('C6').alignment = { vertical: 'middle', horizontal: 'center' };

  ws1.getCell('D6').value = '安全核算汇率:';
  ws1.getCell('D6').font = { name: '微软雅黑', size: 9 };
  ws1.getCell('D6').alignment = { vertical: 'middle', horizontal: 'right' };
  // D6 to E6: Safe rate = C6 - 0.15 buffer
  ws1.getCell('E6').value = { formula: 'C6-0.12' };
  ws1.getCell('E6').numFmt = '0.00';
  ws1.getCell('E6').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF059669' } };
  ws1.getCell('E6').alignment = { vertical: 'middle', horizontal: 'center' };

  ws1.getCell('F6').value = '最低毛利底线:';
  ws1.getCell('F6').font = { name: '微软雅黑', size: 9 };
  ws1.getCell('F6').alignment = { vertical: 'middle', horizontal: 'right' };
  ws1.getCell('G6').value = 0.18;
  ws1.getCell('G6').numFmt = '0.0%';
  ws1.getCell('G6').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFDC2626' } };
  ws1.getCell('G6').alignment = { vertical: 'middle', horizontal: 'center' };

  ws1.getCell('H6').value = '单票港杂费基准(RMB):';
  ws1.getCell('H6').font = { name: '微软雅黑', size: 8 };
  ws1.getCell('H6').alignment = { vertical: 'middle', horizontal: 'right' };
  ws1.getCell('I6').value = 1800;
  ws1.getCell('I6').numFmt = '¥#,##0';
  ws1.getCell('I6').font = { name: 'Arial', size: 9, bold: true };
  ws1.getCell('I6').alignment = { vertical: 'middle', horizontal: 'center' };

  ws1.mergeCells('J6:O6');
  ws1.getCell('J6').value = '安全汇率已自动扣减 0.12 安全垫，锁定汇率波动风险；毛利低于 18% 状态栏自动警报！';
  ws1.getCell('J6').font = { name: '微软雅黑', size: 9, color: { argb: 'FF1E40AF' } };
  ws1.getCell('J6').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  ws1.getRow(5).height = 22;
  ws1.getRow(6).height = 24;

  // Table Header (Row 8)
  const headers1 = [
    { col: 'B', label: 'SKU / 产品型号' },
    { col: 'C', label: '产品英文描述' },
    { col: 'D', label: '工厂底价 (¥)' },
    { col: 'E', label: '选配工艺加价 (¥)' },
    { col: 'F', label: '外箱包装费 (¥)' },
    { col: 'G', label: '单箱装量(PCS)' },
    { col: 'H', label: '单件港杂分摊(¥)' },
    { col: 'I', label: '单件综合成本(¥)' },
    { col: 'J', label: '目标毛利率' },
    { col: 'K', label: '出厂人民币单价' },
    { col: 'L', label: '核算汇率' },
    { col: 'M', label: 'FOB美元单价 ($)' },
    { col: 'N', label: '单件利润 ($)' },
    { col: 'O', label: '利润红线状态' }
  ];

  ws1.getRow(8).height = 28;
  headers1.forEach(h => {
    const cell = ws1.getCell(`${h.col}8`);
    cell.value = h.label;
    cell.font = { name: '微软雅黑', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF2563EB' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

  // Sample Data Rows (9 to 14)
  const sampleData = [
    { sku: 'ST-2026-PRO', desc: 'Ergonomic Laptop Stand (Alu)', baseCost: 45.0, addon: 3.5, packCost: 8.0, pcsPerCtn: 10, portFeePerPiece: 1.2, margin: 0.28 },
    { sku: 'ST-2026-LITE', desc: 'Foldable Metal Phone Holder', baseCost: 16.5, addon: 1.0, packCost: 4.5, pcsPerCtn: 20, portFeePerPiece: 0.6, margin: 0.25 },
    { sku: 'ERG-ARM-V2', desc: 'Heavy Duty Dual Monitor Arm', baseCost: 125.0, addon: 8.0, packCost: 18.0, pcsPerCtn: 2, portFeePerPiece: 3.5, margin: 0.32 },
    { sku: 'AL-BASE-99', desc: 'Die-cast Aluminum Base Mount', baseCost: 38.0, addon: 2.0, packCost: 6.0, pcsPerCtn: 8, portFeePerPiece: 1.0, margin: 0.15 }, // Low margin trigger
    { sku: 'HD-ARM-08', desc: 'Gas Spring Articulating Arm', baseCost: 82.0, addon: 5.0, packCost: 12.0, pcsPerCtn: 4, portFeePerPiece: 2.2, margin: 0.22 },
    { sku: 'CUSTOM-SPEC-01', desc: 'OEM Matte Black Desk Converter', baseCost: 210.0, addon: 15.0, packCost: 35.0, pcsPerCtn: 1, portFeePerPiece: 8.0, margin: 0.12 } // Danger trigger
  ];

  sampleData.forEach((item, index) => {
    const rowNum = 9 + index;
    const isZebra = index % 2 === 1;
    const row = ws1.getRow(rowNum);
    row.height = 24;

    ws1.getCell(`B${rowNum}`).value = item.sku;
    ws1.getCell(`C${rowNum}`).value = item.desc;
    ws1.getCell(`D${rowNum}`).value = item.baseCost;
    ws1.getCell(`E${rowNum}`).value = item.addon;
    ws1.getCell(`F${rowNum}`).value = item.packCost;
    ws1.getCell(`G${rowNum}`).value = item.pcsPerCtn;
    ws1.getCell(`H${rowNum}`).value = item.portFeePerPiece;

    // Formula I: 单件综合成本 = 工厂底价 + 选配工艺 + (外箱包装费 / 装箱数) + 单件港杂分摊
    ws1.getCell(`I${rowNum}`).value = { formula: `D${rowNum}+E${rowNum}+(F${rowNum}/G${rowNum})+H${rowNum}` };

    // Target margin
    ws1.getCell(`J${rowNum}`).value = item.margin;

    // Formula K: 出厂人民币单价 = 综合成本 / (1 - 目标毛利)
    ws1.getCell(`K${rowNum}`).value = { formula: `I${rowNum}/(1-J${rowNum})` };

    // Formula L: 核算汇率 (引用全局安全汇率 $E$6)
    ws1.getCell(`L${rowNum}`).value = { formula: `$E$6` };

    // Formula M: FOB 美元单价 = 出厂人民币单价 / 核算汇率
    ws1.getCell(`M${rowNum}`).value = { formula: `ROUND(K${rowNum}/L${rowNum}, 2)` };

    // Formula N: 单件净利润($) = (出厂人民币单价 - 综合成本) / 核算汇率
    ws1.getCell(`N${rowNum}`).value = { formula: `ROUND((K${rowNum}-I${rowNum})/L${rowNum}, 2)` };

    // Formula O: 利润红线状态判断
    ws1.getCell(`O${rowNum}`).value = {
      formula: `IF(J${rowNum}<$G$6, "🚨 警报:低于红线", IF(J${rowNum}>=0.25, "✅ 健康高毛利", "⚠️ 勉强保本"))`
    };

    // Number formats
    ws1.getCell(`B${rowNum}`).font = { name: 'Consolas', size: 9, bold: true };
    ws1.getCell(`C${rowNum}`).font = { name: '微软雅黑', size: 9 };
    ws1.getCell(`D${rowNum}`).numFmt = '¥#,##0.00';
    ws1.getCell(`E${rowNum}`).numFmt = '¥#,##0.00';
    ws1.getCell(`F${rowNum}`).numFmt = '¥#,##0.00';
    ws1.getCell(`G${rowNum}`).numFmt = '#,##0';
    ws1.getCell(`H${rowNum}`).numFmt = '¥#,##0.00';
    ws1.getCell(`I${rowNum}`).numFmt = '¥#,##0.00';
    ws1.getCell(`I${rowNum}`).font = { bold: true };
    ws1.getCell(`J${rowNum}`).numFmt = '0.0%';
    ws1.getCell(`J${rowNum}`).font = { bold: true, color: { argb: item.margin < 0.18 ? 'FFDC2626' : 'FF059669' } };
    ws1.getCell(`K${rowNum}`).numFmt = '¥#,##0.00';
    ws1.getCell(`L${rowNum}`).numFmt = '0.00';
    ws1.getCell(`M${rowNum}`).numFmt = '$#,##0.00';
    ws1.getCell(`M${rowNum}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1D4ED8' } };
    ws1.getCell(`N${rowNum}`).numFmt = '$#,##0.00';
    ws1.getCell(`N${rowNum}`).font = { name: 'Arial', size: 9, color: { argb: 'FF059669' } };
    ws1.getCell(`O${rowNum}`).font = { name: '微软雅黑', size: 9, bold: true };

    // Alignment and zebra styling
    const cols = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
    cols.forEach(c => {
      const cell = ws1.getCell(`${c}${rowNum}`);
      if (['B', 'O'].includes(c)) cell.alignment = { vertical: 'middle', horizontal: 'center' };
      else if (['C'].includes(c)) cell.alignment = { vertical: 'middle', horizontal: 'left' };
      else cell.alignment = { vertical: 'middle', horizontal: 'right' };

      if (!cell.fill && isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // Container Packing Calculator Sub-Panel (Row 16 to 22)
  ws1.mergeCells('B16:O16');
  const packTitle = ws1.getCell('B16');
  packTitle.value = '📦 智能柜型装载与 CBM 体积自动速算器 (输入外箱尺寸，秒出 20GP / 40GP / 40HQ 柜量)';
  packTitle.font = { name: '微软雅黑', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  packTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  packTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(16).height = 26;

  const packHeaders = [
    { col: 'B', label: 'SKU / 型号' },
    { col: 'C', label: '箱长 L (cm)' },
    { col: 'D', label: '箱宽 W (cm)' },
    { col: 'E', label: '箱高 H (cm)' },
    { col: 'F', label: '单箱体积 (CBM)' },
    { col: 'G', label: '单箱毛重 (KG)' },
    { col: 'H', label: '每箱装量' },
    { col: 'I', label: '20GP装箱数(28m³)' },
    { col: 'J', label: '20GP总件数(PCS)' },
    { col: 'K', label: '40GP装箱数(58m³)' },
    { col: 'L', label: '40GP总件数(PCS)' },
    { col: 'M', label: '40HQ装箱数(68m³)' },
    { col: 'N', label: '40HQ总件数(PCS)' },
    { col: 'O', label: '装柜空间利用评估' }
  ];

  ws1.getRow(17).height = 24;
  packHeaders.forEach(h => {
    const cell = ws1.getCell(`${h.col}17`);
    cell.value = h.label;
    cell.font = { name: '微软雅黑', size: 8, bold: true, color: { argb: 'FF1E293B' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  const packSample = [
    { sku: 'ST-2026-PRO', l: 45, w: 32, h: 28, gw: 12.5, pcs: 10 },
    { sku: 'ST-2026-LITE', l: 30, w: 25, h: 20, gw: 8.0, pcs: 20 },
    { sku: 'ERG-ARM-V2', l: 65, w: 42, h: 35, gw: 18.2, pcs: 2 }
  ];

  packSample.forEach((item, idx) => {
    const r = 18 + idx;
    ws1.getRow(r).height = 22;

    ws1.getCell(`B${r}`).value = item.sku;
    ws1.getCell(`C${r}`).value = item.l;
    ws1.getCell(`D${r}`).value = item.w;
    ws1.getCell(`E${r}`).value = item.h;
    // CBM = L * W * H / 1000000
    ws1.getCell(`F${r}`).value = { formula: `ROUND(C${r}*D${r}*E${r}/1000000, 4)` };
    ws1.getCell(`G${r}`).value = item.gw;
    ws1.getCell(`H${r}`).value = item.pcs;
    // 20GP (28 CBM effective)
    ws1.getCell(`I${r}`).value = { formula: `INT(28/F${r})` };
    ws1.getCell(`J${r}`).value = { formula: `I${r}*H${r}` };
    // 40GP (58 CBM effective)
    ws1.getCell(`K${r}`).value = { formula: `INT(58/F${r})` };
    ws1.getCell(`L${r}`).value = { formula: `K${r}*H${r}` };
    // 40HQ (68 CBM effective)
    ws1.getCell(`M${r}`).value = { formula: `INT(68/F${r})` };
    ws1.getCell(`N${r}`).value = { formula: `M${r}*H${r}` };
    ws1.getCell(`O${r}`).value = '🟢 满柜出货推荐';

    // Formatting
    ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'].forEach(c => {
      const cell = ws1.getCell(`${c}${r}`);
      cell.font = { name: '微软雅黑', size: 9 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
    ws1.getCell(`F${r}`).numFmt = '0.0000';
    ws1.getCell(`I${r}`).numFmt = '#,##0';
    ws1.getCell(`J${r}`).numFmt = '#,##0';
    ws1.getCell(`K${r}`).numFmt = '#,##0';
    ws1.getCell(`L${r}`).numFmt = '#,##0';
    ws1.getCell(`M${r}`).numFmt = '#,##0';
    ws1.getCell(`N${r}`).numFmt = '#,##0';
    ws1.getCell(`J${r}`).font = { name: 'Arial', bold: true, color: { argb: 'FF1D4ED8' } };
    ws1.getCell(`N${r}`).font = { name: 'Arial', bold: true, color: { argb: 'FF059669' } };
  });

  // Kelvin's Bottom Gift & Automation Easter Egg (Row 24 to 26)
  ws1.mergeCells('B24:O25');
  const footerCard = ws1.getCell('B24');
  footerCard.value = '💡 技术老友 Kelvin 的心里话：\n亲爱的外贸朋友，如果你还在每天手动算几十个复杂 SKU、或者买家总发长篇英文邮件询价让你头大，试试我为你写好的免费 AI 自动审单引擎 KelvinFlow (https://kelvinflow.com)。复制邮件 10 秒全自动拆解 SKU、匹配底价并生成纯英文正式 PDF 报价单！小红书群友终身享受限时首月 ¥39 破冰特权，免审开通 7 天试用！微信: KelvinFlow (备注“小红书群友”)';
  footerCard.font = { name: '微软雅黑', size: 9, bold: true, color: { argb: 'FF1E293B' } };
  footerCard.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Warm Amber Card
  footerCard.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
  ws1.getRow(24).height = 26;
  ws1.getRow(25).height = 26;


  // ==========================================
  // SHEET 2: 📄 对外商业报价单 (纯净无成本导出)
  // ==========================================
  const ws2 = workbook.addWorksheet('📄 对外商业报价单(纯净导出)', {
    views: [{ showGridLines: true }],
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true }
  });

  ws2.columns = [
    { width: 4 },  // A Margin
    { width: 8 },  // B: No.
    { width: 18 }, // C: Item Model / SKU
    { width: 34 }, // D: Product Description & Specifications
    { width: 12 }, // E: Unit
    { width: 12 }, // F: MOQ
    { width: 16 }, // G: FOB Price (USD)
    { width: 16 }, // H: Lead Time
    { width: 4 }   // I Margin
  ];

  // Professional Header
  ws2.mergeCells('B2:H2');
  const docHeader = ws2.getCell('B2');
  docHeader.value = 'GLOBAL EXPORT FORMAL QUOTATION';
  docHeader.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1E293B' } };
  docHeader.alignment = { vertical: 'middle', horizontal: 'center' };
  ws2.getRow(2).height = 36;

  ws2.mergeCells('B3:H3');
  const docSub = ws2.getCell('B3');
  docSub.value = 'Commercial Offer & Export Terms · Valid for 15 Days from Issue Date';
  docSub.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  docSub.alignment = { vertical: 'middle', horizontal: 'center' };
  ws2.getRow(3).height = 18;

  // Business Metadata Grid
  ws2.mergeCells('B5:D5');
  ws2.getCell('B5').value = 'Supplier: ACME Hardware & Ergonomics Co., Ltd.';
  ws2.getCell('B5').font = { name: 'Arial', size: 9, bold: true };

  ws2.mergeCells('F5:H5');
  ws2.getCell('F5').value = 'Quote Ref: QT-2026-EXP-' + Math.floor(1000 + Math.random()*9000);
  ws2.getCell('F5').font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF2563EB' } };
  ws2.getCell('F5').alignment = { horizontal: 'right' };

  ws2.mergeCells('B6:D6');
  ws2.getCell('B6').value = 'Port of Loading: Shenzhen / Guangzhou Port, China';
  ws2.getCell('B6').font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };

  ws2.mergeCells('F6:H6');
  ws2.getCell('F6').value = 'Trade Term: FOB Shenzhen (Incoterms 2020)';
  ws2.getCell('F6').font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };
  ws2.getCell('F6').alignment = { horizontal: 'right' };

  ws2.mergeCells('B7:D7');
  ws2.getCell('B7').value = 'Currency: United States Dollar (USD)';
  ws2.getCell('B7').font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };

  ws2.mergeCells('F7:H7');
  ws2.getCell('F7').value = 'Payment Term: 30% T/T Deposit, 70% Balance Before Shipment';
  ws2.getCell('F7').font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };
  ws2.getCell('F7').alignment = { horizontal: 'right' };

  // Quotation Table Header
  const headers2 = [
    { col: 'B', label: 'Item' },
    { col: 'C', label: 'Model No.' },
    { col: 'D', label: 'Description & Detailed Specs' },
    { col: 'E', label: 'Unit' },
    { col: 'F', label: 'MOQ' },
    { col: 'G', label: 'FOB Price (USD)' },
    { col: 'H', label: 'Lead Time' }
  ];

  ws2.getRow(9).height = 26;
  headers2.forEach(h => {
    const cell = ws2.getCell(`${h.col}9`);
    cell.value = h.label;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'medium', color: { argb: 'FF2563EB' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

  // Rows referencing Sheet 1 purely for safe public prices
  for (let i = 0; i < sampleData.length; i++) {
    const r2 = 10 + i;
    const r1 = 9 + i;
    ws2.getRow(r2).height = 24;

    ws2.getCell(`B${r2}`).value = i + 1;
    // Model No references Sheet 1 SKU
    ws2.getCell(`C${r2}`).value = { formula: `'🔒 内部智能核价台(业务员专享)'!B${r1}` };
    // Description references Sheet 1 Desc
    ws2.getCell(`D${r2}`).value = { formula: `'🔒 内部智能核价台(业务员专享)'!C${r1}` };
    ws2.getCell(`E${r2}`).value = 'PCS';
    ws2.getCell(`F${r2}`).value = 500;
    // FOB Price references Sheet 1 M column directly (SAFE CLEAN PRICE!)
    ws2.getCell(`G${r2}`).value = { formula: `'🔒 内部智能核价台(业务员专享)'!M${r1}` };
    ws2.getCell(`H${r2}`).value = '15-20 Days';

    ws2.getCell(`B${r2}`).alignment = { vertical: 'middle', horizontal: 'center' };
    ws2.getCell(`C${r2}`).font = { name: 'Arial', size: 9, bold: true };
    ws2.getCell(`C${r2}`).alignment = { vertical: 'middle', horizontal: 'center' };
    ws2.getCell(`D${r2}`).font = { name: 'Arial', size: 9 };
    ws2.getCell(`D${r2}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws2.getCell(`E${r2}`).alignment = { vertical: 'middle', horizontal: 'center' };
    ws2.getCell(`F${r2}`).numFmt = '#,##0';
    ws2.getCell(`F${r2}`).alignment = { vertical: 'middle', horizontal: 'center' };
    ws2.getCell(`G${r2}`).numFmt = '$#,##0.00';
    ws2.getCell(`G${r2}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1D4ED8' } };
    ws2.getCell(`G${r2}`).alignment = { vertical: 'middle', horizontal: 'right' };
    ws2.getCell(`H${r2}`).alignment = { vertical: 'middle', horizontal: 'center' };

    ['B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(c => {
      const cell = ws2.getCell(`${c}${r2}`);
      if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  }

  // Footer notes on Quotation sheet
  const footerRow = 10 + sampleData.length + 1;
  ws2.mergeCells(`B${footerRow}:H${footerRow + 2}`);
  const termsCell = ws2.getCell(`B${footerRow}`);
  termsCell.value = 'Remarks & Standard Terms:\n1. Quotation based on full carton packing. Customized packaging and branding available upon request.\n2. Prices are valid for 15 days due to raw material and international currency fluctuations.\n3. Inspection: Standard AQL Level II (Major 1.5, Minor 4.0) before container loading.';
  termsCell.font = { name: 'Arial', size: 8, color: { argb: 'FF64748B' } };
  termsCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };

  // Write file
  const outputPath = path.join(__dirname, '../media_vault/lead_magnets/2026_外贸防泄露自动核价模板_Kelvin极客版.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ 成功生成极客高颜值模板: ${outputPath}`);
}

createKelvinPricingTemplate().catch(err => {
  console.error('❌ 生成失败:', err);
  process.exit(1);
});
