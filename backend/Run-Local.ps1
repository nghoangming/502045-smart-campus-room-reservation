param(
    [string]$Database = 'CNPM',
    [string]$Username = 'postgres',
    [int]$Port = 5432,
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$PgBin = 'C:\Program Files\PostgreSQL\18\bin'
)

$ErrorActionPreference = 'Stop'
if (-not $JavaHome) {
    $javaRuntime = Get-ChildItem -Path "$env:USERPROFILE\.vscode\extensions\redhat.java-*\jre\25*" -Directory -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | Select-Object -First 1
    if ($javaRuntime) { $JavaHome = $javaRuntime.FullName }
}
if (-not $JavaHome -or -not (Test-Path -LiteralPath (Join-Path $JavaHome 'bin\java.exe'))) {
    throw 'Set JAVA_HOME to JDK 25 or supply -JavaHome before starting this project.'
}
$javaVersion = & (Join-Path $JavaHome 'bin\java.exe') --version | Out-String
if ($javaVersion -notmatch '(?m)^(?:openjdk|java) 25[.\s]') {
    throw 'This project requires Java 25. Supply -JavaHome with the correct installation directory.'
}
$securePassword = Read-Host "PostgreSQL password for $Username (not saved)" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$savedEnvironment = @{}
foreach ($variableName in @('DB_URL', 'DB_USERNAME', 'DB_PASSWORD', 'PGPASSWORD', 'PGCONNECT_TIMEOUT', 'JAVA_HOME')) {
    $savedEnvironment[$variableName] = [Environment]::GetEnvironmentVariable($variableName, 'Process')
}
try {
    $env:JAVA_HOME = $JavaHome
    $encodedDatabase = [Uri]::EscapeDataString($Database)
    $env:DB_URL = "jdbc:postgresql://localhost:$Port/$encodedDatabase"
    $env:DB_USERNAME = $Username
    $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $env:PGPASSWORD = $env:DB_PASSWORD
    $env:PGCONNECT_TIMEOUT = '5'
    & (Join-Path $PgBin 'psql.exe') -X -w -h localhost -p $Port -U $Username -d $Database -v ON_ERROR_STOP=1 -c 'SELECT current_database(), current_user;'
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL connection failed. The backend was not started.' }
    Write-Host "Starting backend on database [$Database]; SQL migration and seed are managed manually."
    & (Join-Path $PSScriptRoot 'mvnw.cmd') -f (Join-Path $PSScriptRoot 'pom.xml') spring-boot:run '-Dspring-boot.run.profiles=dev' '-Dspring-boot.run.arguments=--spring.flyway.enabled=false'
    if ($LASTEXITCODE -ne 0) { throw 'Backend failed. Review the migration/startup error above.' }
} finally {
    foreach ($variableName in $savedEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($variableName, $savedEnvironment[$variableName], 'Process')
    }
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    $securePassword.Dispose()
}
