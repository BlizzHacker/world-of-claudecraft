# Progress

Statuses: pending, in progress, blocked, complete. Use UTC ISO-8601 timestamps.

## Implementation checkpoint — 2026-07-15

The recovery branch contains a verified implementation slice, but this is not a
release checkpoint and production has not been mutated:

- Co-op: the full `origin/coop-dev` intake is present, including offline shared
  input, same-account online sessions, server-side regrouping, connection timing,
  keyboard joins, controller settings, and slot reassignment (`5bb7858f3` through
  `f990c15dc`). Focused co-op coverage: 50 tests green.
- Mounts and flight: all three mount bridles are granted idempotently to the
  server-recognized DuranceTester Infernal character; Emerald Wyrm flight now
  moves authoritatively with ascent, descent, collision bypass, and terrain-safe
  landing (`e68850dda`, `b2449c6dd`).
- Exchange: pure custody transitions plus Postgres escrow, provenance, atomic
  cross-realm settlement, cancellation recovery, and append-only audit events are
  wired at `/api/exchange/*` (`01453d620`, `42b29c373`).
- Contributions: `/api/contributions` and the public ledger page now read a
  cached upstream PR feed, with static receipts as an offline fallback
  (`86400a655`).
- Delivery control: pushes to `codex/cryptic-recovery-program` now run the
  production verification gate and queue an automatic restricted deploy; route
  inventory and options-window regressions are covered (`1627c2a77`,
  `3cddc7fa5`). Exchange listing creation also accepts a bounded idempotency key
  and returns the original escrow on safe retries (`1d8e9161a`).
- Verification: `npm run build` and `npm run build:server` pass; focused feature
  suites pass. The repository-wide `npm test` attempt exceeded ten minutes and
  timed out without a failure report. GitHub CI is still running the PR and full
  production verification tiers, so the branch remains non-promotable until
  those jobs complete and a full QA report is captured.
- Production identity was read-only verified as Proxmox `192.168.0.6`, LXC 171,
  checkout `codex/cryptic-v016-catchup` at `46be1494c`; no deploy or database
  migration was run. The host upstream-sync timer remains fail-closed on its
  recorded 119-file merge conflict. The previously working SSH key is currently
  rejected by `192.168.0.6`, and no self-hosted `cryptic-prod` runner is
  registered, so automatic deployment is queued but not executable yet.

## Latest delivery checkpoint, 2026-07-15

The recovery branch is pushed at `dc688104d` and contains the completed implementation
slice listed above. Focused recovery coverage is green (8 files, 69 tests), and the local
malware gate is green. GitHub CI run `29391133839` passed the full test, typecheck, headless,
server, and client build gates. Production verification run `29391133874` passed its verify
job. The local full gate is not a clean candidate signal because the workstation has
unrelated Tauri Store edits, CRLF Codex skill files, and stale options-window source guards.

Production has not been changed. Automatic deployment is configured on every push, but the
restricted deploy job cannot execute until a `cryptic-prod` self-hosted runner is registered
and SSH access to `192.168.0.6` is restored. The live host remains at `codex/cryptic-v016-catchup`
(`46be1494c`).

The following requested systems remain explicitly open development slices: Exchange player
UX, original racing, four-player brawler, town RTS, zombie defense, and housing recovery.

## Live deployment and character-sheet checkpoint — 2026-07-15

- SSH access is restored through `root@192.168.0.6` (backup host `192.168.0.5` also
  responds). The restricted deployment wrapper promoted `403def38766cd151d877ea7546348b526beb7ad1`
  to LXC 171 `/opt/cryptic-realm` on `codex/cryptic-recovery-program`; the wrapper's
  private rollback branch is `pre-auto-20260715T061251Z-codex-cryptic-recovery-program`.
- All realm services restarted successfully and the Cryptic Realm and Infernal status
  endpoints report `ok: true`. The production-only `env.d/crypticrealm.env` override was
  preserved; generated realm env files are now ignored by the deploy branch so future
  guarded pushes do not trip the dirty-worktree check.
- A private custom Postgres dump was captured before the live QA mutation at
  `/root/crypticrealm-pre-durance-20260715T062916Z.dump` (SHA-256
  `21c7b2c6df099a9588310ee23e30a00a77f8a0af206c799b20f1c9e76a390789`). Infernal
  character 147 (`DuranceTester`) now has all three Cryptic mount bridles in its
  persisted inventory. The grant was re-run to verify idempotency; no duplicates were
  added.
- The character sheet now supports a lazy 3D item viewer for selected paperdoll pieces.
  It reuses the existing turntable/GLB cache, routes canonical weapon variants through
  the held-weapon catalog, accepts optional authored `ItemDef.modelUrl` entries for future
  Monster Chronicle gear, and keeps all other item models unloaded until selected.
  Focused character/item tests and `npm run build`/`npm run build:server` pass locally.
- Follow-up lint/format cleanup is pushed and deployed at
  `3e29e17368b000d7e2871e6dad7aefbd27e778d9`; the remote changed-file gate is green and
  its full PR gate is still running at report time.

The remaining systems above are still open development, not silently treated as complete.

## Status table

