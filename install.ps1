param([switch]$Local)
$ErrorActionPreference = 'Stop'
$aresArguments = @('--no-pause')
if ($Local) { $aresArguments += '--local' }
& (Join-Path $PSScriptRoot 'install.bat') @aresArguments
exit $LASTEXITCODE
