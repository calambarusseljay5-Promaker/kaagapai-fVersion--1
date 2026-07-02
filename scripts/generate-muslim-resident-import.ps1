param(
  [Parameter(Mandatory = $true)]
  [string]$DocxPath,

  [string]$OutputPath = "supabase/fixes/import-muslim-residents-230-641.sql"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$monthPattern = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec"

function Get-DocxParagraphs {
  param([string]$Path)

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)

  try {
    $entry = $zip.GetEntry("word/document.xml")
    if ($null -eq $entry) {
      throw "word/document.xml was not found in $Path"
    }

    $reader = [System.IO.StreamReader]::new($entry.Open())
    try {
      [xml]$xml = $reader.ReadToEnd()
    } finally {
      $reader.Dispose()
    }

    $ns = [System.Xml.XmlNamespaceManager]::new($xml.NameTable)
    $ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

    $paragraphs = @()
    foreach ($paragraph in $xml.SelectNodes("//w:p", $ns)) {
      $texts = @()
      foreach ($textNode in $paragraph.SelectNodes(".//w:t", $ns)) {
        $texts += $textNode.InnerText
      }

      $line = (($texts -join "") -replace "\s+", " ").Trim()
      if ($line) {
        $paragraphs += $line
      }
    }

    return $paragraphs
  } finally {
    $zip.Dispose()
  }
}

function Normalize-Username {
  param([string]$Value)

  return (($Value -replace "\s+", "") -replace "[^a-zA-Z0-9._-]", "").ToLowerInvariant()
}

function Normalize-Sex {
  param([string]$Value)

  $clean = $(if ($null -eq $Value) { "" } else { $Value }).Trim()
  if ($clean -match "^(M|Male)$") { return "Male" }
  if ($clean -match "^(F|Female)$") { return "Female" }
  return $null
}

function Normalize-Purok {
  param([string]$Value)

  $clean = ($(if ($null -eq $Value) { "" } else { $Value }) -replace "\s+", " ").Trim()
  if ($clean -match "^(Purok\s+)?Muslim$") { return "Muslim" }
  return $clean
}

function Join-Parts {
  param(
    [string[]]$Parts,
    [int]$Start,
    [int]$End
  )

  if ($Start -lt 0 -or $End -lt $Start -or $Start -ge $Parts.Count) {
    return $null
  }

  $safeEnd = [Math]::Min($End, $Parts.Count - 1)
  $value = ($Parts[$Start..$safeEnd] -join ", ").Trim()
  if ($value) { return $value }
  return $null
}

function Parse-DateOrNull {
  param([string]$Value)

  if (-not $Value) { return $null }

  try {
    return ([datetime]::Parse($Value, [Globalization.CultureInfo]::GetCultureInfo("en-US"))).ToString("yyyy-MM-dd")
  } catch {
    return $null
  }
}

function Split-FullName {
  param([string]$FullName)

  $parts = @(
    ($(if ($null -eq $FullName) { "" } else { $FullName }) -replace "\s+", " ").Trim().Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)
  )
  if ($parts.Count -eq 0) {
    return [pscustomobject]@{
      FirstName = $null
      MiddleName = $null
      LastName = $null
    }
  }

  if ($parts.Count -eq 1) {
    return [pscustomobject]@{
      FirstName = $parts[0]
      MiddleName = $null
      LastName = $null
    }
  }

  $middle = $null
  if ($parts.Count -gt 2) {
    $middle = ($parts[1..($parts.Count - 2)] -join " ")
  }

  return [pscustomobject]@{
    FirstName = $parts[0]
    MiddleName = $middle
    LastName = $parts[$parts.Count - 1]
  }
}

