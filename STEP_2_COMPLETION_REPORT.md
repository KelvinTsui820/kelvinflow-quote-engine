# KelvinFlow MVP 瘦身改版 - Step 2 执行汇报 (真实 Git Diff 基线校验版)

> **阶段**：Step 2 - 审单台瘦身与底价库清理（依据任务书 §2.2 & §2.3）  
> **状态**：已全面完成并经 `pre-mvp-slim` 真实基线与自动化测试套件双重校验，原地冻结等待 Step 3 指令  
> **基准 Tag**：`pre-mvp-slim` (commit: `cc1d3c4`)  
> **汇报时间**：2026-10-14  

---

## 一、真实 `git diff --stat pre-mvp-slim` 原文

```text
 public/index.html              |  934 +--------------------
 public/review.html             | 1746 ++++------------------------------------
 src/routes/inbound.router.ts   |  158 ----
 src/routes/quote.router.ts     |  248 ------
 src/services/pdf.service.ts    |   21 +-
 src/services/trial.service.ts  |  168 +---
 src/types/index.ts             |    2 +-
 tests/delete-endpoints.test.ts |  104 +--
 tests/e2e-workflow.test.ts     |   80 +-
 9 files changed, 206 insertions(+), 3255 deletions(-)
```

*(注：`public/index.html`、`src/routes/inbound.router.ts`、`src/services/trial.service.ts`、`tests/e2e-workflow.test.ts` 及 `src/routes/quote.router.ts` 前 102 行变更已在 Step 1 汇报并通过；以下为 Step 2 涉及各文件的全新真实 Git Diff 明细)*

---

## 二、基于 `git diff -U0 pre-mvp-slim` 的真实变更区块与行号明细

所有行号与块信息均直接源自 `git diff -U0 pre-mvp-slim` 真实输出，彻底杜绝任何估算与不实标注。

### 1. 工作台前端：[`public/review.html`](file:///F:/order_workflow/public/review.html)

