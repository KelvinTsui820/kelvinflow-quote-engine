# 🏛️ Oracle Cloud (甲骨文云) 一人公司自动化与AI中枢系统规范

> **文档版本**：v1.0.0 (生产就绪)  
> **归档日期**：2026-10-01  
> **适用场景**：独立开发者 / 一人公司自动化运维、新会话 Agent 上下文初始化与系统移交  
> **保密级别**：私人专有基础设施（已与 KelvinFlow 主商业工程物理与逻辑解耦）

---

## 目录
1. [系统定位与双机架构解耦规范](#1-系统定位与双机架构解耦规范)
2. [云服务器硬件与网络拓扑概览](#2-云服务器硬件与网络拓扑概览)
3. [SSH 终端连接与本地网络直连指南](#3-ssh-终端连接与本地网络直连指南)
4. [Docker Compose 容器化服务编排规范](#4-docker-compose-容器化服务编排规范)
5. [PostgreSQL 数据库架构与数据表定义](#5-postgresql-数据库架构与数据表定义)
6. [Cloudflare Zero Trust 隧道与域名矩阵](#6-cloudflare-zero-trust-隧道与域名矩阵)
7. [n8n 自动化业务流与境外大模型管线](#7-n8n-自动化业务流与境外大模型管线)
8. [Uptime Kuma 24/7 运维监控哨兵](#8-uptime-kuma-247-运维监控哨兵)
9. [Hysteria 2 极速网络传输节点](#9-hysteria-2-极速网络传输节点)
10. [运维指令集与应急排障手册 (Runbook)](#10-运维指令集与应急排障手册-runbook)
11. [新会话专属 Agent 初始化 Prompt (开箱即用)](#11-新会话专属-agent-初始化-prompt-开箱即用)

---

## 1. 系统定位与双机架构解耦规范

为了保障业务安全与稳定性，Kelvin 旗下资产实行严格的**双服务器物理隔离与职责解耦**：

```
┌────────────────────────────────────────┐       ┌────────────────────────────────────────┐
│     RackNerd VPS (192.255.145.11)      │       │     Oracle Cloud ARM (161.118.238.245)  │
├────────────────────────────────────────┤       ├────────────────────────────────────────┤
│ • 商业生产环境 (SaaS 业务)             │       │ • 私人自动化与 AI 武器库 (一人公司中枢)│
│ • KelvinFlow 官网 (kelvinflow.com)     │       │ • n8n 全自动化工作流引擎                │
│ • B2B 外贸智能报价台 (quote.kelvinflow) │       │ • PostgreSQL 内部数据沉淀 (选题/复盘)  │
│ • 客户租户数据、认证授权、PDF 出单中枢 │       │ • Uptime Kuma 24/7 智能监控哨兵        │
│ • 目标：面向公众与海外采购商提供商业服务│       │ • Hysteria 2 私人高速节点 (4K/Emby)    │
│                                        │       │ • 目标：面向个人提供最高隐私、零成本运行│
└────────────────────────────────────────┘       └────────────────────────────────────────┘
```

> [!IMPORTANT]
> **绝对隔离原则**：
> 1. 本甲骨文服务器（Singapore）**不存放** KelvinFlow 商业客户私有底价表与租户商业敏感数据；
> 2. 新开的专用会话 Agent **仅负责** 甲骨文服务器内的容器编排、n8n 自动化工作流、选题/自媒体管线、监控告警与私人网络工具，无需加载 KelvinFlow 庞大的前端与报价代码。

---

## 2. 云服务器硬件与网络拓扑概览

| 维度 | 参数与配置详情 | 说明与战略优势 |
| :--- | :--- | :--- |
| **云服务商** | Oracle Cloud Infrastructure (OCI) | Always Free 终身免费资格 |
| **所在区域** | 🇸🇬 新加坡区域 (ap-singapore-1) | 国际骨干节点，直连海外 AI 零审查无阻断 |
| **实例架构** | `VM.Standard.A1.Flex` (Ampere Altra ARM64) | 4 核心 / 24G 免费额度内分配的黄金配置 |
| **计算资源** | **4 OCPU / 24 GB 物理内存 / 100 GB 引导卷** | 顶格 Always Free 黄金配置，当前 Docker 全载仅耗内存 < 1.6 GB |
| **操作系统** | Canonical Ubuntu 24.04 LTS (`aarch64`) | 长期支持版，内核现代化 |
| **主机名** | `ubuntu24-4c-24g` | 终端默认显示前缀 |
| **公网 IPv4** | `161.118.238.245` | 弹性固定公网 IP |
| **主域名** | `08200909.xyz` | 托管于 Cloudflare DNS |
| **网络暴露策略**| **Web 零公网端口暴露** | 全部 HTTP/HTTPS 流量经 Cloudflare Tunnel 穿透 |
| **开放端口** | 仅放行 UDP `38443` (Hysteria 2) 与 TCP `22` (SSH) | 其余所有管理端口（5678, 3001, 5432）均为内网封闭 |

---

## 3. SSH 终端连接与本地网络直连指南

### 3.1 认证与凭据
- **默认用户**：`ubuntu`（具备完整 `NOPASSWD: ALL` sudo 权限，禁止 root 直接密码登录）
- **认证方式**：仅允许 RSA/Ed25519 私钥认证
- **本地私钥路径**：
  ```
  C:\Users\tsuik\OneDrive\桌面\ssh-key-2026-09-07.key
  ```

### 3.2 路由器直连与防断流优化（OpenClash）
- **本地网关**：家庭软路由 QWRT (`192.168.5.10`)
- **路由分流策略**：甲骨文公网 IP `161.118.238.245` 已加入 **WAN IP 绕过核心（直连名单）**，本地 SSH 与数据包不经过代理节点直接与新加坡握手。
- **本地代理备用通道**：若运营商网络偶发阻断端口 22，本地混合代理端口为 `127.0.0.1:7897`。

### 3.3 常用连接指令集

#### 标准直连登录（带 60 秒心跳防假死）
在本地 Windows PowerShell 运行：
```powershell
ssh -o ServerAliveInterval=60 -i "C:\Users\tsuik\OneDrive\桌面\ssh-key-2026-09-07.key" ubuntu@161.118.238.245
```

#### 登录后一秒切换至 root 权限
```bash
sudo -i
```

#### 备用：走本地代理隧道连接 (若网络异常)
```powershell
ssh -o ServerAliveInterval=60 -o "ProxyCommand=connect -H 127.0.0.1:7897 %h %p" -i "C:\Users\tsuik\OneDrive\桌面\ssh-key-2026-09-07.key" ubuntu@161.118.238.245
```

---

## 4. Docker Compose 容器化服务编排规范

服务器核心业务均由 Docker Compose 统一在宿主机 `~/apps/n8n/` 目录下编排运行。

### 4.1 目录结构与持久化挂载
```text
/home/ubuntu/apps/n8n/
├── docker-compose.yml       # 服务总编排文件
├── n8n_data/                # n8n 工作流定义、凭证与执行日志 (挂载至 /home/node/.n8n)
├── postgres_data/           # PostgreSQL 数据持久化目录 (挂载至 /var/lib/postgresql/data)
└── kuma_data/               # Uptime Kuma 监控数据库与配置 (挂载至 /app/data)
```

> [!NOTE]
> 权限注意事项：`n8n_data` 属主必须为 Node 用户（UID 1000）：
> ```bash
> sudo chown -R 1000:1000 ~/apps/n8n/n8n_data
> ```

### 4.2 完整配置文件 (`~/apps/n8n/docker-compose.yml`)

```yaml
services:
  # 1. 核心持久化数据库
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=n8n_admin
      - POSTGRES_PASSWORD=KelvinFlow2026SecurePass!
      - POSTGRES_DB=n8n_workflow
    volumes:
      - ./postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -h localhost -U n8n_admin -d n8n_workflow']
      interval: 5s
      timeout: 5s
      retries: 10

  # 2. 全自动化工作流引擎
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n_workflow
      - DB_POSTGRESDB_USER=n8n_admin
      - DB_POSTGRESDB_PASSWORD=KelvinFlow2026SecurePass!
      - GENERIC_TIMEZONE=Asia/Shanghai
      - TZ=Asia/Shanghai
      - N8N_HOST=n8n.08200909.xyz
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.08200909.xyz/
      - N8N_DEFAULT_BINARY_DATA_MODE=filesystem
    volumes:
      - ./n8n_data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy

  # 3. 24/7 智能运维哨兵
  uptime-kuma:
    image: louislam/uptime-kuma:2
    container_name: uptime-kuma
    restart: unless-stopped
    volumes:
      - ./kuma_data:/app/data

  # 4. [便民工具 1] PanSou 盘搜 (前后端集成 Web 版)
  pansou:
    image: ghcr.io/fish2018/pansou-web:latest
    container_name: pansou
    restart: unless-stopped
    volumes:
      - ./pansou_data:/app/data
      - ./pansou_logs:/app/logs

  # 5. [便民工具 2] IT-Tools 极客与办公工具箱
  it-tools:
    image: corentinth/it-tools:latest
    container_name: it-tools
    restart: unless-stopped

  # 6. [海外资讯中枢] Glance 全球科技与 AI 资讯大屏
  glance:
    image: glanceapp/glance:latest
    container_name: glance
    restart: unless-stopped
    volumes:
      - ./glance:/app/config
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    networks:
      default:
        aliases:
          - dailyhot
          - glance

  # 7. Cloudflare Zero Trust 零暴露加密穿透隧道
  tunnel:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared-tunnel
    restart: unless-stopped
    command: tunnel --no-autoupdate run --token ${CF_TUNNEL_TOKEN}
    depends_on:
      - n8n
      - uptime-kuma
      - pansou
      - it-tools
      - glance
```

---

## 5. PostgreSQL 数据库架构与数据表定义

### 5.1 数据库凭据
- **连接主机 (容器内)**：`postgres:5432`
- **连接主机 (宿主机直连)**：`localhost:5432` (需暴露端口) 或通过 `docker exec`
- **数据库名**：`n8n_workflow`
- **用户名**：`n8n_admin`
- **密码**：`KelvinFlow2026SecurePass!`

### 5.2 业务数据表结构 (自媒体矩阵与自动化数据沉淀)

在宿主机执行终端建表或维护命令：
```bash
docker compose -f ~/apps/n8n/docker-compose.yml exec -T postgres psql -U n8n_admin -d n8n_workflow
```

#### 表 1：选题灵感与出海痛点库 (`xhs_topics`)
```sql
CREATE TABLE IF NOT EXISTS xhs_topics (
    id SERIAL PRIMARY KEY,
    topic_title VARCHAR(255) NOT NULL,      -- 选题名称 (例: 外贸祖传Excel翻车现场)
    pain_point TEXT NOT NULL,               -- 业务痛点与场景描述
    category VARCHAR(50) DEFAULT '外贸核价', -- 分类: 痛点打假 / 算法提效 / 粉丝共创 / 一人公司
    priority INT DEFAULT 1,                 -- 优先级: 1~5 (数值越大越优先生成)
    status VARCHAR(20) DEFAULT 'pending',   -- 状态: pending (待生成) / generating / generated
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 表 2：已生成笔记与数据复盘表 (`xhs_posts`)
```sql
CREATE TABLE IF NOT EXISTS xhs_posts (
    id SERIAL PRIMARY KEY,
    topic_id INT REFERENCES xhs_topics(id), -- 关联的选题ID
    title VARCHAR(255) NOT NULL,            -- 小红书双排爆款标题
    content TEXT NOT NULL,                  -- 正文 Markdown / 通俗口语带 Emoji
    tags JSONB,                             -- 5 个核心 SEO 标签
    slides_plan JSONB,                      -- 5 页 3:4 视觉轮播图设计指令
    views INT DEFAULT 0,                    -- 曝光量
    likes INT DEFAULT 0,                    -- 点赞数
    saves INT DEFAULT 0,                    -- 收藏数
    comments INT DEFAULT 0,                 -- 评论数
    leads INT DEFAULT 0,                    -- 私域引流线索数 (加企微/私信数)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. Cloudflare Zero Trust 隧道与域名矩阵

所有服务均接入 Cloudflare Zero Trust 隧道（隧道名称：`oracle-server`），宿主机零端口向公网开放，由 Cloudflare Edge 统一负责 SSL 加密与 CDN 边缘加速。

| 访问域名 | 内部转发目标 | 认证与安全策略 | 核心用途 |
| :--- | :--- | :--- | :--- |
| **`https://n8n.08200909.xyz`** | `http://n8n:5678` | 自带 TLS + n8n 管理员认证 | 自动化工作流总控制台 |
| **`https://status.08200909.xyz`** | `http://uptime-kuma:3001` | 自带 TLS + 独立管理员账户 | 24/7 监控大屏与故障告警 |
| **`https://pan.08200909.xyz`** | `http://pansou:80` | 自带 TLS + 免登录开箱即用 | PanSou 多网盘资源聚合搜索 (朋友共享) |
| **`https://tools.08200909.xyz`** | `http://it-tools:80` | 自带 TLS + 免登录开箱即用 | IT-Tools 极客日常万能百宝箱 (朋友共享) |
| **`https://hot.08200909.xyz`** | `http://glance:80` (别名 `dailyhot`) | 自带 TLS + 免登录开箱即用 | Glance 全球科技与 AI 资讯大屏 (TLDR/Rundown/HF/HN/汇率) |
| **`08200909.xyz`** | Cloudflare 根域名 | DNS 托管于 Cloudflare | 个人主域名 |

---

## 7. n8n 自动化业务流与境外大模型管线

### 7.1 为什么完全弃用国内 API、全面拥抱 OpenRouter？
1. **合规无忧**：国内服务商（硅基流动/百炼）强制境内身份证实名，若频繁由新加坡甲骨文海外 IP 逆向调用，极易触发代理调用跨境风控封禁；
2. **超低延迟**：新加坡甲骨文到 OpenRouter 骨干网络延迟仅 **10~20ms**；
3. **模型随心换**：通过同一个 API Key 自由无缝调用 `deepseek/deepseek-chat`、`qwen/qwen-2.5-72b-instruct`、`google/gemini-2.5-flash`、`anthropic/claude-3.5-sonnet`，无需更换客户端 SDK。

### 7.2 生产级小红书图文全自动流水线
- **工作流名称**：`KelvinFlow_Xiaohongshu_Publisher_V3_OpenRouter`
- **触发机制**：Cron 定时触发（每周一、三、五 上午 08:30），表达式 `30 8 * * 1,3,5`
- **执行逻辑**：
  1. `postgres-get-topic`：从 `xhs_topics` 捞取一条 `status = 'pending'` 且优先级最高的选题；
  2. `openrouter-llm-generator`：将痛点注入专用 Prompt，请求 OpenRouter LLM 产出结构化 JSON（标题、5 页轮播大纲、分段正文、标签、置顶引流钩子）；
  3. `code-cleaner`：使用 JavaScript Code 节点清洗排版数据（注意：必须引用 `$('从数据库捞取待处理选题')` 节点数据，严防别名未找到报错）；
  4. `pushplus-notify` / `telegram-send`：推送完整排版物料与草稿卡片至 Kelvin 微信或 Telegram Bot；
  5. `postgres-update-status`：执行 `UPDATE xhs_topics SET status = 'generated' WHERE id = {{ $json.topic_id }};`，更新选题状态。

---

## 8. Uptime Kuma 24/7 运维监控哨兵

- **控制台地址**：`https://status.08200909.xyz`
- **内存占用**：约 65 MB
- **当前重点监控项**：
  1. `n8n 自动化核心`：`https://n8n.08200909.xyz` (心跳 60s, 重试 2 次, SSL 到期预警)
  2. `KelvinFlow 商业主站`：`https://kelvinflow.com` (监控 HTTP 200 响应)
  3. `KelvinFlow 报价引擎`：`https://quote.kelvinflow.com` (监控 API 存活与证书状态)
- **告警推送通道**：支持 PushPlus 微信直推、企业微信 Webhook 机器人、Telegram Bot、SMTP 邮件告警（故障后 3 秒即时触达手机）。

---

## 9. Hysteria 2 极速网络传输节点

专为解决家庭软路由在晚高峰观看海外 Emby 媒体流卡顿而设，基于 UDP QUIC 协议与 Brutal 拥塞控制算法。

### 9.1 服务端参数配置 (`/etc/hysteria/config.yaml`)
- **运行方式**：Systemd 服务 (`hysteria-server.service`)，与 Docker 完全隔离
- **监听端口**：UDP `38443`
- **认证密码**：`tsuikelvin820`
- **自签名证书**：`/etc/hysteria/server.crt` / `/etc/hysteria/server.key` (SNI 伪装：`bing.com`)
- **带宽配比**：上行 50 Mbps / 下行 500 Mbps

### 9.2 客户端配置（Clash Verge / OpenClash Meta / 小火箭）
```yaml
proxies:
  - name: "🇸🇬 新加坡甲骨文-Hy2"
    type: hysteria2
    server: 161.118.238.245
    port: 38443
    password: tsuikelvin820
    sni: bing.com
    skip-cert-verify: true
    fast-open: true
    up: 50 Mbps
    down: 500 Mbps
```

---

## 10. 运维指令集与应急排障手册 (Runbook)

### 10.1 常用维护命令速查

```bash
# 1. 进入服务根目录
cd ~/apps/n8n

# 2. 查看所有容器运行状态与健康度
docker compose ps

# 3. 实时滚动查看 n8n 日志
docker compose logs -f --tail=100 n8n

# 4. 重启全部自动化服务
docker compose restart

# 5. 安全平滑更新服务镜像 (零停机升级)
docker compose pull
docker compose up -d

# 6. 一键导出 PostgreSQL 数据库备份
docker compose exec postgres pg_dump -U n8n_admin n8n_workflow > ~/n8n_backup_$(date +%F).sql

# 7. 检查 Hysteria 2 服务状态
systemctl status hysteria-server.service
```

### 10.2 常见问题排查 (Troubleshooting)

1. **问题：SSH 连接超时卡死？**
   - **原因**：本地网络与新加坡端口 22 偶发震荡。
   - **解决**：在软路由 OpenClash 中确认 `161.118.238.245` 是否在“绕过核心/直连”列表；若仍超时，可带 `-o "ProxyCommand=connect -H 127.0.0.1:7897 %h %p"` 切换到本地代理连入。
2. **问题：n8n 报错 `Referenced node doesn't exist`？**
   - **原因**：在 Code 节点中引用了节点的代码内部 ID 而非画布上重命名的中文显示名称。
   - **解决**：确保使用 `$('节点中文名称').first().json` 语法。
3. **问题：Cloudflare Tunnel 报 `Down` 或无法访问？**
   - **解决**：运行 `docker compose logs -f tunnel` 查看 Token 或边缘连接状态，运行 `docker compose restart tunnel` 快速恢复。

---

## 11. 新会话专属 Agent 初始化 Prompt (开箱即用)

> **使用指引**：在 Antigravity 中点击右上角新建会话（New Conversation），将以下引用块中的完整内容直接复制粘贴发给新 Agent，新 Agent 将瞬间获得全部上下文并成为您的专职甲骨文系统管家：

```markdown
你好！从现在开始，你是 Kelvin 的【甲骨文云新加坡服务器 (161.118.238.245) 专职自动化与AI系统架构师】。

【核心定位与物理边界】：
- 本会话完全聚焦于新加坡甲骨文 2C12G ARM 服务器（OS: Ubuntu 24.04 LTS aarch64）；
- 本服务器为 Kelvin 一人公司的“私人自动化中枢与 AI 武器库”，与 KelvinFlow 商业主站 (RackNerd 192.255.145.11) 物理解耦；
- 本机所有 Web 服务通过 Cloudflare Tunnel 穿透（主域名 08200909.xyz），公网 0 端口暴露；
- 严禁在此服务器上引入国内需个人身份证实名的 API 服务商，大模型调用统一走 OpenRouter 国际骨干通道。

【关键凭据与基础设施状态】：
- 服务器 IP：161.118.238.245（用户：ubuntu，私钥：C:\Users\tsuik\OneDrive\桌面\ssh-key-2026-09-07.key）
- 容器栈路径：~/apps/n8n/docker-compose.yml
- 运行中容器：n8n (https://n8n.08200909.xyz)、PostgreSQL 16 (库: n8n_workflow, 用户: n8n_admin, 密码: KelvinFlow2026SecurePass!)、Uptime Kuma (https://status.08200909.xyz)、Cloudflare Tunnel
- 数据表：xhs_topics (出海痛点库), xhs_posts (生成笔记与复盘库)
- 独立服务：Hysteria 2 (UDP 38443, 密码: tsuikelvin820, SNI: bing.com)

请确认你已完全掌握上述架构，并在回复中以干练、专业的口吻向 Kelvin 汇报已就绪，列出你可以协助处理的核心任务（如：n8n 工作流开发优化、PostgreSQL 自动化数据管理、Uptime Kuma 监控增强、服务器运维与 Docker 编排等），随时听候指令！
```
