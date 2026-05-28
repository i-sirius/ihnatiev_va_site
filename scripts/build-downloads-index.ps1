$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$DownloadsManifestPath = Join-Path $Root "files/downloads/files.json"
$IndexPath = Join-Path $Root "files/downloads/search-index.json"
$SiteOrigin = "https://iva.net.ua"
$MaxExtractedChars = 12000
$MaxPageSearchChars = 12000
$PdfToTextCommand = Get-Command pdftotext -ErrorAction SilentlyContinue

Add-Type -AssemblyName System.IO.Compression

function Get-RepoPath {
  param([string]$RelativePath)
  $Normalized = $RelativePath -replace "^\./", ""
  $Normalized = $Normalized.TrimStart("/", "\")
  Join-Path $Root ($Normalized -replace "/", [IO.Path]::DirectorySeparatorChar)
}

function ConvertTo-PlainText {
  param($Value)

  if ($null -eq $Value) {
    return ""
  }

  if ($Value -is [string]) {
    return $Value.Trim()
  }

  if ($Value -is [array]) {
    return (@($Value | ForEach-Object { ConvertTo-PlainText $_ }) -join " ").Trim()
  }

  if ($Value -is [System.Collections.IDictionary]) {
    $Parts = New-Object System.Collections.Generic.List[string]
    foreach ($Key in $Value.Keys) {
      $Text = ConvertTo-PlainText $Value[$Key]
      if ($Text) {
        $Parts.Add($Text) | Out-Null
      }
    }
    return ($Parts -join " ").Trim()
  }

  if ($Value -is [pscustomobject]) {
    $Parts = New-Object System.Collections.Generic.List[string]
    foreach ($Property in $Value.PSObject.Properties) {
      $Text = ConvertTo-PlainText $Property.Value
      if ($Text) {
        $Parts.Add($Text) | Out-Null
      }
    }
    return ($Parts -join " ").Trim()
  }

  return ([string]$Value).Trim()
}

function Get-LocalizedText {
  param(
    $Value,
    [string]$Locale,
    [string]$FallbackLocale = "uk"
  )

  if ($null -eq $Value) {
    return ""
  }

  if ($Value -is [string]) {
    return $Value.Trim()
  }

  if ($Value -is [pscustomobject]) {
    if ($Value.PSObject.Properties.Name -contains $Locale) {
      return (ConvertTo-PlainText $Value.$Locale)
    }

    if ($Value.PSObject.Properties.Name -contains $FallbackLocale) {
      return (ConvertTo-PlainText $Value.$FallbackLocale)
    }
  }

  if ($Value -is [System.Collections.IDictionary]) {
    if ($Value.Contains($Locale)) {
      return (ConvertTo-PlainText $Value[$Locale])
    }

    if ($Value.Contains($FallbackLocale)) {
      return (ConvertTo-PlainText $Value[$FallbackLocale])
    }
  }

  return ConvertTo-PlainText $Value
}

function Get-FileType {
  param($File)

  if ($File.type) {
    return ([string]$File.type).ToLowerInvariant()
  }

  $Href = [string]$File.href
  $Extension = [IO.Path]::GetExtension($Href)
  if ($Extension) {
    return $Extension.TrimStart(".").ToLowerInvariant()
  }

  return "file"
}

function Resolve-DownloadPath {
  param([string]$Href)

  $Clean = (($Href -split "#", 2)[0] -split "\?", 2)[0]
  try {
    $Clean = [uri]::UnescapeDataString($Clean)
  } catch {}

  Get-RepoPath $Clean
}

function Convert-PdfBytesToText {
  param([byte[]]$Bytes)

  $Latin = [Text.Encoding]::GetEncoding(28591)
  $Raw = $Latin.GetString($Bytes)
  $Chunks = New-Object System.Collections.Generic.List[string]
  $Chunks.Add($Raw) | Out-Null

  $Position = 0
  while (($StreamIndex = $Raw.IndexOf("stream", $Position, [StringComparison]::Ordinal)) -ge 0) {
    $DictionaryStart = [Math]::Max(0, $Raw.LastIndexOf("<<", $StreamIndex, [StringComparison]::Ordinal))
    $Dictionary = $Raw.Substring($DictionaryStart, [Math]::Min($StreamIndex - $DictionaryStart, 800))
    $DataStart = $StreamIndex + 6

    if ($DataStart -lt $Bytes.Length -and $Bytes[$DataStart] -eq 13) {
      $DataStart += 1
    }
    if ($DataStart -lt $Bytes.Length -and $Bytes[$DataStart] -eq 10) {
      $DataStart += 1
    }

    $EndIndex = $Raw.IndexOf("endstream", $DataStart, [StringComparison]::Ordinal)
    if ($EndIndex -lt 0) {
      break
    }

    if ($Dictionary -match "/FlateDecode") {
      try {
        $Length = $EndIndex - $DataStart
        if ($Length -gt 0) {
          $StreamBytes = New-Object byte[] $Length
          [Array]::Copy($Bytes, $DataStart, $StreamBytes, 0, $Length)
          $InputStream = New-Object IO.MemoryStream(,$StreamBytes)
          $DeflateStream = New-Object IO.Compression.DeflateStream($InputStream, [IO.Compression.CompressionMode]::Decompress)
          $OutputStream = New-Object IO.MemoryStream
          $DeflateStream.CopyTo($OutputStream)
          $DeflateStream.Dispose()
          $Chunks.Add($Latin.GetString($OutputStream.ToArray())) | Out-Null
        }
      } catch {}
    }

    $Position = $EndIndex + 9
  }

  return ($Chunks -join "`n")
}

function Get-ReadablePdfText {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return ""
  }

  $Bytes = [IO.File]::ReadAllBytes($Path)
  $PdfText = Convert-PdfBytesToText $Bytes
  $Candidates = New-Object System.Collections.Generic.List[string]

  foreach ($Match in [regex]::Matches($PdfText, "[\p{L}\p{N}][\p{L}\p{N}\s\.,;:'""\-\(\)\/]{5,160}")) {
    $Text = ($Match.Value -replace "\s+", " ").Trim()
    if ($Text.Length -lt 6) {
      continue
    }

    if ($Text -match "^(obj|endobj|stream|endstream|Length|Filter|FlateDecode|Type|Page|Pages|Font|XObject|MediaBox)\b") {
      continue
    }

    $LetterCount = ([regex]::Matches($Text, "\p{L}")).Count
    if ($LetterCount -lt 4) {
      continue
    }

    $Candidates.Add($Text) | Out-Null
    if (($Candidates -join " ").Length -ge $MaxExtractedChars) {
      break
    }
  }

  return (($Candidates | Select-Object -Unique) -join " ").Trim()
}

