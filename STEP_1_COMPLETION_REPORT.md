# KelvinFlow MVP 瘦身改版 - Step 1 执行汇报 (真实 Git Diff 基线校验版)

> **阶段**：Step 1 - 官网瘦身删除 (§2.1 `public/index.html` & 后端路由与服务)  
> **状态**：已完成并经 `pre-mvp-slim` 基线校验，静默等待 Step 2 指令  
> **基准 Tag**：`pre-mvp-slim` (commit: `cc1d3c4`)  
> **汇报时间**：2026-10-14  

---

## 一、真实 `git diff --stat` 原文

```text
 public/index.html             | 934 ++----------------------------------------
 src/routes/inbound.router.ts  | 158 -------
 src/routes/quote.router.ts    | 102 -----
 src/services/trial.service.ts | 168 +-------
 tests/e2e-workflow.test.ts    |  80 +---
 5 files changed, 51 insertions(+), 1391 deletions(-)
```

---

## 二、基于 `git diff -U0 pre-mvp-slim` 的真实变更区块与行号明细

所有行号与块信息均直接源自真实的 Git 基线对比，彻底杜绝任何估算与不实标注。

### 1. 前端页面：[`public/index.html`](file:///F:/order_workflow/public/index.html)

| Git Chunk Header (真实基线行号) | 变更类型 | 真实删除 / 修改代码内容 |
| :--- | :--- | :--- |
| `@@ -226 +225,0 @@` | 删除 | 删除桌面端顶栏导航中的 `<a href="#pricing" ...>版本定价</a>` |
| `@@ -241,4 +239,0 @@` | 删除 | 删除桌面端顶栏导航中的 `#nav-referral-btn`（同行推荐入口） |
| `@@ -265,2 +260,2 @@`<br>`@@ -274,5 +269 @@` | 修改/删除 | 移动端导航抽屉精简：删除 `#pricing` 链接及多余样式与边距 |
| `@@ -737,205 +727,0 @@` | 删除 | **彻底物理删除 `#pricing` 版本定价整个 Section**（个人版月付/年付卡片、团队版卡片、计费切换器与付费按钮共 205 行，原 737~941 行） |
| `@@ -1056 +841,0 @@` | 删除 | 删除 Minimal Footer 中的 `<a href="#pricing" ...>版本定价</a>` |
| `@@ -1065 +850 @@` | 修改 | 更新弹窗组件群注释，移除 Payment, Enterprise, Referral 描述 |
| `@@ -1150 +935 @@` | 修改 | 将注册渠道下拉选项中的 `referral` 修改为 `peer`（避免混淆） |
| `@@ -1165,11 +949,0 @@` | 删除 | **彻底物理删除注册弹窗内的 `#inbound-ref-box`**（邀请码输入框及提示区块共 11 行，原 1165~1175 行） |
| `@@ -1342,203 +1116 @@` | 删除 | **彻底物理删除三大冗余弹窗群（共 203 行）**：<br>1. `#plan-c-welcome-modal`（迎新弹窗）<br>2. `#payment-modal`（微信转账与月/年付支付弹窗）<br>3. `#referral-share-modal`（同行邀请分享弹窗） |
| `@@ -1561,2 +1132,0 @@` | 删除 | 删除 JavaScript 全局变量 `currentBillingCycle` 与 `currentPaymentCycle` |
| `@@ -1591,122 +1160,0 @@` | 删除 | **彻底物理删除定价与支付 JS 函数（共 122 行）**：<br>`switchBillingCycle`, `renderPaymentModalData`, `switchPaymentModalCycle`, `openPaymentModal`, `closePaymentModal`, `openEnterpriseModal`, `closeEnterpriseModal`, `openWaitlistModal`, `copyFounderWechat`, `copyPaymentNote` |
| `@@ -1714,65 +1161,0 @@`<br>`@@ -1821,48 +1192,13 @@` | 简化重构 | **重构 `updateNavForLoggedInUser` 函数**：彻底清理对 `pricingTrialBtn`、`pricingPayBtn`、`pricingLoggedInBox`、`pricingLoggedInText`、`btnPayText`、`refBtn` 的读取与操作 |
| `@@ -1945,102 +1273,0 @@` | 删除 | **彻底物理删除邀请分享 JS 函数（共 102 行）**：<br>`openReferralShareModal`, `closeReferralShareModal`, `copyShareCode`, `copyShareLink`, `copyShareFullText` |
| `@@ -2114,9 +1340,0 @@`<br>`@@ -2132,14 +1350 @@` | 简化重构 | **重构 `openInboundModal`**：删除企业版/团队版拦截及 `?ref=` 推荐人捕获逻辑 |
| `@@ -2735,17 +1939,0 @@`<br>`@@ -2820,46 +2017,0 @@` | 简化重构 | **重构 `handleInboundSubmit` 与删除 Plan C 逻辑**：移除 `storedRef` 参数提交流程与自邀请拦截，注册成功后提示并直接跳转审单台，删除 `openPlanCWelcomeModal` 等辅助函数 |
| `@@ -3096,8 +2247,0 @@` | 删除 | 移除 `DOMContentLoaded` 中的 `urlParams.get('ref')` 监听及 `localStorage.setItem('kelvinflow_referrer', ...)` |

