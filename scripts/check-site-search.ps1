$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$IndexPath = Join-Path $Root "files/search/site-search-index.json"
$DownloadsManifestPath = Join-Path $Root "files/downloads/files.json"
$DownloadsSearchIndexPath = Join-Path $Root "files/downloads/search-index.json"
$AudioContentPath = Join-Path $Root "files/content/audio.json"
$VideoContentPath = Join-Path $Root "files/content/video-index.json"
$SearchContentPath = Join-Path $Root "files/content/search-sections.json"
$SiteSearchJsPath = Join-Path $Root "js/site-search.js"
$DownloadsRendererJsPath = Join-Path $Root "js/downloads-renderer.js"
$YoutubeFeedJsPath = Join-Path $Root "js/youtube-feed.js"
$PageContentJsPath = Join-Path $Root "js/page-content.js"
$Errors = New-Object System.Collections.Generic.List[string]
$Warnings = New-Object System.Collections.Generic.List[string]
$AllowedTypes = @("page", "activity", "section", "publication", "download", "audio", "video", "document")

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

function Normalize-SearchText {
  param([string]$Text)

  $Normalized = ([string]$Text).ToLowerInvariant()
  $Normalized = $Normalized.Replace([char]0x2019, "'")
  $Normalized = $Normalized.Replace([char]0x02BC, "'")
  $Normalized = $Normalized.Replace([char]0x0060, "'")
  $Normalized = $Normalized.Replace([char]0x00B4, "'")
  foreach ($QuoteChar in @([char]0x201C, [char]0x201D, [char]0x00AB, [char]0x00BB)) {
    $Normalized = $Normalized.Replace($QuoteChar, " ")
  }
  foreach ($DashChar in @([char]0x2010, [char]0x2011, [char]0x2012, [char]0x2013, [char]0x2014, [char]0x2015)) {
    $Normalized = $Normalized.Replace($DashChar, " ")
  }
  $Normalized = [regex]::Replace($Normalized, '["\.,;:!\?\(\)\[\]\{\}<>/\\|-]+', ' ')
  $Normalized = [regex]::Replace($Normalized, '\s+', ' ')
  return $Normalized.Trim()
}

function New-UnicodeText {
  param([int[]]$CodePoints)

  return (-join ($CodePoints | ForEach-Object { [char]$_ }))
}

$SearchStopWords = @{}
foreach ($Word in @(
  (New-UnicodeText @(0x0456)),
  (New-UnicodeText @(0x0439)),
  (New-UnicodeText @(0x0442, 0x0430)),
  (New-UnicodeText @(0x0432)),
  (New-UnicodeText @(0x0443)),
  (New-UnicodeText @(0x043D, 0x0430)),
  (New-UnicodeText @(0x0437, 0x0430)),
  (New-UnicodeText @(0x043D, 0x0435)),
  (New-UnicodeText @(0x0434, 0x043E)),
  (New-UnicodeText @(0x0432, 0x0456, 0x0434)),
  (New-UnicodeText @(0x043F, 0x043E)),
  (New-UnicodeText @(0x0437)),
  (New-UnicodeText @(0x0456, 0x0437)),
  (New-UnicodeText @(0x0437, 0x0456)),
  (New-UnicodeText @(0x0449, 0x043E)),
  (New-UnicodeText @(0x044F, 0x043A)),
  (New-UnicodeText @(0x0446, 0x0435)),
  (New-UnicodeText @(0x0438)),
  (New-UnicodeText @(0x0441)),
  (New-UnicodeText @(0x043E, 0x0442)),
  (New-UnicodeText @(0x044D, 0x0442, 0x043E)),
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "in",
  "on",
  "to",
  "for"
)) {
  $SearchStopWords[$Word] = $true
}

function Get-SearchWords {
  param([string]$Query)

  @((Normalize-SearchText $Query) -split " " | Where-Object {
    $_ -and $_.Length -ge 3 -and -not $SearchStopWords.ContainsKey($_)
  })
}