| Git Chunk Header (真实基线行号) | 变更类型 | 真实修改 / 物理删除内容 |
| :--- | :--- | :--- |
| `@@ -261 +261 @@` | 简化 | 顶栏版本徽标更新为静态纯文本 `<span class="... text-blue-400 ...">内测中</span>` |
| `@@ -267,11 +267,2 @@` | 删除 | 移除用户徽标卡片内的多余公司资料设置按钮（收敛至顶栏唯一入口） |
| `@@ -292,2 +277,2 @@`<br>`@@ -296,2 +281,2 @@`<br>`@@ -299,9 +284 @@` | 删除/清理 | 移除新建询盘与底价库按钮上的 `id="tour-step-2"`、`id="tour-step-1"`；顶栏主操作按钮严格收敛为 4 个：【新建询盘】【底价库】【自动出单】【企业资料】（删除一键出单、Logo配置入口） |
| `@@ -310,6 +287,5 @@`<br>`@@ -318,5 +294,5 @@`<br>`@@ -325 +301 @@`<br>`@@ -332,3 +307,0 @@` | 优化 | 清理顶栏移动端/小屏响应式断点与边距，杜绝元素拥挤与溢出 |
| `@@ -348,62 +320,0 @@` | 物理删除 | **彻底删除顶部三大营销条幅（共 62 行，原 348~409 行）**：<br>1. 裂变邀请奖励条幅（邀请同行送 7 天）<br>2. 企业版/团队版升级咨询条幅<br>3. 个人专业版特权推广条幅 |
| `@@ -412,0 +324,41 @@` | 新增 | **在 `<main>` 顶部新增轻量级静态可手动关闭的 3 步新手提示卡片**（含持久化至 `localStorage` 的 `showOnboardingCard` / `dismissOnboardingCard` 交互） |
| `@@ -586,4 +538,2 @@`<br>`@@ -591,2 +541 @@`<br>`@@ -667,5 +615,0 @@` | 删除 | 汇率卡片区域：**彻底删除汇率诊断弹窗入口按钮**（原 `@click="rateDiagnosticModalVisible = true"`）；保留实时现汇买入牌价展示、刷新与换算能力 |
| `@@ -810 +754 @@`<br>`@@ -812 +756 @@`<br>`@@ -814,0 +759,3 @@`<br>`@@ -816,17 +763,6 @@`<br>`@@ -835,8 +771,5 @@`<br>`@@ -844,17 +777,7 @@`<br>`@@ -862,6 +784,0 @@` | 简化重构 | **40HQ 柜型装载分析卡片重构**：默认折叠为单行紧凑摘要，支持右侧 Chevron 箭头切换展开/收起；**彻底删除“AI 凑柜建议追加邮件”按钮**（`insertLogisticsAdviceToEmail`） |
| `@@ -1000,6 +917,3 @@`<br>`@@ -1008 +922 @@`<br>`@@ -1024 +938 @@`<br>`@@ -1030 +944 @@`<br>`@@ -1033 +947 @@`<br>`@@ -1036,7 +949,0 @@` | 简化重构 | **商品明细表格重构**：删除已匹配行右侧多余的【底价库】选型按钮；删除已匹配品名的点击展开交互，替换为纯静态高质感绿标 `span` |
| `@@ -1344 +1251 @@`<br>`@@ -1347,3 +1253,0 @@` | 删除 | 邮件草稿区域：**彻底删除全屏沉浸编辑弹窗按钮**（原 `@click="openEmailFullscreen"`） |
| `@@ -1427,6 +1331,5 @@`<br>`@@ -1435,3 +1338,3 @@` | 重构 | **底部固定栏重构**：彻底删除【一键出单】大按钮；【一键直达草稿箱】向全员开放；新增【下载 PDF】按钮 |
| `@@ -1446,122 +1348,0 @@` | 物理删除 | **彻底删除邮件全屏编辑弹窗 `#email-fullscreen-modal`（共 122 行，原 1446~1567 行）** |
| `@@ -1883,20 +1663,0 @@`<br>`@@ -1904,115 +1664,0 @@` | 物理删除 | **彻底删除出厂底价库快捷选型中心大弹窗 `catalogModal`（共 135 行，原 1883~2018 行）** |
| `@@ -2055,53 +1700,0 @@`<br>`@@ -2109,122 +1701,0 @@` | 物理删除 | **彻底删除新手 3 步沉浸式聚光灯镂空遮罩引导 `#tour-spotlight-overlay`（共 175 行，原 2055~2230 行）** |
| `@@ -2333,3 +1803,0 @@` | 物理删除 | 删除新建询盘弹窗内的全屏编辑放大按钮（`@click="openInquiryFullscreen"`） |
| `@@ -3188,144 +2655,0 @@` | 物理删除 | **彻底删除出厂底价库条目删除二次确认弹窗 `deleteCatalogModal`（共 40 行）与外贸汇率深度诊断分析弹窗 `rateDiagnosticModal`（共 104 行，原 3188~3331 行）** |
| `@@ -3333,17 +2656,0 @@` | 物理删除 | 清理汇率诊断弹窗尾部闭合标签与多余空行 |
| `@@ -4074,107 +3381,2 @@` | 物理删除 | **彻底删除审单台两大弹窗群（共 107 行，原 4074~4180 行）**：<br>1. 同行专属推荐分享弹窗 `referralModal`<br>2. 企业专属 Logo 配置弹窗 `logoModal` |
| `@@ -4182,10 +3384,4 @@`<br>`@@ -4193,10 +3389,4 @@`<br>`@@ -4204,5 +3394,9 @@`<br>`@@ -4210,6 +3404,7 @@`<br>`@@ -4218,10 +3412,0 @@`<br>`@@ -4230,0 +3416,2 @@` | 格式优化 | 规范企业资料设置弹窗内英文抬头、签核人姓名输入框说明文案，消除乱码隐患 |
| `@@ -4372 +3558,0 @@` | 物理删除 | Vue Setup 状态清理：删除 `rateDiagnosticModalVisible` 响应式变量声明 |
| `@@ -4509 +3695 @@`<br>`@@ -4511 +3696,0 @@`<br>`@@ -4514,117 +3698,0 @@` | 物理删除 | Vue Setup 状态清理：**彻底删除 Logo 相关响应式状态与方法（共 118 行）**（`tenantLogoUrl`, `logoModal`, `logoResetConfirmModal`, `openLogoModal`, `openResetLogoConfirm`, `closeResetLogoConfirm`, `onLogoFileSelected`, `executeResetDefaultLogo`, `resetDefaultLogo`, `setNoLogo`） |
| `@@ -4757,196 +3825,5 @@` | 简化重构 | Vue Setup 状态清理：**彻底物理删除整套 Tour 聚光灯引导逻辑（共 196 行）**，替换为 `showOnboardingCard` 与 `dismissOnboardingCard` 响应式状态 |
| `@@ -5346,15 +4222,0 @@`<br>`@@ -5362,7 +4223,0 @@` | 物理删除 | Vue Setup 状态清理：删除 `deleteCatalogModal`、`PROTECTED_CATALOG_SKUS`、`isProtectedCatalogSku`、`catalogModal` 响应式引用 |
| `@@ -6030,11 +4885,2 @@` | 简化重构 | Vue Setup 状态清理：删除 `insertLogisticsAdviceToEmail` 函数，新增 `containerCollapsed = ref(true)` |
| `@@ -6147,3 +4993 @@` | 物理删除 | Vue Setup 状态清理：删除 `emailFullscreenModal`、`openEmailFullscreen`、`closeEmailFullscreen` 响应式引用与控制函数 |
| `@@ -6709,96 +5552,0 @@`<br>`@@ -6806,17 +5553,0 @@` | 物理删除 | Vue Setup 状态清理：**彻底删除工作台裂变推荐逻辑（共 113 行）**（`referralModal`, `openReferralShareModal`, `closeReferralShareModal`, `copyShareCode`, `copyShareLink`, `copyShareFullText`） |
| `@@ -6899 +5629,0 @@` | 物理删除 | Vue Setup 状态清理：删除单据拉取成功后对 `data.tenant.logoUrl` 的赋值逻辑 |
| `@@ -7051,17 +5780,0 @@` | 物理删除 | Vue Setup 状态清理：删除单据加载完成后 `finally` 块内自动唤醒新手向导的代码 |
| `@@ -7246,16 +5958,0 @@`<br>`@@ -7263,27 +5959,0 @@` | 物理删除 | Vue Setup 状态清理：删除底价库条目删除控制方法 `confirmDeleteCatalogItem` 与 `executeDeleteCatalogItem`（共 43 行） |
| `@@ -7601,5 +6271 @@` | 物理删除 | Vue Setup 状态清理：删除预警选型弹窗中的 `openCatalogModalFor` 辅助函数 |
| `@@ -7679,46 +6344,0 @@`<br>`@@ -7726,4 +6345,0 @@` | 物理删除 | Vue Setup 状态清理：**彻底删除 `catalogModal` 弹窗分页、搜索过滤、选中与全屏沉浸编辑逻辑（共 50 行）** |
| `@@ -7958 +6573,0 @@`<br>`@@ -7965 +6579,0 @@`<br>`@@ -7968 +6581,0 @@`<br>`@@ -7973,2 +6585,0 @@`<br>`@@ -7976 +6586,0 @@`<br>`@@ -7986,3 +6595,0 @@` | 状态同步 | `isAnyModalOpen` 计算属性与 `watch`：移除已删除的 6 个弹窗状态及针对 `tourActive` 的联动 |
| `@@ -8037,7 +6643,0 @@` | 物理删除 | `onMounted` 钩子清理：移除延时 800ms 自动触发 `startTour(1)` 逻辑 |
| `@@ -8050 +6649,0 @@`<br>`@@ -8052 +6650,0 @@`<br>`@@ -8060 +6657,0 @@`<br>`@@ -8065 +6661,0 @@`<br>`@@ -8067 +6662,0 @@`<br>`@@ -8073 +6667,0 @@` | 状态同步 | 全局 `Escape` 快捷键监听：移除针对已删除 6 个模态框的关闭分支 |
| `@@ -8098,3 +6691,0 @@`<br>`@@ -8106,11 +6696,0 @@`<br>`@@ -8141,0 +6722,3 @@`<br>`@@ -8191 +6773,0 @@`<br>`@@ -8226 +6807,0 @@`<br>`@@ -8229,6 +6809,0 @@`<br>`@@ -8254,8 +6828,0 @@`<br>`@@ -8263,3 +6829,0 @@`<br>`@@ -8282,2 +6845,0 @@`<br>`@@ -8307 +6868,0 @@`<br>`@@ -8309,2 +6870 @@`<br>`@@ -8313,9 +6872,0 @@`<br>`@@ -8326 +6876,0 @@`<br>`@@ -8343,4 +6892,0 @@` | 状态同步 | **Vue `setup()` 返回对象全面清洗**：彻底移除所有已删除模态框、Tour 与 Logo 的 42 个多余导出符号；新增导出 `containerCollapsed`、`showOnboardingCard`、`dismissOnboardingCard`；消除原代码中 `terms` 与 `currentUser` 的重复键 |

