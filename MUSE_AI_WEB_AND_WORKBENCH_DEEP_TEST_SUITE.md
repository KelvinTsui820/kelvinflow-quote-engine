# KelvinFlow 官网与智能审单工作台 全链路 UI 样式与交互深度测试用例指南 (muse.ai 专用版)

> **版本编号**：v9.0 (Enterprise Blackbox Quality Suite)  
> **适用执行器**：muse.ai（多模态视觉回归测试智能体）、Playwright/Puppeteer 自动化测试 Agent、高级 QA 工程师  
> **核心使命**：对 KelvinFlow 系统**官网营销页 (`public/index.html`)** 与 **智能审单工作台 (`public/review.html`)** 的全部视觉样式排版、动态响应式栅格、组件对齐基线、状态机联动、弹窗体系、输入容错及风控逻辑展开地毯式深度核查。  
> **生产测试基地址**：`http://192.255.145.11:3000`  
> **本地测试基地址**：`http://localhost:3000`  
> **标准单据测试入口**：`http://192.255.145.11:3000/review/QT-20260904-888`  

---

## 目录索引 (Test Suite Navigation)

1. [一、测试环境、视口矩阵与 muse.ai 执行规范](#一测试环境视口矩阵与-museai-执行规范)
2. [二、测试用例全景索引矩阵 (60 项全量用例)](#二测试用例全景索引矩阵-60-项全量用例)
3. [三、官网首页 (`index.html`) 视觉样式与交互用例 (Suite 1 - Suite 5)](#三官网首页-indexhtml-视觉样式与交互用例)
4. [四、审单工作台 (`review.html`) 视觉样式与交互用例 (Suite 6 - Suite 12)](#四审单工作台-reviewhtml-视觉样式与交互用例)
5. [五、跨端响应式与断点自适应专项测试 (Suite 13)](#五跨端响应式与断点自适应专项测试)
6. [六、高风险交互缺陷与边界容错专项核查 (Suite 14)](#六高风险交互缺陷与边界容错专项核查)
7. [七、muse.ai 自动化测试执行脚本模板 (Playwright TypeScript)](#七museai-自动化测试执行脚本模板)

---

## 一、测试环境、视口矩阵与 muse.ai 执行规范

### 1.1 视口分辨率矩阵 (Viewport Resolutions)

| 设备类型 | 视口宽 x 高 (px) | 校验重点 | 核心关注缺陷 |
| :--- | :--- | :--- | :--- |
| **标准桌面大屏** | `1440 x 900` | 官网网格排版、工作台 9 列参数卡 + 3 列 KPI 卡双栏并列 | 卡片高度不齐、水平基线错位、右侧留白过大 |
| **全高清宽屏** | `1920 x 1080` | 超宽屏内容最大宽度限制 (`max-w-7xl` / `max-w-[1536px]`) | 页面拉伸变形、浮动元素漂移 |
| **平板中屏 (横/竖)** | `1024 x 768` / `768 x 1024` | 栅格流式折行 (12 列折为 2 列)、表格自适应 | 表格溢出窗口、左右横向意外滚动条 |
| **移动端小屏** | `375 x 812` (iPhone X/13) | 单列纵向堆叠、汉堡折叠导航抽屉、底部吸底栏 | 底部悬浮条遮挡内容、汉堡菜单穿透、文字被遮挡 |

### 1.2 用户角色状态机配置 (User State Matrix)

muse.ai 在执行用例前，必须根据测试场景通过 `localStorage` 构造前置状态：

```javascript
// 场景 1: 未登录新访客 (未开通试用)
localStorage.clear();

// 场景 2: 7 天免费试用中普通用户 (已开通试用)
localStorage.setItem('kelvinflow_user_email', 'trial_user@tradex.com');
localStorage.setItem('kelvinflow_user_plan', 'trial');
localStorage.removeItem('kelvinflow_user_expired');
localStorage.removeItem('kelvinflow_user_is_paid');

// 场景 3: 试用已到期用户 (已封锁无限出单)
localStorage.setItem('kelvinflow_user_email', 'expired_user@tradex.com');
localStorage.setItem('kelvinflow_user_expired', 'true');
localStorage.removeItem('kelvinflow_user_is_paid');

// 场景 4: 个人专业版尊享会员 (已付费转正)
localStorage.setItem('kelvinflow_user_email', 'paid_vip@tradex.com');
localStorage.setItem('kelvinflow_user_plan', 'pro');
localStorage.setItem('kelvinflow_user_is_paid', 'true');

// 场景 5: 关闭新手向导遮罩阻断
localStorage.setItem('kelvinflow_tour_dismissed', 'true');
```

### 1.3 muse.ai 视觉回归比对规范 (Visual Assertion Rules)

- **基准像素误差容限**：$\le 0.1\%$（忽略字体抗锯齿微小像素抖动）。
- **红线缺陷分类 (Red-Flag Defects)**：
  1. **Align-Misaligned**：并列卡片顶部/底部/分割线高度不一致。
  2. **Text-Clip / Overflow**：文字被截断、容器出现意外横向滚动条、文字溢出父容器。
  3. **Z-Index Collision**：浮层、下拉框被底层元素或同级卡片遮盖。
  4. **Text Selection Leak**：点击交互按钮时触发浏览器对单据文本的蓝色全选高亮。
  5. **Scroll Chaining Leak**：弹窗展开时，滚轮在弹窗内滚动导致背景底层页面发生位移。
  6. **Data Anomaly**：页面出现 `NaN`、`undefined`、`null` 或未格式化的原始浮点尾数。

---

## 二、测试用例全景索引矩阵 (60 项全量用例)

| 用例 ID | 模块分组 | 用例名称与验证重点 | 优先级 |
| :--- | :--- | :--- | :--- |
| **TC-IND-NAV-01** | 官网导航 | 桌面端顶部导航栏排版、高保真模糊背景与锚点平滑滚动 | P0 |
| **TC-IND-NAV-02** | 官网导航 | 移动端汉堡菜单折叠展开、遮罩层及点击跳转自动关闭 | P0 |
| **TC-IND-NAV-03** | 官网导航 | 登录与未登录状态下顶部导航身份胶囊与快捷按钮切换 | P1 |
| **TC-IND-HERO-01**| 官网首屏 | 首屏主副标题字号、渐变排版与核心 CTA 按钮响应 | P0 |
| **TC-IND-HERO-02**| 官网首屏 | 核心价值胶囊标签渲染与出单演示视频/界面大图高质感边框 | P1 |
| **TC-IND-FEAT-01**| 官网痛点 | 6 大核心突破特性卡片网格布局、Hover 微动效与等高排版 | P1 |
| **TC-IND-COMP-01**| 官网对比 | 传统手工出单 vs KelvinFlow 秒级出单对比表色彩与排版对齐 | P1 |
| **TC-IND-FLOW-01**| 官网流程 | 交互式出单演示流程 3 步骤卡片、状态指示器与图文对齐 | P1 |
| **TC-IND-PRC-01** | 定价矩阵 | 默认月付状态下 3 张定价卡片严格水平像素级对齐核验 | P0 |
| **TC-IND-PRC-02** | 定价矩阵 | 计费周期「按年付」切换后 3 张卡片价格与说明联动更新 | P0 |
| **TC-IND-PRC-03** | 定价矩阵 | 个人专业版卡片 2 底部 CTA 按钮样式与状态胶囊干净排版 | P0 |
| **TC-IND-PRC-04** | 定价矩阵 | 团队工作室版卡片 3 排队登记弹窗 (`openWaitlistModal`) | P1 |
| **TC-IND-PRC-05** | 定价矩阵 | 已登录不同权限用户访问定价页时专业版卡片 2 状态动态反显 | P0 |
| **TC-IND-FAQ-01** | 官网问答 | 常见问题手风琴组件单项展开/收起、动画平滑度与图标旋转 | P1 |
| **TC-IND-MOD-01** | 官网弹窗 | 免费试用开通弹窗 (`#trial-modal`) 邮箱验证、验证码与倒计时 | P0 |
| **TC-IND-MOD-02** | 官网弹窗 | 注册成功 Plan C 迎新弹窗及《出单神表》赠品口令完整性 | P0 |
| **TC-IND-MOD-03** | 官网弹窗 | 升级支付弹窗 (`#payment-modal`) 月付/年付价格与转账备注联动 | P0 |
| **TC-IND-MOD-04** | 官网弹窗 | 支付弹窗微信收款码清晰展示与微信号 `kt_data` 一键复制 | P0 |
| **TC-IND-MOD-05** | 官网弹窗 | 同行推荐邀请弹窗 (`#referral-modal`) 专属链接生成与复制 | P1 |
| **TC-WB-HEAD-01** | 工作台顶栏 | 审单工作台顶部导航栏品牌 Logo、演示版徽章与功能按钮排版 | P0 |
| **TC-WB-HEAD-02** | 工作台顶栏 | 登出确认弹窗 (`logoutModal`) 居中性、数据清理与页面跳出 | P1 |
| **TC-WB-TOUR-01** | 新手指引 | 新手向导 3 步气泡步骤切换、位置吸附与内容分层描述 | P1 |
| **TC-WB-TOUR-02** | 新手指引 | 新手向导「跳过指引」交互与 LocalStorage 防刷防重复弹出 | P1 |
| **TC-WB-CARD1-01**| 询盘单号卡 | 询盘单据编号只读展示、复制单号交互及图标勾选状态变更 | P0 |
| **TC-WB-CARD1-02**| 询盘单号卡 | **点击「历史 (N)」按钮绝不触发单号蓝色选中文本** (专项修复) | P0 |
| **TC-WB-CARD2-01**| 买家企业卡 | 买家企业名称输入、打字同步、右侧一键清空按钮显示与清除 | P0 |
| **TC-WB-CARD3-01**| 贸易条款卡 | 贸易条款输入、底价表 EXW/FOB/CIF 快捷胶囊秒切与杂费提示 | P0 |
| **TC-WB-CARD4-01**| 采购对接卡 | 采购对接人姓名输入框打字、焦点高亮与清空操作 | P1 |
| **TC-WB-CARD5-01**| 买家邮箱卡 | 买家电子邮箱输入、格式校验与权益分层说明文案动态提示 | P1 |
| **TC-WB-CARD6-01**| 币种汇率卡 | 外币币种下拉列表渲染 (USD/EUR/GBP/AUD/CAD) 与动态切换 | P0 |
| **TC-WB-CARD6-02**| 币种汇率卡 | 汇率输入框数值变更自动联动全单重新核算外币单价与总额 | P0 |
| **TC-WB-CARD6-03**| 币种汇率卡 | **今日银行现汇买入牌价时间展示严格为中国北京时间 (CST)** | P0 |
| **TC-WB-CARD6-04**| 币种汇率卡 | 汇率手动刷新按钮旋转加载动画与最新牌价拉取 | P1 |
| **TC-WB-CARD6-05**| 币种汇率卡 | **汇率诊断徽章文案严格显示「与市场牌价持平」(杜绝平水)** | P0 |
| **TC-WB-CARD6-06**| 币种汇率卡 | 汇率安全垫状态流转：持平/预留安全垫/偏高汇损预警/偏离基准 | P0 |
| **TC-WB-CARD6-07**| 币种汇率卡 | **汇率诊断独立居中模态弹窗 (`rateDiagnosticModal`) 展开核查** | P0 |
| **TC-WB-CARD6-08**| 币种汇率卡 | 汇率诊断弹窗内双卡对比、三大风控逻辑与「一键采纳牌价」 | P0 |
| **TC-WB-CARD7-01**| 付款条款卡 | 付款条款直接输入与预设条款快捷联动 | P1 |
| **TC-WB-CARD8-01**| 生产交期卡 | 生产交期文本编辑与现货/底价表/整柜快捷胶囊切换 | P1 |
| **TC-WB-CARD9-01**| 报价有效卡 | 报价有效期文本编辑与 7天/15天/底价表设定快捷胶囊切换 | P1 |
| **TC-WB-KPI-01**  | 经营测算卡 | 最终核算报价总额大字号展示、货币符号与千分位金额格式化 | P0 |
| **TC-WB-KPI-02**  | 经营测算卡 | 采购总量款数、件数统计与预估毛利额及毛利率实时联动核算 | P0 |
| **TC-WB-KPI-03**  | 经营测算卡 | 40HQ/40GP/20GP 集装箱智能配柜测算进度条与超载预警高亮 | P0 |
| **TC-WB-KPI-04**  | 经营测算卡 | 底价成本机密隔离徽章展示与隐私合规承诺 | P1 |
| **TC-WB-TBL-01**  | 报价明细表 | 表格列头、行斑马纹、字号与数值单元格右对齐排版校验 | P0 |
| **TC-WB-TBL-02**  | 报价明细表 | AI 匹配置信度胶囊状态展示 (精准匹配/模糊匹配/自定义录入) | P1 |
| **TC-WB-TBL-03**  | 报价明细表 | 内部底价 SKU 下拉选型器点击展开、商品搜索过滤与换型替换 | P0 |
| **TC-WB-TBL-04**  | 报价明细表 | 商品品名与规格描述多行文本域自适应排版与编辑 | P1 |
| **TC-WB-TBL-05**  | 报价明细表 | 采购数量步进加减按钮交互、手动打字及边界限制 (不小于1) | P0 |
| **TC-WB-TBL-06**  | 报价明细表 | **采购数量低于起订量时的 MOQ 橙色风控预警徽章与 Tooltip** | P0 |
| **TC-WB-TBL-07**  | 报价明细表 | 目标毛利率修改触发外币单价正向计算公式校验 (公式无偏差) | P0 |
| **TC-WB-TBL-08**  | 报价明细表 | 修改外币单价反向倒算目标毛利率并四舍五入保留两倍小数 | P0 |
| **TC-WB-TBL-09**  | 报价明细表 | 毛利率低于底价表最低毛利红线 (8%) 时的警告指示条 | P0 |
| **TC-WB-TBL-10**  | 报价明细表 | 添加自定义新商品项交互与默认参数完整初始化 | P1 |
| **TC-WB-TBL-11**  | 报价明细表 | 删除商品项二次确认弹窗、行删除及全单总额重算 | P0 |
| **TC-WB-FOOT-01** | 底部吸底条 | 底部浮动工具条常驻吸底、阴影与指标 (总额/毛利率) 联动 | P0 |
| **TC-WB-FOOT-02** | 底部吸底条 | 「在线预览 PDF」按钮调起预览窗口与排版校验 | P0 |
| **TC-WB-FOOT-03** | 底部吸底条 | 「一键出单」二次确认弹窗展示、单据摘要与权益说明校验 | P0 |
| **TC-WB-FOOT-04** | 底部吸底条 | 试用版用户出单：PDF 即时下载 + 英文回信自动复制到剪贴板 | P0 |
| **TC-WB-FOOT-05** | 底部吸底条 | 付费专业版用户出单：企业 Logo 抬头渲染 + 邮箱草稿箱托管 | P0 |
| **TC-WB-HIST-01** | 历史单据窗 | **历史报价单弹窗顶部单号/买家快速搜索框功能深度测试** | P0 |
| **TC-WB-HIST-02** | 历史单据窗 | 历史单据搜索关键词实时匹配、单数统计与无匹配空状态展示 | P0 |
| **TC-WB-HIST-03** | 历史单据窗 | 历史单据列表切换打开单据 (`switchQuotation`) 响应 | P0 |
| **TC-WB-LOGO-01** | 企业Logo窗 | 企业专属 Logo 管理弹窗展开、当前 Logo 预览与尺寸等比缩放 | P1 |
| **TC-WB-LOGO-02** | 企业Logo窗 | 未付费用户点击 Logo 弹窗触发专业版特权横幅与升级引导 | P0 |
| **TC-WB-MAIL-01** | 邮箱配置窗 | 企业邮箱 IMAP/SMTP 授权配置弹窗表单展示与连接测试响应 | P1 |
| **TC-WB-NEWPO-01**| 上传询盘窗 | 上传新询盘文本/附件弹窗展开、输入框与智能解析动画交互 | P1 |
| **TC-GLB-SCRL-01**| 全局交互锁 | **任意模态窗打开时底层页面背景锁定 (`overflow-hidden`)** | P0 |
| **TC-GLB-ESC-01** | 全局交互锁 | **键盘 Escape 键全局监听关闭顶层模态窗交互** | P0 |
| **TC-GLB-TOAST-01**| 全局轻提示 | 全局 Toast 顶部居中浮层展示、状态色匹配与 3 秒自动淡出 | P1 |

---

## 三、官网首页 (`index.html`) 视觉样式与交互用例

### Suite 1: 全局导航与首屏营销区 (Navbar & Hero)

#### TC-IND-NAV-01: 桌面端顶部导航栏排版与锚点平滑滚动
- **测试环境**：视口 `1440 x 900`，未登录访客状态。
- **操作步骤**：
  1. 打开 `http://192.255.145.11:3000/`。
  2. 检查顶部导航栏组件外观、Logo 图标与文本排版。
  3. 依次点击导航条中各锚点链接：`核心突破` (`#features`)、`出单流程` (`#workflow`)、`版本定价` (`#pricing`)、`常见疑问` (`#faq`)。
  4. 向下滚动页面 300px，检查导航栏吸顶样式变化。
- **断言检查**：
  - `[Assert Visual]` 导航栏高度约为 64px-72px，文字无换行，左右边距对称。
  - `[Assert Text]` 定价链接文本严格为 `版本定价`（严禁出现旧版「极客套餐」字样）。
  - `[Assert Scroll]` 点击各锚点时，页面执行平滑滚动（Smooth Scroll），目标区块顶部对齐至视口可视区。
  - `[Assert Style]` 向下滚动后，导航栏应用 `backdrop-blur-md` 磨砂半透明背景及微弱底边框 `border-white/10`。
- **快照标准**：`snap_nav_desktop_default.png`。

#### TC-IND-NAV-02: 移动端汉堡菜单折叠展开与遮罩交互
- **测试环境**：视口 `375 x 812`，未登录访客状态。
- **操作步骤**：
  1. 打开移动端首页，观察桌面端水平导航条隐藏，汉堡按钮 `#mobile-menu-btn` 显现。
  2. 点击汉堡按钮。
  3. 点击抽屉内部「版本定价」菜单项。
- **断言检查**：
  - `[Assert Visible]` 移动端抽屉 `#mobile-nav-drawer` 平滑滑出，汉堡图标由三条杠变为叉号 `fa-xmark`。
  - `[Assert Mask]` 背景出现暗色遮罩层，禁止背景误触。
  - `[Assert Action]` 点击「版本定价」后，抽屉立即自动收起，图标恢复为三条杠，页面准确定位至 `#pricing` 区域。
- **快照标准**：`snap_nav_mobile_drawer_open.png`。

#### TC-IND-HERO-01: 首屏主副标题字号、渐变排版与核心 CTA 响应
- **测试环境**：视口 `1440 x 900`。
- **操作步骤**：
  1. 检查首屏 Hero 区域文字排版。
  2. 点击「免费开通 7 天试用」CTA 按钮。
- **断言检查**：
  - `[Assert Typography]` 大标题包含高对比流光文字，字号层级清晰，中英文混排无断行破损。
  - `[Assert Modal Trigger]` 点击 CTA 按钮后，立即唤起试用开通弹窗 `#trial-modal` 或快速体验引导。
- **快照标准**：`snap_hero_desktop_layout.png`。

---

### Suite 2: 版本定价矩阵绝对对齐与计费联动 (`#pricing`)

> **muse.ai 重点巡检红线**：此区域是系统商业化核心门面。3 张卡片必须保持像素级对齐，严禁出现高低不平、按钮堆叠混乱。

#### TC-IND-PRC-01: 默认月付状态下 3 张定价卡片严格水平像素级对齐核验
- **测试环境**：视口 `1440 x 900`，访问 `http://192.255.145.11:3000/#pricing`。
- **执行步骤**：
  1. 等待定价区域完整加载。
  2. 测量卡片 1（免费体验版）、卡片 2（个人专业版）、卡片 3（团队工作室版）的 DOM 坐标与高度。
- **断言检查**：
  - `[Assert Alignment - Top]` 卡片 1、卡片 2、卡片 3 的 `getBoundingClientRect().top` 严格相等（消除旧版 `lg:-translate-y-2` 浮动错位）。
  - `[Assert Alignment - Header]` 三张卡片头部标题区包含类名 `min-h-[96px]`，实际测量高度完全一致。
  - `[Assert Alignment - Price]` 三张卡片价格区域包含类名 `min-h-[128px]`，下底分割线 `border-b` 处于同一绝对水平线上。
  - `[Assert Alignment - Button]` 三张卡片底部按钮容器包含 `justify-end`，底部主操作按钮下边缘水平完全平齐。
  - `[Assert Card 1 Price]` 价格为 `¥0`，周期为 `/ 永久免费`，副说明为 `试用到期后每月享有 10 笔免费出单额度`。
  - `[Assert Card 2 Price]` 价格为 `¥39`，周期为 `/ 首月`，副说明包含 `(新人限时首月特惠仅 ¥39 · 次月起按 ¥69/月 灵活续订)`。
  - `[Assert Card 3 Price]` 价格为 `¥299`，周期为 `/ 月`，副说明包含 `（以下为规划中增值功能，以实际发布为准）`。
- **快照标准**：`snap_pricing_monthly_aligned.png`（由 muse.ai 进行水平辅助参考线比对）。

#### TC-IND-PRC-02: 计费周期「按年付」切换后价格与说明联动更新
- **测试环境**：视口 `1440 x 900`。
- **执行步骤**：
  1. 点击计费周期切换栏中的 `#btn-billing-annual`（按年付）。
  2. 等待 Vue/DOM 状态更新（500ms）。
  3. 再次测量 3 张卡片的对齐基线。
- **断言检查**：
  - `[Assert Toggle Style]` 年付按钮变为高亮激活态（蓝色背景加白字），月付按钮变为暗灰色。
  - `[Assert Card 2 Annual]` 价格 `#pricing-amount` 变为 `599`，周期变为 `/ 年`，说明变为 `(立省 ¥229 · 折合 ¥49.9/月 · 赠专属顾问)`，按钮文本更新为 `立即开通年付专业版 (¥599/年)`。
  - `[Assert Card 3 Annual]` 价格 `#pricing-team-amount` 变为 `1,999`，周期变为 `/ 年`，说明包含 `（立省 ¥1,589 · 折合 ¥166/月）`。
  - `[Assert Alignment]` 切换年付后，三张卡片的分割线与底部按钮基线依然保持像素级水平平齐。
- **快照标准**：`snap_pricing_annual_aligned.png`。

#### TC-IND-PRC-03: 个人专业版卡片 2 底部 CTA 按钮样式与状态胶囊排版
- **测试环境**：视口 `1440 x 900`。
- **执行步骤**：
  1. 检查未登录状态下卡片 2 底部：仅展示流金圆角按钮 `🔥 立即解锁首月特惠 (¥39/首月)`，上方无多余堆叠杂物。
  2. 执行 `localStorage.setItem('kelvinflow_user_email', 'tester@trade.com')`，刷新页面。
  3. 观察卡片 2 底部渲染状态。
- **断言检查**：
  - `[Assert Logged-In Capsule]` 按钮上方浮现小巧圆角绿色胶囊 `#pricing-logged-in-box`，文本为 `🟢 您当前处于 7天全功能免费试用中`。
  - `[Assert Clean Layout]` 胶囊居中排列，下方紧接流金 CTA 按钮，整体高度不拉伸卡片外框，与卡片 1、卡片 3 保持对称。
- **快照标准**：`snap_pricing_card2_loggedin_capsule.png`。

#### TC-IND-PRC-04: 团队工作室版卡片 3 排队登记弹窗交互
- **测试环境**：视口 `1440 x 900`。
- **执行步骤**：
  1. 点击卡片 3 底部按钮 `即将推出 · 敬请期待`。
  2. 监听浏览器弹窗事件。
- **断言检查**：
  - `[Assert Alert Text]` 弹出友好提示框，包含：`团队工作室版（支持 3-5 人团队多账号协同与团队出单看板）正在紧锣密鼓开发中！建议先免费体验个人专业版，或添加创始人微信 kt_data 提前登记团队定制需求。`
- **快照标准**：无破坏性错误，Alert 确认后页面状态不丢失。

---

### Suite 3: 官网支付转账模态弹窗系统 (`#payment-modal`)

#### TC-IND-MOD-03: 支付弹窗周期切换与转账备注联动完整性
- **测试环境**：访问首页，点击卡片 2 的 CTA 按钮，呼出 `#payment-modal`。
- **执行步骤**：
  1. 检查支付弹窗在屏幕中的绝对居中度与背景磨砂遮罩。
  2. 检查默认月付状态下转账备注文本 `#payment-note-text`。
  3. 点击切换为「年付专业版」。
  4. 检查年付状态下转账备注文本。
  5. 点击备注右侧「复制备注」按钮。
- **断言检查**：
  - `[Assert Modal Center]` 弹窗水平与垂直严格居中，最大宽度限制为 480px-520px，无超出屏幕边缘。
  - `[Assert Note Monthly]` 月付状态下备注严格为 `开通专业版39`（严禁出现旧版「极客版39」）。
  - `[Assert Note Annual]` 年付状态下备注严格为 `升级年付专业版599`（严禁出现旧版「极客版890」）。
  - `[Assert Copy Feedback]` 点击复制后，按钮短暂变为 `已复制 ✓`，剪贴板实际写入对应文本。
- **快照标准**：`snap_payment_modal_monthly.png`、`snap_payment_modal_annual.png`。

#### TC-IND-MOD-04: 微信收款码清晰展示与微信号复制
- **测试步骤**：
  1. 检查弹窗内部微信支付二维码图片容器。
  2. 检查创始人微信号展示与复制按钮。
- **断言检查**：
  - `[Assert QR Code]` 图片 `naturalWidth > 0`，无 404 裂图图标，居中展示。
  - `[Assert WeChat ID]` 明确标注创始人微信号为 `kt_data`，点击复制能够成功触发并提示已复制。
- **快照标准**：`snap_payment_modal_wechat_qr.png`。

---

### Suite 4: Plan C 迎新弹窗与神表赠送 (`#plan-c-welcome-modal`)

#### TC-IND-MOD-02: 注册迎新弹窗与神表领奖口令一致性
- **测试环境**：新注册用户登录成功。
- **断言检查**：
  - `[Assert Modal Title]` 顶部展示 `🎉 免费试用开通成功！`。
  - `[Assert Lead Magnet Name]` 赠送物料卡片严格显示为：`专属附赠《2026 外贸全能出单神表 (Excel 豪华版)》`（绝不包含「防泄露核价模板」等旧词汇）。
  - `[Assert Secret Code]` 微信扫码口令明确注明：`扫码备注「出单神表」即刻领取`。
- **快照标准**：`snap_welcome_modal_lead_magnet.png`。

---

## 四、审单工作台 (`review.html`) 视觉样式与交互用例

### Suite 6: 审单工作台导航与新手指引流

#### TC-WB-HEAD-01: 工作台顶栏组件排版与操作按钮
- **测试环境**：访问 `http://192.255.145.11:3000/review/QT-20260904-888`。
- **断言检查**：
  - `[Assert Logo & Badge]` 左侧展示 KelvinFlow 标识及 `演示体验版` 胶囊标签。
  - `[Assert Actions]` 右侧包含「新手指引」、「上传新询盘单」、「底价库」、「报价单Logo」、「登录/开通试用」5 个标准功能按钮，排列紧凑无重叠。
- **快照标准**：`snap_wb_header_desktop.png`。

#### TC-WB-TOUR-01: 新手指引 3 步分层权益描述
- **测试步骤**：清空指引缓存，刷新页面调起指引气泡。
- **断言检查**：
  - `[Assert Step 1]` 指向底价库，说明私有成本保护。
  - `[Assert Step 2]` 指向审单微调台，说明利润率与汇率实时重绘。
  - `[Assert Step 3]` 指向一键出单，文案明确区分：免费试用版生成素面 A4 报价单，个人专业版解锁企业专属 Logo 嵌入与企业邮箱草稿箱全自动托管。
  - `[Assert Skip]` 点击「跳过指引」，遮罩立即消失，向后不自动重复唤起。
- **快照标准**：`snap_wb_tour_step3.png`。

---

### Suite 7: 询盘单据与核心商务参数表单 (9 列核心卡片)

#### TC-WB-CARD1-01: 询盘单号卡只读展示与单号复制
- **测试步骤**：在卡片 1 点击「复制」按钮。
- **断言检查**：
  - `[Assert Display]` 单号文本为 `QT-20260904-888`，只读置灰，带锁定图标。
  - `[Assert Copy State]` 点击复制后，按钮变为浅绿背景，文本变为 `已复制`，1.5 秒后自动复原。
- **快照标准**：`snap_wb_card1_copied.png`。

#### TC-WB-CARD1-02: 点击「历史 (N)」按钮绝不触发单号蓝色选中文本 (P0 重点用例)
> **专项修复背景**：之前由于容器包含 `select-all` 类名且点击冒泡，导致点击「历史 (59)」时，单号 `QT-20260904-888` 产生整块蓝色选区高亮并伴随浏览器翻译浮标。

- **测试步骤**：
  1. 定位卡片 1 内的历史按钮 `button[title="查看当前租户历史报价单列表"]`。
  2. 点击该历史按钮。
  3. 执行 `window.getSelection().toString()` 获取当前浏览器选中文本。
  4. 检查单号元素上的 CSS 样式类。
- **断言检查**：
  - `[Assert No Blue Highlight]` 选中文本严格为 `""`（空字符串），界面无任何蓝色选中高亮。
  - `[Assert No select-all]` 单号所在父容器与 `span` 元素中严格移除了 `select-all` 类名。
  - `[Assert Modal Trigger]` 历史报价单切换弹窗 `#quotesHistoryModal` 正常居中弹出。
- **快照标准**：`snap_wb_card1_click_history_no_selection.png`。

#### TC-WB-CARD2-01: 买家企业名称输入与一键清空
- **测试步骤**：
  1. 在卡片 2 输入框中打字输入 `Acme Global Industrial Ltd.`。
  2. 观察右侧是否浮现圆圈清空图标 `×`。
  3. 点击该清空按钮。
- **断言检查**：
  - `[Assert Clear Button]` 输入内容存在时，右侧清空按钮由透明变为可见；点击后输入框内容瞬间清空，焦点保持。
- **快照标准**：`snap_wb_card2_clear_button.png`。

#### TC-WB-CARD3-01: 贸易条款快捷胶囊切换与动态港杂费提示
- **测试步骤**：
  1. 依次点击卡片 3 下方的「EXW 工厂自提」、「FOB 深圳港」、「CIF 目的港」快捷胶囊。
  2. 鼠标悬停在「FOB 深圳港」胶囊上方。
- **断言检查**：
  - `[Assert Incoterm Value]` 输入框内容秒级同步更新为对应条款英文（如 `FOB Shenzhen Yantian Port`）。
  - `[Assert Tooltip]` 胶囊悬停 Tooltip 准确显示底价表配置的包干杂费（如 `固定杂费: ¥1500 + ¥0.2/件`）。
- **快照标准**：`snap_wb_card3_incoterm_pills.png`。

---

### Suite 8: 结算币种与实时汇率安全垫引擎 (卡片 6 深度用例)

#### TC-WB-CARD6-01: 外币币种下拉列表渲染与动态切换
- **测试步骤**：
  1. 点击卡片 6 左侧币种下拉按钮 `$ USD`。
  2. 检查下拉菜单排版与各币种底价汇率及现汇买入价。
  3. 点击选择 `€ EUR`。
- **断言检查**：
  - `[Assert Dropdown Z-Index]` 下拉菜单高层级展示，绝不被下方表单或明细表格遮挡。
  - `[Assert Currency Switch]` 币种即刻切换为 `€ EUR`，全单金额重新折算，屏幕上方弹出 Toast 提示。
- **快照标准**：`snap_wb_card6_currency_dropdown.png`。

#### TC-WB-CARD6-03: 今日银行现汇买入牌价时间展示严格为中国北京时间 (CST) (P0 重点用例)
> **专项修复背景**：新浪外汇行情接口原始返回伦敦格林威治标准时间 (03:00:01 GMT)，导致外贸用户误以为时间异常。现已在后端转化为北京时间 (UTC+8)。

- **测试步骤**：
  1. 观察卡片 6 底部实时行情区域中的时间括号文本。
  2. 提取时间字符串，执行正则匹配与逻辑断言。
- **断言检查**：
  - `[Assert CST Time]` 显示文本形如 `(11:00:01)` 或当前北京时间小时，**绝不得出现 `03:00:01` 等未经时区转换的 UTC 时间**。
  - `[Assert Live Dot]` 现汇买入数值左侧带有绿色发光脉冲呼吸灯，标明实时通讯正常。
- **快照标准**：`snap_wb_card6_beijing_time.png`。

#### TC-WB-CARD6-05: 汇率诊断徽章文案严格显示「与市场牌价持平」(杜绝生僻词平水)
- **测试步骤**：
  1. 在控制台将报价汇率设置为与市场现汇买入价完全一致：
     ```javascript
     window.__vm.quotation.rateUsed = window.__vm.currentLiveRate.buyingRate;
     ```
  2. 观察卡片 6 右上角诊断徽章文本。
- **断言检查**：
  - `[Assert Badge Text]` 徽章文本严格显示为 **`⚖️ 与市场牌价持平`**（绝不得出现「平水」或「与市场平水」）。
  - `[Assert Badge Style]` 徽章呈现稳健蓝色边框与背景。
- **快照标准**：`snap_wb_card6_flat_badge.png`。

#### TC-WB-CARD6-06: 汇率安全垫全状态流转校验
- **测试步骤与断言**：
  1. **安全垫状态**：将汇率设置为低于市场价（如市场 6.6925，输入 6.5500）-> 徽章变为绿色 `🛡️ 预留 2.1% 安全垫`。
  2. **汇损风险状态**：将汇率设置为高于市场价（如输入 7.2000）-> 徽章变为黄色微闪烁 `⚠️ 偏高 7.6% (汇损隐患)`，输入框背景微微泛黄警示。
  3. **偏离底价基准状态**：无网络牌价时，若偏离底价表基准 ±3%，准确显示 `⚠️ 偏离基准 ±3%`。
- **快照标准**：`snap_wb_card6_cushion_state.png`、`snap_wb_card6_risk_state.png`。

#### TC-WB-CARD6-07 & 08: 汇率核算与结汇安全垫深度诊断独立居中弹窗 (`rateDiagnosticModal`)
> **专项修复背景**：之前为卡片内右下角绝对定位浮动层，会遮盖上方表单卡片，排版狭窄。现已重构为独立居中磨砂弹窗。

- **测试步骤**：
  1. 点击卡片 6 右上角诊断徽章或右下角圆圈问号图标。
  2. 检查唤起的弹窗是否为屏幕正中模态对话框。
  3. 检查弹窗内部模块：
     - 左侧卡片：当前报价单使用汇率；
     - 右侧卡片：今日银行现汇买入牌价（含北京时间、5分钟刷新说明、右上角手动刷新旋钮、底部一键采纳快捷链接）；
     - 中部诊断结论框：动态展示当前持平、安全垫或汇损风险分析；
     - 底部指南：3 点外贸实战风控逻辑（现汇买入牌价结算原理、汇率安全垫预留防范升值机制、底价表 ±3% 基准风控）；
     - 底部操作栏：左侧「采纳今日现汇买入价」大按钮，右侧「我知道了」主关闭按钮。
  4. 点击「我知道了」关闭弹窗。
- **断言检查**：
  - `[Assert Modal Structure]` 居中磨砂，无任何页面错位，背景滚动被正确锁定。
  - `[Assert Close]` 点击右上方 `×`、点击遮罩外部、按键盘 `Esc` 键均能丝滑关闭弹窗。
- **快照标准**：`snap_wb_rate_diagnostic_modal_open.png`。

---

### Suite 9: 经营测算卡与集装箱配柜 KPI (右侧 3 列)

#### TC-WB-KPI-01 & 02: 最终报价总额、利润率与件数千分位核算
- **断言检查**：
  - `[Assert Total Format]` 总额显示为大粗体外币（如 `USD 255,100.00`），严格带两位小数与千分位逗号。
  - `[Assert Math Sync]` 修改商品数量或单价，右侧总额、总利润额、综合毛利率必须在 50ms 内响应联动，无卡顿。
- **快照标准**：`snap_wb_kpi_summary_card.png`。

#### TC-WB-KPI-03: 集装箱智能配柜测算仪与超载超体积警示
- **测试步骤**：
  1. 增加商品数量使总体积超过 68 CBM（40HQ 安全立方）。
- **断言检查**：
  - `[Assert Gauge]` 进度条超出 100%，变为警示金黄色；
  - `[Assert Warning Tag]` 准确显示 `当前预估总体积 XX CBM 超出 XX CBM (XX%)`，提示业务员分柜或调整装箱方案。
- **快照标准**：`snap_wb_container_gauge_overflow.png`。

---

### Suite 10: 报价单规格明细核心表格 (Items Table)

#### TC-WB-TBL-03: 内部底价 SKU 下拉选型器与换型替换
- **测试步骤**：
  1. 点击商品行中的「匹配内部底价 SKU」单元格。
  2. 展开底价商品选择下拉浮层。
  3. 在搜索框输入关键词，点击选择另一款商品。
- **断言检查**：
  - `[Assert Dropdown]` 准确显示底价表中配置的 SKU 列表、商品名称及出厂底价 RMB。
  - `[Assert Replace]` 选择新商品后，该行的出厂底价自动更新，全单总额和毛利重新平衡。
- **快照标准**：`snap_wb_table_sku_picker.png`。

#### TC-WB-TBL-05 & 06: MOQ 起订量警示与数量步进器
- **测试步骤**：
  1. 将某款起订量为 1000 件的商品数量通过减号按钮减少至 500 件。
- **断言检查**：
  - `[Assert MOQ Alert]` 数量旁即刻显现醒目橙色标签 `低于起订量 (MOQ 1,000)`。
  - `[Assert Tooltip]` 鼠标悬停展示：提示小批量采购可能导致工厂额外开机费或需要申请特批底价。
- **快照标准**：`snap_wb_table_moq_alert.png`。

#### TC-WB-TBL-07 & 08: 利润率与外币单价双向双轨精准联动计算
- **测试步骤**：
  1. 将某商品的目标毛利率由 `25%` 修改为 `30%`，观察外币单价变化。
  2. 直接修改外币单价为某个特定整数，观察目标毛利率变化。
- **断言检查**：
  - `[Assert Math Formula]` 价格计算公式严格对齐：
    $$\text{UnitPriceForeign} = \frac{\text{BasePriceRMB} + \text{IncotermFees}}{\text{RateUsed} \times (1 - \text{Margin})}$$
  - `[Assert Precision]` 外币单价与毛利率四舍五入精确到 2 位小数，计算结果无 `NaN` 或长浮点尾数（如 `108.50000000000001`）。
- **快照标准**：`snap_wb_table_margin_bidirectional_calc.png`。

#### TC-WB-TBL-11: 删除商品行二次确认与全单重平衡
- **测试步骤**：
  1. 点击某商品行右侧垃圾桶删除图标。
  2. 观察弹出的二次确认弹窗 `#deleteModal`。
  3. 点击「确认删除」。
- **断言检查**：
  - `[Assert Delete Confirm]` 调出优雅确认模态窗，明确告知将被删除的 SKU 编号与品名。
  - `[Assert Row Removed]` 确认后该行平滑销毁，序号重新排号（1, 2, 3...），全单总额与 KPI 卡同步递减扣除。
- **快照标准**：`snap_wb_table_delete_modal.png`。

---

### Suite 11: 租户历史报价单切换弹窗深度搜索 (`quotesHistoryModal`)

> **专项修复背景**：租户历史单据数量较多（如 59 份）时，难以快速查找特定单号。现已在弹窗顶部新增双向实时模糊搜索框。

#### TC-WB-HIST-01: 历史单据弹窗顶部搜索框排版与视觉设计
- **测试环境**：在卡片 1 点击「历史 (59)」按钮打开弹窗。
- **断言检查**：
  - `[Assert Search Box]` 弹窗标题栏下方居中展示带有放大镜图标的浅灰圆角搜索框，占位提示符为 `输入单据编号或买家企业名称搜索...`。
  - `[Assert Focus Ring]` 点击输入框聚焦时，呈现高质感外发光微边框 (`focus:border-blue-500`)。
- **快照标准**：`snap_wb_history_search_input_layout.png`。

#### TC-WB-HIST-02: 单号与买家双向实时模糊过滤与匹配单数提示
- **测试步骤**：
  1. 在搜索框中键入单号关键词 `QT-2026`。
  2. 检查列表动态过滤结果与弹窗副标题提示。
  3. 点击输入框右侧清空小圆叉 `×`。
  4. 在搜索框中键入买家关键词 `Apex`。
  5. 键入不存在的乱码 `XXXXX99999`。
- **断言检查**：
  - `[Assert Number Filter]` 输入 `QT-2026` 时，列表仅保留匹配项，副标题动态更新为 `当前租户名下已生成的报价单 (共 59 份 · 匹配 1 份)`。
  - `[Assert Buyer Filter]` 输入 `Apex` 时，能够准确根据买家企业名模糊筛选出相关单据。
  - `[Assert Clear Icon]` 输入文字后右侧显现清空图标，点击一键恢复全量 59 份单据列表。
  - `[Assert Empty State]` 输入不存在关键词时，列表区域展示空文件夹图标与提示 `未找到匹配的单据编号或买家`，无控制台报错。
- **快照标准**：`snap_wb_history_filtered_match.png`、`snap_wb_history_empty_state.png`。

---

### Suite 12: 底部吸底操作栏与出单业务全流程

#### TC-WB-FOOT-03 & 04: 试用版出单确认与 PDF 自动下载
- **测试步骤**：
  1. 在访客/试用状态下，点击右下角主按钮「一键出单 (生成PDF与邮件)」。
  2. 观察弹出的出单确认弹窗。
  3. 点击「确认出单」。
- **断言检查**：
  - `[Assert Confirm Info]` 确认弹窗展示单据编号、买家名称、总额及明确的试用出单指引。
  - `[Assert Download & Copy]` 确认后触发正式 PDF 报价单即时下载，同时地道英文商务回复自动写入系统剪贴板。
  - `[Assert Success Modal]` 弹出出单成功弹窗，提示升级个人专业版可解锁专属 Logo 上传及企业邮箱草稿箱全自动托管。
- **快照标准**：`snap_wb_quote_confirm_modal.png`、`snap_wb_quote_success_modal.png`。

---

## 五、跨端响应式与断点自适应专项测试 (Suite 13)

### TC-RESP-01: 平板端 (1024px & 768px) 栅格自适应与横向防溢出
- **测试步骤**：
  1. 将视口宽度调整为 `1024px`，检查工作台 9 列参数表单区。
  2. 将视口宽度调整为 `768px`，检查明细商品表格。
- **断言检查**：
  - `[Assert Form Grid]` 9 列参数自动折叠为 2 列并排网格，右侧 KPI 卡自动平滑调整宽度，无文字截断。
  - `[Assert Table Scroll]` 表格容器具备内嵌平滑横向滚动条 (`overflow-x-auto`)，主页面 `body` 绝不出现横向滚动条。
- **快照标准**：`snap_resp_tablet_1024.png`、`snap_resp_tablet_768.png`。

### TC-RESP-02: 移动端 (375px) 单列全流式布局与底部吸底垫高
- **测试步骤**：
  1. 将视口调整为 iPhone 尺寸 `375 x 812`。
  2. 滚动到底部。
- **断言检查**：
  - `[Assert Vertical Stack]` 所有参数卡片垂直变为单列卡片；
  - `[Assert Safe Padding]` 页面底部包含足够的内边距 (`pb-24`)，底部固定吸底操作条绝不遮挡表格最后一行数据及「添加商品」按钮。
- **快照标准**：`snap_resp_mobile_375_bottom.png`。

---

## 六、高风险交互缺陷与边界容错专项核查 (Suite 14)

### TC-GLB-SCRL-01: 任意模态窗打开时背景滚动穿透锁定 (Scroll Lock)
- **测试步骤**：
  1. 依次触发工作台的：历史切换弹窗、汇率诊断弹窗、企业 Logo 弹窗、出单确认弹窗。
  2. 在弹窗打开状态下，使用鼠标滚轮在遮罩层任意位置快速滚动。
- **断言检查**：
  - `[Assert Body Overflow]` 页面 `document.body` 必须自动挂载 `overflow-hidden` 类名。
  - `[Assert No Background Scroll]` 背景底层的主表单和表格严格保持不动，杜绝发生任何背景联动滑动现象。
  - `[Assert Body Restore]` 关闭弹窗后，`overflow-hidden` 立即被移除，页面恢复正常滚动。

### TC-GLB-ESC-01: 全局键盘 Escape 键瞬时关闭弹窗
- **测试步骤**：
  1. 唤起任意模态弹窗（如汇率诊断弹窗）。
  2. 按下物理键盘 `Escape` 键。
- **断言检查**：
  - `[Assert Escape Close]` 弹窗立即关闭，透明遮罩消失，焦点平稳回退至触发按钮。

### TC-GLB-TOAST-01: 全局 Toast 提示顶部居中悬浮与定时自动淡出
- **测试步骤**：
  1. 触发任意业务 Toast（如切换币种、修改汇率或一键填入牌价）。
  2. 观察屏幕上方出现的 Toast 提示条。
- **断言检查**：
  - `[Assert Toast Position]` 位于屏幕水平正中（`fixed top-6 left-1/2 -translate-x-1/2`），层级处于最高层（`z-50` 以上）。
  - `[Assert Auto Dismiss]` 提示信息在停留 3 秒后执行淡出平滑过渡并销毁；点击右侧小圆叉能立即提前关闭。
- **快照标准**：`snap_toast_centered_notification.png`。

---

## 七、muse.ai 自动化测试执行脚本模板 (Playwright TypeScript)

muse.ai 或自动化测试 Agent 可直接执行以下脚本，完成自动化巡检、视觉截图采集与全量断言：

```typescript
// e2e_muse_ai_audit.spec.ts
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://192.255.145.11:3000';
const QUOTE_URL = `${BASE_URL}/review/QT-20260904-888`;

test.describe('KelvinFlow 官网与工作台深度样式与交互全景核查', () => {

  test.beforeEach(async ({ page }) => {
    // 默认关闭新手引导干扰，确保直接测试真实交互
    await page.addInitScript(() => {
      localStorage.setItem('kelvinflow_tour_dismissed', 'true');
    });
  });

  test('TC-IND-PRC-01 & 02: 定价三卡片水平严格对齐与年付切换联动', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/#pricing`, { waitUntil: 'networkidle' });

    // 1. 验证 3 张卡片顶部绝对对齐
    const cards = page.locator('#pricing .grid > div');
    await expect(cards).toHaveCount(3);
    
    const box0 = await cards.nth(0).boundingBox();
    const box1 = await cards.nth(1).boundingBox();
    const box2 = await cards.nth(2).boundingBox();

    expect(box0?.y).toBeCloseTo(box1?.y || 0, 1);
    expect(box1?.y).toBeCloseTo(box2?.y || 0, 1);
    expect(box0?.height).toBeCloseTo(box1?.height || 0, 1);

    // 2. 验证年付联动
    await page.click('#btn-billing-annual');
    await page.waitForTimeout(500);

    await expect(page.locator('#pricing-amount')).toHaveText('599');
    await expect(page.locator('#pricing-team-amount')).toHaveText('1,999');
    await expect(page.locator('#btn-pay-text')).toHaveText('立即开通年付专业版 (¥599/年)');
    
    await page.screenshot({ path: 'audit_pricing_annual.png', fullPage: false });
  });

  test('TC-WB-CARD1-02: 询盘单号卡点击历史绝无蓝色选中文本', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(QUOTE_URL, { waitUntil: 'networkidle' });

    // 点击历史 (59) 按钮
    const historyBtn = page.locator('button[title="查看当前租户历史报价单列表"]');
    await historyBtn.click();
    await page.waitForTimeout(400);

    // 核心断言：浏览器无任何文本选区
    const selection = await page.evaluate(() => window.getSelection()?.toString() || '');
    expect(selection).toBe('');

    // 弹窗正常显现
    await expect(page.locator('input[placeholder*="输入单据编号或买家企业名称搜索"]')).toBeVisible();
    await page.screenshot({ path: 'audit_history_no_selection.png' });
  });

  test('TC-WB-CARD6-03 & 05: 汇率卡片北京时间与「与市场牌价持平」徽章', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(QUOTE_URL, { waitUntil: 'networkidle' });

    // 1. 验证时间为北京时间格式 (HH:mm:ss)，非 03:00 UTC
    const rateCard = page.locator('.rate-card-container');
    const timeText = await rateCard.innerText();
    expect(timeText).toMatch(/\(\d{2}:\d{2}:\d{2}\)/);
    expect(timeText).not.toContain('(03:00:'); // 绝不能是未经转换的伦敦时间

    // 2. 将报价汇率调至与牌价一致，验证徽章绝无「平水」
    await page.evaluate(() => {
      (window as any).__vm.quotation.rateUsed = (window as any).__vm.currentLiveRate.buyingRate;
    });
    await page.waitForTimeout(300);

    const badge = rateCard.locator('button.text-\\[9px\\] span');
    await expect(badge).toHaveText('⚖️ 与市场牌价持平');
    await page.screenshot({ path: 'audit_rate_beijing_time_flat.png' });
  });

  test('TC-WB-CARD6-07: 汇率安全垫独立居中模态弹窗展开核查', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(QUOTE_URL, { waitUntil: 'networkidle' });

    // 点击卡片 6 右上角徽章打开弹窗
    await page.click('.rate-card-container button.text-\\[9px\\]');
    await page.waitForTimeout(400);

    // 验证居中模态窗
    const modal = page.locator('div:has-text("外贸汇率核算与结汇安全垫分析")').last();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('今日银行现汇买入牌价');
    await expect(modal).toContainText('北京时间');
    await expect(modal).toContainText('汇率安全垫机制');

    await page.screenshot({ path: 'audit_rate_modal_centered.png' });

    // 验证 Esc 键关闭
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(modal).not.toBeVisible();
  });

  test('TC-WB-HIST-01 & 02: 历史单据搜索过滤功能实战核查', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(QUOTE_URL, { waitUntil: 'networkidle' });

    // 打开历史弹窗
    await page.click('button[title="查看当前租户历史报价单列表"]');
    const searchInput = page.locator('input[placeholder*="输入单据编号或买家企业名称搜索"]');
    await expect(searchInput).toBeVisible();

    // 键入关键字过滤
    await searchInput.fill('QT-2026');
    await page.waitForTimeout(300);

    // 验证匹配数量提示
    const headerText = await page.locator('p:has-text("匹配")').innerText();
    expect(headerText).toContain('匹配 1 份');

    await page.screenshot({ path: 'audit_history_search_filtered.png' });
  });

});
```

---

## 八、muse.ai 巡检验收报告交付模板

在 muse.ai 执行完上述 60 项测试后，请严格按照以下标准结构向工程团队输出《UI 与交互质量验收报告》：

```markdown
# KelvinFlow UI/交互测试验收报告 (By muse.ai)

