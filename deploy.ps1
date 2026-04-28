#!/usr/bin/env pwsh
# ─────────────────────────────────────────────────────────────────────────────
# deploy.ps1  –  Commit, version-bump, and push in one command
#
# USAGE:
#   .\deploy.ps1 "Your commit message"
#   .\deploy.ps1 "Your commit message" -Version 2.0.0
#   .\deploy.ps1 "Your commit message" -Patch   (force patch bump, default)
#   .\deploy.ps1 "Your commit message" -Minor   (bump minor, reset patch to 0)
#   .\deploy.ps1 "Your commit message" -Major   (bump major, reset minor+patch)
#
# EXAMPLES:
#   .\deploy.ps1 "fix: dropdown z-index in profile page"
#   .\deploy.ps1 "feat: add member share sheet" -Minor
#   .\deploy.ps1 "release: v3.0.0" -Version 3.0.0
# ─────────────────────────────────────────────────────────────────────────────

param (
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Message,

    [Parameter(Mandatory = $false)]
    [string]$Version = "",

    [switch]$Major,
    [switch]$Minor,
    [switch]$Patch
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$VersionFile    = Join-Path $PSScriptRoot "public\version.json"
$PackageFile    = Join-Path $PSScriptRoot "package.json"

# ── 1. Read current version ──────────────────────────────────────────────────
$versionJson = Get-Content $VersionFile -Raw | ConvertFrom-Json
$current     = $versionJson.version

if ($current -notmatch '^\d+\.\d+\.\d+$') {
    Write-Error "version.json has an unexpected format: '$current'"
    exit 1
}

$parts = $current.Split('.')
[int]$maj = $parts[0]
[int]$min = $parts[1]
[int]$pat = $parts[2]

# ── 2. Determine next version ─────────────────────────────────────────────────
if ($Version -ne "") {
    # Explicit version supplied
    if ($Version -notmatch '^\d+\.\d+\.\d+$') {
        Write-Error "-Version must be in MAJOR.MINOR.PATCH format (e.g. 2.0.0)"
        exit 1
    }
    $nextVersion = $Version
} elseif ($Major) {
    $nextVersion = "$($maj + 1).0.0"
} elseif ($Minor) {
    $nextVersion = "$maj.$($min + 1).0"
} else {
    # Default: patch bump
    $nextVersion = "$maj.$min.$($pat + 1)"
}

# ── 3. Update version.json ────────────────────────────────────────────────────
# Write clean single-space JSON (ConvertTo-Json adds double spaces)
$newVersionJson = "{`n    `"version`": `"$nextVersion`"`n}"
[System.IO.File]::WriteAllText($VersionFile, $newVersionJson)

# ── 4. Update package.json version field ─────────────────────────────────────
$pkgRaw = Get-Content $PackageFile -Raw
# Use regex replace to avoid ConvertTo-Json reformatting the whole file
$pkgRaw = $pkgRaw -replace '"version"\s*:\s*"[^"]*"', "`"version`": `"$nextVersion`""
[System.IO.File]::WriteAllText($PackageFile, $pkgRaw)

# ── 5. Git add, commit, push ──────────────────────────────────────────────────
Write-Host ""
Write-Host "  Version  : $current  ->  $nextVersion" -ForegroundColor Cyan
Write-Host "  Message  : $Message"                   -ForegroundColor Cyan
Write-Host ""

git add -A

$commitMsg = "v$nextVersion  $Message"
git commit -m $commitMsg

git push

Write-Host ""
Write-Host "  Deployed successfully!  ($commitMsg)" -ForegroundColor Green
Write-Host ""
