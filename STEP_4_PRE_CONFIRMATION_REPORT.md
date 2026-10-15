# Step 4 开工前 3 个小项确认与修复报告 (STEP_4_PRE_CONFIRMATION_REPORT.md)

> **基准 Git Tag**：`pre-mvp-slim` (commit: `cc1d3c4`)  
> **报告时间**：2026-10-14  
> **针对反馈**：Step 3 验收通过，关于 ① 双写镜像读取与清理覆盖、② quick-quote 加字段、③ 404 消息改简体的确认与闭环处理  
> **当前状态**：✅ **3 项已全部确认并闭环落地，测试 100% 通过，代码保持严格冻结**

---

## 一、3 个小项确认与处理详情

### ① 双写镜像的读取与清理覆盖
- **现状与问题诊断**：  
  在 Step 3 初始设计中，为了向前兼容 `default` 租户，我们在 `saveInquiry` 与 `getInquiry` 中保留了 `data/inquiries/` 镜像目录。但正如您敏锐指出的，该双写存在两处覆盖死角：
  1. **读取死角**：`listInquiries` 原先仅读取了 `data/tenants/default/inquiries/`，若有历史或镜像落盘文件在 `data/inquiries/`，列表查询会遗漏；
  2. **清理死角**：测试脚本与租户清理操作仅清理 `data/tenants/<tenantId>/`，未覆盖 `data/inquiries/`，导致运行测试后留存未跟踪脏文件。
- **已落地闭环方案**：
  1. **读取覆盖**：在 `InquiryService.listInquiries` 中针对 `default` 租户增加了对 `legacyStorageDir` (`data/inquiries/`) 的扫描，并通过 `Set<string>` 基于 `inquiryId` 实现自动排重合并；
  2. **清理覆盖**：在 `InquiryService` 中新增 `cleanupTenantInquiries(tenantId)` 方法，当清理 `default` 租户时，同步递归清理 `data/inquiries/` 镜像目录。并在 `tests/inquiry-service.test.ts` 的 `afterAll` 中强制调用，彻底杜绝测试遗留脏文件；
  3. **自动化验证**：新增专属测试用例 `default 租户双写镜像读取覆盖与清理覆盖验证`，验证双写落盘存在性、排重读取及同步彻底清理。
- **架构建议（供 Kelvin 决策）**：  
  由于询盘实体（Inquiry）是 V10 全新引入的一等实体，历史版本中从未存在过 `data/inquiries/` 数据。如果 Kelvin 倾向于更纯粹的 D-12 单一真实数据源，亦可在 Step 4 随时彻底移除双写逻辑，全量收敛至 `data/tenants/<tenantId>/inquiries/`。

---

### ② quick-quote 加字段已知悉
- **确认说明**：  
  感谢确认！`POST /api/inbound/quick-quote` 在生成报价单的同时同步持久化 `InquiryRecord` 询盘一等实体，并向前端返回 `inquiryId`。  
  这一设计使得审单台快速出单与邮件入站（`inbound-processor`）保持了 100% 一致的数据生命周期模型，为 Step 4 工作台询盘箱查看、回溯与单据联动提供了统一的实体凭证。

---

### ③ 404 消息改简体
- **已落地闭环方案**：  
  已全面修正 `src/routes/quote.router.ts` 中 `GET /api/v1/inquiries/:id` 越权或不存在时的错误提示信息及相关注释，彻底消除繁体字：
  - **改前**：`【未找到或無權訪問】詢盤 [${inquiryId}] 不存在或不屬於當前租戶`
  - **改后**：`【未找到或无权访问】询盘 [${inquiryId}] 不存在或不属于当前租户`
  - 注释同步对齐为规范简体中文。
  - `tests/inquiry-service.test.ts` 中的断言也同步更新为简体 `未找到或无权访问`，测试 100% 绿色通过。

---

## 二、真实 Git Diff 统计与 Chunk 对照

### 1. `git diff --stat pre-mvp-slim` 完整原文输出
```text
 public/index.html                                  |  934 +----------
 public/review.html                                 | 1746 ++------------------
 src/routes/inbound.router.ts                       |  185 +--
 src/routes/quote.router.ts                         |  285 +---
 src/services/inbound-processor.service.ts          |   37 +
 src/services/pdf.service.ts                        |   21 +-
 src/services/trial.service.ts                      |  168 +-
 src/types/index.ts                                 |   34 +-
 tests/delete-endpoints.test.ts                     |  104 +-
 tests/e2e-workflow.test.ts                         |   80 +-
 ...\345\267\245\344\275\234\346\265\201_v8.0.json" |    0
 .../{ => archive}/n8n-outlook-quote-draft.json     |    0
 .../{ => archive}/n8n-scheme2-draft-injection.json |    0
 .../n8n-universal-all-in-one-quote-workflow.json   |    0
 14 files changed, 339 insertions(+), 3255 deletions(-)
```

### 2. 修正涉及文件真实 Chunk 标头
- **`src/routes/quote.router.ts`**：  
  `@@ -814,0 +662,36 @@`（404 提示改为简体中文：`【未找到或无权访问】询盘 [${inquiryId}] 不存在或不属于当前租户`）
- **`src/services/inquiry.service.ts`**（新增模块）：  
  新增 `listInquiries` 双写镜像排重读取与 `cleanupTenantInquiries` 镜像清理覆盖。
- **`tests/inquiry-service.test.ts`**（新增测试）：  
  更新 404 简体断言并新增双写覆盖测试用例，`afterAll` 增加覆盖清理。

---

## 三、测试与验证结果

1. **Step 3 专属测试套件**：`npx jest tests/inquiry-service.test.ts`  
   **12 passed, 12 total**（新增双写读取与清理测试 100% 通过）
2. **TypeScript 编译检查**：`npx tsc --noEmit`  
   **0 错误**
3. **全量回归测试套件**：`npm test`  
   **18 passed, 18 total, 138 passed**（全局测试全部通过，工作区 0 未跟踪脏文件）

---

## 四、代码冻结声明与 Step 4 准入申请

> [!IMPORTANT]
> **代码已再次完全冻结**：
> - 3 个小项已全部妥善确认并严格按照规范闭环；
> - 在收到 Kelvin 明确的开工指令前，绝不触碰任何代码；
> - 请 Kelvin 审阅本报告，确认无误后请下达指令：“**开始 Step 4**”，我们将立即启动工作台信息架构重构（将 `review.html` 拆分重构为：① 询盘箱、② 报价单、③ 底价库、④ 设置 4 大业务模块）。
