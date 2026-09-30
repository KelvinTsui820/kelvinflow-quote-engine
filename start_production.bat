@echo off
chcp 65001 >nul
echo ========================================================
echo  🚀 启动 AI 外贸报价大脑生产服务与外网穿透通道
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] 正在启动后台核心服务 (Node.js Express on Port 3000)...
start "AI Quotation Core Server" cmd /k "npm start"

timeout /t 3 /nobreak >nul

if exist "%~dp0bin\cloudflared.exe" (
    echo [2/2] 正在启动 Cloudflare 稳定公网穿透通道...
    start "Cloudflare Tunnel" cmd /k ""%~dp0bin\cloudflared.exe" tunnel --protocol http2 --url http://localhost:3000"
) else (
    echo [提示] 未检测到 bin\cloudflared.exe，可通过局域网 IP:3000 直接访问。
)

echo.
echo ========================================================
echo  ✅ 服务已成功在后台启动！
echo  • 本地审单工作台: http://localhost:3000/review.html
echo  • 健康检查监控:   http://localhost:3000/api/v1/health
echo ========================================================
pause
