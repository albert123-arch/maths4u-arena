param([switch]$Stop)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
$taskLocal=Join-Path $taskRoot '.local'
$taskRuntime=Join-Path $taskLocal 'mariadb'
$taskData=Join-Path $taskLocal 'mysql-data'
$taskSecrets=Join-Path $taskLocal 'db-secrets.json'
$taskPidFile=Join-Path $taskLocal 'mysql.pid'
if($Stop) {
  if(Test-Path -LiteralPath $taskPidFile) {
    $taskServer=Get-Process -Id ([int](Get-Content -LiteralPath $taskPidFile)) -ErrorAction SilentlyContinue
    if($taskServer -and $taskServer.Path -eq (Join-Path $taskRuntime 'bin\mariadbd.exe')) { Stop-Process -Id $taskServer.Id }
  }
  exit
}
if(-not (Test-Path -LiteralPath (Join-Path $taskRuntime 'bin\mariadbd.exe'))) { throw 'Place a MariaDB Windows distribution in .local/mariadb. No system service is required.' }
New-Item -ItemType Directory -Force -Path $taskLocal | Out-Null
if(-not (Test-Path -LiteralPath $taskSecrets)) {
  if(Test-Path -LiteralPath $taskData) { throw 'Existing data without secrets; refusing to reinitialize.' }
  $taskBytes=New-Object byte[] 32
  $taskRng=[Security.Cryptography.RandomNumberGenerator]::Create()
  $taskRng.GetBytes($taskBytes)
  $taskRng.Dispose()
  $taskSecret=([BitConverter]::ToString($taskBytes)).Replace('-','').ToLowerInvariant()
  @{rootPassword=$taskSecret} | ConvertTo-Json | Set-Content -LiteralPath $taskSecrets
  & (Join-Path $taskRuntime 'bin\mariadb-install-db.exe') "--datadir=$taskData" "--password=$taskSecret" '--port=33317' --silent | Out-Null
  if($LASTEXITCODE -ne 0) {throw 'MariaDB initialization failed'}
}
if(Get-NetTCPConnection -LocalPort 33317 -State Listen -ErrorAction SilentlyContinue) {
  if(-not (Test-Path -LiteralPath $taskPidFile)) {throw 'Port occupied by an unknown instance'}
  Write-Output 'Local Maths4U database is already listening on 127.0.0.1:33317.'
  exit
}
$taskProcess=Start-Process -FilePath (Join-Path $taskRuntime 'bin\mariadbd.exe') -ArgumentList @("--defaults-file=$taskData\my.ini",'--bind-address=127.0.0.1','--port=33317',"--pid-file=$taskPidFile","--log-error=$taskLocal\mysql-error.log") -WindowStyle Hidden -PassThru
$taskProcess.Id | Set-Content -LiteralPath $taskPidFile
Write-Output 'Started isolated Maths4U MariaDB on 127.0.0.1:33317.'
