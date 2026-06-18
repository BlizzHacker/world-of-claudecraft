# Cryptic Realm USB Backup System

This folder contains the private ops backup runners for Wade's local machines.
They are intentionally boring: no cloud dependency, no committed secrets, and
each run writes a timestamped backup set to every configured USB target.

## Installed Targets

- Slimmm: `/mnt/usb1`, `/mnt/usb2`
- Thiccc: `/mnt/usb3`, `/mnt/usb4`
- Windows PC: removable drives, or `CR_BACKUP_TARGETS` when a USB is mounted

## Sensitive Files

Secrets are skipped unless encryption is explicitly enabled. Set one of these
before running a backup that should include wallet/mint authority material:

- Linux: `CR_BACKUP_PASSPHRASE_FILE=/root/.cryptic-backup-passphrase`
- Windows: `CR_BACKUP_PASSPHRASE=...`

Do not put that passphrase in Git. Store it offline with the Phantom recovery
phrase and the Solana mint authority backup.

## Manual Runs

Linux:

```bash
sudo CR_BACKUP_TARGETS="/mnt/usb1 /mnt/usb2" /usr/local/sbin/cryptic-usb-backup
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\ops\backups\cryptic-backup-windows.ps1
```
