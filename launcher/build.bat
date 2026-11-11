@echo off
rem Build "full studido.exe" bang trinh bien dich C# co san trong Windows (khong can cai them gi).
cd /d "%~dp0"
set CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe
"%CSC%" /nologo /target:winexe /out:"..\full studido.exe" /reference:System.Windows.Forms.dll FullStudio.cs
if errorlevel 1 (echo Build loi & exit /b 1)
echo Da tao: %~dp0..\full studido.exe
