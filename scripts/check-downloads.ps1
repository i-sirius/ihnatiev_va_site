$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$DownloadsManifestPath = Join-Path $Root "files/downloads/files.json"
$SearchIndexPath = Join-Path $Root "files/downloads/search-index.json"
$Errors = New-Object System.Collections.Generic.List[string]
$Warnings = New-Object System.Collections.Generic.List[string]
$AllowedManifestFields = @("monographs", "articles")
$AllowedFileFields = @(
  "href",
  "label",
  "title",
  "description",
  "keywords",
  "topics",
  "aliases",
  "summary",
  "bibliography",
  "category",
  "searchText",
  "file",
  "type",
  "date",
  "year",
  "textLayer",
  "contentKind",
  "pages",
  "purchase"
)
$AllowedGroupFields = @("title", "files")
$AllowedPurchaseFields = @("mode", "href", "label", "subject", "message")
$AllowedBibliographyFields = @("authors", "year", "publication", "pages", "language")
$AllowedTopics = @(
  "hesychasm",
  "natiosophy",
  "philosophy",
  "religious-studies",
  "theology",
  "education",
  "articles",
  "monographs"
)
$AllowedIndexFields = @("version", "generatedAt", "source", "site", "itemCount", "items")
$AllowedIndexItemFields = @(
  "id",
  "href",
  "fileName",
  "collection",
  "category",
  "title",
  "type",
  "keywords",
  "topics",
  "aliases",
  "description",
  "pages",
  "textLayer",
  "contentKind",
  "summary",
  "bibliography",
  "searchText",
  "extractedText",
  "pageSearch"
)
$AllowedTypes = @("pdf", "doc", "docx", "djvu", "djv", "txt", "html", "htm", "file")
$AllowedContentKinds = @("text", "mixed", "scan", "image", "unknown")

function Add-CheckError {
  param([string]$Message)
  $script:Errors.Add($Message) | Out-Null
}

function Add-CheckWarning {
  param([string]$Message)
  $script:Warnings.Add($Message) | Out-Null
}

