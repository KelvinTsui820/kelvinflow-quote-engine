# Step 3 完工报告：工作流精简与询盘一等实体落盘 (§2.5)

> **基准 Git Tag**：`pre-mvp-slim` (commit: `cc1d3c4`)  
> **报告时间**：2026-10-14  
> **改版依据**：`AI任务书_MVP瘦身改版_v10-MVP.md` (§2.5) 及 `MVP_SLIM_EXECUTION_PLAN_V10.md`  
> **交付状态**：✅ **Step 3 已完全完工，全套自动化测试 100% 通过，代码即刻进入冻结状态**

---

## 一、Git Diff 基线统计原文 (git diff --stat pre-mvp-slim)

以下为工作区当前针对基准 tag `pre-mvp-slim` 的 `git diff --stat` 完整原文输出（真实统计，杜绝造假）：

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

> **注**：除上述 14 个已被 Git 跟踪/修改的文件外，Step 3 新增了 2 个未跟踪模块文件：
> 1. `src/services/inquiry.service.ts`（询盘一等实体服务与落盘存储）
> 2. `tests/inquiry-service.test.ts`（Step 3 专属 11 项深度验收测试套件）

---

## 二、Step 3 核心交付项完成情况说明

### 1. n8n 目录工作流精简与安全归档 (§2.5 & DELETED_FEATURES Entry 19)
- **归档操作**：创建 `workflows/archive/` 目录，将 4 个非核心/实验性质的工作流文件安全移入归档：
  - `KelvinFlow_AI全能邮件报价中枢_SaaS多租户单一工作流_v8.0.json`
  - `n8n-outlook-quote-draft.json`
  - `n8n-scheme2-draft-injection.json`
  - `n8n-universal-all-in-one-quote-workflow.json`
- **活跃保留**：`workflows/` 根目录下**唯一保留** 1 个官方标准出单工作流：
  - `workflows/n8n-gmail-quote-draft.json`
- **验证**：自动化测试严格断言 `workflows/` 根目录仅含该单一 json 文件，归档目录含 4 个文件。

### 2. 询盘一等实体 (Inquiry Entity) 规范落地 (§2.5)
- **类型定义 (`src/types/index.ts`)**：
  - `QuotationResult` 新增可选字段 `inquiryId?: string;`，将报价单与询盘实体紧密关联。
  - 导出规范的 `InquiryRecord` 接口，完整覆盖任务书要求字段：
    - `inquiryId`: `INQ-YYYYMMDD-xxxx` 格式唯一编号
    - `tenantId`: 租户 ID，严格落实 D-12 物理隔离
    - `receivedAt`: ISO 8601 入站接收时间
    - `from`: 买家邮箱
    - `to`: 收件邮箱
    - `subject`: 询盘邮件主题
    - `rawTextHash`: 邮件正文原始内容 SHA-256 哈希（用于排重与完整性验证）
    - `content`: 询盘完整正文
    - `parseStatus`: `'parsed' | 'pending' | 'failed'`
    - `quotationNumber`: 关联生成的报价单号
    - `inquiryMessageId`: 原始 RFC 822 Message-ID
    - `buyerName`: 买家称呼
    - `itemsSummary`: 提取商品型号、数量、单位概要
    - `attachments`: 附件元数据清单

### 3. InquiryService 服务与物理分租户落盘持久化
- **服务实现 (`src/services/inquiry.service.ts`)**：
  - 严格按照 D-12 规范，物理隔离存储路径：`data/tenants/<tenantId>/inquiries/INQ-*.json`。
  - 兼容回退：若为 `default` 租户，同步镜像写入 `data/inquiries/` 保证向前兼容。
  - 核心方法：
    - `generateInquiryId()`: 生成规范唯一 ID（如 `INQ-20261014-a1b2`）。
    - `computeTextHash(text)`: 计算原始正文 SHA-256 Hash。
    - `saveInquiry(inquiry)`: 原子写入租户隔离目录。
    - `getInquiry(inquiryId, requestTenantId)`: 带租户鉴权校验的实体读取，跨租户越权严格返回 `null`。
    - `listInquiries(requestTenantId)`: 倒序读取指定租户名下全部实体（最新入站排在前）。
    - `findInquiryByMessageId(tenantId, messageId)`: 跨协议幂等查找。
    - `findInquiryByQuotationNumber(tenantId, quotationNumber)`: 报价单反查询盘。
    - `createInquiryFromInbound(params)`: 从入站载荷快捷构造并持久化实体。

