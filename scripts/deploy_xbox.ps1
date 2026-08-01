<#
.SYNOPSIS
  Sideload the Cryptic Realm console package onto an Xbox in Developer Mode.

.DESCRIPTION
  Pushes the MSIX through the Xbox Device Portal REST API, so a hardware test is
  one command instead of a browser upload. The console must be powered on and in
  Developer Mode; Device Portal only listens (port 11443) in that mode, so if the
  probe finds nothing the console is off, retail, or on another network.

  Device Portal serves a self signed certificate, so validation is bypassed for
  this call only and restored afterwards. That is safe here because the target is
  an address on your own LAN that you pass in explicitly.

.PARAMETER ConsoleIp
  Console address. Omit to scan 192.168.0.0/24 for a Device Portal.

.PARAMETER Package
  Path to the .msix. Defaults to the newest sideload build under STORE-SUBMIT.

.EXAMPLE
  .\scripts\deploy_xbox.ps1 -ConsoleIp 192.168.0.50
#>
[CmdletBinding()]
param(
  [string] $ConsoleIp,
  [string] $Package,
  [string] $Subnet = '192.168.0'
)

$ErrorActionPreference = 'Stop'

function Find-Console {
  param([string] $Prefix)
  Write-Host "Scanning $Prefix.0/24 for Device Portal (11443)..."
  $tasks = @()
  foreach ($i in 1..254) {
    $ip = "$Prefix.$i"
    $c = New-Object System.Net.Sockets.TcpClient
    $tasks += [pscustomobject]@{ IP = $ip; C = $c; A = $c.BeginConnect($ip, 11443, $null, $null) }
  }
  Start-Sleep -Milliseconds 2500
  $found = @()
  foreach ($t in $tasks) {
    if ($t.A.IsCompleted -and $t.C.Connected) { $found += $t.IP }
    $t.C.Close()
  }
  return $found
}

if (-not $ConsoleIp) {
  $found = Find-Console -Prefix $Subnet
  if ($found.Count -eq 0) {
    Write-Error @"
No Device Portal found on $Subnet.0/24.

Device Portal only runs in Developer Mode, so one of these is true:
  * the console is powered off
  * the console is still in retail mode (install Dev Mode Activation from the
    Store on the console and follow it through)
  * the console is on a different network from this PC
"@
    exit 1
  }
  if ($found.Count -gt 1) {
    Write-Host "Multiple consoles found: $($found -join ', '). Pass -ConsoleIp to choose."
    exit 1
  }
  $ConsoleIp = $found[0]
  Write-Host "Found console at $ConsoleIp"
}

if (-not $Package) {
  $Package = Get-ChildItem 'C:\MoveWeight\STORE-SUBMIT\xbox-webview2' -Recurse -Filter '*.msix' |
             Where-Object { $_.FullName -like '*_Test*' -or $_.Name -like 'CrypticRealm-Xbox-*' } |
             Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $Package -or -not (Test-Path $Package)) { Write-Error "package not found: $Package"; exit 1 }
$pkgName = Split-Path $Package -Leaf
Write-Host ("Package: {0} ({1:N0} bytes)" -f $pkgName, (Get-Item $Package).Length)

$cred = Get-Credential -Message "Device Portal credentials (set in Dev Home on the console)"

# Device Portal presents a self signed cert; trust it for this session only.
$saved = [System.Net.ServicePointManager]::ServerCertificateValidationCallback
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
try {
  $base = "https://${ConsoleIp}:11443"
  $uri = "$base/api/app/packagemanager/package?package=$pkgName"

  # Device Portal wants a multipart body whose part name is the file name.
  $boundary = [System.Guid]::NewGuid().ToString()
  $bytes = [System.IO.File]::ReadAllBytes($Package)
  $enc = [System.Text.Encoding]::GetEncoding('iso-8859-1')
  $body = (
    "--$boundary`r`n" +
    "Content-Disposition: form-data; name=`"$pkgName`"; filename=`"$pkgName`"`r`n" +
    "Content-Type: application/octet-stream`r`n`r`n" +
    $enc.GetString($bytes) + "`r`n--$boundary--`r`n"
  )

  Write-Host "Uploading to $ConsoleIp ..."
  Invoke-RestMethod -Uri $uri -Method Post -Credential $cred `
    -ContentType "multipart/form-data; boundary=$boundary" `
    -Body $enc.GetBytes($body) -TimeoutSec 900 | Out-Null

  # Install is asynchronous: the POST returns as soon as the bytes land.
  Write-Host "Installing..."
  for ($i = 0; $i -lt 120; $i++) {
    Start-Sleep -Seconds 5
    $state = Invoke-RestMethod -Uri "$base/api/app/packagemanager/state" -Credential $cred
    if ($null -eq $state -or -not $state.Code) { Write-Host "Install complete."; break }
    Write-Host ("  {0}" -f $state.CodeText)
    if ($state.Code -ne 0 -and $state.CodeText -match 'fail|error') {
      Write-Error ("install failed: " + $state.CodeText); exit 1
    }
  }

  $apps = Invoke-RestMethod -Uri "$base/api/app/packagemanager/packages" -Credential $cred
  $mine = $apps.InstalledPackages | Where-Object { $_.Name -like '*CrypticRealm*' }
  if (-not $mine) { Write-Error "package is not listed as installed"; exit 1 }
  Write-Host ""
  Write-Host "Installed:"
  $mine | ForEach-Object { Write-Host ("  {0}  {1}" -f $_.Name, $_.Version.ToString()) }
  Write-Host ""
  Write-Host "Launch it from the Dev Mode games list, then press A once so it goes"
  Write-Host "fullscreen and takes the controller. Exit with View+Menu held ~2s."
}
finally {
  [System.Net.ServicePointManager]::ServerCertificateValidationCallback = $saved
}
