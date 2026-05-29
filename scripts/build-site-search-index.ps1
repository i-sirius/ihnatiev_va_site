$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$OutputDir = Join-Path $Root "files/search"
$OutputPath = Join-Path $OutputDir "site-search-index.json"

function Read-JsonFile {
  param([string]$RelativePath)
  $Path = Join-Path $Root $RelativePath
  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }
  (Get-Content -Raw -Encoding UTF8 $Path) | ConvertFrom-Json
}

function Get-LocalizedValue {
  param(
    $Value,
    [string]$Locale,
    [string]$Fallback = ""
  )

  if ($null -eq $Value) {
    return $Fallback
  }
  if ($Value -is [string]) {
    return $Value
  }
  if ($Value -is [array]) {
    return (@($Value | ForEach-Object { Get-LocalizedValue $_ $Locale "" } | Where-Object { $_ }) -join " ").Trim()
  }
  if ($Value -is [pscustomobject]) {
    if ($Value.PSObject.Properties.Name -contains $Locale) {
      return Get-LocalizedValue $Value.$Locale $Locale $Fallback
    }
    if ($Value.PSObject.Properties.Name -contains "uk") {
      return Get-LocalizedValue $Value.uk $Locale $Fallback
    }
    if ($Value.PSObject.Properties.Name -contains "en") {
      return Get-LocalizedValue $Value.en $Locale $Fallback
    }
    $Parts = New-Object System.Collections.Generic.List[string]
    foreach ($Property in $Value.PSObject.Properties) {
      $Text = Get-LocalizedValue $Property.Value $Locale ""
      if ($Text) {
        $Parts.Add($Text) | Out-Null
      }
    }
    return ($Parts -join " ").Trim()
  }

  return ([string]$Value).Trim()
}

function Get-LocalizedObject {
  param(
    $Uk,
    $En
  )

  [ordered]@{
    uk = ([string]$Uk).Trim()
    en = ([string]$En).Trim()
  }
}

function Get-UnicodeText {
  param([string]$Codes)

  $Chars = New-Object System.Collections.Generic.List[char]
  foreach ($Code in ($Codes -split " ")) {
    if ($Code) {
      $Chars.Add([char][Convert]::ToInt32($Code, 16)) | Out-Null
    }
  }

  return (-join $Chars)
}

$UkLabelHome = Get-UnicodeText "0413 043E 043B 043E 0432 043D 0430"
$UkLabelPage = Get-UnicodeText "0421 0442 043E 0440 0456 043D 043A 0430"
$UkLabelAboutMe = Get-UnicodeText "041F 0440 043E 0020 043C 0435 043D 0435"
$UkLabelActivity = Get-UnicodeText "0414 0456 044F 043B 044C 043D 0456 0441 0442 044C"
$UkLabelDownloads = Get-UnicodeText "0417 0430 0432 0430 043D 0442 0430 0436 0435 043D 043D 044F"
$UkLabelContacts = Get-UnicodeText "041A 043E 043D 0442 0430 043A 0442 0438"
$UkLabelPublications = Get-UnicodeText "041F 0443 0431 043B 0456 043A 0430 0446 0456 0457"
$UkLabelMonographs = Get-UnicodeText "041C 043E 043D 043E 0433 0440 0430 0444 0456 0457"
$UkLabelArticles = Get-UnicodeText "0421 0442 0430 0442 0442 0456"

function Get-ShortText {
  param(
    [string]$Text,
    [int]$MaxLength = 620
  )

  $Normalized = ([string]$Text -replace "\s+", " ").Trim()
  if ($Normalized.Length -le $MaxLength) {
    return $Normalized
  }

  return $Normalized.Substring(0, $MaxLength).Trim() + "..."
}

function Join-SearchParts {
  param(
    [string[]]$Parts,
    [int]$MaxLength = 1400
  )

  Get-ShortText ((@($Parts) | Where-Object { $_ } | Select-Object -Unique) -join " ") $MaxLength
}

