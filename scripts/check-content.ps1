$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Errors = New-Object System.Collections.Generic.List[string]
$JsonCount = 0
$ReferenceCount = 0
$AdminPathCount = 0
$BomCount = 0
$ReportedBomFiles = New-Object System.Collections.Generic.HashSet[string]
$SiteOrigin = "https://iva.net.ua"
$SitemapUrl = "$SiteOrigin/sitemap.xml"
$PublicHtmlPages = @(
  @{ Path = "index.html"; Url = "$SiteOrigin/" },
  @{ Path = "activity1.html"; Url = "$SiteOrigin/activity1.html" },
  @{ Path = "activity2.html"; Url = "$SiteOrigin/activity2.html" },
  @{ Path = "activity3.html"; Url = "$SiteOrigin/activity3.html" },
  @{ Path = "downloads.html"; Url = "$SiteOrigin/downloads.html" },
  @{ Path = "contact.html"; Url = "$SiteOrigin/contact.html" }
)
$ExpectedSitemapUrls = @($PublicHtmlPages | ForEach-Object { $_.Url })
$TechnicalUrlPattern = "(localhost|127\.0\.0\.1|github\.io|githubusercontent\.com)"

function Add-CheckError {
  param([string]$Message)
  $script:Errors.Add($Message) | Out-Null
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
    $Content = Get-Content -Raw -Encoding UTF8 (Get-RepoPath $RelativePath)
    if ($Content.Length -gt 0 -and [int][char]$Content[0] -eq 0xFEFF) {
      $Content = $Content.Substring(1)
      if ($script:ReportedBomFiles.Add($RelativePath)) {
        $script:BomCount += 1
        Add-CheckError "${RelativePath}: contains UTF-8 BOM; save as UTF-8 without BOM"
      }
    }

    return $Content | ConvertFrom-Json
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
  $Clean = $Clean.TrimStart("/", "\")
  if (-not $Clean -or $Clean -eq ".") {
    return
  }

  $script:ReferenceCount += 1
  if (-not (Test-Path -LiteralPath (Get-RepoPath $Clean))) {
    Add-CheckError "${SourceFile}: missing local file `"$Reference`" ($Context)"
  }
}

function Test-CmsMediaPath {
  param(
    [string]$RelativePath,
    [string]$Value,
    [string]$Context,
    [string]$ExpectedPrefix
  )

  if (-not $Value) {
    return
  }

  $Normalized = ([string]$Value) -replace "\\", "/"
  if ($Normalized.StartsWith("admin/") -or $Normalized.StartsWith("/admin/")) {
    Add-CheckError "${RelativePath}: ${Context} must not point into admin/"
  }

  foreach ($DuplicatePath in @(
    "files/media/activity1/files/media/activity1",
    "files/media/activity2/files/media/activity2",
    "files/media/activity3/files/media/activity3",
    "files/activity2/files/activity2",
    "files/downloads/files/downloads",
    "files/publications/files/publications",
    "files/content/files/publications"
  )) {
    if ($Normalized.Contains($DuplicatePath)) {
      Add-CheckError "${RelativePath}: ${Context} contains duplicated CMS media path `"$DuplicatePath`""
    }
  }

  if ($ExpectedPrefix -and -not $Normalized.StartsWith($ExpectedPrefix)) {
    Add-CheckError "${RelativePath}: ${Context} must use root-relative path `"${ExpectedPrefix}...`""
  }
}

function Test-PublicationFileReference {
  param(
    [string]$RelativePath,
    $Value,
    [string]$Context
  )

  if ($null -eq $Value -or ([string]$Value).Trim() -eq "") {
    return
  }

  if ($Value -isnot [string]) {
    Add-CheckError "${RelativePath}: ${Context} must be a string when present"
    return
  }

  $Normalized = ([string]$Value).Trim() -replace "\\", "/"
  if ($Normalized -match "^[a-z][a-z0-9+.-]*://" -or $Normalized.StartsWith("//")) {
    Add-CheckError "${RelativePath}: ${Context} must be a local file, not an external URL"
    return
  }

  Test-CmsMediaPath $RelativePath $Normalized $Context "files/publications/"

  $CleanPath = Remove-UrlParts $Normalized
  if ($CleanPath -notmatch "\.(pdf|doc|docx)$") {
    Add-CheckError "${RelativePath}: ${Context} must use .pdf, .doc, or .docx"
  }

  Test-LocalReference $RelativePath $Normalized $Context
}

function Read-TextFile {
  param([string]$RelativePath)
  Get-Content -Raw -Encoding UTF8 (Get-RepoPath $RelativePath)
}

function Test-NoBom {
  param([string]$RelativePath)
  $Content = Read-TextFile $RelativePath
  if ($Content.Length -gt 0 -and [int][char]$Content[0] -eq 0xFEFF) {
    Add-CheckError "${RelativePath}: contains UTF-8 BOM; save as UTF-8 without BOM"
  }
}

function Get-HtmlAttribute {
  param(
    [string]$Tag,
    [string]$Attribute
  )

  $Match = [regex]::Match($Tag, "\b$([regex]::Escape($Attribute))\s*=\s*[""']([^""']*)[""']", "IgnoreCase")
  if ($Match.Success) {
    return $Match.Groups[1].Value
  }

  return ""
}

function Get-HtmlTags {
  param(
    [string]$Source,
    [string]$TagName
  )

  @([regex]::Matches($Source, "<$TagName\b[^>]*>", "IgnoreCase") | ForEach-Object { $_.Value })
}

function Get-MetaContent {
  param(
    [string]$Source,
    [string]$Attribute,
    [string]$Value
  )

  $ExpectedValue = $Value.ToLowerInvariant()
  foreach ($Tag in Get-HtmlTags $Source "meta") {
    if ((Get-HtmlAttribute $Tag $Attribute).ToLowerInvariant() -eq $ExpectedValue) {
      return Get-HtmlAttribute $Tag "content"
    }
  }

  return ""
}

function Get-CanonicalUrl {
  param([string]$Source)

  $CanonicalTags = @()
  foreach ($Tag in Get-HtmlTags $Source "link") {
    $RelValues = (Get-HtmlAttribute $Tag "rel").ToLowerInvariant() -split "\s+"
    if ($RelValues -contains "canonical") {
      $CanonicalTags += $Tag
    }
  }

  return @{
    Count = $CanonicalTags.Count
    Value = if ($CanonicalTags.Count) { Get-HtmlAttribute $CanonicalTags[0] "href" } else { "" }
  }
}

function Test-PublicUrl {
  param(
    [string]$SourceFile,
    [string]$Value,
    [string]$Context,
    [string]$ExpectedUrl = ""
  )

  if (-not $Value) {
    Add-CheckError "${SourceFile}: missing ${Context}"
    return
  }

  if (-not $Value.StartsWith("$SiteOrigin/") -and $Value -ne "$SiteOrigin/") {
    Add-CheckError "${SourceFile}: ${Context} must use ${SiteOrigin}"
  }

  if ($Value.StartsWith("http://")) {
    Add-CheckError "${SourceFile}: ${Context} must not use http://"
  }

  if ($Value -match $TechnicalUrlPattern) {
    Add-CheckError "${SourceFile}: ${Context} must not use localhost, GitHub Pages, or technical URLs"
  }

  if ($Value.Contains("/admin/")) {
    Add-CheckError "${SourceFile}: ${Context} must not point to /admin/"
  }

  if ($ExpectedUrl -and $Value -ne $ExpectedUrl) {
    Add-CheckError "${SourceFile}: ${Context} must be ${ExpectedUrl}"
  }
}

function Test-SiteImageReference {
  param(
    [string]$SourceFile,
    [string]$Value,
    [string]$Context
  )

  if (-not $Value) {
    return
  }

  if ($Value -match $TechnicalUrlPattern -or $Value.StartsWith("http://")) {
    Add-CheckError "${SourceFile}: ${Context} must not use a technical or http:// URL"
    return
  }

  if ($Value.StartsWith("$SiteOrigin/")) {
    Test-LocalReference $SourceFile $Value.Substring($SiteOrigin.Length + 1) $Context
  } elseif (-not (Test-VirtualReference $Value)) {
    Test-LocalReference $SourceFile (Resolve-SourceRelativeReference $SourceFile $Value) $Context
  }
}

function Test-PublicHtmlSeo {
  foreach ($Page in $PublicHtmlPages) {
    $SourceFile = $Page.Path
    $ExpectedUrl = $Page.Url
    if (-not (Test-Path -LiteralPath (Get-RepoPath $SourceFile))) {
      Add-CheckError "${SourceFile}: missing public HTML page"
      continue
    }

    $Source = Read-TextFile $SourceFile
    $TitleCount = @([regex]::Matches($Source, "<title\b[^>]*>", "IgnoreCase")).Count
    if ($TitleCount -ne 1) {
      Add-CheckError "${SourceFile}: expected exactly one <title>, found ${TitleCount}"
    }

    if (-not (Get-MetaContent $Source "name" "description")) {
      Add-CheckError "${SourceFile}: missing meta description"
    }

    $Canonical = Get-CanonicalUrl $Source
    if ($Canonical.Count -ne 1) {
      Add-CheckError "${SourceFile}: expected exactly one canonical link, found $($Canonical.Count)"
    }
    Test-PublicUrl $SourceFile $Canonical.Value "canonical URL" $ExpectedUrl

    foreach ($Property in @("og:title", "og:description", "og:type", "og:url")) {
      if (-not (Get-MetaContent $Source "property" $Property)) {
        Add-CheckError "${SourceFile}: missing ${Property}"
      }
    }

    $OgUrl = Get-MetaContent $Source "property" "og:url"
    $ExpectedOgUrl = if ($Canonical.Value) { $Canonical.Value } else { $ExpectedUrl }
    Test-PublicUrl $SourceFile $OgUrl "og:url" $ExpectedOgUrl

    $OgImage = Get-MetaContent $Source "property" "og:image"
    if ($OgImage) {
      Test-SiteImageReference $SourceFile $OgImage "og:image"
    }

    $TwitterTags = @(Get-HtmlTags $Source "meta" | Where-Object { (Get-HtmlAttribute $_ "name").ToLowerInvariant().StartsWith("twitter:") })
    if ($TwitterTags.Count) {
      foreach ($Name in @("twitter:card", "twitter:title", "twitter:description")) {
        if (-not (Get-MetaContent $Source "name" $Name)) {
          Add-CheckError "${SourceFile}: missing ${Name}"
        }
      }

      $TwitterImage = Get-MetaContent $Source "name" "twitter:image"
      if ($TwitterImage) {
        Test-SiteImageReference $SourceFile $TwitterImage "twitter:image"
      }
    }

    $Robots = (Get-MetaContent $Source "name" "robots").ToLowerInvariant()
    if ($Robots.Contains("noindex")) {
      Add-CheckError "${SourceFile}: public page must not include noindex"
    }
  }
}

function Test-AdminSeo {
  $SourceFile = "admin/index.html"
  if (-not (Test-Path -LiteralPath (Get-RepoPath $SourceFile))) {
    Add-CheckError "${SourceFile}: missing admin HTML page"
    return
  }

  $Source = Read-TextFile $SourceFile
  $Robots = ((Get-MetaContent $Source "name" "robots").ToLowerInvariant() -replace "\s+", "")
  if (-not $Robots.Contains("noindex") -or -not $Robots.Contains("nofollow")) {
    Add-CheckError "${SourceFile}: admin page must include noindex,nofollow"
  }

  if ($Source -match "property=[""']og:" -or $Source -match "type=[""']application/ld\+json[""']") {
    Add-CheckError "${SourceFile}: admin page must not expose Open Graph or JSON-LD public metadata"
  }
}

function Test-RobotsTxt {
  $SourceFile = "robots.txt"
  if (-not (Test-Path -LiteralPath (Get-RepoPath $SourceFile))) {
    Add-CheckError "${SourceFile}: missing robots.txt"
    return
  }

  Test-NoBom $SourceFile
  $Source = Read-TextFile $SourceFile
  if (-not $Source.Contains("Sitemap: $SitemapUrl")) {
    Add-CheckError "${SourceFile}: missing Sitemap: ${SitemapUrl}"
  }

  if ($Source -notmatch "(?im)^\s*Disallow:\s*/admin/?\s*$") {
    Add-CheckError "${SourceFile}: must disallow /admin/"
  }

  if ($Source -match "(?im)^\s*Disallow:\s*/\s*$") {
    Add-CheckError "${SourceFile}: must not block the public site root"
  }
}

function Test-SitemapXml {
  $SourceFile = "sitemap.xml"
  if (-not (Test-Path -LiteralPath (Get-RepoPath $SourceFile))) {
    Add-CheckError "${SourceFile}: missing sitemap.xml"
    return
  }

  Test-NoBom $SourceFile
  $Source = Read-TextFile $SourceFile
  if ($Source -notmatch "<urlset\b[^>]*xmlns=[""']http://www\.sitemaps\.org/schemas/sitemap/0\.9[""']") {
    Add-CheckError "${SourceFile}: missing sitemap urlset namespace"
  }

  if ($Source.Contains("/admin/") -or $Source -match $TechnicalUrlPattern -or $Source -match "(?i)<loc>\s*http://") {
    Add-CheckError "${SourceFile}: must not contain /admin/, technical URLs, or http:// URLs"
  }

  $Urls = @([regex]::Matches($Source, "<loc>\s*([^<\s]+)\s*</loc>", "IgnoreCase") | ForEach-Object { $_.Groups[1].Value })
  $DuplicateUrls = @($Urls | Group-Object | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name })
  if ($DuplicateUrls.Count) {
    Add-CheckError "${SourceFile}: duplicated URLs: $($DuplicateUrls -join ', ')"
  }

  foreach ($Url in $ExpectedSitemapUrls) {
    if ($Urls -notcontains $Url) {
      Add-CheckError "${SourceFile}: missing ${Url}"
    }
  }

  foreach ($Url in $Urls) {
    if ($ExpectedSitemapUrls -notcontains $Url) {
      Add-CheckError "${SourceFile}: unexpected URL ${Url}"
    }
  }

  foreach ($Match in [regex]::Matches($Source, "<lastmod>\s*([^<\s]+)\s*</lastmod>", "IgnoreCase")) {
    if ($Match.Groups[1].Value -notmatch "^\d{4}-\d{2}-\d{2}$") {
      Add-CheckError "${SourceFile}: invalid lastmod date `"$($Match.Groups[1].Value)`""
    }
  }
}

