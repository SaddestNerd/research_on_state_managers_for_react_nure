# Full measurement series for the revised paper. Every condition is written
# into its own results directory and analysed separately. The conditions are
# ordered by importance, so the series can be stopped early; a finished run is
# skipped on a repeated start (bench-server keeps state.json).
#   powershell -ExecutionPolicy Bypass -File run-all.ps1
#   powershell -ExecutionPolicy Bypass -File run-all.ps1 -Tag q1 -Runs 1
#     (-Runs N: N runs of every mode in every condition, e.g. a quick preview)
param([string]$Tag = 'r2', [int]$Runs = 0)

Set-Location $PSScriptRoot
# Keep the computer from idle sleep while the series runs (released when this
# script exits; power settings are not changed).
Add-Type -Namespace Bench -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
[void][Bench.Power]::SetThreadExecutionState([uint32]'0x80000001')
$conditions = @(
	@{ name = "results-$Tag-base";        args = @('--cpu', '1', '--catalog', '10',   '--modes', 'fast', '--fast', '30') },
	@{ name = "results-$Tag-cpu4";        args = @('--cpu', '4', '--catalog', '10',   '--modes', 'fast', '--fast', '20') },
	@{ name = "results-$Tag-cat1000";     args = @('--cpu', '1', '--catalog', '1000', '--modes', 'fast', '--fast', '10') },
	@{ name = "results-$Tag-base-mem";    args = @('--cpu', '1', '--catalog', '10',   '--modes', 'mem60,mem300', '--mem60', '5', '--mem300', '5') },
	@{ name = "results-$Tag-cat100";      args = @('--cpu', '1', '--catalog', '100',  '--modes', 'fast,mem60', '--fast', '20', '--mem60', '3') },
	@{ name = "results-$Tag-cpu4-cat100"; args = @('--cpu', '4', '--catalog', '100',  '--modes', 'fast', '--fast', '10') }
)
foreach ($c in $conditions) {
	if ($Runs -gt 0) {
		$a = @($c.args)
		for ($i = 0; $i -lt $a.Count - 1; $i++) { if ($a[$i] -in '--fast', '--mem60', '--mem300') { $a[$i + 1] = "$Runs" } }		$c.args = $a
	}
	Write-Output "################ $($c.name)  $(Get-Date -Format 'HH:mm:ss')"
	node run-headless.js @($c.args) --out $c.name 2>&1 | Select-String -Pattern 'Series finished|skipping|restarting|Schedule' | ForEach-Object { $_.Line }
	node analyze.js $c.name 2>&1 | Select-Object -Last 1
}
Write-Output "################ ALL CONDITIONS FINISHED $(Get-Date -Format 'HH:mm:ss')"
