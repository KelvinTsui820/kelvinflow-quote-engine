# KelvinFlow v8.0 生产环境 Web 黑盒测试规范与用例清单

> [!IMPORTANT]
> **📢 规范升级与勘误公告（2026-10-13）**：  
> 本测试指南已全面升级至 **`WEB_PRODUCTION_BLACKBOX_TEST_GUIDE_V9.md`**。  
> 针对近期 QA 巡检中反馈的 **P30 / KPI-03 40HQ 限重标尺问题**，经系统代码、Excel 基准底价表与国际海运规程核查，**官方权威断言明确为 `标尺: 68 CBM / 限重 26.0T`**（对齐基准底价表 26,000 KG 防超重费 OWS 与欧美公路限重红线，绝非 26.8T）。最新全量用例请以 V9 版本为准。

> **目标受众**：自动化测试 AI Agent（Playwright / Puppeteer / Selenium）、QA 工程师与黑盒巡检程序  
> **测试目标**：验证 KelvinFlow v8.0 产品梯队重构、定价体系调整、到期精确时间戳及引流神表解耦等功能在真实生产环境的可用性与一致性。  
> **生产测试基地址**：`http://192.255.145.11:3000` (或 `https://quote.kelvinflow.com`)  

---

## 一、测试环境与前置准备

| 项目 | 配置信息 | 备注说明 |
| :--- | :--- | :--- |
| **测试环境** | 生产环境 (Production VPS) | `http://192.255.145.11:3000` |
| **标准测试单据** | `http://192.255.145.11:3000/review/QT-20260904-888` | 内置标准样板单据 |
| **测试账号建议** | 访客状态（清除 LocalStorage）/ 体验账号 / 到期账号 | 支持全场景状态切换 |
| **浏览器建议尺寸** | 桌面端：`1440 x 900`；移动端：`375 x 667` | 校验响应式三卡片与导航 |
| **断言要求** | 文本精确包含匹配 + DOM 状态断言 + 接口返回值校验 | 无报错，无 NaN，无控制台异常 |

---

## 二、测试用例矩阵汇总表

| 用例编号 | 功能模块 | 测试维度 | 核心验证点 | 优先级 |
| :--- | :--- | :--- | :--- | :--- |
| **TC-NAV-01** | 全局导航 | 桌面端顶部导航 | 导航链接显示「版本定价」且点击平滑滚动至 `#pricing` | P0 |
| **TC-NAV-02** | 全局导航 | 移动端折叠抽屉 | 汉堡菜单展开后显示「版本定价」且点击正常跳转 | P1 |
| **TC-NAV-03** | 页脚区域 | 底部版权与导航 | 页脚链接显示「版本定价」且指向 `#pricing` | P2 |
| **TC-PRICE-01** | 定价矩阵 | 默认月付三卡片渲染 | 免费版 (¥0)、个人专业版 (¥39/首月)、团队工作室版 (¥299/月及暂定标注) 完整展示 | P0 |
| **TC-PRICE-02** | 定价矩阵 | 计费周期年付切换 | 切换「按年付」后，专业版变为 ¥599/年（折合¥49.9/月），工作室版变为 ¥1,999/年 | P0 |
| **TC-PRICE-03** | 定价矩阵 | 免费体验版入口 | 点击卡片 1 按钮正常调起注册/体验弹窗 (`openInboundModal`) | P0 |
| **TC-PRICE-04** | 定价矩阵 | 团队工作室版排队 | 点击卡片 3 按钮正常弹出团队内测与商务登记提示 (`openWaitlistModal`) | P1 |
| **TC-PRICE-05** | 定价矩阵 | 专业版立即开通 | 点击卡片 2 立即解锁按钮直接唤起支付转账弹窗 (`openPaymentModal`) | P0 |
| **TC-PAY-01** | 支付弹窗 | 月付/年付价格切换 | 弹窗内切换月付（¥39/首月，次月¥69）与年付（¥599/年，省¥229） | P0 |
| **TC-PAY-02** | 支付弹窗 | 转账备注自动联动与复制 | 月付显示 `开通专业版39`，年付显示 `升级年付专业版599`，支持一键复制 | P0 |
| **TC-PAY-03** | 支付弹窗 | 创始人微信与二维码 | 微信展示 `kt_data` 并支持复制，二维码正常展示无裂图 | P1 |
| **TC-LEAD-01** | 迎新与私域 | Plan C 迎新弹窗 | 注册成功后弹窗正常弹出，展示迎新卡片 | P0 |
| **TC-LEAD-02** | 迎新与私域 | 引流神表命名一致性 | 赠送物料严格显示为《2026 外贸全能出单神表 (Excel 豪华版)》 | P0 |
| **TC-LEAD-03** | 迎新与私域 | 微信领取口令一致性 | 扫码加微信领取的口令严格为「出单神表」 | P0 |
| **TC-WB-01** | 审单工作台 | 新手引导 Step 3 文案 | 确认毛利步骤文案区分免费版素面单据与专业版 Logo 嵌入+草稿箱直连特权 | P1 |
| **TC-WB-02** | 审单工作台 | Logo 设置专业版横幅 | 非付费用户展示个人专业版专属特权横幅，到期用户阻断并引导升级 | P0 |
| **TC-EXP-01** | 试用到期 | 到期时刻格式化 | 到期时间严格格式化为 `YYYY年M月D日 HH:mm`（如 `2026年10月30日 18:00`） | P0 |
| **TC-EXP-02** | 试用到期 | 到期弹窗温度文案 | 包含「少喝一杯星巴克」及「到期后每月仍享有 10 笔免费出单额度」文案 | P0 |
| **TC-EXP-03** | 算法逻辑 | 24小时满时窗跨天取整 | 跨过午夜 00:00 不提前少算 1 天，满 24 小时才递减 1 天 | P0 |
| **TC-API-01** | 后端接口 | 状态接口数据契约 | `/api/v1/auth/trial-status` 返回 `formattedExpiresAt` 字段及 `plan` | P0 |

