# Cryptic Realm Crypto Custody Runbook

Date: 2026-06-18

This is the practical control and backup guide for the Cryptic Realm Solana
token. It is operational guidance, not legal, tax, or financial advice.

## What Controls What

- Phantom recovery phrase: restores the Phantom wallet that owns
  `GncAXx6j38osJns395XZtf6rSA9MU3K1gwafTrHpBJpi`. If the computer dies, the
  recovery phrase is what brings that wallet back.
- Treasury wallet: holds SOL and any `$CR` tokens distributed to that wallet's
  associated token account.
- Token mint: `3QZvD68wupHfRwUZGnuhodB9V8o1pPAhKKJgJC2YmMMv`. This is the
  public token address players can copy, add to Phantom, or use in explorers.
- Mint authority keypair: controls whether new `$CR` can be minted. Current
  public key: `5ADZF7Go4pbS5GY3hBAVKHFydhE3fGWZnJaQ6WcMKsoA`.
- Server hot key: if the LXC has a copy of the mint authority keypair, the game
  can sign mint transactions for approved claim flows. That copy is convenient,
  but it is not cold storage.

Phantom does not automatically control the mint authority unless the authority
was created by Phantom, imported into Phantom, or transferred to a Phantom or
hardware wallet address. Treat the Phantom wallet and the mint authority keypair
as two separate things until an on-chain authority transfer proves otherwise.

## What You Must Never Lose

1. Phantom recovery phrase, written offline.
2. Mint authority keypair JSON or its original seed phrase, stored offline.
3. The encryption passphrase used for any encrypted USB secret bundle.
4. A printed note with the token mint, treasury wallet, mint authority public
   key, and the date of the backup.

If the Phantom phrase is lost, wallet funds and tokens held by that wallet may
be unrecoverable. If the mint authority is lost before authority is transferred
or revoked, future minting and freeze authority control may be unrecoverable.

## USB Backup Pattern

Use three physical USB sets:

- Primary cold USB: kept disconnected except during backup or recovery tests.
- Secondary cold USB: stored separately from the primary.
- Offsite USB or paper packet: stored away from the building.

For each set, store:

- `cryptic-secrets.tgz.enc` from the backup system when encryption is enabled.
- A paper copy of the Phantom recovery phrase.
- A paper copy of the backup encryption passphrase.
- A paper inventory page listing the public addresses above.

Never store an unencrypted recovery phrase, keypair JSON, screenshot, photo, or
cloud note on a normal connected computer.

## Running Encrypted Backups

Linux hosts:

```bash
sudo install -m 600 /dev/null /root/.cryptic-backup-passphrase
sudo nano /root/.cryptic-backup-passphrase
sudo CR_BACKUP_PASSPHRASE_FILE=/root/.cryptic-backup-passphrase \
  CR_BACKUP_TARGETS="/mnt/usb1 /mnt/usb2" \
  /usr/local/sbin/cryptic-usb-backup
```

Windows:

```powershell
$env:CR_BACKUP_PASSPHRASE = "use-a-long-offline-passphrase"
$env:CR_BACKUP_TARGETS = "E:\;F:\"
powershell -ExecutionPolicy Bypass -File .\ops\backups\cryptic-backup-windows.ps1
Remove-Item Env:\CR_BACKUP_PASSPHRASE
```

The passphrase should be long, unique, and written on paper. Do not commit it,
paste it into chat, save it in a cloud note, or leave it in shell history.

## Recovery Test

Do this with a tiny test backup before trusting the system:

1. Pick one USB.
2. Copy the encrypted secret bundle to a temporary offline folder.
3. Decrypt it with the written passphrase.
4. Confirm the mint authority public key matches:

```bash
solana-keygen pubkey mint_authority.json
```

5. Delete the temporary decrypted copy.
6. Keep the USB disconnected.

Do not test recovery by moving real funds unless you intentionally approve that
transaction in Phantom or with the Solana CLI.

## How You Manage The Currency

- Distribute existing `$CR`: transfer tokens from a wallet that holds `$CR`.
- Mint new `$CR`: use the mint authority through `spl-token mint` or the game
  server's approved claim flow.
- Stop future minting: transfer authority to a safer wallet or revoke mint
  authority after supply rules are final.
- Freeze or thaw token accounts: only possible if freeze authority exists and is
  still controlled.
- Player wallet connection: Phantom proves wallet ownership through a signed
  message; the game should not ask for seed phrases or private keys.

## What To Learn Next

- Seed phrase vs private key vs keypair JSON.
- Mint authority vs freeze authority.
- Associated token accounts.
- Solana transaction fees and rent.
- Hardware wallets for Solana.
- Multisig custody, preferably before any high-value treasury exists.
- How to revoke mint authority only after the economy is final.

## Near-Term Hardening

1. Move long-term authority to a hardware wallet or multisig.
2. Keep only the minimum hot-key permissions needed for automated game claims.
3. Require admin approval and logs for any manual mint.
4. Keep the server hot key encrypted at rest and backed up offline.
5. Write a public supply policy before minting meaningful supply.