| Session | Status | Date started | Date completed | Implementation or QA commit |
|---|---|---|---|---|
| Phase 01 | in progress | 2026-07-14 |  |  |
| Phase 01 QA | pending |  |  |  |
| Phase 02 | pending |  |  |  |
| Phase 02 QA | pending |  |  |  |
| Phase 03 | pending |  |  |  |
| Phase 03 QA | pending |  |  |  |
| Phase 04 | pending |  |  |  |
| Phase 04 QA | pending |  |  |  |
| Phase 05 | pending |  |  |  |
| Phase 05 QA | pending |  |  |  |
| Phase 06 | pending |  |  |  |
| Phase 06 QA | pending |  |  |  |
| Phase 07 | pending |  |  |  |
| Phase 07 QA | pending |  |  |  |
| Phase 08 | pending |  |  |  |
| Phase 08 QA | pending |  |  |  |
| Phase 09 | pending |  |  |  |
| Phase 09 QA | pending |  |  |  |
| Phase 10 | pending |  |  |  |
| Phase 10 QA | pending |  |  |  |
| Phase 11 | pending |  |  |  |
| Phase 11 QA | pending |  |  |  |
| Phase 12 | pending |  |  |  |
| Phase 12 QA | pending |  |  |  |
| Phase 13 | pending |  |  |  |
| Phase 13 QA | pending |  |  |  |
| Phase 14 | pending |  |  |  |
| Phase 14 QA | pending |  |  |  |
| Phase 15 | pending |  |  |  |
| Phase 15 QA | pending |  |  |  |
| Phase 16 | pending |  |  |  |
| Phase 16 QA | pending |  |  |  |
| Phase 17 | pending |  |  |  |
| Phase 17 QA | pending |  |  |  |
| Phase 18 | pending |  |  |  |
| Phase 18 QA | pending |  |  |  |
| Phase 19 | pending |  |  |  |
| Phase 19 QA | pending |  |  |  |
| Phase 20 | pending |  |  |  |
| Phase 20 QA | pending |  |  |  |
| Phase 21 | pending |  |  |  |
| Phase 21 QA | pending |  |  |  |
| Phase 22 | pending |  |  |  |
| Phase 22 QA | pending |  |  |  |
| Phase 23 | pending |  |  |  |
| Phase 23 QA | pending |  |  |  |
| Phase 24 | pending |  |  |  |
| Phase 24 QA | pending |  |  |  |
| Phase 25 | pending |  |  |  |
| Phase 25 QA | pending |  |  |  |
| Phase 26 | pending |  |  |  |
| Phase 26 QA | pending |  |  |  |
| Phase 27 | pending |  |  |  |
| Phase 27 QA | pending |  |  |  |
| Phase 28 | pending |  |  |  |
| Phase 28 QA | pending |  |  |  |
| Phase 29 | pending |  |  |  |
| Phase 29 QA | pending |  |  |  |
| Phase 30 | pending |  |  |  |
| Phase 30 QA | pending |  |  |  |
| Phase 31 | pending |  |  |  |
| Phase 31 QA | pending |  |  |  |
| Phase 32 | pending |  |  |  |
| Phase 32 QA | pending |  |  |  |
| Phase 33 | pending |  |  |  |
| Phase 33 QA | pending |  |  |  |
| Phase 34 | pending |  |  |  |
| Phase 34 QA | pending |  |  |  |
| Phase 35 | pending |  |  |  |
| Phase 35 QA | pending |  |  |  |
| Phase 36 | pending |  |  |  |
| Phase 36 QA | pending |  |  |  |
| Phase 37 | pending |  |  |  |
| Phase 37 QA | pending |  |  |  |
| Phase 38 | pending |  |  |  |
| Phase 38 QA | pending |  |  |  |
| Phase 39 | pending |  |  |  |
| Phase 39 QA | pending |  |  |  |
| Phase 40 | pending |  |  |  |
| Phase 40 QA | pending |  |  |  |
| Phase 41 | pending |  |  |  |
| Phase 41 QA | pending |  |  |  |
| Phase 42 | pending |  |  |  |
| Phase 42 QA | pending |  |  |  |
| Phase 43 | pending |  |  |  |
| Phase 43 QA | pending |  |  |  |
| Phase 44 | pending |  |  |  |
| Phase 44 QA | pending |  |  |  |
| Phase 45 | pending |  |  |  |
| Phase 45 QA | pending |  |  |  |
| Phase 46 | pending |  |  |  |
| Phase 46 QA | pending |  |  |  |
| Phase 47 | pending |  |  |  |
| Phase 47 QA | pending |  |  |  |
| Phase 48 | pending |  |  |  |
| Phase 48 QA | pending |  |  |  |

## Phase deliverables

### Phase 01: Close Production Preservation and Identity

- [ ] Verify and inventory the completed private release, Git bundle, PostgreSQL dump, encrypted runtime-config archive, separately held recovery key, restore rehearsals, and clean tracked-asset coverage.
- [ ] Reconcile LXC 171 at /opt/cryptic-realm with the legacy idyllic-games-prod
  /opt/eastbrook release/v0.6 profile, prepare the exact confirmed target and prove no
  duplicate baseline; independent Phase 01 QA alone captures the one permitted baseline.
- [ ] Resolve or formally contain the unrecoverable embedded PAT revocation risk, verify deploy-key least privilege, set private backup retention/checksum/timestamp policy, and record independent key custody.
- [ ] Create or normalize tmp/qa-loop/LEDGER.md and REPORT.md, record preservation evidence,
  and prepare the Phase 01 QA handoff without issuing its verdict.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:
  - Captured the clean production LXC 171 checkout at 46be1494c58bf25ed6ac6c89884a80d5f5fbf639, 38 commits ahead of its tracking ref.
  - Created and twice verified a complete 2,138,707,400-byte Git bundle containing 385 refs. Copies exist on the LXC, Proxmox host, and workstation.
  - Published the private recovery prerelease at https://github.com/BlizzHacker/cryptic-realm/releases/tag/recovery-lxc171-20260714. Private-repository status, unauthenticated 404, and every asset digest were verified. The release remains mutable and its tag is a carrier rather than captured production HEAD.
  - Disposable mirror restore, exact live ref, git fsck, and cleanup passed.
  - Logical PostgreSQL custom dump is complete, encrypted, uploaded, and passed pg_restore list, disposable qa_restore database, required-table/nonempty checks, and cleanup.
  - Actual env, realm env, systemd, nginx, and deploy-key runtime configuration is encrypted, stream-restore verified, and uploaded.
  - The recovery-key export has a restrictive ACL and was never uploaded to GitHub, but it lacks passphrase/S2K protection and is co-resident with encrypted workstation archives. Independent offline/hardware-backed or vault custody is still blocking.
  - The production worktree was clean, so tracked assets are covered; no uploads directories existed.
  - URL-embedded GitHub credential material was removed. The LXC Git identity was converted to a verified read-only deploy key and backup publication separated from runtime access.
  - A direct archival-branch push correctly stopped on 15 existing TypeScript/copy-policy failures. The verified private recovery prerelease was used for preservation instead and is not a green promotion candidate.
  - Account-side old PAT revocation remains open and blocks promotion because its identity is not safely recoverable.
  - Gitleaks 8.30.1 scanned all refs/full history with 100% redaction: 42 findings across 19 commits, triaged to 0 live/possibly-live secrets, 0 historical credentials needing rotation, 4 fixtures, 14 benign content primaries, and 24 duplicates. Fresh public patches still require their own narrow scan. Two email/service-like identifiers and one long external account identifier were redacted from historic ignored QA evidence; final sharing-scope review remains.
  - Current production evidence is Proxmox 192.168.0.6 LXC 171 /opt/cryptic-realm. The legacy idyllic-games-prod /opt/eastbrook profile is unresolved and unverified, and must never be auto-targeted.
  - A sanitized ENVIRONMENT-IDENTITY.md is included in the private recovery release.
  - `npm run security:gate` passed across 4,679 files with zero unapproved high-severity findings.
  - Phase 01 privacy/security verdict is BLOCKED. PAT revocation, independently protected key custody, release immutability/integrity control, history triage, final QA-evidence sharing review, and retention must close before Phase 01 completes. Least-privilege production Git access is now resolved.

