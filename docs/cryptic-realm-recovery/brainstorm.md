# Approved Vision and Audit Findings

## Vision

Cryptic Realm is a release-tracked downstream product, not a text-merge fork. ClaudeCraft stable releases supply the engine. Cryptic-specific realms, branding, product features, deployment, and content live behind explicit seams. Permanent machine-readable contracts detect semantic loss before an internal integration PR can advance.

Approved scope includes:

- Complete one-to-four-player co-op offline and online on every registered realm.
- Forest Stag, Swamp Raptor, Emerald Wyrm, and true server-authoritative flight.
- One target-neutral entitlement system, followed only after code/schema promotion by one audited DuranceTester operator action.
- Dynamic sanitized upstream contributions and a website ledger that reflects current PR state.
- World fishing plus the locked separate name Cryptic Fishing Arcade.
- Exchange Realm as the exclusive cross-realm item venue with money/item conservation.
- Original four-player racing and platform brawler games, town RTS, zombie tower defense, and safe housing recovery.
- Early shared delivery/status and offline-profile foundations, followed by historical
  bug-report/offline-persistence parity hardening and Xbox/Tauri/store distribution recovery.
- Frequent automatic release checkpoints after dedicated QA PASS, with incomplete systems disabled and post-deploy rollback.

## Current environment finding

Current production evidence points to Proxmox 192.168.0.6, LXC 171, repository /opt/cryptic-realm. Public realm health is observable there. A sanitized ENVIRONMENT-IDENTITY.md is stored in the private recovery release.

The older idyllic-games-prod /opt/eastbrook release/v0.6 instructions are unverified legacy QA/deploy inventory. The hostname cannot resolve from the current workstation and dev.worldofcryptic-realm.com has no A record. Automation must never target it until permanent environment reconciliation classifies it retired, stage, or active.

## Preservation progress already achieved

- Clean LXC 171 production checkout preserved at 46be1494c58bf25ed6ac6c89884a80d5f5fbf639.
- Complete 2,138,707,400-byte Git bundle with 385 refs copied and twice verified.
- Private recovery prerelease recovery-lxc171-20260714 completed in the private Cryptic Realm repository; unauthenticated access returns 404 and full bundle assets verify.
- Disposable mirror restore, exact live ref, git fsck, and cleanup passed.
- Logical PostgreSQL custom dump is encrypted, uploaded, pg_restore-listed, restored into a disposable qa_restore database, checked for required/nonempty tables, and cleaned up.
- Actual env, realm env, systemd, nginx, and deploy-key runtime configuration is encrypted, uploaded, and stream-restore verified.
- Recovery key is separately stored with restrictive ACL/mode 0400 and is not on GitHub.
- Tracked assets are covered by the clean worktree and no upload directories existed.
- URL credential was removed and the deploy key verified.
- Old embedded PAT revocation remains open because its identity cannot yet be safely recovered.

Phase 01 remains in progress until environment identity, token-risk decision, QA artifact lifecycle, and retention checks close.

## Historical source findings

- LXC 171 contains current production-only commits not safely represented by the old tracking ref.
- origin/live contains the first co-op backport; origin/coop-dev contains later online fixes plus known regressions requiring selective recovery.
- Couch-coop, clean-coop, Hermes/Qwen rescue, private mount, upstream mount, upstream Infernal, housing, and dirty Tauri/store sources are evidence inputs, not blind cherry-pick targets.
- LXC 180 runs Hermes services but no recoverable Git working tree was found in the audited paths.
- Claude and Hermes contributions have commit/trailer evidence. Qwen appears in rescue/port evidence. No verifiable DeepSeek attribution exists in Git history; record it as unknown, not absent.
- Existing public PRs vary from reusable to stale/oversized. Every candidate must be re-extracted against the current stable upstream release.

## Co-op definition of done

P1 through P4 each receive:

- Character create/select, controller join/reconnect/leave, auto-party, inventory, HUD, target, talents, quest state, death, and respawn.
- Movement, target, autoattack, cast, loot, quest accept/credit/turn-in.
- Chat say, yell, whisper, party; party invite; trade; duel; market browse/sell/buy.
- Stable shared camera and per-player ownership offline and online.
- Every-realm smoke and deep Infernal online controller join/reconnect, transition, camera, combat, and console coverage.

Warrior talents must render real nodes. The other eight classes show a localized per-class coming-soon placeholder. Missing trees are a tracked content follow-up, not auto-authored.

## Mount and tester decisions

