[CmdletBinding()]
param(
  [switch]$ResetDatabase
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeScript = Join-Path $scriptDir 'setup-project.mjs'
$arguments = @($nodeScript)

if ($ResetDatabase) {
  $arguments += '--reset-database'
}

& node @arguments
exit $LASTEXITCODE
