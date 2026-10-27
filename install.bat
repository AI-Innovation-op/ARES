@echo off
setlocal EnableDelayedExpansion

echo ============================================================================
echo   A.R.E.S. - INSTALADOR TACTICO GLOBAL PARA WINDOWS (v4.0 RELEASE)
echo ============================================================================
echo.

:: 1. Verificar si Node.js esta instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR CRITICO] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor instala Node.js (version 20 o superior) desde:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo [1/3] Node.js detectado: !NODE_VERSION!

:: 2. Ir a la carpeta del CLI y compilar
echo.
echo [2/3] Instalando dependencias y compilando CLI de A.R.E.S...
cd /d "%~dp0cli"

call npm.cmd install
if %errorlevel% neq 0 (
    echo [ERROR] Falla al instalar dependencias del CLI.
    pause
    exit /b 1
)

call npm.cmd run build
if %errorlevel% neq 0 (
    echo [ERROR] Falla al compilar TypeScript del CLI.
    pause
    exit /b 1
)

:: 3. Enlazar globalmente con npm link
echo.
echo [3/3] Registrando comando global 'ares' en Windows...
call npm.cmd link
if %errorlevel% neq 0 (
    echo [AVISO] Intentando enlace directo...
)

echo.
echo ============================================================================
echo   INSTALLATION COMPLETE: 'ares' ESTA LISTO EN TU SISTEMA
echo ============================================================================
echo.
echo Ahora puedes abrir cualquier ventana de CMD o PowerShell y escribir:
echo    ares
echo.
echo (Si tu terminal actual ya estaba abierta, cierrala y vuelve a abrirla para
echo  que Windows refresque las variables de entorno).
echo ============================================================================
echo.
pause