---

### 2. 后端核心路由：[`src/routes/quote.router.ts`](file:///F:/order_workflow/src/routes/quote.router.ts)

| Git Chunk Header (真实基线行号) | 变更类型 | 真实物理删除内容 |
| :--- | :--- | :--- |
| `@@ -700,52 +597,0 @@` | 物理删除 | **彻底删除 Logo 相关路由（共 52 行，原 700~751 行）**：<br>1. `POST /api/v1/tenant/logo`（Logo 上传接口）<br>2. `DELETE /api/v1/tenant/logo`（Logo 删除重置接口） |
| `@@ -1390,94 +1235,0 @@` | 物理删除 | **彻底删除底价商品列表与条目删除路由（共 94 行，原 1390~1483 行）**：<br>1. `GET /api/v1/catalog`（底价库商品清单查询接口）<br>2. `DELETE /api/v1/catalog/:sku`（底价库条目删除接口）<br>3. `POST /api/v1/catalog/:sku/delete` 及处理函数 `handleCatalogDelete` |

---

### 3. PDF 生成服务：[`src/services/pdf.service.ts`](file:///F:/order_workflow/src/services/pdf.service.ts)

| Git Chunk Header (真实基线行号) | 变更类型 | 真实修改内容 |
| :--- | :--- | :--- |
| `@@ -209 +209 @@`<br>`@@ -211,2 +210,0 @@` | 简化 | 移除 `customLogoPath` 与 `hasLogo` 变量，注释统一为“纯文字公司抬头版式” |
| `@@ -229,14 +227 @@` | 简化重构 | 移除 Logo 图片嵌入绘制分支 `doc.image(...)` 及 `logoBottomY` 计算，文字起始横坐标统一为 `startX` |
| `@@ -338 +323 @@` | 优化 | 表头高度安全基准计算由 `Math.max(leftY, rightY, logoBottomY, 82)` 简化为 `Math.max(leftY, rightY, 82)`，确保版面规整 |