### Phase 02: Create Permanent Recovery Guards and Runbook

- [ ] Create config/cryptic-recovery/features.json with environment profiles, exhaustive
  source/ref dispositions, first-parent policy, overlay seams, feature flags, test contracts,
  checkpoint groups, and current disposition; manifest a verified related-LXC stage or an
  explicit `ephemeral_required` stage disposition.
- [ ] Create scripts/admin/check_recovery_manifest.mjs and tests/recovery_manifest.test.ts with deterministic schema, ref, semantic omission, environment mismatch, and negative tests.
- [ ] Create docs/operations/cryptic-recovery-runbook.md covering identity reconciliation,
  one-time baseline, quarantine integration, QA artifacts, private Git/DB/runtime-config
  backup and restore, isolated stage selection/provisioning/teardown, checkpoint promotion,
  rollback, and incident recovery.
- [ ] Classify every audited source and AI-evidence claim, including live/coop/mount/infernal/PR refs, LXC 180, and unverifiable DeepSeek provenance, without deleting history.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 03: Automate Recurring Upstream Release Intake

- [ ] Implement latest-stable release discovery with v0.26.0 pinned as the recovery baseline,
  a daily 06:00 UTC schedule plus manual trigger, and a fresh stable-release recheck on every
  run; enforce a single-flight lock, two-hour timeout, stale-lock recovery, bounded retries,
  and a 24-hour owner alert/dead-letter.
- [ ] Create a detached quarantine worktree and candidate ref, run the permanent manifest plus overlap/semantic audits, and write a machine-readable intake report.
- [ ] Prepare a compatibility-line candidate whose stable recovery base is separate from the
  upstream contribution target; Phase 07 alone creates the true merge with the prepared
  compatibility-line tip as parent one and exact current-cycle stable release as parent two.
- [ ] Open or update one internal PR with candidate state, retries, timestamps, dead-letter
  reason, upstream-policy-derived public target, and no automatic live merge/push.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 04: Build QA-Gated Promotion and Rollback Control Plane

- [ ] Implement immutable states for candidate, gated, backed-up, restored, staged, soaked, QA_PASS, promoting, verified, rolled_back, and failed, with locks and timestamps.
- [ ] Require environment-profile reconciliation, npm run gate, npm run security:gate,
  malware-audit verdict, clean REPORT, immutable private Git ref or verified private bundle,
  verified rollback ref, DB/runtime-config backup and restore, retention, schema/wire canary,
  and isolated stage smoke before QA_PASS is issuable. Use only a manifest-pinned verified
  related-LXC stage, or provision an exact-artifact isolated ephemeral stage with
  synthetic/sanitized QA-only data, no production credentials or external side effects,
  dev cheats OFF, and verified cleanup/teardown; halt on any stage failure and never inject
  failures into production.
- [ ] Promote only after the QA session records pre-promotion PASS, then verify
  HEAD/build/realm/API/smokes and automatically roll back on any post-deploy failure.
- [ ] Keep incomplete systems disabled by server-controlled default-off feature flags; enable only the coherent slice approved by its checkpoint QA.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 05: Integrate Upstream Domain and Overlay Seams

- [ ] Pin the exact current-cycle upstream release: v0.26.0 for the first recovery cycle,
  then each later stable cycle only after prior-cycle QA.
- [ ] Create an isolated candidate from the verified Cryptic release, record the intended
  upstream second parent, and leave no MERGE_HEAD/unresolved index across phases.
- [ ] Reconcile deterministic sim/domain overlaps while keeping private realm rules in src/sim/realms, private presentation in src/ui/cryptic, and configuration/branding behind registries.
- [ ] Update permanent feature contracts for every superseded or preserved domain behavior.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 06: Integrate Upstream Wire and Schema Compatibility

- [ ] Port and reconcile pinned current-cycle server/net protocol changes with explicit wire
  versioning and old-client/new-server plus new-client/old-server canary behavior.
- [ ] Reconcile inline DDL and JSONB serializers additively with old-save round trips, indexes, and boot idempotency.
- [ ] Define all-or-nothing application rollback compatibility for forward-created data without destructive down-migration.
- [ ] Update permanent endpoint, wire, schema, and migration contracts.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 07: Integrate Upstream Client, Content, and Generated Outputs

- [ ] Reconcile pinned current-cycle client/render/input/content changes through IWorld only
  and retain Cryptic UI modules behind explicit seams.
- [ ] Reconcile every-locale keys and matcher rules, regenerate owned output, and reject broad generated-file cherry-picks.
- [ ] Restore asset registrations with provenance/budget checks and headless parity where behavior is visible to agents.
- [ ] Create the final true merge with the prepared Cryptic compatibility line as parent one
  and exact pinned current-cycle upstream release as parent two, then run the permanent
  manifest against all integrated surfaces.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 08: Automate Sanitized Contribution Extraction

- [ ] Trigger extraction on internal merge, feature marked upstream-candidate, manual retry, and scheduled backlog sweep.
- [ ] Generate a minimal patch against the current upstream stable release, split mixed changes, reject private overlays/generated churn, and run upstream-compatible tests.
- [ ] Sanitize commit messages, authorship metadata, trailers, branch names, issue links, paths, hostnames, account data, secrets, branding, lore, and private schema.
- [ ] Create or update one draft candidate idempotently with source-to-public mapping and no automatic ready/merge action.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 09: Build Shared Outbound Delivery and Contribution State Foundation