function Parse-ResidentLine {
  param(
    [string]$Line,
    [int]$LineNumber
  )

  $parts = @($Line.Split(",") | ForEach-Object { $_.Trim() })
  if ($parts.Count -lt 4) {
    throw "Line $LineNumber does not contain the required resident fields: $Line"
  }

  $dateIndex = -1
  for ($index = 4; $index -lt ($parts.Count - 1); $index++) {
    if ($parts[$index] -match "^($monthPattern)\s+\d{1,2}$") {
      $dateIndex = $index
      break
    }
  }

  $birthday = $null
  $age = $null
  $sex = $null
  $relationship = $null
  $birthplace = $null
  $address = $null
  $notes = @()

  if ($dateIndex -ge 0) {
    $address = Join-Parts -Parts $parts -Start 4 -End ($dateIndex - 1)
    $birthday = Parse-DateOrNull -Value "$($parts[$dateIndex]), $($parts[$dateIndex + 1])"
    $ageIndex = $dateIndex + 2
    $age = if ($ageIndex -lt $parts.Count -and $parts[$ageIndex] -match "^\d+$") { [int]$parts[$ageIndex] } else { $null }
    $sex = if (($ageIndex + 1) -lt $parts.Count) { Normalize-Sex -Value $parts[$ageIndex + 1] } else { $null }
    $relationship = if (($ageIndex + 2) -lt $parts.Count -and $parts[$ageIndex + 2]) { $parts[$ageIndex + 2] } else { $null }
    $birthplace = Join-Parts -Parts $parts -Start ($ageIndex + 3) -End ($parts.Count - 1)
  } else {
    $notes += "No complete month/day/year birthday was found in source line $LineNumber."
    if ($parts.Count -ge 11) {
      $address = Join-Parts -Parts $parts -Start 4 -End 6
      $age = if ($parts[8] -match "^\d+$") { [int]$parts[8] } else { $null }
      $sex = Normalize-Sex -Value $parts[9]
      $relationship = if ($parts[10]) { $parts[10] } else { $null }
      $birthplace = Join-Parts -Parts $parts -Start 11 -End ($parts.Count - 1)
    } else {
      $address = Join-Parts -Parts $parts -Start 4 -End ($parts.Count - 1)
    }
  }

  $nameParts = Split-FullName -FullName $parts[2]

  return [pscustomobject]@{
    SourceLine = $LineNumber
    SeedId = ([guid]::NewGuid()).ToString()
    HouseholdNo = $parts[0]
    UsernameBase = Normalize-Username -Value $parts[1]
    Username = Normalize-Username -Value $parts[1]
    FullName = $parts[2]
    LastName = $nameParts.LastName
    FirstName = $nameParts.FirstName
    MiddleName = $nameParts.MiddleName
    Birthday = $birthday
    Age = $age
    Sex = $sex
    Relationship = $relationship
    Birthplace = $birthplace
    Purok = Normalize-Purok -Value $parts[3]
    Address = $address
    Notes = $notes
  }
}

