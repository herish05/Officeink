@echo off
setlocal
set "APP_DIR=%~dp0.."
set "LAN_IP=%LAN_IP%"
if "%LAN_IP%"=="" set "LAN_IP=192.168.0.26"

cd /d "%APP_DIR%\backend"
call npm install
call npm run build

cd /d "%APP_DIR%\frontend"
call npm install
set "VITE_API_BASE_URL=http://%LAN_IP%:5000/api"
set "VITE_SOCKET_URL=http://%LAN_IP%:5000"
call npm run build

cd /d "%APP_DIR%"
where pm2 >nul 2>nul
if errorlevel 1 (
  call npm install -g pm2
)

call pm2 delete officelink-backend >nul 2>nul
call pm2 start ecosystem.config.cjs --name officelink-backend --env production

if exist "C:\nginx\conf\nginx.conf" (
  if not exist "C:\nginx\conf\conf.d" mkdir "C:\nginx\conf\conf.d"
  copy /Y "%APP_DIR%\nginx\officelink.conf" "C:\nginx\conf\conf.d\officelink.conf"
  "C:\nginx\nginx.exe" -s reload
)

echo.
echo =====================================
echo OfficeLink LAN deployment is ready
echo Frontend: http://%LAN_IP%
echo Backend:  http://%LAN_IP%:5000
echo Admin:    EMP001 / Admin@123
echo =====================================
pause
