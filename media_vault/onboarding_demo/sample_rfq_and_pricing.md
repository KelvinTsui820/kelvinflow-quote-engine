# KelvinFlow 新用户 10 分钟体验包：免配置实测询盘与示例底价

为了让首次添加企微或访问系统的外贸客户（无论是业务员还是老板）无需立刻上传敏感的公司真实底价表即可快速跑通“Aha Moment”，提供以下标准化测试数据包。

---

## 1. 模拟买家真实询盘邮件 (Sample RFQ Email)
> 顾问/业务员可直接复制以下文本粘贴至系统的“询盘解析测试框”中进行极速测试：

```text
Subject: URGENT: RFQ for Office Ergonomic Stands & Arms - ACME Global Solutions (Germany)

Dear Sales Team,

This is Mark Weber from ACME Global Solutions GmbH (Frankfurt, Germany).
We are reviewing our suppliers for the upcoming Q4 European retail catalogue and require your best competitive quotation for the following items:

1. Model: ST-2026-A (Heavy Duty Dual Monitor Arm)
   - Quantity: 2,500 pcs
   - Requirements: Standard Silver Finish, with Laser Engraved Logo (ACME) on the base plate.
   - Packaging: Custom 5-ply export color gift box.

2. Model: ERG-PRO-V2 (Electric Height Adjustable Desk Frame)
   - Quantity: 800 pcs
   - Specifications: Dual Motor, Matte Black Powder Coating.
   - Addon: Anti-collision gyroscope sensor module.

3. Model: AL-BASE-99 (Die-Cast Aluminum Heavy Duty Base)
   - Quantity: 1,500 pcs
   - Surface: Anodized Dark Grey finish.

Terms & Delivery:
- Trade Term: FOB Shenzhen / Yantian Port (Full Container Load).
- Target Currency: USD ($).
- Payment Terms: 30% T/T deposit, 70% against Bill of Lading (B/L) copy.
- Estimated Delivery: 35 days upon deposit receipt.

Please send us your formal Proforma Invoice / Quotation Sheet in PDF format with company stamp and full packing dimensions (CBM & Gross Weight).

Best regards,

Mark Weber
Senior Procurement Director
ACME Global Solutions GmbH
Kaiserstraße 42, 60329 Frankfurt am Main, Germany
Email: m.weber@acme-globalsolutions.de
Tel: +49 (69) 8293-1049
```

---

## 2. 对应的标准 7-Sheet 底价与规则预设 (Ground Truth)
在演示沙箱中，系统预置了对应的标准数据表，测试出单结果预期如下：

| SKU | 客户数量 | 匹配到底价 (RMB) | 工艺选配加价 | 目标出单单价 (USD, 汇率 7.20, 毛利 25%) |
| :--- | :--- | :--- | :--- | :--- |
| **ST-2026-A** | 2,500 pcs | ¥85.00 (命中 Tier2: ≥2000件底价) | +¥3.50 (Laser Logo + Color Box) | ~$15.36 / pc |
| **ERG-PRO-V2** | 800 pcs | ¥380.00 (标准底价) | +¥28.00 (Matte Black + Gyro Sensor) | ~$70.83 / pc |
| **AL-BASE-99** | 1,500 pcs | ¥42.00 (命中 Tier2: ≥1000件底价) | +¥4.00 (Anodized Dark Grey) | ~$7.99 / pc |

*   **贸易条款港杂费**：FOB 盐田港固定杂费 ¥1,800 按整柜 CBM 自动均摊；
*   **出具成果**：点击“生成报价”，3 秒内渲染出带 ACME 客户抬头的英文 Proforma Invoice PDF，并在微信端收到审核确认卡片。
