# Permanent Feature and Source Inventory

This planning copy defines what Phase 02 must encode permanently in config/cryptic-recovery/features.json, scripts/admin/check_recovery_manifest.mjs, tests/recovery_manifest.test.ts, and docs/operations/cryptic-recovery-runbook.md. Those files survive packet teardown.

## Source and evidence table

| Source | Audited evidence | Recovery rule |
|---|---|---|
| Current production | Proxmox 192.168.0.6, LXC 171, /opt/cryptic-realm, captured HEAD `46be1494c58bf25ed6ac6c89884a80d5f5fbf639` in the verified recovery bundle/release, public realm endpoints healthy | Immutable environment profile; never relabel a moved local/remote branch as the captured source, and reconcile before mutation |
| Live-only co-op sequence | 0e516c09c camera/join queue, f69c0c49c camera exclusion, 46be1494c server regroup, plus adjacent live-only commits under the preserved HEAD | Recover behavior with exact regression tests, never cherry-pick the sequence blindly |
| Live-only product sequence | 2ca141929 bug reports, b4a1f594 offline realm selection, 854615ab per-realm offline characters, and exact live fix `6564b2bca90d5b0979994e6e76e27743a3aab2c1` for the duplicate-realm-entry regression | Consume the shared Phase 09/10 delivery service and Phase 11/14 persistence foundation; recover only missing hardening/parity deltas |
| Legacy QA/deploy | idyllic-games-prod, /opt/eastbrook, release/v0.6, dev.worldofcryptic-realm.com | Currently unresolved/unverified; never auto-target until classified |
| Required isolated stage | No safe stage is yet evidenced; Phase 02 must inventory every related LXC read-only | Pin a stage only with exact storage/network/credential/side-effect isolation evidence; otherwise record `ephemeral_required` for Phase 04 exact-artifact provisioning and teardown |
| Private recovery release | recovery-lxc171-20260714, private repository, unauthenticated 404, verified bundle/config/DB assets | Primary remote recovery artifact plus independent local/host copies |
| Workstation live | Audited local branch and unrelated dirty Tauri/store work | Preserve user changes; never use dirty checkout as merge base |
| origin/live | c40eb59af first co-op backport line | Selective behavior/test recovery |
| origin/coop-dev | 54d2caee9 later online-co-op fixes | Recover with exact regressions, never deploy tip blindly |
| origin/feat/couch-coop | 3a0ef5e88 | Compare domain/test intent |
| BlizzHacker clean co-op | da291f4dd | Sanitized-source comparison |
| Upstream co-op PR | PR 1929 | Dormant/additive modules; not end-to-end wiring |
| LXC rescue | origin/lxc-rescue 4a0c12142 | Hermes/Qwen snapshot evidence |
| LXC 180 | hermes-server services; no Git working tree found in audited paths | Inventory service evidence; no invented source recovery |
| Private mounts | 343909a2f, PR 1786 | Recover three content definitions selectively |
| Upstream mounts | 7fd28e471 audited tip | Preferred all-host ground-mount architecture |
| Upstream Infernal | 8703717ed audited feature ref | Compare realm behavior/overlaps |
| Gauntlet reference | `upstream/feature/gauntlet-event` at `196487c8688825d6831278191d3160e622142ec5` | Recover only the default-off `gauntlet_reference_session` adapter/scenario needed to prove the shared minigame lifecycle; never merge the branch wholesale |
| Upstream release baseline | upstream/release/v0.26.0 at d8a871763 during audit | Reproducible recovery baseline; re-resolve exact ref at execution |
| Upstream main | ade7d21c9 during audit | Not the release intake target |
| Housing history | Exact `housing-live` ref at `505142a51f32550f0c6c0d917c4f22e61b51efe9` plus its reachable history and assets | Exhaustively classify every slice/asset; quarantine pending security/license audit and never recover the ref wholesale |
| Contributions | PRs 1929, 1786, 1530, 1516, 1097, 1095, 1056, 627, 626 plus closed/unmerged stale page entries | Reconcile current API state; re-extract small release-based drafts |
| Tauri/store | Modified Cargo/config plus new store/MSIX files/tests | Preserve and three-way reconcile; run explicit native/store gates |

## AI provenance

| Label | Evidence policy |
|---|---|
| Claude | Author/co-author/trailer evidence exists across commits; attribute exact commits only |
| Hermes | Co-author and PR/body evidence plus LXC/rescue work exists |
| Qwen | Rescue/port descriptions provide limited evidence; attribute only those artifacts |
| DeepSeek | No verifiable Git metadata found; record unknown, never claim absence or authorship |
| Codex | Attribute only commits/trailers/session artifacts that explicitly identify Codex |
| root/badkid/other authors | Do not infer AI identity from username |

## Feature contracts

