# KelvinFlow 外贸智能出单系统 MVP 瘦身改版执行计划书 (v10-MVP) [v2.4 修订版]

> **文档状态**：已根据 Kelvin 审查意见完成 3 处修正与 4 项提醒对齐  
> **编制依据**：`AI任务书_MVP瘦身改版_v10-MVP.md` (v2.3 终审版 + 2026-10-14 Kelvin 审查澄清)  
> **执行角色**：资深全栈工程师 / 修复 AI Agent  
> **工程基准**：GitHub `KelvinTsui820/kelvinflow-quote-engine` main 分支（当前 commit: `cc1d3c4`，基准 Tag: `pre-mvp-slim`）  
> **工作原则**：删除式瘦身直接删除物理代码（不使用 feature flag）、垂直切片清干净、每步汇报修改行号、保命备份先行、阶段二只出静态 HTML 稿。

---

## 一、改版背景与核心目标

当前 KelvinFlow 已出现功能严重发散（7 档付费 Plan、邀请返利裂变、企业 Logo 定制、5 条 n8n 工作流、10 个 Excel 模板等）。本次改版的核心目标是**消除一切干扰与臃肿代码，坚决将系统收敛到唯一真实生产链路**：

```
[海外买家邮箱询盘]
       ↓
[AI 级联解析 (Gemini 3.8 Flash)]
       ↓
[用户自持出厂底价表智能匹配与核价]
       ↓
[生成标准外贸报价单 (PDF/Web)]
       ↓
[IMAP 静默写入用户自身企业邮箱草稿箱]
       ↓
[业务员人工最终审阅并手动点击发送]
```

### 实施路线图（分两阶段推进）：
1. **阶段一（本计划主体）：删除式瘦身**
   - 彻底删除非 MVP 相关的前后端代码与路由；
   - 物理清理历史测试垃圾数据（必须先在磁盘空间充足的前提下，完成可解压验证的保命备份）；
   - 应用侧切换为简洁高效的 4 模块 CRM 式信息架构。
2. **阶段二：Wise 风 × Essor CRM 视觉重构**
   - 白底极简风格（应用学 Essor 的“骨”，官网学 Wise 的“皮”）；
   - **严格约定：阶段二启动时仅输出独立的静态 HTML Mock 设计稿，必须由 Kelvin 亲自审阅确认后，方可启动任何生产代码开发**。

---

## 二、全局高压线与纪律规范 (§1)

所有后续操作必须无条件遵守以下 8 条全局红线：

1. **Tag 锚点第一优先**：动工前先 `git status` 确认工作区完全干净，已打好并推送基准标签 `git tag pre-mvp-slim && git push origin pre-mvp-slim`。所有代码删除以此 tag 作为唯一回滚基准。
2. **测试底价库清理特批**：`TEST-001~004` 原受保护底价库数据，已获得 Kelvin 于 2026-10-14 14:07 明确批准，列入备份后物理删除清单。
3. **D-12 租户数据安全红线**：跨租户数据访问必须严格返回 `404 Not Found` 或 `403 Forbidden`；底层 `authMiddleware` 与 `requireRole` 中间件严禁弱化或删除。新增的任何只读接口（如询盘箱列表）必须同样挂载 `authMiddleware`。
4. **历史单据清理特批**：原 P33 规范保护的 `QT-451714`、`QT-808802`、`QT-771259` 真实单据，已获 Kelvin 于 2026-10-14 14:07 特殊批准列入备份后删除清单（日常测试保护原则不变）。
5. **核算算法绝对不变**：`底价 × (1 + 毛利率) × 汇率`、阶梯价 Tier1-3、汇率兜底 `7.2`、40HQ 配载标尺严格保持为 `68 CBM / 限重 26.0T`，分毫不差。
6. **核心 API 契约绝对冻结**：以下接口路径、请求体与返回结构禁止任何改动（动手改动代码时必须严格对齐真实路由名）：
   - 询盘与出单：`POST /api/inbound/email`、`POST /api/inbound/quick-quote`、`POST /api/v1/process-quote`、`GET/POST/DELETE /api/v1/quotes*`
   - 底价与状态：`POST /api/v1/update-pricing`、`GET /api/v1/pricing/status`、`GET/PUT /api/v1/tenant/profile`、`GET /api/v1/rates/latest`
   - 邮箱与认证真实路由：`POST /api/inbound/save-imap`、`POST /api/inbound/test-imap`、`POST /api/v1/auth/trial-register`、`POST /api/v1/auth/login`、`POST /api/v1/auth/forgot-password/send-code`、`POST /api/v1/auth/forgot-password/verify-code`、`POST /api/v1/auth/forgot-password/reset`。
