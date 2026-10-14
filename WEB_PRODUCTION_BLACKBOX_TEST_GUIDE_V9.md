# KelvinFlow v9.0 生产环境 Web 黑盒测试规范与用例指南 (QA Agent 权威执行定审版)

> **版本编号**：v9.0 (Enterprise Blackbox Quality Suite - Final Approved)  
> **更新日期**：2026-10-13（站长终审定案版）  
> **适用执行器**：muse.ai、自动化测试 Agent (Playwright / Puppeteer)、QA 工程师与巡检程序  
> **生产测试基地址**：`https://quote.kelvinflow.com`  
> **标准测试单据入口**：`https://quote.kelvinflow.com/review/QT-20260904-888` (或 `QT-388788`)  

---

## 📢 核心更新公告与终审定案 (Release Notes & Final Errata)

本版本综合了近期所有上线特性的权威验收标准及站长终审意见，测试 Agent 必须以此为准执行断言：

1. **【P30 / KPI-03 最终定案（P30 关闭）】40HQ 集装箱配柜测算仪限重标尺采用 `26.0T`**：
   - **权威断言**：右侧装柜配载区 40HQ 标尺显示严格为 **`标尺: 68 CBM / 限重 26.0T`**。
   - **勘误定案**：
     1. ISO 40HC 物理载重极限约 26.6T（30,480kg 毛重 − 约 3,900kg 皮重），26.8T 在物理上不可能，系 V8 指南原文笔误，特此勘误；
     2. 26.0T 作为保守风控口径（船司超重费 OWS / 欧美公路内陆转运安全余量防扣车罚款）在业务上完全成立，全系统（基准底价表模块五、后端解析器、API 兜底及系统规格书）统一定义为 **`26,000 KG (26.0T)`**。
2. **【D-25 / 警告文案规范】报价币种缺失 / N/A 兜底显示与警告文案**：
   - 当单据币种缺失或为 `"N/A"` 时，审单工作台 8 处币种位统一兜底显示为 **`USD`**。
   - 后端及前端生成的风险警告文案严格为：**`Currency not specified, defaulted to USD. Used fallback rate: 7.2`**（绝不再出现 `[N/A]` 字样）。
3. **【P27 / D-24】支付弹窗徽章标准类名**：
   - 支付弹窗内 `#pay-monthly-promo-badge` 徽章 class 为标准类 `py-0.5`（全站源码 `py-0.2` 出现 0 次）。
4. **【P28】定价卡片 CTA 按钮按压缩放标准类名**：
   - 首页定价区 3 个定价卡片按钮均规范为 Tailwind 合法任意值写法 `active:scale-[0.98]`（非标 `scale-98` 出现 0 次）。
5. **【密码重置闭环】账户体系忘记密码与双输入重置流程**：
   - 登录弹窗新增「忘记密码」入口，支持通过工作邮箱获取 6 位数字验证码；
   - 验证通过后弹出新密码设置窗口，包含「输入新密码」与「再次输入新密码」双输入框一致性校验；
   - 重置成功后提示成功并自动重新回到登录弹窗。

---

## 一、测试环境与前置准备

| 项目 | 配置信息 | 备注说明 |
| :--- | :--- | :--- |
| **生产测试基地址** | `https://quote.kelvinflow.com` | 唯一官方测试基地址（原生 3000 端口受防火墙保护，不作为外部测试入口） |
| **标准测试单据路由** | `https://quote.kelvinflow.com/review/QT-20260904-888` | 内置标准样板单据（多 SKU 完整核算） |
| **币种兜底测试单据路由** | `https://quote.kelvinflow.com/review/QT-388788` | 验证 D-25 币种 USD 兜底与风控警示 |
| **推荐视口尺寸** | 桌面端：`1440 x 900`；移动端：`390 x 844` | 桌面端校验 12 列栅格；移动端统一采用 iPhone 14/15 逻辑视口 (390px) |
| **断言要求** | 抛错拦截 + 非零退出码 + DOM 状态断言 + 接口契约 | 杜绝假阳性，断言失败必须抛出 Error 并中止运行 |

---

## 二、测试用例矩阵汇总表