- Adapt the stronger upstream all-host mount architecture; recover private content selectively.
- Forest Stag and Swamp Raptor are ground mounts. Emerald Wyrm is initially flight-capable.
- Flight includes authoritative altitude, ascent/descent, landing, bounds, terrain, ceilings, interiors, combat/no-fly rules, reconnect, and mixed-altitude co-op camera.
- Entitlement code is generic and target-neutral. Shared validation normalizes DuranceTester exactly to durancetester with Unicode normalization, trim, and case handling from the canonical server function, no fuzzy/prefix matching.
- No target IDs/data enter commits or logs.
- Code/schema first pass local and restored fixtures, dedicated QA, and code/schema checkpoint promotion.
- A later dedicated QA supplies the owner account at runtime, performs read-only exact-name
  cardinality preflight, locks an explicit row/realm allowlist, records PASS, invokes one
  idempotent action, verifies only locked rows, and revokes/stops on mismatch. Future rows are
  never implicitly granted.

## Exchange decisions

- Existing canonical integer copper-equivalent money is the only denomination. No floats, FX, or realm currencies.
- Buyer funds are reserved server-side. Successful reservation equals seller proceeds plus settlement fee plus refund remainder. Fees post only on successful settlement.
- Item provenance is immutable. Projected inventory is a non-owning view of source escrow and never a copied character inventory.
- Visitor and delivery sessions use time-bound authenticated leases with expiration and recovery.
- Exchange visitors cannot combat, quest, gain progression/XP/loot, use mail, or use ordinary local markets.
- All custody and money transitions are atomic, idempotent, auditable, reconciled, and property-tested for conservation.
- Ordinary markets remain realm-isolated.
- Online Exchange is server/DB-authoritative. Offline Exchange is a permanently local-only
  escrow ledger over versioned offline profiles; it may share the state machine/UI but never
  syncs, imports, exports, settles, or moves money/items across the online boundary.

## Original minigame decisions

- Racing includes deterministic drift, boost, terrain traction, obstacles/collisions, checkpoints/laps, recovery, bots, and seeded bounded fair items with counters and no paid advantage.
- The brawler is a platform arena game with grounded/jump/double-jump/fall/aerial/landing, platforms, ledges, vertical recovery, hitstun, damage-scaled knockback, fall zones, ring-outs, respawn, stocks/score, pickups, bots, and ties.
- New names, tracks, arenas, assets, audio, characters, and balance are original/licensed.

## Strategy decisions

- First RTS pilot is an instanced Eastbrook campaign on Cryptic Realm; Highwatch is second and stays disabled until Eastbrook passes.
- Shared open-world towns are not mutated.
- Campaign ownership is account-scoped with explicit co-op ACL.
- Layout/progress persistence is keyed by realm, town, campaign owner, version, and checkpoint.
- Town footprints/terrain come from existing content. Vanilla-WoW formulas govern analogous combat. RTS economy/timing and zombie waves live in versioned data justified by deterministic bot simulations, never unexplained literals.

## Release and QA decisions

- tmp/qa-loop/LEDGER.md and REPORT.md are mandatory active artifacts.
- One production baseline only, after environment identity.
- Every scenario records id, mode, system, accounts, steps, expected, actual, verdict, and evidence.
- Every pass/fail has evidence; browser console errors fail core flows.
- QA accounts are namespaced, rate-limited, and cleaned. Production dev commands remain off.
- Implementation phases create candidates only.
- Phase 09/10 own one shared outbound-delivery/status foundation. Phase 45 may add only
  bug-report-specific security and historical parity behavior on that foundation.
- Phase 11 owns versioned offline profiles and per-realm characters. Phase 14 persists only
  squad-transition state; Phase 46 owns historical parity/migration hardening.
- Checkpoint QA completes local/stage proof, npm run gate, malware/security checks, clean
  REPORT, immutable private Git backup, DB/runtime-config backup and restore, retention,
  rollback, and pre-promotion PASS before invoking promotion.
- Stage is mandatory: use a manifest-pinned isolated related LXC or provision an exact-artifact
  sanitized ephemeral stage with no production credentials or external side effects, dev
  cheats OFF, and verified cleanup/teardown. Failure injection is stage-only.
- Failure after deploy rolls back automatically.
- Incomplete systems remain default-off.

## OPEN discovery items

- Determine whether the old PAT can be identified/revoked without expanding secret exposure; otherwise document containment/rotation.
- Classify the legacy idyllic-games-prod profile as retired, stage, or active only when resolvable evidence exists.
- Recheck the latest stable ClaudeCraft release at every intake. Do not silently replace the v0.26.0 recovery baseline.
- Quarantine any housing external surface whose current official behavior or license cannot be verified.