7. **凭据安全保护**：严禁在日志、响应报文或报告中输出密码、OTP 验证码、JWT 或 IMAP 授权码等敏感机密。
8. **样式与核算完全解耦**：纯 UI/文案变动严禁夹带修改价格、毛利或装柜逻辑。

---

## 三、总体执行顺序大纲 (§7)

| 阶段 | 序号 | 步骤名称 | 核心操作目标 | 汇报节点 |
| :--- | :--- | :--- | :--- | :--- |
| **准备** | **Step 0** | **打基准 Git Tag** | `git status` 确认 clean，`git tag pre-mvp-slim` 并推送到远程作为回滚锚点（已完成） | ✅ 已推送 |
| **阶段一** | **Step 1** | **官网瘦身删除** | 清除定价区、支付弹窗、邀请分享、Plan C 迎新弹窗及后端路由 | ✅ 汇报改动文件与行号 |
| | **Step 2** | **工作台与审单瘦身** | 顶栏 11 入口收缩为 4 入口；仅删前端一键出单按钮，**保留 NotificationService 兜底发信**；types 做老数据兼容 | ✅ 汇报改动文件与行号 |
| | **Step 3** | **工作流精简与询盘落盘** | n8n 工作流 5 留 1；实现 `inquiries/INQ-*.json` 实体落盘；新增只读 API 走 `authMiddleware` 租户隔离 | ✅ 汇报改动文件与行号 |
| | **Step 4** | **应用 CRM 导航重构** | 呈现 4 大模块（询盘箱 / 报价单 / 底价库 / 设置）；登录跳转对接 | ✅ 汇报改动文件与行号 |
| | **Step 5** | **附件提示与模板适配** | 增加附件二期文案；收敛为 4-sheet 智能模板并完成真实上传与算价适配 | ✅ 汇报测试数据与改动行号 |
| | **Step 6** | **试用到期前端极简** | 前端弹窗精简为“内测期间功能全开”，不阻断功能；后端 API 契约保持不变 | ✅ 汇报改动文件与行号 |
| | **Step 7** | **保命备份与数据清理** | 生产确认 `~` 目录与 `df -h` 磁盘充足，`tar -czf` 备份并验证解压，再物理清理指定测试单据与底价 | ✅ 汇报备份路径与清理清单 |
| | **Step 8** | **阶段一全量验收交付** | 执行 A1~A10 完整自测套件，生成自测报告与 `DELETED_FEATURES.md` | ✅ 提交阶段一交付包 |
| **阶段二** | **Step 9** | **视觉重构设计稿确认** | 阶段二启动时输出官网首页及 4 模块独立的静态 HTML 设计稿（白底 + 单一科技蓝） | 🛑 **停下等待 Kelvin 确认** |

---

## 四、各步骤详细执行方案