### 1. 总体测试执行概览
- **测试执行时间**：YYYY-MM-DD HH:mm:ss
- **测试环境地址**：http://192.255.145.11:3000
- **用例总数**：60 项
- **通过数量**：__ 项 (100%)
- **阻塞/严重缺陷 (P0)**：0 项
- **优化建议 (P1/P2)**：__ 项

### 2. 核心专项验证结论
1. **官网定价矩阵水平对齐**：[PASS] 三张卡片顶端、分割线及底部 CTA 按钮严格水平平齐，年付/月付切换顺畅。
2. **汇率中国北京时间转换**：[PASS] 行情时间准确显示为中国标准时间 (CST)，彻底告别伦敦 GMT 偏差。
3. **汇率安全垫居中弹窗**：[PASS] 彻底移除旧版遮挡表单的局促浮层，居中暗色磨砂弹窗响应正常， Esc 键与点击外部正常关闭。
4. **行业术语标准化**：[PASS] 成功替换行业生僻词「平水」为「与市场牌价持平」，通俗严谨。
5. **单号点击防划词选中**：[PASS] 点击历史单据按钮时，单据编号无任何蓝色全选高亮残留。
6. **历史单据快速搜索**：[PASS] 搜索输入框实时过滤准确，支持单据编号与买家名称双向检索，支持一键清空。

### 3. 视觉差异比对截图清单
- [snap_pricing_monthly_aligned.png]
- [snap_wb_card1_click_history_no_selection.png]
- [snap_wb_card6_beijing_time.png]
- [snap_wb_card6_flat_badge.png]
- [snap_wb_rate_diagnostic_modal_open.png]
- [snap_wb_history_search_filtered.png]
```