function Test-HomeJsonLd {
  $SourceFile = "index.html"
  $Source = Read-TextFile $SourceFile
  $Match = [regex]::Match($Source, "<script\b[^>]*type=[""']application/ld\+json[""'][^>]*>([\s\S]*?)</script>", "IgnoreCase")
  if (-not $Match.Success) {
    Add-CheckError "${SourceFile}: missing JSON-LD Person data"
    return
  }

  try {
    $Payload = $Match.Groups[1].Value | ConvertFrom-Json
  } catch {
    Add-CheckError "${SourceFile}: invalid JSON-LD ($($_.Exception.Message))"
    return
  }

  if ($Payload.'@type' -ne "Person") {
    Add-CheckError "${SourceFile}: JSON-LD @type must be Person"
  }

  Test-PublicUrl $SourceFile ([string]$Payload.url) "JSON-LD url" "$SiteOrigin/"
  Test-SiteImageReference $SourceFile ([string]$Payload.image) "JSON-LD image"

  $SameAs = @($Payload.sameAs)
  if (-not $SameAs.Count) {
    Add-CheckError "${SourceFile}: JSON-LD sameAs must include profile links"
  }

  for ($Index = 0; $Index -lt $SameAs.Count; $Index += 1) {
    $Url = [string]$SameAs[$Index]
    if ($Url -notmatch "^https?://") {
      Add-CheckError "${SourceFile}: JSON-LD sameAs[$Index] must be an http(s) URL"
      continue
    }

    if ($Url -match $TechnicalUrlPattern) {
      Add-CheckError "${SourceFile}: JSON-LD sameAs[$Index] must not use technical URLs"
    }
  }

  $SocialLinks = Read-JsonFile "files/content/social-links.json"
  $Links = @($SocialLinks.links)
  for ($Index = 0; $Index -lt $Links.Count; $Index += 1) {
    $Link = $Links[$Index]
    if ($null -eq $Link) {
      continue
    }

    $Href = ""
    if ($null -ne $Link.href) {
      $Href = ([string]$Link.href).Trim()
    }

    if (-not $Href) {
      continue
    }

    if ($Link.enabled -eq $false -and $SameAs -contains $Href) {
      Add-CheckError "${SourceFile}: JSON-LD sameAs must not include disabled social link `"$Href`""
    }

    if ($Link.enabled -ne $false -and $SameAs -notcontains $Href) {
      Add-CheckError "${SourceFile}: JSON-LD sameAs should include enabled social link `"$Href`" (social-links.json links[$Index])"
    }
  }
}

