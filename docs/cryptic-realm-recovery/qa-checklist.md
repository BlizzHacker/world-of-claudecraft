# Whole-Program QA and Promotion Checklist

## Environment and preservation

- [ ] Immutable profile identifies LXC 171 /opt/cryptic-realm before any current-production mutation.
- [ ] Legacy idyllic-games-prod /opt/eastbrook profile is classified or remains non-targetable.
- [ ] Permanent manifest pins a verified related-LXC stage, or records that Phase 04 must
  create an exact-artifact ephemeral stage with synthetic/sanitized QA-only data, no
  production credentials, deploy keys, webhooks, contribution/PR side effects, public
  ingress, or dev cheats, plus exact identity and teardown evidence.
- [ ] One-time production baseline captured once after identity reconciliation.
- [ ] Private Git, DB, actual runtime config, service config, assets, checksums, timestamps, retention, and independent key custody verify.
- [ ] Disposable restore reaches exact refs, required DB data, runtime config, and services without exposing secrets.
- [ ] PAT revocation/containment decision is recorded.

## QA artifacts and hygiene

- [ ] Every iteration appended to LEDGER with UTC timestamp, phase, candidate, environment, scenarios, verdict, failures, fixes/SHAs, validations, next action.
- [ ] REPORT scenario rows include id, mode, system, accounts, steps, expected, actual, verdict, evidence.
- [ ] REPORT includes baseline comparison, fixes/SHAs, prioritized follow-ups, screenshots, console results, cleanup, gates, malware verdict.
- [ ] QA users use qa_<rununix>_<n>; character names are letters-only; auth rate limit respected.
- [ ] Every QA character/account/campaign/listing/report is cleaned.
- [ ] Every pass/fail has evidence and any core-flow console error is FAIL.
- [ ] Production dev commands remain off.
- [ ] Promotable report is clean and ends `CONVERGED — all in-scope green locally on <commit>`.

## Upstream and permanent guards

- [ ] GitHub CI runs the normal QA gate for every pushed branch and the full release tier for
  every `release/**` push.
- [ ] Permanent manifest/checker/tests/runbook exist outside this packet.
- [ ] v0.26.0 baseline is reproducible and latest stable is rechecked.
- [ ] Prerelease/main never masquerades as stable.
- [ ] Quarantine/internal PR/schedule/retry/dead-letter works.
- [ ] Cryptic first-parent, upstream second-parent, and overlay seams are enforced.
- [ ] Deliberate semantic omission fails decisively.

## Full regression baseline

- [ ] Login, character creation, world entry, movement, target, autoattack, cast, loot.
- [ ] Quest accept, credit, turn-in.
- [ ] Chat say, yell, whisper, party; party invite; trade; duel.
- [ ] Market browse, sell, buy.
- [ ] Warrior talents have nodes; other eight classes show localized coming-soon placeholder.

## P1-P4 co-op

- [ ] Create/select/join/reconnect/leave and controller ownership offline/online.
- [ ] Auto-party, per-player inventory/HUD/target/talent/quest state.
- [ ] Full regression/social/economy baseline for one, two, three, four players.
- [ ] Every realm smoke; full Infernal online controller/camera/transition/death/combat/reconnect.
- [ ] Interest union is bounded and never loses local members.

## Cross-feature co-op

- [ ] P1-P4 mounts/flight offline/online, including mixed-altitude camera.
- [ ] P1-P4 world fishing and arcade isolation offline/online.
- [ ] P1-P4 online server-authoritative Exchange and offline local-only Exchange, ordinary
  markets, conservation, reload/reconnect, and decisive no-cross-boundary behavior.
- [ ] P1-P4 Vale Cup, exact default-off `gauntlet_reference_session`, racing, brawler, RTS,
  zombie defense, and housing offline and online.
- [ ] Reconnect/death/realm transition/console/screenshot evidence for each.

## Mounts and tester action