---

### 4. 数据契约兼容：[`src/types/index.ts`](file:///F:/order_workflow/src/types/index.ts)

| Git Chunk Header (真实基线行号) | 变更类型 | 真实修改内容 |
| :--- | :--- | :--- |
| `@@ -233,7 +233,7 @@` | 向后兼容 | 保证 `TenantProfile` 中 `logoUrl?`, `logoPath?`, `noLogo?` 为可选字段，并将 `hideCostFromSales?: boolean` 调整为可选字段，确保历史版本 `profile.json` 缺少字段时仍可 100% 正常读取，零报错 |

---

### 5. 回归防护测试：[`tests/delete-endpoints.test.ts`](file:///F:/order_workflow/tests/delete-endpoints.test.ts)

| Git Chunk Header (真实基线行号) | 变更类型 | 真实重构内容 |
| :--- | :--- | :--- |
| `@@ -224 +224 @@`<br>`@@ -226,94 +226,2 @@`<br>`@@ -325 +233 @@`<br>`@@ -328 +236 @@`<br>`@@ -332 +239,0 @@`<br>`@@ -334 +240,0 @@` | 重构断言 | 将原针对 `DELETE /api/v1/catalog/:sku` 业务删除逻辑测试重构成**接口彻底下线防复活回归断言**（断言请求返回 404 Route Not Found，确保该被废弃路由不会被意外恢复） |

---

## 三、真实检验与回归测试结果

1. **TypeScript 严格静态编译检查**：
   - 运行：`npx tsc --noEmit`
   - 结果：**退出码 0，0 错误**（全工程严格类型检查无任何告警）。
2. **自动化测试套件回归**：
   - 运行：`npm test`
   - 结果：**17 个测试套件全过，126 项测试全部通过（17 passed, 126 passed, 0 failed）**。
3. **零残留 Grep 审计**：
   - `public/review.html` 扫描：`catalogModal`、`deleteCatalogModal`、`rateDiagnosticModal`、`referralModal`、`logoModal`、`tour-spotlight-overlay`、`openEmailFullscreen`、`openInquiryFullscreen`、`insertLogisticsAdviceToEmail`、`tenantLogoUrl` 匹配结果全部为 **0 处残留**。
   - `src/routes/quote.router.ts` 扫描：`tenant/logo`、`api/v1/catalog` 匹配结果全部为 **0 处残留**。

---

## 四、全局红线严格遵守核对

1. **IMAP / 发件箱兜底链路**：
   - 任务书 §2.3 补充红线：“删除一键出单按钮仅指前端按钮及其直接 JS，不含兜底链路”。
   - 经代码审查确认：`NotificationService` 与 `DraftService` 中关于 IMAP 写入失败时发送待审通知邮件的底层服务逻辑 **100% 原样保留，未触碰任何一行代码**。
2. **租户数据隔离**：
   - 所有工作台保留接口与新增只读接口严格执行 `authMiddleware` 校验与租户上下文隔离。
3. **原地冻结承诺**：
   - Step 2 已全部收官，所有改动已更新至 [`DELETED_FEATURES.md`](file:///F:/order_workflow/DELETED_FEATURES.md)。
   - **在您未明确下达“开始第三步”指令前，绝不触碰任何代码，绝不启动 Step 3**。
