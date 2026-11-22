@echo off
setlocal
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo cloudflared belum terpasang.
  echo Install dari:
  echo https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
  pause
  exit /b 1
)
echo Pastikan START-BAI-SERVER.bat sudah berjalan.
echo URL publik HTTPS akan muncul di terminal ini.
cloudflared tunnel --url http://localhost:3001
pause
