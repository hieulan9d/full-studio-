# Kiểm tra và dọn sạch các tiến trình Photoshop.exe treo ngầm (MainWindowHandle == 0) hoặc Crash Processor
param([switch]$KillZombie = $true)

$procs = Get-Process -Name "*Photoshop*", "*Adobe Crash*" -ErrorAction SilentlyContinue
if (-not $procs) {
    Write-Output "[OK] Không có tiến trình Photoshop nào đang chạy ngầm."
    exit 0
}

foreach ($p in $procs) {
    $isCrash = $p.ProcessName -match "Crash"
    $isHiddenZombie = ($p.ProcessName -eq "Photoshop") -and ($p.MainWindowHandle -eq 0)
    Write-Output ("PID={0} | Name={1} | WindowHandle={2} | Title='{3}' | Start={4}" -f $p.Id, $p.ProcessName, $p.MainWindowHandle, $p.MainWindowTitle, $p.StartTime)
    if ($KillZombie -and ($isCrash -or $isHiddenZombie)) {
        Write-Output " -> Đang tắt tiến trình treo ngầm PID=$($p.Id) ($($p.ProcessName))..."
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    }
}
Write-Output "[DONE] Đã kiểm tra và làm sạch trạng thái Photoshop."
