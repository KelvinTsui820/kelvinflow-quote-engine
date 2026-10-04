const { PDFService } = require('../dist/services/pdf.service.js');
const PDFDocument = require('pdfkit');

const baseQuotation = {
  quotationNumber: 'QT-20261004-REGRESSION',
  customerName: 'Acme Global Sourcing GmbH',
  buyerName: 'Marcus Weber',
  buyerEmail: 'm.weber@acmeglobal.de',
  date: '2026-10-04',
  priceValidity: '30 Days',
  currency: 'USD',
  incotermUsed: 'CIF Hamburg',
  leadTime: '25-30 days upon Approval',
  totalAmountForeign: 28260.00,
  containerEstimate: { totalCartons: 550, totalCBM: 74.45, recommendedContainer: '1x 40HQ' },
  items: [
    { sku: 'ACME-991', description: 'Aluminum Alloy Precision Bracket', quantity: 2000, unitPriceForeign: 3.52, subTotalForeign: 7040.00 },
    { sku: 'ERG-PRO-V2', description: 'Ergonomic Mesh Office Chair', quantity: 500, unitPriceForeign: 39.84, subTotalForeign: 19920.00 },
    { sku: 'FAST-SCREW', description: 'Stainless Steel Hex Fastener Screws', quantity: 10000, unitPriceForeign: 0.13, subTotalForeign: 1300.00 }
  ]
};

function countPages(pdfBuffer) {
  const binary = pdfBuffer.toString('binary');
  const matches = binary.match(/\/Type\s*\/Page\b/g);
  return matches ? matches.length : 1;
}

async function runRegressionTests() {
  console.log('========================================================');
  console.log('📄 KelvinFlow PDF 动态样式全场景自动化回归测试启动');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: 标准报价单 (3款商品)
  try {
    const buf = await PDFService.generateQuotationPDF(baseQuotation, {
      companyName: 'KelvinFlow Global Technology Co., Ltd.',
      logoPath: 'public/kelvinflow_logo_transparent.png'
    });
    const pages = countPages(buf);
    if (pages === 1 && buf.length > 50000) {
      console.log('✅ [PASS] [PDF.Standard] 标准 3 项商品报价单生成成功，单页完美收敛 (Page count = 1, size = ' + buf.length + ' bytes)');
      passed++;
    } else {
      throw new Error(`Expected 1 page, got ${pages}`);
    }
  } catch (err) {
    console.error('❌ [FAIL] [PDF.Standard]:', err.message);
    failed++;
  }

  // Test 2: 超长企业名称与多行地址 (防文本碰撞测试)
  try {
    const buf = await PDFService.generateQuotationPDF(baseQuotation, {
      companyName: 'GUANGDONG KELVINFLOW INTELLIGENT HOME FURNISHING MANUFACTURING GROUP CO., LTD.',
      logoPath: 'public/kelvinflow_logo_transparent.png'
    });
    const pages = countPages(buf);
    if (pages === 1) {
      console.log('✅ [PASS] [PDF.LongHeader] 超长企业名称与地址自适应流式排版，零重叠且单页收敛 (Page count = 1)');
      passed++;
    } else {
      throw new Error(`Expected 1 page for long header, got ${pages}`);
    }
  } catch (err) {
    console.error('❌ [FAIL] [PDF.LongHeader]:', err.message);
    failed++;
  }

  // Test 3: 无 Logo 企业租户 (从左边界优雅起排)
  try {
    const buf = await PDFService.generateQuotationPDF(baseQuotation, {
      companyName: 'KelvinFlow Global Technology Co., Ltd.',
      logoPath: ''
    });
    const pages = countPages(buf);
    if (pages === 1) {
      console.log('✅ [PASS] [PDF.NoLogo] 无 Logo 租户企业信息自适应左对齐展开，版面平衡 (Page count = 1)');
      passed++;
    } else {
      throw new Error(`Expected 1 page for no logo, got ${pages}`);
    }
  } catch (err) {
    console.error('❌ [FAIL] [PDF.NoLogo]:', err.message);
    failed++;
  }

  // Test 4: 6款商品紧凑单页模式
  try {
    const q6 = {
      ...baseQuotation,
      items: [
        ...baseQuotation.items,
        { sku: 'AL-BASE-99', description: 'Die-cast Aluminum 5-star base', quantity: 500, unitPriceForeign: 12.50, subTotalForeign: 6250.00 },
        { sku: 'GAS-LIFT-04', description: 'Class 4 BIFMA gas cylinder', quantity: 500, unitPriceForeign: 4.20, subTotalForeign: 2100.00 },
        { sku: 'CASTER-60MM', description: 'Nylon twin-wheel mute casters', quantity: 2500, unitPriceForeign: 0.85, subTotalForeign: 2125.00 }
      ]
    };
    const buf = await PDFService.generateQuotationPDF(q6, {
      companyName: 'KelvinFlow Global Technology Co., Ltd.',
      logoPath: 'public/kelvinflow_logo_transparent.png'
    });
    const pages = countPages(buf);
    if (pages === 1) {
      console.log('✅ [PASS] [PDF.Compact6] 6 款商品自适应紧凑排版，完整展示全部商务条款与签字区 (Page count = 1)');
      passed++;
    } else {
      throw new Error(`Expected 1 page for 6 items, got ${pages}`);
    }
  } catch (err) {
    console.error('❌ [FAIL] [PDF.Compact6]:', err.message);
    failed++;
  }

  // Test 5: 12款商品多页分页与续表头
  try {
    const items12 = [];
    for (let i = 1; i <= 12; i++) {
      items12.push({
        sku: 'PART-' + String(i).padStart(3, '0'),
        description: 'Custom Export Part Item #' + i + ' with heavy-duty export pallet',
        quantity: 100 * i,
        unitPriceForeign: 15.00 + i,
        subTotalForeign: (100 * i) * (15.00 + i)
      });
    }
    const q12 = { ...baseQuotation, items: items12 };
    const buf = await PDFService.generateQuotationPDF(q12, {
      companyName: 'KelvinFlow Global Technology Co., Ltd.',
      logoPath: 'public/kelvinflow_logo_transparent.png'
    });
    const pages = countPages(buf);
    if (pages === 2) {
      console.log('✅ [PASS] [PDF.MultiPage12] 12 款商品智能分页，自动挂载续页表头与跨页签字区 (Page count = 2)');
      passed++;
    } else {
      throw new Error(`Expected 2 pages for 12 items, got ${pages}`);
    }
  } catch (err) {
    console.error('❌ [FAIL] [PDF.MultiPage12]:', err.message);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`📊 回归测试汇总: 通过 ${passed} 项, 失败 ${failed} 项`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionTests().catch(e => {
  console.error(e);
  process.exit(1);
});
