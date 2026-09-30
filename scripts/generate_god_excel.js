import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

async function buildGodExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KelvinFlow 自动化实验室';
  workbook.lastModifiedBy = 'KelvinFlow';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ----------------------------------------------------
  // Sheet 1: 使用指南与自动化工具彩蛋
  // ----------------------------------------------------
  const guideSheet = workbook.addWorksheet('📌使用指南与提效神器', {
    views: [{ showGridLines: true }]
  });

  guideSheet.columns = [
    { width: 5 },
    { width: 28 },
    { width: 55 },
    { width: 25 }
  ];

  guideSheet.mergeCells('B2:C2');
  const titleCell = guideSheet.getCell('B2');
  titleCell.value = '【2026 外贸自动核价 Excel 神表】使用指南';
  titleCell.font = { name: '微软雅黑', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  guideSheet.getRow(2).height = 40;

  const guideRows = [
    ['', '核心设计目的', '帮助外贸业务员/老板告别错算漏算，一键实现阶梯底价匹配、汇率安全折算、港口运费分摊。'],
    ['', '绿色单元格含义', '【用户输入区】只有绿色底色的单元格需要你手工填写或选择（如客户数量、期望毛利）。'],
    ['', '黄色单元格含义', '【自动计算区】已预置外贸标准公式（VLOOKUP、阶梯判断），切勿随意修改公式。'],
    ['', '底层数学公式', '外贸精准美元单价 = [ (阶梯底价 + 选配加价) × (1 + 毛利率) + 港杂运费单件分摊 ] ÷ 汇率'],
    ['', '作者与版权说明', '由 KelvinFlow 自动化实验室精心打磨开源，禁止二次倒卖。'],
    ['', '【🚀 终极提效彩蛋】', '如果您每天收到多封询盘，厌倦了每次打开 Excel 手工核对输入...'],
    ['', '全自动 AI 核价中枢', '欢迎体验 KelvinFlow AI 引擎：海外买家英文邮件一到，AI 3分钟自动对齐底价生成专业 PDF！'],
    ['', '体验官网', 'https://quote.kelvinflow.com （联系创始人微信可免费协助跑测一份复杂询盘）']
  ];

  guideRows.forEach((row, idx) => {
    const rowNum = idx + 4;
    guideSheet.getRow(rowNum).values = row;
    const keyCell = guideSheet.getCell(`B${rowNum}`);
    const valCell = guideSheet.getCell(`C${rowNum}`);
    keyCell.font = { name: '微软雅黑', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    keyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    valCell.font = { name: '微软雅黑', size: 11, color: { argb: 'FF334155' } };
    guideSheet.getRow(rowNum).height = 28;
  });

  // ----------------------------------------------------
  // Sheet 2: 核心商品底价与阶梯表 (Price_List)
  // ----------------------------------------------------
  const priceSheet = workbook.addWorksheet('1-商品底价与阶梯库', {
    views: [{ showGridLines: true }]
  });

  priceSheet.columns = [
    { header: '产品SKU', key: 'sku', width: 16 },
    { header: '品名及规格描述', key: 'name', width: 32 },
    { header: '标准出厂底价(RMB)', key: 'basePrice', width: 18 },
    { header: '起订量(MOQ)', key: 'moq', width: 14 },
    { header: '阶梯2数量(Tier2)', key: 't2Qty', width: 16 },
    { header: '阶梯2特惠底价(RMB)', key: 't2Price', width: 18 },
    { header: '阶梯3数量(Tier3)', key: 't3Qty', width: 16 },
    { header: '阶梯3整柜底价(RMB)', key: 't3Price', width: 18 },
    { header: '每箱装量(PCS)', key: 'pcsCtn', width: 14 },
    { header: '每箱体积(CBM)', key: 'cbmCtn', width: 14 },
    { header: '每箱毛重(KG)', key: 'gwCtn', width: 14 }
  ];

  priceSheet.getRow(1).height = 30;
  priceSheet.getRow(1).font = { name: '微软雅黑', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  priceSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  priceSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  const priceItems = [
    { sku: 'ST-2026-A', name: '双屏重型人体工学显示器支架', basePrice: 95.0, moq: 100, t2Qty: 2000, t2Price: 85.0, t3Qty: 5000, t3Price: 78.0, pcsCtn: 4, cbmCtn: 0.045, gwCtn: 16.5 },
    { sku: 'ST-2026-B', name: '单屏桌面机械臂高配版', basePrice: 65.0, moq: 100, t2Qty: 1000, t2Price: 58.0, t3Qty: 3000, t3Price: 52.0, pcsCtn: 6, cbmCtn: 0.038, gwCtn: 12.0 },
    { sku: 'ERG-PRO-V2', name: '双电机电动智能升降桌架', basePrice: 380.0, moq: 50, t2Qty: 500, t2Price: 350.0, t3Qty: 1000, t3Price: 320.0, pcsCtn: 1, cbmCtn: 0.085, gwCtn: 28.0 },
    { sku: 'AL-BASE-99', name: '高强度压铸铝合金转盘底座', basePrice: 48.0, moq: 200, t2Qty: 1000, t2Price: 42.0, t3Qty: 5000, t3Price: 38.0, pcsCtn: 10, cbmCtn: 0.025, gwCtn: 18.0 },
    { sku: 'HD-ARM-08', name: '加强型气弹簧阻尼升降臂', basePrice: 52.0, moq: 200, t2Qty: 1500, t2Price: 46.0, t3Qty: 4000, t3Price: 40.0, pcsCtn: 8, cbmCtn: 0.032, gwCtn: 15.0 }
  ];

  priceItems.forEach(item => {
    const row = priceSheet.addRow(item);
    row.height = 24;
    row.font = { name: '微软雅黑', size: 10 };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // ----------------------------------------------------
  // Sheet 3: 工艺选配加价库 (Addons)
  // ----------------------------------------------------
  const addonSheet = workbook.addWorksheet('2-选配工艺加价库', {
    views: [{ showGridLines: true }]
  });

  addonSheet.columns = [
    { header: '选配编码', key: 'code', width: 14 },
    { header: '工艺/选配名称', key: 'name', width: 28 },
    { header: '加价金额(RMB/件)', key: 'price', width: 18 },
    { header: '适用产品类别', key: 'scope', width: 22 },
    { header: '说明', key: 'desc', width: 30 }
  ];

  addonSheet.getRow(1).height = 30;
  addonSheet.getRow(1).font = { name: '微软雅黑', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  addonSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
  addonSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  const addonItems = [
    { code: 'OPT-LOGO-01', name: '高精度激光打标 Logo', price: 1.5, scope: '全系列通用', desc: '底座或外壳镭雕买家品牌标识' },
    { code: 'OPT-COLOR-BOX', name: '5层特硬出口定制彩盒', price: 2.0, scope: '全系列通用', desc: '买家提供刀版图及印刷文件' },
    { code: 'OPT-MATTE-BLK', name: '哑光黑静电粉末喷涂', price: 8.0, scope: '升降桌架 / 支架', desc: '耐刮防指纹特种涂层' },
    { code: 'OPT-GYRO-SEN', name: '六轴陀螺仪防撞感应器', price: 20.0, scope: '电动升降桌', desc: '升降遇阻力即刻回弹安全模块' },
    { code: 'OPT-ANODIZED', name: '阳极氧化深空灰表面处理', price: 4.0, scope: '铝合金底座', desc: '高端质感抗氧化防腐蚀' }
  ];

  addonItems.forEach(item => {
    const row = addonSheet.addRow(item);
    row.height = 24;
    row.font = { name: '微软雅黑', size: 10 };
    row.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // ----------------------------------------------------
  // Sheet 4: 极速交互核价计算台 (Quotation_Calculator)
  // ----------------------------------------------------
  const calcSheet = workbook.addWorksheet('3-外贸精准核价计算台', {
    views: [{ showGridLines: true }]
  });

  calcSheet.columns = [
    { width: 4 },
    { width: 24 },
    { width: 32 },
    { width: 30 }
  ];

  calcSheet.mergeCells('B2:D2');
  const calcTitle = calcSheet.getCell('B2');
  calcTitle.value = '⚡ 外贸即时核价模拟出单台 (绿色填入，黄色自动秒出)';
  calcTitle.font = { name: '微软雅黑', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  calcTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  calcTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  calcSheet.getRow(2).height = 36;

  // 用户输入参数配置
  const inputs = [
    ['B4', '产品型号 (SKU)', 'ST-2026-A', '从底价库中选择输入型号'],
    ['B5', '买家询盘采购数量 (PCS)', 2500, '输入本次询盘实际采购量'],
    ['B6', '目标销售毛利率 (Profit)', 0.25, '建议设置 0.20 - 0.35 之间'],
    ['B7', '当前美元结算汇率 (USD/RMB)', 7.20, '系统建议使用中行折算价'],
    ['B8', '工艺选配 1 加价 (RMB)', 1.5, '例如激光刻标 (可填 0)'],
    ['B9', '工艺选配 2 加价 (RMB)', 2.0, '例如定制彩盒 (可填 0)'],
    ['B10', '整单单件预估海运港杂 (RMB)', 0.85, 'FOB/CIF 港杂按体积平摊单件成本']
  ];

  inputs.forEach(([cellPos, label, defaultVal, tip]) => {
    const rowNum = parseInt(cellPos.replace('B', ''));
    calcSheet.getCell(`B${rowNum}`).value = label;
    calcSheet.getCell(`B${rowNum}`).font = { name: '微软雅黑', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    calcSheet.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

    const inputCell = calcSheet.getCell(`C${rowNum}`);
    inputCell.value = defaultVal;
    inputCell.font = { name: '微软雅黑', size: 11, bold: true, color: { argb: 'FF065F46' } };
    inputCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // 浅绿色底
    inputCell.alignment = { horizontal: 'center' };

    calcSheet.getCell(`D${rowNum}`).value = tip;
    calcSheet.getCell(`D${rowNum}`).font = { name: '微软雅黑', size: 9, color: { argb: 'FF64748B' } };
    calcSheet.getRow(rowNum).height = 26;
  });

  // 格式化特定单元格
  calcSheet.getCell('C6').numFmt = '0.0%';
  calcSheet.getCell('C7').numFmt = '0.00';

  // 计算输出分割行
  calcSheet.mergeCells('B12:D12');
  const outHeader = calcSheet.getCell('B12');
  outHeader.value = '📊 自动核算核心结果 (公式已锁定联动)';
  outHeader.font = { name: '微软雅黑', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  outHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
  outHeader.alignment = { vertical: 'middle', horizontal: 'center' };
  calcSheet.getRow(12).height = 28;

  // 自动公式计算行
  const outputs = [
    [
      'B14',
      '命中梯度底价 (RMB/件)',
      // 智能阶梯判断公式：如果数量>=阶梯3数量则返回阶梯3价，若>=阶梯2数量则返回阶梯2价，否则返回标准底价
      `=IF(C5>=VLOOKUP(C4,'1-商品底价与阶梯库'!A2:H10,7,FALSE), VLOOKUP(C4,'1-商品底价与阶梯库'!A2:H10,8,FALSE), IF(C5>=VLOOKUP(C4,'1-商品底价与阶梯库'!A2:H10,5,FALSE), VLOOKUP(C4,'1-商品底价与阶梯库'!A2:H10,6,FALSE), VLOOKUP(C4,'1-商品底价与阶梯库'!A2:H10,3,FALSE)))`,
      '自动根据数量命中阶梯优惠底价'
    ],
    [
      'B15',
      '单件出厂含选配成本 (RMB)',
      `=C14+C8+C9`,
      '底价 + 所有选配工艺加价'
    ],
    [
      'B16',
      '外贸精准 FOB 单价 (USD)',
      // (单件成本 * (1 + 毛利率) + 港杂) / 汇率
      `=ROUND(((C15 * (1 + C6)) + C10) / C7, 2)`,
      '【正式报价单使用的美金单价】'
    ],
    [
      'B17',
      '本次订单总金额 (USD)',
      `=ROUND(C16 * C5, 2)`,
      '总报价金额 = 单价 × 采购数量'
    ],
    [
      'B18',
      '本次订单预计毛利 (RMB)',
      `=ROUND((C16 * C7 - C15 - C10) * C5, 0)`,
      '扣除底价与杂费后的实际毛利'
    ]
  ];

  outputs.forEach(([cellPos, label, formula, desc]) => {
    const rowNum = parseInt(cellPos.replace('B', ''));
    calcSheet.getCell(`B${rowNum}`).value = label;
    calcSheet.getCell(`B${rowNum}`).font = { name: '微软雅黑', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    calcSheet.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

    const outCell = calcSheet.getCell(`C${rowNum}`);
    outCell.value = { formula: formula };
    outCell.font = { name: '微软雅黑', size: 12, bold: true, color: { argb: 'FF92400E' } };
    outCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // 浅黄色自动区
    outCell.alignment = { horizontal: 'center' };

    calcSheet.getCell(`D${rowNum}`).value = desc;
    calcSheet.getCell(`D${rowNum}`).font = { name: '微软雅黑', size: 9, color: { argb: 'FF78350F' } };
    calcSheet.getRow(rowNum).height = 30;
  });

  // 格式化输出金额
  calcSheet.getCell('C14').numFmt = '¥#,##0.00';
  calcSheet.getCell('C15').numFmt = '¥#,##0.00';
  calcSheet.getCell('C16').numFmt = '$#,##0.00';
  calcSheet.getCell('C17').numFmt = '$#,##0.00';
  calcSheet.getCell('C18').numFmt = '¥#,##0';

  // 保存输出文件
  const outputDir = path.join(process.cwd(), 'media_vault', 'lead_magnets');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, '2026_外贸自动核价Excel神表.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ [成功生成 Excel 神表]: ${outputPath}`);
}

buildGodExcel().catch(err => {
  console.error('❌ 生成失败:', err);
  process.exit(1);
});
