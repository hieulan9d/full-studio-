# Installs the Claude Bridge panel into After Effects for the current Windows user.
#   1. copies panel\ to %APPDATA%\Adobe\CEP\extensions\com.claude.aebridge
#   2. sets PlayerDebugMode=1 under HKCU\Software\Adobe\CSXS.<n> so AE loads the
#      unsigned panel (only for this user; remove with -Uninstall)
# Restart After Effects afterwards, then open Window > Extensions > Claude Bridge.
param([switch]$Uninstall)

$ErrorActionPreference = 'Stop'
$src  = Join-Path $PSScriptRoot 'panel'
$dest = Join-Path $env:APPDATA 'Adobe\CEP\extensions\com.claude.aebridge'
$csxs = 9..13 | ForEach-Object { "HKCU:\Software\Adobe\CSXS.$_" }

if ($Uninstall) {
  if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
  foreach ($k in $csxs) { if (Test-Path $k) { Remove-ItemProperty $k -Name PlayerDebugMode -ErrorAction SilentlyContinue } }
  Write-Output "Đã gỡ panel và tắt PlayerDebugMode. Khởi động lại After Effects."
  return
}

New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item (Join-Path $src '*') $dest -Recurse -Force
foreach ($k in $csxs) {
  if (-not (Test-Path $k)) { New-Item $k -Force | Out-Null }
  Set-ItemProperty $k -Name PlayerDebugMode -Value '1' -Type String
}
Write-Output "Đã cài panel vào $dest"
Write-Output "Khởi động lại After Effects, rồi mở Window > Extensions > Claude Bridge."
