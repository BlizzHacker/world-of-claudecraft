# Cryptic Realm White Paper

Version: 0.1
Date: 2026-06-18
Token mint: `3QZvD68wupHfRwUZGnuhodB9V8o1pPAhKKJgJC2YmMMv`

## Summary

Cryptic Realm is an independent dark-fantasy browser MMO built from the
World of ClaudeCraft codebase and expanded with realm-specific identity,
customization, mini-games, cosmetics, moderation tools, and an optional Solana
utility token layer.

The goal is not to turn the game into a financial product. The goal is to make
player achievements, cosmetic ownership, account utilities, and community events
portable enough that players can keep meaningful records outside a single server
database.

## Product Pillars

- Play first: the game must remain playable without a wallet.
- Realm identity: Cryptic Realm, Infernal, Classic, Dominion, Arcane, Exchange,
  and Claudecraft can share engine improvements while keeping realm-specific
  lore, rules, visuals, and economy policy.
- Player customization: camera modes, HUD skins, realm skins, mini-games, and
  future mod-style options belong in the in-game Customization menu.
- Operations transparency: admin, moderation, auto-update, and backup systems
  should be boring, auditable, and recoverable.
- Open collaboration: general engine improvements can be proposed upstream to
  Claudcraft, while Cryptic Realm-specific content stays in the private Cryptic
  Realm repository.

## Token Utility

The Cryptic Realm SPL token is intended for:

- gameplay achievement claims,
- cosmetic and collectible ownership records,
- account-linked event rewards,
- future realm passes or item receipts where an on-chain record is useful,
- community donations and tips,
- future buy/sell/trade flows for approved game items, cosmetics, auctions, and
  creator marketplace features.

The token is not required for ordinary play. Players should be able to donate,
buy, sell, trade, and play through explicit game systems, not through vague
financial promises. The token is not a security, share, investment contract,
revenue claim, staking product, or promise of price appreciation.

## Current Deployment

- Network: Solana mainnet
- Mint: `3QZvD68wupHfRwUZGnuhodB9V8o1pPAhKKJgJC2YmMMv`
- Decimals: `9`
- Treasury wallet: `GncAXx6j38osJns395XZtf6rSA9MU3K1gwafTrHpBJpi`
- Mint authority public key: `5ADZF7Go4pbS5GY3hBAVKHFydhE3fGWZnJaQ6WcMKsoA`
- Initial supply: `0`

Supply is meant to be created through explicit game and operations decisions,
not arbitrary background minting.

## Custody And Recovery

Cryptic Realm has two critical custody layers:

- the Phantom wallet recovery phrase/private keys,
- the mint authority keypair used to control token minting.

Both must be backed up offline. Server copies are hot keys and should be treated
as operational convenience, not as the only source of truth. Long-term hardening
should move authority to a hardware wallet or multisig, then optionally revoke
mint/freeze authority after tokenomics are fixed.

See `docs/CRYPTO_CUSTODY_RUNBOOK.md` for the USB backup and control checklist.

## Roadmap

1. Stabilize the live realm deployment, mobile performance, and realm routing.
2. Complete the Customization menu as the home for camera, HUD, realm skin,
   mini-games, wallet, and future mod toggles.
3. Restore original Cryptic Realm mini-games and assets through an optimized
   asset pipeline rather than committing raw multi-GB source packs.
4. Harden backups across Slimmm, Thiccc, and the Windows workstation.
5. Split upstream-safe improvements into separate Claudcraft pull requests.
6. Publish clearer economy rules before any meaningful token supply is minted.

## Disclaimers

Cryptic Realm tokens and items are utility records for game systems and
community features. They are provided as-is. They do not guarantee value,
liquidity, profit, revenue share, governance rights, or continued service.
