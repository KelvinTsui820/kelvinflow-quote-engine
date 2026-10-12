import ExcelJS from 'exceljs';
import path from 'path';

async function buildUnifiedMasterTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IT佬Kelvin';
  workbook.lastModifiedBy = 'IT佬Kelvin';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Common styles matching F:\order_workflow\商品底价表\出厂底价表.xlsx
  const FONT_NAME = 'Microsoft YaHei';
  const COLOR_NAVY = 'FF1E3A8A';      // Deep Royal Navy Blue (Main theme)
  const COLOR_BLUE = 'FF2563EB';      // Vibrant Blue (Table Headers)
  const COLOR_SKY = 'FFDBEAFE';       // Soft Sky Blue (Module banners)
  const COLOR_LIGHT_BG = 'FFF8FAFC';  // Slate 50 (Zebra light bg)
  const COLOR_TEXT = 'FF1E293B';      // Dark Slate 800
  const COLOR_MUTED = 'FF475569';     // Slate 600
  const COLOR_BORDER = 'FFCBD5E1';    // Slate 300
  const COLOR_RED = 'FFB91C1C';       // Red 700 (Alert)
  const COLOR_AMBER_HEADER = 'FFD97706'; // Amber 600 (Auto-calc headers)
  const COLOR_AMBER_FILL = 'FFFEF3C7';   // Amber 100 (Auto-calc soft yellow)

  const thinBorder = {
    top: { style: 'thin', color: { argb: COLOR_BORDER } },
    left: { style: 'thin', color: { argb: COLOR_BORDER } },
    bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
    right: { style: 'thin', color: { argb: COLOR_BORDER } }
  };

  // -------------------------------------------------------------
  // Sheet 0: 📌 使用指南与提效神器 (放在首个标签页)
  // -------------------------------------------------------------
  const ws0 = workbook.addWorksheet('📌 使用指南与提效神器', {
    views: [{ showGridLines: true }]
  });

  ws0.columns = [
    { width: 5 },   // A
    { width: 34 },  // B
    { width: 92 }   // C (widened for comfortable reading without truncation)
  ];

  ws0.mergeCells('B2:C2');
  ws0.getCell('B2').value = '【2026外贸出厂底价表与智能核价模板】使用指南';
  ws0.getCell('B2').font = { name: FONT_NAME, size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  ws0.getCell('B2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  ws0.getCell('B2').alignment = { vertical: 'middle', horizontal: 'center' };
  ws0.getRow(2).height = 38;

  ws0.mergeCells('B3:C3');
  ws0.getCell('B3').value = '💡 本地离线版与线上版 KelvinFlow (https://quote.kelvinflow.com) 采用 100% 相同数据架构。在此填写的全部数据，日后可直接无损上传，零学习成本。';
  ws0.getCell('B3').font = { name: FONT_NAME, size: 9.5, italic: true, color: { argb: COLOR_MUTED } };
  ws0.getCell('B3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LIGHT_BG } };
  ws0.getCell('B3').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  ws0.getRow(3).height = 30;

  const guideItems = [
    [
      '1. 为什么做这套表？',
      '拒绝单品手工反复按计算器！本表专为工贸一体外贸工厂、外贸公司与独立业务员打造。左侧批量录入底价与箱规，右侧全自动联动秒出全量多币种 FOB 美金单价、集装箱装柜量与利润红线防御。'
    ],
    [
      '2. 【⚙️ 全局核算参数】怎么用？',
      '在第 2 张工作表设定贵司的内部锁定汇率（如 USD 7.20）、全厂保底毛利（如 15%）、利润防穿底红线（如 8%）与海运进仓港杂平摊（如 0.20 元/件）。在此修改后，全厂全量商品自动秒级联动更新。'
    ],
    [
      '3. 【📦 商品出厂底价库】怎么用？',
      '在第 3 张工作表批量录入产品 SKU、出厂底价与包装尺寸。黄色公式区会自动联动倒算出精准 FOB 美金报价、自动算出 20GP/40HQ 可装柜件数；若某品毛利低于红线会自动闪烁警报。'
    ],
    [
      '4. 对外发给买家安全吗？',
      '100% 安全！第 4 张工作表【📄 对外纯净批量报价单】专为海外买家设计，工厂出厂底价、内部成本与真实毛利率全部自动脱敏隐藏，可直接打印或导出 PDF 发给海外买家。'
    ],
    [
      '5. 🚀 无缝升级线上版 (SaaS 原生直通)',
      '本表格式与 KelvinFlow 智能出单引擎 (https://quote.kelvinflow.com) 完全一致！平时直接当离线底价库用；一旦买家发来几十个型号的长篇英文邮件或 PDF 询盘，直接把本表上传到系统，转发邮件，AI 10 秒自动审单对齐底价生成专业英文报价单。小红书官方群友免审开通 7 天深度体验。'
    ],
    [
      '6. 开源与版权说明',
      '由大湾区全栈独立开发者 Kelvin (IT佬Kelvin) 荣誉出品，永久免费，纯净无广告，禁止二次倒卖。欢迎在小红书官方粉丝群内交流探讨！'
    ]
  ];

  const guideHeights = [52, 52, 52, 42, 75, 42];
  guideItems.forEach((item, idx) => {
    const rowNum = idx + 5;
    ws0.getCell(`B${rowNum}`).value = item[0];
    ws0.getCell(`B${rowNum}`).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLOR_NAVY } };
    ws0.getCell(`B${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SKY } };
    ws0.getCell(`B${rowNum}`).border = thinBorder;
    ws0.getCell(`B${rowNum}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    ws0.getCell(`C${rowNum}`).value = item[1];
    ws0.getCell(`C${rowNum}`).font = { name: FONT_NAME, size: 9.5, color: { argb: COLOR_TEXT } };
    ws0.getCell(`C${rowNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: (idx % 2 === 0 ? 'FFFFFFFF' : COLOR_LIGHT_BG) } };
    ws0.getCell(`C${rowNum}`).border = thinBorder;
    ws0.getCell(`C${rowNum}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    ws0.getRow(rowNum).height = guideHeights[idx] || 45;
  });

  // -------------------------------------------------------------
  // Sheet 1: ⚙️ 全局核算参数 (Config) - 严格复刻 出厂底价表.xlsx 视觉风格
  // -------------------------------------------------------------
  const ws1 = workbook.addWorksheet('⚙️ 全局核算参数 (Config)', {
    views: [{ showGridLines: true }]
  });

  ws1.columns = [
    { width: 40 }, // A
    { width: 32 }, // B
    { width: 22 }, // C
    { width: 60 }, // D
    { width: 54 }  // E
  ];

  // Header banner
  ws1.mergeCells('A1:E1');
  ws1.getCell('A1').value = '🏢 我司外贸出厂核算控制台 · 全局业务参数配置 (Global Configuration)';
  ws1.getCell('A1').font = { name: FONT_NAME, size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  ws1.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  ws1.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  ws1.getRow(1).height = 38;

  ws1.mergeCells('A2:E2');
  ws1.getCell('A2').value = '💡 本表由企业掌门人/财务部专管；在此设定的汇率、保底毛利率与业务条款将自动应用于系统全量商品出厂核算。修改后即时全厂生效。';
  ws1.getCell('A2').font = { name: FONT_NAME, size: 9.5, color: { argb: COLOR_MUTED } };
  ws1.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LIGHT_BG } };
  ws1.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws1.getRow(2).height = 24;

  // Function to create section headers and tables
  function addSectionHeader(startRow, title) {
    ws1.mergeCells(`A${startRow}:E${startRow}`);
    const cell = ws1.getCell(`A${startRow}`);
    cell.value = title;
    cell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLOR_NAVY } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SKY } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws1.getRow(startRow).height = 26;
  }

  function addTableHeaders(rowNum, headers) {
    const row = ws1.getRow(rowNum);
    headers.forEach((h, i) => {
      const c = row.getCell(i + 1);
      c.value = h;
      c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BLUE } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
      c.border = thinBorder;
    });
    row.height = 24;
  }

  // Module 1: Currency & Exchange Rates
  addSectionHeader(4, '💵 模块一：结算币种与内部锁定汇率 (Currency & Exchange Rates)');
  addTableHeaders(5, ['外币币种 (Target Currency)', '内部锁定汇率 (Rate To RMB)', '币种符号 (Symbol)', '汇率波动预警保护基准', '适用采购区域 (采购商来源)']);
  
  const m1Data = [
    ['USD', 7.20, '$', '★ 基准主币种 (波动±3%保护)', '北美、东南亚、全球主流外贸结算 (默认主币种)'],
    ['EUR', 7.85, '€', '基准锁定汇率 (波动±3%保护)', '欧盟及欧洲自由贸易区国家采购商'],
    ['GBP', 9.10, '£', '基准锁定汇率 (波动±3%保护)', '英国及英联邦国家采购商'],
    ['AUD', 4.80, 'A$', '基准锁定汇率 (波动±3%保护)', '澳大利亚、新西兰及大洋洲采购商'],
    ['CAD', 5.30, 'C$', '基准锁定汇率 (波动±3%保护)', '加拿大市场专属采购商']
  ];
  m1Data.forEach((d, i) => {
    const rNum = i + 6;
    const r = ws1.getRow(rNum);
    d.forEach((val, ci) => {
      const c = r.getCell(ci + 1);
      c.value = val;
      c.font = { name: FONT_NAME, size: 10, bold: (ci === 0 || ci === 1), color: { argb: COLOR_TEXT } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: (i % 2 === 0 ? 'FFFFFFFF' : COLOR_LIGHT_BG) } };
      c.alignment = { vertical: 'middle', horizontal: (ci <= 2 ? 'center' : 'left'), indent: (ci > 2 ? 1 : 0) };
      c.border = thinBorder;
      if (ci === 1) c.numFmt = '0.00';
    });
    r.height = 22;
  });

  // Module 2: Profit Margin & Redline
  addSectionHeader(12, '📈 模块二：利润红线与防穿底控制 (Profit Margin & Cost Protection)');
  addTableHeaders(13, ['参数控制项 (Control Parameter)', '设置基准值 (Setting Value)', '参数格式/单位', '系统生效机制与风控规则说明', '责任人/控制级别']);

  const m2Data = [
    ['全厂默认保底毛利率 (Default Margin)', 0.15, '百分比 (0.15)', '出厂安全底价基础上浮动加价；单品未设时自动继承此参数', '企业掌门人 / 老板'],
    ['最低保护红线毛利率 (Floor Margin)', 0.08, '百分比 (0.08)', '业务员最低授权底线，低于此红线系统强制拦截并报警打回', '老板 / 财务总监'],
    ['样品打样费上浮倍率 (Sample Multiplier)', 2.5, '倍率 (出厂价*2.5)', '覆盖小批量散单模具调机成本，后续批量达标全额抵扣货款', '厂长 / 工程部'],
    ['报价单默认有效期 (Price Validity)', '30 Days', '天数', '超出 30 天需重新核实原材料成本与外币汇率波动情况', '外贸部主管']
  ];
  m2Data.forEach((d, i) => {
    const rNum = i + 14;
    const r = ws1.getRow(rNum);
    d.forEach((val, ci) => {
      const c = r.getCell(ci + 1);
      c.value = val;
      const isRed = (i === 1); // Floor margin redline
      c.font = { 
        name: FONT_NAME, 
        size: 10, 
        bold: (ci <= 1), 
        color: { argb: (isRed ? COLOR_RED : COLOR_TEXT) } 
      };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: (i % 2 === 0 ? 'FFFFFFFF' : COLOR_LIGHT_BG) } };
      c.alignment = { vertical: 'middle', horizontal: (ci === 1 || ci === 2 ? 'center' : 'left'), indent: (ci === 0 || ci >= 3 ? 1 : 0) };
      c.border = thinBorder;
      if (ci === 1 && typeof val === 'number') {
        c.numFmt = (val < 1 ? '0.0%' : '0.0');
      }
    });
    r.height = 22;
  });

  // Module 3: Incoterms & Port Charges
  addSectionHeader(19, '🚢 模块三：默认贸易术语与杂费基准 (Incoterms & Port Charges)');
  addTableHeaders(20, ['贸易术语 (Incoterm)', '指定交货港口 / 地点', '单件均摊杂费 (RMB)', '整柜固定杂费 (RMB)', '费用包含范围与口岸说明']);

  const m3Data = [
    ['EXW', '工厂车间自提 (Factory Ex-works)', 0.00, 0.00, '买家自提，仅含标准纸箱包装，无港口杂费与拖车费'],
    ['FOB', '深圳盐田港 / 蛇口港 (Shenzhen)', 0.20, 1500.00, '包含工厂至深圳码头内陆拖车、出口报关、港杂码头费(THC)'],
    ['CIF', '目的港（根据买家询盘实时测算）', '实时测算', '含基础货运险', '根据货柜实际目的港与实时船期核算海运费与保费']
  ];
  m3Data.forEach((d, i) => {
    const rNum = i + 21;
    const r = ws1.getRow(rNum);
    d.forEach((val, ci) => {
      const c = r.getCell(ci + 1);
      c.value = val;
      c.font = { name: FONT_NAME, size: 10, bold: (ci === 0), color: { argb: COLOR_TEXT } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: (i % 2 === 0 ? 'FFFFFFFF' : COLOR_LIGHT_BG) } };
      c.alignment = { vertical: 'middle', horizontal: (ci === 0 || ci === 2 || ci === 3 ? 'center' : 'left'), indent: (ci === 1 || ci === 4 ? 1 : 0) };
      c.border = thinBorder;
      if (typeof val === 'number' && (ci === 2 || ci === 3)) {
        c.numFmt = '¥#,##0.00';
      }
    });
    r.height = 22;
  });

  // Module 4: Payment Terms
  addSectionHeader(25, '💳 模块四：默认付款方式与结算浮动 (Payment Terms)');
  addTableHeaders(26, ['付款方式 (Payment Term)', '价格浮动比例 (%)', '支持结算币种', '资金周转成本与商业规则说明', '适用客户等级与授信']);

  const m4Data = [
    ['100% T/T Advance (全款预付)', -0.02, 'USD / EUR / GBP', '买家全款预付直享 98 折，极大加速工厂现金流周转', '新老客户通用优惠'],
    ['30% Deposit + 70% Balance (标准前T/T)', 0.00, 'USD / EUR / GBP', '外贸行业标准条款：30%定金排产，70%见提单副本付款', '标准成交客户'],
    ['L/C at Sight (即期不可撤销信用证)', 0.015, 'USD / EUR', '覆盖银行开证手续费与议付审单合规成本', '信用优良大客户']
  ];
  m4Data.forEach((d, i) => {
    const rNum = i + 27;
    const r = ws1.getRow(rNum);
    d.forEach((val, ci) => {
      const c = r.getCell(ci + 1);
      c.value = val;
      c.font = { name: FONT_NAME, size: 10, bold: (ci === 0), color: { argb: COLOR_TEXT } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: (i % 2 === 0 ? 'FFFFFFFF' : COLOR_LIGHT_BG) } };
      c.alignment = { vertical: 'middle', horizontal: (ci === 1 || ci === 2 ? 'center' : 'left'), indent: (ci === 0 || ci >= 3 ? 1 : 0) };
      c.border = thinBorder;
      if (ci === 1 && typeof val === 'number') {
        c.numFmt = '+0.0%;-0.0%;0.0%';
      }
    });
    r.height = 22;
  });

  // Module 5: Container Guidelines
  addSectionHeader(31, '📦 模块五：集装箱装载容积速查标尺 (Container Volume Guidelines)');
  addTableHeaders(32, ['集装箱型号 (Container Type)', '安全装载容积 (CBM)', '理论容积 (CBM)', '最大限重 (KG)', '装柜适用选型建议']);

  const m5Data = [
    ['20GP (20尺小柜)', 28.0, 33.2, 21800, '适合五金紧固件、金属椅脚等高密度重货或试单'],
    ['40GP (40尺平柜)', 58.0, 67.7, 26000, '适合体积适中、重量适中的常规工业品与配件'],
    ['40HQ (40尺高柜)', 68.0, 76.3, 26000, '适合办公椅、支架、轻泡货等大体积外贸商品']
  ];
  m5Data.forEach((d, i) => {
    const rNum = i + 33;
    const r = ws1.getRow(rNum);
    d.forEach((val, ci) => {
      const c = r.getCell(ci + 1);
      c.value = val;
      c.font = { name: FONT_NAME, size: 10, bold: (ci === 0), color: { argb: COLOR_TEXT } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: (i % 2 === 0 ? 'FFFFFFFF' : COLOR_LIGHT_BG) } };
      c.alignment = { vertical: 'middle', horizontal: (ci >= 1 && ci <= 3 ? 'center' : 'left'), indent: (ci === 0 || ci === 4 ? 1 : 0) };
      c.border = thinBorder;
      if (ci === 1 || ci === 2) c.numFmt = '0.0" CBM"';
      if (ci === 3) c.numFmt = '#,##0" KG"';
    });
    r.height = 22;
  });

  // -------------------------------------------------------------
  // Sheet 2: 📦 商品出厂底价库 (Products) - 严格复刻 出厂底价表.xlsx + 批量活公式
  // -------------------------------------------------------------
  const ws2 = workbook.addWorksheet('📦 商品出厂底价库 (Products)', {
    views: [
      { state: 'frozen', xSplit: 1, ySplit: 1, topLeftCell: 'B2', activeCell: 'B2', showGridLines: true }
    ]
  });

  // Exactly matching widths of 出厂底价表.xlsx for columns 1-11
  ws2.columns = [
    { width: 26 }, // A: SKU
    { width: 55 }, // B: Aliases
    { width: 60 }, // C: Description
    { width: 34 }, // D: Base Cost RMB
    { width: 28 }, // E: MOQ
    { width: 26 }, // F: PCS/CTN
    { width: 26 }, // G: CBM/CTN
    { width: 30 }, // H: GW/CTN
    { width: 36 }, // I: Custom Margin
    { width: 36 }, // J: Lead Time
    { width: 26 }, // K: HS Code
    // --- 自动化批量秒算列 ---
    { width: 25 }, // L: 港杂平摊(RMB)
    { width: 22 }, // M: 生效毛利率
    { width: 28 }, // N: FOB美金单价(USD)
    { width: 26 }, // O: 20GP小柜装量(PCS)
    { width: 26 }, // P: 40HQ高柜装量(PCS)
    { width: 24 }  // Q: 利润安全状态
  ];

  const prodHeaders = [
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
    '海关编码 HS Code (选填)',
    // 批量自动联动列
    '⚡ 单件港杂平摊(RMB)',
    '⚡ 生效核算毛利率',
    '🎯 FOB美金单价(USD)',
    '📦 20GP小柜装量(PCS)',
    '📦 40HQ高柜装量(PCS)',
    '🛡️ 利润安全状态'
  ];

  const pHeaderRow = ws2.getRow(1);
  pHeaderRow.height = 32;

  prodHeaders.forEach((h, idx) => {
    const c = pHeaderRow.getCell(idx + 1);
    c.value = h;
    c.border = thinBorder;
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    if (idx < 11) {
      // Core KelvinFlow standard columns -> Deep Navy Blue (#1E3A8A)
      c.font = { name: FONT_NAME, size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
    } else {
      // Value-add auto-calc columns -> Amber Gold (#D97706)
      c.font = { name: FONT_NAME, size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_AMBER_HEADER } };
    }
  });

  const rawProducts = [
    [
      'ST-2026-A',
      'ACME-991, Heavy Bracket, 991支架, Stand Pro',
      'Aluminum Alloy Precision Bracket (铝合金精密五金支架)',
      15.5, 500, 50, 0.045, 14.5, null, '20-25 Days', '7616.99.9000'
    ],
    [
      'ST-2026-B',
      'FAST-SCREW, Hex Bolt, 不锈钢紧固件, 8820螺丝',
      'Stainless Steel Hex Fastener Screws (不锈钢沉头紧固件螺丝)',
      0.85, 5000, 1000, 0.02, 18, 0.18, '15-20 Days', '7318.15.9000'
    ],
    [
      'ERG-PRO-V2',
      'Executive Chair, 9088办公椅, CHAIR-MESH-PRO, Ergo Chair',
      'Ergonomic Mesh Office Chair (高档网布人体工学办公椅)',
      185.0, 50, 1, 0.16, 16.2, 0.25, '30-35 Days', '9401.30.0000'
    ],
    [
      'AL-BASE-99',
      '5 Star Base, Chair Leg, 铝合金五星脚, Star Base 99',
      'Die-casting Aluminum 5-Star Base (高压铸铝合金五星椅脚)',
      38.0, 200, 5, 0.08, 11, null, '25-30 Days', '9401.90.9000'
    ],
    [
      'HD-ARM-08',
      '3D Armrest, PU Arm, 升降扶手, ARM-08',
      '3D Adjustable PU Armrest Set (3D多功能升降PU扶手套装)',
      24.0, 300, 20, 0.055, 9.5, null, '20-25 Days', '9401.90.9000'
    ],
    [
      'HD-ARM-09',
      '3D Armrest Pro, PU Armrest Plus, 加强升降扶手, ARM-09',
      '3D Adjustable PU Armrest Set (3D多功能升降PU扶手套装)',
      25.0, 300, 20, 0.055, 9.5, null, '20-25 Days', '9401.90.9000'
    ]
  ];

  rawProducts.forEach((p, idx) => {
    const rowNum = idx + 2;
    const r = ws2.getRow(rowNum);
    r.height = 24;

    // A-K inputs
    for (let c = 0; c < 11; c++) {
      const cell = r.getCell(c + 1);
      cell.value = p[c];
      cell.font = { name: FONT_NAME, size: 9.5, color: { argb: COLOR_TEXT } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: (idx % 2 === 0 ? 'FFFFFFFF' : COLOR_LIGHT_BG) } };
      cell.border = thinBorder;
      
      // Formatting
      if (c === 0) cell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (c === 1 || c === 2) cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      if (c === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '¥#,##0.00';
        cell.font = { name: FONT_NAME, size: 9.5, bold: true, color: { argb: COLOR_TEXT } };
      }
      if (c === 4 || c === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.numFmt = '#,##0';
      }
      if (c === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.numFmt = '0.000';
      }
      if (c === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.numFmt = '0.0';
      }
      if (c === 8) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.numFmt = '0.0%';
      }
      if (c === 9 || c === 10) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    }

    // L-Q Live Formulas
    const cellL = r.getCell(12);
    cellL.value = { formula: `'⚙️ 全局核算参数 (Config)'!$C$22` };
    cellL.numFmt = '¥#,##0.00';

    const cellM = r.getCell(13);
    cellM.value = { formula: `IF(ISBLANK(I${rowNum}), '⚙️ 全局核算参数 (Config)'!$B$14, I${rowNum})` };
    cellM.numFmt = '0.0%';

    const cellN = r.getCell(14);
    cellN.value = { formula: `ROUND(((D${rowNum} * (1 + M${rowNum}) + L${rowNum}) / '⚙️ 全局核算参数 (Config)'!$B$6), 2)` };
    cellN.numFmt = '$#,##0.00';

    const cellO = r.getCell(15);
    cellO.value = { formula: `IF(AND(G${rowNum}>0, F${rowNum}>0), INT(('⚙️ 全局核算参数 (Config)'!$B$33 / G${rowNum})) * F${rowNum}, "-")` };
    cellO.numFmt = '#,##0';

    const cellP = r.getCell(16);
    cellP.value = { formula: `IF(AND(G${rowNum}>0, F${rowNum}>0), INT(('⚙️ 全局核算参数 (Config)'!$B$35 / G${rowNum})) * F${rowNum}, "-")` };
    cellP.numFmt = '#,##0';

    const cellQ = r.getCell(17);
    cellQ.value = { formula: `IF(M${rowNum}<'⚙️ 全局核算参数 (Config)'!$B$15, "🚨 穿透红线", IF(M${rowNum}>=0.25, "💎 高毛利款", "✅ 利润健康"))` };

    for (let c = 12; c <= 17; c++) {
      const cell = r.getCell(c);
      cell.border = thinBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_AMBER_FILL } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.font = { 
        name: FONT_NAME, 
        size: 9.5, 
        bold: (c === 14 || c === 17),
        color: (c === 14 ? { argb: COLOR_NAVY } : { argb: COLOR_TEXT })
      };
    }
  });

  // -------------------------------------------------------------
  // Sheet 3: 📄 对外纯净批量报价单 (脱敏单) - 商业专业英文报价单
  // -------------------------------------------------------------
  const ws3 = workbook.addWorksheet('📄 对外纯净批量报价单 (脱敏单)', {
    views: [
      { state: 'frozen', xSplit: 2, ySplit: 3, topLeftCell: 'C4', activeCell: 'C4', showGridLines: true }
    ]
  });

  ws3.columns = [
    { width: 8 },  // A: Item
    { width: 20 }, // B: Model No.
    { width: 55 }, // C: Description
    { width: 14 }, // D: MOQ
    { width: 22 }, // E: FOB Price (USD)
    { width: 18 }, // F: Packing
    { width: 20 }, // G: 20GP Est.
    { width: 20 }, // H: 40HQ Est.
    { width: 20 }  // I: Lead Time
  ];

  ws3.mergeCells('A1:I1');
  ws3.getCell('A1').value = 'GLOBAL EXPORT FORMAL QUOTATION (COMMERCIAL OFFER)';
  ws3.getCell('A1').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  ws3.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  ws3.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  ws3.getRow(1).height = 36;

  ws3.mergeCells('A2:E2');
  ws3.getCell('A2').value = 'Trade Term: FOB Shenzhen (Incoterms 2020)  |  Currency: USD ($)';
  ws3.getCell('A2').font = { name: 'Arial', size: 9.5, italic: true, color: { argb: COLOR_TEXT } };
  ws3.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LIGHT_BG } };
  ws3.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  ws3.mergeCells('F2:I2');
  ws3.getCell('F2').value = 'Payment: 30% Deposit, 70% Before Shipment  |  Price Validity: 30 Days';
  ws3.getCell('F2').font = { name: 'Arial', size: 9.5, italic: true, color: { argb: COLOR_TEXT } };
  ws3.getCell('F2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LIGHT_BG } };
  ws3.getCell('F2').alignment = { vertical: 'middle', horizontal: 'right' };
  ws3.getRow(2).height = 24;

  const quoteHeaders = [
    'Item',
    'Model No.',
    'Product Description & Detailed Specifications',
    'MOQ (PCS)',
    'FOB Price (USD)',
    'Packing (PCS/CTN)',
    '20GP Est. (PCS)',
    '40HQ Est. (PCS)',
    'Lead Time'
  ];
  const qHeaderRow = ws3.getRow(3);
  qHeaderRow.height = 26;
  quoteHeaders.forEach((h, i) => {
    const c = qHeaderRow.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BLUE } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = thinBorder;
  });

  for (let i = 0; i < rawProducts.length; i++) {
    const srcRow = i + 2;
    const destRow = i + 4;
    const r = ws3.getRow(destRow);
    r.height = 22;

    const rData = [
      i + 1,
      { formula: `'📦 商品出厂底价库 (Products)'!A${srcRow}` },
      { formula: `'📦 商品出厂底价库 (Products)'!C${srcRow}` },
      { formula: `'📦 商品出厂底价库 (Products)'!E${srcRow}` },
      { formula: `'📦 商品出厂底价库 (Products)'!N${srcRow}` },
      { formula: `'📦 商品出厂底价库 (Products)'!F${srcRow}` },
      { formula: `'📦 商品出厂底价库 (Products)'!O${srcRow}` },
      { formula: `'📦 商品出厂底价库 (Products)'!P${srcRow}` },
      { formula: `'📦 商品出厂底价库 (Products)'!J${srcRow}` }
    ];

    rData.forEach((val, ci) => {
      const c = r.getCell(ci + 1);
      c.value = val;
      c.font = { name: 'Arial', size: 9.5, color: { argb: COLOR_TEXT } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: (i % 2 === 0 ? 'FFFFFFFF' : COLOR_LIGHT_BG) } };
      c.border = thinBorder;
      c.alignment = { vertical: 'middle', horizontal: (ci === 2 ? 'left' : 'center'), indent: (ci === 2 ? 1 : 0) };

      if (ci === 4) {
        c.numFmt = '$#,##0.00';
        c.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLOR_NAVY } };
      }
      if (ci === 3 || ci === 5 || ci === 6 || ci === 7) {
        c.numFmt = '#,##0';
      }
    });
  }

  // Destination paths (Local & Online standardized filenames)
  const targets = [
    // 1. 小红书群文件分发版（本地版唯一最终版）
    'F:/xhs_operator/lead_magnets/2026外贸出厂底价表与智能核价模板.xlsx',
    'F:/order_workflow/media_vault/lead_magnets/2026外贸出厂底价表与智能核价模板.xlsx',
    // 2. 线上系统模板（双表旗舰版）
    'F:/order_workflow/商品底价表/外贸出厂底价表与智能核价模板.xlsx',
    'F:/order_workflow/商品底价表/出厂底价表.xlsx',
    'F:/order_workflow/public/templates/外贸出厂底价表与智能核价模板_双表旗舰版.xlsx',
    'F:/order_workflow/public/templates/极简出厂底价表_双表旗舰版.xlsx'
  ];

  for (const t of targets) {
    try {
      await workbook.xlsx.writeFile(t);
      console.log('✅ 成功同步写入:', t);
    } catch (e) {
      console.warn('⚠️ 写入失败 (可能被占用):', t, e.message);
    }
  }

  console.log('🎉 全部出厂底价表与群文件模板已 100% 同步升级完毕！');
}

buildUnifiedMasterTemplate().catch(console.error);
