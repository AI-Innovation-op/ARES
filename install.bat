@echo off
setlocal
chcp 65001 >nul
set "ARES_LOCAL="
set "ARES_NO_PAUSE="
for %%A in (%*) do (
  if /i "%%~A"=="--local" set "ARES_LOCAL=1"
  if /i "%%~A"=="--no-pause" set "ARES_NO_PAUSE=1"
)
echo ARES CLI - instalacion para CMD y PowerShell
where node >nul 2>&1
if errorlevel 1 goto :node_error
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
if errorlevel 1 goto :node_error
where npm.cmd >nul 2>&1
if errorlevel 1 goto :npm_error
pushd "%~dp0cli"
if errorlevel 1 goto :directory_error
echo [1/3] Instalando dependencias del lockfile...
call npm.cmd ci --ignore-scripts --no-fund
if errorlevel 1 goto :failed
echo [2/3] Compilando CLI...
call npm.cmd run build
if errorlevel 1 goto :failed
if defined ARES_LOCAL goto :local_success
echo [3/3] Registrando el comando global ares...
call npm.cmd run install:global
if errorlevel 1 goto :failed
echo Instalacion completada. Abre una terminal y ejecuta: ares doctor
echo Si PowerShell restringe scripts, usa ares.cmd.
goto :success
:local_success
echo [3/3] Instalacion local completada. Ejecuta ares.cmd desde la raiz del proyecto.
:success
popd
if not defined ARES_NO_PAUSE pause
exit /b 0
:failed
popd
echo ERROR: la instalacion no se completo. Revisa el error anterior. 1>&2
if not defined ARES_NO_PAUSE pause
exit /b 1
:node_error
echo ERROR: instala Node.js 24 o superior desde https://nodejs.org/ 1>&2
goto :prerequisite_error
:npm_error
echo ERROR: npm.cmd no esta disponible. Revisa tu instalacion de Node.js. 1>&2
goto :prerequisite_error
:directory_error
echo ERROR: no se encuentra la carpeta cli junto al instalador. 1>&2
:prerequisite_error
if not defined ARES_NO_PAUSE pause
exit /b 2