| ID | Feature | Permanent executable contract | Disposition |
|---|---|---|---|
| F-001 | Environment identity | Exact production and stage host/container/repo/ref/service/realm/origin match before mutation; fail closed to isolated ephemeral stage when none is proven | Private ops |
| F-002 | Recurring upstream intake | Latest stable discovery, v0.26 baseline, quarantine, first-parent merge, semantic audit, internal PR | Private ops |
| F-003 | Realm overlays | Every registered realm builds/reports identity and retains intended private overlay | Private product |
| F-004 | Offline P1-P4 co-op | Full gameplay/social/economy/talent/per-player-state matrix | Upstream candidate core |
| F-005 | Online local squads | Authenticated union interest, controller routing, reconnect, bandwidth | Upstream candidate core |
| F-006 | Infernal co-op | Online controller join/reconnect plus hazard/transition/camera matrix | Private realm plus generic fixes |
| F-007 | Mount core | IWorld/Sim/ClientWorld/server/headless/persistence/input/render parity | Upstream candidate core |
| F-008 | Three mounts | Forest Stag, Swamp Raptor, Emerald Wyrm registrations/assets/provenance | Private content |
| F-009 | True flight | Authoritative vertical movement/constraints/camera/headless parity | Generic candidate plus private content |
| F-010 | Tester entitlement | Target-neutral schema/operator, exact durancetester normalization, post-code-promotion action | Private ops |
| F-011 | World fishing | In-world deterministic cast/bobber/bite/reel/reward flow | Upstream candidate core |
| F-012 | Cryptic Fishing Arcade | Locked name, arcade navigation, no world economy authority | Private content |
| F-013 | Realm-local markets | No cross-realm bypass | Core invariant |
| F-014 | Exchange policy | Copper integer conservation, leases, projected inventory, disabled gameplay | Private product |
| F-015 | Exchange custody | Atomic item/money escrow/provenance/recovery/audit | Generic candidate possible |
| F-016 | Minigame platform | Deterministic lifecycle/roster/bots/reconnect/reward/wire | Upstream candidate core |
| F-017 | Vale Cup | No regression in existing behavior/E2E | Existing core |
| F-018 | Racing | Drift/boost/terrain/obstacles/fair items/bots/P1-P4 | Private original game |
| F-019 | Brawler | Jump/aerial/platforms/ledges/recovery/hitstun/knockback/ring-outs/P1-P4 | Private original game |
| F-020 | Town RTS | Eastbrook then Highwatch instanced campaigns, ACL/persistence/sourced balance | Private feature |
| F-021 | Zombie defense | Seeded waves/towers/upgrades/rewards/P1-P4/load | Private feature |
| F-022 | Housing | Only audited safe ownership/build/visit/moderation/delete slices | Private feature |
| F-023 | Contribution automation | Trigger/sanitize/draft/state/retry/dead-letter/current website ledger | Public process |
| F-024 | Bug reporting | Phase 09/10 shared delivery/status foundation plus bug-specific auth/rate/privacy/sanitized GitHub adapter and parity hardening | Private product |
| F-025 | Offline realm persistence | Phase 11 versioned per-realm profile foundation, Phase 14 squad transition state, and Phase 46 parity/migration hardening | Private product |
| F-026 | Xbox/Tauri/store | User-change preservation, identity/version/config/artifact/native gates, separate LXC promotion and externally authorized store publication | Private distribution |
| F-027 | Promotion checkpoints | QA PASS before mutation, gate/malware/report, immutable private Git and DB/runtime-config restore, retention, isolated stage/canary, rollback | Private ops |

## Required manifest fields

Each source and feature records stable ID, owner, exact refs, environment/realm scope, first-parent topology, overlay seam, host entrypoints, persistence owner, IWorld/events/wire/endpoints/DDL/i18n/assets/config, feature flag/default, unit/parity/E2E/mobile/security/performance tests, upstream/private disposition, checkpoint, recovery commit, timestamps, and validation evidence.

The Phase 02 source ledger is exhaustive rather than curated. It deterministically inventories every namespace returned by unfiltered `git for-each-ref` (including heads, remote-tracking refs, tags, stash, replace, notes, pull refs, and Codex/session captures), every currently advertised remote ref, and every preserved-bundle ref; then it enumerates every Cryptic-unique/offline commit relative to the upstream ref universe. Each commit records full SHA, parents, source refs, stable per-parent patch ID (or explicit empty/merge marker), upstream equivalence, owner, evidence, and exactly one disposition: `recovered`, `superseded`, `rejected`, or `dead-letter`. Every current registry, IWorld/API surface, SimEvent/wire field/command, REST/admin route, inline DDL/persisted schema, i18n/matcher, asset/config/job, and decisive test is also inventoried with the same disposition, owner, and evidence requirements. Any unclassified or undiscovered row fails the permanent checker.

## Semantic rules

- File presence is never proof; behavior has decisive negative tests.
- Removal of a registry, route, endpoint, command, schema, wire field, key, asset, test, environment profile, or QA scenario fails the manifest checker.
- Generated output is regenerated, not used as recovery evidence.
- Superseded code names its replacement and tests.
- Private overlays cannot leak credentials, private policy, lore, branding, or data into sanitized PRs.
- Packet teardown cannot remove the permanent guards.
