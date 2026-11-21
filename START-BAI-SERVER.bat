@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum terpasang. Install Node.js LTS dari https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Memasang dependency project...
  call npm ci
  if errorlevel 1 (
    echo Instalasi dependency gagal.
    pause
    exit /b 1
  )
)

echo.
echo Menjalankan build frontend dan server multiplayer...
call npm run home-server
echo.
echo Server berhenti. Tekan tombol apa saja untuk menutup.
pause >nul
