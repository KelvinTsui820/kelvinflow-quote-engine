#!/bin/bash
# ==============================================================================
# KelvinFlow 子域名矩阵与 SSL 自动化配置脚本 (kelvinflow.com / quote / flow / n8n)
# ==============================================================================
set -e

echo "========================================================"
echo "⚡ 开始配置 KelvinFlow 多子域名矩阵与 SSL 安全证书..."
echo "========================================================"

DOMAIN="kelvinflow.com"
WWW_DOMAIN="www.kelvinflow.com"
QUOTE_DOMAIN="quote.kelvinflow.com"
FLOW_DOMAIN="flow.kelvinflow.com"
N8N_DOMAIN="n8n.kelvinflow.com"
EMAIL="tsuikelvin0804@gmail.com"

# 1. 修复并更新 n8n PM2 守护环境 (解决 secure cookie 拦截与 Webhook URL)
echo "[1/4] 更新 n8n 运行环境 (解除 secure cookie 拦截)..."
pm2 delete n8n 2>/dev/null || true
N8N_PORT=5678 N8N_SECURE_COOKIE=false N8N_EDITOR_BASE_URL=https://flow.kelvinflow.com/ WEBHOOK_URL=https://flow.kelvinflow.com/ pm2 start n8n --name "n8n" --max-memory-restart 600M
pm2 save
echo "n8n 守护进程已成功优化重启！"

# 1.1 增加 Nginx 全局头部与 URI 缓冲区 (彻底根除 OAuth 414 Request-URI Too Large 报错)
cat << 'BUFOF' > /etc/nginx/conf.d/buffers.conf
large_client_header_buffers 8 64k;
client_header_buffer_size 16k;
BUFOF


# 2. 写入 Nginx 多域名反向代理配置
echo "[2/4] 配置 Nginx 子域名虚拟主机..."
cat << 'EOF' > /etc/nginx/sites-available/kelvinflow
# 1. 主门户站点 (kelvinflow.com & www.kelvinflow.com)
server {
    listen 80;
    listen [::]:80;
    server_name kelvinflow.com www.kelvinflow.com;

    client_max_body_size 50M;

    # 自动将所有审单工作台请求重定向至专属子域名纯净路径
    location = /review/latest {
        return 301 https://quote.kelvinflow.com/;
    }
    location = /review/ {
        return 301 https://quote.kelvinflow.com/;
    }
    location = /review {
        return 301 https://quote.kelvinflow.com/;
    }
    location ^~ /review/ {
        return 301 https://quote.kelvinflow.com$request_uri;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
    }
}

# 2. 智能报价专署子域名 (quote.kelvinflow.com -> 直达审单台)
server {
    listen 80;
    listen [::]:80;
    server_name quote.kelvinflow.com;

    client_max_body_size 50M;

    # 彻底清除 /review/latest 后缀，自动 301 重定向到干净纯粹的根域名
    location = /review/latest {
        return 301 /;
    }
    location = /review/ {
        return 301 /;
    }
    location = /review {
        return 301 /;
    }

    # 根路径内部代理到 review.html 审单台，对外地址栏保持绝对纯粹的 https://quote.kelvinflow.com
    location = / {
        proxy_pass http://127.0.0.1:3000/review/latest;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
    }
}

# 3. 自动化调度专署子域名 (flow.kelvinflow.com & n8n.kelvinflow.com -> n8n 引擎)
server {
    listen 80;
    listen [::]:80;
    server_name flow.kelvinflow.com n8n.kelvinflow.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/kelvinflow /etc/nginx/sites-enabled/kelvinflow
rm -f /etc/nginx/sites-enabled/default

# 验证并平滑重载 Nginx
nginx -t
systemctl restart nginx
echo "Nginx 子域名反向代理已生效！"

# 3. 申请并扩展 Let's Encrypt SSL 证书 (包含所有子域名)
echo "[3/4] 正在向 Let's Encrypt 申请/扩展 SSL 安全证书..."
# 检查子域名 DNS 解析是否就绪
certbot --nginx \
    -d "$DOMAIN" \
    -d "$WWW_DOMAIN" \
    -d "$QUOTE_DOMAIN" \
    -d "$FLOW_DOMAIN" \
    --non-interactive \
    --agree-tos \
    -m "$EMAIL" \
    --redirect --expand || {
        echo "⚠️ 若个别子域名 DNS 尚未生效，先确保证书安全加载现有域名..."
        certbot --nginx -d "$DOMAIN" -d "$WWW_DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
    }

# 4. 防火墙配置
echo "[4/4] 检查防火墙与服务状态..."
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5678/tcp
ufw reload || true

echo "========================================================"
echo "🎉 恭喜！KelvinFlow 子域名矩阵与 SSL 证书配置完成！"
echo "========================================================"
echo "👉 官方门户首页：       https://kelvinflow.com"
echo "👉 智能报价工作台：     https://quote.kelvinflow.com"
echo "👉 自动化调度控制台：   https://flow.kelvinflow.com"
echo "========================================================"
