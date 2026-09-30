import ExcelJS from 'exceljs';
import path from 'path';

async function generateDemoPricingSheet() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Standard_Pricing_2026');

  // Set column widths and headers
  sheet.columns = [
    { header: '产品型号 (SKU)', key: 'sku', width: 22 },
    { header: '英文产品描述 (Description)', key: 'desc', width: 38 },
    { header: '出厂含税底价 (RMB)', key: 'costRmb', width: 20 },
    { header: '外销基准售价 (USD)', key: 'targetUsd', width: 20 },
    { header: '最小起订量 (MOQ)', key: 'moq', width: 16 },
    { header: '装箱规格 (Pcs/Ctn)', key: 'pcsCtn', width: 18 },
    { header: '单箱净重 (KG)', key: 'netWeight', width: 16 },
    { header: '单箱毛重 (KG)', key: 'grossWeight', width: 16 },
    { header: '单箱体积 (CBM)', key: 'cbm', width: 16 },
    { header: '基准换算汇率 (USD/CNY)', key: 'lockedRate', width: 22 },
    { header: '默认出运港口', key: 'port', width: 16 },
  ];

  const items = [
    { sku: 'KF-LED-100W-PRO', desc: '100W Industrial High Bay Light (IP65, 5000K)', costRmb: 135.00, targetUsd: 28.50, moq: 100, pcsCtn: 4, netWeight: 8.5, grossWeight: 9.8, cbm: 0.055, lockedRate: 7.25, port: 'Shenzhen' },
    { sku: 'KF-LED-150W-PRO', desc: '150W Industrial High Bay Light (IP65, 5000K)', costRmb: 185.00, targetUsd: 38.00, moq: 100, pcsCtn: 2, netWeight: 6.2, grossWeight: 7.4, cbm: 0.048, lockedRate: 7.25, port: 'Shenzhen' },
    { sku: 'KF-LED-200W-PRO', desc: '200W Industrial High Bay Light (IP65, 5000K)', costRmb: 240.00, targetUsd: 49.50, moq: 100, pcsCtn: 2, netWeight: 7.8, grossWeight: 9.2, cbm: 0.058, lockedRate: 7.25, port: 'Shenzhen' },
    { sku: 'KF-FL-50W-SLIM', desc: '50W Outdoor Slim LED Floodlight (Die-cast)', costRmb: 42.00, targetUsd: 8.80, moq: 200, pcsCtn: 10, netWeight: 9.0, grossWeight: 10.2, cbm: 0.032, lockedRate: 7.25, port: 'Shenzhen' },
    { sku: 'KF-FL-100W-SLIM', desc: '100W Outdoor Slim LED Floodlight (Die-cast)', costRmb: 78.00, targetUsd: 16.50, moq: 200, pcsCtn: 6, netWeight: 10.5, grossWeight: 11.8, cbm: 0.042, lockedRate: 7.25, port: 'Shenzhen' },
    { sku: 'KF-FL-200W-SLIM', desc: '200W Outdoor Slim LED Floodlight (Die-cast)', costRmb: 145.00, targetUsd: 30.50, moq: 100, pcsCtn: 4, netWeight: 11.2, grossWeight: 12.8, cbm: 0.052, lockedRate: 7.25, port: 'Shenzhen' },
    { sku: 'KF-ST-60W-SOLAR', desc: '60W All-in-One Solar Street Light with Pole', costRmb: 290.00, targetUsd: 62.00, moq: 50, pcsCtn: 1, netWeight: 8.2, grossWeight: 9.5, cbm: 0.065, lockedRate: 7.25, port: 'Shenzhen' },
    { sku: 'KF-ST-120W-SOLAR', desc: '120W All-in-One Solar Street Light with Pole', costRmb: 480.00, targetUsd: 102.00, moq: 50, pcsCtn: 1, netWeight: 13.5, grossWeight: 15.2, cbm: 0.098, lockedRate: 7.25, port: 'Shenzhen' },
    { sku: 'KF-TP-40W-TRI', desc: '4ft 40W Vapor Tight Tri-Proof Fitting (IP66)', costRmb: 58.00, targetUsd: 12.20, moq: 200, pcsCtn: 8, netWeight: 9.6, grossWeight: 10.8, cbm: 0.045, lockedRate: 7.25, port: 'Shenzhen' },
    { sku: 'KF-TP-60W-TRI', desc: '5ft 60W Vapor Tight Tri-Proof Fitting (IP66)', costRmb: 82.00, targetUsd: 17.50, moq: 200, pcsCtn: 6, netWeight: 10.2, grossWeight: 11.6, cbm: 0.055, lockedRate: 7.25, port: 'Shenzhen' },
    { sku: 'KF-DL-15W-COB', desc: '15W Anti-glare Commercial Recessed Downlight', costRmb: 28.00, targetUsd: 5.90, moq: 300, pcsCtn: 20, netWeight: 8.0, grossWeight: 9.2, cbm: 0.038, lockedRate: 7.25, port: 'Shenzhen' },
    { sku: 'KF-DL-25W-COB', desc: '25W Anti-glare Commercial Recessed Downlight', costRmb: 45.00, targetUsd: 9.50, moq: 200, pcsCtn: 12, netWeight: 7.8, grossWeight: 8.9, cbm: 0.042, lockedRate: 7.25, port: 'Shenzhen' },
    { sku: 'KF-TR-30W-ZOOM', desc: '30W 3-Circuit Track Light (90 CRI, Dimmable)', costRmb: 68.00, targetUsd: 14.50, moq: 150, pcsCtn: 10, netWeight: 8.5, grossWeight: 9.8, cbm: 0.036, lockedRate: 7.25, port: 'Shenzhen' },
    { sku: 'KF-DRV-60W-IP67', desc: '60W Constant Voltage Waterproof LED Driver', costRmb: 32.00, targetUsd: 6.80, moq: 500, pcsCtn: 25, netWeight: 12.5, grossWeight: 13.8, cbm: 0.028, lockedRate: 7.25, port: 'Shenzhen' },
    { sku: 'KF-DRV-150W-IP67', desc: '150W Constant Voltage Waterproof Driver', costRmb: 65.00, targetUsd: 13.80, moq: 300, pcsCtn: 15, netWeight: 11.5, grossWeight: 12.8, cbm: 0.035, lockedRate: 7.25, port: 'Shenzhen' },
  ];

  sheet.addRows(items);

  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' } // Deep tech blue
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  // Format cells
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: 'middle' };
      row.height = 22;
      row.getCell('costRmb').numFmt = '¥#,##0.00';
      row.getCell('targetUsd').numFmt = '$#,##0.00';
      row.getCell('lockedRate').numFmt = '0.00';
      row.getCell('cbm').numFmt = '0.000';
    }
  });

  const outputPath = path.resolve('media_vault/demo_assets/demo_pricing_sheet.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log('Successfully generated demo pricing sheet at:', outputPath);
}

generateDemoPricingSheet().catch(console.error);
