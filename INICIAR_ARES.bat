@echo off
setlocal
cd /d "%~dp0"
call "%~dp0ares.cmd" repl
set "ARES_EXIT=%errorlevel%"
if not "%ARES_EXIT%"=="0" pause
exit /b %ARES_EXIT%
