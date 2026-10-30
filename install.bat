@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

echo ============================================================================
echo   A.R.E.S. - INSTALADOR TACTICO GLOBAL PARA WINDOWS (v4.5 RELEASE)
echo   Created by AI Innovation
echo ============================================================================
echo.

:: 1. Verificar si Node.js esta instalado
where node >nul 2>&1
if errorlevel 1 goto :no_node

:: 2. Verificar si npm esta disponible
where npm >nul 2>&1
if errorlevel 1 goto :no_npm

for /f "tokens=*" %%v in ('node -v 2^>nul') do set NODE_VERSION=%%v
echo [1/4] Node.js detectado con exito: !NODE_VERSION!

:: 3. Ir a la carpeta del CLI y verificar su existencia
if not exist "%~dp0cli" goto :no_cli_dir
cd /d "%~dp0cli"

:: 4. Instalar dependencias
echo.
echo [2/4] Instalando dependencias del CLI de A.R.E.S...
call npm.cmd install
if errorlevel 1 goto :install_error

:: 5. Compilar TypeScript
echo.
echo [3/4] Compilando codigo TypeScript del CLI...
call npm.cmd run build
if errorlevel 1 goto :build_error

:: 6. Registrar comando globalmente
echo.
echo [4/4] Registrando comando global 'ares' en Windows...
call npm.cmd link
if errorlevel 1 (
    echo [AVISO] 'npm link' emitio una advertencia, continuando configuracion...
)

:: 7. Desbloquear politicas de scripts en PowerShell para el usuario actual
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force } catch {}" >nul 2>&1

echo.
echo ============================================================================
echo   INSTALACION COMPLETADA CON EXITO: 'ares' ESTA LISTO EN TU SISTEMA
echo ============================================================================
echo.
echo Ahora puedes abrir cualquier ventana de CMD o PowerShell y escribir:
echo    ares
echo.
echo Para forjar un nuevo proyecto DDD paso a paso con empaquetado en .ZIP:
echo    ares forge
echo.
echo NOTA: Si tenias una terminal ya abierta antes de instalar, cierrala
echo y abre una nueva para que Windows reconozca el comando 'ares'.
echo ============================================================================
echo.
pause
exit /b 0

:no_node
echo.
echo ============================================================================
echo   [AVISO CRITICO] NODE.JS NO ESTA INSTALADO EN ESTA COMPUTADORA
echo ============================================================================
echo.
echo A.R.E.S. requiere Node.js (version 20 o superior) para funcionar.
echo El comando 'node' no se encontro en las variables de entorno (PATH).
echo.
echo Pasos rapidos para solucionarlo:
echo   1. Presiona cualquier tecla para abrir https://nodejs.org/ en tu navegador.
echo   2. Descarga e instala la version recomendada (LTS o Current).
echo   3. En el instalador, asegurate de dejar marcada la casilla "Add to PATH".
echo   4. Una vez instalado Node.js, vuelve a dar doble clic a este 'install.bat'.
echo.
echo ============================================================================
echo Presiona cualquier tecla para abrir la pagina oficial de descarga...
pause >nul
start https://nodejs.org/
exit /b 1

:no_npm
echo.
echo ============================================================================
echo   [ERROR] NODE.JS DETECTADO PERO NPM NO ESTA DISPONIBLE
echo ============================================================================
echo Reinstala Node.js desde https://nodejs.org/ marcando "Add to PATH".
pause
exit /b 1

:no_cli_dir
echo.
echo ============================================================================
echo   [ERROR] NO SE ENCONTRO LA CARPETA 'cli'
echo ============================================================================
echo Ubicacion esperada: %~dp0cli
echo Asegurate de haber extraido/descomprimido completamente el archivo .ZIP
echo antes de ejecutar 'install.bat'. No lo ejecutes dentro del archivo comprimido.
echo.
pause
exit /b 1

:install_error
echo.
echo ============================================================================
echo   [ERROR] FALLA AL INSTALAR LAS DEPENDENCIAS DE NPM
echo ============================================================================
echo Verifica tu conexion a internet e intenta nuevamente.
pause
exit /b 1

:build_error
echo.
echo ============================================================================
echo   [ERROR] FALLA AL COMPILAR EL CLI CON TYPESCRIPT
echo ============================================================================
pause
exit /b 1