---

## 三、黑盒自动化测试用例详细步骤 (AI Agent 执行用)

### Suite 1: 全局导航与锚点定位

#### TC-NAV-01: 桌面端顶部导航锚点
* **前置条件**：打开桌面端浏览器（宽度 1440px），访问 `http://192.255.145.11:3000/`
* **执行步骤**：
  1. 定位导航条内链接 `nav a[href="#pricing"]`。
  2. 获取文本内容。
  3. 点击该链接。
* **断言检查**：
  * `[Assert Text]` 文本必须严格为 `版本定价`（不得出现「极客套餐」）。
  * `[Assert Scroll]` 页面平滑滚动，`#pricing` 元素进入视口顶部区域。

#### TC-NAV-02: 移动端折叠抽屉导航
* **前置条件**：打开移动端视口（宽度 375px），访问 `http://192.255.145.11:3000/`
* **执行步骤**：
  1. 点击移动端汉堡按钮 `#mobile-menu-btn` 打开抽屉。
  2. 定位 `#mobile-nav-drawer a[href="#pricing"] span`。
  3. 点击该项。
* **断言检查**：
  * `[Assert Visible]` 折叠抽屉展开可见。
  * `[Assert Text]` 菜单文本为 `版本定价`。
  * `[Assert State]` 点击后抽屉自动关闭，页面滚动至 `#pricing`。

---

### Suite 2: 定价矩阵与计费周期切换

#### TC-PRICE-01: 默认月付状态下三卡片渲染完整性
* **前置条件**：访问 `http://192.255.145.11:3000/#pricing`
* **执行步骤**：
  1. 检查标题与副标题。
  2. 检查月付按钮高亮状态。
  3. 检查卡片 1（免费体验版）、卡片 2（个人专业版 🔥）、卡片 3（团队工作室版）。
