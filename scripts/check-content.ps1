$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Errors = New-Object System.Collections.Generic.List[string]
$JsonCount = 0
$ReferenceCount = 0

function Add-CheckError {
  param([string]$Message)
  $script:Errors.Add($Message) | Out-Null
}

function Get-RepoPath {
  param([string]$RelativePath)
  Join-Path $Root ($RelativePath -replace "/", [IO.Path]::DirectorySeparatorChar)
}

function Remove-UrlParts {
  param([string]$Value)
  (($Value -split "#", 2)[0] -split "\?", 2)[0]
}

function Test-VirtualReference {
  param([string]$Value)
  $Raw = ""
  if ($null -ne $Value) {
    $Raw = $Value.Trim()
  }
  return (
    -not $Raw -or
    $Raw.StartsWith("#") -or
    $Raw.StartsWith("data:") -or
    $Raw.StartsWith("mailto:") -or
    $Raw.StartsWith("tel:") -or
    $Raw.StartsWith("javascript:") -or
    ($Raw -match "^[a-z][a-z0-9+.-]*://")
  )
}

function Read-JsonFile {
  param([string]$RelativePath)
  $script:JsonCount += 1

  try {
    return Get-Content -Raw -Encoding UTF8 (Get-RepoPath $RelativePath) | ConvertFrom-Json
  } catch {
    Add-CheckError "${RelativePath}: invalid JSON ($($_.Exception.Message))"
    return $null
  }
}