function Get-Keywords {
  param($Value)

  if ($Value -and $Value.PSObject.Properties.Name -contains "uk") {
    $Uk = @($Value.uk | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
  } else {
    $Uk = @()
  }
  if ($Value -and $Value.PSObject.Properties.Name -contains "en") {
    $En = @($Value.en | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
  } else {
    $En = @()
  }

  [ordered]@{
    uk = $Uk
    en = $En
  }
}

function Add-Record {
  param(
    [System.Collections.Generic.List[object]]$Items,
    [string]$Id,
    [string]$Type,
    [string]$Url,
    $Title,
    $Section,
    $Description,
    [string[]]$Topics = @(),
    $Keywords = $null,
    $SearchText,
    [string]$Href = "",
    $Aliases = $null,
    $Summary = $null,
    $Bibliography = $null
  )

  $RecordKeywords = if ($Keywords) { $Keywords } else { [ordered]@{ uk = @(); en = @() } }
  $Record = [ordered]@{
    id = $Id
    type = $Type
    url = $Url
    title = $Title
    section = $Section
    description = $Description
    topics = @($Topics | Where-Object { $_ } | Select-Object -Unique)
    keywords = $RecordKeywords
    searchText = $SearchText
  }

  if ($Href) {
    $Record.href = $Href
  }
  if ($Aliases) {
    $Record.aliases = $Aliases
  }
  if ($Summary) {
    $Record.summary = $Summary
  }
  if ($Bibliography) {
    $Record.bibliography = $Bibliography
  }

  $Items.Add([pscustomobject]$Record) | Out-Null
}

$HomeContent = Read-JsonFile "files/content/home.json"
$Activities = Read-JsonFile "files/content/activities.json"
$Pages = Read-JsonFile "files/content/pages.json"
$Publications = Read-JsonFile "files/content/publications.json"
$SocialLinks = Read-JsonFile "files/content/social-links.json"
$Downloads = Read-JsonFile "files/downloads/files.json"
$DownloadsIndex = Read-JsonFile "files/downloads/search-index.json"
$Items = New-Object System.Collections.Generic.List[object]

$HomeUk = $HomeContent.uk
$HomeEn = $HomeContent.en
$HomeSocialLabelsUk = @()
$HomeSocialLabelsEn = @()
foreach ($Link in @($SocialLinks.links)) {
  if ($Link.enabled -eq $false) {
    continue
  }
  $HomeSocialLabelsUk += Get-LocalizedValue $Link.label "uk" ""
  $HomeSocialLabelsEn += Get-LocalizedValue $Link.label "en" ""
}

$HomeSearchUk = Join-SearchParts @($HomeUk.aboutHeading, (Get-LocalizedValue $HomeUk.aboutParagraphs "uk" ""), ($HomeSocialLabelsUk -join " "))
$HomeSearchEn = Join-SearchParts @($HomeEn.aboutHeading, (Get-LocalizedValue $HomeEn.aboutParagraphs "en" ""), ($HomeSocialLabelsEn -join " "))
$HomeRecord = @{
  Items = $Items
  Id = "page-home"
  Type = "page"
  Url = "index.html"
  Title = (Get-LocalizedObject $UkLabelHome "Home")
  Section = (Get-LocalizedObject $UkLabelPage "Page")
  Description = (Get-LocalizedObject (Get-LocalizedValue $HomeUk.aboutHeading "uk" $UkLabelAboutMe) (Get-LocalizedValue $HomeEn.aboutHeading "en" "About Me"))
  Topics = @("philosophy")
  Keywords = $null
  SearchText = (Get-LocalizedObject $HomeSearchUk $HomeSearchEn)
}
Add-Record @HomeRecord

foreach ($Id in @("1", "2", "3")) {
  $Uk = $Activities.uk.$Id
  $En = $Activities.en.$Id
  $Url = "activity${Id}.html"
  $ActivitySearchUk = Join-SearchParts @($Uk.name, $Uk.cardDescription, (Get-LocalizedValue $Uk.heroImage "uk" ""))
  $ActivitySearchEn = Join-SearchParts @($En.name, $En.cardDescription, (Get-LocalizedValue $En.heroImage "en" ""))
  $ActivityRecord = @{
    Items = $Items
    Id = "activity-$Id"
    Type = "activity"
    Url = $Url
    Title = (Get-LocalizedObject (Get-LocalizedValue $Uk.name "uk" $UkLabelActivity) (Get-LocalizedValue $En.name "en" "Activity"))
    Section = (Get-LocalizedObject $UkLabelActivity "Activity")
    Description = (Get-LocalizedObject (Get-LocalizedValue $Uk.cardDescription "uk" "") (Get-LocalizedValue $En.cardDescription "en" ""))
    Topics = @("philosophy")
    Keywords = $null
    SearchText = (Get-LocalizedObject $ActivitySearchUk $ActivitySearchEn)
  }
  Add-Record @ActivityRecord
}

$PagesUk = $Pages.uk
$PagesEn = $Pages.en
$DownloadsPageSearchUk = Join-SearchParts @($PagesUk.downloads.pageTitle, $PagesUk.downloads.heading, $PagesUk.downloads.intro)
$DownloadsPageSearchEn = Join-SearchParts @($PagesEn.downloads.pageTitle, $PagesEn.downloads.heading, $PagesEn.downloads.intro)
$DownloadsPageRecord = @{
  Items = $Items
  Id = "page-downloads"
  Type = "page"
  Url = "downloads.html"
  Title = (Get-LocalizedObject (Get-LocalizedValue $PagesUk.downloads.pageTitle "uk" $UkLabelDownloads) (Get-LocalizedValue $PagesEn.downloads.pageTitle "en" "Downloads"))
  Section = (Get-LocalizedObject $UkLabelPage "Page")
  Description = (Get-LocalizedObject (Get-LocalizedValue $PagesUk.downloads.heading "uk" "") (Get-LocalizedValue $PagesEn.downloads.heading "en" ""))
  Topics = @("monographs", "articles")
  Keywords = $null
  SearchText = (Get-LocalizedObject $DownloadsPageSearchUk $DownloadsPageSearchEn)
}
Add-Record @DownloadsPageRecord

$ContactPageSearchUk = Join-SearchParts @($PagesUk.contact.pageTitle, $PagesUk.contact.heading, $PagesUk.contact.intro)
$ContactPageSearchEn = Join-SearchParts @($PagesEn.contact.pageTitle, $PagesEn.contact.heading, $PagesEn.contact.intro)
$ContactPageRecord = @{
  Items = $Items
  Id = "page-contact"
  Type = "page"
  Url = "contact.html"
  Title = (Get-LocalizedObject (Get-LocalizedValue $PagesUk.contact.pageTitle "uk" $UkLabelContacts) (Get-LocalizedValue $PagesEn.contact.pageTitle "en" "Contacts"))
  Section = (Get-LocalizedObject $UkLabelPage "Page")
  Description = (Get-LocalizedObject (Get-LocalizedValue $PagesUk.contact.intro "uk" "") (Get-LocalizedValue $PagesEn.contact.intro "en" ""))
  Topics = @()
  Keywords = $null
  SearchText = (Get-LocalizedObject $ContactPageSearchUk $ContactPageSearchEn)
}
Add-Record @ContactPageRecord

$PublicationLabelsUk = $Publications.uk
$PublicationLabelsEn = $Publications.en
$PublicationIndex = 0
foreach ($Publication in @($Publications.items)) {
  $PublicationIndex += 1
  $Text = Get-ShortText ([string]$Publication.text) 900
  $PublicationSearch = Join-SearchParts @($Text, [string]$Publication.year, [string]$Publication.type) 1100
  $PublicationRecord = @{
    Items = $Items
    Id = "publication-$PublicationIndex"
    Type = "publication"
    Url = "activity1.html"
    Title = (Get-LocalizedObject $Text $Text)
    Section = (Get-LocalizedObject (Get-LocalizedValue $PublicationLabelsUk.summary "uk" $UkLabelPublications) (Get-LocalizedValue $PublicationLabelsEn.summary "en" "Publications"))
    Description = (Get-LocalizedObject ([string]$Publication.year) ([string]$Publication.year))
    Topics = @("philosophy")
    Keywords = $null
    SearchText = (Get-LocalizedObject $PublicationSearch $PublicationSearch)
  }
  Add-Record @PublicationRecord
}

$DownloadsIndexByHref = @{}
foreach ($Item in @($DownloadsIndex.items)) {
  if ($Item.href) {
    $DownloadsIndexByHref[[string]$Item.href] = $Item
  }
}

function Add-DownloadRecord {
  param(
    $File,
    [string]$Collection,
    [string]$Category,
    [int]$Number
  )

  $Href = [string]$File.href
  $IndexItem = if ($DownloadsIndexByHref.ContainsKey($Href)) { $DownloadsIndexByHref[$Href] } else { $null }
  $IndexId = if ($IndexItem -and $IndexItem.id) { [string]$IndexItem.id } else { "download-$Number" }
  $TitleUk = Get-LocalizedValue $File.title "uk" (Get-LocalizedValue $File.label "uk" $Href)
  $TitleEn = Get-LocalizedValue $File.title "en" (Get-LocalizedValue $File.label "en" $TitleUk)
  $DescriptionUk = Get-LocalizedValue $File.summary "uk" (Get-LocalizedValue $File.description "uk" "")
  $DescriptionEn = Get-LocalizedValue $File.summary "en" (Get-LocalizedValue $File.description "en" $DescriptionUk)
  $Keywords = Get-Keywords $File.keywords
  $SnippetUk = ""
  $SnippetEn = ""

  if ($IndexItem -and $IndexItem.pageSearch) {
    $PageSearch = @($IndexItem.pageSearch)
    if ($PageSearch.Count -gt 0) {
      $SnippetUk = Get-ShortText ([string]$PageSearch[0].text) 420
      $SnippetEn = $SnippetUk
    }
  }

  $Topics = @($File.topics)
  if ($Collection -and $Topics -notcontains $Collection) {
    $Topics += $Collection
  }

  $DownloadSearchUk = Join-SearchParts @($TitleUk, $Category, $DescriptionUk, (Get-LocalizedValue $File.keywords "uk" ""), (Get-LocalizedValue $File.aliases "uk" ""), (Get-LocalizedValue $File.bibliography "uk" ""), $Href, $SnippetUk) 1500
  $DownloadSearchEn = Join-SearchParts @($TitleEn, $Category, $DescriptionEn, (Get-LocalizedValue $File.keywords "en" ""), (Get-LocalizedValue $File.aliases "en" ""), (Get-LocalizedValue $File.bibliography "en" ""), $Href, $SnippetEn) 1500
  $DownloadSearchText = Get-LocalizedObject $DownloadSearchUk $DownloadSearchEn

  $DownloadRecord = @{
    Items = $Items
    Id = "downloads-$IndexId"
    Type = "download"
    Url = "downloads.html"
    Title = (Get-LocalizedObject $TitleUk $TitleEn)
    Section = (Get-LocalizedObject $UkLabelDownloads "Downloads")
    Description = (Get-LocalizedObject $DescriptionUk $DescriptionEn)
    Topics = $Topics
    Keywords = $Keywords
    SearchText = $DownloadSearchText
    Href = $Href
    Aliases = $File.aliases
    Summary = $File.summary
    Bibliography = $File.bibliography
  }
  Add-Record @DownloadRecord
}

$DownloadNumber = 0
foreach ($File in @($Downloads.monographs)) {
  $DownloadNumber += 1
  Add-DownloadRecord $File "monographs" $UkLabelMonographs $DownloadNumber
}
foreach ($Group in @($Downloads.articles)) {
  $Category = Get-LocalizedValue $Group.title "uk" $UkLabelArticles
  foreach ($File in @($Group.files)) {
    $DownloadNumber += 1
    Add-DownloadRecord $File "articles" $Category $DownloadNumber
  }
}

$GeneratedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$OutputItems = $Items.ToArray()
$Output = [ordered]@{
  version = "1"
  generatedAt = $GeneratedAt
  source = "scripts/build-site-search-index.ps1"
  itemCount = $Items.Count
  items = $OutputItems
}

if (-not (Test-Path -LiteralPath $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$Json = $Output | ConvertTo-Json -Depth 16
[IO.File]::WriteAllText($OutputPath, $Json + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))

Write-Host "Site search index built: $($Items.Count) records -> files/search/site-search-index.json"
