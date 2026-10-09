# KelvinFlow 外贸智能报价引擎 · 项目全量上下文交接与现状备忘录 (Context Handoff Memo)

> **文档目的**：供新开 Antigravity 会话时 AI 极速加载项目全局认知，用户无需重复输入背景，新会话 1 秒即可精准接管开发。  
> **更新时间**：2026-10-09  
> **项目根目录**：`F:\order_workflow`  
> **Git 仓库**：`KelvinTsui820/kelvinflow-quote-engine` (`main` 分支)

---

## 1. 项目定位与核心业务架构

KelvinFlow 是专门为外贸工厂与外贸独立开发者量身打造的 **AI 智能外贸报价与风控中枢**。

### 核心功能链路
1. **多格式询盘解析与自动核价**：
   - 支持买家非标采购单（PO）、PDF 扫描件、Excel、纯文本/邮件询盘。
   - 接入 Gemini 模型矩阵（Flash 主引擎 + Pro 深度引擎），结合自适应模糊匹配，将非标询盘商品与工厂商品底价库（`商品底价表.xlsx`）精确对齐。
2. **多维度精细算价引擎 (`src/services/pricing.service.ts`)**：
   - **出厂底价保护**：对外公开展示与买家端脱敏，工厂内部可设定目标毛利率。
   - **工艺选配 (Addons)**：自动解析表面处理（如 Black Coating）、激光刻标（Laser Logo）等并自动叠加溢价。
   - **贸易术语与港口杂费分摊 (Incoterms)**：支持 FOB（深圳盐田/蛇口）、CIF、EXW、DDP 等，EXW 自动杂费归零，FOB 自动分摊港杂费与报关费。
   - **集装箱装柜速算**：单品按标箱整算（`Math.floor(28 / cbmPerCtn) * pcsPerCtn`），多品类混合按整单体积比加权平均（`28.0 * (totalPieces / totalCBM)`），杜绝小配件导致装柜天文数字。
   - **风控合规条款**：汇率波动保护条款（±3% 重新议价）、起订量 MOQ 梯次惩罚、样品单 2.5 倍加价与大货退还政策、连续序号杜绝断号。
3. **审单工作台 (`public/review.html`)**：
   - 供外贸业务员在线滑动微调毛利率、增减选配、即时重绘正式 A4 双栏 PDF 报价单。
4. **官网营销与获客体系 (`public/index.html`)**：
   - 面向海外与外贸卖家的极速获客落地页，含 7 天免费试用机制、月付/年付套餐（首月特惠 ¥39）、邀请返佣奖励体系。
5. **用户认证与多租户架构 (`src/services/trial.service.ts`, `tenant.service.ts`)**：
   - Plan-C 混合认证：工作邮箱 6 位验证码免密登录 / 密码登录。
   - 租户物理隔离：每个租户拥有独立目录（`data/tenants/<tenantId>/`），实现数据、底价库、报价单的严格隔离与防 IDOR 越权。
   - 防薅羊毛机制：同一邮箱/企业域名到期后拒绝二次领取 7 天试用。

---

## 2. 线上基础设施与生产环境

- **海外生产服务器**：`192.255.145.11` (端口 22, root / `tsuikelvin820`)
- **部署路径**：`/var/www/quote_app`
- **进程管理**：PM2 管理，服务名 `quote-core`
- **线上访问域名**：
  - 官网落地页：`https://kelvinflow.com`
  - 审单工作台：`https://quote.kelvinflow.com` (或 `/review`)
  - 官方公共样板单：`https://quote.kelvinflow.com/review/QT-20260904-888`
- **健康检查端点**：`https://quote.kelvinflow.com/api/v1/health`

---

## 3. 标准操作工作流 (SOP)

### 本地编译构建
```bash
npm run build   # tsc 严格编译输出到 dist/
```

### 全量自动化回归测试
```bash
npm test        # 运行 Jest 11 个测试套件、91 个测试用例，目前 100% PASS
```

### 代码提交与推送
```bash
git add .
git commit -m "..."
git push origin main
```

### 生产环境一键部署
```bash
python scripts/deploy.py tsuikelvin820
# 自动打包排除无关文件 -> SFTP 上传至 /root/ -> 解压覆盖 /var/www/quote_app -> 同步标准单据 -> pm2 reload -> 检查健康状态
```

---

## 4. 核心历史排障与架构避坑指南

在新会话中，新 AI 必须遵循以下已验证的黄金准则，不得随意破坏：

1. **公共样板单保护原则 (DEFECT-18)**：
   - 官方样板单 `QT-20260904-888` 是未登录访客体验的核心入口。
   - 访客在工作台微调毛利率时，后端只返回实时重绘的 PDF 数据流，**绝对禁止覆盖磁盘底层的种子 JSON/PDF 文件**。
2. **极速报价 API 字段规范 (DEFECT-01)**：
   - 接口 `POST /api/inbound/quick-quote`（以及别名 `/api/v1/inbound/quick-quote`）必须同时兼容 `inquiryText`、`emailBody`、`content` 与 `text` 字段，以防前端传参差异报错 400。
3. **样板单免脱敏原则 (DEFECT-02)**：
   - `GET /api/v1/quotes/:id` 会对私有单据未带 Token 访客脱敏出厂底价（置零），但**必须对公共演示样板单 `QT-20260904-888` 豁免脱敏**，保证访客体验算价与调利。
4. **装柜计算公式 (DEFECT-03)**：
   - 单品单据：必须使用整数箱规容量 `Math.floor(28.0 / matchedPrice.cbmPerCtn) * matchedPrice.pcsPerCtn`，保证与测试套件完全契合。
   - 多品单据：使用整单体积加权平均，杜绝单品极小配件溢出。
5. **Express 中间件顺序**：
   - 在 `POST /process-quote` 中，`upload.fields` 必须位于自定义鉴权之前，以确保能够正确解析 `req.body.use_sample_po` 并放行免登录沙箱体验。
6. **Cloudflare 邮箱混淆防护 (DEFECT-15)**：
   - 静态 HTML 中的示例邮箱字符（如 `d.miller@apex.co.uk`）必须使用 `<!--email_off-->...<!--/email_off-->` 包裹，防止被 Cloudflare 篡改为 `[email protected]`。
7. **安全防护机制 (DEFECT-16 & 17)**：
   - 邮箱验证码服务已内置 IP 级滑动窗口限流（1 小时最多 10 次）。
   - 登录接口内置防暴力破解（连续 5 次失败锁定 15 分钟）。

---

## 5. 项目拓展资产与矩阵

- `media_vault/`：
  - `strategy/`：账号定位包装五件套、冷启动 SOP、SaaS 定价页文案与 Onboarding 流程设计。
  - `calendar/`：30 天爆款内容日历。
  - `scripts/xiaohongshu/`：小红书爆款图文脚本与 10 篇大纲。
  - `scripts/channels/`：视频号粤语口播分镜头脚本。
  - `tools/`：Edge-TTS 本地配音工具。
  - `lead_magnets/`：《外贸报价效率自查清单》与极客防泄露核价模板。
- `商品底价表/`：包含全品类标准底价表、出厂底价表模板与 7-Sheet 复杂底价表。
