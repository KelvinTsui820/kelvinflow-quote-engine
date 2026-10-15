# Step 4 先行任务完工报告：双写彻底移除、附件解析提示、Excel 模板 10→1 收敛与试用展示简化

> **基准 Git Tag**：`pre-mvp-slim` (commit: `cc1d3c4`)  
> **报告时间**：2026-10-14  
> **改版依据**：Kelvin 阶段衔接调整指令、`AI任务书_MVP瘦身改版_v10-MVP.md` (§2.4, §2.6, §2.7) 及 `MVP_SLIM_EXECUTION_PLAN_V10.md`  
> **交付状态**：✅ **4 项先行任务全部圆满完工，全套 19 个测试套件 146 个用例 100% 通过，代码即刻进入全面冻结状态，等待 Kelvin 交付 Stitch 视觉设计稿**

---

## 一、Git Diff 基线统计原文 (git diff --stat pre-mvp-slim)

以下为工作区当前针对基准 tag `pre-mvp-slim` 的 `git diff --stat` 完整原文输出（真实统计，杜绝造假）：

```text
 public/index.html                                  |  934 +---------
 public/review.html                                 | 1813 ++------------------
 .../Minimal_Export_Pricing_Template.xlsx           |  Bin
 .../Standard_Export_Pricing_Template.xlsx          |  Bin
 .../templates/{ => archive}/pricing_template.xlsx  |  Bin
 ...6\202\345\272\225\344\273\267\350\241\250.xlsx" |  Bin
 ...1\250\346\227\227\350\210\260\347\211\210.xlsx" |  Bin
 ...5\225\350\241\250\346\250\241\346\235\277.xlsx" |  Bin
 ...6\266\345\210\253\345\220\215\347\211\210.xlsx" |  Bin
 ...1\250\346\227\227\350\210\260\347\211\210.xlsx" |  Bin
 ...7\274\345\205\245\346\250\241\346\235\277.xlsx" |  Bin
 public/templates/kelvinflow-pricing-template.xlsx  |  Bin 0 -> 43632 bytes
 src/adapters/excel.adapter.ts                      |   17 +-
 src/routes/inbound.router.ts                       |  185 +-
 src/routes/quote.router.ts                         |  309 +---
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
 25 files changed, 384 insertions(+), 3318 deletions(-)
```

> **注**：除上述 25 个已被 Git 跟踪/重命名/修改的文件外，工作区新增的模块与测试文件包括：
> 1. `src/services/inquiry.service.ts`（询盘一等实体核心服务，纯租户隔离存储）
> 2. `tests/inquiry-service.test.ts`（询盘服务 11 项专属自动化测试套件）
> 3. `tests/excel-template-validation.test.ts`（Excel 模板 10→1 收敛与核价适配 9 项专属自动化测试套件）
> 4. `DELETED_FEATURES.md`（完整记录 Entry 00–20 及双写移除的权威删除归档文档）

---

## 二、4 项先行任务核心交付完成情况

### 1. 双写彻底移除（已定案）
- **核心数据架构定案**：
  - 彻底删除 `src/services/inquiry.service.ts` 中针对 `data/inquiries/` (`legacyStorageDir`) 镜像目录的所有双写落盘、读取、排重合并与清理逻辑。
  - **询盘实体的唯一真实数据源（Single Source of Truth）严格收敛为 `data/tenants/<tenantId>/inquiries/`**。
  - `saveInquiry`、`getInquiry`、`listInquiries` 仅读写租户隔离物理目录，彻底删除了用于内存比对排重的 `Set` 机制。
  - `cleanupTenantInquiries` 保留清理租户自身目录的有用能力，去掉了同步清理根镜像目录的分支。
- **测试对齐与验证**：
  - `tests/inquiry-service.test.ts` 删除了原双写落盘与镜像同步专属测试用例，`afterAll` 仅保留租户目录清理。
  - 运行 `npx jest tests/inquiry-service.test.ts`，11/11 项测试用例全部一次性通过。

### 2. §2.4 附件解析明确为二期文案落地
- **后端代码零改动**：
  - `src/services/attachment-extractor.service.ts` 保持 **100% 物理未动**，代码完整保留以备二期平滑接管。
- **前端交互提示显性化**：
  - 在 `public/review.html` 的新建询盘弹窗 `#new-po-modal-overlay` 内，标题与 Tab 切换栏之间新增醒目提示黄条：
    ```html
    <div class="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
      <i class="ri-information-line text-amber-600 text-sm"></i>
      <span>请粘贴邮件正文（附件解析为二期功能，当前仅解析正文）</span>
    </div>
    ```
- **业务兜底验收**：
  - 纯附件询盘依然由后端现有占位逻辑（`PENDING-SKU-01`）安全承接，前端拥有明确文案引导用户主动粘贴邮件文本，消除用户认知落差。

