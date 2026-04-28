#!/usr/bin/env pwsh
# ─────────────────────────────────────────────────────────────────────────────
# deploy.ps1  –  Commit, version-bump, and push in one command
#
# USAGE:
#   .\deploy.ps1 "Your commit message"              → bumps small  (x.x.+1)
#   .\deploy.ps1 "Your commit message" medium        → bumps medium (x.+1.0)
#   .\deploy.ps1 "Your commit message" major         → bumps major  (+1.0.0)
#   .\deploy.ps1 "Your commit message" -Version 2.0.0 → exact version
#
# BUMP RULES:
#   small   (default)  →  patch  +1          e.g. 1.6.3 → 1.6.4
#   medium             →  minor  +1, patch=0  e.g. 1.6.3 → 1.7.0
#   major              →  major  +1, minor=0, patch=0  e.g. 1.6.3 → 2.0.0
# ─────────────────────────────────────────────────────────────────────────────

param (
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Message,

    [Parameter(Mandatory = $false, Position = 1)]
    [ValidateSet("small", "medium", "major", "")]
    [string]$Bump = "small",

    [Parameter(Mandatory = $false)]
    [string]$Version = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$VersionFile = Join-Path $PSScriptRoot "public\version.json"
$PackageFile = Join-Path $PSScriptRoot "package.json"

# ── 1. Read current version ───────────────────────────────────────────────────
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
    if ($Version -notmatch '^\d+\.\d+\.\d+$') {
        Write-Error "-Version must be MAJOR.MINOR.PATCH format (e.g. 2.0.0)"
        exit 1
    }
    $nextVersion = $Version
    $bumpLabel   = "explicit"
} elseif ($Bump -eq "major") {
    $nextVersion = "$($maj + 1).0.0"
    $bumpLabel   = "major (+1.0.0)"
} elseif ($Bump -eq "medium") {
    $nextVersion = "$maj.$($min + 1).0"
    $bumpLabel   = "medium (x.+1.0)"
} else {
    # Default: small / patch
    $nextVersion = "$maj.$min.$($pat + 1)"
    $bumpLabel   = "small (x.x.+1)"
}

# ── 3. Update public/version.json ────────────────────────────────────────────
$newVersionJson = "{`n    `"version`": `"$nextVersion`"`n}"
[System.IO.File]::WriteAllText($VersionFile, $newVersionJson)

# ── 4. Update package.json version field ─────────────────────────────────────
$pkgRaw = Get-Content $PackageFile -Raw
$pkgRaw = $pkgRaw -replace '"version"\s*:\s*"[^"]*"', "`"version`": `"$nextVersion`""
[System.IO.File]::WriteAllText($PackageFile, $pkgRaw)

# ── 5. Git add, commit, push ──────────────────────────────────────────────────
Write-Host ""
Write-Host "  Bump     : $bumpLabel"                 -ForegroundColor DarkCyan
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

