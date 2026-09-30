const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function buildMinimalWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AI外贸数字员工';
  wb.lastModifiedBy = 'AI外贸报价大脑';
  wb.created = new Date();
  wb.modified = new Date();

  const FONT_FAMILY = 'Microsoft YaHei';
  const BORDER_STYLE = {
    top: { style: 'thin', color: { argb: 'CBD5E1' } },
    left: { style: 'thin', color: { argb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
    right: { style: 'thin', color: { argb: 'CBD5E1' } }
  };

  const ws = wb.addWorksheet('商品底价库 (Products)');
  // 冻结前 6 行
  ws.views = [{ showGridLines: true, state: 'frozen', ySplit: 6, xSplit: 0 }];

  // 1. 顶部大标题 (Row 1)
  ws.mergeCells('A1:J1');
  const titleCell = ws.getCell('A1');
  titleCell.value = '🏭 我司外贸出厂底价表与核算控制台 (单表极简版)';
  titleCell.font = { name: FONT_FAMILY, size: 13, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 36;

  // 2. 使用指引说明 (Row 2)
  ws.mergeCells('A2:J2');
  const descCell = ws.getCell('A2');
  descCell.value = '💡 使用说明：下方第 3~4 行为【老板全局控制区】，设置好后全厂通用；老外询盘时 AI 自动按此汇率与商务条款核算报价。若底价已加保底利润，毛利率填 0% 即可。第 6 行为商品清单（前 3 列必填，后 7 列选填；留空自动继承老板全局规则）。';
  descCell.font = { name: FONT_FAMILY, size: 9.5, color: { argb: '475569' } };
  descCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
  descCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 28;

  // 3. 老板全局控制区表头 (Row 3, 10 列)
  const controlHeaders = [
    '默认主币种 (Currency)',
    '美元汇率 (USD/RMB)',
    '欧元汇率 (EUR/RMB)',
    '英镑汇率 (GBP/RMB)',
    '全厂默认加价毛利 (%)',
    '默认交货条款 (Incoterm)',
    '默认付款方式 (Payment)',
    '报价有效期 (Validity)',
    '默认生产交期 (Lead Time)',
    '样品政策 (Sample Policy)'
  ];
  ws.getRow(3).values = controlHeaders;
  ws.getRow(3).height = 32;

  // 4. 老板全局控制区数值 (Row 4, 10 列)
  const controlValues = [
    'USD',
    7.20,
    7.85,
    9.10,
    '20%',
    'FOB Shenzhen Port',
    '30% T/T Deposit, 70% Balance before shipment',
    '30 Days',
    '25-30 Days after deposit',
    'Double unit price, refundable upon bulk order'
  ];
  ws.getRow(4).values = controlValues;
  ws.getRow(4).height = 34;

  // 5. 分割指示行 (Row 5)
  ws.mergeCells('A5:J5');
  const divCell = ws.getCell('A5');
  divCell.value = '📦 产品底价明细库 (前 3 列必填，后 7 列选填；留空将自动继承上方老板全局规则)';
  divCell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: '1E293B' } };
  divCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
  divCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(5).height = 28;

  // 6. 商品明细表头 (Row 6, 10 列)
  const productHeaders = [
    '产品型号 / SKU (必填)',
    '产品英文品名与规格描述 (必填)',
    '出厂底价 (RMB Cost·必填安全底价)',
    '最低起订量 MOQ (PCS·选填)',
    '单箱装量 (PCS/CTN·选填)',
    '外箱体积 (CBM/CTN·选填)',
    '单箱毛重 G.W. (kg/CTN·选填)',
    '该款指定毛利 (%·选填·留空走全局)',
    '该款指定交期 (选填·留空走全局)',
    '海关编码 HS Code (选填)'
  ];
  ws.getRow(6).values = productHeaders;
  ws.getRow(6).height = 36;

  // 7. 示范商品数据行 (Row 7 - 11)
  const sampleItems = [
    ['ST-2026-A', 'Aluminum Alloy Precision Bracket (铝合金精密五金支架)', 15.50, 500, 50, 0.045, 14.5, '', '20-25 Days', '7616.99.9000'],
    ['ST-2026-B', 'Stainless Steel Hex Fastener Screws (不锈钢沉头紧固件螺丝)', 0.85, 5000, 1000, 0.020, 18.0, '15%', '', '7318.15.9000'],
    ['ERG-PRO-V2', 'Ergonomic Mesh Office Chair (高档网布人体工学办公椅)', 185.00, 50, 1, 0.160, 16.2, '25%', '30-35 Days', '9401.30.0000'],
    ['AL-BASE-99', 'Die-casting Aluminum 5-Star Base (高压铸铝合金五星椅脚)', 38.00, 200, 5, 0.080, 11.0, '', '', '9401.90.9000'],
    ['HD-ARM-08', '3D Adjustable PU Armrest Set (3D多功能升降PU扶手套装)', 24.00, 300, 20, 0.055, 9.5, '', '', '9401.90.9000']
  ];
  sampleItems.forEach(item => ws.addRow(item));

  // 设定列宽
  ws.columns = [
    { width: 24 }, // Col 1: SKU
    { width: 48 }, // Col 2: Name
    { width: 30 }, // Col 3: Base Price RMB
    { width: 22 }, // Col 4: MOQ
    { width: 22 }, // Col 5: PCS/CTN
    { width: 22 }, // Col 6: CBM/CTN
    { width: 24 }, // Col 7: G.W. kg/CTN
    { width: 26 }, // Col 8: Specific Margin
    { width: 26 }, // Col 9: Specific Lead Time
    { width: 24 }  // Col 10: HS Code
  ];

  // 美化各行各列单元格
  // Row 3: 老板控制区表头
  ws.getRow(3).eachCell({ includeEmpty: true }, (cell) => {
    cell.border = BORDER_STYLE;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } }; // 淡蓝
    cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: '1E3A8A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  // Row 4: 老板控制区数值
  ws.getRow(4).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.border = BORDER_STYLE;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } }; // 极浅蓝高亮
    cell.font = { name: FONT_FAMILY, size: 10.5, bold: true, color: { argb: '1E40AF' } };
    const isLongText = colNumber >= 6;
    cell.alignment = {
      vertical: 'middle',
      horizontal: isLongText ? 'left' : 'center',
      wrapText: true
    };
  });

  // Row 6: 产品明细表头
  ws.getRow(6).eachCell({ includeEmpty: true }, (cell) => {
    cell.border = BORDER_STYLE;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } }; // 经典深蓝
    cell.font = { name: FONT_FAMILY, size: 10.5, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  // Row 7~11: 数据行
  for (let r = 7; r <= 11; r++) {
    const row = ws.getRow(r);
    row.height = 28;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = BORDER_STYLE;
      const isDescription = colNumber === 2;
      cell.alignment = {
        vertical: 'middle',
        horizontal: isDescription ? 'left' : 'center',
        wrapText: true
      };
      cell.font = { name: FONT_FAMILY, size: 10, color: { argb: '1E293B' } };
      if (r % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      }
    });
  }

  // 目标输出路径全同步
  const targetPaths = [
    'F:/order_workflow/public/templates/极简出厂底价表_单表模板.xlsx',
    'F:/order_workflow/public/templates/Minimal_Export_Pricing_Template.xlsx',
    'C:/Users/tsuik/OneDrive/桌面/n8n/商品底价表/极简出厂底价表_单表模板.xlsx',
    'C:/Users/tsuik/OneDrive/桌面/n8n/商品底价表/极简出厂底价表_升级版.xlsx',
    'C:/Users/tsuik/OneDrive/桌面/极简出厂底价表_单表模板.xlsx',
    'F:/order_workflow/data/active_pricing.xlsx',
    'F:/order_workflow/data/tenants/default/active_pricing.xlsx'
  ];

  for (const p of targetPaths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      await wb.xlsx.writeFile(p);
      console.log('✨ [极简出厂底价表] 已成功写入:', p);
    } catch (err) {
      console.warn('⚠️ 写入', p, '被占用或跳过:', err.message);
    }
  }
}

buildMinimalWorkbook().then(() => {
  console.log('🎉 升级版极简出厂底价表构建完成！');
});