### 3. §2.6 Excel 底价表模板 10→1 收敛与适配核算深度验证
- **模板收敛与安全归档**：
  - `public/templates/` 根目录下**唯一保留** 1 套官方标准出厂底价模板：
    - `public/templates/kelvinflow-pricing-template.xlsx`
    - 该模板源自仓库内《`商品底价表/外贸出厂底价表与智能核价模板.xlsx`》，MD5 校验值为：`27c9b655693c26878b3680cc72b59b83`（完全一致）。
  - 其余 9 个历史混杂 `.xlsx` 模板文件通过 `git mv` 安全移入 `public/templates/archive/` 目录：
    - `Minimal_Export_Pricing_Template.xlsx`
    - `Standard_Export_Pricing_Template.xlsx`
    - `pricing_template.xlsx`
    - `出厂底价表.xlsx`
    - `外贸出厂底价表与智能核价模板_双表旗舰版.xlsx`
    - `极简出厂底价表_单表模板.xlsx`
    - `极简出厂底价表_单表模板_含买家别名版.xlsx`
    - `极简出厂底价表_双表旗舰版.xlsx`
    - `标准出厂底价导入模板.xlsx`
  - 2 个买家 PO 样例 PDF 正常保留在 `public/templates/`：`sample_po.pdf` 与 `海外买家采购单样例_PO.pdf`。
- **模板下载接口对齐**：
  - `src/routes/quote.router.ts`:
    - `GET /api/v1/template/pricing-sheet` 统一返回 `public/templates/kelvinflow-pricing-template.xlsx`。
    - 响应头下发标准 RFC 5987 UTF-8 文件名：`kelvinflow-pricing-template.xlsx`。
    - 官网与审单台“下载底价表模板”入口均通过此接口获取官方统一模板。
    - `GET /api/v1/template/sample-po` 端点正常保留。
- **Sheet 识别防误判优化 (`src/adapters/excel.adapter.ts`)**：
  - 在工作表过滤规则中增加对包含“脱敏”/“对外”字样的工作表忽略判定（如 `📄 对外纯净批量报价单 (脱敏单)`），精准识别其为非商品库，杜绝被误识别为商品库而导入空字段或异常数据。
- **全流程适配验证实测 (`tests/excel-template-validation.test.ts`)**：
  - 新增专属测试套件，用该模板真实调用核价引擎与 API 实测，9/9 项测试全过：
    1. **MD5 精确比对**：源文件与模板文件 Hash 完全吻合（`27C9B655693C26878B3680CC72B59B83`）。
    2. **Products sheet 识别**：正确识别为商品底价库，有效商品数＝6 个（`KF-LED-001` ~ `KF-SOL-006`）。
    3. **全字段列映射**：SKU、品名、出厂底价 (RMB)、MOQ、箱规、CBM、毛重、专属毛利率、交期、HS编码全部准确提取。
    4. **公式列安全忽略**：L–Q 列公式计算项（FOB 单价、毛利额、外箱体积等）被安全忽略，绝不误读为输入字段。
    5. **Config sheet 读取**：基准币种 (USD)、基准汇率 (7.2000)、基准毛利率 (15%) 等配置被准确读取。
    6. **脱敏单精准过滤**：脱敏单工作表被正确归类为非商品库，不被误读。
    7. **上传与状态端点**：`POST /api/v1/update-pricing` 上传成功，`GET /api/v1/pricing/status` 返回 `itemCount: 6`，`hasCustomPricing: true`。
    8. **模板下载端点**：`GET /api/v1/template/pricing-sheet` 正常下发 200 及正确文件名。
    9. **建单核算分毫不差**：用 6 项商品触发 `POST /api/inbound/quick-quote`，外币单价、总价、算柜装载率计算分毫不差！

### 4. §2.7 试用展示简化（后端绝对不动）
- **前端文案极简呈现**：
  - `public/review.html` 中彻底移除试用到期时的营销付费锁单浮层，改为极简告知卡：
    - 主标题：`内测期间功能全开`
    - 副标题：`系统处于公测体验期，所有功能正常可用，不限制出单与底价管理`
    - 主操作：`我知道了，继续使用`（点击即关闭弹窗，继续无障碍操作审单台全部功能）。
  - `openTrialExpiredModal` 逻辑相应收敛为将 `expiredMessage` 设为 `内测期间功能全开`。
- **后端红线绝对遵守**：
  - `trial-register`、`/auth/login` (含 `TRIAL_EXPIRED`)、`/auth/trial-status` 的后端业务逻辑保持 **100% 物理零修改**。

### 5. Step 4 暂缓指令严格执行
- 严格遵循 Kelvin 指令：**Step 4（§3 工作台 CRM 导航重构）原地暂缓，等待 Kelvin 交付 Stitch 视觉设计稿后，按“新架构＋新视觉”一次到位**。
- 本轮先行任务完成后，代码即刻进入冻结状态，未经指示绝不擅自变动导航结构与页面组件。

---

## 三、真实 Git Diff Chunk 标头与代码映射对照表

本轮先行任务修改涉及的文件及其对应的真实 Git Diff Chunk 标头严格对应如下：