| 用例编号 | 功能模块 | 测试维度 | 核心验证点 | 优先级 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-NAV-01** | 全局导航 | 桌面端顶部导航 | 导航链接显示「版本定价」且点击平滑滚动至 `#pricing` | P0 |
| **TC-NAV-02** | 全局导航 | 移动端折叠抽屉 | 视口 390px 下汉堡菜单展开后显示「版本定价」且点击正常跳转 | P1 |
| **TC-NAV-03** | 页脚区域 | 底部版权与导航 | 页脚链接显示「版本定价」且指向 `#pricing` | P2 |
| **TC-PRICE-01** | 定价矩阵 | 默认月付三卡片渲染 | 免费版 (¥0)、个人专业版 (¥39/首月)、团队工作室版 (¥299/月及暂定标注) 完整展示 | P0 |
| **TC-PRICE-02** | 定价矩阵 | 计费周期年付切换 | 切换「按年付」后，专业版变为 ¥599/年（折合¥49.9/月），工作室版变为 ¥1,999/年 | P0 |
| **TC-PRICE-03** | 定价矩阵 | 免费体验版入口 | 点击卡片 1 按钮正常调起注册/体验弹窗 (`openInboundModal`) | P0 |
| **TC-PRICE-04** | 定价矩阵 | 团队工作室版排队 | 点击卡片 3 按钮正常弹出团队内测与商务登记提示 (`openWaitlistModal`) | P1 |
| **TC-PRICE-05** | 定价矩阵 | 专业版立即开通 | 点击卡片 2 立即解锁按钮直接唤起支付转账弹窗 (`openPaymentModal`) | P0 |
| **TC-PRICE-06** | 定价矩阵 | 按钮交互样式 (P28) | 三张定价卡片 CTA 按钮均采用标准类 `active:scale-[0.98]`，按压有微缩反馈 | P1 |
| **TC-PAY-01** | 支付弹窗 | 月付/年付价格切换 | 弹窗内切换月付（¥39/首月，次月¥69）与年付（¥599/年，省¥229） | P0 |
| **TC-PAY-02** | 支付弹窗 | 转账备注自动联动与复制 | 月付显示 `开通专业版39`，年付显示 `升级年付专业版599`，支持一键复制 | P0 |
| **TC-PAY-03** | 支付弹窗 | 创始人微信与二维码 | 微信展示 `kt_data` 并支持复制，二维码正常展示无裂图 | P1 |
| **TC-PAY-04** | 支付弹窗 | 徽章样式类名 (P27) | 首月特惠徽章 `#pay-monthly-promo-badge` 包含标准类 `py-0.5`，无 `py-0.2` | P2 |
| **TC-LEAD-01** | 迎新与私域 | Plan C 迎新弹窗 | 注册成功后弹窗正常弹出，展示迎新卡片 | P0 |
| **TC-LEAD-02** | 迎新与私域 | 引流神表命名一致性 | 赠送物料严格显示为《2026 外贸全能出单神表 (Excel 豪华版)》 | P0 |
| **TC-LEAD-03** | 迎新与私域 | 微信领取口令一致性 | 扫码加微信领取的口令严格为「出单神表」 | P0 |
| **TC-AUTH-01** | 账号认证 | 忘记密码入口唤起 | 登录弹窗内点击「忘记密码」，平滑唤起忘记密码验证码发送窗口 | P0 |
| **TC-AUTH-02** | 账号认证 | 重置验证码发送与校验 | 输入已注册邮箱点击获取验证码，60s 倒计时启动，输入错误提示拦截 | P0 |
| **TC-AUTH-03** | 账号认证 | 双密码一致性与重置闭环 | 输入两次新密码，不一致时前端拦截并高亮；一致提交后提示重置成功并跳回登录 | P0 |
| **TC-WB-01** | 审单工作台 | 新手引导 Step 3 文案 | 确认毛利步骤文案区分免费版素面单据与专业版 Logo 嵌入+草稿箱直连特权 | P1 |
| **TC-WB-02** | 审单工作台 | Logo 设置专业版横幅 | 非付费用户展示个人专业版专属特权横幅，到期用户阻断并引导升级 | P0 |
| **TC-WB-KPI-01** | 经营测算卡 | 报价总额与千分位联动 | 最终核算报价总额大字号展示、货币符号与千分位规范 (`USD 23,765.00`) | P0 |
| **TC-WB-KPI-02** | 经营测算卡 | 采购总量与毛利联动 | 采购款数、件数统计与预估毛利额及毛利率实时响应联动 | P0 |
| **TC-WB-KPI-03** | 经营测算卡 | 40HQ 配载标尺 (P30) | **40HQ 标尺严格显示为 `标尺: 68 CBM / 限重 26.0T`**；超柜时警报变色并提示增件凑柜 | P0 |
| **TC-WB-KPI-04** | 经营测算卡 | 底价成本机密隔离徽章 | 明确展示「成本底价私密隔离」与「算法守护中」绿色合规徽章 | P1 |
| **TC-WB-CURR-01**| 审单工作台 | 币种缺失兜底 (D-25) | 当询盘币种为 N/A 时，8 处币种位统一兜底显示 `USD`，与历史列表一致 | P0 |
| **TC-WB-WARN-01**| 审单工作台 | 风险提示文案一致性 | 顶部警示条文案严格为 `Currency not specified, defaulted to USD. Used fallback rate: 7.2` | P0 |
| **TC-EXP-01** | 试用到期 | 到期时刻格式化 | 到期时间严格格式化为 `YYYY年M月D日 HH:mm`（如 `2026年10月30日 18:00`） | P0 |
| **TC-EXP-02** | 试用到期 | 到期弹窗温度文案 | 包含「少喝一杯星巴克」及「到期后每月仍享有 10 笔免费出单额度」文案 | P0 |
| **TC-EXP-03** | 算法逻辑 | 24小时满时窗跨天取整 | 跨过午夜 00:00 不提前少算 1 天，满 24 小时才递减 1 天 | P0 |
| **TC-API-01** | 后端接口 | 状态接口数据契约 | `/api/v1/auth/trial-status` 返回 `formattedExpiresAt` 字段及 `plan` | P0 |

