#!/usr/bin/env pwsh
# ─── TravelCRM — Start Backend Server ───────────────────────────────────────
# Run from project root: .\start-server.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $root "server"

Set-Location $serverDir

# Load .env into current session
Get-Content (Join-Path $root ".env") | Where-Object { $_ -match "^[A-Z_]+=.+" } | ForEach-Object {
    $key, $val = $_ -split "=", 2
    $val = $val.Trim('"').Trim("'")
    [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
    Write-Host "  $key set" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "🚀 Starting TravelCRM Backend..." -ForegroundColor Cyan
Write-Host "   URL: http://localhost:$env:PORT" -ForegroundColor Green
Write-Host ""

& node "../node_modules/tsx/dist/cli.mjs" watch src/index.ts
