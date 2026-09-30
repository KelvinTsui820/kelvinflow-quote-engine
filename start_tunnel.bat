@echo off
chcp 65001 >nul
echo ========================================================
echo   Starting Cloudflare Public Tunnel (HTTP/2 Mode)...
echo ========================================================
echo.
echo [1/2] Checking if local server is running on port 3000...
netstat -ano | findstr ":3000" >nul
if %errorlevel% neq 0 (
    echo [!] Local server on port 3000 is not detected!
    echo     Please make sure "npm start" is running.
    pause
    exit /b 1
)

echo [2/2] Launching Cloudflare Tunnel...
echo.
echo Notice: A public HTTPS trycloudflare.com URL will be displayed below.
echo Press Ctrl+C to terminate the tunnel when you are done.
echo ========================================================
echo.
"%~dp0bin\cloudflared.exe" tunnel --protocol http2 --url http://localhost:3000
