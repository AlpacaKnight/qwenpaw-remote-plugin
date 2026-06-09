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
Copy-Item -Path "ui\dist\*" -Destination (Join-Path $staging "ui\dist")

Get-ChildItem -Path $staging -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force
Get-ChildItem -Path $staging -Recurse -File -Include "*.pyc", "*.pyo" | Remove-Item -Force

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
$zip = [System.IO.Compression.ZipFile]::Open(
    $zipPath,
    [System.IO.Compression.ZipArchiveMode]::Create
)
try {
    $stagingRoot = (Resolve-Path $staging).Path.TrimEnd("\", "/")
    Get-ChildItem -Path $staging -Recurse -File | ForEach-Object {
        $absolutePath = $_.FullName
        $entryName = $absolutePath.Substring($stagingRoot.Length + 1).Replace("\", "/")
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip,
            $absolutePath,
            $entryName,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
}
finally {
    $zip.Dispose()
}

Write-Host "Created $zipPath"
