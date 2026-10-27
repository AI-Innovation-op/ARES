# ============================================================================
# A.R.E.S. - Instalador Táctico Global para Windows PowerShell (v3.8)
# ============================================================================

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  A.R.E.S. - INSTALADOR TÁCTICO GLOBAL (PowerShell v3.8)" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan

# 1. Verificar Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR CRÍTICO] Node.js no está instalado o no está en el PATH." -ForegroundColor Red
    Write-Host "Descárgalo e instálalo desde: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

$nodeVer = node -v
Write-Host "[1/3] Node.js detectado: $nodeVer" -ForegroundColor Green

# 2. Compilar CLI
$cliPath = Join-Path $PSScriptRoot "cli"
Write-Host "[2/3] Instalando dependencias y compilando CLI en: $cliPath" -ForegroundColor Yellow
Set-Location $cliPath

& npm.cmd install
& npm.cmd run build

# 3. Enlazar globalmente
Write-Host "[3/3] Registrando comando global 'ares' en Windows..." -ForegroundColor Yellow
& npm.cmd link

Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host "  ✅ INSTALACIÓN COMPLETADA CON ÉXITO" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Abre cualquier terminal CMD o PowerShell y escribe simplemente:" -ForegroundColor White
Write-Host "   ares`n" -ForegroundColor Yellow