function Sql-Text {
  param([AllowNull()][string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return "NULL::TEXT"
  }

  return "'" + ($Value -replace "'", "''") + "'"
}

function Sql-Date {
  param([AllowNull()][string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return "NULL::DATE"
  }

  return "DATE '$Value'"
}

function Sql-Uuid {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return "gen_random_uuid()"
  }

  return "'" + ($Value -replace "'", "''") + "'::UUID"
}

function Sql-Integer {
  param([AllowNull()]$Value)

  if ($null -eq $Value -or $Value -eq "") {
    return "NULL::INTEGER"
  }

  return "$Value"
}

$lines = @(Get-DocxParagraphs -Path $DocxPath)
if ($lines.Count -lt 2) {
  throw "No resident rows were found in $DocxPath"
}

$records = @()
for ($lineIndex = 1; $lineIndex -lt $lines.Count; $lineIndex++) {
  $records += Parse-ResidentLine -Line $lines[$lineIndex] -LineNumber ($lineIndex + 1)
}

$usernameCounts = @{}
for ($index = 0; $index -lt $records.Count; $index++) {
  $base = $records[$index].UsernameBase
  if (-not $base) {
    $base = "resident$($records[$index].HouseholdNo)"
  }

  if (-not $usernameCounts.ContainsKey($base)) {
    $usernameCounts[$base] = 0
  }

  $usernameCounts[$base] += 1
  if ($usernameCounts[$base] -eq 1) {
    $records[$index].Username = $base
  } else {
    $records[$index].Username = Normalize-Username -Value "$base$($records[$index].HouseholdNo)"
  }
}

$malformed = @($records | Where-Object { $_.Notes.Count -gt 0 })
$duplicateUsernames = @($records | Group-Object Username | Where-Object { $_.Count -gt 1 })
if ($duplicateUsernames.Count -gt 0) {
  throw "Duplicate usernames remain after normalization: $($duplicateUsernames.Name -join ', ')"
}

$valueRows = @()
foreach ($record in $records) {
  $valueRows += "    ($($record.SourceLine), $(Sql-Uuid $record.SeedId), $(Sql-Text $record.HouseholdNo), $(Sql-Text $record.Username), $(Sql-Text $record.FullName), $(Sql-Text $record.LastName), $(Sql-Text $record.FirstName), $(Sql-Text $record.MiddleName), $(Sql-Date $record.Birthday), $(Sql-Integer $record.Age), $(Sql-Text $record.Sex), $(Sql-Text $record.Relationship), $(Sql-Text $record.Birthplace), $(Sql-Text $record.Purok), $(Sql-Text $record.Address))"
}

$valuesSql = $valueRows -join ",`r`n"
$malformedComments = @()
foreach ($record in $malformed) {
  foreach ($note in $record.Notes) {
    $malformedComments += "-- - $($record.FullName) (household $($record.HouseholdNo)): $note"
  }
}

$commentBlock = if ($malformedComments.Count -gt 0) {
  ($malformedComments -join "`r`n") + "`r`n"
} else {
  ""
}

$sql = @"
-- Import Purok Muslim resident records from Household No muslim.docx.
-- Generated by scripts/generate-muslim-resident-import.ps1.
-- Resident count: $($records.Count).
-- Household range: $(($records.HouseholdNo | ForEach-Object { [int]$_ } | Measure-Object -Minimum).Minimum)-$(($records.HouseholdNo | ForEach-Object { [int]$_ } | Measure-Object -Maximum).Maximum).
-- Purok is normalized to the app value 'Muslim'.
-- Portal usernames come from the DOCX Username column. Duplicate source usernames are suffixed with their household number.
-- Temporary resident portal password is household_no, then house_no, then the first 8 characters of the resident ID.
$commentBlock
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS last_name TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS first_name TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS middle_name TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS house_no TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS household_no TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS relationship_to_household_head TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS birthday DATE;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS age INTEGER;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS sex TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS gender TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS birthplace TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS educational_attainment TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS occupation TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS is_4ps_member BOOLEAN DEFAULT FALSE;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS is_solo_parent BOOLEAN DEFAULT FALSE;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS civil_status TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS is_pwd BOOLEAN DEFAULT FALSE;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS pwd_type TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS purok TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

ALTER TABLE public.residents
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.resident_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  account_status TEXT NOT NULL DEFAULT 'Active',
  must_change_credentials BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.resident_accounts
ADD COLUMN IF NOT EXISTS must_change_credentials BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.resident_accounts
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_resident_accounts_resident_unique
ON public.resident_accounts(resident_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_resident_accounts_username_unique
ON public.resident_accounts(LOWER(username));

CREATE INDEX IF NOT EXISTS idx_resident_accounts_status
ON public.resident_accounts(account_status);

CREATE OR REPLACE FUNCTION public.normalize_resident_claim(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS `$`$
  SELECT regexp_replace(LOWER(COALESCE(value, '')), '[^a-z0-9]', '', 'g')
`$`$;

CREATE OR REPLACE FUNCTION public.normalize_resident_username(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS `$`$
  SELECT LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(TRIM(COALESCE(value, '')), '\s+', '', 'g'),
      '[^a-zA-Z0-9._-]',
      '',
      'g'
    )
  )
`$`$;

CREATE OR REPLACE FUNCTION public.ensure_unique_resident_username(
  p_preferred_username TEXT,
  p_resident_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS `$`$
DECLARE
  v_base TEXT := LEFT(public.normalize_resident_username(p_preferred_username), 24);
  v_candidate TEXT;
  v_counter INTEGER := 1;
BEGIN
  IF v_base = '' THEN
    v_base := 'resident' || SUBSTRING(p_resident_id::TEXT FROM 1 FOR 8);
  END IF;

  v_candidate := v_base;

  WHILE EXISTS (
    SELECT 1
    FROM public.resident_accounts AS account
    WHERE LOWER(account.username) = LOWER(v_candidate)
      AND account.resident_id <> p_resident_id
  ) LOOP
    v_counter := v_counter + 1;
    v_candidate := LEFT(v_base, 24) || v_counter::TEXT;
  END LOOP;

  RETURN v_candidate;
END
`$`$;

WITH resident_seed (
  source_line,
  seed_resident_id,
  house_no,
  household_no,
  username,
  full_name,
  last_name,
  first_name,
  middle_name,
  birthday,
  age,
  sex,
  relationship_to_household_head,
  birthplace,
  purok,
  address
) AS (
  VALUES
$valuesSql
),
seed AS (
  SELECT
    source_line,
    seed_resident_id,
    house_no,
    household_no,
    username,
    full_name,
    last_name,
    first_name,
    middle_name,
    NULL::TEXT AS email,
    NULL::TEXT AS phone,
    birthday,
    age,
    sex,
    sex AS gender,
    relationship_to_household_head,
    birthplace,
    NULL::TEXT AS educational_attainment,
    NULL::TEXT AS occupation,
    FALSE AS is_4ps_member,
    FALSE AS is_solo_parent,
    NULL::TEXT AS civil_status,
    FALSE AS is_pwd,
    NULL::TEXT AS pwd_type,
    purok,
    address,
    'Active'::TEXT AS status
  FROM resident_seed
),
updated_residents AS (
  UPDATE public.residents AS resident
  SET full_name = COALESCE(NULLIF(TRIM(resident.full_name), ''), seed.full_name),
      last_name = COALESCE(NULLIF(TRIM(resident.last_name), ''), seed.last_name),
      first_name = COALESCE(NULLIF(TRIM(resident.first_name), ''), seed.first_name),
      middle_name = COALESCE(NULLIF(TRIM(resident.middle_name), ''), seed.middle_name),
      email = COALESCE(NULLIF(TRIM(resident.email), ''), seed.email),
      phone = COALESCE(NULLIF(TRIM(resident.phone), ''), seed.phone),
      house_no = COALESCE(NULLIF(TRIM(resident.house_no), ''), seed.house_no),
      household_no = COALESCE(NULLIF(TRIM(resident.household_no), ''), seed.household_no),
      relationship_to_household_head = COALESCE(NULLIF(TRIM(resident.relationship_to_household_head), ''), seed.relationship_to_household_head),
      birthday = COALESCE(seed.birthday, resident.birthday),
      age = COALESCE(resident.age, seed.age),
      sex = COALESCE(NULLIF(TRIM(resident.sex), ''), seed.sex),
      gender = COALESCE(NULLIF(TRIM(resident.gender), ''), seed.gender),
      birthplace = COALESCE(NULLIF(TRIM(resident.birthplace), ''), seed.birthplace),
      educational_attainment = COALESCE(NULLIF(TRIM(resident.educational_attainment), ''), seed.educational_attainment),
      occupation = COALESCE(NULLIF(TRIM(resident.occupation), ''), seed.occupation),
      is_4ps_member = COALESCE(resident.is_4ps_member, FALSE) OR seed.is_4ps_member,
      is_solo_parent = COALESCE(resident.is_solo_parent, FALSE) OR seed.is_solo_parent,
      civil_status = COALESCE(NULLIF(TRIM(resident.civil_status), ''), seed.civil_status),
      is_pwd = COALESCE(resident.is_pwd, FALSE) OR seed.is_pwd,
      pwd_type = COALESCE(NULLIF(TRIM(resident.pwd_type), ''), seed.pwd_type),
      purok = COALESCE(NULLIF(TRIM(resident.purok), ''), seed.purok),
      address = COALESCE(NULLIF(TRIM(resident.address), ''), seed.address),
      status = COALESCE(NULLIF(TRIM(resident.status), ''), seed.status),
      updated_at = NOW()
  FROM seed
  WHERE public.normalize_resident_claim(resident.full_name) = public.normalize_resident_claim(seed.full_name)
    AND public.normalize_resident_claim(COALESCE(resident.household_no, resident.house_no, '')) = public.normalize_resident_claim(seed.household_no)
    AND (
      (resident.birthday IS NOT NULL AND seed.birthday IS NOT NULL AND resident.birthday = seed.birthday)
      OR seed.birthday IS NULL
    )
  RETURNING
    resident.id,
    resident.status,
    seed.username,
    seed.house_no,
    seed.household_no
),
inserted_residents AS (
  INSERT INTO public.residents (
    id,
    full_name,
    last_name,
    first_name,
    middle_name,
    email,
    phone,
    house_no,
    household_no,
    relationship_to_household_head,
    birthday,
    age,
    sex,
    gender,
    birthplace,
    educational_attainment,
    occupation,
    is_4ps_member,
    is_solo_parent,
    civil_status,
    is_pwd,
    pwd_type,
    purok,
    address,
    status
  )
  SELECT seed.seed_resident_id,
         seed.full_name,
         seed.last_name,
         seed.first_name,
         seed.middle_name,
         seed.email,
         seed.phone,
         seed.house_no,
         seed.household_no,
         seed.relationship_to_household_head,
         seed.birthday,
         seed.age,
         seed.sex,
         seed.gender,
         seed.birthplace,
         seed.educational_attainment,
         seed.occupation,
         seed.is_4ps_member,
         seed.is_solo_parent,
         seed.civil_status,
         seed.is_pwd,
         seed.pwd_type,
         seed.purok,
         seed.address,
         seed.status
  FROM seed
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.residents AS resident
    WHERE public.normalize_resident_claim(resident.full_name) = public.normalize_resident_claim(seed.full_name)
      AND public.normalize_resident_claim(COALESCE(resident.household_no, resident.house_no, '')) = public.normalize_resident_claim(seed.household_no)
      AND (
        (resident.birthday IS NOT NULL AND seed.birthday IS NOT NULL AND resident.birthday = seed.birthday)
        OR seed.birthday IS NULL
      )
  )
  RETURNING
    id,
    status,
    house_no,
    household_no
),
inserted_with_usernames AS (
  SELECT
    inserted.id,
    inserted.status,
    seed.username,
    inserted.house_no,
    inserted.household_no
  FROM inserted_residents AS inserted
  JOIN seed ON seed.seed_resident_id = inserted.id
),
upserted_residents AS (
  SELECT * FROM updated_residents
  UNION ALL
  SELECT * FROM inserted_with_usernames
)
INSERT INTO public.resident_accounts (
  resident_id,
  username,
  password_hash,
  account_status,
  must_change_credentials
)
SELECT
  upserted.id,
  public.ensure_unique_resident_username(upserted.username, upserted.id),
  crypt(
    COALESCE(
      NULLIF(TRIM(upserted.household_no), ''),
      NULLIF(TRIM(upserted.house_no), ''),
      SUBSTRING(upserted.id::TEXT FROM 1 FOR 8)
    ),
    gen_salt('bf')
  ),
  CASE WHEN upserted.status = 'Active' THEN 'Active' ELSE 'Inactive' END,
  TRUE
FROM upserted_residents AS upserted
WHERE NOT EXISTS (
  SELECT 1
  FROM public.resident_accounts AS account
  WHERE account.resident_id = upserted.id
)
ON CONFLICT (resident_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
"@

$resolvedOutputPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath
} else {
  Join-Path (Get-Location) $OutputPath
}

$outputDirectory = Split-Path -Parent $resolvedOutputPath
if ($outputDirectory -and -not (Test-Path -LiteralPath $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

Set-Content -LiteralPath $resolvedOutputPath -Value $sql -Encoding UTF8

[pscustomobject]@{
  output = $resolvedOutputPath
  residents = $records.Count
  malformed_rows = $malformed.Count
  malformed = $malformed | Select-Object SourceLine, HouseholdNo, Username, FullName, Notes
} | ConvertTo-Json -Depth 5
