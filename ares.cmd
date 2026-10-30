@echo off
setlocal
chcp 65001 >nul
where node >nul 2>&1
if errorlevel 1 (
  echo ARES requiere Node.js 24 o superior. 1>&2
  exit /b 2
)
if not exist "%~dp0cli\dist\index.js" (
  echo Primero ejecuta npm run setup desde la carpeta de ARES. 1>&2
  exit /b 2
)
node "%~dp0cli\dist\index.js" %*
exit /b %errorlevel%
