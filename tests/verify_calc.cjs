const { ExcelAdapter } = require('../dist/adapters/excel.adapter.js');
const { PricingService } = require('../dist/services/pricing.service.js');
const { PDFService } = require('../dist/services/pdf.service.js');
const fs = require('fs');

const parsedExcel = ExcelAdapter.parse(fs.readFileSync('C:/Users/tsuik/OneDrive/桌面/n8n/商品底价表/商品底价表.xlsx'));

const mockPoData = {
  PONumber: 'RFQ-ACME-2026-Q4',
  CustomerName: 'Acme Global Sourcing GmbH',
  Date: '2026-09-15',
  Currency: 'USD',
  ConfidenceScore: 95,
  DeliveryDetails: 'FOB Shenzhen Yantian Port, 30 days delivery',
  SpecialRemarks: 'Matte Black Coating on frame, Custom Laser Logo on backrest plate',
  UncategorizedCriticalInfo: '',
  BuyerContact: {
    Name: 'Marcus Weber',
    Email: 'm.weber@acmeglobal.de'
  },
  Items: [
    {
      SKU: 'ERG-PRO-V2',
      Description: 'High Back Ergonomic Office Chair with Matte Black Coating and Laser Logo',
      Quantity: 500
    },
    {
      SKU: 'ST-2026-A',
      Description: 'Aluminum Alloy Precision Hardware Bracket',
      Quantity: 2000
    }
  ]
};

const quote = PricingService.calculate(mockPoData, parsedExcel.priceItems, parsedExcel.exchangeRates, {
  addons: parsedExcel.addons,
  incotermRules: parsedExcel.incotermRules,
  paymentTerms: parsedExcel.paymentTerms,
  defaultIncoterm: parsedExcel.defaultIncoterm,
  priceValidity: parsedExcel.priceValidity,
  leadTime: parsedExcel.leadTime,
  samplePolicy: parsedExcel.samplePolicy
});

console.log('Quotation Number:', quote.quotationNumber);
console.log('Customer:', quote.customerName, 'Buyer:', quote.buyerName);
console.log('Incoterm:', quote.incotermUsed);
console.log('Currency:', quote.currency, 'Rate:', quote.rateUsed);
console.log('Items:');
quote.items.forEach(i => {
  console.log(`- ${i.sku} (${i.description}): Qty=${i.quantity}, BaseRMB=${i.basePriceRMB}, Addons=${JSON.stringify(i.appliedAddons)}, Margin=${i.profitMargin * 100}%, UnitUSD=$${i.unitPriceForeign}, Subtotal=$${i.subTotalForeign}`);
});
console.log('Total Amount Foreign: $', quote.totalAmountForeign);
console.log('Risk Disclaimers:', quote.riskDisclaimers);
console.log('Container estimate:', quote.containerEstimate);

(async () => {
  const pdfBuffer = await PDFService.generateQuotationPDF(quote);
  console.log('PDF generated size:', pdfBuffer.length, 'Header:', pdfBuffer.slice(0, 5).toString());
})();
