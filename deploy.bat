@echo off
chcp 65001 >nul
title KelvinFlow 云端部署工具
echo ===================================================
echo   KelvinFlow 云服务器自动化部署与热重启工具
echo   目标服务器: 192.255.145.11 (quote.kelvinflow.com)
echo ===================================================
echo.
python "%~dp0scripts\deploy.py" %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ 部署未完成，请检查密码或网络。
) else (
    echo.
    echo 🎉 部署完成！线上服务已顺利热重载。
)
pause
