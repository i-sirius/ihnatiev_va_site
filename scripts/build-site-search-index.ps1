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
  if ($Value -is [System.Collections.IDictionary]) {
    if ($Value.Contains($Locale)) {
      return Get-LocalizedValue $Value[$Locale] $Locale $Fallback
    }
    if ($Value.Contains("uk")) {
      return Get-LocalizedValue $Value["uk"] $Locale $Fallback
    }
    if ($Value.Contains("en")) {
      return Get-LocalizedValue $Value["en"] $Locale $Fallback
    }
    $Parts = New-Object System.Collections.Generic.List[string]
    foreach ($Key in $Value.Keys) {
      $Text = Get-LocalizedValue $Value[$Key] $Locale ""
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
$UkLabelAudio = Get-UnicodeText "0410 0443 0434 0456 043E"
$UkLabelSermons = Get-UnicodeText "041F 0440 043E 043F 043E 0432 0456 0434 0456"
$UkLabelSpiritualActivity = Get-UnicodeText "0414 0443 0445 043E 0432 043D 0430 0020 0434 0456 044F 043B 044C 043D 0456 0441 0442 044C"
$UkLabelResearchActivity = Get-UnicodeText "041D 0430 0443 043A 043E 0432 0430 0020 0434 0456 044F 043B 044C 043D 0456 0441 0442 044C"
$UkLabelEducationalActivity = Get-UnicodeText "041E 0441 0432 0456 0442 043D 044F 0020 0434 0456 044F 043B 044C 043D 0456 0441 0442 044C"
$UkLabelVideo = Get-UnicodeText "0412 0456 0434 0435 043E"
$UkLabelReports = Get-UnicodeText "0414 043E 043F 043E 0432 0456 0434 0456"
$UkLabelDocuments = Get-UnicodeText "041C 0430 0442 0435 0440 0456 0430 043B 0438"
$UkLabelVideoDocuments = Get-UnicodeText "041C 0430 0442 0435 0440 0456 0430 043B 0438 0020 0434 043E 0020 0432 0456 0434 0435 043E"
$UkLabelPdfCyr = Get-UnicodeText "043F 0434 0444"
$UkLabelNavigation = Get-UnicodeText "041D 0430 0432 0456 0433 0430 0446 0456 044F"
$UkLabelMenu = Get-UnicodeText "041C 0435 043D 044E"
$UkLabelSearch = Get-UnicodeText "041F 043E 0448 0443 043A"

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

function ConvertTo-QueryValue {
  param([string]$Value)

  return [uri]::EscapeDataString(([string]$Value).Trim())
}

function New-DownloadsItemUrl {
  param(
    [string]$ItemId,
    [string]$SearchText
  )

  $Params = New-Object System.Collections.Generic.List[string]
  if ($ItemId) {
    $Params.Add(("item={0}" -f (ConvertTo-QueryValue $ItemId))) | Out-Null
  }
  if ($SearchText) {
    $Params.Add(("search={0}" -f (ConvertTo-QueryValue $SearchText))) | Out-Null
  }

  if ($Params.Count -gt 0) {
    return "downloads.html?$($Params -join '&')"
  }
  return "downloads.html"
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

function Get-StringList {
  param($Value)

  if ($null -eq $Value) {
    return @()
  }

  if ($Value -is [array]) {
    return @($Value | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ } | Select-Object -Unique)
  }

  if ($Value -is [pscustomobject]) {
    $Parts = New-Object System.Collections.Generic.List[string]
    foreach ($Property in $Value.PSObject.Properties) {
      foreach ($Item in @(Get-StringList $Property.Value)) {
        $Parts.Add($Item) | Out-Null
      }
    }
    return @($Parts.ToArray() | Where-Object { $_ } | Select-Object -Unique)
  }

  if ($Value -is [System.Collections.IDictionary]) {
    $Parts = New-Object System.Collections.Generic.List[string]
    foreach ($Key in $Value.Keys) {
      foreach ($Item in @(Get-StringList $Value[$Key])) {
        $Parts.Add($Item) | Out-Null
      }
    }
    return @($Parts.ToArray() | Where-Object { $_ } | Select-Object -Unique)
  }

  $Text = ([string]$Value).Trim()
  if ($Text) {
    return @($Text)
  }

  return @()
}

function Join-UniqueList {
  param($Values)

  @($Values | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ } | Select-Object -Unique)
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

function Get-NormalizedObject {
  param($SearchText)

  [ordered]@{
    uk = Normalize-SearchText (Get-LocalizedValue $SearchText "uk" "")
    en = Normalize-SearchText (Get-LocalizedValue $SearchText "en" "")
  }
}

function Merge-KeywordLists {
  param(
    [string[]]$Uk = @(),
    [string[]]$En = @()
  )

  [ordered]@{
    uk = Join-UniqueList $Uk
    en = Join-UniqueList $En
  }
}

function Get-ObjectProperty {
  param(
    $Object,
    [string]$Name
  )

  if ($Object -and $Object.PSObject.Properties.Name -contains $Name) {
    return $Object.$Name
  }

  return $null
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
    $Bibliography = $null,
    [string[]]$Tags = @(),
    [string]$TitleEn = "",
    [string]$DescriptionEn = "",
    [string[]]$Lang = @("uk", "en"),
    [string]$Category = "",
    [string]$FileType = "",
    [string]$Language = "",
    [string]$Date = "",
    [string]$Duration = "",
    [string]$VideoId = "",
    [string]$PageUrl = "",
    [string]$ExternalUrl = "",
    [string]$DocumentType = "",
    [int]$RankBoost = 0
  )

  $RecordKeywords = if ($Keywords) { $Keywords } else { [ordered]@{ uk = @(); en = @() } }
  $RecordTags = Join-UniqueList (@($Tags) + @($Topics) + @(Get-StringList $RecordKeywords))
  $TitleEnText = if ($TitleEn) { $TitleEn } else { Get-LocalizedValue $Title "en" "" }
  $DescriptionEnText = if ($DescriptionEn) { $DescriptionEn } else { Get-LocalizedValue $Description "en" "" }
  $Record = [ordered]@{
    id = $Id
    type = $Type
    url = $Url
    title = $Title
    titleEn = $TitleEnText
    section = $Section
    description = $Description
    descriptionEn = $DescriptionEnText
    topics = @($Topics | Where-Object { $_ } | Select-Object -Unique)
    tags = $RecordTags
    keywords = $RecordKeywords
    lang = Join-UniqueList $Lang
    searchText = $SearchText
    normalizedText = Get-NormalizedObject $SearchText
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
  if ($Category) {
    $Record.category = $Category
  }
  if ($FileType) {
    $Record.fileType = $FileType
  }
  if ($Language) {
    $Record.language = $Language
  }
  if ($Date) {
    $Record.date = $Date
  }
  if ($Duration) {
    $Record.duration = $Duration
  }
  if ($VideoId) {
    $Record.videoId = $VideoId
  }
  if ($PageUrl) {
    $Record.pageUrl = $PageUrl
  }
  if ($ExternalUrl) {
    $Record.externalUrl = $ExternalUrl
  }
  if ($DocumentType) {
    $Record.documentType = $DocumentType
  }
  if ($RankBoost -ne 0) {
    $Record.rankBoost = $RankBoost
  }

  $Items.Add([pscustomobject]$Record) | Out-Null
}

$HomeContent = Read-JsonFile "files/content/home.json"
$Activities = Read-JsonFile "files/content/activities.json"
$Pages = Read-JsonFile "files/content/pages.json"
$Publications = Read-JsonFile "files/content/publications.json"
$SocialLinks = Read-JsonFile "files/content/social-links.json"
$AudioContent = Read-JsonFile "files/content/audio.json"
$VideoContent = Read-JsonFile "files/content/video-index.json"
$SearchContent = Read-JsonFile "files/content/search-sections.json"
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

$HomeKeywordSet = Get-ObjectProperty $SearchContent.pageKeywords "home"
$HomeKeywordTopics = Get-StringList $HomeKeywordSet.topics
$HomeKeywordUk = Get-StringList $HomeKeywordSet.uk
$HomeKeywordEn = Get-StringList $HomeKeywordSet.en
$HomeSearchUk = Join-SearchParts @($HomeUk.aboutHeading, (Get-LocalizedValue $HomeUk.aboutParagraphs "uk" ""), ($HomeSocialLabelsUk -join " "), ($HomeKeywordUk -join " "))
$HomeSearchEn = Join-SearchParts @($HomeEn.aboutHeading, (Get-LocalizedValue $HomeEn.aboutParagraphs "en" ""), ($HomeSocialLabelsEn -join " "), ($HomeKeywordEn -join " "))
$HomeRecord = @{
  Items = $Items
  Id = "page-home"
  Type = "page"
  Url = "index.html"
  Title = (Get-LocalizedObject $UkLabelHome "Home")
  Section = (Get-LocalizedObject $UkLabelPage "Page")
  Description = (Get-LocalizedObject (Get-LocalizedValue $HomeUk.aboutHeading "uk" $UkLabelAboutMe) (Get-LocalizedValue $HomeEn.aboutHeading "en" "About Me"))
  Topics = $HomeKeywordTopics
  Keywords = (Merge-KeywordLists -Uk $HomeKeywordUk -En $HomeKeywordEn)
  SearchText = (Get-LocalizedObject $HomeSearchUk $HomeSearchEn)
  Tags = $HomeKeywordTopics
  RankBoost = 35
}
Add-Record @HomeRecord

foreach ($Id in @("1", "2", "3")) {
  $Uk = $Activities.uk.$Id
  $En = $Activities.en.$Id
  $Url = "activity${Id}.html"
  $KeywordSet = Get-ObjectProperty $SearchContent.pageKeywords "activity$Id"
  $KeywordTopics = Get-StringList $KeywordSet.topics
  $KeywordUk = Get-StringList $KeywordSet.uk
  $KeywordEn = Get-StringList $KeywordSet.en
  $ActivitySearchUk = Join-SearchParts @($Uk.name, $Uk.cardDescription, (Get-LocalizedValue $Uk.heroImage "uk" ""), ($KeywordUk -join " "))
  $ActivitySearchEn = Join-SearchParts @($En.name, $En.cardDescription, (Get-LocalizedValue $En.heroImage "en" ""), ($KeywordEn -join " "))
  $ActivityRecord = @{
    Items = $Items
    Id = "page-activity$Id"
    Type = "page"
    Url = $Url
    Title = (Get-LocalizedObject (Get-LocalizedValue $Uk.name "uk" $UkLabelActivity) (Get-LocalizedValue $En.name "en" "Activity"))
    Section = (Get-LocalizedObject $UkLabelPage "Page")
    Description = (Get-LocalizedObject (Get-LocalizedValue $Uk.cardDescription "uk" "") (Get-LocalizedValue $En.cardDescription "en" ""))
    Topics = $KeywordTopics
    Keywords = (Merge-KeywordLists -Uk $KeywordUk -En $KeywordEn)
    SearchText = (Get-LocalizedObject $ActivitySearchUk $ActivitySearchEn)
    Tags = $KeywordTopics
    RankBoost = 30
  }
  Add-Record @ActivityRecord
}

$PagesUk = $Pages.uk
$PagesEn = $Pages.en
$DownloadsKeywordSet = Get-ObjectProperty $SearchContent.pageKeywords "downloads"
$DownloadsKeywordTopics = Get-StringList $DownloadsKeywordSet.topics
$DownloadsKeywordUk = Get-StringList $DownloadsKeywordSet.uk
$DownloadsKeywordEn = Get-StringList $DownloadsKeywordSet.en
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
  Topics = $DownloadsKeywordTopics
  Keywords = (Merge-KeywordLists -Uk $DownloadsKeywordUk -En $DownloadsKeywordEn)
  SearchText = (Get-LocalizedObject $DownloadsPageSearchUk $DownloadsPageSearchEn)
  Tags = $DownloadsKeywordTopics
  RankBoost = 28
}
Add-Record @DownloadsPageRecord

$ContactKeywordSet = Get-ObjectProperty $SearchContent.pageKeywords "contact"
$ContactKeywordTopics = Get-StringList $ContactKeywordSet.topics
$ContactKeywordUk = Get-StringList $ContactKeywordSet.uk
$ContactKeywordEn = Get-StringList $ContactKeywordSet.en
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
  Topics = $ContactKeywordTopics
  Keywords = (Merge-KeywordLists -Uk $ContactKeywordUk -En $ContactKeywordEn)
  SearchText = (Get-LocalizedObject $ContactPageSearchUk $ContactPageSearchEn)
  Tags = $ContactKeywordTopics
  RankBoost = 20
}
Add-Record @ContactPageRecord