- [ ] Implement one persisted outbound-delivery record/adapter lifecycle with source mapping,
  timestamps, attempt history, idempotency, dispatch lease, terminal outcome, and contribution
  states from discovery through merge, closure, or dead-letter.
- [ ] Implement one bounded atomic dispatcher with retry/backoff, lease recovery, redacted
  failure codes, dead-letter, and signed manual reconciliation for every adapter.
- [ ] Use signed contribution webhooks plus bounded polling with pagination, rate limits,
  idempotency, stale-state detection, and accurate BlizzHacker PR reconciliation.
- [ ] Cache only allowlisted public contribution metadata; keep credentials and private
  delivery payloads out of public/operator projections until Phase 10 policy allows them.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 10: Complete Shared Delivery Status, Contribution Website, and Foundation Checkpoint

- [ ] Implement separate allowlisted public and authenticated operator status projections
  from the Phase 09 ledger, with private-by-default payloads, explicit consent for any future
  report visibility, timestamps, staleness, and redacted failures.
- [ ] Replace the static contribution list with accessible server-fed current state, filters,
  timestamps, links, and dated fallback; add localization, mobile, cache/outage,
  authorization, sanitizer, and no-secret tests plus reconciliation screenshots.
- [ ] Prepare a foundation checkpoint candidate with only completed upstream/control-plane/contribution flags enabled and all incomplete gameplay systems disabled.
- [ ] Prepare an immutable checkpoint candidate and evidence for the separate QA session; that QA alone may issue PASS, invoke promotion, verify every target realm, or roll back.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated [ ] pre-promotion PASS before mutation [ ] post-deploy verify or rollback
- Notes:

### Phase 11: Establish Offline Profile Persistence and Local Squad Contract

- [ ] Trace exact live commits `b4a1f5940b10881cae6f2bad31beb17e238620a9` and
  `854615ab0d6efc1ea7b4d90aa39d7ed7991b839d`, routing mixed bug-report behavior to Phase 45.
- [ ] Establish one versioned offline-profile owner with registered-realm references,
  per-realm character collections, per-player selections, additive defaults, and idempotent
  migration from preserved unversioned storage behavior.
- [ ] Define squad/member/input and per-player gameplay-view ownership plus lifecycle,
  auto-party, reconnect, death, regroup, cleanup, IWorld, deterministic Sim, and headless seams.
- [ ] Add migration/isolation/corruption, same-seed, ownership, P1-P4, and non-co-op tests
  behind default-off flags; Phase 14 may persist only squad transition state through this owner.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 12: Implement Offline Co-op Input, HUD, and Baseline

- [ ] Implement P2-P4 character create/select, controller/keyboard join/reconnect/leave, pause, and duplicate-input prevention.
- [ ] Implement shared camera, per-player inventory/HUD/target/talents/quest state, accessibility, phone safe areas, and console-error-free overlays.
- [ ] Exercise movement, target, autoattack, cast, loot, quest accept/credit/turn-in, talents, and death/respawn/regroup for each player.
- [ ] Exercise chat say/yell/whisper/party, party invite/auto-party, trade, duel, and market browse/sell/buy offline, adding deterministic local equivalents where an online-only service currently blocks the flow.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 13: Implement Online Squad Authority and Union Interest

- [ ] Bind local squad sessions to authenticated account/character ownership with exact same-account policy and no client bypass.
- [ ] Implement bounded union-interest snapshots so P2-P4 stay visible to the shared renderer without broadcasting the whole world.
- [ ] Route each controller to its owned online session, handle join/reconnect/pruning/regroup, and version the wire for canary compatibility.
- [ ] Add exact regressions for coop-dev defects: join-before-connected, concurrent join queue, null/disconnected controller slots, trusted proxy IP, real API credentials, regroup-before-hello, and stale camera members.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 14: Implement Co-op Realm Transitions and Squad Transition Persistence

- [ ] Implement authority-owned transition barriers for portal, instance, death, respawn,
  reconnect, realm selection, and interrupted transitions, with Sim authority offline and
  server authority online.
- [ ] Persist only the versioned squad-transition journal, member acknowledgments, recovery
  checkpoint, and terminal cleanup through the Phase 11 profile owner and Phase 13 online
  authority; never add a second generic profile/realm/character persistence owner.
- [ ] Generate the registered-realm transition matrix and deep Infernal hazard/regroup/camera scenarios.
- [ ] Add process-interruption, old-save, mismatch, duplicate, and recovery tests for one through four members.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 15: Complete Co-op Baseline and Release Checkpoint

- [ ] Run P1-P4 create/select/join, auto-party, movement, target/autoattack/cast, loot, quests, death, and per-player HUD/inventory/talents across offline and online.
- [ ] Run chat say/yell/whisper/party, invite, trade, duel, and market browse/sell/buy with ownership and disconnect/reconnect coverage.
- [ ] Run every-realm smoke plus full Infernal online controller join/reconnect, camera, combat, transition, death, and console/screenshot evidence.
- [ ] Prepare the co-op feature flag and immutable candidate for the separate QA session; that QA alone may issue PASS, invoke promotion/verification, or roll back.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated [ ] pre-promotion PASS before mutation [ ] post-deploy verify or rollback
- Notes:

### Phase 16: Implement Mount Domain and Wire Contract

- [ ] Recover/adapt upstream mount domain types, capability registry, summon/mount/dismount/speed/restriction lifecycle, and deterministic events.
- [ ] Extend IWorld first and implement Sim, ClientWorld, server command validation, versioned snapshots, and headless actions/observations.
- [ ] Keep mount state default-off and content-neutral while defining ground versus flight capability explicitly.
- [ ] Add authority, determinism, parity, bandwidth, death/reconnect/transition, and canary tests.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 17: Implement Mount Persistence and Target-Neutral Entitlements

- [ ] Add additive/idempotent/indexed mount ownership and state persistence with old-save round trips and forward-compatible rollback.
- [ ] Add a generic server-side entitlement scoped by runtime account identity plus exact normalized character-name token and allowlisted mount bundle.
- [ ] Lock normalization to the shared validated name function with exact DuranceTester fixture result durancetester, no fuzzy/prefix matching, and no committed target IDs/data.
- [ ] Build an authenticated idempotent grant/revoke/audit operator command that defaults to dry-run and cannot grant arbitrary inventory or enable dev commands.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 18: Restore Three Mounts and Client Experience

