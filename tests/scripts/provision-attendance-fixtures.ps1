$ErrorActionPreference = 'Stop'

$envPath = Join-Path $PSScriptRoot '..\.env'
$envPath = [System.IO.Path]::GetFullPath($envPath)
if (-not (Test-Path -LiteralPath $envPath)) {
  throw "Missing $envPath. Copy .env.example to .env and configure DB and test accounts first."
}

$settings = @{}
Get-Content -LiteralPath $envPath | ForEach-Object {
  if ($_ -match '^\s*([^#=]+?)\s*=(.*)$') {
    $settings[$Matches[1].Trim()] = $Matches[2].Trim().Trim('"').Trim("'")
  }
}

$required = @('DB_URL', 'DB_USER', 'DB_PASSWORD', 'TEST_ADMIN_EMAIL', 'TEST_TEACHER_EMAIL', 'TEST_STUDENT_EMAIL', 'TEST_STUDENT2_EMAIL')
$missing = @($required | Where-Object { -not $settings[$_] })
if ($missing.Count) { throw "Missing values in tests/.env: $($missing -join ', ')" }

$url = [regex]::Match($settings.DB_URL, '^jdbc:postgresql://([^:/?]+)(?::(\d+))?/([^?]+)')
if (-not $url.Success) { throw 'DB_URL must use jdbc:postgresql://host:port/database format.' }
$env:PGHOST = $url.Groups[1].Value
$env:PGPORT = if ($url.Groups[2].Success) { $url.Groups[2].Value } else { '5432' }
$env:PGDATABASE = $url.Groups[3].Value
$env:PGUSER = $settings.DB_USER
$env:PGPASSWORD = $settings.DB_PASSWORD
$env:PGCONNECT_TIMEOUT = '10'

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) { throw 'psql is required to provision these data-only fixtures.' }
$sqlPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\fixtures\attendance-fixtures.sql'))
$arguments = @(
  '-X', '-w', '-q', '-A', '-t', '-F', '|', '-v', 'ON_ERROR_STOP=1',
  '-v', "teacher_email=$($settings.TEST_TEACHER_EMAIL)",
  '-v', "admin_email=$($settings.TEST_ADMIN_EMAIL)",
  '-v', "student_email=$($settings.TEST_STUDENT_EMAIL)",
  '-v', "student2_email=$($settings.TEST_STUDENT2_EMAIL)",
  '-f', $sqlPath
)
$output = @(& $psql.Source @arguments)
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL fixture provisioning failed; see psql error above.' }
$fixtureLine = $output | Where-Object { $_ -match '^\d+\|[A-Z0-9]{5}\|[A-Z0-9]{5}\|\d+\|\d+\|\d+\|\d+\|\d+\|\d+$' } | Select-Object -Last 1
if (-not $fixtureLine) { throw 'Fixture SQL completed but returned no fixture IDs.' }

$values = $fixtureLine -split '\|'
$fixtureVariables = [ordered]@{
  TEST_QR_CLASS_SESSION_ID = $values[0]
  TEST_QR_VALID_CODE = $values[1]
  TEST_QR_EXPIRED_CODE = $values[2]
  TEST_QR_WRONG_CLASS_SESSION_ID = $values[3]
  TEST_QR_WORKFLOW_SESSION_ID = $values[4]
  TEST_FINALIZE_CLASS_SESSION_ID = $values[5]
  TEST_ENDED_CLASS_SESSION_ID = $values[6]
  TEST_ENDED_SEAT_ID = $values[7]
  TEST_ENDED_SEAT_RESERVATION_ID = $values[8]
}

$lines = Get-Content -LiteralPath $envPath
foreach ($key in $fixtureVariables.Keys) {
  $found = $false
  $lines = @($lines | ForEach-Object {
    if ($_ -match "^\s*$key\s*=") { $found = $true; "$key=$($fixtureVariables[$key])" } else { $_ }
  })
  if (-not $found) { $lines += "$key=$($fixtureVariables[$key])" }
}
Set-Content -LiteralPath $envPath -Value $lines -Encoding utf8

Write-Output 'Provisioned active QR and ended-session business data fixtures; updated QR/session fixture IDs in tests/.env.'