---

### 2. 后端路由与服务

#### (1) [`src/routes/quote.router.ts`](file:///F:/order_workflow/src/routes/quote.router.ts)
| Git Chunk Header | 变更类型 | 真实删除内容 |
| :--- | :--- | :--- |
| `@@ -457,102 +456,0 @@` | 删除 | **彻底物理删除以下两个路由（共 102 行，原 457~558 行）**：<br>1. `GET /api/v1/auth/referral-info`（邀请统计查询）<br>2. `POST /api/admin/upgrade-tenant`（管理员手动升级租户接口） |

#### (2) [`src/routes/inbound.router.ts`](file:///F:/order_workflow/src/routes/inbound.router.ts)
| Git Chunk Header | 变更类型 | 真实删除内容 |
| :--- | :--- | :--- |
| `@@ -12,114 +11,0 @@` | 删除 | **彻底物理删除 `POST /api/inbound/lead` 接口（共 114 行，原 12~125 行）**（旧官网留资入库并推微信逻辑） |
| `@@ -141,44 +26,0 @@` | 删除 | **彻底物理删除留资专用辅助函数（共 44 行，原 141~184 行）**：<br>`ipRequestHistory`, `checkRateLimit`, `pushToWeChat`, `saveLeadLocally` |

#### (3) [`src/services/trial.service.ts`](file:///F:/order_workflow/src/services/trial.service.ts)
| Git Chunk Header | 变更类型 | 真实修改 / 删除内容 |
| :--- | :--- | :--- |
| `@@ -311,31 +311 @@` | 删除 | 移除试用开通时的推荐人关联查询与互赠 +7 天奖励逻辑（原 311~341 行） |
| `@@ -447,4 +390 @@`<br>`@@ -459,3 +399 @@` | 简化 | 清理留资通知对象中的 `referrerUser` 依赖，欢迎语改为统一标准文案 |
| `@@ -837,32 +775 @@`<br>`@@ -907 +813,0 @@` | 删除 | 移除 `upgradeTenantToPaid` 中针对推荐人奖励 +30 天时长的核算分支及返回体中的 `referrerReward` |
| `@@ -914,56 +819,0 @@` | 删除 | **彻底物理删除 `getReferralInfo` 方法（共 56 行，原 914~969 行）** |

#### (4) 回归测试防护：[`tests/e2e-workflow.test.ts`](file:///F:/order_workflow/tests/e2e-workflow.test.ts)
| Git Chunk Header | 变更类型 | 真实修改内容 |
| :--- | :--- | :--- |
| `@@ -10,31 +10,2 @@`<br>`@@ -44,46 +15 @@` | 重构 | 将原调用已删除接口 `POST /lead` 的用例改造为**防复活回归断言**（断言 `postLayer` 严格为 `undefined`，确保该废弃接口未来绝不被意外恢复） |

---

## 三、真实检验与回归测试结果

1. **TypeScript 严格静态编译**：
   - 运行：`npx tsc --noEmit`
   - 结果：**退出码 0，0 错误**。
2. **零残留 Grep 审计**：
   - `public/index.html`：`referral`, `payment-modal`, `pricing`, `plan-c`, `openEnterprise`, `openWaitlist`, `ref=` 均为 **0 处业务残留**。
   - `src/**/*.ts`：`referral-info`, `upgrade-tenant`, `getReferralInfo` 均为 **0 处残留**。
3. **自动化测试套件回归**：
   - 运行：`npm test`
   - 结果：**17 个测试套件全过，128 项测试全部通过（128 passed, 0 failed）**。

---

## 四、关于越界删除与汇报规范的整改与承诺

1. **绝对杜绝虚假/估算行号**：今后所有步骤的汇报行号必须且只能来自 `git diff -U0 pre-mvp-slim` 的真实输出，汇报必附 `git diff --stat` 原文；
2. **超出任务书范围一律先请示**：任何非任务书明确规定的清理或改动，绝不擅自执行或擅自写入记录，必须提前向您请示审批；
3. **原地冻结待命**：当前代码已停留在 Step 1 状态，**在您未明确下达“开始第二步”指令前，绝不触碰任何代码，绝不启动 Step 2**。