- [ ] Recover the three content definitions from private history onto the new registry without wholesale branch replay.
- [ ] Verify original/license provenance, regenerate asset manifests, and implement models/animation/shadows/sounds within budgets.
- [ ] Implement collection, summon status, restrictions, keybinds, tooltips, controller/touch, mobile safe areas, and every-locale copy.
- [ ] Add content integrity, view/frame/input, visual, accessibility, asset, and one-to-four-player ground-riding tests.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 19: Implement Authoritative Flight Domain and Wire

- [ ] Define altitude/vertical velocity/ascent/descent/cruise/landing/dismount/fall states and capability-gated transitions.
- [ ] Validate terrain, world bounds, ceilings, interiors, instances, combat, no-fly zones, reconnect, and invalid altitude server-side.
- [ ] Version/delta-guard flight inputs/state/events through ClientWorld and headless without client altitude authority.
- [ ] Add determinism, exploit, collision, boundary, reconnect, transition, and bandwidth tests.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 20: Implement Flight Client, Camera, and Controls

- [ ] Implement ascent/descent/landing controls with remapping, controller reconnect, touch input, and clear restriction feedback.
- [ ] Render authoritative altitude, landing cues, shadows, effects, and camera behavior without mutating world state.
- [ ] Define shared-camera altitude envelope, outlier grace, regroup, occlusion, and readability for P1-P4 at mixed heights.
- [ ] Add desktop/phone/controller visuals, accessibility, console-error, asset, render, and performance tests.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 21: Integrate Mounts and Flight for Release Checkpoint

- [ ] Run all three mounts through unlock/summon/ride/dismount/death/reconnect/realm transition and persistence for P1-P4 offline/online.
- [ ] Run Emerald Wyrm ascent/descent/landing/no-fly/invalid/reconnect and mixed-altitude camera for P1-P4.
- [ ] Validate generic entitlement fixtures and a sanitized restored-production fixture without targeting live DuranceTester rows.
- [ ] Prepare immutable code/schema candidate evidence for the separate QA session; that QA alone may issue PASS, promote/verify/roll back, and it performs no live grant action.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated [ ] pre-promotion PASS before mutation [ ] post-deploy verify or rollback
- Notes:

### Phase 22: Prepare Auditable DuranceTester Grant Operation

- [ ] Confirm Phase 21 QA promoted and verified the exact code/schema build, then rerun dry-run against local and sanitized restored fixtures.
- [ ] Implement exact normalized name durancetester, authenticated runtime owner input,
  explicit row/realm allowlisting, and fail-closed cardinality using only local/sanitized
  fixtures; implementation resolves no live target.
- [ ] Prepare one idempotency-keyed allowlisted all-three-mount grant action with before/after audit query and rollback/revoke command.
- [ ] Prepare a QA runbook that alone performs read-only live cardinality preflight, locks
  exact intended rows/realms, records PASS, invokes one action, verifies/audits locked rows,
  and stops/revokes on mismatch. Future rows are not implicit.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 23: Implement World Fishing Domain and Wire

- [ ] Define cast/bobber/bite/reel/cancel/movement/combat/timeout/inventory-full/disconnect states through IWorld first.
- [ ] Preserve near-water validation and canonical catch tables while making rewards server-authoritative and deterministic.
- [ ] Mirror compact versioned events/state through ClientWorld/server/headless with reconnect recovery.
- [ ] Add boundary, duplicate input, reward, determinism, parity, and bandwidth tests behind default-off flags.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 24: Implement Fishing Presentation and Arcade Separation

- [ ] Render rod/line/bobber/bite/reel feedback, sound/accessibility cues, and authoritative cancellation/failure states.
- [ ] Implement keyboard/controller/touch controls and mobile-safe HUD with every-locale copy.
- [ ] Rename every old arcade entrypoint/copy to Cryptic Fishing Arcade and keep it clearly inside arcade navigation.
- [ ] Mechanically prohibit arcade mode from minting world items/currency and add visual/view/input/reward-boundary tests.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 25: Integrate Fishing for One-to-Four-Player Checkpoint

- [ ] Run P1-P4 simultaneous/sequential cast, bite, reel, cancel, move, combat, disconnect, reconnect, inventory-full, and reward flows offline/online.
- [ ] Verify per-player HUD/input/bobber ownership, shared camera, bandwidth, and no cross-player reward leakage.
- [ ] Verify Cryptic Fishing Arcade naming/navigation and zero world-economy authority for P1-P4.
- [ ] Prepare an immutable fishing candidate and evidence for the separate QA session; that QA alone may issue PASS, promote, run post-deploy realm smoke, or roll back.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated [ ] pre-promotion PASS before mutation [ ] post-deploy verify or rollback
- Notes:

### Phase 26: Lock Exchange Economy, Visitor, and Authority Policy

- [ ] Lock denomination to the existing integer copper-equivalent money unit, no floating point or FX; reserve buyer funds server-side and enforce conservation: reservation equals seller proceeds plus successful-settlement fee plus refund remainder.
- [ ] Lock item custody/provenance/compatibility/idempotency and projected inventory as a non-owning view of source escrow, never a copied character inventory.
- [ ] Define time-bound authenticated online visitor/delivery leases and mechanically disable
  every non-Exchange gameplay command for visitors.
- [ ] Lock offline Exchange to a versioned local-profile escrow ledger with no online
  sync/import/export/identity/listing/settlement/money/item path.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 27: Implement Exchange Schema, Escrow, and Currency Reservations

- [ ] Add idempotent indexed DDL for immutable item identity/provenance, escrow states, visitor/delivery leases, currency reservations, seller proceeds, fees, refunds, idempotency, and append-only audit.
- [ ] Implement atomic item lock, funds reserve, cancel, expire, refund, fee/proceeds posting, delivery, and reconciliation with parameterized SQL.
- [ ] Add a deterministic versioned offline-profile ledger with crash-safe writes and no
  SQL/network/import/export adapter.
- [ ] Guarantee old-data/DDL/rollback/recovery plus online concurrency and offline/online
  conservation/isolation tests.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 28: Implement Exchange Settlement and Wire Protocol