$MenuKeywordSet = Get-ObjectProperty $SearchContent.pageKeywords "menu"
$MenuKeywordTopics = Get-StringList $MenuKeywordSet.topics
$MenuKeywordUk = Get-StringList $MenuKeywordSet.uk
$MenuKeywordEn = Get-StringList $MenuKeywordSet.en
$MenuSearchUk = Join-SearchParts @($UkLabelMenu, $UkLabelNavigation, $UkLabelHome, $UkLabelResearchActivity, $UkLabelEducationalActivity, $UkLabelSpiritualActivity, $UkLabelDownloads, $UkLabelSearch, $UkLabelContacts)
$MenuSearchEn = Join-SearchParts @("Menu", "Navigation", "Home", "Research Activity", "Educational Activity", "Priestly Ministry", "Downloads", "Search", "Contacts")
$MenuRecord = @{
  Items = $Items
  Id = "page-menu"
  Type = "page"
  Url = "menu.html"
  Title = (Get-LocalizedObject $UkLabelMenu "Menu")
  Section = (Get-LocalizedObject $UkLabelNavigation "Navigation")
  Description = (Get-LocalizedObject (Get-LocalizedValue $SearchContent.menu.description "uk" "") (Get-LocalizedValue $SearchContent.menu.description "en" ""))
  Topics = $MenuKeywordTopics
  Keywords = (Merge-KeywordLists -Uk $MenuKeywordUk -En $MenuKeywordEn)
  SearchText = (Get-LocalizedObject $MenuSearchUk $MenuSearchEn)
  Tags = $MenuKeywordTopics
}
Add-Record @MenuRecord

