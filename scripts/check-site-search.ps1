$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$IndexPath = Join-Path $Root "files/search/site-search-index.json"
$DownloadsManifestPath = Join-Path $Root "files/downloads/files.json"
$Errors = New-Object System.Collections.Generic.List[string]
$Warnings = New-Object System.Collections.Generic.List[string]
$AllowedTypes = @("page", "activity", "publication", "download")

function Add-CheckError {
  param([string]$Message)
  $script:Errors.Add($Message) | Out-Null
}

function Add-CheckWarning {
  param([string]$Message)
  $script:Warnings.Add($Message) | Out-Null
}

function Read-JsonFile {
  param([string]$Path)
  try {
    return (Get-Content -Raw -Encoding UTF8 $Path) | ConvertFrom-Json
  } catch {
    Add-CheckError "${Path}: invalid JSON ($($_.Exception.Message))"
    return $null
  }
}

function Get-PlainText {
  param($Value)

  if ($null -eq $Value) {
    return ""
  }
  if ($Value -is [string]) {
    return $Value.Trim()
  }
  if ($Value -is [array]) {
    return (@($Value | ForEach-Object { Get-PlainText $_ }) -join " ").Trim()
  }
  if ($Value -is [pscustomobject]) {
    $Parts = New-Object System.Collections.Generic.List[string]
    foreach ($Property in $Value.PSObject.Properties) {
      $Text = Get-PlainText $Property.Value
      if ($Text) {
        $Parts.Add($Text) | Out-Null
      }
    }
    return ($Parts -join " ").Trim()
  }

  return ([string]$Value).Trim()
}

function Test-SafeLocalUrl {
  param([string]$Url)

  $Raw = ([string]$Url).Trim()
  if (-not $Raw) {
    return "empty url"
  }
  if ($Raw -match "[\u0000-\u001F\u007F]") {
    return "control characters in url"
  }
  if ($Raw -match "\\") {
    return "Windows path separator in url"
  }
  if ($Raw -match "^[a-z][a-z0-9+.-]*:" -or $Raw.StartsWith("//")) {
    return "external or protocol URL is not allowed"
  }
  if ($Raw -match "\.\.") {
    return "parent path segments are not allowed"
  }

  return ""
}

function Get-DownloadsManifestHrefs {
  param($Manifest)

  $Set = @{}
  foreach ($File in @($Manifest.monographs)) {
    if ($File.href) {
      $Set[[string]$File.href] = $true
    }
  }
  foreach ($Group in @($Manifest.articles)) {
    foreach ($File in @($Group.files)) {
      if ($File.href) {
        $Set[[string]$File.href] = $true
      }
    }
  }
  return $Set
}

if (-not (Test-Path -LiteralPath $IndexPath)) {
  Add-CheckError "files/search/site-search-index.json: file is missing"
}

$Index = if (Test-Path -LiteralPath $IndexPath) { Read-JsonFile $IndexPath } else { $null }
$DownloadsManifest = Read-JsonFile $DownloadsManifestPath
$DownloadHrefs = if ($DownloadsManifest) { Get-DownloadsManifestHrefs $DownloadsManifest } else { @{} }

if ($Index) {
  $RawIndex = Get-Content -Raw -Encoding UTF8 $IndexPath
  if ($RawIndex -match "(endstream|endobj|\bobj\b|CIDFont|FontDescriptor|FlateDecode|XObject|MediaBox|ToUnicode|System\.Collections)") {
    Add-CheckError "files/search/site-search-index.json: contains PDF service/object tokens"
  }
  if ($RawIndex -match "([A-Za-z]:\\|\\Users\\|\\Media\\)") {
    Add-CheckError "files/search/site-search-index.json: contains local Windows path"
  }
  if ($RawIndex -match "\\u0000|\\ufffd") {
    Add-CheckError "files/search/site-search-index.json: contains encoded control/replacement characters"
  }

  $Items = @($Index.items)
  if ($Index.itemCount -ne $Items.Count) {
    Add-CheckError "files/search/site-search-index.json: itemCount does not match items length"
  }

  $Ids = @{}
  $DownloadRecords = 0
  foreach ($Item in $Items) {
    $Context = "site-search record $($Item.id)"
    if (-not $Item.id) {
      Add-CheckError "files/search/site-search-index.json: record with empty id"
    } elseif ($Ids.ContainsKey([string]$Item.id)) {
      Add-CheckError "${Context}: duplicate id"
    } else {
      $Ids[[string]$Item.id] = $true
    }

    if ($AllowedTypes -notcontains ([string]$Item.type)) {
      Add-CheckError "${Context}: unsupported type `"$($Item.type)`""
    }

    $UrlProblem = Test-SafeLocalUrl ([string]$Item.url)
    if ($UrlProblem) {
      Add-CheckError "${Context}: ${UrlProblem}"
    }

    $TitleText = Get-PlainText $Item.title
    if (-not $TitleText) {
      Add-CheckError "${Context}: title must have uk or en text"
    }

    $SearchText = Get-PlainText $Item.searchText
    if (-not $SearchText) {
      Add-CheckWarning "${Context}: searchText is empty"
    }
    if ($SearchText.Length -gt 3200) {
      Add-CheckError "${Context}: searchText is longer than 3200 chars"
    }

    if ($Item.type -eq "download") {
      $DownloadRecords += 1
      $Href = [string]$Item.href
      if (-not $Href) {
        Add-CheckError "${Context}: download record missing href"
      } elseif (-not $DownloadHrefs.ContainsKey($Href)) {
        Add-CheckError "${Context}: href not present in files/downloads/files.json"
      }
    }
  }

  if ($DownloadRecords -ne $DownloadHrefs.Count) {
    Add-CheckError "files/search/site-search-index.json: download record count ${DownloadRecords} does not match files.json $($DownloadHrefs.Count)"
  }
}

if ($Errors.Count -gt 0) {
  Write-Host "Site search check failed:" -ForegroundColor Red
  foreach ($ErrorMessage in $Errors) {
    Write-Host " - $ErrorMessage" -ForegroundColor Red
  }
  exit 1
}

if ($Warnings.Count -gt 0) {
  Write-Host "Site search check warnings:" -ForegroundColor Yellow
  foreach ($WarningMessage in $Warnings) {
    Write-Host " - $WarningMessage" -ForegroundColor Yellow
  }
}

$TypeCounts = @{}
foreach ($Item in @($Index.items)) {
  $Type = [string]$Item.type
  if (-not $TypeCounts.ContainsKey($Type)) {
    $TypeCounts[$Type] = 0
  }
  $TypeCounts[$Type] += 1
}

Write-Host "Site search check passed: $(@($Index.items).Count) records."
