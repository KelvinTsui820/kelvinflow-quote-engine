import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { PricingNormalizerService } from '../src/services/pricing-normalizer.service.js';
import { ExcelAdapter } from '../src/adapters/excel.adapter.js';

describe('客户非标/脏数据 Excel 底价表清洗与容错测试', () => {
  const tmpDir = path.join(process.cwd(), 'data', 'test_tmp');
  const dirtyExcelPath = path.join(tmpDir, 'dirty_customer_price.xlsx');
  const normalizedOutputPath = path.join(tmpDir, 'normalized_pricing.xlsx');

  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const xlsxLib: any = (XLSX as any).default || XLSX;
    const wb = xlsxLib.utils.book_new();

    // 构造一份高度复杂的脏数据表：
    // - 前两行为公司抬头与内部警告
    // - 包含货币符号（$ / ￥ / RMB）
    // - 包含空行
    // - 包含合计行与公式错误文本
    const dirtyData = [
      ['义乌市某外贸五金厂 - 2026年出厂内部结算底价表 (严禁外泄)'],
      ['注意：所有报价均不含税，包装为普通外箱，更新日期：2026-09-01'],
      ['产品型号/Item No.', '品名描述 (Product Name)', '含税出厂价 (RMB)', '外箱体积(CBM)', '每箱装量(PCS)', '最小起订量(MOQ)'],
      ['WJ-8801', 'Heavy Stainless Bolt M8*50', '￥12.50', '0.045', '100', '500'],
      ['WJ-8802', 'Titanium Screw Hex M6', '$ 8.80', '0.032', '200', '1000'],
      ['', '', '', '', '', ''], // 空行
      ['WJ-8803', 'Brass Nut Cap Gold Plated', 'RMB 25.0', '0.060', '50', '200'],
      ['ERR-999', 'Corrupted Part With Error Code', '#REF!', '0.010', '10', '100'], // 公式错误，应自动被跳过或安全处理
      ['合计汇总', 'Total Statistics', '￥46.30', '', '', ''] // 合计行，应自动被过滤
    ];

    const ws = xlsxLib.utils.aoa_to_sheet(dirtyData);
    xlsxLib.utils.book_append_sheet(wb, ws, '2026底价总表');

    const buf = xlsxLib.write(wb, { type: 'buffer', bookType: 'xlsx' });
    fs.writeFileSync(dirtyExcelPath, buf);
  });

  afterAll(() => {
    try {
      if (fs.existsSync(dirtyExcelPath)) fs.unlinkSync(dirtyExcelPath);
      if (fs.existsSync(normalizedOutputPath)) fs.unlinkSync(normalizedOutputPath);
      if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
    } catch {}
  });

  it('PricingNormalizerService 能够成功跳过前置说明行、过滤合计与错误行，并清洗货币符号', async () => {
    const result = await PricingNormalizerService.normalizeCustomerExcel(
      dirtyExcelPath,
      normalizedOutputPath,
      { defaultProfitMargin: 0.3 }
    );

    expect(result.success).toBe(true);
    // 应成功提取出 3 款真实有效商品：WJ-8801, WJ-8802, WJ-8803
    expect(result.itemCount).toBe(3);
    expect(fs.existsSync(normalizedOutputPath)).toBe(true);

    const skus = result.sampleItems.map(i => i.rawSku);
    expect(skus).toContain('WJ-8801');
    expect(skus).toContain('WJ-8802');
    expect(skus).toContain('WJ-8803');
    expect(skus).not.toContain('ERR-999');
    expect(skus).not.toContain('合计汇总');

    // 验证单价是否成功剥离货币符号并转为合法数字
    const item1 = result.sampleItems.find(i => i.rawSku === 'WJ-8801');
    expect(item1?.basePrice).toBe(12.5);

    const item2 = result.sampleItems.find(i => i.rawSku === 'WJ-8802');
    expect(item2?.basePrice).toBe(8.8);
  });

  it('清洗后生成的 active_pricing.xlsx 能够 100% 兼容被 ExcelAdapter 解析且无报错', () => {
    const parsed = ExcelAdapter.parse(normalizedOutputPath);
    expect(parsed.success).toBe(true);
    expect(parsed.priceItems.length).toBe(3);
    expect(parsed.exchangeRates.length).toBeGreaterThan(0);
    expect(parsed.incotermRules.length).toBeGreaterThan(0);
  });
});
