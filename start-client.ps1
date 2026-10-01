#!/usr/bin/env pwsh
# ─── TravelCRM — Start Frontend Dev Server ──────────────────────────────────
# Run from project root: .\start-client.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$clientDir = Join-Path $root "client"

Set-Location $clientDir

Write-Host ""
Write-Host "🎨 Starting TravelCRM Frontend..." -ForegroundColor Magenta
Write-Host "   URL: http://localhost:5173" -ForegroundColor Green
Write-Host ""

& node "../node_modules/vite/bin/vite.js" --host