---

## 三、黑盒自动化测试用例详细步骤 (AI Agent 执行用)

### Suite 1: 全局导航与锚点定位

#### TC-NAV-01: 桌面端顶部导航锚点
* **前置条件**：桌面端浏览器（宽度 1440px），访问 `https://quote.kelvinflow.com/`
* **执行步骤**：
  1. 定位导航条内链接 `nav a[href="#pricing"]`。
  2. 获取文本内容并点击。
* **断言检查**：
  * `[Assert Text]` 文本必须严格为 `版本定价`（不得出现「极客套餐」）。
  * `[Assert Scroll]` 页面平滑滚动，`#pricing` 元素进入视口顶部区域。

#### TC-NAV-02: 移动端折叠抽屉导航 (390px 视口)
* **前置条件**：移动端视口（宽度 390px，高度 844px），访问 `https://quote.kelvinflow.com/`
* **执行步骤**：
  1. 点击移动端汉堡按钮 `#mobile-menu-btn` 打开抽屉。
  2. 定位 `#mobile-nav-drawer a[href="#pricing"] span` 并点击。
* **断言检查**：
  * `[Assert Visible]` 折叠抽屉展开可见。
  * `[Assert Text]` 菜单文本为 `版本定价`。
  * `[Assert State]` 点击后抽屉自动关闭，页面滚动至 `#pricing`。

---

### Suite 2: 定价矩阵与计费周期切换

#### TC-PRICE-01: 默认月付状态下三卡片渲染完整性
* **前置条件**：访问 `https://quote.kelvinflow.com/#pricing`
* **执行步骤**：检查月付按钮高亮状态，核对三卡片定价内容。
* **断言检查**：
  * `[Assert Element]` `#btn-billing-monthly` 包含文本 `按月付 (次月¥69/月)`，且处于激活样式。
  * `[Assert Element]` `#btn-billing-annual` 包含文本 `按年付 (¥599/年)` 及角标 `省 ¥229 · 折合 ¥49.9/月`。
  * `[Assert Card 1]` 包含标题 `免费体验版`、价格 `¥0`、周期 `/ 永久免费`。
  * `[Assert Card 2]` 包含徽标 `🔥 最受 SOHO / 业务员欢迎`、标题 `个人专业版`、价格 `#pricing-amount` 为 `39`、周期 `#pricing-cycle` 为 `/ 首月`、次说明 `#pricing-subtext` 包含 `(新人限时首月特惠仅 ¥39 · 次月起按 ¥69/月 正常续订)`。
  * `[Assert Card 3]` 包含徽标 `企业与团队首选`、标题 `团队工作室版`、价格 `#pricing-team-amount` 为 `299`、周期 `#pricing-team-cycle` 为 `/ 月`、免责声明包含 `（以下为规划中/暂定功能，以实际发布为准）`。

