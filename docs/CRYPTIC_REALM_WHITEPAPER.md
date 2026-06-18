# Cryptic Realm White Paper

Version: 0.2
Date: 2026-06-18
Token mint: `3QZvD68wupHfRwUZGnuhodB9V8o1pPAhKKJgJC2YmMMv`

## Summary

Cryptic Realm is an independent dark-fantasy browser MMO built from the
World of ClaudeCraft codebase and expanded with realm-specific identity,
customization, mini-games, cosmetics, moderation tools, and an optional Solana
utility token layer built around in-game platinum.

The goal is not to turn the game into a financial product. The goal is to make
player achievements, cosmetic ownership, account utilities, and community events
portable enough that players can keep meaningful records outside a single server
database.

## Product Pillars

- Free play first: the game must remain playable without a wallet, seed phrase,
  token balance, or purchase.
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

## $CR And Platinum Utility

$CR is intended as an optional game utility token for:

- gameplay achievement claims,
- cosmetic and collectible ownership records,
- account-linked event rewards,
- ownership or staking checks that unlock premium utility,
- platinum earning eligibility,
- future realm passes or item receipts where an on-chain record is useful,
- community donations and tips,
- future buy/sell/trade flows for approved game items, cosmetics, auctions, and
  creator marketplace features.

The token is not required for ordinary play. Players who hold or later stake an
approved amount of $CR may receive privileges such as platinum earning
eligibility, premium event access, cosmetic claim windows, housing or mount
claim access, and marketplace listing tools. Players without $CR can still play
the game normally.

Platinum is the in-game premium bridge currency. It can be used for limited
cosmetics, houses, mounts, creator marketplace items, and Exchange realm trades.
A future marketplace may allow approved platinum-denominated listings to clear
in $CR once the fraud controls, tax/accounting posture, and legal review are
ready.

Wager, casino, or gambling-style systems are not live and should not ship
without legal, payment, age-gating, and platform review. The token is not a
security, share, investment contract, revenue claim, staking product with
promised returns, or promise of price appreciation.

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

The detailed custody runbook is admin-only/private operational material. Public
pages should prove the token exists, but they should not publish operational
backup procedures or invite players to send private material anywhere.

## Roadmap

1. Stabilize the live realm deployment, mobile performance, and realm routing.
2. Complete the Customization menu as the home for camera, HUD, realm skin,
   mini-games, wallet, and future mod toggles.
3. Restore original Cryptic Realm mini-games and assets through an optimized
   asset pipeline rather than committing raw multi-GB source packs.
4. Harden admin-only custody backups across offline USB media and trusted hosts.
5. Split upstream-safe improvements into separate Claudcraft pull requests.
6. Publish clear economy rules before any meaningful $CR supply is minted or
   distributed.

## Disclaimers

Cryptic Realm tokens and items are utility records for game systems and
community features. $CR is not an investment promise. They are provided as-is.
They do not guarantee value, liquidity, profit, revenue share, governance
rights, or continued service.
