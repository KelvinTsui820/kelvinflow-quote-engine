# KelvinFlow MVP 瘦身改版功能删除日志 (DELETED_FEATURES.md)

> **基准 Tag**：`pre-mvp-slim` (commit: `cc1d3c4`)  
> **改版依据**：`AI任务书_MVP瘦身改版_v10-MVP.md` (v2.3)  
> **核心原则**：垂直切片删除，0 残留。任何被删除功能均可使用 `git show pre-mvp-slim:<文件相对路径>` 随时完整恢复。

---

## 一、删除与变更记录总表 (00 – 20)

| 序号 | 删除模块 / 功能点 | 影响文件清单 | 删除原因 | 恢复方式 |
| :--- | :--- | :--- | :--- | :--- |
| **00** | **初始化基准快照** | - | 建立删除跟踪日志，打上基准 Git Tag `pre-mvp-slim` | `git checkout pre-mvp-slim` |
| **01** | **根目录过期文档与测试残留清理** | `D10_INVESTIGATION_REPORT.md`<br>`D12_INVESTIGATION_REPORT.md`<br>`MUSE_14_DELETION_FEATURES_AND_DATA_CLEANUP_REPORT.md`<br>`MUSE_AI_WEB_AND_WORKBENCH_DEEP_TEST_SUITE.md`<br>`PROJECT_CONTEXT_HANDOFF.md`<br>`WEB_PRODUCTION_BLACKBOX_TEST_GUIDE_V8.md`<br>根目录 33 个测试截图/切片 (`*.png`)<br>根目录 6 个测试报价单 (`*.pdf`)<br>`public/` 与 `scratch/` 历史测试残留 | 历史排错与测试遗留物，已由 V9/V10 规格及后续标准流程取代，保持工作区干净纯粹 | `git checkout pre-mvp-slim -- <path>` |
| **02** | **官网定价区及支付转账弹窗** | `public/index.html` (删除 `#pricing` 区域、`#payment-modal` 弹窗及 `switchBillingCycle`、`renderPaymentModalData`、`switchPaymentModalCycle`、`openPaymentModal`、`closePaymentModal`、`copyPaymentNote`) | MVP 专注个人免费试用验证，剥离付费与转账逻辑 | `git checkout pre-mvp-slim -- public/index.html` |
| **03** | **官网同行邀请与推荐返利功能** | `public/index.html` (删除 `#referral-share-modal` 弹窗、`#inbound-ref-box` 输入框、`#nav-referral-btn` 入口、`?ref=` 参数捕获、相关复制函数)<br>`src/routes/quote.router.ts` (删除 `GET /api/v1/auth/referral-info`)<br>`src/services/trial.service.ts` (删除 `referralCount` / `rewardDays` 邀请奖励逻辑及 `getReferralInfo` 方法) | 简化入站注册闭环，聚焦核心出单转化，去除病毒式邀请与裂变返利机制 | `git checkout pre-mvp-slim -- public/index.html src/routes/quote.router.ts src/services/trial.service.ts` |
| **04** | **官网企业版与团队版咨询钩子** | `public/index.html` (删除 `openEnterpriseModal`、`openWaitlistModal` 咨询拦截函数) | MVP 仅服务个人版外贸员/SOHO，暂不上线团队多席位 | `git checkout pre-mvp-slim -- public/index.html` |
| **05** | **官网留资推送微信路由** | `src/routes/inbound.router.ts` (删除 `POST /api/inbound/lead` 及 `ipRequestHistory`、`checkRateLimit`、`pushToWeChat`、`saveLeadLocally` 辅助函数) | 留资功能已被基于邮箱验证码的自助试用注册全面取代，无调用方 | `git checkout pre-mvp-slim -- src/routes/inbound.router.ts` |
| **06** | **管理员租户升级接口** | `src/routes/quote.router.ts` (删除 `POST /api/admin/upgrade-tenant`) | 试用期与支付已简化，废弃旧版内部手动升级接口 | `git checkout pre-mvp-slim -- src/routes/quote.router.ts` |
| **07** | **Plan C 迎新弹窗及二次跳转** | `public/index.html` (删除 `#plan-c-welcome-modal` 及其控制函数，试用开通成功后直接跳转工作台) | 去除额外中转弹窗干扰，实现一键直达审单台 | `git checkout pre-mvp-slim -- public/index.html` |
| **08** | **工作台顶栏 11 入口收敛为 4 入口** | `public/review.html` (删除顶部三大营销条幅：7天试用条幅、付费会员条幅、试用到期条幅；删除顶栏同行邀请入口 `openReferralShareModal`、会员升级入口 `openUpgradeModal`、账号区重复的企业资料按钮；版本标识从动态会员类型统一收敛为静态纯文字「内测中」；顶栏主操作入口严格收敛为任务书 §2.2 规定的 4 个标准入口：**【新建询盘】【底价库】【自动出单】【企业资料】**，未新增任何非标入口)<br>对应 chunks：`@@ -261 +261 @@`, `@@ -267,11 +267,2 @@`, `@@ -292,2 +277,2 @@`, `@@ -296,2 +281,2 @@`, `@@ -299,9 +284 @@`, `@@ -310,6 +287,5 @@`, `@@ -318,5 +294,5 @@`, `@@ -325 +301 @@`, `@@ -332,3 +307,0 @@`, `@@ -348,62 +320,0 @@`, `@@ -4074,107 +3381,2 @@`, `@@ -6709,96 +5552,0 @@`, `@@ -6806,17 +5553,0 @@` | 净化审单台视觉动线，消除无效营销条幅与重复操作入口，聚焦核心出单链路 | `git checkout pre-mvp-slim -- public/review.html` |
| **09** | **企业 Logo 功能** | `public/review.html` (删除顶栏 Logo 按钮、`logoModal` 弹窗、`logoResetConfirmModal` 确认弹窗及 `openLogoModal`, `uploadLogo`, `resetLogo`, `setNoLogo` 等 Vue 状态与方法)<br>`src/routes/quote.router.ts` (删除 `POST /tenant/logo` 与 `DELETE /tenant/logo` 路由接口)<br>`src/services/pdf.service.ts` (移除 PDFKit 渲染中 `customLogoPath` 读取与 `doc.image(customLogoPath...)` 渲染分支，统一改为高质感纯文字英文抬头排版)<br>`src/types/index.ts` (保留 `TenantProfile` 中 `logoUrl?`, `logoPath?`, `noLogo?` 为可选字段以兼容老数据)<br>对应 chunks：`quote.router.ts` `@@ -700,52 +597,0 @@`; `pdf.service.ts` `@@ -209 +209 @@`, `@@ -211,2 +210,0 @@`, `@@ -229,14 +227 @@`, `@@ -338 +323 @@`; `review.html` `@@ -299,9 +284 @@`, `@@ -4074,107 +3381,2 @@`, `@@ -4509 +3695 @@`, `@@ -4511 +3696,0 @@`, `@@ -4514,117 +3698,0 @@`, `@@ -6899 +5629,0 @@` | 消除不同比例图片导致 PDF 排版变形的隐患，统一纯文字商务抬头；精简多余上传逻辑 | `git checkout pre-mvp-slim -- public/review.html src/routes/quote.router.ts src/services/pdf.service.ts` |
| **10** | **选型中心 catalog** | `public/review.html` (删除明细表表头/行内选型入口按钮、`catalogModal` 大弹窗、`deleteCatalogModal` 确认弹窗及 `catalogModalVisible`, `catalogItems`, `openCatalogModal`, `handleCatalogDelete`, `confirmCatalogDelete` 等)<br>`src/routes/quote.router.ts` (物理删除 `GET /api/v1/catalog`、`DELETE /api/v1/catalog/:sku`、`POST /api/v1/catalog/:sku/delete` 及 `handleCatalogDelete` 辅助函数)<br>`tests/delete-endpoints.test.ts` (增加回归断言，确保选型与删除路由返回 404)<br>对应 chunks：`quote.router.ts` `@@ -1390,94 +1235,0 @@`; `review.html` `@@ -862,6 +784,0 @@`, `@@ -1008 +922 @@` ~ `@@ -1036,7 +949,0 @@`, `@@ -1883,20 +1663,0 @@`, `@@ -1904,115 +1664,0 @@` (catalogModal 大弹窗 135 行), `@@ -3188,144 +2655,0 @@` (前 40 行: deleteCatalogModal 确认弹窗), `@@ -5346,15 +4222,0 @@`, `@@ -5362,7 +4223,0 @@`, `@@ -7051,17 +5780,0 @@`, `@@ -7246,16 +5958,0 @@`, `@@ -7263,27 +5959,0 @@`, `@@ -7601,5 +6271 @@`, `@@ -7679,46 +6344,0 @@`; `tests` `@@ -224 +224 @@`, `@@ -226,94 +226,2 @@`, `@@ -325 +233 @@` 等 (接口下线 404 回归断言) |
| **11** | **一键出单按钮及其直接 JS** | `public/review.html` (删除底部固定栏【一键出单 (直接写入发件箱)】大按钮 `#btn-instant-issue` 及直接触发的 Vue 函数 `instantIssueOrder`；底部强化分流为【下载 PDF】与【一键直达邮箱草稿箱】)<br>对应 chunks：`review.html` `@@ -1427,6 +1331,5 @@` (删除一键出单大按钮并替换为下载 PDF), `@@ -1435,3 +1338,3 @@` (直达草稿箱向全员放开), `@@ -6709,96 +5552,0 @@` (相关 Vue 逻辑)<br>**重要保留声明**：`src/services/draft.service.ts` 与 `src/services/notification.service.ts` 中的 IMAP 写入失败自动兜底待审邮件通知链路（`sendDraftFailureNotification`）**100% 完整保留、未做任何删减**，草稿写入异常时绝不静默丢失 | 消除“一键出单”与“直达草稿箱”在业务动线上的概念混淆与误导，回归外贸员核对后二次发送的真实习惯；同时确保异常发信兜底链路绝对安全 | `git checkout pre-mvp-slim -- public/review.html` |
| **12** | **AI 匹配证据链弹窗入口** | `public/review.html` (删除正常精准对齐品项行内的 `<button @click="openWarningModal(item, idx)" title="点击查看 AI 匹配证据链与官方规格">` 入口按钮，替换为不可点击的静态指示 Badge `<span class="inline-flex ... select-none">已精准对齐</span>`；对应 chunk `@@ -1000,6 +917,3 @@`。该弹窗即原“已匹配品名的点击展开交互”，仅用于展示证据链得分，底层诊断弹窗 `warningModal` 针对真实异常 warning 项依然保留。本方案已获 Kelvin 批准确认) | 正常对齐商品无需弹出置信度算法细节打断用户，降低交互打扰与误触几率 | `git checkout pre-mvp-slim -- public/review.html` |
| **13** | **全屏沉浸式编辑** | `public/review.html` (删除邮件全屏编辑弹窗 `#email-fullscreen-modal`、新建询盘弹窗内的全屏查看按钮，以及 `openEmailFullscreen`, `closeEmailFullscreen`, `openInquiryFullscreen`, `closeInquiryFullscreen`, `emailFullscreenVisible`, `inquiryFullscreenVisible` 等 Vue 状态与方法)<br>对应 chunks：`review.html` `@@ -1344 +1251 @@`, `@@ -1347,3 +1253,0 @@`, `@@ -1446,122 +1348,0 @@` (#email-fullscreen-modal 弹窗共 122 行), `@@ -2333,3 +1803,0 @@` (新建询盘弹窗全屏按钮), `@@ -6147,3 +4993 @@`, `@@ -7679,46 +6344,0 @@` | 原位双栏具备充足空间与弹性高度，全屏弹窗嵌套繁琐、增加跨组件同步状态复杂度 | `git checkout pre-mvp-slim -- public/review.html` |
| **14** | **汇率安全垫诊断弹窗** | `public/review.html` (删除汇率安全垫深度诊断弹窗 `rateDiagnosticModal` 及触发按钮，删除 `rateDiagnosticModalVisible`, `openRateDiagnosticModal`, `closeRateDiagnosticModal` 等；保留实时牌价获取、刷新与一键采纳能力)<br>对应 chunks：`review.html` `@@ -586,4 +538,2 @@` (汇率卡片删除诊断入口按钮), `@@ -3188,144 +2655,0 @@` (后 104 行: 彻底删除外贸汇率深度诊断分析弹窗 rateDiagnosticModal), `@@ -3333,17 +2656,0 @@` (尾部闭合标签清理), `@@ -4372 +3558,0 @@`, `@@ -8050 +6649,0 @@` | 汇率核心为实时牌价与安全垫加点，冗余图表诊断浮层属于低频无用功能，清理后层级更清晰 | `git checkout pre-mvp-slim -- public/review.html` |
| **15** | **AI 凑柜建议追加邮件按钮** | `public/review.html` (删除 40HQ 柜型卡片内的【AI 凑柜建议追加邮件】快捷操作按钮，删除 Vue 方法 `insertLogisticsAdviceToEmail`)<br>对应 chunks：`review.html` `@@ -667,5 +615,0 @@`, `@@ -6030,11 +4885,2 @@` | 自动向邮件正文尾部拼接大段固化物流提示易破坏外贸员个性化沟通风格，且多数字段已由指定货代接管，实用价值低且易误触污染邮件 | `git checkout pre-mvp-slim -- public/review.html` |
| **16** | **新手 tour 聚光灯引导** | `public/review.html` (删除基于全屏 SVG 镂空遮罩的 `#tour-spotlight-overlay`、气泡提示卡片，以及 `tourActive`, `tourStep`, `startTour`, `nextTourStep`, `prevTourStep`, `finishTour`, `skipTour`, `updateSpotlightPosition` 等 196 行复杂 DOM 计算逻辑；替换为右上角静态、非侵入式、可手动关闭并记住的 3 步新手引导卡片 `showOnboardingCard`)<br>对应 chunks：`review.html` `@@ -412,0 +324,41 @@` (轻量静态新手引导卡片), `@@ -2055,53 +1700,0 @@` (SVG 镂空遮罩蒙版 53 行), `@@ -2109,122 +1701,0 @@` (伴随式浮动气泡引导卡 122 行，两块合计 175 行), `@@ -4757,196 +3825,5 @@` (Vue setup 彻底删除整套 Tour 聚光灯引导逻辑共 196 行)<br>`@@ -8037,7 +6643,0 @@` (移除 onMounted 延时 800ms 自动触发 startTour)<br>`@@ -8106,11 +6696,0 @@`, `@@ -8254,8 +6828,0 @@` (清理 Tour 响应式方法导出与联动) |
| **17** | **40HQ 配载卡片默认折叠 (变更)** | `public/review.html` (将 40HQ 柜型装载卡片由全铺开重构为默认折叠单行摘要，新增响应式状态 `containerCollapsed: true`，支持点击单行摘要或右侧箭头平滑展开/收起完整箱规算柜细节；计算逻辑 100% 保持可用)<br>对应 chunks：`review.html` `@@ -591,2 +541 @@`, `@@ -810 +754 @@` ~ `@@ -844,17 +777,7 @@`, `@@ -4074,107 +3381,2 @@`, `@@ -6030,11 +4885,2 @@`, `@@ -7958 +6573,0 @@`<br>**变更性质标注**：**【变更/重构】**，非物理删除 | 装柜率属于辅助参考项，默认全量展开挤占关键核价区首屏空间；折叠收敛后显著提升审单首屏屏效 | `git checkout pre-mvp-slim -- public/review.html` |
| **18** | **TenantProfile 字段可选化 (兼容性变更)** | `src/types/index.ts` (将 `TenantProfile` 接口中的 `hideCostFromSales: boolean` 调整为 `hideCostFromSales?: boolean` 可选属性；同时保留 `logoUrl?: string`, `logoPath?: string`, `noLogo?: boolean` 作为可选属性存在)<br>对应 chunk：`src/types/index.ts` `@@ -236 +237 @@`<br>**变更性质标注**：**【兼容性变更】**，不动数据实体，仅可选化类型 | 满足任务书 §2.0 第 4 条核心红线：保证老版本或新版本租户 `profile.json` 在缺少字段或包含废弃 Logo 属性时平滑解析兼容，绝不因缺少字段或严格类型校验导致运行时解析崩溃 | `git checkout pre-mvp-slim -- src/types/index.ts` |
| **19** | **n8n 冗余工作流精简与归档 (变更/归档)** | `workflows/archive/` (归档 4 个非核心/实验性工作流：`KelvinFlow_AI全能邮件报价中枢_SaaS多租户单一工作流_v8.0.json`, `n8n-outlook-quote-draft.json`, `n8n-scheme2-draft-injection.json`, `n8n-universal-all-in-one-quote-workflow.json`；`workflows/` 根目录仅保留 1 个官方标准出单工作流：`workflows/n8n-gmail-quote-draft.json`)<br>对应 git status rename 记录与 `git diff --stat pre-mvp-slim` | MVP 专注收敛至最简可用路径，统一通过标准 Gmail/IMAP 转发驱动，精简多套混杂的工作流模版，降低维护心智负担与运维复杂度 | 可从 `workflows/archive/` 移回或执行 `git checkout pre-mvp-slim -- workflows/` |
| **20** | **Excel 底价表模板 10→1 收敛与历史模板归档 (变更/归档)** | `public/templates/` (根目录唯一保留官方模板 `kelvinflow-pricing-template.xlsx`，源自仓库内《商品底价表/外贸出厂底价表与智能核价模板.xlsx》，MD5: `27c9b655693c26878b3680cc72b59b83`；保留 `sample_po.pdf` 与 `海外买家采购单样例_PO.pdf`)<br>`public/templates/archive/` (安全归档 9 个历史混杂模板文件)<br>`src/routes/quote.router.ts` (`GET /api/v1/template/pricing-sheet` 指向 `kelvinflow-pricing-template.xlsx`)<br>`src/adapters/excel.adapter.ts` (排除包含“脱敏”/“对外”的纯净报价单 sheet 防止误判为商品库)<br>`tests/excel-template-validation.test.ts` (新增 9 项端到端适配与核算自动化测试)<br>**变更性质标注**：**【变更/归档】**，仅保留 1 套官方模板，历史模板安全归档 | 任务书 §2.6 规定，模板从多套混杂收敛为 1 套官方标准模板，降低用户认知成本与模板维护复杂度 | 可从 `public/templates/archive/` 移回或执行 `git checkout pre-mvp-slim -- public/templates/` |

---

## 二、Step 2 删除与变更 Git Diff Chunks 校验对照表

为保证与 `STEP_2_COMPLETION_REPORT.md` 及 `git diff -U0 pre-mvp-slim` 严格 1-to-1 完全一致，下表汇总 Step 2 全部条目（08 – 18）与真实 Git Diff Chunk 标头的完整映射关系：

| 序号 | 条目名称 | 涉及文件 | 真实 Git Diff Chunk 标头及对应说明 |
| :--- | :--- | :--- | :--- |
| **08** | 工作台顶栏收敛与三大营销条幅删除 | `public/review.html` | `@@ -261 +261 @@` (版本标收敛为静态「内测中」)<br>`@@ -267,11 +267,2 @@` (移除多余企业资料按钮)<br>`@@ -292,2 +277,2 @@`, `@@ -296,2 +281,2 @@` (移除按钮 tour 属性)<br>`@@ -299,9 +284 @@` (顶栏 4 按钮收敛：【新建询盘】【底价库】【自动出单】【企业资料】)<br>`@@ -310,6 +287,5 @@`, `@@ -318,5 +294,5 @@`, `@@ -325 +301 @@`, `@@ -332,3 +307,0 @@` (顶栏小屏响应式清理与冗余按钮移除)<br>`@@ -348,62 +320,0 @@` (彻底删除顶部三大营销条幅共 62 行)<br>`@@ -4074,107 +3381,2 @@` (含同行邀请分享弹窗 referralModal 清理)<br>`@@ -6709,96 +5552,0 @@`, `@@ -6806,17 +5553,0 @@` (Vue setup 裂变推荐逻辑清理) |
| **09** | 企业 Logo 功能彻底剥离 | `src/routes/quote.router.ts`<br>`src/services/pdf.service.ts`<br>`public/review.html` | `quote.router.ts`: `@@ -700,52 +598,0 @@` (彻底删除 POST/DELETE /tenant/logo 路由共 52 行)<br>`pdf.service.ts`: `@@ -209 +209 @@`, `@@ -211,2 +210,0 @@`, `@@ -229,14 +227 @@`, `@@ -338 +323 @@` (PDF 渲染去除图片绘制，改纯文本公司大标题)<br>`review.html`: `@@ -299,9 +284 @@` (顶栏移除 Logo 按钮)<br>`review.html`: `@@ -4074,107 +3381,2 @@` (含 logoModal 弹窗清理)<br>`review.html`: `@@ -4509 +3695 @@`, `@@ -4511 +3696,0 @@`, `@@ -4514,117 +3698,0 @@` (Vue setup 彻底删除 Logo 相关状态与方法共 118 行)<br>`review.html`: `@@ -6899 +5629,0 @@` (Vue setup 移除 tenant.logoUrl 赋值) |
| **10** | 选型中心 catalog 彻底删除 | `src/routes/quote.router.ts`<br>`public/review.html`<br>`tests/delete-endpoints.test.ts` | `quote.router.ts`: `@@ -1390,94 +1272,0 @@` (彻底删除 GET /catalog, DELETE /catalog/:sku 及 handleCatalogDelete 共 94 行)<br>`review.html`: `@@ -862,6 +784,0 @@`, `@@ -1008 +922 @@` ~ `@@ -1036,7 +949,0 @@` (明细表删除行内选型按钮)<br>`review.html`: `@@ -1883,20 +1663,0 @@`, `@@ -1904,115 +1664,0 @@` (彻底删除选型中心大弹窗 catalogModal，原 1883~2018 行，共 135 行)<br>`review.html`: `@@ -3188,144 +2655,0 @@` (前 40 行: 出厂底价库条目删除确认弹窗 deleteCatalogModal)<br>`review.html`: `@@ -5346,15 +4222,0 @@`, `@@ -5362,7 +4223,0 @@`, `@@ -7051,17 +5780,0 @@`, `@@ -7246,16 +5958,0 @@`, `@@ -7263,27 +5959,0 @@`, `@@ -7601,5 +6271 @@`, `@@ -7679,46 +6344,0 @@` (Vue setup catalog 相关状态与方法清理)<br>`tests`: `@@ -224 +224 @@`, `@@ -226,94 +226,2 @@`, `@@ -325 +233 @@` 等 (接口下线 404 回归断言) |
| **11** | 一键出单前端大按钮删除 (保留兜底) | `public/review.html` | `@@ -1427,6 +1331,5 @@` (底部栏彻底删除【一键出单 (生成PDF与邮件)】大按钮，新增【下载 PDF】按钮)<br>`@@ -1435,3 +1338,3 @@` (将【一键直达邮箱草稿箱】向全员放开)<br>`@@ -6709,96 +5552,0 @@` (相关 Vue 出单处理逻辑清理)<br>*(声明：DraftService / NotificationService 兜底链路 100% 完整保留)* |
| **12** | AI 匹配证据链弹窗行内入口替换 | `public/review.html` | `@@ -1000,6 +917,3 @@` (正常品项行内原按钮替换为静态 span；warningModal 针对异常 warning 品项完整保留) |
| **13** | 全屏沉浸式编辑弹窗删除 | `public/review.html` | `@@ -1344 +1251 @@`, `@@ -1347,3 +1253,0 @@` (邮件草稿区域删除全屏编辑按钮)<br>`@@ -1446,122 +1348,0 @@` (彻底删除邮件全屏编辑弹窗 `#email-fullscreen-modal`，原 1446~1567 行，共 122 行)<br>`@@ -2333,3 +1803,0 @@` (新建询盘弹窗内的全屏编辑放大按钮)<br>`@@ -6147,3 +4993 @@` (Vue setup 删除 emailFullscreenModal 变量与方法)<br>`@@ -7679,46 +6344,0 @@` (全屏编辑状态控制清理) |
| **14** | 汇率安全垫诊断弹窗删除 | `public/review.html` | `@@ -586,4 +538,2 @@` (汇率卡片区域彻底删除汇率诊断入口按钮)<br>`@@ -3188,144 +2655,0 @@` (后 104 行: 彻底删除外贸汇率深度诊断分析弹窗 rateDiagnosticModal，原 3228~3331 行)<br>`@@ -3333,17 +2656,0 @@` (汇率诊断弹窗尾部闭合标签与多余空行清理)<br>`@@ -4372 +3558,0 @@` (Vue setup 删除 rateDiagnosticModalVisible 响应式变量)<br>`@@ -8050 +6649,0 @@` (Escape 快捷键移除诊断弹窗分支) |
| **15** | AI 凑柜建议追加邮件按钮删除 | `public/review.html` | `@@ -667,5 +615,0 @@` (40HQ 配载分析卡片彻底删除“AI 凑柜建议追加邮件”按钮)<br>`@@ -6030,11 +4885,2 @@` (Vue setup 删除 insertLogisticsAdviceToEmail 函数) |
| **16** | 新手 tour 聚光灯引导删除与卡片替换 | `public/review.html` | `@@ -412,0 +324,41 @@` (新增轻量级静态 3 步新手提示卡片 showOnboardingCard)<br>`@@ -2055,53 +1700,0 @@` (彻底删除新手 tour 引导 `#tour-spotlight-overlay` 第 1 部分：全屏 SVG 镂空遮罩蒙版，原 2055~2108 行，共 53 行)<br>`@@ -2109,122 +1701,0 @@` (彻底删除新手 tour 引导 `#tour-spotlight-overlay` 第 2 部分：伴随式浮动气泡引导卡，原 2109~2230 行，共 122 行；两 chunk 合计 175 行)<br>`@@ -4757,196 +3825,5 @@` (Vue setup 彻底删除整套 Tour 聚光灯引导逻辑共 196 行)<br>`@@ -8037,7 +6643,0 @@` (移除 onMounted 延时 800ms 自动触发 startTour)<br>`@@ -8106,11 +6696,0 @@`, `@@ -8254,8 +6828,0 @@` (清理 Tour 响应式方法导出与联动) |
| **17** | 40HQ 配载卡片默认折叠 (重构) | `public/review.html` | `@@ -591,2 +541 @@` (卡片折叠容器与箭头)<br>`@@ -810 +754 @@` ~ `@@ -844,17 +777,7 @@` (40HQ 柜型卡片单行摘要与可折叠容器重构)<br>`@@ -4074,107 +3381,2 @@`, `@@ -6030,11 +4885,2 @@`, `@@ -7958 +6573,0 @@` (新增 containerCollapsed = ref(true)) |
| **18** | TenantProfile 字段可选化兼容 | `src/types/index.ts` | `@@ -236 +237 @@` (hideCostFromSales?: boolean 可选化向后兼容老 profile.json) |

---

## 三、Step 3 工作流精简与询盘一等实体变更对照表

为保证与 `STEP_3_COMPLETION_REPORT.md` 及 `git diff -U0 pre-mvp-slim` 严格 1-to-1 完全一致，下表汇总 Step 3 全部条目与真实 Git Diff Chunk 标头的完整映射关系：

| 序号 | 变更模块 / 功能点 | 涉及文件 | 真实 Git Diff Chunk 标头及对应说明 |
| :--- | :--- | :--- | :--- |
| **19** | **n8n 冗余工作流精简与归档** | `workflows/` | 重命名归档 4 个工作流至 `workflows/archive/`，根目录唯一保留 `n8n-gmail-quote-draft.json` |
| **-** | **QuotationResult / InquiryRecord 实体定义** | `src/types/index.ts` | `@@ -207,0 +208 @@` (`QuotationResult` 新增 `inquiryId?: string;`)<br>`@@ -274,0 +276,31 @@` (定义 `InquiryRecord` 询盘一等实体及字段) |
| **-** | **Inbound 流程询盘实体自动落盘** | `src/services/inbound-processor.service.ts` | `@@ -9,0 +10 @@` (引入 `InquiryService`)<br>`@@ -28,0 +30 @@` (`InboundProcessResult` 新增 `inquiryId?: string;`)<br>`@@ -179,0 +182,34 @@` (邮件出单生成报价时自动持久化 INQ 实体至 `data/tenants/<tenantId>/inquiries/`)<br>`@@ -386,0 +423 @@` (处理结果返回 `inquiryId`) |
| **-** | **Web 快速出单询盘实体自动落盘** | `src/routes/inbound.router.ts` | `@@ -133,0 +20 @@` (引入 `InquiryService`)<br>`@@ -488,0 +332,25 @@` (`POST /quick-quote` 同步持久化 INQ 实体)<br>`@@ -501,0 +370 @@` (响应体返回 `inquiryId`) |
| **-** | **询盘实体只读 API 端点 (D-12 隔离)** | `src/routes/quote.router.ts` | `@@ -17,0 +18 @@` (引入 `InquiryService`)<br>`@@ -814,0 +662,36 @@` (新增 `GET /api/v1/inquiries` 与 `GET /api/v1/inquiries/:id`，严格 D-12 租户物理隔离与防 IDOR 越权，纯只读不写) |

---

## 四、先行任务 (Step 4 前置) 变更与删除对照表

为保证与 `PRE_STEP_4_COMPLETION_REPORT.md` 及 `git diff -U0 pre-mvp-slim` 严格 1-to-1 完全一致，下表汇总 Step 4 前置 4 项先行任务的条目、说明与真实 Git Diff Chunk 标头映射关系：

### 1. 询盘实体双写镜像彻底移除说明 (已定案)
> **【核心数据架构定案】**：
> 彻底删除 `InquiryService` 中针对 `data/inquiries/` (`legacyStorageDir`) 镜像目录的双写、读取、排重与清理逻辑。
> **询盘实体的唯一真实数据源（Single Source of Truth）严格收敛为 `data/tenants/<tenantId>/inquiries/`**。
> - `saveInquiry`、`getInquiry`、`listInquiries` 仅读写租户隔离目录，排重合并的 Set 逻辑完全清理；
> - `cleanupTenantInquiries` 保留租户自身目录清理，移除同步清理镜像目录代码；
> - `tests/inquiry-service.test.ts` 移除双写专属测试，保留租户目录清理与单向存储校验（11/11 测试全过）。

### 2. 变更对照清单与 Git Diff Chunks 映射

| 序号 / 任务项 | 变更模块 / 功能点 | 涉及文件 | 真实 Git Diff Chunk 标头及对应说明 |
| :--- | :--- | :--- | :--- |
| **20** | **Excel 底价表模板 10→1 收敛与历史模板归档 (变更/归档)** | `public/templates/`<br>`src/routes/quote.router.ts`<br>`src/adapters/excel.adapter.ts`<br>`tests/excel-template-validation.test.ts` | `public/templates/`: `git mv` 归档 9 个历史模板至 `public/templates/archive/`；保留官方模板 `kelvinflow-pricing-template.xlsx` (MD5: `27c9b655693c26878b3680cc72b59b83`) 及 2 个 PO 样例<br>`quote.router.ts`: `@@ -872 +755 @@`, `@@ -875 +758 @@`, `@@ -877,3 +760 @@`, `@@ -882 +763,3 @@`, `@@ -886,6 +768,0 @@`, `@@ -894,2 +771,2 @@`, `@@ -901 +778 @@` (`GET /template/pricing-sheet` 统一指向该官方模板并下发 UTF-8 文件名)<br>`excel.adapter.ts`: `@@ -119,3 +119,14 @@` (忽略 sheetName 包含“脱敏”/“对外”的纯净报价单，防止误识别为商品底价库)<br>`tests`: 新增 `tests/excel-template-validation.test.ts` 9/9 项测试全过 |
| **§2.4** | **附件解析明确为二期文案提示** | `public/review.html` | `@@ -2250,0 +1722,6 @@` (在 `#new-po-modal-overlay` 弹窗新增黄色提示条："请粘贴邮件正文（附件解析为二期功能，当前仅解析正文）")<br>*(声明：`attachment-extractor.service.ts` 100% 物理未动，纯附件询盘走占位逻辑 `PENDING-SKU-01`)* |
| **§2.7** | **试用展示简化为「内测期间功能全开」** | `public/review.html` | `@@ -3696 +3009 @@`, `@@ -3699 +3012 @@`, `@@ -3702 +3015 @@`, `@@ -3714,35 +3027,5 @@`, `@@ -3750,5 +3033,4 @@`, `@@ -3755,0 +3038,3 @@` (试用到期弹窗文案简化为“内测期间功能全开”，副标题“系统处于公测体验期，所有功能正常可用，不限制出单与底价管理”，点击“我知道了，继续使用”即可关闭继续操作，不锁功能)<br>`@@ -4182,10 +3362,4 @@`, `@@ -4193,10 +3367,4 @@`, `@@ -4204,5 +3372,9 @@`, `@@ -4210,6 +3382,7 @@`, `@@ -4218,10 +3390,0 @@`, `@@ -4230,0 +3394,2 @@` (`openTrialExpiredModal` 简化)<br>*(声明：`trial-register`、`/auth/login` (含 `TRIAL_EXPIRED`)、`/auth/trial-status` 等后端 API 行为保持 100% 零改动)* |

---

*(后续各步骤改动将在此日志中持续规范追加)*