function Get-RepoPath {
  param([string]$RelativePath)
  $Normalized = $RelativePath -replace "^\./", ""
  $Normalized = $Normalized.TrimStart("/", "\")
  Join-Path $Root ($Normalized -replace "/", [IO.Path]::DirectorySeparatorChar)
}

function Remove-UrlParts {
  param([string]$Value)
  (($Value -split "#", 2)[0] -split "\?", 2)[0]
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

function Test-UnsafeHref {
  param([string]$Href)

  $Raw = ([string]$Href).Trim()
  if (-not $Raw) {
    return "empty href"
  }
  if ($Raw -match "[\u0000-\u001F\u007F]") {
    return "control characters in href"
  }
  if ($Raw -match "\\") {
    return "Windows path separators in href"
  }
  if ($Raw -match "^[a-z][a-z0-9+.-]*:" -or $Raw.StartsWith("//")) {
    return "href must be a local site path"
  }
  if ($Raw -notmatch "^(\/)?files\/downloads\/") {
    return "href must point to files/downloads/"
  }

  return ""
}

function Get-LocalPathFromHref {
  param([string]$Href)

  $Clean = Remove-UrlParts $Href
  try {
    $Clean = [uri]::UnescapeDataString($Clean)
  } catch {}
  $Clean = $Clean -replace "^\./", ""
  $Clean = $Clean.TrimStart("/", "\")

  Get-RepoPath $Clean
}

function Add-SetValue {
  param(
    [hashtable]$Set,
    [string]$Key,
    [string]$Context
  )

  if (-not $Key) {
    return
  }
  if ($Set.ContainsKey($Key)) {
    Add-CheckError "${Context}: duplicate value `"$Key`""
    return
  }
  $Set[$Key] = $true
}

function Test-UnknownFields {
  param(
    [string]$Context,
    $Object,
    [string[]]$AllowedFields
  )

  foreach ($Property in $Object.PSObject.Properties) {
    if ($AllowedFields -notcontains $Property.Name) {
      Add-CheckError "${Context}: unknown field `"$($Property.Name)`""
    }
  }
}

function Test-UniqueShortValues {
  param(
    [string]$Context,
    [string[]]$Values,
    [string]$Kind,
    [int]$MaxLength = 60
  )

  $Seen = @{}
  foreach ($Value in @($Values)) {
    $Text = ([string]$Value).Trim()
    if (-not $Text) {
      continue
    }

    if ($Text.Length -gt $MaxLength) {
      Add-CheckError "${Context}: ${Kind} `"$Text`" is longer than ${MaxLength} chars"
    }

    $Key = $Text.ToLowerInvariant()
    if ($Seen.ContainsKey($Key)) {
      Add-CheckError "${Context}: duplicate ${Kind} `"$Text`""
    } else {
      $Seen[$Key] = $true
    }
  }
}

function Get-LocalizedArrayValues {
  param(
    $Value,
    [string]$Locale
  )

  if ($null -eq $Value) {
    return @()
  }

  if ($Value -is [array]) {
    return @($Value | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
  }

  if ($Value -is [string]) {
    $Text = $Value.Trim()
    return $(if ($Text) { @($Text) } else { @() })
  }

  if ($Value -is [pscustomobject] -and $Value.PSObject.Properties.Name -contains $Locale) {
    return @(Get-LocalizedArrayValues $Value.$Locale $Locale)
  }

  return @()
}

function Test-LocalizedKeywordObject {
  param(
    [string]$Context,
    $Value,
    [string]$Kind
  )

  if ($null -eq $Value) {
    return
  }

  if ($Value -isnot [pscustomobject]) {
    Add-CheckError "${Context}: ${Kind} must be an object with uk/en arrays"
    return
  }

  foreach ($Locale in @("uk", "en")) {
    if ($Value.PSObject.Properties.Name -notcontains $Locale) {
      Add-CheckError "${Context}: ${Kind}.${Locale} must be present"
      continue
    }

    $Values = Get-LocalizedArrayValues $Value.$Locale $Locale
    if ($null -ne $Value.$Locale -and -not $Values.Count) {
      Add-CheckError "${Context}: ${Kind}.${Locale} must be an array of non-empty strings"
    }

    Test-UniqueShortValues "${Context}.${Kind}.${Locale}" $Values $Kind
  }
}

function Test-Topics {
  param(
    [string]$Context,
    $Value
  )

  if ($null -eq $Value) {
    return @()
  }

  $Topics = @($Value | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
  Test-UniqueShortValues $Context $Topics "topic"

  foreach ($Topic in $Topics) {
    if ($AllowedTopics -notcontains $Topic) {
      Add-CheckError "${Context}: unknown topic `"$Topic`""
    }
  }

  return $Topics
}

function Test-Summary {
  param(
    [string]$Context,
    $Value
  )

  if ($null -eq $Value) {
    Add-CheckWarning "${Context}: summary is missing"
    return
  }

  if ($Value -isnot [pscustomobject]) {
    Add-CheckError "${Context}: summary must be an object with uk/en strings"
    return
  }

  foreach ($Locale in @("uk", "en")) {
    if ($Value.PSObject.Properties.Name -notcontains $Locale) {
      Add-CheckWarning "${Context}: summary.${Locale} is missing"
      continue
    }

    $Text = ([string]$Value.$Locale).Trim()
    if ($Text.Length -gt 320) {
      Add-CheckError "${Context}: summary.${Locale} is longer than 320 chars"
    }
  }
}

function Test-Bibliography {
  param(
    [string]$Context,
    $Value
  )

  if ($null -eq $Value) {
    return
  }

  if ($Value -isnot [pscustomobject]) {
    Add-CheckError "${Context}: bibliography must be an object"
    return
  }

  Test-UnknownFields "${Context}.bibliography" $Value $AllowedBibliographyFields
  if ($Value.authors) {
    Test-UniqueShortValues "${Context}.bibliography.authors" @($Value.authors) "author" 100
  }
}

function Get-ManifestFiles {
  param($Manifest)

  $Files = New-Object System.Collections.Generic.List[object]
  foreach ($File in @($Manifest.monographs)) {
    if ($File) {
      $Files.Add([pscustomobject]@{ File = $File; Context = "monographs" }) | Out-Null
    }
  }

  $GroupIndex = 0
  foreach ($Group in @($Manifest.articles)) {
    $GroupIndex += 1
    if (-not $Group) {
      continue
    }
    Test-UnknownFields "articles[$GroupIndex]" $Group $AllowedGroupFields
    $FileIndex = 0
    foreach ($File in @($Group.files)) {
      $FileIndex += 1
      if ($File) {
        $Files.Add([pscustomobject]@{ File = $File; Context = "articles[$GroupIndex].files[$FileIndex]" }) | Out-Null
      }
    }
  }

  return $Files
}

function Test-Manifest {
  param($Manifest)

  if (-not $Manifest) {
    return @()
  }

  Test-UnknownFields "files/downloads/files.json" $Manifest $AllowedManifestFields

  $HrefSet = @{}
  $Files = Get-ManifestFiles $Manifest

  foreach ($Entry in $Files) {
    $File = $Entry.File
    $Context = $Entry.Context
    Test-UnknownFields $Context $File $AllowedFileFields

    $Href = [string]$File.href
    $HrefProblem = Test-UnsafeHref $Href
    if ($HrefProblem) {
      Add-CheckError "${Context}: ${HrefProblem}"
    } else {
      Add-SetValue $HrefSet $Href $Context
      if (-not (Test-Path -LiteralPath (Get-LocalPathFromHref $Href))) {
        Add-CheckError "${Context}: missing local file `"$Href`""
      }
    }

    $Label = Get-PlainText $File.label
    $Title = Get-PlainText $File.title
    if (-not $Label -and -not $Title) {
      Add-CheckError "${Context}: label/title must not be empty"
    }

    Test-LocalizedKeywordObject $Context $File.keywords "keywords"
    Test-LocalizedKeywordObject $Context $File.aliases "aliases"
    $Topics = Test-Topics $Context $File.topics
    if (@(Get-LocalizedArrayValues $File.keywords "uk").Count -eq 0 -and @(Get-LocalizedArrayValues $File.keywords "en").Count -eq 0 -and @($Topics).Count -eq 0) {
      Add-CheckWarning "${Context}: no keywords or topics"
    }
    Test-Summary $Context $File.summary
    Test-Bibliography $Context $File.bibliography

    if ($File.type) {
      $Type = ([string]$File.type).ToLowerInvariant()
      if ($AllowedTypes -notcontains $Type) {
        Add-CheckError "${Context}: unsupported type `"$($File.type)`""
      } elseif ($Href) {
        $CleanHref = (Remove-UrlParts $Href).ToLowerInvariant()
        $Extension = [IO.Path]::GetExtension($CleanHref).TrimStart(".")
        if ($Extension -and $Extension -ne $Type -and -not ($Type -eq "djv" -and $Extension -eq "djvu") -and -not ($Type -eq "file")) {
          Add-CheckError "${Context}: type `"$Type`" does not match href extension `"$Extension`""
        }
      }
    }

    if ($File.contentKind) {
      $ContentKind = ([string]$File.contentKind).ToLowerInvariant()
      if ($AllowedContentKinds -notcontains $ContentKind) {
        Add-CheckError "${Context}: unsupported contentKind `"$($File.contentKind)`""
      }
    }

    if ($null -ne $File.textLayer -and $File.textLayer -isnot [bool]) {
      Add-CheckError "${Context}: textLayer must be boolean"
    }

    if ($File.pages) {
      $Pages = 0
      if (-not [int]::TryParse([string]$File.pages, [ref]$Pages) -or $Pages -le 0) {
        Add-CheckError "${Context}: pages must be a positive integer"
      }
    }

    if ($File.purchase) {
      Test-UnknownFields "${Context}.purchase" $File.purchase $AllowedPurchaseFields
      if ($File.purchase.href) {
        $PurchaseHref = ([string]$File.purchase.href).Trim()
        if ($PurchaseHref -match "^\s*(javascript|data|vbscript):" -or $PurchaseHref.StartsWith("//")) {
          Add-CheckError "${Context}.purchase.href: unsafe URL"
        }
      }
    }
  }

  return $Files
}

function Test-SearchIndex {
  param(
    $Index,
    $ManifestFiles
  )

  if (-not $Index) {
    return
  }
  if (-not (Test-Path -LiteralPath $SearchIndexPath)) {
    Add-CheckError "files/downloads/search-index.json: file is missing"
    return
  }

  Test-UnknownFields "files/downloads/search-index.json" $Index $AllowedIndexFields

  $RawIndex = Get-Content -Raw -Encoding UTF8 $SearchIndexPath
  if ($RawIndex -match "(endstream|endobj|\bobj\b|CIDFont|FontDescriptor|FlateDecode|XObject|MediaBox|ToUnicode|System\.Collections)") {
    Add-CheckError "files/downloads/search-index.json: contains PDF service/object tokens"
  }
  if ($RawIndex -match "([A-Za-z]:\\|\\Users\\|\\Media\\)") {
    Add-CheckError "files/downloads/search-index.json: contains local Windows path"
  }
  if ($RawIndex -match "\\u0000|\\ufffd") {
    Add-CheckError "files/downloads/search-index.json: contains encoded control/replacement characters"
  }

  $ManifestHrefSet = @{}
  foreach ($Entry in $ManifestFiles) {
    $ManifestHrefSet[[string]$Entry.File.href] = $true
  }

  $Items = @($Index.items)
  if ($Index.itemCount -ne $Items.Count) {
    Add-CheckError "files/downloads/search-index.json: itemCount does not match items length"
  }
  if ($Items.Count -ne $ManifestFiles.Count) {
    Add-CheckError "files/downloads/search-index.json: item count does not match files.json"
  }

  $IdSet = @{}
  $HrefSet = @{}
  foreach ($Item in $Items) {
    Test-UnknownFields "files/downloads/search-index.json record $($Item.id)" $Item $AllowedIndexItemFields

    if (-not $Item.id) {
      Add-CheckError "files/downloads/search-index.json: record with empty id"
    } else {
      Add-SetValue $IdSet ([string]$Item.id) "search-index"
    }

    $Href = [string]$Item.href
    if (-not $Href) {
      Add-CheckError "files/downloads/search-index.json: record $($Item.id) has empty href"
      continue
    }
    $HrefProblem = Test-UnsafeHref $Href
    if ($HrefProblem) {
      Add-CheckError "files/downloads/search-index.json: record $($Item.id) ${HrefProblem}"
    }
    Add-SetValue $HrefSet $Href "search-index"
    if (-not $ManifestHrefSet.ContainsKey($Href)) {
      Add-CheckError "files/downloads/search-index.json: extra href not present in files.json `"$Href`""
    }

    $Title = Get-PlainText $Item.title
    if (-not $Title) {
      Add-CheckError "files/downloads/search-index.json: record $($Item.id) has empty title"
    }

    Test-LocalizedKeywordObject "files/downloads/search-index.json record $($Item.id)" $Item.keywords "keywords"
    Test-LocalizedKeywordObject "files/downloads/search-index.json record $($Item.id)" $Item.aliases "aliases"
    $IndexTopics = Test-Topics "files/downloads/search-index.json record $($Item.id)" $Item.topics
    if (@(Get-LocalizedArrayValues $Item.keywords "uk").Count -eq 0 -and @(Get-LocalizedArrayValues $Item.keywords "en").Count -eq 0 -and @($IndexTopics).Count -eq 0) {
      Add-CheckWarning "files/downloads/search-index.json record $($Item.id): no keywords or topics"
    }
    Test-Summary "files/downloads/search-index.json record $($Item.id)" $Item.summary
    Test-Bibliography "files/downloads/search-index.json record $($Item.id)" $Item.bibliography

    if ($Item.extractedText -and $Item.extractedText.chars -gt 12000) {
      Add-CheckError "files/downloads/search-index.json: record $($Item.id) extracted text exceeds 12000 chars"
    }

    if (-not $Item.extractedText) {
      Add-CheckError "files/downloads/search-index.json: record $($Item.id) missing extractedText"
    } else {
      if ($Item.extractedText.available -eq $true) {
        if ($Item.extractedText.source -ne "pdftotext") {
          Add-CheckError "files/downloads/search-index.json: record $($Item.id) has unexpected extractedText source `"$($Item.extractedText.source)`""
        }
      } elseif (@($Item.pageSearch).Count -gt 0) {
        Add-CheckError "files/downloads/search-index.json: record $($Item.id) has pageSearch while extractedText is unavailable"
      }
    }

    $TotalPageSearchChars = 0
    foreach ($PageEntry in @($Item.pageSearch)) {
      if (-not $PageEntry.page) {
        Add-CheckError "files/downloads/search-index.json: record $($Item.id) has pageSearch item without page"
      }
      if (-not $PageEntry.text) {
        Add-CheckError "files/downloads/search-index.json: record $($Item.id) has pageSearch item without text"
      }
      $PageText = [string]$PageEntry.text
      $TotalPageSearchChars += $PageText.Length
      if ($PageText.Length -gt 8000) {
        Add-CheckError "files/downloads/search-index.json: record $($Item.id) has pageSearch block over 8000 chars"
      }
    }
    if ($TotalPageSearchChars -gt 12000) {
      Add-CheckError "files/downloads/search-index.json: record $($Item.id) pageSearch exceeds 12000 chars"
    }
  }

  foreach ($Href in $ManifestHrefSet.Keys) {
    if (-not $HrefSet.ContainsKey($Href)) {
      Add-CheckError "files/downloads/search-index.json: missing href from files.json `"$Href`""
    }
  }
}

$Manifest = Read-JsonFile $DownloadsManifestPath
$ManifestFiles = Test-Manifest $Manifest
$Index = Read-JsonFile $SearchIndexPath
Test-SearchIndex $Index $ManifestFiles

if ($Errors.Count -gt 0) {
  Write-Host "Downloads check failed:" -ForegroundColor Red
  foreach ($ErrorMessage in $Errors) {
    Write-Host " - $ErrorMessage" -ForegroundColor Red
  }
  exit 1
}

if ($Warnings.Count -gt 0) {
  Write-Host "Downloads check warnings:" -ForegroundColor Yellow
  foreach ($WarningMessage in $Warnings) {
    Write-Host " - $WarningMessage" -ForegroundColor Yellow
  }
}

Write-Host "Downloads check passed: $($ManifestFiles.Count) manifest records, $(@($Index.items).Count) index records."