| 序号 / 任务项 | 涉及文件 | 真实 Git Diff Chunk 标头 | 对应改动说明 |
| :--- | :--- | :--- | :--- |
| **双写移除** | `src/services/inquiry.service.ts` | 新增模块文件 | 彻底剥离 `legacyStorageDir`，仅针对 `data/tenants/<tenantId>/inquiries/` 读写，移除 Set 排重 |
| **双写移除** | `tests/inquiry-service.test.ts` | 新增测试文件 | 移除双写专属测试，保留租户物理隔离与清理断言（11/11 通过） |
| **§2.4** | `public/review.html` | `@@ -2250,0 +1722,6 @@` | 新建询盘弹窗 `#new-po-modal-overlay` 增加黄底提示条：“请粘贴邮件正文（附件解析为二期功能，当前仅解析正文）” |
| **§2.6** | `public/templates/` | `git status` 重命名 | 归档 9 个历史混杂模板至 `archive/`，唯一保留官方模板 `kelvinflow-pricing-template.xlsx` (MD5 吻合) |
| **§2.6** | `src/routes/quote.router.ts` | `@@ -872 +755 @@`<br>`@@ -875 +758 @@`<br>`@@ -877,3 +760 @@`<br>`@@ -882 +763,3 @@`<br>`@@ -886,6 +768,0 @@`<br>`@@ -894,2 +771,2 @@`<br>`@@ -901 +778 @@` | `GET /api/v1/template/pricing-sheet` 统一指向 `kelvinflow-pricing-template.xlsx` 并下发 UTF-8 文件名 |
| **§2.6** | `src/adapters/excel.adapter.ts` | `@@ -119,3 +119,14 @@` | 忽略 sheetName 包含“脱敏”/“对外”字样的纯净报价单，防止误识别为商品底价库 |
| **§2.6** | `tests/excel-template-validation.test.ts` | 新增测试文件 | 涵盖模板识别、列映射、公式忽略、Config解析、上传导入、状态查询与快速建单全流程 9 项测试 |
| **§2.7** | `public/review.html` | `@@ -3696 +3009 @@`<br>`@@ -3699 +3012 @@`<br>`@@ -3702 +3015 @@`<br>`@@ -3714,35 +3027,5 @@`<br>`@@ -3750,5 +3033,4 @@`<br>`@@ -3755,0 +3038,3 @@` | 试用到期弹窗只展示一句话“内测期间功能全开”，副标题提示公测期功能不限制，操作按钮为“我知道了，继续使用”，不锁功能 |
| **§2.7** | `public/review.html` | `@@ -4182,10 +3362,4 @@`<br>`@@ -4193,10 +3367,4 @@`<br>`@@ -4204,5 +3372,9 @@`<br>`@@ -4210,6 +3382,7 @@`<br>`@@ -4218,10 +3390,0 @@`<br>`@@ -4230,0 +3394,2 @@` | `openTrialExpiredModal` 响应式展示文案简化 |

---

## 四、自动化回归验证结果

### 1. TypeScript 静态类型编译检查
执行命令：
```bash
npx tsc --noEmit
```
**输出结果**：`0` 错误，耗时约 8.2s，静态编译 100% 洁净。

### 2. Jest 全自动化测试套件
执行命令：
```bash
npm test
```
**输出结果**：
```text
Test Suites: 19 passed, 19 total
Tests:       146 passed, 146 total
Snapshots:   0 total
Time:        28.895 s
Ran all test suites.
```
- **测试通过率**：**100%**（19/19 个测试套件通过，146/146 个测试用例通过）。
- **核心测试套件覆盖**：
  - `tests/excel-template-validation.test.ts`: **9/9 PASSED**
  - `tests/inquiry-service.test.ts`: **11/11 PASSED**
  - `tests/delete-endpoints.test.ts`: **12/12 PASSED**
  - `tests/e2e-workflow.test.ts`: **12/12 PASSED**
  - `tests/anti-ghost-quote.test.ts`: **4/4 PASSED**
  - `tests/tenant-idor-security.test.ts`: **8/8 PASSED**
  - 其余 13 个测试套件全部保持 100% 绿灯。

---

## 五、DELETED_FEATURES.md 同步记录

`DELETED_FEATURES.md` 已全面增补并同步归档至项目根目录与桌面报告目录：
1. **Entry 20 归档记录**：正式登记【Excel 底价表模板 10→1 收敛与历史模板归档 (变更/归档)】，标注源文件 MD5 `27c9b655693c26878b3680cc72b59b83`、归档文件列表及恢复方式。
2. **第四节先行任务专项对照表**：
   - 登记【询盘实体双写镜像彻底移除说明 (已定案)】，确立单向租户隔离物理存储为唯一数据源；
   - 完整登记 §2.4 附件提示、§2.6 模板收敛与 §2.7 试用展示简化的 Git Diff Chunks 校验对照。

---

## 六、代码冻结与下一步准备

按照 Kelvin 指示，目前状态确认为：
1. **先行四项任务完全交付关闭**；
2. **代码即刻进入 100% 冻结状态**；
3. **Step 4 原地待命**，等待 Kelvin 的 Stitch 视觉设计稿定稿后，再按照“新架构＋新视觉”一次到位施工。
