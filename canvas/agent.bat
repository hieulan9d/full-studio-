@echo off
rem Bấm đúp: chạy Canvas Agent, lấy token, chép vào clipboard để kết nối Claude với canvas.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0connect-agent.ps1"
