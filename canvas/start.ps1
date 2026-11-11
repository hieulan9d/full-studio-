# Khởi chạy FlowKit (backend, cổng 8100) + Infinite Canvas (web, cổng 3000) cùng lúc.
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$cfg = Join-Path $root ".flow-project-id"

if (-not (Test-Path $cfg)) {
    Write-Host "Nhập FLOW_PROJECT_ID (UUID trong URL project trên flow.google.com), Enter để bỏ qua:"
    $id = Read-Host
    Set-Content -Path $cfg -Value $id.Trim()
}
$env:FLOW_PROJECT_ID = (Get-Content $cfg -Raw).Trim()

Write-Host "[1/3] Cài phụ thuộc FlowKit..."
Push-Location "$root\flowkit"; python -m pip install -q -r requirements.txt; Pop-Location

Write-Host "[2/3] Cài phụ thuộc Canvas..."
if (-not (Test-Path "$root\app\web\node_modules")) {
    Push-Location "$root\app\web"; npm install --legacy-peer-deps; Pop-Location
}

Write-Host "[3/3] Chạy..."
$api = Start-Process python -ArgumentList "-m","agent.main" -WorkingDirectory "$root\flowkit" -PassThru
$proxy = Start-Process node -ArgumentList "index.js" -WorkingDirectory "$root\app\canvas-proxy" -PassThru
$web = Start-Process cmd -ArgumentList "/c","npm run dev" -WorkingDirectory "$root\app\web" -PassThru
Start-Sleep 6
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Canvas:  http://localhost:3000"
Write-Host "FlowKit: http://127.0.0.1:8100"
Write-Host "Lần đầu: nạp thư mục flowkit\extension vào Chrome (chrome://extensions > Load unpacked), mở flow.google.com đã đăng nhập."
Write-Host "Trong Canvas > Cài đặt: thêm provider Base URL http://127.0.0.1:8100 và dán script trong flow-canvas\."
Write-Host "Nhấn Enter để dừng tất cả."
Read-Host | Out-Null
taskkill /PID $api.Id /T /F | Out-Null
taskkill /PID $web.Id /T /F | Out-Null
taskkill /PID $proxy.Id /T /F | Out-Null