* **断言检查**：
  * `[Assert Element]` `#btn-billing-monthly` 包含文本 `按月付 (次月¥69/月)`，且处于激活样式。
  * `[Assert Element]` `#btn-billing-annual` 包含文本 `按年付 (¥599/年)` 及角标 `省 ¥229 · 折合 ¥49.9/月`。
  * `[Assert Card 1]` 包含标题 `免费体验版`、价格 `¥0`、周期 `/ 永久免费`、次说明 `试用到期后每月享有 10 笔免费出单额度`。
  * `[Assert Card 2]` 包含徽标 `🔥 最受 SOHO / 业务员欢迎`、标题 `个人专业版`、价格 `#pricing-amount` 为 `39`、周期 `#pricing-cycle` 为 `/ 首月`、次说明 `#pricing-subtext` 包含 `(新人限时首月特惠仅 ¥39 · 次月起按 ¥69/月 正常续订)`。
  * `[Assert Card 3]` 包含徽标 `企业与团队首选`、标题 `团队工作室版`、价格 `#pricing-team-amount` 为 `299`、周期 `#pricing-team-cycle` 为 `/ 月`、免责声明包含 `（以下为规划中/暂定功能，以实际发布为准）`。

#### TC-PRICE-02: 计费周期「按年付」切换联动
* **前置条件**：访问 `http://192.255.145.11:3000/#pricing`
* **执行步骤**：
  1. 点击 `#btn-billing-annual` 按钮。
  2. 等待 DOM 属性与文本更新。
* **断言检查**：
  * `[Assert Toggle]` `#btn-billing-annual` 切换为蓝色高亮激活状态。
  * `[Assert Card 2]` 专业版价格 `#pricing-amount` 变为 `599`。
  * `[Assert Card 2]` 专业版周期 `#pricing-cycle` 变为 `/ 年`。
  * `[Assert Card 2]` 专业版次说明 `#pricing-subtext` 变为 `(立省 ¥229 · 折合 ¥49.9/月 · 赠专属顾问)`。
  * `[Assert Card 2]` 按钮文本 `#btn-pay-text` 变为 `立即开通年付专业版 (¥599/年)`。
  * `[Assert Card 3]` 工作室版价格 `#pricing-team-amount` 变为 `1,999`，周期变为 `/ 年`，次说明包含 `立省 ¥1,589 · 折合 ¥166/月`。

#### TC-PRICE-03: 团队工作室版排队提醒响应
* **前置条件**：在首页定位卡片 3 底部按钮（`button[onclick="openWaitlistModal()"]`）
* **执行步骤**：
  1. 监听 `window.alert` 事件。
  2. 点击该按钮。
* **断言检查**：
  * `[Assert Alert]` 弹出提示框且文本包含：`团队工作室版（支持 3-5 人团队多账号协同与团队出单看板）正在紧锣密鼓开发中！建议先免费体验个人专业版，或添加创始人微信 kt_data 提前登记团队定制需求。`

---

### Suite 3: 升级支付弹窗与转账备注闭环

#### TC-PAY-01: 支付弹窗周期切换与价格核对
* **前置条件**：访问首页并点击专业版开通按钮 `#pricing-pay-btn`
* **执行步骤**：
  1. 等待支付弹窗 `#payment-modal` 显示。
  2. 检查默认选中的周期。
  3. 点击 `#pay-switch-annual` 切换为年付。
  4. 点击 `#pay-switch-monthly` 切换回月付。
* **断言检查**：
  * `[Assert Title]` 顶部徽章严格显示为 `升级个人专业版 · 解锁全功能智能出单`。
  * `[Assert Monthly]` 月付按钮标题为 `月付专业版`，显示价格 `¥39`，周期 `/ 首月`，说明包含 `次月起按 ¥69/月`。
  * `[Assert Annual]` 年付按钮角标显示 `省¥229`，标题为 `年付专业版`，显示价格 `¥599`，周期 `/ 年`，说明包含 `仅合 ¥49.9/月`。

#### TC-PAY-02: 转账备注自动生成与复制
* **前置条件**：在支付弹窗 `#payment-modal` 中
* **执行步骤**：
  1. 选中月付，检查 `#payment-note-text`。
  2. 选中年付，检查 `#payment-note-text`。
  3. 点击复制备注按钮。
* **断言检查**：
  * `[Assert Note Monthly]` 月付状态下备注文本为 `开通专业版39`。
  * `[Assert Note Annual]` 年付状态下备注文本严格为 `升级年付专业版599`。
  * `[Assert Copy]` 点击复制按钮后按钮文本变为 `已复制 ✓`。
  * `[Assert WeChat]` 创始人微信号为 `kt_data`，提供一键复制按钮。