- [ ] Implement Exchange-only admission and list/browse/quote/buy/cancel/status commands using Phase 27 transactions.
- [ ] Validate ownership, compatibility, stale quote, balance, fees, source/destination realm, lease, idempotency, and concurrent buyers server-side.
- [ ] Expose Exchange state through IWorld/ClientWorld/headless with separate versioned online
  wire and no-network offline local-ledger adapters.
- [ ] Add replay/reconnect/canary/bandwidth/realm-bypass and offline/online boundary tests.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 29: Implement Exchange Player and Operator Experience

- [ ] Build listing/browse/quote/confirm/cancel/delivery UX showing provenance, source/destination realm, compatibility, reserved funds, price, fee, proceeds/refund rules, lease expiry, and final state.
- [ ] Present projected inventory as escrow-backed/non-owning, label Offline Exchange as
  permanently local/non-syncable and Online Exchange as server-backed, and hide prohibited controls.
- [ ] Add least-privilege operator audit/reconcile views with privacy redaction and no manual custody mutation.
- [ ] Add localization, mobile/controller, view/frame, error/outage, accessibility, and screenshot tests.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 30: Integrate Exchange for One-to-Four-Player Checkpoint

- [ ] Run separate P1-P4 online server/DB and offline local-profile Exchange matrices for all
  transaction states, reconnect/reload, expiry, and compatibility results.
- [ ] Run concurrent buyers, stale clients, process/DB failure, settlement recovery, audit/reconciliation, and money/item conservation.
- [ ] Verify prohibited gameplay/ordinary-market isolation and decisive offline-to-online
  sync/import/export/identity/listing/escrow/money/item rejection.
- [ ] Prepare an immutable Exchange candidate and canary evidence for the separate QA session; that QA alone may issue PASS, promote/verify, or roll back.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated [ ] pre-promotion PASS before mutation [ ] post-deploy verify or rollback
- Notes:

### Phase 31: Implement Reusable Minigame Domain and Wire

- [ ] Define game-agnostic deterministic session/roster/team/state/reward/bot/reconnect/spectator contracts.
- [ ] Extend IWorld first and implement Sim/server/ClientWorld/headless lifecycle plus compact versioned wire.
- [ ] Keep game rules in adapters and feature flags default-off; preserve existing Vale Cup behavior.
- [ ] Add invalid transition, ownership, reward, bot, disconnect, cleanup, determinism, parity, bandwidth, and load tests.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 32: Implement Minigame Client Shell and Vale Cup Adapter

- [ ] Build accessible reusable session HUD/window/input/camera hooks for one to four local players.
- [ ] Adapt one Vale Cup vertical slice to the shared shell with behavior-compatible adapters.
- [ ] Add controller/touch/mobile, localization, view/frame, screenshot, console, and performance tests.
- [ ] Run all Vale Cup practice/online/shoot/betting/autocast regressions.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 33: Implement Original Kart Racing Domain

- [ ] Recover safe Gauntlet ideas but implement original deterministic vehicle physics, steering, drift charge/release, boost, terrain traction, obstacles/collisions, checkpoints/laps, recovery, placement, and ties.
- [ ] Define fair item rules with seeded distribution, anti-chain protection, placement-aware bounds, explicit counters, and no paid advantage.
- [ ] Implement server authority, bots, rewards, disconnect/reconnect, invalid checkpoint, and headless parity behind default-off flags.
- [ ] Add determinism, fairness property, collision, exploit, bot, load, and performance tests with original/licensed content constraints.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 34: Implement Racing Client and One-to-Four-Player Integration

- [ ] Create original/licensed vehicles, tracks, terrain, obstacles, items, audio, and provenance records within asset budgets.
- [ ] Implement P1-P4 keyboard/controller/touch input, shared/split camera based on measured readability, countdown/lap/placement/item/recovery HUD, and accessibility.
- [ ] Run P1-P4 offline/online races with bots, drift/boost/items, reconnect, simultaneous finish, and console/screenshot evidence.
- [ ] Add visual, mobile, input, localization, asset, render, bandwidth, and soak tests.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 35: Implement Platform Arena Brawler Domain

- [ ] Define grounded/jump/double-jump/fall/aerial/landing/ledge/recovery/hitstun/launch/KO/respawn states and deterministic platform/fall-zone collision.
- [ ] Implement damage-based knockback scaling, directional influence bounds, ring-outs, stocks/score, pickups, teams/free-for-all, and finish/tie rules.
- [ ] Implement server-authoritative bots, rewards, reconnect, exploit prevention, and headless parity behind default-off flags.
- [ ] Add frame-boundary, collision, ledge contention, recovery, hitstun, knockback, ring-out, fairness, determinism, bot, and load tests.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 36: Implement Brawler Client and Minigame Checkpoint

- [ ] Create original/licensed platform arenas, audio, characters/skins, controls, camera, HUD, hit/launch/hitstun/ledge/recovery/ring-out feedback, accessibility, and mobile behavior.
- [ ] Run P1-P4 versus players/NPCs through jump/aerial/platform/ledge/fall-zone/knockback/stocks/score/reconnect flows.
- [ ] Run P1-P4 offline/online regression for Vale Cup, reference session, racing, and brawler with bots, rewards, screenshots, console, bandwidth, and performance.
- [ ] Prepare an immutable minigame candidate and evidence for the separate QA session; that QA alone may issue PASS, activate/promote/verify, or roll back.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated [ ] pre-promotion PASS before mutation [ ] post-deploy verify or rollback
- Notes:

### Phase 37: Define Town RTS Domain, Pilot Towns, and Balance

- [ ] Lock pilot scope to instanced Eastbrook first and Highwatch second on Cryptic Realm, never mutating the shared open-world town; each campaign is account-owned with explicit co-op ACL.
- [ ] Define build grid, structures, resources, production, units, deterministic pathing, attacks, objectives, win/loss, cleanup, and no paid advantage.
- [ ] Source footprints/terrain from existing town content, combat math from canonical vanilla-WoW formulas where applicable, and RTS economy/timing from versioned data justified by deterministic bot simulations, never unexplained literals.
- [ ] Implement domain/headless prototypes and same-seed/pathing/load/balance-envelope tests behind default-off flags.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 38: Implement Town RTS Persistence and Wire

