@echo off
chcp 65001 >nul
echo Stopping all running cloudflared instances...
taskkill /F /IM cloudflared.exe >nul 2>&1
echo Done.
pause
