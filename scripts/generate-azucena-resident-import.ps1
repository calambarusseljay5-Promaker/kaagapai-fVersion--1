param(
  [Parameter(Mandatory = $true)]
  [string]$SourcePath,

  [string]$TemplatePath = "supabase/Database/import-buklod-residents-714-802.sql",

  [string]$OutputPath = "supabase/Database/import-azucena-residents-804-842.sql"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-ProjectPath {
  param([string]$Path)

  if ([System.IO.Path]::IsPathRooted($Path)) {
    return $Path
  }

  return Join-Path (Get-Location) $Path
}

function Clean-Field {
  param([AllowNull()][string]$Value)

  if ($null -eq $Value) {
    return ""
  }

  return (($Value -replace "\r?\n", " ") -replace "\s+", " ").Trim()
}

function Convert-Birthday {
  param([string]$Value)

  $clean = Clean-Field $Value
  if (-not $clean) {
    return ""
  }

  if ($clean -notmatch "^(?<month>\d{1,2})-(?<day>\d{1,2})-(?<year>\d{2})$") {
    return $clean
  }

  $month = [int]$Matches.month
  $day = [int]$Matches.day
  $shortYear = [int]$Matches.year
  $year = if ($shortYear -le 29) { 2000 + $shortYear } else { 1900 + $shortYear }

  try {
    $date = [datetime]::new($year, $month, $day)
    return $date.ToString(
      "MMMM d yyyy",
      [Globalization.CultureInfo]::GetCultureInfo("en-US")
    )
  } catch {
    return $clean
  }
}

$resolvedSourcePath = Resolve-ProjectPath $SourcePath
$resolvedTemplatePath = Resolve-ProjectPath $TemplatePath
$resolvedOutputPath = Resolve-ProjectPath $OutputPath

$sourceLines = @(Get-Content -LiteralPath $resolvedSourcePath)
if ($sourceLines.Count -lt 2) {
  throw "No resident rows were found in $resolvedSourcePath"
}

$currentHousehold = ""
$rows = @()

foreach ($line in $sourceLines | Select-Object -Skip 1) {
  if ([string]::IsNullOrWhiteSpace($line)) {
    continue
  }

  $parts = @($line -split "`t", -1)
  if ($parts.Count -lt 4) {
    continue
  }

  $sourceHousehold = Clean-Field $parts[0]
  if ($sourceHousehold) {
    $currentHousehold = $sourceHousehold
  }

  $lastName = Clean-Field $parts[1]
  $firstName = Clean-Field $parts[2]
  if (-not $currentHousehold -or (-not $lastName -and -not $firstName)) {
    continue
  }

  $rows += [pscustomobject]@{
    Household = $currentHousehold
    LastName = $lastName
    FirstName = $firstName
    MiddleName = Clean-Field $parts[3]
    Birthday = Convert-Birthday $(if ($parts.Count -gt 5) { $parts[5] } else { "" })
    Sex = Clean-Field $(if ($parts.Count -gt 6) { $parts[6] } else { "" })
    Birthplace = Clean-Field $(if ($parts.Count -gt 4) { $parts[4] } else { "" })
    Education = Clean-Field $(if ($parts.Count -gt 8) { $parts[8] } else { "" })
    Occupation = Clean-Field $(if ($parts.Count -gt 7) { $parts[7] } else { "" })
    Program = Clean-Field $(if ($parts.Count -gt 9) { $parts[9] } else { "" })
  }
}

$households = @($rows.Household | Select-Object -Unique)
if ($rows.Count -ne 156) {
  throw "Expected 156 residents but parsed $($rows.Count)."
}
if ($households.Count -ne 39 -or $households[0] -ne "1" -or $households[-1] -ne "39") {
  throw "Expected source households 1-39 but parsed: $($households -join ', ')."
}

$normalizedRows = @(
  "HH|Last Name|First Name|Middle Name|Birthday|Sex|Birth Place|Educational Attainment|Occupation|Program"
)

foreach ($row in $rows) {
  $normalizedRows += @(
    $row.Household,
    $row.LastName,
    $row.FirstName,
    $row.MiddleName,
    $row.Birthday,
    $row.Sex,
    $row.Birthplace,
    $row.Education,
    $row.Occupation,
    $row.Program
  ) -join "|"
}

$sql = Get-Content -Raw -LiteralPath $resolvedTemplatePath
$sql = $sql.Replace("Buklod", "Azucena")
$sql = $sql.Replace("buklod", "azucena")
$sql = $sql.Replace("714-802", "804-842")
$sql = $sql.Replace("1 -> 714", "1 -> 804")
$sql = $sql.Replace("(713 + ROW_NUMBER()", "(803 + ROW_NUMBER()")

$rawBlock = $normalizedRows -join "`r`n"
$rawPattern = '(?s)HH\|Last Name\|First Name\|Middle Name\|Birthday\|Sex\|Birth Place\|Educational Attainment\|Occupation.*?(?=\r?\n\$azucena_rows\$)'
$sql = [regex]::Replace($sql, $rawPattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $rawBlock })

$sql = $sql.Replace(
  "    NULLIF(TRIM(split_part(line, '|', 9)), '') AS occupation_text",
  "    NULLIF(TRIM(split_part(line, '|', 9)), '') AS occupation_text,`r`n    NULLIF(TRIM(split_part(line, '|', 10)), '') AS program_text"
)
$sql = [regex]::Replace(
  $sql,
  '(?m)^    END AS occupation,\r?\n    ROW_NUMBER\(\)',
  "    END AS occupation,`r`n    source.program_text,`r`n    ROW_NUMBER()"
)
$sql = $sql.Replace(
  "    FALSE AS is_4ps_member,",
  "    LOWER(COALESCE(program_text, '')) = '4ps' AS is_4ps_member,"
)

if ($sql -notmatch "'Azucena'::TEXT AS purok") {
  throw "Generated SQL does not contain the Azucena purok value."
}
if ($sql -notmatch "\(803 \+ ROW_NUMBER\(\)") {
  throw "Generated SQL does not start household remapping at 804."
}
if ($sql -notmatch "source\.program_text") {
  throw "Generated SQL does not preserve the 4Ps source column."
}

$outputDirectory = Split-Path -Parent $resolvedOutputPath
if ($outputDirectory -and -not (Test-Path -LiteralPath $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

Set-Content -LiteralPath $resolvedOutputPath -Value $sql -Encoding UTF8

[pscustomobject]@{
  output = $resolvedOutputPath
  residents = $rows.Count
  households = $households.Count
  first_household = 804
  last_household = 842
  four_ps_members = @($rows | Where-Object { $_.Program -match "^4ps$" }).Count
  missing_birthdays = @($rows | Where-Object { -not $_.Birthday }).Count
  incomplete_names = @($rows | Where-Object { -not $_.FirstName -or -not $_.LastName }).Count
} | ConvertTo-Json -Depth 3