$SectionDefinitions = @($SearchContent.sections)
foreach ($SectionDefinition in $SectionDefinitions) {
  $SectionTitleUk = Get-LocalizedValue $SectionDefinition.title "uk" ""
  $SectionTitleEn = Get-LocalizedValue $SectionDefinition.title "en" $SectionTitleUk
  $SectionNameUk = Get-LocalizedValue $SectionDefinition.section "uk" ""
  $SectionNameEn = Get-LocalizedValue $SectionDefinition.section "en" $SectionNameUk
  $SectionDescriptionUk = Get-LocalizedValue $SectionDefinition.description "uk" ""
  $SectionDescriptionEn = Get-LocalizedValue $SectionDefinition.description "en" $SectionDescriptionUk
  $SectionTags = Get-StringList $SectionDefinition.tags
  $SectionKeywordUk = Get-StringList $SectionDefinition.keywords.uk
  $SectionKeywordEn = Get-StringList $SectionDefinition.keywords.en
  $SectionSearchUk = Join-SearchParts @($SectionTitleUk, $SectionDescriptionUk, ($SectionKeywordUk -join " "))
  $SectionSearchEn = Join-SearchParts @($SectionTitleEn, $SectionDescriptionEn, ($SectionKeywordEn -join " "))
  $SectionRecord = @{
    Items = $Items
    Id = $SectionDefinition.id
    Type = "section"
    Url = $SectionDefinition.url
    Title = (Get-LocalizedObject $SectionTitleUk $SectionTitleEn)
    Section = (Get-LocalizedObject $SectionNameUk $SectionNameEn)
    Description = (Get-LocalizedObject $SectionDescriptionUk $SectionDescriptionEn)
    Topics = $SectionTags
    Keywords = (Merge-KeywordLists -Uk $SectionKeywordUk -En $SectionKeywordEn)
    SearchText = (Get-LocalizedObject $SectionSearchUk $SectionSearchEn)
    Tags = $SectionTags
    RankBoost = 18
  }
  Add-Record @SectionRecord
}

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
    Url = "activity1.html#publication-$PublicationIndex"
    Title = (Get-LocalizedObject $Text $Text)
    Section = (Get-LocalizedObject (Get-LocalizedValue $PublicationLabelsUk.summary "uk" $UkLabelPublications) (Get-LocalizedValue $PublicationLabelsEn.summary "en" "Publications"))
    Description = (Get-LocalizedObject ([string]$Publication.year) ([string]$Publication.year))
    Topics = @("philosophy")
    Keywords = $null
    SearchText = (Get-LocalizedObject $PublicationSearch $PublicationSearch)
  }
  Add-Record @PublicationRecord
}