### Step 0: 基准 Tag 锚定（已完成）
1. 在仓库根目录通过 `git status` 确认工作区完全干净。
2. 执行 `git tag pre-mvp-slim && git push origin pre-mvp-slim`。
3. 检查远程 tag 存在，已初始化根目录 [`DELETED_FEATURES.md`](file:///F:/order_workflow/DELETED_FEATURES.md)。

---

### Step 1: 官网瘦身删除 (§2.1 `public/index.html` & 后端路由)
1. **前端 `public/index.html` (3121 行) 垂直清理**：
   - 彻底删除 `#pricing` 版本定价区（含定价卡片、月/年切换按钮、`pricing-pay-btn`、`pricing-logged-in-box` 及对应的 JS 计算与渲染函数）；
   - 彻底删除 `#payment-modal` 支付转账弹窗及其所有打开/关闭/复制备注 JS；
   - 彻底删除 `#referral-share-modal` 邀请分享弹窗及其相关复制链接逻辑；
   - 删除顶部与移动端导航栏中的 `#nav-referral-btn` 邀请入口；
   - 删除注册弹窗内的 `#inbound-ref-box` 邀请码预填框，彻底删除 URL 中 `?ref=` 参数解析逻辑；
   - 彻底删除 `#plan-c-welcome-modal` 迎新弹窗及其挂载逻辑。
2. **后端路由与业务逻辑手术式剔除**：
   - [`src/routes/quote.router.ts`](file:///F:/order_workflow/src/routes/quote.router.ts)：删除 `GET /api/v1/auth/referral-info` 与 `POST /api/admin/upgrade-tenant` 整段逻辑；
   - [`src/routes/inbound.router.ts`](file:///F:/order_workflow/src/routes/inbound.router.ts)：删除 `POST /api/inbound/lead`（官网留资推送微信逻辑）；
   - [`src/services/trial.service.ts`](file:///F:/order_workflow/src/services/trial.service.ts)：仅剔除 referral 奖励（`referralCount`、`rewardDays`）和多档位 plan 计算，保留系统默认 `plan: 'trial'` 具备全功能；保留 `trial-register`、`login` (TRIAL_EXPIRED) 契约不变。
3. **审计与验收**：
   - 全局 grep `referral`、`payment-modal`、`pricing-pay-btn`，确认前端与后端上述范围 0 残留；
   - 登记 [`DELETED_FEATURES.md`](file:///F:/order_workflow/DELETED_FEATURES.md)；
   - 向 Kelvin 汇报修改文件与行号。

---

### Step 2: 工作台与审单区瘦身删除 (§2.2 & §2.3 `public/review.html` & 后端)
1. **工作台顶栏 11 入口收缩为 4 入口**：
   - 仅保留 MVP 必需操作：`新建询盘` (`#new-po-modal-overlay`)、`底价库` (`#pricing-modal-overlay`)、`自动出单` (`#imap-modal-overlay`)、`企业资料` (`#company-profile-modal-overlay`)；
   - 合并重复入口：清除账号区域旁多余的“设置企业资料”，全站只留 1 处入口；
   - 彻底删除企业 Logo 入口与 `#logo-modal-overlay` 弹窗；后端删除 [`src/routes/quote.router.ts`](file:///F:/order_workflow/src/routes/quote.router.ts) 中的 `POST /tenant/logo` 与 `DELETE /tenant/logo`；[`src/services/pdf.service.ts`](file:///F:/order_workflow/src/services/pdf.service.ts) 移除 logo 读取与图片渲染分支，PDF 抬头统一为纯文字公司名；
   - 删除全站所有“邀请同行”入口及弹窗 JS（原 360/380/400、3704–3857、4110–4120 行）；
   - 删除“个人版已开通会员状态条”，简化为极简静态文字“内测中”；
   - 多步新手引导弹窗改为首次登录可一键关闭的单张静态三步提示卡片。
2. **删除商品选型中心**：
   - 后端删除 `GET /api/v1/catalog`、`DELETE /api/v1/catalog/:sku`、`POST /api/v1/catalog/:sku/delete`；
   - 前端删除明细行内“选型中心重新选款”弹窗及相关 JS。
3. **审单区收敛为核心操作与【发信兜底保留澄清】**：
   - 保留：买家信息、明细表（SKU/品名/数量/底价/毛利率行内编辑、增删行）、条款区 5 块直接编辑、英文邮件草稿、PDF 下载 (`GET /api/v1/quotes/:id/pdf`)、底部“一键直达草稿箱”；
   - **【重要修正澄清·保留兜底链路】**：仅删除前端审单区界面的“一键出单”按钮（约 1431/1432、4794/4795 行）及其直接绑定的 JS 交互。**严正保留后端 `NotificationService` / `DraftService` 中“当 IMAP 写入用户草稿箱失败时的兜底待审邮件投递链路”**。若草稿箱写入失败，系统仍能将待审报价通知邮件稳妥投递至用户邮箱，绝不破坏后端安全兜底机制，杜绝询盘静默丢失风险！
   - 彻底删除行内“AI 匹配证据链”弹窗；
   - 彻底删除“全屏沉浸式编辑”；
   - 彻底删除“AI 凑柜建议追加邮件”按钮；
   - 彻底删除汇率“安全垫分析”弹窗（保留 `GET /api/v1/rates/latest` 牌价展示与手动编辑）；
   - 40HQ 集装箱配载测算默认收起折叠，只展示单行核心摘要（总额 / 总体积 CBM / 预估柜量）。
4. **【重要修正·types 兼容方案】**：
   - 针对 [`src/types/index.ts`](file:///F:/order_workflow/src/types/index.ts) 中的 `TenantProfile` 接口进行瘦身：将 MVP 不再使用的字段（如 `logoUrl`、`logoPath`、`hideCostFromSales`、`apiKeys` 等）标记为可选 `?` 并保留缺省兼容，**确保现存老 `profile.json` 缺少老字段时依然能被平稳解析，绝对不引发服务崩溃**。
5. **审计与验收**：
   - 全局 grep `catalog`、`openEvidenceModal`、`openSafetyBufferModal`，确认 0 残留；
   - 登记 [`DELETED_FEATURES.md`](file:///F:/order_workflow/DELETED_FEATURES.md)；
   - 向 Kelvin 汇报修改文件与行号。

---

### Step 3: 工作流精简与询盘一等实体落盘 (§2.5)
1. **n8n 工作流精简**：
   - 在 `workflows/` 目录中，仅保留 1 个 Gmail 入站工作流 JSON；
   - 其余 4 个工作流移入 `workflows/archive/`，记录在 [`DELETED_FEATURES.md`](file:///F:/order_workflow/DELETED_FEATURES.md)。
2. **实现轻量“询盘箱”实体落盘**：
   - 检查 [`src/services/inbound-processor.service.ts`](file:///F:/order_workflow/src/services/inbound-processor.service.ts) 中的 `processInboundInquiry`；
   - 在不影响现有报价生成与邮件处理流程的前提下，增加询盘持久化逻辑：
     - 落盘路径：`data/tenants/<tenantId>/inquiries/INQ-<timestamp>.json`；
     - 记录字段：`inquiryId` (如 `INQ-20261014-xxxx`)、`receivedAt`、`from`、`subject`、`rawTextHash`、`parseStatus` (`parsed` / `pending`)、`quotationNumber`、`inquiryMessageId`；
3. **【提醒落实·租户隔离 D-12】**：
   - 新增的询盘读取与列表 API（如 `GET /api/v1/inquiries`）必须严格挂载 `authMiddleware` 中间件，仅允许获取当前已登录租户的询盘数据，且该接口为纯只读服务（只读不写），绝无 IDOR 越权漏洞。
4. **审计与验收**：
   - 向 Kelvin 汇报修改文件与行号。

---

### Step 4: 应用侧 CRM 式信息架构重构 (§3)
1. **工作台页面重构为 4 大核心模块**：
   - 彻底摆脱原有 11 个散乱入口与层叠弹窗的设计；
   - 建立 4 大清晰功能视图：
     - **① 询盘箱**：读取 `inquiries/` 实体列表（显示发件人、到达时间、解析状态、关联报价单号）；支持点击查看 AI 提取文本与意图，提供“生成报价单”主 CTA（复用 `process-quote` 链路）；
     - **② 报价单**：整合历史列表 (`GET /api/v1/quotes`) 与瘦身后的审单工作台；
     - **③ 底价库**：整合出厂底价表上传与商品列表管理；
     - **④ 设置**：整合企业资料 (`GET/PUT /api/v1/tenant/profile`)、IMAP 授权码配置 (`POST /api/inbound/save-imap`) 以及自定义汇率。
2. **多端与双站联动规范**：
   - 官网 (`kelvinflow.com`) 保持纯营销定位，登录成功后直接路由跳转至应用 (`quote.kelvinflow.com`)。
3. **审计与验收**：
   - 汇报修改文件与行号。

---

### Step 5: 附件解析文案与 4-sheet 智能底价表模板适配 (§2.4 & §2.6)
1. **附件文案明确二期 (§2.4)**：
   - [`src/services/attachment-extractor.service.ts`](file:///F:/order_workflow/src/services/attachment-extractor.service.ts) 占位逻辑保持原样；
   - 在 `#new-po-modal-overlay` 建单弹窗显式标注提示文案：“请粘贴邮件正文（附件解析为二期功能，当前仅解析正文）”。
2. **模板唯一化收敛 (§2.6)**：
   - 唯一官方底价表模板：采用 Kelvin 本地指定的 [`商品底价表/外贸出厂底价表与智能核价模板.xlsx`](file:///F:/order_workflow/商品底价表/外贸出厂底价表与智能核价模板.xlsx)（4-sheet 智能模板：使用指南 / ⚙️ 全局核算参数 / 📦 商品出厂底价库 17 列 / 📄 对外纯净批量报价单）；
   - 将其复制并命名为 `public/templates/kelvinflow-pricing-template.xlsx`；
   - 其余旧模板移入 `public/templates/archive/`；
   - 确保 `GET /api/v1/template/pricing-sheet` 与官网、工作台底价库所有下载按钮全部统一指向该模板。
3. **模板上传与核价严格适配实测（核心必测）**：
   - 实际调用 `POST /api/v1/update-pricing` 上传该 4-sheet 模板；
   - **验证 5 大关键点**：
     1. `Products` sheet 被正确识别为主商品底价库，有效商品数完全匹配；
     2. 17 列字段（SKU、常用别名、英文品名规格、出厂底价、MOQ、单箱装量、CBM、毛重、专属毛利率、交期、HS Code）映射精确无误；
     3. L–Q 公式列（港杂平摊、生效毛利率、FOB 核算单价、装量计算等）仅作为只读结果，绝不被误读为用户输入项；
     4. `Config` sheet 中的币种、汇率与基础保底毛利率被完整正确读取；
     5. `对外纯净批量报价单 (脱敏单)` 绝不被误判为商品库；若有关键词识别偏差，仅优化 [`src/adapters/excel.adapter.ts`](file:///F:/order_workflow/src/adapters/excel.adapter.ts) 的 sheet 名称嗅探过滤规则，**严禁修改底层核算公式**。
   - 验证 `GET /api/v1/pricing/status` 与 `quick-quote` 建单全链路计算准确度。
4. **审计与验收**：
   - 汇报模板实测数据与相关适配代码行号。

---

### Step 6: 试用到期前端展示极简收敛 (§2.7)
1. 前端试用到期弹窗移除复杂的 30 天保留锁定期、延期申请等冗余分支，仅保留极简温和提示：“内测期间功能全开”，不阻断核心操作。
2. 严守安全红线：后端 `trial-register`、`login` (TRIAL_EXPIRED)、`trial-status` 的契约与状态完全不变（到期用户登录仍正确返回 `expired: true` 与 `code: TRIAL_EXPIRED`）。
3. **审计与验收**：
   - 汇报修改文件与行号。

---

### Step 7: 数据保命备份与测试数据物理清理 (§2.8 & §1.2/1.4)
> **保命动作前置警告**：`data/` 目录已被 `.gitignore` 排除，Git Tag 无法保护数据，必须先完成独立压缩归档与解压验证后，方可动手清理数据！

1. **【提醒落实·主机环境与磁盘检查】**：
   - 确认当前终端执行环境与备份目标目录，确保 `~` 是部署用户的主目录（非系统敏感根路径）；
   - 执行 `df -h` 检查并确认当前分区剩余磁盘空间充足（避免备份过程中磁盘写满打挂进程）。
2. **执行保命备份**：
   - 执行打包压缩：
     ```bash
     tar -czf ~/data-backup-pre-mvp-slim-2026-10-14.tar.gz -C /path/to/project data/
     ```
   - 执行完整性验证：
     ```bash
     tar -ztvf ~/data-backup-pre-mvp-slim-2026-10-14.tar.gz | head -n 30
     ```
   - 确认压缩包大小与目录结构完好无损。
3. **执行经 Kelvin 批准的物理删除清单**：
   - 清理所有测试报价单 JSON 与 PDF：`data/tenants/*/quotes/QT-*.json`、`QT-*.pdf`（以及根目录 `data/quotes/` 遗留目录）；
   - **特批放行清理**：包含原 P33 受保护的 `QT-451714`、`QT-808802`、`QT-771259`；
   - 清理测试底价表：`data/tenants/*/active_pricing.xlsx` 及 `backups/`、`pricing_sheets/` 临时测试文件；包含原 `TEST-001~004` 底价测试数据；
   - 清理测试租户目录：`data/tenants/tenant_test*`、`tenant_n8n_test`、`tenant_p32_*`、`tenant_delete_*`、`tenant_exp_*` 等；
   - **绝对保留名单**：保留两个核心测试账号 `tsuikelvin82099@gmail.com` 与 `kelvintsui0804@gmail.com` 的基础数据，确保清理后仍可顺畅登录。
4. **审计与验收**：
   - 汇报备份归档包路径、字节大小、可解压验证输出及清理完成的条目清单。

---

### Step 8: 阶段一全面自测与交付 (§4 A1~A10)
对照任务书 §4 验收标准逐项进行断言验收：

| 验收编号 | 检验项目 | 严格检验标准 | 验证手段 |
| :--- | :--- | :--- | :--- |
| **A1** | **官网精简** | 无定价区、无支付弹窗、无邀请入口；`?ref=` 0 残留；注册/登录/重置密码正常可用 | DOM 审查 + 路由测试 |
| **A2** | **工作台导航** | 4 大核心模块（询盘箱/报价单/底价库/设置）；无 Logo 与邀请；企业资料入口唯一 | UI 审查 |
| **A3** | **审单区收敛** | 仅保留改价/预览/下载 PDF/写入草稿箱；彻底无一键出单与无关弹窗；发信兜底链路完好 | DOM 审查 + 兜底断言 |
| **A4** | **核心链路全闭环** | `POST /api/inbound/quick-quote` 建单 → 审单改价 → 写入草稿箱全程畅通；`test-imap` 通过 | 给出回归单号与草稿箱日志 |
| **A5** | **删除可审计** | `git tag pre-mvp-slim` 存在；[`DELETED_FEATURES.md`](file:///F:/order_workflow/DELETED_FEATURES.md) 详细记录；grep 关键废弃词全库 0 残留 | Git 检查 + grep 脚本 |
| **A6** | **D-12 租户安全** | 跨租户访问接口（含新增询盘列表）严格返回 404/403；`authMiddleware` 与 `requireRole` 完好 | 接口越权测试 |
| **A7** | **价格核算精度** | 同一询盘改前改后报价总额分毫不差；兜底汇率 7.2；40HQ 标尺严格为 68 CBM / 26.0T | 算价对比测试 |
| **A8/A9**| **数据清理与恢复**| 备份 tarball 完备且可解压；清理清单彻底清零；两测试账号正常登录 | 登录与存储检查 |
| **A10**| **询盘箱实体** | 新询盘成功落盘 `inquiries/INQ-*.json`；列表可查询解析状态与关联单号 | 文件与 API 检查 |

完成自测后，提交阶段一总结汇报与阶段一交付物。

---

## 五、阶段二：视觉重构设计规范与红线约束 (§5)

> 🛑 **红线承诺**：在阶段一全量交付并获得 Kelvin 明确批准前，**阶段二绝对不编写任何生产代码**。

启动阶段二时，执行规范如下：
1. **设计哲学（双参照）**：
   - **应用侧学 Essor CRM 的“骨”**：浅灰极简底色 (`#F5F5F7`)、固定 224px 浅灰侧边栏 (`#EFEFF2`)、单屏只讲一件事、白底卡片 (`1px solid #E5E5EA`，大圆角 16–20px，几乎不用多余阴影)、胶囊型 CTA (高 48px)；
   - **官网学 Wise 的“皮”**：大圆角留白、信任点前置、药丸 CTA，**坚决不学 Wise 的深绿配色**。
2. **主题色锁定方案（白底 + 单一科技蓝）**：
   - **全站唯一主题色**：科技蓝 `#1D4ED8`（待 Kelvin 最终拍板锁定）；
   - **配色纯净**：全站仅使用白底 + 单一主题蓝，辅助以功能语义色（成功 `#0E7C3A`、危险 `#CB272F`、警告 `#B7791F`），彻底剔除深海蓝金色光晕、玻璃拟态与多色渐变；
   - **Logo 风格**：单色 `#1D4ED8`，极简几何图形（K 字母 / 报价单 / 闪电三选一），无渐变，确保外贸单据黑白打印清晰可读。
3. **交付物要求（阶段二启动时交付）**：
   - 制作 5 张独立的静态 HTML 设计稿原型：
     1. 官网首页 Mock (`mock_homepage.html`)
     2. 应用-询盘箱 Mock (`mock_inquiries.html`)
     3. 应用-报价单 Mock (`mock_quotes.html`)
     4. 应用-底价库 Mock (`mock_pricing.html`)
     5. 应用-设置中心 Mock (`mock_settings.html`)
   - 交付静态原型供 Kelvin 交互预览与审美把关，确认定稿后再启动开发。

---

## 六、阶段一交付物清单 (§6)

阶段一完成时交付以下全部成果（不混入阶段二内容）：
1. **核心代码重构变更**（含工作流清理、询盘箱实体落盘、CRM 架构搭建）；
2. **根目录 [`DELETED_FEATURES.md`](file:///F:/order_workflow/DELETED_FEATURES.md)**（详细记载删除项、原因及基于 `pre-mvp-slim` tag 的恢复指令）；
3. **改动文件清单**（包含每个受影响文件的精确路径与行号明细）；
4. **数据备份 tarball 路径**与测试数据清理明细记录；
5. **阶段一自测报告**（涵盖 A1~A10 逐项断言结果及 A4 实际回归单号）。

*(注：阶段二静态 HTML 设计稿明确在阶段二启动时交付，经 Kelvin 确认后方可开发。)*
