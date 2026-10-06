param([string]$Game = (Join-Path $PSScriptRoot '../Builds/Windows/AshenOath.exe'))
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$gamePath = [IO.Path]::GetFullPath($Game)
if (!(Test-Path -LiteralPath $gamePath)) { throw "Game executable is missing: $gamePath" }
$qaPath = Join-Path $taskRoot 'QA'
New-Item -ItemType Directory -Path $qaPath -Force | Out-Null
$resultPath = Join-Path $qaPath 'runtime-results.json'
$testStarted = Get-Date
Start-Process -FilePath $gamePath -ArgumentList @('-batchmode','-nographics','--verify',('"'+$resultPath+'"'),'-logFile',('"'+(Join-Path $qaPath 'runtime-release.log')+'"')) -WorkingDirectory $taskRoot -WindowStyle Hidden -Wait
if ((Get-Item -LiteralPath $resultPath).LastWriteTime -lt $testStarted) { throw 'Runtime report is stale' }
$runtime = Get-Content -LiteralPath $resultPath -Raw | ConvertFrom-Json
if (!$runtime.passed) { throw $runtime.error }
$sessions = @()
foreach ($role in @('host','client1','client2')) {
    $arguments = @('-batchmode','-nographics','--netcheck',('"'+(Join-Path $qaPath "net-$role.json")+'"'),'-logFile',('"'+(Join-Path $qaPath "net-$role.log")+'"'))
    if ($role -eq 'host') { $arguments += @('--host','7779') } else { $arguments += @('--join','127.0.0.1','--port','7779') }
    $sessions += Start-Process -FilePath $gamePath -ArgumentList $arguments -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru
}
foreach ($process in $sessions) { $process.WaitForExit(45000) | Out-Null; if (!$process.HasExited) { throw 'Network test did not finish in 45 seconds' } }
foreach ($role in @('host','client1','client2')) {
    $file = Join-Path $qaPath "net-$role.json"
    if ((Get-Item -LiteralPath $file).LastWriteTime -lt $testStarted) { throw "Network report is stale: $role" }
    $result = Get-Content -LiteralPath $file -Raw | ConvertFrom-Json
    if (!$result.passed) { throw "Network validation failed: $role" }
}
Write-Output "Passed: $($runtime.checks) runtime checks and three-process local LAN session."