function ConvertTo-SearchText {
  param([string]$Text)

  return (([string]$Text) -replace "\s+", " ").Trim()
}

function Get-PageSearchIndex {
  param([string[]]$Pages)

  $Results = New-Object System.Collections.Generic.List[object]
  $UsedChars = 0
  $PageNumber = 1

  foreach ($Page in @($Pages)) {
    $Text = ConvertTo-SearchText $Page
    if (-not $Text) {
      $PageNumber += 1
      continue
    }

    $Remaining = $MaxPageSearchChars - $UsedChars
    if ($Remaining -le 0) {
      break
    }

    if ($Text.Length -gt $Remaining) {
      $Text = $Text.Substring(0, $Remaining)
    }

    $Results.Add([ordered]@{
      page = $PageNumber
      text = $Text
    }) | Out-Null
    $UsedChars += $Text.Length
    $PageNumber += 1
  }

  return $Results.ToArray()
}

function Get-ExternalPdfText {
  param([string]$Path)

  if (-not $PdfToTextCommand -or -not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  $TempPath = [IO.Path]::GetTempFileName()
  try {
    & $PdfToTextCommand.Source -enc UTF-8 -- $Path $TempPath | Out-Null
    if (-not (Test-Path -LiteralPath $TempPath)) {
      return $null
    }

    $RawText = Get-Content -Raw -Encoding UTF8 $TempPath
    $Pages = @($RawText -split "`f")
    $Text = ConvertTo-SearchText ($Pages -join " ")
    if ($Text.Length -gt $MaxExtractedChars) {
      $Text = $Text.Substring(0, $MaxExtractedChars)
    }

    return [pscustomobject]@{
      Text = $Text
      Pages = $Pages
    }
  } catch {
    return $null
  } finally {
    if (Test-Path -LiteralPath $TempPath) {
      Remove-Item -LiteralPath $TempPath -Force
    }
  }
}

function Test-ExtractedTextQuality {
  param([string]$Text)

  if (-not $Text -or $Text.Length -lt 120) {
    return $false
  }

  if ($Text -match "\b(endstream|endobj|CIDFont|FontDescriptor|FlateDecode|XObject|MediaBox|ToUnicode)\b") {
    return $false
  }

  $Words = @([regex]::Matches($Text, "\b[\p{L}]{3,}\b"))
  if ($Words.Count -lt 20) {
    return $false
  }

  $NormalizedText = ConvertTo-SearchText $Text
  $Length = [Math]::Max($NormalizedText.Length, 1)
  $LetterCount = ([regex]::Matches($NormalizedText, "\p{L}")).Count
  $LetterRatio = $LetterCount / $Length
  if ($LetterRatio -lt 0.45) {
    return $false
  }

  $DotLeaderCount = ([regex]::Matches($NormalizedText, "\.{5,}")).Count
  if ($DotLeaderCount -gt 8 -and $LetterRatio -lt 0.55) {
    return $false
  }

  $EncodingNoiseCount = ([regex]::Matches($NormalizedText, "[\u0080-\u009F\u00C0-\u00FF]")).Count
  $EncodingNoiseRatio = $EncodingNoiseCount / $Length
  if ($EncodingNoiseCount -gt 12 -and $EncodingNoiseRatio -gt 0.003 -and $LetterRatio -lt 0.65) {
    return $false
  }

  $AsciiControlNoise = ([regex]::Matches($Text, "[^\p{L}\p{N}\p{P}\p{Zs}\r\n\t]")).Count
  return ($AsciiControlNoise / [Math]::Max($Text.Length, 1)) -lt 0.02
}

function Get-SearchTokens {
  param([string[]]$Texts)

  $Tokens = New-Object System.Collections.Generic.HashSet[string]
  foreach ($Text in $Texts) {
    foreach ($Match in [regex]::Matches(([string]$Text).ToLowerInvariant(), "[\p{L}\p{N}]{3,}")) {
      [void]$Tokens.Add($Match.Value)
      if ($Tokens.Count -ge 80) {
        break
      }
    }
  }

  @($Tokens | Sort-Object)
}

function New-IndexItem {
  param(
    $File,
    [string]$Collection,
    $Category,
    [int]$Position
  )

  $Href = [string]$File.href
  $Type = Get-FileType $File
  $FileName = [IO.Path]::GetFileName($Href)
  $LocalPath = Resolve-DownloadPath $Href
  $TitleUk = Get-LocalizedText $File.label "uk"
  $TitleEn = Get-LocalizedText $File.label "en" "uk"
  $CategoryUk = Get-LocalizedText $Category "uk"
  $CategoryEn = Get-LocalizedText $Category "en" "uk"
  $ExtractedText = ""
  $ExtractedTextSource = "metadata"
  $PageSearch = @()

  if ($Type -eq "pdf") {
    $ExternalText = Get-ExternalPdfText $LocalPath
    $CandidateText = if ($ExternalText) { [string]$ExternalText.Text } else { "" }
    if (Test-ExtractedTextQuality $CandidateText) {
      $ExtractedText = $CandidateText
      $ExtractedTextSource = "pdftotext"
      $PageSearch = Get-PageSearchIndex $ExternalText.Pages
    } else {
      $CandidateText = Get-ReadablePdfText $LocalPath
      if (Test-ExtractedTextQuality $CandidateText) {
        $ExtractedText = $CandidateText
        $ExtractedTextSource = "pdf-streams"
      }
    }
  }
  $CommonFields = @(
    $Href,
    $FileName,
    $Type,
    [string]$File.contentKind,
    [string]$File.pages,
    $ExtractedText
  )

  $SearchUk = (@($TitleUk, $CategoryUk) + $CommonFields) -join " "
  $SearchEn = (@($TitleEn, $CategoryEn) + $CommonFields) -join " "

  [ordered]@{
    id = "download-$Position"
    href = $Href
    fileName = $FileName
    collection = $Collection
    category = [ordered]@{
      uk = $CategoryUk
      en = $CategoryEn
    }
    title = [ordered]@{
      uk = $TitleUk
      en = $TitleEn
    }
    type = $Type
    pages = if ($File.pages) { [int]$File.pages } else { $null }
    textLayer = [bool]$File.textLayer
    contentKind = if ($File.contentKind) { [string]$File.contentKind } else { "unknown" }
    keywords = [ordered]@{
      uk = Get-SearchTokens @($TitleUk, $CategoryUk, $FileName)
      en = Get-SearchTokens @($TitleEn, $CategoryEn, $FileName)
    }
    searchText = [ordered]@{
      uk = $SearchUk.Trim()
      en = $SearchEn.Trim()
    }
    extractedText = [ordered]@{
      available = [bool]$ExtractedText
      chars = $ExtractedText.Length
      source = $ExtractedTextSource
    }
    pageSearch = $PageSearch
  }
}

$Manifest = Get-Content -Raw -Encoding UTF8 $DownloadsManifestPath | ConvertFrom-Json
$Items = New-Object System.Collections.Generic.List[object]
$Position = 1
$MonographsUk = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("0JzQvtC90L7Qs9GA0LDRhNGW0Zc="))

foreach ($File in @($Manifest.monographs)) {
  $Items.Add((New-IndexItem -File $File -Collection "monographs" -Category @{ uk = $MonographsUk; en = "Monographs" } -Position $Position)) | Out-Null
  $Position += 1
}

foreach ($Group in @($Manifest.articles)) {
  foreach ($File in @($Group.files)) {
    $Items.Add((New-IndexItem -File $File -Collection "articles" -Category $Group.title -Position $Position)) | Out-Null
    $Position += 1
  }
}

$Index = [ordered]@{
  "version" = 1
  "generatedAt" = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  "source" = "files/downloads/files.json"
  "site" = $SiteOrigin
  "itemCount" = $Items.Count
  "items" = $Items.ToArray()
}

$Json = $Index | ConvertTo-Json -Depth 12
[IO.File]::WriteAllText($IndexPath, $Json, (New-Object Text.UTF8Encoding($false)))

Write-Host "Downloads search index built: $($Items.Count) items -> files/downloads/search-index.json"
