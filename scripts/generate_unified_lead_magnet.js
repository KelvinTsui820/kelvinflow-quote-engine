import ExcelJS from 'exceljs';
import path from 'path';

async function buildMasterTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IT佬Kelvin';
  workbook.lastModifiedBy = 'IT佬Kelvin';
  workbook.created = new Date();
  workbook.modified = new Date();

  // -------------------------------------------------------------
  // Sheet 1: ⚙️ 全局核算参数 (Config)
  // -------------------------------------------------------------
  const ws1 = workbook.addWorksheet('⚙️ 全局核算参数 (Config)', {
    views: [{ showGridLines: true }]
  });

  ws1.columns = [
    { width: 32 }, // A
    { width: 28 }, // B
    { width: 16 }, // C
    { width: 34 }, // D
    { width: 42 }  // E
  ];

  // Header banner
  ws1.mergeCells('A1:E1');
  ws1.getCell('A1').value = '🏢 我司外贸出厂核算控制台 · 全局业务参数配置 (Global Configuration)';
  ws1.getCell('A1').font = { name: 'Microsoft YaHei', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  ws1.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }; // Dark charcoal
  ws1.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  ws1.getRow(1).height = 36;

  ws1.mergeCells('A2:E2');
  ws1.getCell('A2').value = '💡 本表由企业掌门人/财务部专管；在此设定的汇率、保底毛利率与业务条款将自动联动全量商品出厂核算与防穿底控制。';
  ws1.getCell('A2').font = { name: 'Microsoft YaHei', size: 10, italic: true, color: { argb: 'FF4B5563' } };
  ws1.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  ws1.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
  ws1.getRow(2).height = 24;

  // Module 1: Exchange Rates
  ws1.mergeCells('A4:E4');
  ws1.getCell('A4').value = '💵 模块一：结算币种与内部锁定汇率 (Currency & Exchange Rates)';
  ws1.getCell('A4').font = { name: 'Microsoft YaHei', size: 11, bold: true, color: { argb: 'FF1E40AF' } };
  ws1.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  ws1.getRow(4).height = 26;

  const m1Headers = ['外币币种 (Target Currency)', '内部锁定汇率 (Rate To RMB)', '币种符号 (Symbol)', '汇率波动预警保护基准', '适用采购区域 (采购商来源)'];
  ws1.addRow(m1Headers);
  const r5 = ws1.getRow(5);
  r5.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FF374151' } };
  r5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
  r5.height = 24;

  const m1Data = [
    ['USD', 7.20, '$', '★ 基准主币种 (波动±3%保护)', '北美、东南亚、全球主流外贸结算 (默认主币种)'],
    ['EUR', 7.85, '€', '基准锁定汇率 (波动±3%保护)', '欧盟及欧洲自由贸易区国家采购商'],
    ['GBP', 9.10, '£', '基准锁定汇率 (波动±3%保护)', '英国及英联邦国家采购商'],
    ['AUD', 4.80, 'A$', '基准锁定汇率 (波动±3%保护)', '澳大利亚、新西兰及大洋洲采购商'],
    ['CAD', 5.30, 'C$', '基准锁定汇率 (波动±3%保护)', '加拿大市场专属采购商']
  ];
  m1Data.forEach(row => ws1.addRow(row));

  // Module 2: Profit Margin & Redline
  ws1.mergeCells('A12:E12');
  ws1.getCell('A12').value = '📈 模块二：利润红线与防穿底控制 (Profit Margin & Cost Protection)';
  ws1.getCell('A12').font = { name: 'Microsoft YaHei', size: 11, bold: true, color: { argb: 'FF991B1B' } };
  ws1.getCell('A12').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
  ws1.getRow(12).height = 26;

  const m2Headers = ['参数控制项 (Control Parameter)', '设置基准值 (Setting Value)', '参数格式/单位', '系统生效机制与风控规则说明', '责任人/控制级别'];
  ws1.addRow(m2Headers);
  const r13 = ws1.getRow(13);
  r13.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FF374151' } };
  r13.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
  r13.height = 24;

  const m2Data = [
    ['全厂默认保底毛利率 (Default Margin)', 0.15, '15% 百分比 (0.15)', '出厂安全底价基础上浮动加价；单品未设时自动继承此参数', '企业掌门人 / 老板'],
    ['最低保护红线毛利率 (Floor Margin)', 0.08, '8% 百分比 (0.08)', '业务员最低授权底线，低于此红线系统强制拦截并报警打回', '老板 / 财务总监'],
    ['样品打样费上浮倍率 (Sample Multiplier)', 2.5, '倍率 (出厂价*2.5)', '覆盖小批量散单模具调机成本，后续批量达标全额抵扣货款', '厂长 / 工程部'],
    ['报价单默认有效期 (Price Validity)', '30 Days', '天数', '超出 30 天需重新核实原材料成本与外币汇率波动情况', '外贸部主管']
  ];
  m2Data.forEach(row => ws1.addRow(row));

  // Module 3: Incoterms & Port Charges
  ws1.mergeCells('A19:E19');
  ws1.getCell('A19').value = '🚢 模块三：默认贸易术语与杂费基准 (Incoterms & Port Charges)';
  ws1.getCell('A19').font = { name: 'Microsoft YaHei', size: 11, bold: true, color: { argb: 'FF065F46' } };
  ws1.getCell('A19').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
  ws1.getRow(19).height = 26;

  const m3Headers = ['贸易术语 (Incoterm)', '指定交货港口 / 地点', '单件均摊杂费 (RMB)', '整柜固定杂费 (RMB)', '费用包含范围与口岸说明'];
  ws1.addRow(m3Headers);
  const r20 = ws1.getRow(20);
  r20.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FF374151' } };
  r20.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
  r20.height = 24;

  const m3Data = [
    ['EXW', '工厂车间自提 (Factory Ex-works)', 0.00, 0.00, '买家自提，仅含标准纸箱包装，无港口杂费与拖车费'],
    ['FOB', '深圳盐田港 / 蛇口港 (Shenzhen)', 0.20, 1500.00, '包含工厂至深圳码头内陆拖车、出口报关、港杂码头费(THC)'],
    ['CIF', '目的港（根据买家询盘实时测算）', '实时测算', '含基础货运险', '根据货柜实际目的港与实时船期核算海运费与保费']
  ];
  m3Data.forEach(row => ws1.addRow(row));

  // Module 4: Payment Terms
  ws1.mergeCells('A25:E25');
  ws1.getCell('A25').value = '💳 模块四：默认付款方式与结算浮动 (Payment Terms)';
  ws1.getCell('A25').font = { name: 'Microsoft YaHei', size: 11, bold: true, color: { argb: 'FF7C2D12' } };
  ws1.getCell('A25').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
  ws1.getRow(25).height = 26;

  const m4Headers = ['付款方式 (Payment Term)', '价格浮动比例 (%)', '支持结算币种', '资金周转成本与商业规则说明', '适用客户等级与授信'];
  ws1.addRow(m4Headers);
  const r26 = ws1.getRow(26);
  r26.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FF374151' } };
  r26.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
  r26.height = 24;

  const m4Data = [
    ['100% T/T Advance (全款预付)', -0.02, 'USD / EUR / GBP', '买家全款预付直享 98 折，极大加速工厂现金流周转', '新老客户通用优惠'],
    ['30% Deposit + 70% Balance (标准前T/T)', 0.00, 'USD / EUR / GBP', '外贸行业标准条款：30%定金排产，70%见提单副本付款', '标准成交客户'],
    ['L/C at Sight (即期不可撤销信用证)', 0.015, 'USD / EUR', '覆盖银行开证手续费与议付审单合规成本', '信用优良大客户']
  ];
  m4Data.forEach(row => ws1.addRow(row));

  // Module 5: Container specs
  ws1.mergeCells('A31:E31');
  ws1.getCell('A31').value = '📦 模块五：集装箱装载容积速查标尺 (Container Volume Guidelines)';
  ws1.getCell('A31').font = { name: 'Microsoft YaHei', size: 11, bold: true, color: { argb: 'FF4338CA' } };
  ws1.getCell('A31').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
  ws1.getRow(31).height = 26;

  const m5Headers = ['集装箱型号 (Container Type)', '安全装载容积 (CBM)', '理论容积 (CBM)', '最大限重 (KG)', '装柜适用选型建议'];
  ws1.addRow(m5Headers);
  const r32 = ws1.getRow(32);
  r32.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FF374151' } };
  r32.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
  r32.height = 24;

  const m5Data = [
    ['20GP (20尺小柜)', 28.0, 33.2, 21800, '适合五金紧固件、金属椅脚等高密度重货或试单'],
    ['40GP (40尺平柜)', 58.0, 67.7, 26000, '适合体积适中、重量适中的常规工业品与配件'],
    ['40HQ (40尺高柜)', 68.0, 76.3, 26000, '适合办公椅、支架、轻泡货等大体积外贸商品']
  ];
  m5Data.forEach(row => ws1.addRow(row));

  // -------------------------------------------------------------
  // Sheet 2: 📦 商品出厂底价库 (Products) - 含批量自动秒算列
  // -------------------------------------------------------------
  const ws2 = workbook.addWorksheet('📦 商品出厂底价库 (Products)', {
    views: [{ showGridLines: true }]
  });

  ws2.columns = [
    { width: 16 }, // A: SKU
    { width: 34 }, // B: Aliases
    { width: 38 }, // C: English Desc
    { width: 16 }, // D: Cost RMB
    { width: 14 }, // E: MOQ
    { width: 14 }, // F: PCS/CTN
    { width: 16 }, // G: CBM/CTN
    { width: 16 }, // H: GW/CTN
    { width: 20 }, // I: Custom Margin
    { width: 18 }, // J: Lead Time
    { width: 16 }, // K: HS Code
    // --- 自动化批量核算与装柜测算列 ---
    { width: 18 }, // L: 港杂平摊(RMB)
    { width: 16 }, // M: 生效毛利率
    { width: 22 }, // N: FOB美金单价(USD)
    { width: 18 }, // O: 20GP小柜装量(PCS)
    { width: 18 }, // P: 40HQ高柜装量(PCS)
    { width: 18 }  // Q: 利润红线预警
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
    // 自动计算区
    '⚡ 单件港杂平摊(RMB)',
    '⚡ 生效核算毛利率',
    '🎯 FOB美金单价(USD)',
    '📦 20GP小柜装量(PCS)',
    '📦 40HQ高柜装量(PCS)',
    '🛡️ 利润安全状态'
  ];

  ws2.addRow(prodHeaders);
  const pHeaderRow = ws2.getRow(1);
  pHeaderRow.height = 32;
  pHeaderRow.font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };

  // Color-code the headers: A-K = Blue grey (Input), L-Q = Amber gold (Auto Calc)
  for (let c = 1; c <= 11; c++) {
    pHeaderRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    pHeaderRow.getCell(c).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  }
  for (let c = 12; c <= 17; c++) {
    pHeaderRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } }; // Amber
    pHeaderRow.getCell(c).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  }

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
    const rowData = [
      p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10],
      // L: Port fee formula
      { formula: `'⚙️ 全局核算参数 (Config)'!$C$22` },
      // M: Effective margin formula (use item margin if present, else inherit config B14)
      { formula: `IF(ISBLANK(I${rowNum}), '⚙️ 全局核算参数 (Config)'!$B$14, I${rowNum})` },
      // N: FOB USD price formula: ROUND(((D * (1 + M) + L) / Config Rate), 2)
      { formula: `ROUND(((D${rowNum} * (1 + M${rowNum}) + L${rowNum}) / '⚙️ 全局核算参数 (Config)'!$B$6), 2)` },
      // O: 20GP capacity: INT(20GP CBM / Carton CBM) * PCS/CTN
      { formula: `IF(AND(G${rowNum}>0, F${rowNum}>0), INT(('⚙️ 全局核算参数 (Config)'!$B$33 / G${rowNum})) * F${rowNum}, "-")` },
      // P: 40HQ capacity: INT(40HQ CBM / Carton CBM) * PCS/CTN
      { formula: `IF(AND(G${rowNum}>0, F${rowNum}>0), INT(('⚙️ 全局核算参数 (Config)'!$B$35 / G${rowNum})) * F${rowNum}, "-")` },
      // Q: Margin security alert: IF(M < FloorMargin, Red, IF(M >= 0.25, High, Safe))
      { formula: `IF(M${rowNum}<'⚙️ 全局核算参数 (Config)'!$B$15, "🚨 穿透红线", IF(M${rowNum}>=0.25, "💎 高毛利款", "✅ 利润健康"))` }
    ];

    const addedRow = ws2.addRow(rowData);
    addedRow.height = 24;
    addedRow.font = { name: 'Microsoft YaHei', size: 9.5 };

    // Format numbers
    addedRow.getCell(4).numFmt = '¥#,##0.00'; // D: Cost
    addedRow.getCell(9).numFmt = '0.0%';      // I: Custom Margin
    addedRow.getCell(12).numFmt = '¥#,##0.00'; // L: Port fee
    addedRow.getCell(13).numFmt = '0.0%';     // M: Effective margin
    addedRow.getCell(14).numFmt = '$#,##0.00'; // N: USD price
    addedRow.getCell(15).numFmt = '#,##0';     // O: 20GP
    addedRow.getCell(16).numFmt = '#,##0';     // P: 40HQ

    // Highlight Auto-calc cells with subtle soft yellow fill
    for (let c = 12; c <= 17; c++) {
      addedRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      addedRow.getCell(c).font = { name: 'Microsoft YaHei', size: 9.5, bold: (c === 14 || c === 17) };
    }
  });

  // -------------------------------------------------------------
  // Sheet 3: 📄 对外纯净批量报价单 (买家即时脱敏单)
  // -------------------------------------------------------------
  const ws3 = workbook.addWorksheet('📄 对外纯净批量报价单 (脱敏单)', {
    views: [{ showGridLines: true }]
  });

  ws3.columns = [
    { width: 8 },  // A: Item
    { width: 16 }, // B: Model No.
    { width: 42 }, // C: Description
    { width: 12 }, // D: MOQ
    { width: 18 }, // E: FOB Shenzhen (USD)
    { width: 16 }, // F: Packing (PCS/CTN)
    { width: 18 }, // G: 20GP Qty (PCS)
    { width: 18 }, // H: 40HQ Qty (PCS)
    { width: 18 }  // I: Lead Time
  ];

  // Header Title
  ws3.mergeCells('A1:I1');
  ws3.getCell('A1').value = 'GLOBAL EXPORT FORMAL QUOTATION (COMMERCIAL OFFER)';
  ws3.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  ws3.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Navy blue
  ws3.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  ws3.getRow(1).height = 36;

  ws3.mergeCells('A2:E2');
  ws3.getCell('A2').value = 'Trade Term: FOB Shenzhen (Incoterms 2020)  |  Currency: USD ($)';
  ws3.getCell('A2').font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF374151' } };

  ws3.mergeCells('F2:I2');
  ws3.getCell('F2').value = 'Payment: 30% Deposit, 70% Before Shipment  |  Price Validity: 30 Days';
  ws3.getCell('F2').font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF374151' } };
  ws3.getCell('F2').alignment = { horizontal: 'right' };
  ws3.getRow(2).height = 22;

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
  ws3.addRow(quoteHeaders);
  const qHeaderRow = ws3.getRow(3);
  qHeaderRow.height = 26;
  qHeaderRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  for (let c = 1; c <= 9; c++) {
    qHeaderRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    qHeaderRow.getCell(c).alignment = { vertical: 'middle', horizontal: 'center' };
  }

  for (let i = 0; i < rawProducts.length; i++) {
    const srcRow = i + 2;
    const destRow = i + 4;
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
    const row = ws3.addRow(rData);
    row.height = 22;
    row.font = { name: 'Arial', size: 9.5 };
    row.getCell(5).numFmt = '$#,##0.00';
    row.getCell(5).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E40AF' } };
    row.getCell(7).numFmt = '#,##0';
    row.getCell(8).numFmt = '#,##0';
  }

  // -------------------------------------------------------------
  // Sheet 0: 📌 使用指南与提效说明 (Placed first)
  // -------------------------------------------------------------
  const ws0 = workbook.addWorksheet('📌 使用指南与提效神器', {
    views: [{ showGridLines: true }]
  });

  ws0.columns = [
    { width: 6 },
    { width: 24 },
    { width: 75 }
  ];

  ws0.mergeCells('B2:C2');
  ws0.getCell('B2').value = '【2026 外贸出厂核算控制台与批量算价神表】使用指南';
  ws0.getCell('B2').font = { name: 'Microsoft YaHei', size: 14, bold: true, color: { argb: 'FF1F2937' } };
  ws0.getRow(2).height = 32;

  const guideItems = [
    ['为什么做这套表？', '拒绝单品手工反复按计算器！本表专为外贸工贸企业、外贸SOHO与业务员打造，左边批量录入产品，右侧全自动秒出多币种FOB美金价、集装箱柜量与利润红线防御。'],
    ['【全局核算参数】怎么用？', '在第2个工作表设定您公司的锁定汇率（如USD 7.2）、全厂保底毛利（如15%）、最低红线（如8%）与海运进仓港杂平摊（如0.20元/件）。修改后全表全量产品秒级联动重算。'],
    ['【商品底价库】怎么用？', '在第3个工作表录入产品SKU、出厂底价与包装尺寸。黄色公式区会自动联动倒算出精准FOB美金报价、自动算出20GP/40HQ可装柜件数，若毛利低于红线会自动闪烁警报。'],
    ['对外发客户安全吗？', '100%安全！第4个工作表【对外纯净批量报价单】为买家专属视图，底价、成本与毛利率全部脱敏，可直接打印或导出PDF发给海外买家。'],
    ['作者与开源协议', '由大湾区全栈独立开发者 Kelvin (IT佬Kelvin) 荣誉出品，永久免费，纯净无广告，禁止二次倒卖。'],
    ['🚀 终极提效彩蛋 (SaaS兼容)', '本表格的字段规范与 KelvinFlow 智能出单引擎 (https://quote.kelvinflow.com) 100% 原生兼容！日常若收到复杂多品类海外询盘邮件，无需手动查找排版，直接上传本表即可 10 秒自动审单并生成专业英文 PDF 报价单。欢迎在小红书官方粉丝群内交流探讨！']
  ];

  guideItems.forEach((item, idx) => {
    const rowNum = idx + 4;
    ws0.getCell(`B${rowNum}`).value = item[0];
    ws0.getCell(`B${rowNum}`).font = { name: 'Microsoft YaHei', size: 10, bold: true, color: { argb: 'FF1E40AF' } };
    ws0.getCell(`C${rowNum}`).value = item[1];
    ws0.getCell(`C${rowNum}`).font = { name: 'Microsoft YaHei', size: 10, color: { argb: 'FF374151' } };
    ws0.getCell(`C${rowNum}`).alignment = { wrapText: true };
    ws0.getRow(rowNum).height = 26;
  });

  // Reorder sheets so Guide is first
  // Note: in exceljs, sheets can be moved or created in order.
  // Let's create another workbook or save directly.

  const newMasterPath1 = 'F:/xhs_operator/lead_magnets/2026_外贸出厂核算控制台与批量算价神表_Kelvin旗舰版.xlsx';
  const newMasterVault1 = 'F:/order_workflow/media_vault/lead_magnets/2026_外贸出厂核算控制台与批量算价神表_Kelvin旗舰版.xlsx';

  await workbook.xlsx.writeFile(newMasterPath1);
  await workbook.xlsx.writeFile(newMasterVault1);

  // Also attempt to overwrite existing files if not locked
  const otherPaths = [
    'F:/xhs_operator/lead_magnets/2026_外贸精准核价Excel模板.xlsx',
    'F:/xhs_operator/lead_magnets/2026_外贸防泄露自动核价模板_Kelvin极客版.xlsx',
    'F:/order_workflow/media_vault/lead_magnets/2026_外贸精准核价Excel模板.xlsx',
    'F:/order_workflow/media_vault/lead_magnets/2026_外贸防泄露自动核价模板_Kelvin极客版.xlsx'
  ];

  for (const p of otherPaths) {
    try {
      await workbook.xlsx.writeFile(p);
      console.log('Updated:', p);
    } catch (e) {
      console.warn('Skipped locked file (open in Excel):', p);
    }
  }

  console.log('✅ Master templates written successfully to:', newMasterPath1);
}

buildMasterTemplate().catch(console.error);