- [ ] Three mounts ride/persist/render across hosts.
- [ ] Emerald Wyrm flight constraints and invalid recovery pass.
- [ ] Target-neutral entitlement schema/operator code passes local/restored fixtures.
- [ ] Code/schema checkpoint promoted and healthy before target resolution.
- [ ] Exact DuranceTester normalization is durancetester, no fuzzy match.
- [ ] Dedicated QA PASS precedes one idempotent production operator action.
- [ ] Forest Stag, Swamp Raptor, and Emerald Wyrm are free under the grant; authenticated
  read-only preflight cardinality exactly matches an explicit runtime row/realm allowlist,
  only locked rows verify, future rows are not implicit, and no target data is committed/logged.

## Exchange

- [ ] Integer copper denomination, no floats/FX.
- [ ] Buyer reservation equals seller proceeds plus successful fee plus refund remainder.
- [ ] Item/money supply conserves under success/cancel/expire/crash/retry/concurrency.
- [ ] Projected inventory is non-owning escrow view.
- [ ] Every registered source/destination realm has an explicit tested eligibility/compatibility result.
- [ ] Visitor/delivery leases expire/recover.
- [ ] Combat, quests, mail, progression, XP/loot, and ordinary local markets disabled.
- [ ] Realm-local market isolation remains green.
- [ ] Offline Exchange state persists only in versioned offline profiles and cannot sync,
  import, export, list, settle, deliver, or move identities/money/items online.

## Minigames and strategy

- [ ] Racing drift, boost, terrain, obstacles, fair seeded/counterable items, bots, checkpoints, recovery.
- [ ] Brawler jump/aerial/platforms/ledges/recovery/hitstun/knockback scaling/fall zones/ring-outs/stocks/bots.
- [ ] Eastbrook instanced campaign passes before Highwatch.
- [ ] RTS ACL/persistence/pathing/balance-source/load passes.
- [ ] Zombie waves/towers/upgrades/rewards/restart/load passes.
- [ ] Original/license provenance and asset/performance budgets pass.

## Housing and recovered live features

- [ ] Every housing slice/asset disposition; unsafe external paths quarantined.
- [ ] Approved housing auth/privacy/moderation/deletion/persistence/P1-P4 passes.
- [ ] F-024 uses the Phase 09/10 shared delivery/status foundation; bug-report-specific
  auth/rate/privacy/sanitization/parity passes with no duplicate queue or status pipeline.
- [ ] F-025 consumes Phase 11/14 offline-profile/transition ownership; migrations,
  isolation, P1-P4 flows, and exact `6564b2bca90d5b0979994e6e76e27743a3aab2c1` duplicate-realm-entry regression pass.
- [ ] F-026 Tauri/store/Xbox identity/version/config/capability/artifact tests pass.
- [ ] Cargo/Tauri/Xbox build and native attestation gates pass without signing-secret
  exposure; Phase 04 LXC promotion, signed-artifact verification, and externally authorized
  store publication have separate identities, authority, verdicts, and receipts.

## Checkpoint promotion ordering

- [ ] Implementation produced immutable candidate only.
- [ ] QA completed npm run gate, npm run security:gate, malware review, schema/wire canary,
  manifest, immutable private Git backup, DB/runtime-config backup and restore, retention,
  isolated stage smoke, screenshots/console, cleanup/teardown, and clean REPORT.
- [ ] Stage identity matches the manifest and exact candidate artifact; sanitized QA data,
  blocked external side effects, dev cheats OFF, and existing-stage reset or ephemeral-stage
  teardown are independently verified before production mutation.
- [ ] Pre-promotion PASS is bound to commit/artifact/report/environment/rollback ref.
- [ ] Promotion invoked only after PASS.
- [ ] Every production realm verifies expected HEAD/build/API/critical smoke.
- [ ] A forced stage-only deployment failure restores the entire checkpoint ring and proves
  health recovery; production is observation-only and rolls back automatically on naturally
  detected failure. Mixed versions are rejected.
- [ ] Incomplete systems remain disabled.

## Final packet

- [ ] All 48 implementation and QA rows complete.
- [ ] Durable follow-ups live outside packet.
- [ ] Final QA offers deletion of only docs/cryptic-realm-recovery.
