param(
  [string[]]$Sources = @("C:\MoveWeight\cryptic-realm", "C:\MoveWeight\moveweight-ui"),
  [int]$Keep = 14
)

$ErrorActionPreference = "Stop"
$Stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$HostName = $env:COMPUTERNAME
$Stage = Join-Path $env:TEMP "cryptic-realm-$HostName-$Stamp"
New-Item -ItemType Directory -Force -Path $Stage | Out-Null

function Get-BackupTargets {
  if ($env:CR_BACKUP_TARGETS) {
    return $env:CR_BACKUP_TARGETS.Split(";", [System.StringSplitOptions]::RemoveEmptyEntries)
  }
  Get-Volume |
    Where-Object { $_.DriveLetter -and $_.DriveType -eq "Removable" } |
    ForEach-Object { "$($_.DriveLetter):\" }
}

try {
  $Targets = @(Get-BackupTargets)
  if ($Targets.Count -eq 0) {
    Write-Warning "No removable backup targets found. Connect a USB drive or set CR_BACKUP_TARGETS."
    exit 2
  }

  $manifest = @(
    "host=$HostName",
    "stamp=$Stamp",
    "targets=$($Targets -join ',')",
    "sources=$($Sources -join ',')"
  )
  $manifest | Set-Content -Path (Join-Path $Stage "MANIFEST.txt") -Encoding ascii

  foreach ($Source in $Sources) {
    if (-not (Test-Path $Source)) { continue }
    $name = Split-Path $Source -Leaf
    $out = Join-Path $Stage $name
    New-Item -ItemType Directory -Force -Path $out | Out-Null

    if (Test-Path (Join-Path $Source ".git")) {
      git -C $Source bundle create (Join-Path $Stage "$name.git.bundle") HEAD | Out-Null
      git -C $Source status --branch --short | Set-Content -Path (Join-Path $Stage "$name.git-status.txt") -Encoding ascii
    }

    robocopy $Source $out /MIR /XD .git node_modules dist dist-server ".deploy-backups" ".secrets" "classic realm assets" "claudcraft realm assets" "cryptic realm assets" "infernal realm assets" /XF .env *.log | Out-Null
    if ($LASTEXITCODE -gt 7) { throw "robocopy failed for $Source with exit $LASTEXITCODE" }
  }

  $Sensitive = @(
    "$env:USERPROFILE\.config\solana\cryptic-realm-mint.json",
    "$env:USERPROFILE\.config\solana\id.json"
  ) | Where-Object { Test-Path $_ }

  if ($Sensitive.Count -gt 0 -and $env:CR_BACKUP_PASSPHRASE -and (Get-Command openssl -ErrorAction SilentlyContinue)) {
    $secretTar = Join-Path $Stage "cryptic-secrets.tgz"
    tar -czf $secretTar @Sensitive
    $env:CR_BACKUP_PASSPHRASE | openssl enc -aes-256-cbc -salt -pbkdf2 -in $secretTar -out "$secretTar.enc" -pass stdin
    Remove-Item $secretTar -Force
    "secrets=encrypted" | Add-Content -Path (Join-Path $Stage "MANIFEST.txt") -Encoding ascii
  } else {
    "secrets=skipped (set CR_BACKUP_PASSPHRASE and install openssl)" | Add-Content -Path (Join-Path $Stage "MANIFEST.txt") -Encoding ascii
  }

  Get-ChildItem -File $Stage | Get-FileHash -Algorithm SHA256 |
    ForEach-Object { "$($_.Hash)  $($_.Path)" } |
    Set-Content -Path (Join-Path $Stage "SHA256SUMS.txt") -Encoding ascii

  foreach ($Target in $Targets) {
    if (-not (Test-Path $Target)) { continue }
    $destRoot = Join-Path $Target "CrypticRealmBackups\$HostName"
    $dest = Join-Path $destRoot "cryptic-realm-$HostName-$Stamp"
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    robocopy $Stage $dest /MIR | Out-Null
    if ($LASTEXITCODE -gt 7) { throw "robocopy failed for target $Target with exit $LASTEXITCODE" }
    $dest | Set-Content -Path (Join-Path $destRoot "LATEST.txt") -Encoding ascii
    Get-ChildItem -Directory $destRoot -Filter "cryptic-realm-*" |
      Sort-Object Name -Descending |
      Select-Object -Skip $Keep |
      Remove-Item -Recurse -Force
    Write-Host "Wrote $dest"
  }
} finally {
  Remove-Item $Stage -Recurse -Force -ErrorAction SilentlyContinue
}
