@echo off
rem Mở Infinite Canvas Flow dạng phần mềm (cửa sổ riêng, tự chạy FlowKit). Build lại web nếu chưa có.
cd /d "%~dp0"
if not exist app\web\dist\index.html (
  echo Dang build ban chinh thuc...
  call npm --prefix app\web run build
)
if not exist desktop\node_modules (
  echo Dang cai Electron...
  call npm --prefix desktop install
)
cd desktop
call npx electron .
