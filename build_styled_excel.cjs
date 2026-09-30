const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function buildStyledWorkbookSimplified() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'AI外贸数字员工';
  wb.lastModifiedBy = 'AI外贸报价大脑';
  wb.created = new Date();
  wb.modified = new Date();

  const FONT_FAMILY = 'Microsoft YaHei';
  const BORDER_STYLE = {
    top: { style: 'thin', color: { argb: 'E2E8F0' } },
    left: { style: 'thin', color: { argb: 'E2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
    right: { style: 'thin', color: { argb: 'E2E8F0' } }
  };

  function applySheetStyles(ws, headerBgArgb = '1E3A8A', customColWidths = {}) {
    // 冻结首行
    ws.views = [{ showGridLines: true, state: 'frozen', ySplit: 1, xSplit: 0 }];

    // 1. 第一步：计算各列最优宽度（更宽裕的余量，上限提升至 92，彻底避免过窄挤压）
    ws.columns.forEach((col, colIdx) => {
      let maxLen = 12;
      col.eachCell({ includeEmpty: false }, cell => {
        const val = cell.value ? (typeof cell.value === 'object' && cell.value.formula ? cell.value.result || cell.value.formula : cell.value.toString()) : '';
        let len = 0;
        for (let i = 0; i < val.length; i++) {
          len += val.charCodeAt(i) > 255 ? 2.1 : 1.1;
        }
        if (len > maxLen) maxLen = len;
      });
      // 赋予更充裕的安全边距，上限提升至 92
      const calculatedWidth = Math.min(Math.max(Math.ceil(maxLen) + 6, 18), 92);
      col.width = customColWidths[colIdx + 1] || calculatedWidth;
    });

    // 2. 第二步：根据各单元格文本长度与列宽，动态自适应计算各行行高与最佳对齐
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      let maxLinesInRow = 1;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = BORDER_STYLE;

        const val = cell.value ? (typeof cell.value === 'object' && cell.value.formula ? cell.value.result || cell.value.formula : cell.value) : '';
        const strVal = val != null ? String(val) : '';
        let cellVisualLen = 0;
        for (let i = 0; i < strVal.length; i++) {
          cellVisualLen += strVal.charCodeAt(i) > 255 ? 2.1 : 1.1;
        }

        const colWidth = ws.getColumn(colNumber).width || 20;
        const availableWidth = Math.max(10, colWidth - 4);
        const estimatedLines = Math.max(1, Math.ceil(cellVisualLen / availableWidth));
        const explicitLines = strVal.split('\n').length;
        const lines = Math.max(estimatedLines, explicitLines);

        if (lines > maxLinesInRow) {
          maxLinesInRow = lines;
        }

        if (rowNumber === 1) {
          // 表头：居中对齐，加粗白色字体
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true
          };
          cell.font = {
            name: FONT_FAMILY,
            size: 10.5,
            bold: true,
            color: { argb: 'FFFFFF' }
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: headerBgArgb }
          };
        } else {
          // 数据行：长说明与包含标点/空格的长文本左对齐（更易阅读），短代码/数字居中对齐
          const isLongDescription = cellVisualLen > 24 || strVal.includes('，') || strVal.includes('。') || strVal.includes('、') || (strVal.length > 20 && strVal.includes(' '));
          cell.alignment = {
            vertical: 'middle',
            horizontal: isLongDescription ? 'left' : 'center',
            wrapText: true
          };
          cell.font = {
            name: FONT_FAMILY,
            size: 10,
            color: { argb: '1E293B' }
          };
          // 斑马条纹
          if (rowNumber % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'F8FAFC' }
            };
          }
        }
      });

      // 动态行高：表头 36pt；数据行根据折行行数自适应计算，单行 28pt，双行 48pt，三行 68pt，确保绝不截断
      if (rowNumber === 1) {
        row.height = 36;
      } else {
        row.height = Math.max(28, maxLinesInRow * 20 + 8);
      }
    });
  }

  // =========================================================================
  // 0. 工作表 0: 📌使用指南 (ReadMe) - 纯简体中文
  // =========================================================================
  const ws0 = wb.addWorksheet('📌使用指南 (ReadMe)');
  ws0.addRow(['模块与工作表', '核心业务功能与作用', '责任人/维护角色', '系统生效机制与中小企业实操指南']);
  ws0.addRows([
    [
      '💡【安全防线】老板安全结算底价',
      '强烈建议在底价库中直接填写【安全对内结算底价】（已含工厂保底利润），绝无需录入真实生产成本！商业机密永不外泄',
      '企业老板 / 掌门人',
      '对外所有报价与核算均在此底价基础上向上浮动加价，即使员工或客户看到也永远不亏！'
    ],
    [
      '🚀【极简开箱】3分钟极速上手',
      '小微企业仅需维护【产品型号】、【产品名称】、【出厂底价】3 列即可全面跑通！其余12列均为选填智能增益项',
      '业务员 / 跟单 / 财务',
      '支持任意顺序与模糊表头，5分钟即可将工厂现有的老 Excel 直接导入系统生效！'
    ],
    [
      '1. 商品底价库 (Products)',
      '维护所有产品出厂安全底价、期望毛利、阶梯价、箱规与海关编码（前3列必填，其余按需选填）',
      '企业老板 / 财务总监',
      '修改后上传或发邮件即可秒级全员生效'
    ],
    [
      '2. 选配与工艺附加费 (Addons)',
      '定义喷涂、刻标、防火棉、开模等定制工艺加价规则',
      '工程部 / 报价经理',
      'AI 自动在 PO 描述与备注中智能匹配累加'
    ],
    [
      '3. 贸易术语与杂费 (Incoterms)',
      '配置 EXW 出厂价 / FOB 港口拖车报关杂费 / CIF 目的港海运指导',
      '出口单证 / 外贸经理',
      '根据买家指定交货条件自动计算港口杂费'
    ],
    [
      '4. 集装箱装载速算 (Container_Calc)',
      '20GP / 40GP / 40HQ 标箱容积与智能装柜计算器',
      '物流部 / 业务员',
      '自动在 PDF 报价单呈现整柜装箱能力'
    ],
    [
      '5. 汇率与风控 (Exchange_Rates)',
      '设定企业内部锁定基准汇率与 ±3% 汇率波动保护条款',
      '财务部 / 外贸总监',
      '锁定汇率，有效抵御人民币升值风险'
    ],
    [
      '6. 付款方式与条款 (Payment_Terms)',
      '定义 100%全款预付折扣、即期信用证与信保账期成本',
      '财务部 / 老板',
      '自动核算账期资金成本'
    ]
  ]);
  applySheetStyles(ws0, '1E293B', { 1: 36, 2: 76, 3: 24, 4: 76 });

  // =========================================================================
  // 1. 工作表 1: 商品底价库 (Products) - 纯简体中文
  // =========================================================================
  const ws1 = wb.addWorksheet('商品底价库 (Products)');
  ws1.addRow([
    '产品型号/SKU (必填)',
    '买家常用别名 (Aliases·选填)',
    '产品名称与规格 (必填·英文品名)',
    '出厂底价 (RMB Cost·必填安全结算底价)',
    '最低保护红线价 (Floor Price·选填)',
    '预期毛利率 (Margin·选填)',
    '最小起订量 (MOQ·选填)',
    '样品打样倍率 (Sample Multiplier·选填)',
    '5000件优惠底价 (Tier2·选填)',
    '整柜特惠底价 (Tier3·选填)',
    '单箱装量 (PCS/CTN·装柜选填)',
    '外箱体积 (CBM/CTN·装柜选填)',
    '生产交期 (Lead Time·选填)',
    '海关编码 (HS Code·选填)',
    '参考美元售价 (USD Ref Price·公式计算)'
  ]);
  ws1.addRows([
    [
      'ST-2026-A',
      'ACME-991, Heavy Bracket, 991支架, Stand Pro',
      'Aluminum Alloy Precision Bracket (铝合金精密五金支架)',
      15.50,
      13.00,
      0.30,
      1000,
      2.5,
      13.50,
      12.00,
      50,
      0.045,
      '25-30 Days',
      '7616.99.90',
      { formula: 'ROUND(((D2*(1+F2)+0)/\'汇率与风控 (Exchange_Rates)\'!B2), 2)', result: 2.80 }
    ],
    [
      'ST-2026-B',
      'FAST-SCREW, Hex Bolt, 不锈钢紧固件, 8820螺丝',
      'Stainless Steel Hex Fastener Screws (不锈钢沉头紧固件螺丝)',
      0.85,
      0.60,
      0.40,
      5000,
      3.0,
      0.72,
      0.65,
      1000,
      0.015,
      '15-20 Days',
      '7318.15.00',
      { formula: 'ROUND(((D3*(1+F3)+0)/\'汇率与风控 (Exchange_Rates)\'!B2), 2)', result: 0.17 }
    ],
    [
      'ERG-PRO-V2',
      'Ergo Chair, Mesh Pro Chair, 9088办公椅, Executive Chair',
      'Ergonomic Mesh Office Chair (人体工学全网办公椅)',
      185.00,
      150.00,
      0.35,
      200,
      2.0,
      168.00,
      155.00,
      1,
      0.145,
      '30-35 Days',
      '9401.31.00',
      { formula: 'ROUND(((D4*(1+F4)+0)/\'汇率与风控 (Exchange_Rates)\'!B2), 2)', result: 34.69 }
    ],
    [
      'AL-BASE-99',
      '5-Star Base, Chair Leg, 铝合金五星脚, Star Base 99',
      'Die-casting Aluminum 5-Star Base (高压铸铝五星椅脚)',
      38.00,
      30.00,
      0.30,
      500,
      2.5,
      34.50,
      31.00,
      5,
      0.085,
      '20-25 Days',
      '9401.99.00',
      { formula: 'ROUND(((D5*(1+F5)+0)/\'汇率与风控 (Exchange_Rates)\'!B2), 2)', result: 6.86 }
    ],
    [
      'HD-ARM-08',
      '3D Armrest, PU Arm, 升降扶手, ARM-08',
      '3D Adjustable PU Armrest Set (3D升降多功能PU扶手套装)',
      24.00,
      19.00,
      0.30,
      500,
      2.5,
      21.50,
      19.50,
      20,
      0.060,
      '20-25 Days',
      '9401.99.00',
      { formula: 'ROUND(((D6*(1+F6)+0)/\'汇率与风控 (Exchange_Rates)\'!B2), 2)', result: 4.33 }
    ]
  ]);
  applySheetStyles(ws1, '1E3A8A', { 2: 48, 3: 58, 4: 40, 15: 38 });

  // =========================================================================
  // 2. 工作表 2: 选配与工艺附加费 (Addons) - 纯简体中文
  // =========================================================================
  const ws2 = wb.addWorksheet('选配与工艺附加费 (Addons)');
  ws2.addRow(['选配工艺关键词 (Keywords)', '适用范围', '加价金额 (RMB)', '计价单位', '工艺说明与模具返还机制']);
  ws2.addRows([
    ['Black Coating, 哑光黑, 黑色喷涂, Black Finish', '五金/椅脚', 3.00, 'PCS (单件)', '静电粉末哑光黑喷涂，耐磨防刮'],
    ['Laser Logo, 激光刻标, 丝印, Custom Logo', '全品类', 0.80, 'PCS (单件)', '单位置激光镭雕或单色丝印客户商标'],
    ['BS5852, 英国防火, UK Fireproof', '办公椅类', 25.00, 'PCS (单件)', '符合英国 BS5852 标准高密度阻燃海绵'],
    ['CA117, 加州防火, US Fireproof', '办公椅类', 20.00, 'PCS (单件)', '符合美国加州 CA117 阻燃标准'],
    ['Color Box, 独立彩盒, Mail Box, 邮购盒', '全品类', 2.50, 'PCS (单件)', '5层加厚K=K独立彩盒包装，带手提手柄'],
    ['Drop Test Package, 摔箱测试包装', '家具类', 15.00, 'PCS (单件)', '通过 ISTA-1A 国际摔箱测试电商包装'],
    ['Custom Mold, 开模定制, Tooling Fee', '五金/塑料', 2000.00, 'SET (单套)', '专有模具费。大货订单累计达 5000 件时 100% 全额返还']
  ]);
  applySheetStyles(ws2, '5B21B6', { 1: 48, 5: 65 });

  // =========================================================================
  // 3. 工作表 3: 贸易术语与杂费 (Incoterms) - 纯简体中文
  // =========================================================================
  const ws3 = wb.addWorksheet('贸易术语与杂费 (Incoterms)');
  ws3.addRow(['贸易术语 (Incoterm)', '指定港口/交货地点', '单件均摊杂费 (RMB)', '整单固定杂费 (RMB)', '费用包含说明']);
  ws3.addRows([
    ['EXW', '工厂出厂 (Factory Ex-works)', 0.00, 0, '买家自提，工厂仅提供标准出厂包装，0额外杂费'],
    ['FOB', '深圳盐田港 / 蛇口港 (Shenzhen)', 0.20, 1500, '包含工厂至深圳码头内陆拖车费、出口报关费、港口码头费(THC)'],
    ['FOB', '广州南沙港 (Guangzhou Nansha)', 0.20, 1400, '包含南沙码头拖车、报关、港杂封条费'],
    ['FOB', '佛山三山港 / 顺德新港 (Foshan Port)', 0.15, 1200, '佛山内河驳船港口报关装船费'],
    ['CIF', 'CIF 目的港 (Destination Port - 需另询海运费)', 0.20, 1500, '基准港杂费同FOB + 实际海运保险费（海运费随航线与船期浮动，可在复核界面直接打字或备注调整）']
  ]);
  applySheetStyles(ws3, '0F766E', { 1: 22, 2: 46, 3: 22, 4: 22, 5: 92 });

  // =========================================================================
  // 4. 集装箱装载速算 (Container_Calc) - 纯简体中文
  // =========================================================================
  const ws4 = wb.addWorksheet('集装箱装载速算 (Container_Calc)');
  ws4.addRow(['集装箱型号 (Container Type)', '理论容积 (CBM)', '安全装载容积 (CBM)', '最大载重 (KG)', '装柜适用建议']);
  ws4.addRows([
    ['20GP (20尺小柜)', 33.2, 28.0, 21800, '适合五金紧固件、金属椅脚等重货/小批量试单'],
    ['40GP (40尺平柜)', 67.7, 58.0, 26000, '适合体积与重量适中的标准工业品'],
    ['40HQ (40尺高柜)', 76.4, 68.0, 26000, '适合办公椅、家具、家电等轻泡泡货，性价比最高'],
    ['45HQ (45尺超高柜)', 86.0, 78.0, 29000, '北美航线专用超大容积特种柜']
  ]);
  applySheetStyles(ws4, '334155', { 1: 30, 5: 60 });

  // =========================================================================
  // 5. 汇率与风控 (Exchange_Rates) - 纯简体中文
  // =========================================================================
  const ws5 = wb.addWorksheet('汇率与风控 (Exchange_Rates)');
  ws5.addRow(['外币币种 (Target Currency)', '内部锁定汇率 (Rate To RMB)', '币种符号 (Symbol)', '汇率波动保护说明']);
  ws5.addRows([
    ['USD', 7.20, '$', '基准美元结算汇率 (定金前波动超过±3%按实时微调)'],
    ['EUR', 7.80, '€', '欧元区采购商专用汇率'],
    ['GBP', 9.10, '£', '英国市场专用汇率'],
    ['CAD', 5.30, 'C$', '加拿大市场专用汇率'],
    ['AUD', 4.80, 'A$', '澳洲市场专用汇率'],
    ['AED', 1.96, 'AED', '中东阿联酋迪拉姆专用汇率']
  ]);
  applySheetStyles(ws5, 'B45309', { 4: 65 });

  // =========================================================================
  // 6. 付款方式与条款 (Payment_Terms) - 纯简体中文
  // =========================================================================
  const ws6 = wb.addWorksheet('付款方式与条款 (Payment_Terms)');
  ws6.addRow(['付款方式 (Payment Term)', '价格浮动比例 (%)', '资金成本说明与商业要求']);
  ws6.addRows([
    ['100% T/T Advance (100%前T/T预付)', -0.02, '全款预付直降 2% 现金折扣'],
    ['30% Deposit + 70% Balance (标准T/T)', 0.00, '行业标准付款方式，30%定金排产，70%见提单副本付款'],
    ['L/C at sight (即期不可撤销信用证)', 0.015, '包含单据审核费与银行即期议付手续费(+1.5%)'],
    ['OA 30/60 Days (赊销信保账期)', 0.045, '包含中信保投保费与企业资金占用利息(+4.5%)']
  ]);
  applySheetStyles(ws6, '374151', { 1: 44, 3: 68 });

  const targetPaths = [
    'C:/Users/tsuik/OneDrive/桌面/n8n/商品底价表/商品底价表_优化版.xlsx',
    'C:/Users/tsuik/OneDrive/桌面/n8n/商品底价表/商品底价表.xlsx',
    'F:/order_workflow/商品底价表.xlsx',
    'F:/order_workflow/data/active_pricing.xlsx',
    'F:/order_workflow/data/tenants/default/active_pricing.xlsx',
    'F:/order_workflow/public/templates/pricing_template.xlsx',
    'F:/order_workflow/public/templates/Standard_Export_Pricing_Template.xlsx',
    'F:/order_workflow/public/templates/标准出厂底价导入模板.xlsx',
    'C:/Users/tsuik/OneDrive/桌面/商品底价表_旗舰版.xlsx',
    'C:/Users/tsuik/OneDrive/桌面/商品底价表_终极企业版.xlsx',
    'C:/Users/tsuik/OneDrive/桌面/商品底价表.xlsx'
  ];

  for (const p of targetPaths) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      await wb.xlsx.writeFile(p);
      console.log('✨ [纯简体中文] 已成功写入:', p);
    } catch (err) {
      console.warn('⚠️ 写入', p, '被占用或跳过:', err.message);
    }
  }
}

buildStyledWorkbookSimplified().then(() => {
  console.log('🎉 全部 Excel 纯简体中文转换与 UI 渲染完成！');
});