function Test-LocalReference {
  param(
    [string]$SourceFile,
    [string]$Reference,
    [string]$Context
  )

  if (Test-VirtualReference $Reference) {
    return
  }

  $Clean = Remove-UrlParts $Reference
  try {
    $Clean = [uri]::UnescapeDataString($Clean)
  } catch {}

  $Clean = $Clean -replace "^\./", ""
  if (-not $Clean -or $Clean -eq ".") {
    return
  }

  $script:ReferenceCount += 1
  if (-not (Test-Path -LiteralPath (Get-RepoPath $Clean))) {
    Add-CheckError "${SourceFile}: missing local file `"$Reference`" ($Context)"
  }
}

function Get-JsonList {
  param(
    $Payload,
    [string[]]$Keys
  )

  if ($Payload -is [array]) {
    return @($Payload)
  }

  foreach ($Key in $Keys) {
    if ($Payload.$Key -is [array]) {
      return @($Payload.$Key)
    }
  }

  return @()
}

function Test-PhotoManifest {
  param([string]$RelativePath)
  $Payload = Read-JsonFile $RelativePath
  $Images = Get-JsonList $Payload @("images", "photos")

  for ($Index = 0; $Index -lt $Images.Count; $Index++) {
    if ($Images[$Index].src) {
      Test-LocalReference $RelativePath $Images[$Index].src "images[$Index].src"
    }
  }
}

function Test-FileManifest {
  param([string]$RelativePath)
  $Payload = Read-JsonFile $RelativePath
  $Files = Get-JsonList $Payload @("files", "items")

  for ($Index = 0; $Index -lt $Files.Count; $Index++) {
    if ($Files[$Index].href) {
      Test-LocalReference $RelativePath $Files[$Index].href "files[$Index].href"
    }
  }
}

function Test-DownloadsManifest {
  param([string]$RelativePath)
  $Payload = Read-JsonFile $RelativePath
  if (-not $Payload) {
    return
  }

  $Monographs = @($Payload.monographs)
  for ($Index = 0; $Index -lt $Monographs.Count; $Index++) {
    if ($Monographs[$Index].href) {
      Test-LocalReference $RelativePath $Monographs[$Index].href "monographs[$Index].href"
    }
  }

  $Groups = @($Payload.articles)
  for ($GroupIndex = 0; $GroupIndex -lt $Groups.Count; $GroupIndex++) {
    $Files = @($Groups[$GroupIndex].files)
    for ($FileIndex = 0; $FileIndex -lt $Files.Count; $FileIndex++) {
      if ($Files[$FileIndex].href) {
        Test-LocalReference $RelativePath $Files[$FileIndex].href "articles[$GroupIndex].files[$FileIndex].href"
      }
    }
  }
}

function Resolve-SourceRelativeReference {
  param(
    [string]$SourceFile,
    [string]$Reference
  )

  $Clean = Remove-UrlParts $Reference
  try {
    $Clean = [uri]::UnescapeDataString($Clean)
  } catch {}

  if ($Clean.StartsWith("/")) {
    return $Clean.TrimStart("/")
  }

  $SourceDirectory = Split-Path $SourceFile -Parent
  if ($SourceDirectory) {
    return ((Join-Path $SourceDirectory $Clean) -replace "\\", "/")
  }

  return ($Clean -replace "\\", "/")
}

$AllFiles = Get-ChildItem -Path $Root -Recurse -File |
  Where-Object { $_.FullName -notmatch "\\\.git\\" -and $_.FullName -notmatch "\\node_modules\\" }

foreach ($File in $AllFiles) {
  $RelativePath = ($File.FullName.Substring($Root.Length + 1) -replace "\\", "/")
  if ($RelativePath.EndsWith(".json") -or $RelativePath.EndsWith(".webmanifest")) {
    $null = Read-JsonFile $RelativePath
  }
}

Test-PhotoManifest "files/media/activity1/photos.json"
Test-PhotoManifest "files/media/activity2/photos.json"
Test-PhotoManifest "files/media/activity3/photos.json"
Test-FileManifest "files/activity2/files.json"
Test-DownloadsManifest "files/downloads/files.json"

foreach ($File in $AllFiles | Where-Object { $_.Extension -eq ".html" }) {
  $RelativePath = ($File.FullName.Substring($Root.Length + 1) -replace "\\", "/")
  $Html = Get-Content -Raw -Encoding UTF8 $File.FullName
  foreach ($Match in [regex]::Matches($Html, "\b(?:href|src|action)=[""']([^""']+)[""']", "IgnoreCase")) {
    $RawReference = $Match.Groups[1].Value
    if (Test-VirtualReference $RawReference) {
      continue
    }

    $Reference = Resolve-SourceRelativeReference $RelativePath $RawReference
    Test-LocalReference $RelativePath $Reference "HTML attribute $RawReference"
  }
}

foreach ($File in $AllFiles | Where-Object { $_.Extension -eq ".css" }) {
  $RelativePath = ($File.FullName.Substring($Root.Length + 1) -replace "\\", "/")
  $Css = Get-Content -Raw -Encoding UTF8 $File.FullName
  foreach ($Match in [regex]::Matches($Css, "url\(\s*[""']?([^""')]+)[""']?\s*\)", "IgnoreCase")) {
    $RawReference = $Match.Groups[1].Value
    if (Test-VirtualReference $RawReference) {
      continue
    }

    $Reference = Resolve-SourceRelativeReference $RelativePath $RawReference
    Test-LocalReference $RelativePath $Reference "CSS url($RawReference)"
  }
}

$Manifest = Read-JsonFile "manifest.webmanifest"
if ($Manifest.start_url) {
  Test-LocalReference "manifest.webmanifest" $Manifest.start_url "start_url"
}
foreach ($Icon in @($Manifest.icons)) {
  if ($Icon.src) {
    Test-LocalReference "manifest.webmanifest" $Icon.src "icon.src"
  }
}

$ServiceWorker = Get-Content -Raw -Encoding UTF8 (Get-RepoPath "sw.js")
foreach ($Match in [regex]::Matches($ServiceWorker, "[""'](\./[^""']+)[""']")) {
  $Reference = ($Match.Groups[1].Value -replace "^\./", "")
  if ($Reference -and $Reference -ne ".") {
    Test-LocalReference "sw.js" $Reference "APP_SHELL item $($Match.Groups[1].Value)"
  }
}

if ($Errors.Count) {
  Write-Error ("Content check failed:`n- " + ($Errors -join "`n- "))
  exit 1
}

Write-Host "Content check passed: $JsonCount JSON files parsed, $ReferenceCount local references checked."
