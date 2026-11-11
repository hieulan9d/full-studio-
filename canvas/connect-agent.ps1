# Chạy Canvas Agent (nếu chưa chạy), đợi sẵn sàng, lấy token và chép vào clipboard.
$ErrorActionPreference = "Stop"
$url = "http://127.0.0.1:17371"
$cfgFile = Join-Path $env:USERPROFILE ".infinite-canvas\canvas-agent.json"

function Test-Agent {
    try { (Invoke-RestMethod "$url/config" -TimeoutSec 2).ok } catch { $false }
}

if (Test-Agent) {
    Write-Host "Canvas Agent đã chạy sẵn."
} else {
    Write-Host "Đang khởi động Canvas Agent (cửa sổ mới, giữ nó mở)..."
    Start-Process cmd -ArgumentList "/k", "title Canvas Agent && npx -y @basketikun/canvas-agent@latest"
    $ready = $false
    for ($i = 0; $i -lt 90; $i++) {
        Start-Sleep 1
        if (Test-Agent) { $ready = $true; break }
    }
    if (-not $ready) { Write-Host "Không thấy Agent sau 90 giây. Xem cửa sổ Canvas Agent để biết lỗi."; Read-Host "Enter để đóng" | Out-Null; exit 1 }
}

$token = (Get-Content $cfgFile -Raw | ConvertFrom-Json).token
Set-Clipboard -Value $token

Write-Host ""
Write-Host "Agent sẵn sàng." -ForegroundColor Green
Write-Host "Local URL: $url"
Write-Host "Token:     $token"
Write-Host ""
Write-Host "Token đã được chép vào clipboard. Trong canvas bấm Agent > dán token > Connect (URL mặc định đã đúng)."
Write-Host "Sau đó mở phiên Claude Code mới để dùng công cụ infinite-canvas."
Start-Sleep 8
