# Rebuilds the six versions of the test application with the benchmark harness
# and copies the production builds into bench/builds/<version>/.
#   powershell -ExecutionPolicy Bypass -File build-all.ps1 [version ...]
param([string[]]$Versions = @('redux', 'zustand', 'useContext', 'mobX', 'xState', 'zustand-mobx'))

$root = Split-Path -Parent $PSScriptRoot
$env:REACT_APP_API_URL = '/'
$env:GENERATE_SOURCEMAP = 'false'
$env:BROWSER = 'none'
$failed = @()
foreach ($v in $Versions) {
	Write-Output "=== building $v"
	Push-Location (Join-Path $root $v)
	npm run build 2>&1 | Select-String -Pattern 'Compiled|Failed|error|Error|warning' | ForEach-Object { $_.Line }
	$ok = $LASTEXITCODE -eq 0
	Pop-Location
	if (-not $ok) { $failed += $v; Write-Output "!!! $v FAILED"; continue }
	$dst = Join-Path $PSScriptRoot "builds\$v"
	if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
	Copy-Item -Recurse (Join-Path $root "$v\build") $dst
	Write-Output "=== $v -> builds\$v"
}
if ($failed.Count) { Write-Output "FAILED: $($failed -join ', ')"; exit 1 } else { Write-Output 'ALL BUILDS OK' }
