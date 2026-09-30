const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const FONT_FAMILY = 'Microsoft YaHei';
const BORDER_STYLE = {
  top: { style: 'thin', color: { argb: 'CBD5E1' } },
  left: { style: 'thin', color: { argb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
  right: { style: 'thin', color: { argb: 'CBD5E1' } }
};
const HEADER_FILL_BLUE = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
const SUBHEADER_FILL_BLUE = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
const SECTION_FILL_ICE = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
const ROW_ZEBRA_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };

// ==========================================
// 1. 构建全新的【双表解耦旗舰版】
// ==========================================
async function createDualSheetWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'KelvinFlow AI 外贸数字员工';
  wb.lastModifiedBy = '外贸总监 Kelvin';
  wb.created = new Date();
  wb.modified = new Date();

  // ------------------------------------------
  // Sheet 1: ⚙️ 全局核算参数 (Config)
  // ------------------------------------------
  const ws1 = wb.addWorksheet('⚙️ 全局核算参数 (Config)');
  ws1.views = [{ showGridLines: true, state: 'normal' }];

  // 列宽定义
  ws1.columns = [
    { width: 38 }, // A: 控制参数/币种
    { width: 28 }, // B: 设定数值/汇率
    { width: 22 }, // C: 格式/符号
    { width: 44 }, // D: 规则说明
    { width: 38 }  // E: 责任人/区域
  ];

  // 1.1 大标题与说明
  ws1.mergeCells('A1:E1');
  const t1 = ws1.getCell('A1');
  t1.value = '🏢 我司外贸出厂核算控制台 · 全局业务参数配置 (Global Configuration)';
  t1.font = { name: FONT_FAMILY, size: 13, bold: true, color: { argb: 'FFFFFF' } };
  t1.fill = HEADER_FILL_BLUE;
  t1.alignment = { vertical: 'middle', horizontal: 'center' };
  ws1.getRow(1).height = 38;

  ws1.mergeCells('A2:E2');
  const d1 = ws1.getCell('A2');
  d1.value = '💡 本表由企业掌门人/财务部专管；在此设定的汇率、保底毛利率与业务条款将自动应用于系统全量商品出厂核算。修改后即时全厂生效。';
  d1.font = { name: FONT_FAMILY, size: 9.5, color: { argb: '475569' } };
  d1.fill = ROW_ZEBRA_FILL;
  d1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(2).height = 28;

  // 1.2 模块一：结算币种与锁定汇率
  ws1.getRow(3).height = 12; // 空行
  ws1.mergeCells('A4:E4');
  const s1 = ws1.getCell('A4');
  s1.value = '💵 模块一：结算币种与内部锁定汇率 (Currency & Exchange Rates)';
  s1.font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: '1E3A8A' } };
  s1.fill = SECTION_FILL_ICE;
  s1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(4).height = 28;

  const h1 = ['外币币种 (Target Currency)', '内部锁定汇率 (Rate To RMB)', '币种符号 (Symbol)', '汇率波动预警保护基准', '适用采购区域 (采购商来源)'];
  ws1.getRow(5).values = h1;
  ws1.getRow(5).height = 28;
  ws1.getRow(5).eachCell((cell) => {
    cell.border = BORDER_STYLE;
    cell.fill = SUBHEADER_FILL_BLUE;
    cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
  });

  const ratesData = [
    ['USD', 7.20, '$', '★ 基准主币种 (波动±3%保护)', '北美、东南亚、全球主流外贸结算 (默认主币种)'],
    ['EUR', 7.85, '€', '基准锁定汇率 (波动±3%保护)', '欧盟及欧洲自由贸易区国家采购商'],
    ['GBP', 9.10, '£', '基准锁定汇率 (波动±3%保护)', '英国及英联邦国家采购商'],
    ['AUD', 4.80, 'A$', '基准锁定汇率 (波动±3%保护)', '澳大利亚、新西兰及大洋洲采购商'],
    ['CAD', 5.30, 'C$', '基准锁定汇率 (波动±3%保护)', '加拿大市场专属采购商']
  ];
  ratesData.forEach((rowVals, idx) => {
    const row = ws1.addRow(rowVals);
    row.height = 26;
    row.eachCell((cell, colIdx) => {
      cell.border = BORDER_STYLE;
      cell.font = { name: FONT_FAMILY, size: 10, color: { argb: '1E293B' }, bold: colIdx === 1 || colIdx === 2 };
      cell.alignment = { vertical: 'middle', horizontal: colIdx >= 4 ? 'left' : 'center', wrapText: false };
      if (idx % 2 === 1) cell.fill = ROW_ZEBRA_FILL;
    });
  });

  // 1.3 模块二：利润红线与防穿底控制
  ws1.addRow([]); // 空行
  const s2Row = ws1.addRow(['📈 模块二：利润红线与防穿底控制 (Profit Margin & Cost Protection)']);
  ws1.mergeCells(`A${s2Row.number}:E${s2Row.number}`);
  s2Row.getCell(1).font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: '1E3A8A' } };
  s2Row.getCell(1).fill = SECTION_FILL_ICE;
  s2Row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  s2Row.height = 28;

  const h2 = ['参数控制项 (Control Parameter)', '设置基准值 (Setting Value)', '参数格式/单位', '系统生效机制与风控规则说明', '责任人/控制级别'];
  const h2Row = ws1.addRow(h2);
  h2Row.height = 28;
  h2Row.eachCell((cell) => {
    cell.border = BORDER_STYLE;
    cell.fill = SUBHEADER_FILL_BLUE;
    cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
  });

  const marginData = [
    ['全厂默认保底毛利率 (Default Margin)', '15%', '百分比 (0.15)', '出厂安全底价基础上浮动加价；单品未设时自动继承此参数', '企业掌门人 / 老板'],
    ['最低保护红线毛利率 (Floor Margin)', '8%', '百分比 (0.08)', '业务员最低授权底线，低于此红线系统强制拦截并报警打回', '老板 / 财务总监'],
    ['样品打样费上浮倍率 (Sample Multiplier)', '2.5', '倍率 (出厂价*2.5)', '覆盖小批量散单模具调机成本，后续批量达标全额抵扣货款', '厂长 / 工程部'],
    ['报价单默认有效期 (Price Validity)', '30 Days', '天数', '超出 30 天需重新核实原材料成本与外币汇率波动情况', '外贸部主管']
  ];
  marginData.forEach((rowVals, idx) => {
    const row = ws1.addRow(rowVals);
    row.height = 26;
    row.eachCell((cell, colIdx) => {
      cell.border = BORDER_STYLE;
      cell.font = { name: FONT_FAMILY, size: 10, color: { argb: '1E293B' }, bold: colIdx === 1 || colIdx === 2 };
      cell.alignment = { vertical: 'middle', horizontal: colIdx === 4 || colIdx === 5 ? 'left' : 'center', wrapText: false };
      if (idx % 2 === 1) cell.fill = ROW_ZEBRA_FILL;
    });
  });

  // 1.4 模块三：默认贸易术语与杂费基准
  ws1.addRow([]); // 空行
  const s3Row = ws1.addRow(['🚢 模块三：默认贸易术语与杂费基准 (Incoterms & Port Charges)']);
  ws1.mergeCells(`A${s3Row.number}:E${s3Row.number}`);
  s3Row.getCell(1).font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: '1E3A8A' } };
  s3Row.getCell(1).fill = SECTION_FILL_ICE;
  s3Row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  s3Row.height = 28;

  const h3 = ['贸易术语 (Incoterm)', '指定交货港口 / 地点', '单件均摊杂费 (RMB)', '整柜固定杂费 (RMB)', '费用包含范围与口岸说明'];
  const h3Row = ws1.addRow(h3);
  h3Row.height = 28;
  h3Row.eachCell((cell) => {
    cell.border = BORDER_STYLE;
    cell.fill = SUBHEADER_FILL_BLUE;
    cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
  });

  const incotermData = [
    ['EXW', '工厂车间自提 (Factory Ex-works)', '¥0.00', '¥0.00', '买家自提，仅含标准纸箱包装，无港口杂费与拖车费'],
    ['FOB', '深圳盐田港 / 蛇口港 (Shenzhen)', '¥0.20', '¥1,500.00', '包含工厂至深圳码头内陆拖车、出口报关、港杂码头费(THC)'],
    ['CIF', '目的港（根据买家询盘实时测算）', '实时测算', '含基础货运险', '根据货柜实际目的港与实时船期核算海运费与保费']
  ];
  incotermData.forEach((rowVals, idx) => {
    const row = ws1.addRow(rowVals);
    row.height = 26;
    row.eachCell((cell, colIdx) => {
      cell.border = BORDER_STYLE;
      cell.font = { name: FONT_FAMILY, size: 10, color: { argb: '1E293B' }, bold: colIdx === 1 };
      cell.alignment = { vertical: 'middle', horizontal: colIdx >= 4 ? 'left' : 'center', wrapText: false };
      if (idx % 2 === 1) cell.fill = ROW_ZEBRA_FILL;
    });
  });

  // 1.5 模块四：默认付款方式与结算浮动
  ws1.addRow([]); // 空行
  const s4Row = ws1.addRow(['💳 模块四：默认付款方式与结算浮动 (Payment Terms)']);
  ws1.mergeCells(`A${s4Row.number}:E${s4Row.number}`);
  s4Row.getCell(1).font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: '1E3A8A' } };
  s4Row.getCell(1).fill = SECTION_FILL_ICE;
  s4Row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  s4Row.height = 28;

  const h4 = ['付款方式 (Payment Term)', '价格浮动比例 (%)', '支持结算币种', '资金周转成本与商业规则说明', '适用客户等级与授信'];
  const h4Row = ws1.addRow(h4);
  h4Row.height = 28;
  h4Row.eachCell((cell) => {
    cell.border = BORDER_STYLE;
    cell.fill = SUBHEADER_FILL_BLUE;
    cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
  });

  const paymentData = [
    ['100% T/T Advance (全款预付)', '-2.0% (直享折扣)', 'USD / EUR / GBP', '买家全款预付直享 98 折，极大加速工厂现金流周转', '新老客户通用优惠'],
    ['30% Deposit + 70% Balance (标准前T/T)', '0.0% (基准价格)', 'USD / EUR / GBP', '外贸行业标准条款：30%定金排产，70%见提单副本付款', '标准成交客户'],
    ['L/C at Sight (即期不可撤销信用证)', '+1.5% (微幅上浮)', 'USD / EUR', '覆盖银行开证手续费与议付审单合规成本', '信用优良大客户']
  ];
  paymentData.forEach((rowVals, idx) => {
    const row = ws1.addRow(rowVals);
    row.height = 26;
    row.eachCell((cell, colIdx) => {
      cell.border = BORDER_STYLE;
      cell.font = { name: FONT_FAMILY, size: 10, color: { argb: '1E293B' }, bold: colIdx === 1 };
      cell.alignment = { vertical: 'middle', horizontal: colIdx >= 4 ? 'left' : 'center', wrapText: false };
      if (idx % 2 === 1) cell.fill = ROW_ZEBRA_FILL;
    });
  });

  // 1.6 模块五：集装箱装载容积速查标尺
  ws1.addRow([]); // 空行
  const s5Row = ws1.addRow(['📦 模块五：集装箱装载容积速查标尺 (Container Volume Guidelines)']);
  ws1.mergeCells(`A${s5Row.number}:E${s5Row.number}`);
  s5Row.getCell(1).font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: '1E3A8A' } };
  s5Row.getCell(1).fill = SECTION_FILL_ICE;
  s5Row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  s5Row.height = 28;

  const h5 = ['集装箱型号 (Container Type)', '安全装载容积 (CBM)', '理论容积 (CBM)', '最大限重 (KG)', '装柜适用选型建议'];
  const h5Row = ws1.addRow(h5);
  h5Row.height = 28;
  h5Row.eachCell((cell) => {
    cell.border = BORDER_STYLE;
    cell.fill = SUBHEADER_FILL_BLUE;
    cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
  });

  const containerData = [
    ['20GP (20尺小柜)', '28.0 CBM', '33.2 CBM', '21,800 KG', '适合五金紧固件、金属椅脚等高密度重货或试单'],
    ['40GP (40尺平柜)', '58.0 CBM', '67.7 CBM', '26,000 KG', '适合体积适中、重量适中的常规工业品与配件'],
    ['40HQ (40尺高柜)', '68.0 CBM', '76.3 CBM', '26,000 KG', '适合办公椅、支架、轻泡货等大体积外贸商品']
  ];
  containerData.forEach((rowVals, idx) => {
    const row = ws1.addRow(rowVals);
    row.height = 26;
    row.eachCell((cell, colIdx) => {
      cell.border = BORDER_STYLE;
      cell.font = { name: FONT_FAMILY, size: 10, color: { argb: '1E293B' }, bold: colIdx === 1 };
      cell.alignment = { vertical: 'middle', horizontal: colIdx >= 4 ? 'left' : 'center', wrapText: false };
      if (idx % 2 === 1) cell.fill = ROW_ZEBRA_FILL;
    });
  });

  // ------------------------------------------
  // Sheet 2: 📦 商品出厂底价库 (Products)
  // ------------------------------------------
  const ws2 = wb.addWorksheet('📦 商品出厂底价库 (Products)');

  // 终极二维冻结：A列锁定 + 首行表头置顶！
  // 滚动视窗从 B2 开始滑动，纯净无任何老板参数干扰！
  ws2.views = [{
    state: 'frozen',
    xSplit: 1,           // 锁定第 1 列 (A列: 产品型号 / SKU)
    ySplit: 1,           // 锁定第 1 行 (表头行)
    topLeftCell: 'B2',   // 滚动从 B2 开始
    showGridLines: true
  }];

  // 2.1 表头定义 (第 1 行直接开始，满屏纯净)
  const productHeaders = [
    '产品型号 / SKU (必填)',
    '买家常用别名 (Aliases·选填)',
    '产品英文品名与规格描述 (必填)',
    '出厂底价 (RMB Cost·必填安全底价)',
    '最低起订量 MOQ (PCS·选填)',
    '单箱装量 (PCS/CTN·选填)',
    '外箱体积 (CBM/CTN·选填)',
    '单箱毛重 G.W. (kg/CTN·选填)',
    '单品专属保底毛利率 (选填·留空继承15%)',
    '专属生产交期 (选填·留空继承25-30天)',
    '海关编码 HS Code (选填)'
  ];
  ws2.addRow(productHeaders);
  ws2.getRow(1).height = 36;
  ws2.getRow(1).eachCell((cell) => {
    cell.border = BORDER_STYLE;
    cell.fill = HEADER_FILL_BLUE;
    cell.font = { name: FONT_FAMILY, size: 10.5, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
  });

  // 2.2 示范商品数据行
  const sampleProducts = [
    ['ST-2026-A', 'ACME-991, Heavy Bracket, 991支架, Stand Pro', 'Aluminum Alloy Precision Bracket (铝合金精密五金支架)', 15.50, 500, 50, 0.045, 14.5, '', '20-25 Days', '7616.99.9000'],
    ['ST-2026-B', 'FAST-SCREW, Hex Bolt, 不锈钢紧固件, 8820螺丝', 'Stainless Steel Hex Fastener Screws (不锈钢沉头紧固件螺丝)', 0.85, 5000, 1000, 0.020, 18.0, '18%', '15-20 Days', '7318.15.9000'],
    ['ERG-PRO-V2', 'Executive Chair, 9088办公椅, CHAIR-MESH-PRO, Ergo Chair', 'Ergonomic Mesh Office Chair (高档网布人体工学办公椅)', 185.00, 50, 1, 0.160, 16.2, '25%', '30-35 Days', '9401.30.0000'],
    ['AL-BASE-99', '5 Star Base, Chair Leg, 铝合金五星脚, Star Base 99', 'Die-casting Aluminum 5-Star Base (高压铸铝合金五星椅脚)', 38.00, 200, 5, 0.080, 11.0, '', '25-30 Days', '9401.90.9000'],
    ['HD-ARM-08', '3D Armrest, PU Arm, 升降扶手, ARM-08', '3D Adjustable PU Armrest Set (3D多功能升降PU扶手套装)', 24.00, 300, 20, 0.055, 9.5, '', '20-25 Days', '9401.90.9000'],
    ['HD-ARM-09', '3D Armrest Pro, PU Armrest Plus, 加强升降扶手, ARM-09', '3D Adjustable PU Armrest Set (3D多功能升降PU扶手套装)', 25.00, 300, 20, 0.055, 9.5, '', '20-25 Days', '9401.90.9000']
  ];

  sampleProducts.forEach((item, idx) => {
    const row = ws2.addRow(item);
    row.height = 28;
    row.eachCell((cell, colIdx) => {
      cell.border = BORDER_STYLE;
      const isText = colIdx === 2 || colIdx === 3;
      cell.alignment = {
        vertical: 'middle',
        horizontal: isText ? 'left' : 'center',
        wrapText: false
      };
      cell.font = {
        name: FONT_FAMILY,
        size: 10,
        color: { argb: '1E293B' },
        bold: colIdx === 1 // 产品型号加粗
      };

      // 格式化货币
      if (colIdx === 4 && typeof cell.value === 'number') {
        cell.numFmt = '¥#,##0.00';
        cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'B91C1C' } };
      }

      if (idx % 2 === 1) {
        cell.fill = ROW_ZEBRA_FILL;
      }
    });
  });

  // 2.3 黄金紧凑列宽矩阵
  ws2.columns = [
    { width: 26 }, // A: 产品型号/SKU
    { width: 60 }, // B: 买家常用别名
    { width: 65 }, // C: 品名与规格描述
    { width: 36 }, // D: 出厂底价
    { width: 30 }, // E: MOQ
    { width: 28 }, // F: PCS/CTN
    { width: 28 }, // G: CBM/CTN
    { width: 32 }, // H: G.W. kg/CTN
    { width: 38 }, // I: 单品专属保底毛利率
    { width: 38 }, // J: 专属交期
    { width: 28 }  // K: HS Code
  ];

  return wb;
}