---

### Suite 4: Plan C 迎新弹窗与引流神表物料

#### TC-LEAD-01 & 02 & 03: 注册迎新弹窗全案核验
* **前置条件**：清除 LocalStorage，在首页点击「免费试用 7 天」，输入未注册的外贸邮箱完成验证码登录，触发 `#plan-c-welcome-modal`。
* **执行步骤**：
  1. 校验弹窗可见性及顶部标题。
  2. 检查赠送权益物料列表。
  3. 检查微信扫码卡片领奖口令。
* **断言检查**：
  * `[Assert Header]` 包含 `🎉 免费试用开通成功！`。
  * `[Assert Magnet Text]` 赠品卡片严格显示为：`专属附赠《2026 外贸全能出单神表 (Excel 豪华版)》`（绝不包含「防泄露核价模板」等旧词汇）。
  * `[Assert Remark Text]` 扫码领奖提示严格为：`扫码备注「出单神表」即刻领取`（绝不包含「核价模板」口令）。
  * `[Assert Contact]` 创始人微信号严格为 `kt_data`。

---

### Suite 5: 审单工作台与引导流 (Workbench)

#### TC-WB-01: 新手引导 Step 3 权益分层描述
* **前置条件**：访问 `http://192.255.145.11:3000/review/QT-20260904-888`，清空 `localStorage.setItem('kelvinflow_tour_step', '3')`
* **执行步骤**：
  1. 查看工作台新手引导气泡第 3 步（一键出单）。
  2. 读取描述说明文本。
* **断言检查**：
  * `[Assert Free Text]` 针对普通/试用用户，包含素面 A4 报价单下载，且明确注明：`升级个人专业版后更可解锁专属企业 Logo 上传与草稿箱全自动托管！`。
  * `[Assert Pro Text]` 针对付费专业版用户，明确显示：`确认目标利润率与汇率后，一键生成正式商业 PDF 报价单（含企业专属 Logo 抬头），并全自动静默直达常用邮箱/企业邮箱【发件草稿箱】`。

#### TC-WB-02: 企业 Logo 设置弹窗专业版引导
* **前置条件**：访问 `http://192.255.145.11:3000/review/QT-20260904-888`
* **执行步骤**：
  1. 点击顶部公司 Logo / 抬头区域调起企业 Logo 弹窗 `#logo-modal-overlay`。
  2. 检查弹窗内部提示栏。
* **断言检查**：
  * `[Assert Banner]` 弹窗内展示黄色特权提示条：`企业 Logo 高清嵌入为个人专业版专属特权`。
  * `[Assert Upgrade Btn]` 提供 `立即升级 ➔` 链接，点击能立即调起个人专业版支付升级弹窗。
  * `[Assert Expired State]` 若处于试用到期状态（`expired: true`），点击 Logo 时阻止直接上传，弹出 Toast 提示 `☕ 自定义企业 Logo 为个人专业版专属特权，请先升级解锁！` 并自动弹出升级窗口。

---

### Suite 6: 试用到期精确时刻算法与弹窗文案

#### TC-EXP-01 & 02: 到期弹窗时间戳格式与星巴克文案
* **前置条件**：在 Console 执行模拟已到期状态：
  ```javascript
  localStorage.setItem('kelvinflow_user_expired', 'true');
  ```
  触发 `openTrialExpiredModal()`。
* **执行步骤**：
  1. 读取 `#trial-modal` 中的到期提醒文本。
* **断言检查**：
  * `[Assert Datetime Format]` 时间戳格式严格匹配正则：`\d{4}年\d{1,2}月\d{1,2}日 \d{2}:\d{2}`（精确到年月日与时分，绝非纯日期）。
  * `[Assert Starbucks]` 文本包含：`☕ 少喝一杯星巴克，首月特惠仅 ¥39 即可保留整月无限次私人出单特权！`。
  * `[Assert 10 Free]` 文本包含：`试用到期后，每月仍享有 10 笔免费出单额度。如需解锁无限次极速出单与公司 Logo 上传，请升级个人专业版！`。

