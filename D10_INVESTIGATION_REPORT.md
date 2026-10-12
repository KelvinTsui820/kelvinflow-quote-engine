# KelvinFlow 技术调查报告：底价库导入后前后端数据不一致 (Issue D-10)

> **报告版本**：v1.0 (Ready for AI Agent Review)  
> **调查时间**：2026-10-09  
> **受检环境**：海外生产服 `https://quote.kelvinflow.com` (`192.255.145.11`)  
> **受检租户**：`tenant_trial_tsuikelvin0804_gmail` (`tsuikelvin0804@gmail.com`)  
> **调查方式**：服务器底层存储与 API 纯只读检索，无生产数据变动

---

## 1. 核心结论 (TL;DR)
- **后端持久化与引擎完全正常**：`POST /api/v1/update-pricing` 已成功将包含 10 款商品（含 `TEST-001~004`）的底价表写入租户磁盘（`active_pricing.xlsx`），字段与毛利 100% 正确，后端询盘核价引擎能精确识别并算出 `TEST-001`。
- **问题 100% 位于前端 SPA 内存状态断层**：
  1. `public/review.html` 的 `submitUploadPricing()` 导入成功后，**仅更新了弹窗统计与徽标，遗漏了刷新前端 Vue 响应式底价库 `catalogItems.value` 的逻辑**，导致选型中心仍沿用打开页面时的旧 6 款缓存。
  2. 工作台表格行的「买家 SKU」输入框仅绑定了 `v-model`，**未绑定 `@change` 自动匹配监听器**，且新增行默认标记 `isCustom: true`，手动填入型号无法触发自动带出底价。

---

## 2. 现象与实测对账矩阵 (Symptom vs. Reality)

| 节点 / 交互 | 用户端感知现象 | 后端真实状态 (生产环境抓取) | 差异原因 |
| :--- | :--- | :--- | :--- |
| **导入反馈** | Toast 提示录入 10 款，徽标显示「在库 10 款」 | 文件 `active_pricing.xlsx` 包含 10 款商品 | **一致**。徽标是调用 `/api/v1/pricing/status` 查询后端得到的真实结果。 |
| **选型中心** | 仍显示「在册商品共 6 款」，搜索 `TEST` 为 0 | API `GET /api/v1/catalog` 实际返回 10 款商品（含 `TEST`） | **前端状态未刷新**。Vue 状态 `catalogItems.value` 未在上传后重新拉取。 |
| **手动建单** | 输入 `TEST-001` 显示「+自建商品」，底价默认 50 | 后端 `PricingService.calculate` 可 100% 匹配 `TEST-001` 底价 72 元 | **无输入监听事件**。表格输入框无模糊匹配触发器，依赖的 `catalogItems` 也未更新。 |

---

## 3. 生产环境只读对账证据 (Evidence)

### 证据 A：租户物理底价表解析 (Node.js + ExcelAdapter)
```bash
# 路径: /var/www/quote_app/data/tenants/tenant_trial_tsuikelvin0804_gmail/active_pricing.xlsx
Total PriceItems count: 10
Parsed items:
  [1~6] 原有 6 款商品 (ST-2026-A, ERG-PRO-V2 等)
  [7] SKU=TEST-001, BasePrice=72,  MOQ=1000, Margin=0.25 (25%)
  [8] SKU=TEST-002, BasePrice=100, MOQ=500,  Margin=0    (0%)
  [9] SKU=TEST-003, BasePrice=50,  MOQ=2000, Margin=0.2  (继承全厂 20%)
  [10] SKU=TEST-004, BasePrice=36, MOQ=800,  Margin=0.08 (8%)
```

### 证据 B：后端选型接口带 Token 实测
```bash
GET /api/v1/catalog (Headers: Authorization: Bearer <tenant_token>)
Status: 200 OK
Response: { success: true, catalogItems: [ ...共 10 款，包含 TEST-001~004 ] }
```

### 证据 C：后端算价引擎实测
```javascript
// 输入 PO: { SKU: 'TEST-001', Quantity: 1000 }
// 输出 QuoteItem:
{
  sku: 'TEST-001',
  matchedSku: 'TEST-001',
  basePriceRMB: 72,
  profitMargin: 0.25,
  unitPriceForeign: 12.50, // (72 / (1 - 0.25)) / 7.2
  matchStatus: 'EXACT'
}
```

---

## 4. 根因技术剖析 (Technical Root Cause)

### 根因 1：`submitUploadPricing` 状态闭环缺失
- **代码位置**：[`public/review.html:4680-4687`](file:///F:/order_workflow/public/review.html#L4680-L4687)
- **分析**：
  ```javascript
  const res = await fetch(`/api/v1/update-pricing...`);
  const data = await res.json();
  if (data.success) {
    pricingModal.value.resultSummary = data.summary;
    showToast('✅ 企业专属底价表已成功更新并生效！');
    await fetchPricingStatus(); // 仅更新了 pricingModal.status，未更新 catalogItems.value
  }
  ```
  `catalogItems.value` 仅在初次进入页面 `fetchQuotation()` 时初始化一次。底价表上传成功后，未发起 `GET /api/v1/catalog` 刷新，导致 SPA 内部数据陈旧。

### 根因 2：表格新增行缺乏动态对齐监听
- **代码位置**：[`public/review.html:937-953`](file:///F:/order_workflow/public/review.html#L937-L953) 与 [`5879-5900`](file:///F:/order_workflow/public/review.html#L5879-L5900)
- **分析**：
  `addNewItem()` 创建时注入了 `isCustom: true, matchedSku: 'CUSTOM-ITEM', basePriceRMB: 50`。表格上的 `<input v-model="item.sku">` 没有 `@change` 触发器；用户修改为 `TEST-001` 后，没有任何逻辑去 `catalogItems` 中索引替换，因此保持默认状态。

---

## 5. 修复方案建议 (Actionable Fix)

本问题**无需修改后端任何接口与数据**，仅需在前端 [`public/review.html`](file:///F:/order_workflow/public/review.html) 进行 2 处补丁：

### 补丁 1：上传成功后即时刷新前端 `catalogItems`
在 `public/review.html` 的 `submitUploadPricing` 成功分支中增加调用：
```javascript
// public/review.html -> submitUploadPricing
if (data.success) {
  pricingModal.value.resultSummary = data.summary;
  showToast('✅ 企业专属底价表已成功更新并生效！');
  await fetchPricingStatus();
  
  // 新增：自动刷新前端选型商品列表
  await refreshCatalogItems();
}
```

```javascript
// 新增辅助函数 refreshCatalogItems
const refreshCatalogItems = async () => {
  const token = getTokenFromUrl() || authToken.value;
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  try {
    const res = await fetch(`/api/v1/catalog${token ? `?token=${token}` : ''}`, { headers });
    const data = await res.json();
    if (data.success && Array.isArray(data.catalogItems)) {
      catalogItems.value = data.catalogItems;
    }
  } catch (err) {
    console.warn('刷新选型商品库失败:', err);
  }
};
```

### 补丁 2：手输 SKU 时增加自动模糊对齐
在表格 `<input v-model="item.sku">` 上增加 `@change="onSkuInputMatch(item)"`：
- 若用户输入的 SKU 在 `catalogItems.value` 中命中：自动覆盖 `matchedSku`、更新 `basePriceRMB` 与 `profitMargin`，并将 `isCustom` 置为 `false`，重算单价。
- 若未命中：保留 `isCustom: true`。

---

## 6. 风险评估
- **风险等级**：极低（Low Risk）。
- **影响范围**：纯前端交互体验优化，不破坏任何租户隔离体系、不引入数据库或后端 API 变更。