- [ ] Add additive indexed campaign/layout/ACL/version/checkpoint persistence keyed by realm, town, campaign owner, with old-save and forward-rollback compatibility.
- [ ] Implement placement/resource/production/unit/attack commands server-side with stale-version/idempotency/permission validation.
- [ ] Extend IWorld/ClientWorld/headless and compact delta snapshots for structures, units, objectives, resources, and reconnect recovery.
- [ ] Add concurrent builders, path blockage, queue cancel, owner disconnect, process crash, old data, wire canary, and bandwidth tests.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 39: Implement Town RTS Client and One-to-Four-Player Integration

- [ ] Implement build/selection/command/queue/objective/resource/ACL UX with keyboard/controller/touch, mobile safe areas, previews, and accessible feedback.
- [ ] Render structures/units/pathing/attacks without mutating world state and within asset/render budgets.
- [ ] Run P1-P4 Eastbrook offline/online campaign creation, invite/ACL, build, produce, command, attack, win/loss, save/reload/reconnect; then run Highwatch only after Eastbrook passes.
- [ ] Add localization, visual, console, abuse, rollback, performance, and soak tests.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 40: Implement Zombie Tower Defense Domain and Wire

- [ ] Define seeded waves/routes/archetypes, objectives, towers, targeting, upgrades, resources, difficulty inputs, defeat/restart, rewards, reconnect, and cleanup in versioned data.
- [ ] Reuse sourced vanilla-WoW combat math where applicable and derive wave/economy timing from recorded deterministic simulations.
- [ ] Implement server-authoritative Sim/ClientWorld/headless/wire behavior with route-blocking and anti-stall rules.
- [ ] Add determinism, targeting, upgrade, reward, route, load, reconnect, and maximum-wave tests.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 41: Implement Zombie Client and Strategy Checkpoint

- [ ] Implement P1-P4 tower placement/upgrades, wave/objective/resource HUD, controls, camera, warning cues, render/audio, accessibility, and mobile behavior.
- [ ] Run P1-P4 offline/online zombie build/fight/upgrade/reconnect/defeat/restart/reward and maximum-wave soak.
- [ ] Re-run P1-P4 Eastbrook/Highwatch RTS persistence/ACL/win/loss plus zombie integration with screenshots, console, tick/snapshot/render budgets.
- [ ] Prepare an immutable strategy candidate and evidence for the separate QA session; that QA alone may issue PASS, activate/promote/verify, or roll back.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated [ ] pre-promotion PASS before mutation [ ] post-deploy verify or rollback
- Notes:

### Phase 42: Audit Housing Lineage, Security, and External Surfaces

- [ ] Build exact housing lineage and recover/redesign/upstream/quarantine/reject disposition for every vertical slice and asset.
- [ ] Research current official wallet/chain/SDK signature, network, finality, custody, privacy, and licensing behavior; mark unverifiable items OPEN/quarantined.
- [ ] Define safe ownership, access, visit, moderation, deletion, economy firewall, rollback, and no-client-key boundaries.
- [ ] Add permanent manifest contracts and negative tests for rejected wallet/financial/secret/unlicensed paths.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 43: Implement Approved Housing Domain and Persistence

- [ ] Implement IWorld-first deterministic building/placement/ownership/access/visit/deletion rules for approved slices behind default-off flags.
- [ ] Add additive indexed housing/ACL/moderation/deletion persistence with old-save, DDL-twice, retention, and forward-rollback behavior.
- [ ] Implement server/net/headless authority, rate limits, audit, reconnect, and privacy-safe responses.
- [ ] Add auth, cross-account, moderation, deletion, migration, retry, parity, and bandwidth tests.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 44: Implement Housing Client and Release Checkpoint

- [ ] Implement accessible build/visit/access/moderation/deletion UX, render previews, controller/touch/mobile behavior, localization, and privacy-safe errors.
- [ ] Run P1-P4 owner/guest visits, co-build permissions, reconnect, moderation, deletion, persistence, and denied-access flows offline/online.
- [ ] Verify quarantined wallet/financial/secret/unlicensed paths remain unreachable and all assets have provenance.
- [ ] Prepare an immutable housing candidate and evidence for the separate QA session; that QA alone may issue PASS, activate/promote/verify, or roll back.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated [ ] pre-promotion PASS before mutation [ ] post-deploy verify or rollback
- Notes:

### Phase 45: Harden Bug Reporting Security and Parity

- [ ] Patch-ID compare live commit `2ca141929` to the Phase 09/10 shared delivery/status
  foundation and classify every delta; stop if the foundation is absent instead of creating
  a second queue, retry, dead-letter, reconciliation, or status implementation.
- [ ] Add only bug-report-specific auth/rate limits, dedupe, consent/privacy, attachment
  policy, sanitized GitHub adapter, and operator hooks through the shared foundation.
- [ ] Harden account/character/chat/URL/log/environment/attachment/credential sanitization
  across browser, server, queue, operator, and public-issue boundaries.
- [ ] Add parity/API/DB/shared-queue/outage/replay/rate/privacy/abuse tests and a permanent
  F-024 guard proving no duplicate generic delivery implementation exists.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 46: Harden Offline Realm Persistence Parity and Migration

- [ ] Patch-ID compare live commits `b4a1f594`, `854615ab`, and exact fix `6564b2bca90d5b0979994e6e76e27743a3aab2c1` to
  the Phase 11/14 foundation; stop if that foundation is absent instead of reimplementing it.
- [ ] Harden existing version adapters with additive legacy migration, backup/rollback,
  corruption handling, forward-data preservation, and no cross-realm/class/player bleed.
- [ ] Close remaining P1-P4 create/select, realm switching, controller reconnect, deletion,
  and import/export ownership gaps without a second registry or persistence owner.
- [ ] Add exact `6564b2bca90d5b0979994e6e76e27743a3aab2c1` duplicate-realm-entry coverage plus migration, corruption,
  isolation, P1-P4, and permanent F-025 tests.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated
- Notes:

### Phase 47: Recover Xbox, Tauri, and Store Distribution

