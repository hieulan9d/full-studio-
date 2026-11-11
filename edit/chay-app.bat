@echo off
cd /d "%~dp0"
echo Mo http://localhost:5180
start "" http://localhost:5180
python app\server.py
