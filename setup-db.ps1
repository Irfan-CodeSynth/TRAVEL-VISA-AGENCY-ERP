#!/usr/bin/env pwsh
# ─── TravelCRM — Setup Database & Seed ──────────────────────────────────────
# Run once after installing PostgreSQL: .\setup-db.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $root "server"

Set-Location $serverDir

# Load .env
Get-Content (Join-Path $root ".env") | Where-Object { $_ -match "^[A-Z_]+=.+" } | ForEach-Object {
    $key, $val = $_ -split "=", 2
    $val = $val.Trim('"').Trim("'")
    [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
}

Write-Host "📦 Setting up TravelCRM database..." -ForegroundColor Cyan
Write-Host "   DATABASE_URL: $env:DATABASE_URL" -ForegroundColor DarkGray
Write-Host ""

# 1. Create database schema (push)
Write-Host "⚙️  Pushing schema to database..." -ForegroundColor Yellow
& node "../node_modules/prisma/build/index.js" migrate dev --name init
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration failed. Trying db push instead..." -ForegroundColor Red
    & node "../node_modules/prisma/build/index.js" db push
}

# 2. Seed
Write-Host ""
Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
& node "../node_modules/tsx/dist/cli.mjs" prisma/seed.ts

Write-Host ""
Write-Host "✅ Database setup complete!" -ForegroundColor Green
Write-Host "   Admin login: admin@travelcrm.com / Admin@123456" -ForegroundColor Cyan
