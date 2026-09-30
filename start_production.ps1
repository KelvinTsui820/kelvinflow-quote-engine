# AI 外贸报价大脑一键启动脚本 (PowerShell)
$Host.UI.RawUI.WindowTitle = "AI 外贸报价大脑控制中心"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " 🚀 正在启动 AI 外贸智能报价与审单系统..." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $CurrentDir

# 1. 启动主服务
Write-Host "[1/2] 启动主服务进程 (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start"

Start-Sleep -Seconds 3

# 2. 启动 Cloudflare 隧道 (如果存在)
$CloudflaredPath = Join-Path $CurrentDir "bin\cloudflared.exe"
if (Test-Path $CloudflaredPath) {
    Write-Host "[2/2] 启动 Cloudflare 公网隧道..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$CloudflaredPath' tunnel --protocol http2 --url http://localhost:3000"
} else {
    Write-Host "[提示] 未检测到 bin\cloudflared.exe，可通过局域网 IP 直接访问。" -ForegroundColor Gray
}

Write-Host "`n✅ 系统已成功就绪！" -ForegroundColor Green
Write-Host "• 审单工作台: http://localhost:3000/review.html" -ForegroundColor Cyan
Write-Host "• 健康监控点: http://localhost:3000/api/v1/health" -ForegroundColor Cyan