### 4. 入站业务流与 Web 快速出单深度打通
- **IMAP / Webhook 邮件入站 (`src/services/inbound-processor.service.ts`)**：
  - 报价生成成功后，自动组装 `InquiryRecord` 并持久化落盘至对应租户的 `inquiries/` 目录。
  - `quotation.inquiryId` 注入生成的 ID，`InboundProcessResult` 暴露 `inquiryId`。
- **审单台 Web 快速出单 (`src/routes/inbound.router.ts`)**：
  - `POST /api/inbound/quick-quote` 生成报价单同时，自动持久化询盘实体，并随 JSON 响应返回 `inquiryId`。

### 5. 严格【只读不写】API 端点与 D-12 物理隔离越权防护
- **端点实现 (`src/routes/quote.router.ts`)**：
  - `GET /api/v1/inquiries`: 获取当前登录租户名下所有询盘列表。
  - `GET /api/v1/inquiries/:id`: 获取指定询盘详情。
- **只读不写与越权防护规范**：
  - **只读保证**：后端未定义任何 `POST /api/v1/inquiries`、`PUT /api/v1/inquiries/:id` 或 `DELETE /api/v1/inquiries/:id` 路由，任何写操作直接命中 Express 默认 404 Route Not Found。
  - **防 IDOR 泄露**：当租户 B 尝试通过 ID 查询租户 A 的询盘时，即便知道真实的 `inquiryId`，接口严格响应 `404 Not Found`（`【未找到或無權訪問】`），绝不返回 403，彻底消除实体存在的探测泄露通道。

---

## 三、真实 Git Diff Chunk 标头与代码映射对照表

本节所有 chunk 标头均直接取自真实 `git diff -U0 pre-mvp-slim` 命令输出，严禁任何形式的推测或编造：

| 文件路径 | 真实 Git Diff Chunk 标头 | 变更内容与对应说明 |
| :--- | :--- | :--- |
| **`workflows/`** | `similarity index 100%`<br>`rename from ... to workflows/archive/...` | 4 个工作流文件重命名移入 `workflows/archive/`，根目录仅留 `n8n-gmail-quote-draft.json` |
| **`src/types/index.ts`** | `@@ -207,0 +208 @@` | `QuotationResult` 接口新增可选字段 `inquiryId?: string;` |
| **`src/types/index.ts`** | `@@ -274,0 +276,31 @@` | 导出 `InquiryRecord` 询盘一等实体接口定义及 14 个标准字段 |
| **`src/services/inbound-processor.service.ts`** | `@@ -9,0 +10 @@` | 引入 `InquiryService` |
| **`src/services/inbound-processor.service.ts`** | `@@ -28,0 +30 @@` | `InboundProcessResult` 结果接口新增 `inquiryId?: string;` |
| **`src/services/inbound-processor.service.ts`** | `@@ -179,0 +182,34 @@` | 邮件报价生成后自动执行 `InquiryService.createInquiryFromInbound` 落盘实体 |
| **`src/services/inbound-processor.service.ts`** | `@@ -386,0 +423 @@` | 异步处理最终返回体包含 `inquiryId: persistedInquiryId` |
| **`src/routes/inbound.router.ts`** | `@@ -133,0 +20 @@` | 引入 `InquiryService` |
| **`src/routes/inbound.router.ts`** | `@@ -488,0 +332,25 @@` | `POST /quick-quote` Web 出单处理中自动持久化询盘实体 |
| **`src/routes/inbound.router.ts`** | `@@ -501,0 +370 @@` | `POST /quick-quote` 响应体携带 `inquiryId` |
| **`src/routes/quote.router.ts`** | `@@ -17,0 +18 @@` | 引入 `InquiryService` |
| **`src/routes/quote.router.ts`** | `@@ -814,0 +662,36 @@` | 新增 `GET /api/v1/inquiries` 与 `GET /api/v1/inquiries/:id` 两个纯只读 API |

