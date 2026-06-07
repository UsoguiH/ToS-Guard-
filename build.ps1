# ToS Guard — build & package script
# ---------------------------------------------------------------
# Packs the extension into a clean .zip ready for upload to the
# Chrome Web Store Developer Dashboard or for distribution.
#
# Usage:
#   .\build.ps1                # builds dist/tos-guard-<version>.zip
#   .\build.ps1 -OutDir D:\out # custom output directory
# ---------------------------------------------------------------

param(
    [string]$OutDir = "dist"
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

# Read version from manifest.json
$manifest = Get-Content -Path "manifest.json" -Raw | ConvertFrom-Json
$version  = $manifest.version
$name     = ($manifest.name -replace "[^A-Za-z0-9]", "-").ToLower()

Write-Host "ToS Guard build" -ForegroundColor Cyan
Write-Host "  name:    $name"
Write-Host "  version: $version"
Write-Host ""

# Files / directories to include in the package.
$include = @(
    "manifest.json",
    "background",
    "content",
    "popup",
    "options",
    "history",
    "legal",
    "offscreen",
    "icons",
    "lib",
    "assets"
)

# Files / directories to exclude — never ship build artifacts, sources,
# or anything in the toolchain.
$excludePatterns = @(
    "*.ps1",
    "*.py",
    "*.md",
    ".git*",
    "node_modules",
    "dist",
    "build",
    "*.zip",
    "designmd.txt",
    "demo.mp4",
    "demo.gif",
    "demo-poster.png"
)

# Verify required directories exist.
foreach ($p in $include) {
    if (-not (Test-Path -Path $p)) {
        Write-Host "ERROR: required path '$p' not found." -ForegroundColor Red
        exit 1
    }
}

# Validate manifest sanity (catch the most common Web-Store rejections early).
if ($manifest.manifest_version -ne 3) {
    Write-Host "ERROR: manifest_version must be 3 for Chrome Web Store." -ForegroundColor Red
    exit 1
}
if (-not $manifest.icons -or -not $manifest.icons."128") {
    Write-Host "WARNING: 128px icon missing — Web Store requires it." -ForegroundColor Yellow
}
if ($manifest.homepage_url -match "your-org") {
    Write-Host "WARNING: homepage_url still contains placeholder 'your-org' — update before submission." -ForegroundColor Yellow
}

# Prepare staging directory.
$stagingRoot = Join-Path $OutDir ".staging"
if (Test-Path $stagingRoot) { Remove-Item -Recurse -Force $stagingRoot }
New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null

# Copy each include path to staging.
foreach ($p in $include) {
    $dest = Join-Path $stagingRoot $p
    if ((Get-Item $p).PSIsContainer) {
        Copy-Item -Recurse -Force -Path $p -Destination $dest
    } else {
        Copy-Item -Force -Path $p -Destination $dest
    }
}

# Strip excluded patterns from staging.
foreach ($pat in $excludePatterns) {
    Get-ChildItem -Path $stagingRoot -Recurse -Include $pat -Force -ErrorAction SilentlyContinue | ForEach-Object {
        Remove-Item -Recurse -Force -LiteralPath $_.FullName -ErrorAction SilentlyContinue
    }
}

# Create the zip.
$zipName = "$name-$version.zip"
$zipPath = Join-Path $OutDir $zipName
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }

# Compress the *contents* of staging, not the staging folder itself.
$contents = Get-ChildItem -Path $stagingRoot
Compress-Archive -Path ($contents | ForEach-Object { $_.FullName }) -DestinationPath $zipPath -Force

# Cleanup staging.
Remove-Item -Recurse -Force $stagingRoot

$sizeKb = [math]::Round((Get-Item $zipPath).Length / 1KB, 1)
Write-Host ""
Write-Host "Built: $zipPath ($sizeKb KB)" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Go to https://chrome.google.com/webstore/devconsole"
Write-Host "  2. Upload $zipName as a new item or new package for an existing item"
Write-Host "  3. Fill out the listing — short description, screenshots, privacy practices"
Write-Host "  4. Link the Privacy Policy URL (publish legal/privacy.html somewhere first)"