function Get-RecordSearchText {
  param($Item)

  $Parts = New-Object System.Collections.Generic.List[string]
  foreach ($Field in @(
    "id",
    "type",
    "url",
    "href",
    "title",
    "titleEn",
    "section",
    "description",
    "descriptionEn",
    "topics",
    "tags",
    "keywords",
    "aliases",
    "summary",
    "bibliography",
    "searchText",
    "normalizedText",
    "category",
    "fileType",
    "language",
    "date",
    "duration",
    "videoId",
    "pageUrl",
    "documentType"
  )) {
    if ($Item.PSObject.Properties.Name -contains $Field) {
      $Text = Get-PlainText $Item.$Field
      if ($Text) {
        $Parts.Add($Text) | Out-Null
      }
    }
  }

  return Normalize-SearchText ($Parts -join " ")
}

function Find-SiteSearchMatches {
  param(
    $Items,
    [string]$Query
  )

  $Words = @(Get-SearchWords $Query)
  if (-not $Words.Count) {
    return @()
  }

  @($Items | Where-Object {
    $RecordText = ""
    if ($_.PSObject.Properties.Name -contains "_checkSearchText" -and $_._checkSearchText) {
      $RecordText = [string]$_._checkSearchText
    } else {
      $RecordText = Get-RecordSearchText $_
    }
    $Matched = $true
    foreach ($Word in $Words) {
      if ($RecordText.IndexOf($Word) -lt 0) {
        $Matched = $false
        break
      }
    }
    $Matched
  })
}

function Add-SearchTextCache {
  param($Items)

  foreach ($Item in @($Items)) {
    if ($Item -and -not ($Item.PSObject.Properties.Name -contains "_checkSearchText")) {
      $Item | Add-Member -NotePropertyName "_checkSearchText" -NotePropertyValue (Get-RecordSearchText $Item)
    }
  }
}

function Add-LookupKey {
  param(
    [hashtable]$Lookup,
    [string]$Key,
    [int]$Index
  )

  $NormalizedKey = ([string]$Key).Trim()
  if ($NormalizedKey) {
    $Lookup[$NormalizedKey] = $Index
  }
}

function Set-ObjectProperty {
  param(
    $Object,
    [string]$Name,
    $Value
  )

  if ($Object.PSObject.Properties.Name -contains $Name) {
    $Object.$Name = $Value
  } else {
    $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
  }
}

function Merge-DownloadSearchRecords {
  param(
    $SiteItems,
    $DownloadsPayload
  )

  $MergedItems = New-Object System.Collections.Generic.List[object]
  foreach ($Item in @($SiteItems)) {
    $MergedItems.Add($Item) | Out-Null
  }

  $Lookup = @{}
  for ($Index = 0; $Index -lt $MergedItems.Count; $Index += 1) {
    $Record = $MergedItems[$Index]
    if (-not $Record -or ([string]$Record.type) -ne "download") {
      continue
    }

    Add-LookupKey $Lookup ([string]$Record.id) $Index
    Add-LookupKey $Lookup ([string]$Record.href) $Index
    if ($Record.id -and ([string]$Record.id).StartsWith("downloads-")) {
      $ShortId = ([string]$Record.id).Substring("downloads-".Length)
      Add-LookupKey $Lookup $ShortId $Index
    }
  }

  foreach ($DownloadRecord in @($DownloadsPayload.items)) {
    if (-not $DownloadRecord) {
      continue
    }

    $Id = ([string]$DownloadRecord.id).Trim()
    $Href = ([string]$DownloadRecord.href).Trim()
    $RecordIndex = $null
    foreach ($Key in @($Href, $Id, "downloads-${Id}")) {
      if ($Key -and $Lookup.ContainsKey($Key)) {
        $RecordIndex = $Lookup[$Key]
        break
      }
    }

    if ($null -eq $RecordIndex) {
      if (-not $Href) {
        continue
      }
      $NewRecord = [pscustomobject]@{
        id = if ($Id) { "downloads-${Id}" } else { "downloads-extra-$($MergedItems.Count + 1)" }
        type = "download"
        url = "downloads.html"
      }
      $MergedItems.Add($NewRecord) | Out-Null
      $RecordIndex = $MergedItems.Count - 1
    }

    $Merged = $MergedItems[$RecordIndex]
    foreach ($Field in @(
      "href",
      "fileName",
      "collection",
      "category",
      "title",
      "titleEn",
      "description",
      "descriptionEn",
      "topics",
      "tags",
      "keywords",
      "aliases",
      "summary",
      "bibliography",
      "searchText",
      "normalizedText",
      "lang",
      "fileType",
      "language",
      "rankBoost",
      "pageSearch",
      "extractedText"
    )) {
      if ($DownloadRecord.PSObject.Properties.Name -contains $Field -and $null -ne $DownloadRecord.$Field) {
        Set-ObjectProperty $Merged $Field $DownloadRecord.$Field
      }
    }
    Set-ObjectProperty $Merged "type" "download"
    if (-not $Merged.url) {
      Set-ObjectProperty $Merged "url" "downloads.html"
    }
    if (-not $Merged.id -and $Id) {
      Set-ObjectProperty $Merged "id" "downloads-${Id}"
    }
  }

  $OutputItems = @()
  foreach ($MergedItem in $MergedItems) {
    $OutputItems += $MergedItem
  }
  return $OutputItems
}