---

## 四、自动化回归验证结果

### 1. Step 3 专属测试套件 (`tests/inquiry-service.test.ts`)
运行命令：`npx jest tests/inquiry-service.test.ts`
```text
PASS tests/inquiry-service.test.ts
  Step 3: 工作流精简与询盘一等实体落盘与只读API验收 (§2.5 & D-12)
    1. n8n 工作流目录精简验收
      √ workflows/ 根目录应仅保留 1 个活跃工作流 JSON (n8n-gmail-quote-draft.json) (3 ms)
      √ workflows/archive/ 目录应包含其余 4 个归档工作流 (2 ms)
    2. InquiryService 实体生成、字段规范与落盘持久化
      √ 能够成功生成 INQ-*.json 实体，且包含全部任务书 §2.5 要求字段 (4 ms)
      √ 通过 inquiryMessageId 与 quotationNumber 能够精确反查询盘 (2 ms)
    3. D-12 租户物理隔离与防越权校验 (API 与 Service 双重防护)
      √ Service 层隔离：租户 B 跨租户读取租户 A 的询盘严格返回 null
      √ API 层隔离：租户 A 只能查询到本租户名下的询盘列表 (35 ms)
      √ API 层越权防护：租户 B 尝试获取租户 A 的询盘实体严格返回 404 (防 IDOR 泄露) (6 ms)
      √ API 层合法访问：租户 A 读取本租户询盘实体返回 200 (13 ms)
    4. 严格【只读不写】约束验收
      √ 向 /api/v1/inquiries 发送 POST 请求应返回 404 (Route Not Found) (28 ms)
      √ 向 /api/v1/inquiries/:id 发送 PUT 请求应返回 404 (Route Not Found) (12 ms)
      √ 向 /api/v1/inquiries/:id 发送 DELETE 请求应返回 404 (Route Not Found) (13 ms)

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
Snapshots:   0 total
Time:        9.036 s
```

### 2. TypeScript 类型检查
运行命令：`npx tsc --noEmit`
- **检查结果**：0 错误，类型系统完全通过。

### 3. 全局回归测试套件 (`npm test`)
运行命令：`npm test`
```text
Test Suites: 18 passed, 18 total
Tests:       137 passed, 137 total
Snapshots:   0 total
Time:        20.482 s
Ran all test suites.
```
- **回归评估**：所有历史已保留功能、删除断言、多租户鉴权与 E2E 完整工作流 100% 绿色通过，无任何倒退破坏。

---

## 五、DELETED_FEATURES.md 更新同步

`DELETED_FEATURES.md` 已在项目根目录与解决报告文件夹 (`C:\Users\tsuik\OneDrive\桌面\solve report\DELETED_FEATURES.md`) 同步更新：
1. 总表追加 **Entry 19**（n8n 冗余工作流精简与归档）；
2. 增补 **三、Step 3 工作流精简与询盘一等实体变更对照表**，对齐所有 chunk 标头与变更说明。

---

## 六、代码冻结声明与请示

> [!IMPORTANT]
> **代码现已完全冻结**：
> - Step 3 所需的代码与工作流重组已全部落地并验证完毕；
> - 在您对本完工报告进行检视与确认之前，**绝不进行任何代码变更**；
> - 请 Kelvin 审查本完工报告，经您验收通过并明确发出“开始 Step 4”指令后，再行启动 **Step 4：工作台信息架构重构 (§2.1–§2.4，review.html 拆分重构为 4 大业务模块)**。