foreach ($Video in @($VideoContent.items)) {
  if (-not $Video -or $Video.enabled -eq $false) {
    continue
  }

  $VideoId = ([string]$Video.id).Trim()
  if (-not $VideoId) {
    continue
  }

  $VideoTitleUk = Get-LocalizedValue $Video.title "uk" ""
  $VideoTitleEn = if ($Video.titleEn) { ([string]$Video.titleEn).Trim() } else { Get-LocalizedValue $Video.title "en" $VideoTitleUk }
  $VideoDescriptionUk = Get-LocalizedValue $Video.description "uk" ""
  $VideoDescriptionEn = if ($Video.descriptionEn) { ([string]$Video.descriptionEn).Trim() } else { Get-LocalizedValue $Video.description "en" $VideoDescriptionUk }
  $VideoTagsUk = Join-UniqueList (@(Get-StringList $Video.tags) + @(Get-StringList $Video.keywords.uk))
  $VideoTagsEn = Join-UniqueList (@(Get-StringList $Video.tagsEn) + @(Get-StringList $Video.keywords.en))
  if (-not $VideoTagsEn.Count) {
    $VideoTagsEn = $VideoTagsUk
  }
  $VideoPageUrl = if ($Video.pageUrl) { ([string]$Video.pageUrl).Trim() } else { "activity1.html" }
  $VideoAnchorUrl = if ($VideoPageUrl.Contains("#")) { $VideoPageUrl } else { "$VideoPageUrl#video-$VideoId" }
  $VideoExternalUrl = if ($Video.url) { ([string]$Video.url).Trim() } else { "https://www.youtube.com/watch?v=$VideoId" }
  $SupportDocs = @($Video.supportDocuments | Where-Object { $_ -and $_.enabled -ne $false -and $_.url })
  $SupportDocTitlesUk = @($SupportDocs | ForEach-Object { Get-LocalizedValue $_.title "uk" "" } | Where-Object { $_ })
  $SupportDocTitlesEn = @($SupportDocs | ForEach-Object { if ($_.titleEn) { ([string]$_.titleEn).Trim() } else { Get-LocalizedValue $_.title "en" "" } } | Where-Object { $_ })
  $VideoKeywords = Merge-KeywordLists `
    -Uk (@($VideoTagsUk) + @($UkLabelVideo, $UkLabelReports, $UkLabelDocuments)) `
    -En (@($VideoTagsEn) + @("Video", "Reports", "Materials"))
  $VideoSearchUk = Join-SearchParts @($VideoTitleUk, $VideoDescriptionUk, ($VideoTagsUk -join " "), ($SupportDocTitlesUk -join " "), $UkLabelVideo, $UkLabelReports, $UkLabelDocuments) 1500
  $VideoSearchEn = Join-SearchParts @($VideoTitleEn, $VideoDescriptionEn, ($VideoTagsEn -join " "), ($SupportDocTitlesEn -join " "), "Video", "Reports", "Materials") 1500
  $VideoRecord = @{
    Items = $Items
    Id = "video-$VideoId"
    Type = "video"
    Url = $VideoAnchorUrl
    Title = (Get-LocalizedObject $VideoTitleUk $VideoTitleEn)
    Section = (Get-LocalizedObject $UkLabelVideo "Video")
    Description = (Get-LocalizedObject $VideoDescriptionUk $VideoDescriptionEn)
    Topics = Join-UniqueList (@("video", "reports", "research") + $VideoTagsUk + $VideoTagsEn)
    Keywords = $VideoKeywords
    SearchText = (Get-LocalizedObject $VideoSearchUk $VideoSearchEn)
    Tags = Join-UniqueList (@("video", "reports", "research") + $VideoTagsUk + $VideoTagsEn)
    Date = ([string]$Video.date).Trim()
    VideoId = $VideoId
    PageUrl = $VideoAnchorUrl
    ExternalUrl = $VideoExternalUrl
    RankBoost = 45
  }
  Add-Record @VideoRecord

  foreach ($Document in $SupportDocs) {
    $DocumentUrl = ([string]$Document.url).Trim()
    $DocumentId = if ($Document.id) { ([string]$Document.id).Trim() } else { "video-$VideoId-document" }
    $DocumentTitleUk = Get-LocalizedValue $Document.title "uk" ""
    $DocumentTitleEn = if ($Document.titleEn) { ([string]$Document.titleEn).Trim() } else { Get-LocalizedValue $Document.title "en" $DocumentTitleUk }
    $DocumentDescriptionUk = Get-LocalizedValue $Document.description "uk" $VideoDescriptionUk
    $DocumentDescriptionEn = if ($Document.descriptionEn) { ([string]$Document.descriptionEn).Trim() } else { Get-LocalizedValue $Document.description "en" $VideoDescriptionEn }
    $DocumentTagsUk = Join-UniqueList (@(Get-StringList $Document.tags) + @(Get-StringList $Document.keywords.uk) + $VideoTagsUk + @($UkLabelDocuments, "PDF", $UkLabelPdfCyr))
    $DocumentTagsEn = Join-UniqueList (@(Get-StringList $Document.tagsEn) + @(Get-StringList $Document.keywords.en) + $VideoTagsEn + @("Materials", "PDF"))
    $DocumentKeywords = Merge-KeywordLists -Uk $DocumentTagsUk -En $DocumentTagsEn
    $DocumentSearchUk = Join-SearchParts @($DocumentTitleUk, $DocumentDescriptionUk, $VideoTitleUk, ($DocumentTagsUk -join " "), $DocumentUrl, $UkLabelVideoDocuments, $UkLabelDocuments, "PDF") 1500
    $DocumentSearchEn = Join-SearchParts @($DocumentTitleEn, $DocumentDescriptionEn, $VideoTitleEn, ($DocumentTagsEn -join " "), $DocumentUrl, "Video support documents", "Materials", "PDF") 1500
    $DocumentRecord = @{
      Items = $Items
      Id = "document-$DocumentId"
      Type = "document"
      Url = $DocumentUrl
      Title = (Get-LocalizedObject $DocumentTitleUk $DocumentTitleEn)
      Section = (Get-LocalizedObject $UkLabelVideoDocuments "Video Materials")
      Description = (Get-LocalizedObject $DocumentDescriptionUk $DocumentDescriptionEn)
      Topics = Join-UniqueList (@("document", "pdf", "materials", "video-support") + $DocumentTagsUk + $DocumentTagsEn)
      Keywords = $DocumentKeywords
      SearchText = (Get-LocalizedObject $DocumentSearchUk $DocumentSearchEn)
      Tags = Join-UniqueList (@("document", "pdf", "materials", "video-support") + $DocumentTagsUk + $DocumentTagsEn)
      Href = $DocumentUrl
      FileType = if ($Document.type) { ([string]$Document.type).Trim() } else { "pdf" }
      Language = if ($Document.language) { ([string]$Document.language).Trim() } else { "uk" }
      VideoId = $VideoId
      PageUrl = $VideoAnchorUrl
      DocumentType = "video-support"
      RankBoost = 55
    }
    Add-Record @DocumentRecord
  }
}

