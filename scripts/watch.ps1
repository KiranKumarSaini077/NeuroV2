param(
  [int]$debounceSec = 30
)

$watchDir = Resolve-Path (Join-Path $PSScriptRoot "..\src")
$pushScript = Join-Path $PSScriptRoot "push.ps1"

Write-Host "👀 Watching $watchDir for changes (auto-push after ${debounceSec}s of inactivity)..." -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop" -ForegroundColor DarkGray

$timer = $null
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $watchDir
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

$action = {
  if ($timer) { $timer.Dispose() }
  $timer = New-Object System.Timers.Timer -ArgumentList 30000  # debounce ms
  $timer.AutoReset = $false
  Register-ObjectEvent -InputObject $timer -EventName Elapsed -Action {
    Write-Host "`n🔄 Change detected. Building + pushing..." -ForegroundColor Yellow
    & "powershell.exe" -File "$using:pushScript"
  } | Out-Null
  $timer.Start()
}

Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Deleted -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $action | Out-Null

# Keep alive
try {
  while ($true) { Start-Sleep -Seconds 5 }
} finally {
  $watcher.EnableRaisingEvents = $false
  $watcher.Dispose()
  if ($timer) { $timer.Dispose() }
  Get-EventSubscriber | Unregister-Event
}
