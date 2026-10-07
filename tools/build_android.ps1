$ErrorActionPreference='Stop'
$taskRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$cacheRoot=if(Test-Path -LiteralPath 'E:/AshenOath-BuildCache'){'E:/AshenOath-BuildCache'}else{$env:TEMP}
$mobileRoot=Join-Path $cacheRoot 'AshenOath-Belt-Mobile-20261007'
$mobileProject=Join-Path $mobileRoot 'AshenOath'
New-Item -ItemType Directory -Force -Path $mobileProject | Out-Null
foreach($name in @('Assets','Packages','ProjectSettings')) {
    $destination=[IO.Path]::GetFullPath((Join-Path $mobileProject $name))
    if(!$destination.StartsWith([IO.Path]::GetFullPath($mobileProject)+[IO.Path]::DirectorySeparatorChar)) { throw 'Invalid mobile build path' }
    if(Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Recurse -Force }
    Copy-Item -LiteralPath (Join-Path $taskRoot "AshenOath/$name") -Destination $destination -Recurse
}
Set-Content -LiteralPath (Join-Path $taskRoot 'QA/android-build-location.txt') -Value $mobileRoot
$unity='C:/Program Files/Unity/Hub/Editor/6000.6.2f1/Editor/Unity.exe'
$log=Join-Path $taskRoot 'QA/rebuild-android.log'
$arguments=@('-batchmode','-quit','-projectPath',('"'+$mobileProject+'"'),'-executeMethod','AshenOath.Editor.BuildTools.Android','-logFile',('"'+$log+'"'))
$started=Get-Date
$process=Start-Process -FilePath $unity -ArgumentList $arguments -WindowStyle Hidden -PassThru
$process.WaitForExit()
$report=Join-Path $mobileRoot 'QA/android-build.json'
if(!(Test-Path -LiteralPath $report) -or (Get-Item -LiteralPath $report).LastWriteTime -lt $started) { throw 'Android build did not produce a fresh report' }
$result=Get-Content -LiteralPath $report -Raw | ConvertFrom-Json
if($result.result -ne 'Succeeded') {throw 'Android build failed'}
Copy-Item -LiteralPath (Join-Path $mobileRoot 'Builds/Android/AshenOath.apk') -Destination (Join-Path $taskRoot 'Builds/Android/AshenOath.apk')
Copy-Item -LiteralPath $report -Destination (Join-Path $taskRoot 'QA/android-build.json')
Write-Output 'Fresh Android APK built from the belt-scroll project.'
