# $CR Token — Devnet Deployment Record (2026-07-18)

## The mint (Solana DEVNET — test crypto, no real funds)

| | |
|---|---|
| Mint address | `DU7v3bej9FW9zMYLAwvuFf1PUmLzPL4w3sEe5kLGptco` |
| Program | Classic SPL (Tokenkeg) — required by cr_home_escrow (TOKEN_PROGRAM_ID) |
| Decimals | 9 |
| Total supply | 1,000,000,000 CR — minted in full, 2026-07-18 |
| Distribution | ZERO. Entire supply sits in the treasury ATA. Nobody else holds any. |
| Mint authority | `6pzWEiNBY5mTdT6ME47QSZ6Xm9oLDqufxWwutqHhbwvc` (deployer/controller) |
| Freeze authority | same (exchange-grade account-freeze control) |
| Treasury | deployer ATA, same pubkey |

Controller identity: game account id 1 (MOVEWEIGHT, wadeivy11@gmail.com,
Authentik akadmin SSO-bound, superadmin). Wallet linked in
economy_wallet_links as the recognized controller wallet.

Keys: deployer keypair lives on CT172 `/root/cr-devnet-deployer.json`; a copy
serves as the game settlement authority at CT171
`/opt/cryptic-realm/secrets/cr-devnet-authority.json` (0600). DEVNET ONLY —
at mainnet these MUST split (treasury cold, settlement hot, multisig).

## Game wiring (shared /opt/cryptic-realm/.env, layered onto every realm + stage)

    CR_SOLANA_RPC=https://api.devnet.solana.com
    CR_SOLANA_NETWORK=solana-devnet
    CR_SOLANA_MINT=DU7v3bej9FW9zMYLAwvuFf1PUmLzPL4w3sEe5kLGptco
    CR_SOLANA_DECIMALS=9
    CR_SOLANA_MINT_AUTHORITY=/opt/cryptic-realm/secrets/cr-devnet-authority.json
    CR_SPL_TOKEN_CLI=/usr/local/bin/spl-token

Boot proof: "ECONOMY: Solana chain enabled (solana-devnet)" on the apex and
exchange realms. The settlement adapter mints/reads via the spl-token CLI.

## What is already exchange-grade

- Custody + provenance schema, append-only exchange_events audit ledger
- /api/exchange listings with idempotency keys, cancel, settle, audit, reverse
- Signed-message wallet linking; account purchase + inventory ledgers
- On-chain home escrow program (cr_home_escrow, devnet-proven lifecycle)

## Before ANY mainnet release (do not skip)

1. New mainnet mint from a fresh ceremony; devnet key material never reused.
2. Split authorities: cold treasury (hardware/multisig), hot settlement key
   with a mint cap or a transfer-from-treasury model instead of open mint.
3. Metaplex token metadata (name/symbol/logo) for explorer + wallet display.
4. Legal/KYC posture decided BEFORE liquidity exists; jurisdiction review.
5. Third-party audit of cr_home_escrow and the settlement wire.
