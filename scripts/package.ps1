param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
Set-Location $repoRoot

$plugin = Get-Content -Raw -Encoding UTF8 "plugin.json" | ConvertFrom-Json
$packageName = "qwenpaw-remote-plugin-$($plugin.version)"
$distRoot = Join-Path $repoRoot "dist"
$staging = Join-Path $distRoot $packageName
$zipPath = Join-Path $distRoot "$packageName.zip"

if (-not $SkipInstall) {
    npm --prefix ui ci
}
npm --prefix ui run build

Remove-Item -LiteralPath $distRoot -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $staging | Out-Null

Copy-Item -LiteralPath plugin.json, plugin.py, requirements.txt, context.py, ssh_manager.py, shell_wrapper.py, store.py, README.md, LICENSE -Destination $staging
Copy-Item -LiteralPath routers, tools -Destination $staging -Recurse

New-Item -ItemType Directory -Force -Path (Join-Path $staging "ui\dist") | Out-Null
Copy-Item -LiteralPath "ui\dist\index.js" -Destination (Join-Path $staging "ui\dist\index.js")

Get-ChildItem -Path $staging -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force
Get-ChildItem -Path $staging -Recurse -File -Include "*.pyc", "*.pyo" | Remove-Item -Force

Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath -Force

Write-Host "Created $zipPath"
