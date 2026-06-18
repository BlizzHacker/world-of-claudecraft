# Cryptic Realm SPL Token

Public mainnet deployment details for the Cryptic Realm token integration.

## Mainnet Token

- Token mint: `3QZvD68wupHfRwUZGnuhodB9V8o1pPAhKKJgJC2YmMMv`
- Mint authority public key: `5ADZF7Go4pbS5GY3hBAVKHFydhE3fGWZnJaQ6WcMKsoA`
- Owner / treasury wallet: `GncAXx6j38osJns395XZtf6rSA9MU3K1gwafTrHpBJpi`
- Owner associated token account: `DMW67QsiBiVV7CmYHzAzkLzFkSoNK1nVLPDw7nY5CBqr`
- Decimals: `9`
- Initial supply minted at creation: `0`

The supply is intentionally driven by the in-game platinum claim flow. Do not
mint an arbitrary launch supply without an explicit economy decision.

## Control Model

There are two separate controls:

- **Treasury wallet:** the Phantom wallet address
  `GncAXx6j38osJns395XZtf6rSA9MU3K1gwafTrHpBJpi`. This controls tokens already
  held by the treasury and any SOL used for fees.
- **Mint authority:** the keypair whose public key is
  `5ADZF7Go4pbS5GY3hBAVKHFydhE3fGWZnJaQ6WcMKsoA`. This controls whether new
  `$CR` can be minted.

Never commit or paste the mint authority keypair JSON, Phantom recovery phrase,
or private keys. Public proof pages should show the mint, treasury address, and
Solscan links only.

## Minting Policy

The default policy is controlled distribution through platinum:

1. Players earn off-chain platinum from approved gameplay rewards.
2. Release channels can change earning speed:
   - `alpha`: `3x` platinum rewards, 14-day character reset cadence.
   - `beta`: `1.5x` platinum rewards, monthly promotion cadence.
   - `public`: `1x` platinum rewards, persistent characters.
3. When live claim minting is enabled, a player links a Solana wallet, spends
   off-chain platinum, and the server mints `$CR` to that wallet through the
   official `spl-token` CLI.
4. Failed chain mints refund off-chain platinum.

Manual minting should be rare and documented in an ops note. The equivalent CLI
shape is:

```bash
spl-token mint 3QZvD68wupHfRwUZGnuhodB9V8o1pPAhKKJgJC2YmMMv <amount> \
  --recipient-owner <destination-wallet> \
  --mint-authority /opt/cryptic-realm/.secrets/mint_authority.json \
  --fee-payer /opt/cryptic-realm/.secrets/mint_authority.json \
  --url https://api.mainnet-beta.solana.com \
  --output json
```

Do not run manual mint commands from chat instructions alone. Verify the
destination wallet, amount, and purpose first, and record the resulting
transaction signature.

## Runtime Env

Set these on the LXC only when live player claim minting should be enabled:

```bash
CR_SOLANA_RPC=https://api.mainnet-beta.solana.com
CR_SOLANA_NETWORK=solana
CR_SOLANA_MINT=3QZvD68wupHfRwUZGnuhodB9V8o1pPAhKKJgJC2YmMMv
CR_SOLANA_DECIMALS=9
CR_SPL_TOKEN_CLI=/usr/local/bin/spl-token
CR_SOLANA_MINT_AUTHORITY=/opt/cryptic-realm/.secrets/mint_authority.json
```

`CR_SPL_TOKEN_CLI` should point at the `spl-token` binary installed on the LXC.
The mint-authority keypair file is a secret; never commit it and never paste its
contents into chat. If copied to the LXC, keep the directory `700` and the file
`600`.

## Website Behavior

Cryptic Realm realms show `$CR Contract Address` and the mint above. The
Claudecraft realm keeps the upstream `$WOC` address. Public pages should link
to Solscan proof and the white paper; admin-only pages can show the custody
checklist and mint-authority reminders.
