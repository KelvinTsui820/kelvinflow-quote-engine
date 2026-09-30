# 🚀 AI 外贸智能报价大脑：海外 VPS 5 分钟极速部署指引

## 1. 推荐服务器配置（免备案、原生极速调用 Gemini）
* **推荐机房**：中国香港（延迟极低，首选）或 美国西海岸（洛杉矶/硅谷）。
* **推荐厂商**：
  * **轻量首选**：阿里云香港轻量 / 腾讯云香港轻量 / 搬瓦工（约 24 ~ 35 元人民币/月）。
  * **海外主流**：DigitalOcean / Vultr / Hetzner（约 $5 ~ $6 美元/月）。
* **系统要求**：Ubuntu 22.04 LTS（1 核 CPU / 1GB 或 2GB 内存即可跑起）。

## 2. 部署三步法
```bash
# 第 1 步：在 VPS 安装 Docker 与 Docker Compose
curl -fsSL https://get.docker.com | bash

# 第 2 步：将代码上传至服务器并进入目录
git clone <你的私有仓库地址> /app/order_workflow
cd /app/order_workflow

# 第 3 步：配置环境变量并一键启动
cp .env.example .env
nano .env   # 填入你的 GEMINI_API_KEY
docker compose up -d --build
```

## 3. 验证服务状态
访问：`http://<你的VPS公网IP>:3000/api/v1/health`
返回 `{"status":"ok","service":"Quotation Core Engine"}` 即代表启动成功！