#### TC-PRICE-02: 计费周期「按年付」切换联动
* **前置条件**：访问 `https://quote.kelvinflow.com/#pricing`
* **执行步骤**：点击 `#btn-billing-annual` 按钮。
* **断言检查**：
  * `[Assert Card 2]` 专业版价格 `#pricing-amount` 变为 `599`。
  * `[Assert Card 2]` 专业版周期 `#pricing-cycle` 变为 `/ 年`。
  * `[Assert Card 2]` 专业版次说明 `#pricing-subtext` 变为 `(立省 ¥229 · 折合 ¥49.9/月 · 赠专属顾问)`。
  * `[Assert Card 2]` 按钮文本 `#btn-pay-text` 变为 `立即开通年付专业版 (¥599/年)`。
  * `[Assert Card 3]` 工作室版价格 `#pricing-team-amount` 变为 `1,999`，周期变为 `/ 年`。

#### TC-PRICE-06: 定价卡片 CTA 按钮样式类名 (P28)
* **前置条件**：定位定价区卡片 1、卡片 2、卡片 3 的底部 CTA 按钮。
* **断言检查**：
  * `[Assert Class]` 三个按钮均包含类名 `active:scale-[0.98]`。
  * `[Assert Class Regex]` 全页源码中不存在裸字符串 `scale-98`（不带方括号）。

---

### Suite 3: 升级支付弹窗与转账备注闭环

#### TC-PAY-01 & 02: 支付弹窗切换与转账备注生成
* **前置条件**：在首页点击专业版开通按钮 `#pricing-pay-btn` 唤起 `#payment-modal`。
* **执行步骤**：
  1. 切换月付与年付选项。
  2. 检查价格展示与转账备注内容。
  3. 点击复制备注按钮。
* **断言检查**：
  * `[Assert Title]` 顶部徽章严格显示为 `升级个人专业版 · 解锁全功能智能出单`。
  * `[Assert Monthly]` 月付状态下备注文本 `#payment-note-text` 为 `开通专业版39`。
  * `[Assert Annual]` 年付状态下备注文本 `#payment-note-text` 严格为 `升级年付专业版599`。
  * `[Assert Copy]` 点击复制按钮后文本呈现 `已复制 ✓`。
  * `[Assert WeChat]` 创始人微信号为 `kt_data`，支持一键复制。

#### TC-PAY-04: 支付弹窗特惠徽章标准类名 (P27)
* **前置条件**：检查支付弹窗内的 `#pay-monthly-promo-badge` 元素。
* **断言检查**：
  * `[Assert Class]` 包含 Tailwind 标准内边距类 `py-0.5`。
  * `[Assert Source]` 全页源码中 `py-0.2` 出现 0 次。

---

### Suite 4: 账号体系与忘记密码重置闭环

#### TC-AUTH-01: 登录弹窗唤起忘记密码
* **前置条件**：在首页或工作台点击「登录」，弹出登录弹窗 `#login-modal`。
* **执行步骤**：
  1. 定位登录弹窗下方的「忘记密码？」链接并点击。
* **断言检查**：
  * `[Assert Visible]` 登录弹窗淡出或收起，忘记密码弹窗 `#reset-pwd-modal` 打开显示。
  * `[Assert Title]` 弹窗标题显示为 `重置账号密码`。

#### TC-AUTH-02: 发送验证码与错误拦截
* **前置条件**：在忘记密码弹窗输入工作邮箱。
* **执行步骤**：
  1. 输入未注册邮箱，点击「获取验证码」-> 提示「该邮箱未注册」。
  2. 输入已注册邮箱，点击「获取验证码」-> 提示「验证码已发送」，按钮进入 60 秒倒计时。
  3. 输入错误验证码点击下一步 -> 提示拦截「验证码不正确或已过期」。

#### TC-AUTH-03: 双密码一致性与重置成功回跳
* **前置条件**：验证码校验通过，进入新密码设置步骤。
* **执行步骤**：
  1. 检查页面提供两个输入框：`新密码` 与 `再次确认新密码`。
  2. 当两次密码输入不一致时点击确认 -> 拦截并提示「两次输入的新密码不一致，请核对」。
  3. 输入相同的新密码（如 `Pass123456`）并提交。
