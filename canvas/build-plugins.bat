@echo off
rem Build plugin "Xuat file" (node xuat file ra thu muc). Ban build KHONG nam trong git nen may moi phai build.
rem Chay nhieu lan duoc: da co app\web\public\plugins\export.js thi bo qua.
cd /d "%~dp0"
if exist app\web\public\plugins\export.js exit /b 0
echo Dang build plugin Xuat file...
call npm --prefix app\plugins\canvas\sdk install || exit /b 1
call npm --prefix app\plugins\canvas\export install || exit /b 1
call npm --prefix app\plugins\canvas\export run build || exit /b 1
rem web\dist chua co plugin moi: xoa de app.bat build lai ban web
if exist app\web\dist rmdir /s /q app\web\dist
exit /b 0
