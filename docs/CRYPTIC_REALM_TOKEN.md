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
Claudecraft realm keeps the upstream `$WOC` address.