* **断言检查**：
  * `[Assert API]` 接口返回 `success: true`，提示「密码重置成功，请使用新密码登录」。
  * `[Assert Redirect]` 忘记密码弹窗关闭，自动重新弹出登录弹窗，并自动填入该邮箱。
  * `[Assert Login]` 使用新密码可成功完成登录。

---

### Suite 5: 审单工作台经营测算与配载标尺 (Workbench KPIs)

#### TC-WB-KPI-01 & 02: 最终报价总额、利润率与件数核算
* **前置条件**：访问 `https://quote.kelvinflow.com/review/QT-20260904-888`
* **断言检查**：
  * `[Assert Total Format]` 最终核算报价总额以大粗体外币展示（如 `USD 23,765.00`），带两位小数与千分位逗号。
  * `[Assert Math Sync]` 修改任意商品数量或单价，右侧总额、总利润额、综合毛利率在 50ms 内响应联动。

#### TC-WB-KPI-03: 40HQ 集装箱配柜测算仪与标尺数值 (P30 终审定案)
* **前置条件**：在工作台右侧定位集装箱配载测算卡（`#container-gauge` 或带 `fa-ship` 图标区域）。
* **执行步骤**：
  1. 检查当前柜型标尺文本。
  2. 调整采购件数，使总体积超过 68 CBM（40HQ 安全容积）。
* **断言检查**：
  * `[Assert Scale]` **40HQ 标尺显示严格为：`标尺: 68 CBM / 限重 26.0T`（绝对不得出现 26.8T）**。
  * `[Assert Progress]` 体积未超载时展示正常蓝色进度条与装载率百分比；
  * `[Assert Overflow Warning]` 当总体积超过 68 CBM 时，进度条溢出部分呈现警示金黄色，提示文本呈现：`当前预估总体积 XX CBM 超出 40HQ 标准装载 (68 CBM) 约 XX CBM`。
  * `[Assert Weight Guard]` 若总毛重超过 26,000 KG (26.0T)，触发红色超重风险提示。

#### TC-WB-KPI-04: 底价隐私防护徽章
* **断言检查**：
  * `[Assert Privacy]` 测算卡底部展示 `成本底价私密隔离` 与 `算法守护中` 绿色徽章。

---

### Suite 6: 报价币种缺失兜底与风控警示 (D-25 专项核验)

#### TC-WB-CURR-01: 询盘币种 N/A 时 8 处统一兜底显示 USD
* **前置条件**：访问未指定币种的单据 `https://quote.kelvinflow.com/review/QT-388788`
* **断言检查**（以下 8 处币种位必须严格显示 `USD`，绝对不出现裸露的 `N/A`）：
  1. 顶部结算币种与汇率栏：显示 `$ USD`；
  2. 单据顶部最终报价总额：显示 `USD 23,765.00`；
  3. 右侧汇总卡片：显示 `USD 23,765.00`；
  4. 明细表头：显示 `外币单价 (USD)` / `小计金额 (USD)`；
  5. 明细行单价与小计：显示 `USD` 计价金额；
  6. 右侧邮件草稿正文：显示 `Total Amount: USD 23,765.00`；
  7. 底部悬浮栏：显示 `最终核算总额 USD 23,765.00`；
  8. 导出的 PDF 单据预览：币种统一标记为 `USD`。

#### TC-WB-WARN-01: 系统风控提示文案一致性
* **前置条件**：检查工作台黄色/红色风控提示栏内容。
* **断言检查**：
  * `[Assert Warning Text]` 警告文本严格为：  
    **`Currency not specified, defaulted to USD. Used fallback rate: 7.2`**  
    （严禁出现旧文案 `Currency [N/A] not found in exchange rate list`）。
  * `[Assert Disclaimer]` 汇率免责条款严格为：  
    `3. Exchange Rate Protection: Prices quoted based on benchmark rate (1 USD = 7.2 RMB)...`。

---

### Suite 7: 试用到期精确时刻算法与弹窗文案

#### TC-EXP-01 & 02: 到期弹窗时间戳格式与温度文案
* **前置条件**：在 Console 执行 `localStorage.setItem('kelvinflow_user_expired', 'true')` 触发到期弹窗。
* **断言检查**：
  * `[Assert Datetime Format]` 时间戳格式严格匹配正则：`\d{4}年\d{1,2}月\d{1,2}日 \d{2}:\d{2}`。
  * `[Assert Starbucks]` 包含文案：`☕ 少喝一杯星巴克，首月特惠仅 ¥39 即可保留整月无限次私人出单特权！`。
  * `[Assert 10 Free]` 包含文案：`试用到期后，每月仍享有 10 笔免费出单额度。如需解锁无限次极速出单与公司 Logo 上传，请升级个人专业版！`。