function Test-SeoFoundation {
  Test-PublicHtmlSeo
  Test-AdminSeo
  Test-RobotsTxt
  Test-SitemapXml
  Test-HomeJsonLd
}

function Unquote-YamlValue {
  param([string]$Value)
  ($Value.Trim() -replace "^[""']", "" -replace "[""']$", "")
}

function Test-AdminLine {
  param(
    [string]$SourceFile,
    [string]$Source,
    [string]$Key,
    [string]$Value,
    [string]$Message
  )

  $Pattern = "(?m)^\s*$([regex]::Escape($Key)):\s*$([regex]::Escape($Value))\s*$"
  if ($Source -notmatch $Pattern) {
    Add-CheckError "${SourceFile}: $Message"
  }
}

function Resolve-AdminMediaPath {
  param([string]$Value)
  if ($Value.StartsWith("../")) {
    return "files/" + $Value.Substring(3)
  }

  return $Value
}

function Test-AdminCollection {
  param(
    [string]$SourceFile,
    [string]$Source,
    [string]$Name
  )

  $Pattern = "(?m)^\s*-\s*name:\s*$([regex]::Escape($Name))\s*$"
  if ($Source -notmatch $Pattern) {
    Add-CheckError "${SourceFile}: missing CMS collection `"$Name`""
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
  $ExpectedPrefix = ""
  if ($RelativePath -match "^files/media/activity(\d+)/photos\.json$") {
    $ExpectedPrefix = "/files/media/activity$($Matches[1])/"
  }

  for ($Index = 0; $Index -lt $Images.Count; $Index++) {
    if ($Images[$Index].src) {
      Test-CmsMediaPath $RelativePath $Images[$Index].src "images[$Index].src" $ExpectedPrefix
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
      Test-CmsMediaPath $RelativePath $Files[$Index].href "files[$Index].href" "/files/activity2/"
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
      Test-CmsMediaPath $RelativePath $Monographs[$Index].href "monographs[$Index].href" "/files/downloads/"
      Test-LocalReference $RelativePath $Monographs[$Index].href "monographs[$Index].href"
    }
  }

  $Groups = @($Payload.articles)
  for ($GroupIndex = 0; $GroupIndex -lt $Groups.Count; $GroupIndex++) {
    $Files = @($Groups[$GroupIndex].files)
    for ($FileIndex = 0; $FileIndex -lt $Files.Count; $FileIndex++) {
      if ($Files[$FileIndex].href) {
        Test-CmsMediaPath $RelativePath $Files[$FileIndex].href "articles[$GroupIndex].files[$FileIndex].href" "/files/downloads/"
        Test-LocalReference $RelativePath $Files[$FileIndex].href "articles[$GroupIndex].files[$FileIndex].href"
      }
    }
  }
}

function Test-NonEmptyString {
  param($Value)
  return ($Value -is [string] -and $Value.Trim())
}

function Get-NonEmptyStringList {
  param($Value)

  if ($Value -isnot [array]) {
    return @()
  }

  @($Value | Where-Object { Test-NonEmptyString $_ })
}

function Test-HttpUrlOrEmpty {
  param($Value)
  if (-not (Test-NonEmptyString $Value)) {
    return $true
  }

  return ([string]$Value -match "^https?://")
}

function Test-AudioContentManifest {
  param([string]$RelativePath)
  $Payload = Read-JsonFile $RelativePath
  if (-not $Payload) {
    return
  }

  $Items = Get-JsonList $Payload @("items")
  for ($Index = 0; $Index -lt $Items.Count; $Index++) {
    $Item = $Items[$Index]
    if (-not $Item -or $Item -is [string]) {
      Add-CheckError "${RelativePath}: items[$Index] must be an object"
      continue
    }

    if ($Item.enabled -eq $false) {
      continue
    }

    foreach ($Field in @("id", "title", "titleEn", "description", "descriptionEn", "src")) {
      if (-not (Test-NonEmptyString $Item.$Field)) {
        Add-CheckError "${RelativePath}: enabled items[$Index].${Field} must be a non-empty string"
      }
    }

    $Tags = Get-NonEmptyStringList $Item.tags
    if (-not $Tags.Count) {
      Add-CheckError "${RelativePath}: enabled items[$Index].tags must contain at least one non-empty tag"
    }

    $TagsEn = Get-NonEmptyStringList $Item.tagsEn
    if (-not $TagsEn.Count) {
      Add-CheckError "${RelativePath}: enabled items[$Index].tagsEn must contain at least one non-empty English tag"
    }

    if ((Test-NonEmptyString $Item.section) -and $Item.section -ne "church") {
      Add-CheckError "${RelativePath}: enabled items[$Index].section must be church"
    }

    if ((Test-NonEmptyString $Item.category) -and $Item.category -ne "sermons") {
      Add-CheckError "${RelativePath}: enabled items[$Index].category must be sermons"
    }

    if (Test-NonEmptyString $Item.src) {
      $Src = ([string]$Item.src).Trim() -replace "\\", "/"
      if (-not $Src.StartsWith("/files/audio/sermons/")) {
        Add-CheckError "${RelativePath}: enabled items[$Index].src must use /files/audio/sermons/..."
      }

      if ($Src -notmatch "\.mp3$") {
        Add-CheckError "${RelativePath}: enabled items[$Index].src must point to an .mp3 file"
      }

      Test-LocalReference $RelativePath $Src "items[$Index].src"
    }

    foreach ($OptionalUrlField in @("downloadUrl", "transcriptUrl")) {
      if ($null -ne $Item.$OptionalUrlField -and $Item.$OptionalUrlField -isnot [string]) {
        Add-CheckError "${RelativePath}: enabled items[$Index].${OptionalUrlField} must be a string when present"
      }
    }
  }
}

function Test-HomeContentManifest {
  param([string]$RelativePath)
  $Payload = Read-JsonFile $RelativePath
  if (-not $Payload) {
    return
  }

  foreach ($Locale in @("uk", "en")) {
    $HomeContent = $Payload.$Locale
    if (-not $HomeContent) {
      Add-CheckError "${RelativePath}: missing ${Locale} content object"
      continue
    }

    foreach ($Key in @("aboutHeading", "activitiesHeading")) {
      if (-not (Test-NonEmptyString $HomeContent.$Key)) {
        Add-CheckError "${RelativePath}: ${Locale}.${Key} must be a non-empty string"
      }
    }

    if (-not $HomeContent.aboutImage) {
      Add-CheckError "${RelativePath}: ${Locale}.aboutImage must be an object"
    } elseif (-not (Test-NonEmptyString $HomeContent.aboutImage.alt)) {
      Add-CheckError "${RelativePath}: ${Locale}.aboutImage.alt must be a non-empty string"
    }

    $Paragraphs = @($HomeContent.aboutParagraphs)
    if (-not $Paragraphs.Count) {
      Add-CheckError "${RelativePath}: ${Locale}.aboutParagraphs must be a non-empty array"
      continue
    }

    for ($Index = 0; $Index -lt $Paragraphs.Count; $Index++) {
      if (-not (Test-NonEmptyString $Paragraphs[$Index])) {
        Add-CheckError "${RelativePath}: ${Locale}.aboutParagraphs[$Index] must be a non-empty string"
      }
    }
  }
}

function Test-ActivitiesContentManifest {
  param([string]$RelativePath)
  $Payload = Read-JsonFile $RelativePath
  if (-not $Payload) {
    return
  }

  foreach ($Locale in @("uk", "en")) {
    $Activities = $Payload.$Locale
    if (-not $Activities) {
      Add-CheckError "${RelativePath}: missing ${Locale} activities object"
      continue
    }

    foreach ($Id in @("1", "2", "3")) {
      $Activity = $Activities.$Id
      if (-not $Activity) {
        Add-CheckError "${RelativePath}: missing ${Locale}.${Id} activity object"
        continue
      }

      foreach ($Key in @("name", "cardDescription")) {
        if (-not (Test-NonEmptyString $Activity.$Key)) {
          Add-CheckError "${RelativePath}: ${Locale}.${Id}.${Key} must be a non-empty string"
        }
      }

      if (-not $Activity.heroImage) {
        Add-CheckError "${RelativePath}: ${Locale}.${Id}.heroImage must be an object"
      } elseif (-not (Test-NonEmptyString $Activity.heroImage.alt)) {
        Add-CheckError "${RelativePath}: ${Locale}.${Id}.heroImage.alt must be a non-empty string"
      }
    }
  }
}

function Test-PagesContentManifest {
  param([string]$RelativePath)
  $Payload = Read-JsonFile $RelativePath
  if (-not $Payload) {
    return
  }

  foreach ($Locale in @("uk", "en")) {
    $Pages = $Payload.$Locale
    if (-not $Pages) {
      Add-CheckError "${RelativePath}: missing ${Locale} pages object"
      continue
    }

    $Downloads = $Pages.downloads
    if (-not $Downloads) {
      Add-CheckError "${RelativePath}: missing ${Locale}.downloads object"
    } else {
      foreach ($Key in @("pageTitle", "heading")) {
        if (-not (Test-NonEmptyString $Downloads.$Key)) {
          Add-CheckError "${RelativePath}: ${Locale}.downloads.${Key} must be a non-empty string"
        }
      }
    }

    $Contact = $Pages.contact
    if (-not $Contact) {
      Add-CheckError "${RelativePath}: missing ${Locale}.contact object"
      continue
    }

    foreach ($Key in @("pageTitle", "heading", "intro", "formSubject")) {
      if (-not (Test-NonEmptyString $Contact.$Key)) {
        Add-CheckError "${RelativePath}: ${Locale}.contact.${Key} must be a non-empty string"
      }
    }

    if (-not $Contact.socials -or -not (Test-NonEmptyString $Contact.socials.title)) {
      Add-CheckError "${RelativePath}: ${Locale}.contact.socials.title must be a non-empty string"
    }

    $Fields = $Contact.fields
    if (-not $Fields) {
      Add-CheckError "${RelativePath}: ${Locale}.contact.fields must be an object"
      continue
    }

    foreach ($Key in @("name", "email", "phone", "subject", "message", "submit")) {
      if (-not (Test-NonEmptyString $Fields.$Key)) {
        Add-CheckError "${RelativePath}: ${Locale}.contact.fields.${Key} must be a non-empty string"
      }
    }
  }
}

function Test-PublicationsContentManifest {
  param([string]$RelativePath)
  $Payload = Read-JsonFile $RelativePath
  if (-not $Payload) {
    return
  }

  $KnownTypes = @("article", "conference", "monograph", "teaching", "other")

  foreach ($Locale in @("uk", "en")) {
    $Labels = $Payload.$Locale
    if (-not $Labels) {
      Add-CheckError "${RelativePath}: missing ${Locale} labels object"
      continue
    }

    foreach ($Key in @("summary", "description")) {
      if (-not (Test-NonEmptyString $Labels.$Key)) {
        Add-CheckError "${RelativePath}: ${Locale}.${Key} must be a non-empty string"
      }
    }

    foreach ($Key in @("searchLabel", "searchPlaceholder", "yearLabel", "typeLabel", "allYearsLabel", "allTypesLabel", "fileLabel", "emptyLabel")) {
      if ($null -ne $Labels.$Key -and -not (Test-NonEmptyString $Labels.$Key)) {
        Add-CheckError "${RelativePath}: ${Locale}.${Key} must be a non-empty string when present"
      }
    }

    if ($null -ne $Labels.typeLabels) {
      foreach ($Type in $KnownTypes) {
        if (-not (Test-NonEmptyString $Labels.typeLabels.$Type)) {
          Add-CheckError "${RelativePath}: ${Locale}.typeLabels.${Type} must be a non-empty string"
        }
      }
    }
  }

  $Items = @($Payload.items)
  if (-not $Items.Count) {
    Add-CheckError "${RelativePath}: items must be a non-empty array"
    return
  }

  for ($Index = 0; $Index -lt $Items.Count; $Index++) {
    $Item = $Items[$Index]
    if (Test-NonEmptyString $Item) {
      continue
    }

    if (-not $Item -or $Item -is [string]) {
      Add-CheckError "${RelativePath}: items[$Index] must be a string or object"
      continue
    }

    if (-not (Test-NonEmptyString $Item.text)) {
      Add-CheckError "${RelativePath}: items[$Index].text must be a non-empty string"
    }

    if ($null -ne $Item.year -and ([string]$Item.year).Trim() -ne "") {
      $Year = 0
      if (-not [int]::TryParse([string]$Item.year, [ref]$Year) -or $Year -lt 1900 -or $Year -gt 2100) {
        Add-CheckError "${RelativePath}: items[$Index].year must be a year between 1900 and 2100"
      }

      if ($Year -eq 1984 -and ([string]$Item.text) -match "ISSN\s+1984-6754") {
        Add-CheckError "${RelativePath}: items[$Index].year looks like the ISSN 1984-6754, not the publication year"
      }
    }

    if ($null -ne $Item.type -and $KnownTypes -notcontains $Item.type) {
      Add-CheckError "${RelativePath}: items[$Index].type must be one of $($KnownTypes -join ', ')"
    }

    if ($null -ne $Item.file) {
      Test-PublicationFileReference $RelativePath $Item.file "items[$Index].file"
    }
  }
}

function Test-SocialLinksContentManifest {
  param([string]$RelativePath)
  $Payload = Read-JsonFile $RelativePath
  if (-not $Payload) {
    return
  }

  $KnownIds = @("youtube", "facebook", "telegram", "webofscience", "orcid", "googlescholar")
  $SeenIds = New-Object System.Collections.Generic.HashSet[string]
  $Links = Get-JsonList $Payload @("links", "items")

  if (-not $Links.Count) {
    Add-CheckError "${RelativePath}: links must be a non-empty array"
    return
  }

  for ($Index = 0; $Index -lt $Links.Count; $Index++) {
    $Link = $Links[$Index]
    if (-not $Link -or $Link -is [string]) {
      Add-CheckError "${RelativePath}: links[$Index] must be an object"
      continue
    }

    if ($KnownIds -notcontains $Link.id) {
      Add-CheckError "${RelativePath}: links[$Index].id must be one of $($KnownIds -join ', ')"
    } elseif (-not $SeenIds.Add([string]$Link.id)) {
      Add-CheckError "${RelativePath}: links[$Index].id duplicates `"$($Link.id)`""
    }

    if (-not $Link.label) {
      Add-CheckError "${RelativePath}: links[$Index].label must be an object"
    } else {
      foreach ($Locale in @("uk", "en")) {
        if (-not (Test-NonEmptyString $Link.label.$Locale)) {
          Add-CheckError "${RelativePath}: links[$Index].label.${Locale} must be a non-empty string"
        }
      }
    }

    if ($null -ne $Link.href -and $Link.href -isnot [string]) {
      Add-CheckError "${RelativePath}: links[$Index].href must be a string when present"
    } elseif (-not (Test-HttpUrlOrEmpty $Link.href)) {
      Add-CheckError "${RelativePath}: links[$Index].href must be an http(s) URL or empty"
    }

    if ($null -ne $Link.enabled -and $Link.enabled -isnot [bool]) {
      Add-CheckError "${RelativePath}: links[$Index].enabled must be boolean when present"
    }

    if ($null -ne $Link.description -and $Link.description -isnot [string]) {
      Add-CheckError "${RelativePath}: links[$Index].description must be a string when present"
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

Test-HomeContentManifest "files/content/home.json"
Test-ActivitiesContentManifest "files/content/activities.json"
Test-PagesContentManifest "files/content/pages.json"
Test-PublicationsContentManifest "files/content/publications.json"
Test-SocialLinksContentManifest "files/content/social-links.json"
Test-AudioContentManifest "files/content/audio.json"
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

$AdminConfigPath = "admin/config.yml"
if (-not (Test-Path -LiteralPath (Get-RepoPath $AdminConfigPath))) {
  Add-CheckError "${AdminConfigPath}: missing Decap CMS config"
} else {
  $AdminConfig = Get-Content -Raw -Encoding UTF8 (Get-RepoPath $AdminConfigPath)
  $RequiredPatterns = @(
    @{ Pattern = "(?m)^\s*name:\s*github\s*$"; Message = "backend.name must be github" },
    @{ Pattern = "(?m)^\s*repo:\s*i-sirius/ihnatiev_va_site\s*$"; Message = "backend.repo must target i-sirius/ihnatiev_va_site" },
    @{ Pattern = "(?m)^\s*branch:\s*main\s*$"; Message = "backend.branch must be main" },
    @{ Pattern = "(?m)^\s*base_url:\s*https://decap\.iva\.net\.ua\s*$"; Message = "backend.base_url must use the active OAuth proxy" },
    @{ Pattern = "(?m)^\s*auth_endpoint:\s*/auth\s*$"; Message = "backend.auth_endpoint must be /auth" },
    @{ Pattern = "(?m)^\s*local_backend:\s*true\s*$"; Message = "local_backend must stay enabled for local CMS testing" },
    @{ Pattern = "(?m)^\s*publish_mode:\s*editorial_workflow\s*$"; Message = "publish_mode must be editorial_workflow" }
  )

  foreach ($Rule in $RequiredPatterns) {
    if ($AdminConfig -notmatch $Rule.Pattern) {
      Add-CheckError "${AdminConfigPath}: $($Rule.Message)"
    }
  }

  foreach ($Match in [regex]::Matches($AdminConfig, "(?m)^\s*(file|media_folder|public_folder):\s*([^#\r\n]+)")) {
    $Key = $Match.Groups[1].Value
    $Value = Unquote-YamlValue $Match.Groups[2].Value

    if (-not $Value -or (Test-VirtualReference $Value)) {
      continue
    }

    $script:AdminPathCount += 1
    $PathToCheck = Resolve-AdminMediaPath $Value
    if (-not (Test-Path -LiteralPath (Get-RepoPath $PathToCheck))) {
      Add-CheckError "${AdminConfigPath}: missing ${Key} path `"$Value`""
    }
  }

  foreach ($Name in @(
    "home_content",
    "activities_content",
    "pages_content",
    "publications_content",
    "social_links",
    "audio_content",
    "gallery_activity1",
    "gallery_activity2",
    "gallery_activity3",
    "activity2_files",
    "downloads"
  )) {
    Test-AdminCollection $AdminConfigPath $AdminConfig $Name
  }

  foreach ($RelativePath in @(
    "files/content/home.json",
    "files/content/activities.json",
    "files/content/pages.json",
    "files/content/publications.json",
    "files/content/social-links.json",
    "files/content/audio.json",
    "files/media/activity1/photos.json",
    "files/media/activity2/photos.json",
    "files/media/activity3/photos.json",
    "files/activity2/files.json",
    "files/downloads/files.json"
  )) {
    Test-AdminLine $AdminConfigPath $AdminConfig "file" $RelativePath "missing CMS file-backed entry `"$RelativePath`""
  }

  foreach ($Folder in @(
    @{ Key = "media_folder"; Value = "files/media/uploads" },
    @{ Key = "public_folder"; Value = "/files/media/uploads" },
    @{ Key = "media_folder"; Value = "files/media/activity1" },
    @{ Key = "public_folder"; Value = "/files/media/activity1" },
    @{ Key = "media_folder"; Value = "files/media/activity2" },
    @{ Key = "public_folder"; Value = "/files/media/activity2" },
    @{ Key = "media_folder"; Value = "files/media/activity3" },
    @{ Key = "public_folder"; Value = "/files/media/activity3" },
    @{ Key = "media_folder"; Value = "files/activity2" },
    @{ Key = "public_folder"; Value = "/files/activity2" },
    @{ Key = "media_folder"; Value = "files/downloads" },
    @{ Key = "public_folder"; Value = "/files/downloads" },
    @{ Key = "media_folder"; Value = "../publications" },
    @{ Key = "public_folder"; Value = "files/publications" }
  )) {
    Test-AdminLine $AdminConfigPath $AdminConfig $Folder.Key $Folder.Value "missing CMS $($Folder.Key) `"$($Folder.Value)`""
  }

  foreach ($Rule in @(
    @{ Pattern = "(?m)^\s*name:\s*items\s*$"; Message = "publications collection must expose items list" },
    @{ Pattern = "(?m)\bname:\s*text\b"; Message = "publications items must expose text field" },
    @{ Pattern = "(?m)\bname:\s*year\b"; Message = "publications items must expose year field" },
    @{ Pattern = "(?ms)\bname:\s*year\b.*?\bwidget:\s*string\b"; Message = "publications year field must stay a string widget" },
    @{ Pattern = "\^\$\|\^\(19\|20\|21\)\\\\d\{2\}\$"; Message = "publications year field must allow empty or 4-digit years" },
    @{ Pattern = "(?m)^\s*name:\s*type\s*$"; Message = "publications items must expose type field" },
    @{ Pattern = "(?m)^\s*widget:\s*select\s*$"; Message = "publications type field must stay a select widget" },
    @{ Pattern = "(?m)^\s*name:\s*file\s*$"; Message = "publications items must expose optional file field" },
    @{ Pattern = "(?ms)\bname:\s*file\b.*?\bwidget:\s*file\b"; Message = "publications file field must stay a file widget" },
    @{ Pattern = "(?ms)\bname:\s*file\b.*?\brequired:\s*false\b"; Message = "publications file field must stay optional" },
    @{ Pattern = "(?ms)\bname:\s*file\b.*?\bchoose_url:\s*false\b"; Message = "publications file field must keep choose_url disabled" },
    @{ Pattern = "(?m)\bvalue:\s*article\b"; Message = "publications type options must include article" },
    @{ Pattern = "(?m)\bvalue:\s*conference\b"; Message = "publications type options must include conference" },
    @{ Pattern = "(?m)\bvalue:\s*monograph\b"; Message = "publications type options must include monograph" },
    @{ Pattern = "(?m)\bvalue:\s*teaching\b"; Message = "publications type options must include teaching" },
    @{ Pattern = "(?m)\bvalue:\s*other\b"; Message = "publications type options must include other" }
  )) {
    if ($AdminConfig -notmatch $Rule.Pattern) {
      Add-CheckError "${AdminConfigPath}: $($Rule.Message)"
    }
  }
}

Test-SeoFoundation

if ($Errors.Count) {
  Write-Error ("Content check failed:`n- " + ($Errors -join "`n- "))
  exit 1
}

Write-Host "Content check passed: $JsonCount JSON files parsed, $ReferenceCount local references checked, $AdminPathCount admin paths checked."