$AudioKeywordSet = Get-ObjectProperty $SearchContent.pageKeywords "audio"
$AudioAliasUk = Get-StringList $AudioKeywordSet.uk
$AudioAliasEn = Get-StringList $AudioKeywordSet.en
$AudioNumber = 0
foreach ($AudioItem in @($AudioContent.items)) {
  if (
    -not $AudioItem -or
    $AudioItem.enabled -eq $false -or
    ([string]$AudioItem.section) -ne "church" -or
    ([string]$AudioItem.category) -ne "sermons" -or
    -not ([string]$AudioItem.src).Trim()
  ) {
    continue
  }

  $AudioNumber += 1
  $AudioId = if ($AudioItem.id) { [string]$AudioItem.id } else { "sermon-$AudioNumber" }
  $TitleUk = ([string]$AudioItem.title).Trim()
  $TitleEn = if ($AudioItem.titleEn) { ([string]$AudioItem.titleEn).Trim() } else { $TitleUk }
  $DescriptionUk = ([string]$AudioItem.description).Trim()
  $DescriptionEn = if ($AudioItem.descriptionEn) { ([string]$AudioItem.descriptionEn).Trim() } else { $DescriptionUk }
  $TagsUk = @($AudioItem.tags | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
  $TagsEn = @($AudioItem.tagsEn | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
  if (-not $TagsEn.Count) {
    $TagsEn = $TagsUk
  }

  $AudioTitleUk = ("{0}: {1}" -f $UkLabelSermons, $TitleUk).Trim()
  $AudioTitleEn = ("Sermons: {0}" -f $TitleEn).Trim()
  $AudioSearchUk = Join-SearchParts @($AudioTitleUk, $DescriptionUk, ($TagsUk -join " "), $UkLabelAudio, $UkLabelSermons, $UkLabelSpiritualActivity, ($AudioAliasUk -join " ")) 1100
  $AudioSearchEn = Join-SearchParts @($AudioTitleEn, $DescriptionEn, ($TagsEn -join " "), "Audio", "Sermons", "Spiritual activity", "Church", ($AudioAliasEn -join " ")) 1100
  $AudioKeywords = Merge-KeywordLists `
    -Uk (@($TagsUk) + $AudioAliasUk) `
    -En (@($TagsEn) + $AudioAliasEn)
  $AudioTopics = @("audio", "sermons") + $TagsUk + $TagsEn
  $AudioRecord = @{
    Items = $Items
    Id = "audio-$AudioId"
    Type = "audio"
    Url = "activity3.html#audio-$AudioId"
    Title = (Get-LocalizedObject $AudioTitleUk $AudioTitleEn)
    Section = (Get-LocalizedObject $UkLabelSermons "Sermons")
    Description = (Get-LocalizedObject $DescriptionUk $DescriptionEn)
    Topics = $AudioTopics
    Keywords = $AudioKeywords
    SearchText = (Get-LocalizedObject $AudioSearchUk $AudioSearchEn)
    Tags = $AudioTopics
    Date = ([string]$AudioItem.date).Trim()
    Duration = ([string]$AudioItem.duration).Trim()
    Category = ([string]$AudioItem.category).Trim()
    FileType = "audio"
    RankBoost = 38
  }
  Add-Record @AudioRecord
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

  if (
    -not $File -or
    $File.enabled -eq $false -or
    $File.hidden -eq $true -or
    $File.draft -eq $true -or
    $File.search -eq $false
  ) {
    return
  }

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
  $Language = Get-LocalizedValue $File.bibliography.language "uk" ""
  if (-not $Language -and $File.language) {
    $Language = ([string]$File.language).Trim()
  }
  $FileType = if ($File.type) { ([string]$File.type).Trim() } else { "file" }
  $FileTypeAliases = @($FileType)
  if ($FileType.ToLowerInvariant() -eq "pdf") {
    $FileTypeAliases += $UkLabelPdfCyr
  }
  $DownloadTags = Join-UniqueList (@($Topics) + @(Get-StringList $Keywords) + @(Get-StringList $File.aliases) + @($FileTypeAliases) + @($Language, $Category))

  $DownloadSearchUk = Join-SearchParts @($TitleUk, $Category, $DescriptionUk, (Get-LocalizedValue $File.keywords "uk" ""), (Get-LocalizedValue $File.aliases "uk" ""), (Get-LocalizedValue $File.bibliography "uk" ""), $Href, ($FileTypeAliases -join " "), $Language, $SnippetUk) 1500
  $DownloadSearchEn = Join-SearchParts @($TitleEn, $Category, $DescriptionEn, (Get-LocalizedValue $File.keywords "en" ""), (Get-LocalizedValue $File.aliases "en" ""), (Get-LocalizedValue $File.bibliography "en" ""), $Href, $FileType, $Language, $SnippetEn) 1500
  $DownloadSearchText = Get-LocalizedObject $DownloadSearchUk $DownloadSearchEn
  $DownloadUrl = New-DownloadsItemUrl $IndexId $TitleUk

  $DownloadRecord = @{
    Items = $Items
    Id = "downloads-$IndexId"
    Type = "download"
    Url = $DownloadUrl
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
    Tags = $DownloadTags
    Category = $Category
    FileType = $FileType
    Language = $Language
    RankBoost = 12
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

$Json = ($Output | ConvertTo-Json -Depth 16) -replace "`r`n", "`n"
[IO.File]::WriteAllText($OutputPath, $Json + "`n", [Text.UTF8Encoding]::new($false))

Write-Host "Site search index built: $($Items.Count) records -> files/search/site-search-index.json"