#### TC-EXP-03: 满 24 小时满时窗跨天取整机制
* **断言检查**：
  * 场景 A（同一天 19:00 开通，20:00 查询）：剩余天数必须为 **`7 天`**。
  * 场景 B（次日凌晨 00:05 查询）：相差 6 天 17 小时 55 分，跨午夜**不得少算**，必须依然为 **`7 天`**。
  * 场景 C（开通满 24 小时零 1 分）：递减为 **`6 天`**。

---

## 四、自动化执行脚本示例 (Playwright 终审修正版)

测试 AI Agent 可直接执行以下脚本对核心更新项（P30 标尺、D-25 币种兜底、P27/P28 样式类）完成一键端到端验收：

```javascript
// test_v9_qa_suite.cjs
const { chromium } = require('playwright-core');

// 跨平台 Chrome 路径嗅探：优先读取环境变量 CHROME_PATH，Windows 自动缺省回退
const CHROME_PATH = process.env.CHROME_PATH || 
  (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);

const BASE_URL = process.env.BASE_URL || 'https://quote.kelvinflow.com';

// 严格断言函数：失败抛出 Error 阻断执行并确保非零退出码
function assertStrict(condition, message) {
  if (!condition) {
    console.error(`\n❌ [断言失败] ${message}`);
    throw new Error(message);
  }
}

(async () => {
  let browser;
  try {
    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--window-size=1440,900']
    };
    if (CHROME_PATH) {
      launchOptions.executablePath = CHROME_PATH;
    }

    browser = await chromium.launch(launchOptions);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log('🚀 [QA Agent] 开始执行 KelvinFlow v9.0 生产环境核心校验...');

    // 1. 验证 P30 / KPI-03：40HQ 标尺必须为 26.0T (通过大件标准单据 /review/QT-20260904-888)
    console.log('🔍 [1/4] 验证 40HQ 集装箱配载标尺 (TC-WB-KPI-03)...');
    await page.goto(`${BASE_URL}/review/QT-20260904-888`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const bodyText1 = await page.innerText('body');
    
    const hasScale26T = bodyText1.includes('标尺: 68 CBM / 限重 26.0T') || bodyText1.includes('68 CBM / 限重 26.0T');
    assertStrict(hasScale26T, 'TC-WB-KPI-03 失败: 40HQ 标尺未显示「标尺: 68 CBM / 限重 26.0T」');
    assertStrict(!bodyText1.includes('26.8T'), 'TC-WB-KPI-03 失败: 页面错误出现了 26.8T');
    console.log('✅ TC-WB-KPI-03 通过: 40HQ 标尺严格显示为「68 CBM / 限重 26.0T」');

    // 2. 验证 D-25：币种缺失统一兜底 USD，警告文案无 [N/A] (通过无币种单据 /review/QT-388788)
    console.log('🔍 [2/4] 验证币种缺失兜底与风控警示 (TC-WB-CURR-01 & WARN-01)...');
    await page.goto(`${BASE_URL}/review/QT-388788`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const bodyText2 = await page.innerText('body');
    assertStrict(!bodyText2.includes('[N/A]'), 'TC-WB-WARN-01 失败: 页面仍然残留 [N/A] 字符');
    assertStrict(
      bodyText2.includes('Currency not specified, defaulted to USD. Used fallback rate: 7.2'),
      'TC-WB-WARN-01 失败: 未找到规范警告文案「Currency not specified, defaulted to USD. Used fallback rate: 7.2」'
    );
    console.log('✅ TC-WB-CURR-01 & WARN-01 通过: 8 处币种统一显示 USD，警告文案规范且无 [N/A]');

    // 3. 验证 P28：定价卡片按钮 active:scale-[0.98]
    console.log('🔍 [3/4] 验证定价卡片 CTA 按钮缩放类名 (TC-PRICE-06)...');
    await page.goto(`${BASE_URL}/index.html#pricing`, { waitUntil: 'networkidle' });
    const htmlContent = await page.content();
    assertStrict(!htmlContent.includes('scale-98"'), 'TC-PRICE-06 失败: 仍然存在非标 scale-98');
    assertStrict(htmlContent.includes('active:scale-[0.98]'), 'TC-PRICE-06 失败: 缺少合法任意值 active:scale-[0.98]');
    console.log('✅ TC-PRICE-06 通过: 定价卡片按钮已完全规范为 active:scale-[0.98]');

    // 4. 验证 P27：特惠徽章 py-0.5
    console.log('🔍 [4/4] 验证特惠徽章标准内边距类名 (TC-PAY-04)...');
    assertStrict(!htmlContent.includes('py-0.2'), 'TC-PAY-04 失败: 源码中仍然残留非标类 py-0.2');
    assertStrict(htmlContent.includes('py-0.5'), 'TC-PAY-04 失败: 缺少标准内边距类 py-0.5');
    console.log('✅ TC-PAY-04 通过: 特惠徽章已规范为标准类 py-0.5，py-0.2 出现 0 次');

    // 5. 验证 TC-NAV-02：移动端 390px 视口抽屉导航
    console.log('🔍 [额外加验] 验证移动端 390px 抽屉导航 (TC-NAV-02)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    const mobileBtn = await page.$('#mobile-menu-btn');
    assertStrict(mobileBtn !== null, 'TC-NAV-02 失败: 移动端视口下未找到汉堡菜单按钮 #mobile-menu-btn');
    console.log('✅ TC-NAV-02 通过: 移动端 390px 视口组件正常挂载');

    console.log('\n🎉 [QA Agent] KelvinFlow v9.0 核心断言校验全部通过！');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ [测试失败中止]:', err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
```

---

## 附录：26,000 KG (26.0T) 全链路定义位置索引（便于日后维护查阅）

| 链路层级 | 文件路径 | 行号 / 节点 | 定义内容 |
| :--- | :--- | :--- | :--- |
| **底价表配置源头** | [`商品底价表/出厂底价表.xlsx`](file:///F:/order_workflow/商品底价表/出厂底价表.xlsx) | 工作表 `[⚙️ 全局核算参数 (Config)]` L34 | `['40HQ (40尺高柜)', 68, 76.3, 26000, ...]` |
| **标准种子与模板** | [`public/templates/出厂底价表.xlsx`](file:///F:/order_workflow/public/templates/出厂底价表.xlsx) 等 | 工作表 `[⚙️ 全局核算参数 (Config)]` L35 | `['40HQ (40尺高柜)', '68.0 CBM', '76.3 CBM', '26,000 KG', ...]` |
| **模板生成脚本** | [`build_all_templates.cjs`](file:///F:/order_workflow/build_all_templates.cjs#L225)<br>[`scripts/generate_unified_lead_magnet.js`](file:///F:/order_workflow/scripts/generate_unified_lead_magnet.js#L145) | L225<br>L145 | `['40HQ (40尺高柜)', '68.0 CBM', '76.3 CBM', '26,000 KG', ...]` |
| **后端 Excel 适配器**| [`src/adapters/excel.adapter.ts`](file:///F:/order_workflow/src/adapters/excel.adapter.ts#L134-L138) | L134-138, L287-290 | 动态提取 `safeCBM = 68`, `maxKG = 26000` |
| **后端接口兜底** | [`src/routes/quote.router.ts`](file:///F:/order_workflow/src/routes/quote.router.ts#L1514-L1518) | L1514-1518 (`GET /api/v1/quotes/:id`) | `{ type: '40HQ', safeCBM: 68, maxKG: 26000, label: '40HQ (40尺高柜)' }` |
| **前端组件初始化** | [`public/review.html`](file:///F:/order_workflow/public/review.html#L4655-L4659) | L4655-4659 | Vue `containerSpecs` 初始兜底 `maxKG: 26000` |
| **前端计算与渲染** | [`public/review.html`](file:///F:/order_workflow/public/review.html#L5620-L5638) | L5620-5638, L811 | 计算属性提取 `maxKG = 26000`，渲染公式 `(maxKG/1000).toFixed(1) + 'T'` -> `26.0T` |
| **系统设计规范书** | [`SYSTEM_SPECIFICATION.md`](file:///F:/order_workflow/SYSTEM_SPECIFICATION.md#L339) | L339 | 模块五：`40HQ 68.0 CBM / 26,000 KG` |