// ==========================================
// 2. 构建纯净单表（消除币种撕裂：纯净置顶前6行，不锁A列）
// ==========================================
async function createSingleSheetWorkbook(includeAliases = false) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'KelvinFlow AI 外贸数字员工';
  wb.lastModifiedBy = '外贸总监 Kelvin';
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet('商品底价库 (Products)');

  // 纯净纵向置顶前 6 行，横向不锁 A 列，整表平滑同步平移！
  ws.views = [{
    state: 'frozen',
    xSplit: 0,
    ySplit: 6,
    topLeftCell: 'A7',
    showGridLines: true
  }];

  const totalCols = includeAliases ? 11 : 10;
  const lastColLetter = includeAliases ? 'K' : 'J';

  // 1. 大标题
  ws.mergeCells(`A1:${lastColLetter}1`);
  const tCell = ws.getCell('A1');
  tCell.value = includeAliases 
    ? '🏭 我司外贸出厂底价表与核算控制台 (单表极简版·支持买家别名)'
    : '🏭 我司外贸出厂底价表与核算控制台 (单表极简版)';
  tCell.font = { name: FONT_FAMILY, size: 13, bold: true, color: { argb: 'FFFFFF' } };
  tCell.fill = HEADER_FILL_BLUE;
  tCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 36;

  // 2. 使用说明
  ws.mergeCells(`A2:${lastColLetter}2`);
  const dCell = ws.getCell('A2');
  dCell.value = '💡 使用说明：下方第 3~4 行为【老板全局控制区】，设置好后全厂通用；老外询盘时 AI 自动按此汇率与商务条款核算报价。若底价已加保底利润，毛利率填 0% 即可。第 6 行为商品清单（产品型号、品名规格、出厂底价为必填核心项；买家常用别名及其他列为选填智能增益项）。';
  dCell.font = { name: FONT_FAMILY, size: 9.5, color: { argb: '475569' } };
  dCell.fill = ROW_ZEBRA_FILL;
  dCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 28;

  // 3. 老板控制区表头
  const ctrlHeaders = includeAliases ? [
    '默认主币种 (Currency)', '美元汇率 (USD/RMB)', '欧元汇率 (EUR/RMB)', '英镑汇率 (GBP/RMB)',
    '全厂默认保底毛利率', '全厂默认交期', '默认付款条件', '柜型容积 20GP', '柜型容积 40GP', '柜型容积 40HQ', '报价单有效天数'
  ] : [
    '默认主币种 (Currency)', '美元汇率 (USD/RMB)', '欧元汇率 (EUR/RMB)', '英镑汇率 (GBP/RMB)',
    '全厂默认加价毛利 (%)', '默认交货条款 (Incoterm)', '默认付款方式 (Payment)', '报价有效期 (Validity)', '默认生产交期 (Lead Time)', '样品政策 (Sample Policy)'
  ];
  ws.getRow(3).values = ctrlHeaders;
  ws.getRow(3).height = 32;
  ws.getRow(3).eachCell((cell) => {
    cell.border = BORDER_STYLE;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
    cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: '1E3A8A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
  });

  // 4. 老板控制区数值
  const ctrlValues = includeAliases ? [
    'USD', 7.20, 7.85, 9.10, '15%', '25-30 Days', '30% T/T Deposit, 70% Balance', '28 CBM', '58 CBM', '68 CBM', '30 Days'
  ] : [
    'USD', 7.20, 7.85, 9.10, '20%', 'FOB Shenzhen Port', '30% T/T Deposit, 70% Balance before shipment', '30 Days', '25-30 Days after deposit', 'Double unit price, refundable upon bulk order'
  ];
  ws.getRow(4).values = ctrlValues;
  ws.getRow(4).height = 34;
  ws.getRow(4).eachCell((cell, colIdx) => {
    cell.border = BORDER_STYLE;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } };
    cell.font = { name: FONT_FAMILY, size: 10.5, bold: true, color: { argb: '1E40AF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
  });

  // 5. 分割指示行
  ws.mergeCells(`A5:${lastColLetter}5`);
  const divCell = ws.getCell('A5');
  divCell.value = includeAliases
    ? '📦 产品底价明细库 (前 3 列必填，买家常用别名及后 7 列为选填；留空将自动继承上方老板全局规则)'
    : '📦 产品底价明细库 (前 3 列必填，后 7 列选填；留空将自动继承上方老板全局规则)';
  divCell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: '1E293B' } };
  divCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
  divCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(5).height = 28;

  // 6. 商品明细表头
  const prodHeaders = includeAliases ? [
    '产品型号 / SKU (必填)', '买家常用别名 (Aliases·选填)', '产品英文品名与规格描述 (必填)',
    '出厂底价 (RMB Cost·必填安全底价)', '最低起订量 MOQ (PCS·选填)', '单箱装量 (PCS/CTN·选填)',
    '外箱体积 (CBM/CTN·选填)', '单箱毛重 G.W. (kg/CTN·选填)', '单品专属保底毛利率 (选填·留空走全局)',
    '专属生产交期 (选填·留空走全局)', '海关编码 HS Code (选填)'
  ] : [
    '产品型号 / SKU (必填)', '产品英文品名与规格描述 (必填)', '出厂底价 (RMB Cost·必填安全底价)',
    '最低起订量 MOQ (PCS·选填)', '单箱装量 (PCS/CTN·选填)', '外箱体积 (CBM/CTN·选填)',
    '单箱毛重 G.W. (kg/CTN·选填)', '该款指定毛利 (%·选填·留空走全局)', '该款指定交期 (选填·留空走全局)',
    '海关编码 HS Code (选填)'
  ];
  ws.getRow(6).values = prodHeaders;
  ws.getRow(6).height = 36;
  ws.getRow(6).eachCell((cell) => {
    cell.border = BORDER_STYLE;
    cell.fill = HEADER_FILL_BLUE;
    cell.font = { name: FONT_FAMILY, size: 10.5, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
  });

  // 7. 数据行
  const sampleProducts = includeAliases ? [
    ['ST-2026-A', 'ACME-991, Heavy Bracket, 991支架, Stand Pro', 'Aluminum Alloy Precision Bracket (铝合金精密五金支架)', 15.50, 500, 50, 0.045, 14.5, '', '20-25 Days', '7616.99.9000'],
    ['ST-2026-B', 'FAST-SCREW, Hex Bolt, 不锈钢紧固件, 8820螺丝', 'Stainless Steel Hex Fastener Screws (不锈钢沉头紧固件螺丝)', 0.85, 5000, 1000, 0.020, 18.0, '18%', '15-20 Days', '7318.15.9000'],
    ['ERG-PRO-V2', 'Executive Chair, 9088办公椅, CHAIR-MESH-PRO, Ergo Chair', 'Ergonomic Mesh Office Chair (高档网布人体工学办公椅)', 185.00, 50, 1, 0.160, 16.2, '25%', '30-35 Days', '9401.30.0000'],
    ['AL-BASE-99', '5 Star Base, Chair Leg, 铝合金五星脚, Star Base 99', 'Die-casting Aluminum 5-Star Base (高压铸铝合金五星椅脚)', 38.00, 200, 5, 0.080, 11.0, '', '25-30 Days', '9401.90.9000'],
    ['HD-ARM-08', '3D Armrest, PU Arm, 升降扶手, ARM-08', '3D Adjustable PU Armrest Set (3D多功能升降PU扶手套装)', 24.00, 300, 20, 0.055, 9.5, '', '20-25 Days', '9401.90.9000'],
    ['HD-ARM-09', '3D Armrest Pro, PU Armrest Plus, 加强升降扶手, ARM-09', '3D Adjustable PU Armrest Set (3D多功能升降PU扶手套装)', 25.00, 300, 20, 0.055, 9.5, '', '20-25 Days', '9401.90.9000']
  ] : [
    ['ST-2026-A', 'Aluminum Alloy Precision Bracket (铝合金精密五金支架)', 15.50, 500, 50, 0.045, 14.5, '', '20-25 Days', '7616.99.9000'],
    ['ST-2026-B', 'Stainless Steel Hex Fastener Screws (不锈钢沉头紧固件螺丝)', 0.85, 5000, 1000, 0.020, 18.0, '15%', '', '7318.15.9000'],
    ['ERG-PRO-V2', 'Ergonomic Mesh Office Chair (高档网布人体工学办公椅)', 185.00, 50, 1, 0.160, 16.2, '25%', '30-35 Days', '9401.30.0000'],
    ['AL-BASE-99', 'Die-casting Aluminum 5-Star Base (高压铸铝合金五星椅脚)', 38.00, 200, 5, 0.080, 11.0, '', '', '9401.90.9000'],
    ['HD-ARM-08', '3D Adjustable PU Armrest Set (3D多功能升降PU扶手套装)', 24.00, 300, 20, 0.055, 9.5, '', '', '9401.90.9000'],
    ['HD-ARM-09', '3D Adjustable PU Armrest Set (3D多功能升降PU扶手套装)', 25.00, 300, 20, 0.055, 9.5, '', '', '9401.90.9000']
  ];

  sampleProducts.forEach((item, idx) => {
    const row = ws.addRow(item);
    row.height = 28;
    row.eachCell((cell, colIdx) => {
      cell.border = BORDER_STYLE;
      const isText = includeAliases ? (colIdx === 2 || colIdx === 3) : (colIdx === 2);
      cell.alignment = {
        vertical: 'middle',
        horizontal: isText ? 'left' : 'center',
        wrapText: false
      };
      cell.font = {
        name: FONT_FAMILY,
        size: 10,
        color: { argb: '1E293B' },
        bold: colIdx === 1
      };

      const priceCol = includeAliases ? 4 : 3;
      if (colIdx === priceCol && typeof cell.value === 'number') {
        cell.numFmt = '¥#,##0.00';
        cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'B91C1C' } };
      }

      if (idx % 2 === 1) {
        cell.fill = ROW_ZEBRA_FILL;
      }
    });
  });

  // 列宽
  if (includeAliases) {
    ws.columns = [
      { width: 26 }, { width: 60 }, { width: 65 }, { width: 36 }, { width: 30 },
      { width: 28 }, { width: 50 }, { width: 32 }, { width: 38 }, { width: 50 }, { width: 28 }
    ];
  } else {
    ws.columns = [
      { width: 26 }, { width: 65 }, { width: 36 }, { width: 30 }, { width: 28 },
      { width: 28 }, { width: 32 }, { width: 38 }, { width: 50 }, { width: 28 }
    ];
  }

  return wb;
}

