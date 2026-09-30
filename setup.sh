#!/bin/bash
# ==============================================================================
# KelvinFlow Enterprise AI Core & n8n 生产环境一键部署脚本 (Ubuntu 22.04)
# ==============================================================================
set -e

echo "========================================================"
echo "⚡ 开始配置 KelvinFlow 生产服务环境..."
echo "========================================================"

# 1. 配置 2GB 虚拟内存 (Swap)，保障 2GB 内存 VPS 永不 OOM
if [ ! -f /swapfile ]; then
    echo "[1/6] 正在创建 2GB Swap 虚拟内存..."
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap 创建完成："
    free -h
else
    echo "[1/6] Swap 已经存在，跳过创建："
    free -h
fi

# 2. 安装系统基础依赖与 Node.js 20 LTS + PM2
echo "[2/6] 检查并安装 Node.js 20 LTS 与 PM2..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl wget git tar ufw

if ! command -v node >/dev/null 2>&1; then
    echo "正在安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node 版本: $(node -v)"
echo "NPM 版本:  $(npm -v)"

if ! command -v pm2 >/dev/null 2>&1; then
    echo "正在安装 PM2 进程守护工具..."
    npm install -g pm2
fi

# 3. 安装 n8n 工作流引擎
echo "[3/6] 检查并安装 n8n..."
if ! command -v n8n >/dev/null 2>&1; then
    echo "正在全局安装 n8n (可能需要 1~2 分钟)..."
    npm install -g n8n
fi
echo "n8n 版本: $(n8n --version)"

# 4. 解压并部署 KelvinFlow 报价中枢应用
echo "[4/6] 部署 KelvinFlow 报价系统..."
mkdir -p /var/www/quote_app
cd /var/www/quote_app

if [ -f /root/project.tar.gz ]; then
    tar -xzf /root/project.tar.gz -C /var/www/quote_app
    echo "代码包解压完成！"
else
    echo "⚠️ 未在 /root/ 目录下找到 project.tar.gz，请确认文件是否已上传！"
fi

echo "安装生产依赖..."
npm install --production

# 5. 配置 PM2 启动服务与开机自启
echo "[5/6] 启动后台服务守护..."
pm2 delete quote-core 2>/dev/null || true
pm2 delete n8n 2>/dev/null || true

# 启动 KelvinFlow 报价核心中枢 (端口 3000)
pm2 start dist/index.js --name "quote-core" --max-memory-restart 500M

# 启动 n8n 工作流引擎 (端口 5678)
N8N_PORT=5678 pm2 start n8n --name "n8n" --max-memory-restart 600M

pm2 save
# 设置开机自启
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root 2>/dev/null || true

# 6. 配置 UFW 安全防火墙
echo "[6/6] 配置系统安全防火墙 (UFW)..."
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 3000/tcp comment 'KelvinFlow Review'
ufw allow 5678/tcp comment 'n8n Workflow'
echo "y" | ufw enable || true

sleep 3
echo "========================================================"
echo "🎉 部署全部成功！服务运行状态："
echo "========================================================"
pm2 list
echo ""
echo "📡 本地健康检查:"
curl -s http://localhost:3000/api/v1/health || echo "等待端口唤醒..."
echo ""
echo "--------------------------------------------------------"
echo "👉 你的服务已就绪："
echo "   - KelvinFlow 核对台: http://$(curl -s ifconfig.me):3000/review/latest"
echo "   - n8n 工作流后台:     http://$(curl -s ifconfig.me):5678"
echo "--------------------------------------------------------"
echo "🔒 【安全强化提醒】："
echo "   请立即在当前终端输入 passwd 回车，修改你的 root 密码！"
echo "========================================================"
