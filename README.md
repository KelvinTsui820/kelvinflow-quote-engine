# KelvinFlow AI - 国际外贸智能报价与审单工作流引擎

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**KelvinFlow AI** 是专为外贸出口制造企业、工贸一体出海团队打造的 **全自动 AI 询盘解析、成本核价、智能配柜与高转化商业报价单（Formal Quotation）引擎**。

> [!IMPORTANT]
> **AI 协同研发与功能对齐规范**：
> 本系统完整的业务逻辑架构、多租户数据拓扑、7-Sheet 标准底价规范、数学核价公式、API 报文定义、A4 黄金版面高度预算、IDOR 安全隔离机制及测试用例设计蓝图，已全量收录于 [**SYSTEM_SPECIFICATION.md**](./SYSTEM_SPECIFICATION.md)。
> 所有协同 AI Agent 与开发者在开发新功能或编写自动化测试时，请务必以此说明书为唯一事实基准（Single Source of Truth）。

---

## 🌟 核心特性与架构亮点

### 1. 多模态询盘智能解析 (Gemini AI Cascading Pipeline)
* 支持直接传入买家询盘文本、原始邮件正文或海外采购商 PDF 订单（PO/RFQ）。
* 内置 **多阶梯智能降级流水线**（`gemini-3.8-flash` 快速熔断 -> `gemini-3.7-flash` 深度推理 -> `gemini-3.5-flash` 高可用稳定基石 -> 本地结构化规则引擎），实现 100% 稳定出单。
* 自动提取：买家企业、联系人、SKU 型号、数量、表面工艺（选配 Add-ons）、贸易条款、交期与目的港。

### 2. 严密外贸成本与装柜速算引擎 (Pricing Engine)
* **底价与利润率隔离**：严格脱敏人民币成本底价，按期望毛利率自动测算外币售价。
* **选配工艺自动加价**：支持哑光喷涂、激光雕刻、加厚海绵等多种工艺自动计价。
* **海运装柜动态配载**：根据商品外箱体积自动测算总箱数、总 CBM、总毛重，并给出精准配载建议（如 `1x 40'HQ + LCL or 1x 20'GP`）。
* **多币种实时折算**：支持 USD、EUR、GBP、AUD 等主流外汇结算。

### 3. 外贸专家级商业 PDF 报价单 (Executive Quotation PDF)
* **国际商会 (Incoterms 2020) 标准规范**：CIF 提单副本结算、起运港/目的港航线闭环、出厂全测 + AQL 2.5/4.0 抽验标准、开放第三方（SGS/TÜV/BV）验货承诺。
* **反 BEC 邮件钓鱼安全架构**：报价阶段移除境外银行账户，置换为促成交出口增值权益卡片（1% 备件、OEM 麦头、验货报告、优惠原产地证 CO 协助）；正式 PI 阶段才下发专属美金账户。
* **严格锁定 A4 单页黄金版面**：自适应流式排版算法，杜绝文字跨页与元素折行重叠。

### 4. 在线微调审单工作台 (Interactive Workbench)
* 业务员可通过专属链接（`/review/:id`）在线核验 AI 提取结果，支持滑块微调利润率、快速改价并一键重新渲染高保真 PDF。

### 5. 多租户 SaaS 架构支持 (Multi-Tenant Ready)
* 支持不同工厂与独立团队通过 `tenantId` 隔离底价表、公司抬头与专属配置。

---

## 📁 目录结构概览

```text
order_workflow/
├── src/
│   ├── adapters/          # Excel 底价表解析与数据适配器
│   ├── controllers/       # API 路由控制器 (Quote / Review / Admin)
│   ├── services/          # 核心业务逻辑
│   │   ├── gemini.service.ts         # 多模态 AI 询盘提取引擎
│   │   ├── pricing.service.ts        # 外贸多维成本与装柜核算服务
│   │   ├── pdf.service.ts            # 专业外贸 PDF 渲染引擎
│   │   ├── tenant.service.ts         # 多租户管理与底价表缓存
│   │   ├── inbound-processor.service.ts # 入站邮件双轨自动出单
│   │   └── quote-store.service.ts    # 报价单持久化与历史查询
│   ├── types/             # 强类型数据模型定义
│   └── utils/             # SKU 归一化、金额大写、电话清洗等工具库
├── public/                # 前端静态单页应用与微调审单台
├── data/                  # 租户配置与初始模板 (敏感数据已 gitignore)
├── docs/                  # 业务说明与架构文档
├── media_vault/           # 营销物料与脚本资产库
├── tests/                 # 端到端自动化测试脚本
├── .env.example           # 环境变量示例文件
├── .gitignore             # 生产级代码提交忽略规则
└── package.json           # 项目依赖与启动脚本
```

---

## 🚀 快速上手 (Quick Start)

### 1. 克隆代码仓库
```bash
git clone https://github.com/your-username/order_workflow.git
cd order_workflow
```

### 2. 安装项目依赖
```bash
npm install
```

### 3. 配置环境变量
复制 `.env.example` 为 `.env` 并填入必要配置：
```bash
cp .env.example .env
```
主要环境变量说明：
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
DEFAULT_AI_MODEL=gemini-3.7-flash
FALLBACK_AI_MODEL=gemini-3.5-flash
DEFAULT_PROFIT_MARGIN=0.3
COMPANY_NAME="KelvinFlow Global Technology Co., Ltd."
```

### 4. 编译并启动服务
```bash
# 编译 TypeScript
npm run build

# 启动生产服务
npm start

# 或开发环境热重载
npm run dev
```

启动成功后，访问本地服务：
* 首页与快速试用：`http://localhost:3000`
* 在线审单台演示：`http://localhost:3000/review/QT-20260904-888`
* PDF 实时生成预览：`http://localhost:3000/api/v1/quotes/QT-20260904-888/pdf`

---

## 🔒 安全与隐私合规承诺

* **底价数据安全**：所有出厂底价、加价阶梯与供应商机密仅在服务端核算，面向海外买家的 PDF 及前端界面做全脱敏处理。
* **凭证隔离**：`.env`、真实客户询盘记录及企业内部备份均已默认配置入 `.gitignore`，防止意外泄露至公共开源代码仓库。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 授权许可。