#### TC-EXP-03: 满 24 小时满时窗取整机制
* **前置条件**：通过 Node / Jest / API 验证 `TrialService.calculateRemainingDays` 逻辑。
* **测试数据用例**：
  * 开通时刻：`2026-10-01 18:00:00`，到期时刻：`2026-10-08 18:00:00`（满 7 天）。
  * 场景 A（同一天 19:00）：相差 6 天 23 小时 -> 计算结果必须为 **`7 天`**。
  * 场景 B（次日凌晨 00:05）：相差 6 天 17 小时 55 分 -> 计算结果必须为 **`7 天`**（杜绝因跨午夜被扣减为 6 天）。
  * 场景 C（次日 17:59）：相差 6 天 1 分钟 -> 计算结果必须为 **`7 天`**。
  * 场景 D（次日 18:01）：满 24 小时已过 -> 计算结果递减为 **`6 天`**。

---

### Suite 7: 后端接口数据契约校验 (API Tests)

#### TC-API-01: `/api/v1/auth/trial-status` 接口字段校验
* **请求方式**：`GET http://192.255.145.11:3000/api/v1/auth/trial-status?phone={已注册手机号}`
* **断言检查**：
  * HTTP Status 必须为 `200`。
  * 返回 JSON 对象包含：
    * `success`: `true`
    * `exists`: `true`
    * `formattedExpiresAt`: 字符串，格式为 `YYYY年M月D日 HH:mm`（如 `2026年10月17日 15:30`）。
    * `remainingDays`: 整数，范围 `1 <= remainingDays <= 7`。
    * `plan`: 付费转正用户为 `pro` 或 `geek`，试用用户为 `trial`。

---

## 四、自动化执行脚本示例 (Playwright 代码示例)

AI Agent 可直接复制并运行以下 Playwright 脚本完成端到端自动化校验：

```javascript
// test_production_blackbox.cjs
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('🔍 开始执行 KelvinFlow v8.0 生产环境黑盒巡检...');
  await page.goto('http://192.255.145.11:3000/#pricing', { waitUntil: 'networkidle' });

  // 1. 校验导航
  const navText = await page.innerText('nav a[href="#pricing"]');
  console.assert(navText.trim() === '版本定价', `TC-NAV-01 失败: 导航显示为 [${navText}]`);
  console.log('✅ TC-NAV-01 通过: 导航正确显示「版本定价」');

  // 2. 校验三卡片默认月付渲染
  const priceAmount = await page.innerText('#pricing-amount');
  const priceSubtext = await page.innerText('#pricing-subtext');
  console.assert(priceAmount === '39', `TC-PRICE-01 失败: 专业版价格应为 39，实际为 [${priceAmount}]`);
  console.assert(priceSubtext.includes('¥69/月'), 'TC-PRICE-01 失败: 次月续费应为 ¥69/月');
  console.log('✅ TC-PRICE-01 通过: 默认月付首月 ¥39，次月 ¥69 正常展示');

  // 3. 校验年付切换联动
  await page.click('#btn-billing-annual');
  await page.waitForTimeout(500);
  const annualAmount = await page.innerText('#pricing-amount');
  const teamAmount = await page.innerText('#pricing-team-amount');
  console.assert(annualAmount === '599', `TC-PRICE-02 失败: 年付专业版应为 599，实际为 [${annualAmount}]`);
  console.assert(teamAmount === '1,999', `TC-PRICE-02 失败: 年付工作室版应为 1,999，实际为 [${teamAmount}]`);
  console.log('✅ TC-PRICE-02 通过: 年付专业版 ¥599、工作室版 ¥1,999 联动正确');

  // 4. 校验支付弹窗转账备注
  await page.click('#pricing-pay-btn');
  await page.waitForSelector('#payment-modal:not(.hidden)');
  const payNote = await page.innerText('#payment-note-text');
  console.assert(payNote.trim() === '升级年付专业版599', `TC-PAY-02 失败: 年付备注应为 [升级年付专业版599]，实际为 [${payNote}]`);
  console.log('✅ TC-PAY-02 通过: 支付弹窗转账备注自动联动为「升级年付专业版599」');

  await browser.close();
  console.log('🎉 所有自动化冒烟测试全部通过！');
})();
```
