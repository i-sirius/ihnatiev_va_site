$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Errors = New-Object System.Collections.Generic.List[string]
$JsonCount = 0
$ReferenceCount = 0
$AdminPathCount = 0
$BomCount = 0
$ReportedBomFiles = New-Object System.Collections.Generic.HashSet[string]

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
    "files/downloads/files/downloads"
  )) {
    if ($Normalized.Contains($DuplicatePath)) {
      Add-CheckError "${RelativePath}: ${Context} contains duplicated CMS media path `"$DuplicatePath`""
    }
  }

  if ($ExpectedPrefix -and -not $Normalized.StartsWith($ExpectedPrefix)) {
    Add-CheckError "${RelativePath}: ${Context} must use root-relative path `"${ExpectedPrefix}...`""
  }
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

function Test-HttpUrlOrEmpty {
  param($Value)
  if (-not (Test-NonEmptyString $Value)) {
    return $true
  }

  return ([string]$Value -match "^https?://")
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

    foreach ($Key in @("searchLabel", "searchPlaceholder", "yearLabel", "typeLabel", "allYearsLabel", "allTypesLabel", "emptyLabel")) {
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

    if ($null -ne $Item.year) {
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
    if (-not (Test-Path -LiteralPath (Get-RepoPath $Value))) {
      Add-CheckError "${AdminConfigPath}: missing ${Key} path `"$Value`""
    }
  }

  foreach ($Name in @(
    "home_content",
    "activities_content",
    "pages_content",
    "publications_content",
    "social_links",
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
    @{ Key = "public_folder"; Value = "/files/downloads" }
  )) {
    Test-AdminLine $AdminConfigPath $AdminConfig $Folder.Key $Folder.Value "missing CMS $($Folder.Key) `"$($Folder.Value)`""
  }

  foreach ($Rule in @(
    @{ Pattern = "(?m)^\s*name:\s*items\s*$"; Message = "publications collection must expose items list" },
    @{ Pattern = "(?m)\bname:\s*text\b"; Message = "publications items must expose text field" },
    @{ Pattern = "(?m)\bname:\s*year\b"; Message = "publications items must expose year field" },
    @{ Pattern = "(?m)^\s*name:\s*type\s*$"; Message = "publications items must expose type field" },
    @{ Pattern = "(?m)^\s*widget:\s*select\s*$"; Message = "publications type field must stay a select widget" },
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

if ($Errors.Count) {
  Write-Error ("Content check failed:`n- " + ($Errors -join "`n- "))
  exit 1
}

Write-Host "Content check passed: $JsonCount JSON files parsed, $ReferenceCount local references checked, $AdminPathCount admin paths checked."
