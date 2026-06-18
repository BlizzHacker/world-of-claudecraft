# Cryptic Realm Solana Token Deploy Guide

This guide covers creating a Cryptic Realm SPL token, wiring the mint into the
server, and enabling the player-side "Claim platinum -> wallet" flow.

Safety language used by the game and API: items and on-chain tokens granted in
Cryptic Realm are utility for gameplay, cosmetics, achievements, and account
ownership records. They are not investments, securities, or financial
instruments. No price appreciation, revenue share, staking yield, or guaranteed
value is implied or promised.

## Current Mainnet Deployment

The current Cryptic Realm mainnet mint is recorded in
`docs/CRYPTIC_REALM_TOKEN.md`.

## Requirements

| Item | Cost | Notes |
|---|---:|---|
| Phantom wallet | free | https://phantom.app/ |
| Solana / Agave CLI | free | Needs `solana`, `solana-keygen`, and `spl-token` |
| Node.js 18+ | free | Already required by this repo |
| SOL in the mint-authority wallet | small | Covers mint rent, token accounts, and claim transaction fees |

Install the CLI from the official Anza docs:

```bash
solana --version
solana-keygen --version
spl-token --version
```

On Windows, `scripts/economy/deploy_token.mjs` also checks:

```text
%USERPROFILE%\.local\share\solana\agave-*\bin
```

## Step 1 - Create A Dedicated Mint Authority

Use a dedicated keypair. Do not export or paste your Phantom seed phrase.

```bash
solana-keygen new --outfile ~/.config/solana/cryptic-realm-mint.json
solana-keygen pubkey ~/.config/solana/cryptic-realm-mint.json
```

Fund that public key with a small amount of SOL from Phantom.

## Step 2 - Create The Token

Devnet rehearsal:

```bash
CR_NETWORK=devnet \
CR_SOLANA_KEYPAIR=~/.config/solana/cryptic-realm-mint.json \
CR_SOLANA_INITIAL_MINT=1000 \
node scripts/economy/deploy_token.mjs
```

Mainnet:

```bash
CR_NETWORK=mainnet \
CR_SOLANA_KEYPAIR=~/.config/solana/cryptic-realm-mint.json \
CR_SOLANA_INITIAL_MINT=0 \
node scripts/economy/deploy_token.mjs
```

`CR_SOLANA_INITIAL_MINT=0` is intentional for mainnet. The live supply should
come from the game claim flow unless you make an explicit economy decision to
mint a launch supply.

The script writes a local `cr-solana.env` file. It is ignored by Git.

## Step 3 - Website Integration

For Cryptic Realm realms, set the public mint in
`src/sim/realms/social_links.ts`:

```ts
tokenMintSolana: '<mint-address>',
```

Claudecraft must keep the upstream `$WOC` address.

## Step 4 - LXC Runtime Setup

Only do this when live player claim minting should be enabled.

Install the Solana / Agave CLI on the LXC and make sure the service user can run
`spl-token`. Then copy the mint-authority keypair to a secrets path with tight
permissions:

```bash
mkdir -p /opt/cryptic-realm/.secrets
chmod 700 /opt/cryptic-realm/.secrets
cp /tmp/cryptic-realm-mint.json /opt/cryptic-realm/.secrets/mint_authority.json
chmod 600 /opt/cryptic-realm/.secrets/mint_authority.json
rm /tmp/cryptic-realm-mint.json
```

Add the env block:

```bash
CR_SOLANA_RPC=https://api.mainnet-beta.solana.com
CR_SOLANA_NETWORK=solana
CR_SOLANA_MINT=<your-mint-address>
CR_SOLANA_DECIMALS=9
CR_SPL_TOKEN_CLI=/usr/local/bin/spl-token
CR_SOLANA_MINT_AUTHORITY=/opt/cryptic-realm/.secrets/mint_authority.json
```

Restart the service and verify the boot log says:

```text
ECONOMY: Solana chain enabled (solana)
```

If it says off-chain only, check the env file and `CR_SPL_TOKEN_CLI`.

## Step 5 - Test Claim Flow

1. Sign in with an account in Cryptic Realm.
2. Connect Phantom from the wallet panel and approve the SIWS signature.
3. Award a test account off-chain platinum using the admin API.
4. Click "Claim -> Wallet".
5. The server signs the mint transaction with the mint authority; Phantom should
   not ask to sign the claim transaction.
6. Verify the on-chain token balance updates.

## Rollback

Remove or comment out the `CR_SOLANA_*` env vars and restart the server. The
off-chain economy remains intact, but `/api/economy/claim` returns 503 until
chain integration is re-enabled.
