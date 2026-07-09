param(
  [string]$msg = ""
)

# Load credentials
$envFile = Join-Path $PSScriptRoot "..\.env.local"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)=(.*)$') {
      [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
  }
}

$token = [System.Environment]::GetEnvironmentVariable("GITHUB_TOKEN")
$name  = [System.Environment]::GetEnvironmentVariable("GIT_USER_NAME")
$email = [System.Environment]::GetEnvironmentVariable("GIT_USER_EMAIL")
$remote = [System.Environment]::GetEnvironmentVariable("GIT_REMOTE")

if (-not $token) { Write-Host "❌ GITHUB_TOKEN not found in .env.local" -ForegroundColor Red; exit 1 }
if (-not $name) { $name = "KiranKumarSaini077" }
if (-not $email) { $email = "211097683+KiranKumarSaini077@users.noreply.github.com" }
if (-not $remote) { $remote = "https://github.com/KiranKumarSaini077/NeuroV2.git" }

# Ensure git path
$git = "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe"
if (-not (Test-Path $git)) { $git = "git" }

$repoDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoDir

# Build
Write-Host "🔨 Building..." -ForegroundColor Cyan
& $git config user.email $email
& $git config user.name $name
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Build failed" -ForegroundColor Red; exit 1 }
Write-Host "✅ Build OK" -ForegroundColor Green

# Commit
& $git add -A
$commitMsg = if ($msg) { $msg } else { "auto: update $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }
& $git commit -m $commitMsg
if ($LASTEXITCODE -ne 0) { Write-Host "ℹ️  Nothing to commit" -ForegroundColor Yellow; exit 0 }

# Push with token
$authUrl = "https://${name}:${token}@github.com/KiranKumarSaini077/NeuroV2.git"
& $git remote set-url origin $authUrl
& $git push
& $git remote set-url origin $remote  # clean token from remote

if ($LASTEXITCODE -eq 0) {
  Write-Host "🚀 Deployed!" -ForegroundColor Green
  Write-Host "   https://github.com/KiranKumarSaini077/NeuroV2/actions" -ForegroundColor Cyan
}