function Get-RenderedMetaText {
  param($Item)

  $Parts = New-Object System.Collections.Generic.List[string]
  $Type = ([string]$Item.type).Trim()
  if ($Type) {
    $Parts.Add($Type) | Out-Null
  }

  foreach ($Field in @("section", "category", "documentType")) {
    if ($Item.PSObject.Properties.Name -contains $Field) {
      $Text = Get-PlainText $Item.$Field
      if ($Text -and -not $Parts.Contains($Text)) {
        $Parts.Add($Text) | Out-Null
      }
    }
  }

  return ($Parts -join " - ")
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
    if ($File.href -and $File.enabled -ne $false -and $File.hidden -ne $true -and $File.draft -ne $true -and $File.search -ne $false) {
      $Set[[string]$File.href] = $true
    }
  }
  foreach ($Group in @($Manifest.articles)) {
    foreach ($File in @($Group.files)) {
      if ($File.href -and $File.enabled -ne $false -and $File.hidden -ne $true -and $File.draft -ne $true -and $File.search -ne $false) {
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
$DownloadsSearchIndex = if (Test-Path -LiteralPath $DownloadsSearchIndexPath) { Read-JsonFile $DownloadsSearchIndexPath } else { $null }
$AudioContent = Read-JsonFile $AudioContentPath
$VideoContent = Read-JsonFile $VideoContentPath
$SearchContent = Read-JsonFile $SearchContentPath
$SiteSearchJs = if (Test-Path -LiteralPath $SiteSearchJsPath) { Get-Content -Raw -Encoding UTF8 $SiteSearchJsPath } else { "" }
$DownloadsRendererJs = if (Test-Path -LiteralPath $DownloadsRendererJsPath) { Get-Content -Raw -Encoding UTF8 $DownloadsRendererJsPath } else { "" }
$YoutubeFeedJs = if (Test-Path -LiteralPath $YoutubeFeedJsPath) { Get-Content -Raw -Encoding UTF8 $YoutubeFeedJsPath } else { "" }
$PageContentJs = if (Test-Path -LiteralPath $PageContentJsPath) { Get-Content -Raw -Encoding UTF8 $PageContentJsPath } else { "" }
$DownloadHrefs = if ($DownloadsManifest) { Get-DownloadsManifestHrefs $DownloadsManifest } else { @{} }
$ExpectedAudioRecords = 0
foreach ($AudioItem in @($AudioContent.items)) {
  if (
    $AudioItem -and
    $AudioItem.enabled -ne $false -and
    ([string]$AudioItem.section) -eq "church" -and
    ([string]$AudioItem.category) -eq "sermons" -and
    ([string]$AudioItem.src).Trim()
  ) {
    $ExpectedAudioRecords += 1
  }
}
$ExpectedVideoRecords = 0
$ExpectedDocumentRecords = 0
foreach ($VideoItem in @($VideoContent.items)) {
  if ($VideoItem -and $VideoItem.enabled -ne $false -and ([string]$VideoItem.id).Trim()) {
    $ExpectedVideoRecords += 1
    foreach ($Document in @($VideoItem.supportDocuments)) {
      if ($Document -and $Document.enabled -ne $false -and ([string]$Document.url).Trim()) {
        $ExpectedDocumentRecords += 1
      }
    }
  }
}

foreach ($RequiredText in @("Go", "Watch", "Listen", "Open file", "Open material", "Go to list", "Enter a more specific query.", "getResultActionLabel")) {
  if ($SiteSearchJs.IndexOf($RequiredText) -lt 0) {
    Add-CheckError "js/site-search.js: missing search UI/action fallback `"$RequiredText`""
  }
}
foreach ($RequiredText in @("getAllFieldText", "getInitialDownloadsItemId", "data-download-item", "search")) {
  if ($DownloadsRendererJs.IndexOf($RequiredText) -lt 0) {
    Add-CheckError "js/downloads-renderer.js: missing downloads deep-link/search support `"$RequiredText`""
  }
}
foreach ($RequiredText in @("data-video-id", "resolveTargetVideoCard", "scheduleTargetVideoCardScroll", "video-")) {
  if ($YoutubeFeedJs.IndexOf($RequiredText) -lt 0) {
    Add-CheckError "js/youtube-feed.js: missing video deep-link support `"$RequiredText`""
  }
}
foreach ($RequiredText in @("getPublicationItemId", "schedulePublicationTargetResolve", "data-publication-id", "publication-")) {
  if ($PageContentJs.IndexOf($RequiredText) -lt 0) {
    Add-CheckError "js/page-content.js: missing publication deep-link support `"$RequiredText`""
  }
}

if ($Index) {
  $RawIndex = Get-Content -Raw -Encoding UTF8 $IndexPath
  if ($RawIndex -match "(endstream|endobj|\bobj\b|CIDFont|FontDescriptor|FlateDecode|XObject|MediaBox|ToUnicode|System\.Collections|\[object Object\])") {
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
  $AudioRecords = 0
  $VideoRecords = 0
  $DocumentRecords = 0
  $RequiredPageIds = @("page-home", "page-activity1", "page-activity2", "page-activity3", "page-downloads", "page-contact", "page-menu")
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
      $DownloadUrl = [string]$Item.url
      if ($DownloadUrl -match "^downloads\.html$") {
        Add-CheckError "${Context}: download record should include item/search params, not plain downloads.html"
      }
      if ($DownloadUrl -match "^downloads\.html" -and ($DownloadUrl -notmatch "[\?&](item|search|q)=")) {
        Add-CheckError "${Context}: download record should include item/search/q parameter"
      }
    }

    if ($Item.type -eq "audio") {
      $AudioRecords += 1
      $ExpectedAudioUrl = "activity3.html#$($Item.id)"
      if (([string]$Item.url) -ne $ExpectedAudioUrl) {
        Add-CheckError "${Context}: audio record should link to ${ExpectedAudioUrl}"
      }
    }

    if ($Item.type -eq "video") {
      $VideoRecords += 1
      if (-not $Item.videoId) {
        Add-CheckError "${Context}: video record missing videoId"
      }
      if (-not $Item.pageUrl) {
        Add-CheckError "${Context}: video record missing pageUrl"
      }
      $ExpectedVideoUrl = "activity1.html#video-$($Item.videoId)"
      if (([string]$Item.url) -ne $ExpectedVideoUrl) {
        Add-CheckError "${Context}: video record should link to ${ExpectedVideoUrl}"
      }
    }

    if ($Item.type -eq "document") {
      $DocumentRecords += 1
      if (-not $Item.videoId) {
        Add-CheckError "${Context}: document record missing related videoId"
      }
      if (-not $Item.href) {
        Add-CheckError "${Context}: document record missing href"
      } else {
        $HrefProblem = Test-SafeLocalUrl ([string]$Item.href)
        if ($HrefProblem) {
          Add-CheckError "${Context}: document href ${HrefProblem}"
        }
      }
      if (([string]$Item.fileType).ToLowerInvariant() -ne "pdf") {
        Add-CheckError "${Context}: document record should declare fileType pdf"
      }
      if (([string]$Item.url) -notmatch "\.pdf($|[?#])") {
        Add-CheckError "${Context}: document record should link directly to a PDF"
      }
    }

    if ($Item.type -eq "publication") {
      if (([string]$Item.url) -notmatch "^activity1\.html#publication-[0-9]+$") {
        Add-CheckError "${Context}: publication record should link to a concrete publication item hash"
      }
    }
  }

  if ($DownloadRecords -ne $DownloadHrefs.Count) {
    Add-CheckError "files/search/site-search-index.json: download record count ${DownloadRecords} does not match files.json $($DownloadHrefs.Count)"
  }
  if ($AudioRecords -ne $ExpectedAudioRecords) {
    Add-CheckError "files/search/site-search-index.json: audio record count ${AudioRecords} does not match files/content/audio.json ${ExpectedAudioRecords}"
  }
  if ($VideoRecords -ne $ExpectedVideoRecords) {
    Add-CheckError "files/search/site-search-index.json: video record count ${VideoRecords} does not match files/content/video-index.json ${ExpectedVideoRecords}"
  }
  if ($DocumentRecords -ne $ExpectedDocumentRecords) {
    Add-CheckError "files/search/site-search-index.json: document record count ${DocumentRecords} does not match files/content/video-index.json ${ExpectedDocumentRecords}"
  }
  foreach ($RequiredPageId in $RequiredPageIds) {
    if (-not $Ids.ContainsKey($RequiredPageId)) {
      Add-CheckError "files/search/site-search-index.json: missing required page record ${RequiredPageId}"
    }
  }

  $RuntimeItems = if ($DownloadsSearchIndex -and $DownloadsSearchIndex.items) {
    @(Merge-DownloadSearchRecords $Items $DownloadsSearchIndex)
  } else {
    @($Items)
  }
  Add-SearchTextCache $RuntimeItems

  foreach ($Check in @($SearchContent.checks)) {
    if (-not $Check -or -not $Check.query) {
      continue
    }

    $Matches = @(Find-SiteSearchMatches $RuntimeItems ([string]$Check.query))
    if (-not $Matches.Count) {
      Add-CheckError "site search query `"$($Check.query)`": no matching records"
      continue
    }

    $ExpectedTypes = @($Check.expectedAnyTypes | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
    if ($ExpectedTypes.Count) {
      $HasExpectedType = $false
      foreach ($Match in $Matches) {
        if ($ExpectedTypes -contains ([string]$Match.type)) {
          $HasExpectedType = $true
          break
        }
      }
      if (-not $HasExpectedType) {
        Add-CheckError "site search query `"$($Check.query)`": expected one of types $($ExpectedTypes -join ', ')"
      }
    }

    $ExpectedIds = @($Check.expectedAnyIds | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
    if ($ExpectedIds.Count) {
      $HasExpectedId = $false
      foreach ($Match in $Matches) {
        if ($ExpectedIds -contains ([string]$Match.id)) {
          $HasExpectedId = $true
          break
        }
      }
      if (-not $HasExpectedId) {
        Add-CheckError "site search query `"$($Check.query)`": expected one of ids $($ExpectedIds -join ', ')"
      }
    }
  }

  $PhraseQuery = New-UnicodeText @(0x0441, 0x043E, 0x043D, 0x0446, 0x0435, 0x20, 0x0440, 0x043E, 0x0437, 0x0443, 0x043C, 0x0443, 0x20, 0x0441, 0x0445, 0x043E, 0x0432, 0x0430, 0x043B, 0x043E, 0x0441, 0x044F)
  $StopZa = New-UnicodeText @(0x0437, 0x0430)
  $StopNa = New-UnicodeText @(0x043D, 0x0430)
  $StopNe = New-UnicodeText @(0x043D, 0x0435)
  $PhraseWithStopQuery = "${PhraseQuery} ${StopZa}"
  $PhraseMatches = @(Find-SiteSearchMatches $RuntimeItems $PhraseQuery)
  $PhraseWithStopMatches = @(Find-SiteSearchMatches $RuntimeItems $PhraseWithStopQuery)
  $PhraseExpectedIds = @("downloads-download-13", "downloads-download-24")
  if (-not $PhraseMatches.Count) {
    Add-CheckError "site search query `"sun/mind/hidden phrase`": no matching runtime records"
  } elseif ((@($PhraseMatches | Where-Object { $PhraseExpectedIds -contains ([string]$_.id) })).Count -eq 0) {
    Add-CheckError "site search query `"sun/mind/hidden phrase`": expected a known philosophy/theology download record"
  }
  if (-not $PhraseWithStopMatches.Count) {
    Add-CheckError "site search query `"sun/mind/hidden phrase + stop word`": no matching runtime records"
  } elseif ((@($PhraseWithStopMatches | Where-Object { $PhraseExpectedIds -contains ([string]$_.id) })).Count -eq 0) {
    Add-CheckError "site search query `"sun/mind/hidden phrase + stop word`": expected a known philosophy/theology download record"
  }
  if ($PhraseMatches.Count -and $PhraseWithStopMatches.Count -and ([string]$PhraseMatches[0].id) -ne ([string]$PhraseWithStopMatches[0].id)) {
    Add-CheckError "site search query `"sun/mind/hidden phrase + stop word`": top runtime match changed from $($PhraseMatches[0].id) to $($PhraseWithStopMatches[0].id)"
  }

  foreach ($StopWordQuery in @($StopZa, $StopNa, $StopNe)) {
    $StopWordMatches = @(Find-SiteSearchMatches $RuntimeItems $StopWordQuery)
    if ($StopWordMatches.Count -gt 0) {
      Add-CheckError "site search stop-word query `"$StopWordQuery`": should not return random records"
    }
  }

  $PdfMatches = @(Find-SiteSearchMatches $RuntimeItems "PDF")
  if (-not $PdfMatches.Count) {
    Add-CheckError "site search query `"PDF`": no matching records"
  } else {
    $PdfFileMatches = @($PdfMatches | Where-Object {
      (([string]$_.type) -eq "document" -or ([string]$_.type) -eq "download") -and
      (([string]$_.fileType).ToLowerInvariant() -eq "pdf" -or ([string]$_.href) -match "\.pdf($|[?#])")
    })
    if (-not $PdfFileMatches.Count) {
      Add-CheckError "site search query `"PDF`": expected document/download PDF records"
    }
    $PdfVideoMatches = @($PdfMatches | Where-Object { ([string]$_.type) -eq "video" })
    if ($PdfVideoMatches.Count -gt 0) {
      Add-CheckError "site search query `"PDF`": video records should not match only because support documents are PDFs"
    }
  }

  $PdfCyrQuery = New-UnicodeText @(0x043F, 0x0434, 0x0444)
  $PdfCyrMatches = @(Find-SiteSearchMatches $RuntimeItems $PdfCyrQuery)
  if (-not (@($PdfCyrMatches | Where-Object { ([string]$_.type) -eq "document" -or ([string]$_.type) -eq "download" })).Count) {
    Add-CheckError "site search query `"p-d-f cyrillic`": expected document/download records"
  }

  $EnglishDownloadMatches = @(Find-SiteSearchMatches $RuntimeItems "Interrelations Philosophy Theology")
  if (-not (@($EnglishDownloadMatches | Where-Object { ([string]$_.type) -eq "download" })).Count) {
    Add-CheckError "downloads search bilingual fields: English title should find a download record"
  }

  foreach ($RuntimeItem in @($RuntimeItems)) {
    $RenderedMeta = Get-RenderedMetaText $RuntimeItem
    if ($RenderedMeta -match "\[object Object\]|System\.Collections") {
      Add-CheckError "site search record $($RuntimeItem.id): rendered metadata contains object token"
    }
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