// ==========================================
// 3. 执行生成并多端同步
// ==========================================
async function main() {
  console.log('🚀 开始生成外贸全套高质感出厂底价表...');

  // 1. 生成双表旗舰版
  const dualWb = await createDualSheetWorkbook();

  // 2. 生成单表 10 列经典版 (纯净垂直置顶，无撕裂)
  const single10Wb = await createSingleSheetWorkbook(false);

  // 3. 生成单表 11 列别名版 (纯净垂直置顶，无撕裂)
  const single11Wb = await createSingleSheetWorkbook(true);

  // 写入目标定义
  const filesToWrite = [
    // 双表旗舰版 (全面升级到 升级版 + 明确命名的双表旗舰版)
    { wb: dualWb, paths: [
      'C:/Users/tsuik/OneDrive/桌面/n8n/商品底价表/极简出厂底价表_升级版.xlsx',
      'C:/Users/tsuik/OneDrive/桌面/n8n/商品底价表/极简出厂底价表_双表旗舰版.xlsx',
      'F:/order_workflow/public/templates/极简出厂底价表_双表旗舰版.xlsx',
      'F:/order_workflow/public/templates/Standard_Export_Pricing_Template.xlsx',
      'F:/order_workflow/data/tenants/default/active_pricing.xlsx'
    ]},
    // 单表 10 列经典版
    { wb: single10Wb, paths: [
      'C:/Users/tsuik/OneDrive/桌面/n8n/商品底价表/极简出厂底价表_单表模板.xlsx',
      'F:/order_workflow/public/templates/极简出厂底价表_单表模板.xlsx'
    ]},
    // 单表 11 列别名版
    { wb: single11Wb, paths: [
      'C:/Users/tsuik/OneDrive/桌面/n8n/商品底价表/极简出厂底价表_单表模板_含买家别名版.xlsx',
      'F:/order_workflow/public/templates/极简出厂底价表_单表模板_含买家别名版.xlsx'
    ]}
  ];

  for (const item of filesToWrite) {
    for (const p of item.paths) {
      try {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        await item.wb.xlsx.writeFile(p);
        console.log('✅ [成功写入]:', p);
      } catch (err) {
        console.warn('⚠️ [写入异常]:', p, err.message);
      }
    }
  }

  console.log('🎉 所有表格模板生成并同步完毕！');
}

main().catch(err => {
  console.error('❌ 执行失败:', err);
  process.exit(1);
});