- [ ] Inventory dirty/current and historical F-026 files, preserve user changes, classify package identity/capabilities/assets/version/config, and recover only missing behavior.
- [ ] Validate Tauri Rust/config/store/MSIX and Xbox package generation with target-neutral fixtures, path-safe scripts, deterministic metadata, and signing separated from source.
- [ ] Run bug-reporting and offline-persistence integration alongside desktop/store login/realm/controller/co-op smoke.
- [ ] Prepare three non-interchangeable evidence lanes: the Phase 04 LXC web/server candidate,
  signed-artifact verification inputs/results, and an externally authorized store-publication
  handoff with receipt/status. Implementation never signs, submits, publishes, or conflates them.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated [ ] pre-promotion PASS before mutation [ ] post-deploy verify or rollback
- Notes:

### Phase 48: Complete Final Hardening and Automatic Release

- [ ] Run permanent manifest, latest-stable drift check, npm run gate, npm run security:gate, release malware audit, schema/wire canary, asset/performance, dependency, privacy, migration, parity, and clean QA artifact gates.
- [ ] Run login, character create, enter world, movement, target/autoattack/cast, loot, quests, full chat/social/trade/duel/markets/talents plus every P1-P4 co-op/mount/flight/fishing/Exchange/minigame/strategy/housing/distribution scenario on local/stage.
- [ ] Prepare a complete draft REPORT with scenario fields, fixes-with-SHAs, prioritized
  follow-ups, screenshots/console/account cleanup, while explicitly withholding CONVERGED
  and pre-promotion PASS for independent QA.
- [ ] Prepare the exact immutable final candidate for the separate QA session; that QA alone may issue PASS, invoke backup/promotion, verify every production realm, or roll back.
- QA: [ ] dedicated verdict [ ] blocking/should-fix closed [ ] tests/evidence complete [ ] LEDGER/REPORT updated [ ] pre-promotion PASS before mutation [ ] post-deploy verify or rollback
- Notes:

## Program notes

### Exchange player surface checkpoint — 2026-07-15

- Added a live in-game Exchange window (`mm-exchange`) backed by the atomic
  `/api/exchange/listings` custody routes. It filters listings to source realms
  different from the current destination realm, lists eligible inventory items,
  settles purchases, cancels owned escrow, and refreshes from authoritative state.
- Added a DOM-free view model and focused tests for inventory resolution and
  per-stack price display. The server remains the only authority for ownership,
  class/level compatibility, currency, provenance, and settlement.
- This closes the player-facing Exchange gap; the separate racing, brawler, RTS,
  zombie-defense, housing recovery, and sanitized-PR extraction phases remain
  explicitly open and are not represented as complete.

### Upstream extraction checkpoint — 2026-07-15

- Added `scripts/sanitize_upstream_patch.mjs`, a read-only, fail-closed extractor
  that rejects Cryptic-only paths, neutralizes branding/realm names, scans for
  credentials/private hosts, and writes an upstream patch plus machine-readable
  manifest. It never pushes or opens a pull request.
- Added focused tests covering path policy, substitutions, secret rejection, and
  the explicit no-publish manifest policy. The existing `/api/contributions` feed
  remains the automatic public receipt for upstream PRs once a human submits one.

- Do not mark a phase complete from code presence.
- No later implementation begins before the prior QA is complete.
- Checkpoint implementation never mutates production. Its QA issues PASS first, then invokes promotion.
- Durable deferrals move to normal issue tracking before Phase 48 teardown.

### Open game-domain foundations checkpoint - 2026-07-15

- Added `src/sim/racing.ts` and focused tests for a deterministic 20 Hz four-player kart
  race: drift tiers, boosts, traction surfaces, obstacles, seeded counterable items,
  ordered checkpoints, laps, finish ties, and recovery.
- Added deterministic default-off domain cores for the brawler, Eastbrook-first town RTS,
  zombie defense, and safe housing ownership/build/visit/delete rules under
  `src/sim/minigames/`. Each core has direct tests and the rollout registry keeps all five
  incomplete features disabled until their dedicated IWorld, server wire, persistence,
  client, and QA checkpoints pass.
- Expanded the character sheet toward the supplied references with Equipment and Overview
  tabs, grouped attributes/combat/defense sections, a stable 16-to-64 bag tray, responsive
  geometry, and retained lazy 3D character and item viewers. Exact supplied pixel matching
  still needs browser screenshot comparison and final art-token tuning.
- These are implementation slices only. No production deployment or feature activation was
  performed because the permanent recovery manifest is missing and the current branch is not
  descended from the pinned upstream release ref.

### Shared minigame lifecycle checkpoint - 2026-07-15

- Added `src/sim/minigames/session.ts`, a deterministic 20 Hz lifecycle seam for lobby,
  readiness, countdown, reconnect, finish/abort, and idempotent reward claims. It is
  host-agnostic and keeps game-specific state in adapters.
- Added seven focused lifecycle assertions to `tests/minigame_domains.test.ts`; the suite
  passes on commit `6e9c4d7dd`.
- The session seam is intentionally not wired to IWorld, server dispatch, snapshots, or
  persistence yet. All five feature flags remain default-off and no production mutation was
  performed.

### Local character-sheet visual checkpoint - 2026-07-15

- Browser QA reached the offline world and opened the character sheet for a synthetic
  `QaViewer` warrior. The rendered surface exposes the Equipment/Overview tabs, 16 bag
  cells, grouped primary/combat/defense sections, currency, and the existing 3D character
  canvas.
- Selecting the equipped main-hand item mounted `#char-item-model-preview` with a WebGL
  canvas, confirming the lazy 3D item-viewer path is reachable from a paperdoll slot.
- This is functional/layout evidence only. The supplied reference images have not been
  proven pixel-identical; typography, art tokens, and exact spacing remain a screenshot
  comparison follow-up.

### Minigame wire checkpoint - 2026-07-15

- Added the append-only `mg_create`, `mg_join`, `mg_ready`, `mg_abort`, and `mg_claim`
  command tokens, typed `ClientWorld` senders, server-side session ownership, 20 Hz
  lifecycle stepping, linkdead/reconnect connection state, and the `self.mg` snapshot
  mirror.
- The wire test proves snapshot encode/decode and verifies disabled feature commands are
  inert. Mode adapters, persistent session storage, rewards, and UI remain gated until
  their dedicated checkpoints pass.
