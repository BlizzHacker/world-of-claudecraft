# Anti-Bot Behavioral Detection

## Overview

World of ClaudeCraft already limits abuse at the network and account layers: HTTP
rate limits, login captchas (Cloudflare Turnstile), WebSocket hardening, registration
heuristics, and (via open PRs) a one-character-per-account online cap and a
browser-Origin requirement on auth in production. These measures stop scripted
sign-up waves, programmatic token farming, and obvious connection floods, but they
do not tell us whether an authenticated player is a human or an automated client
actually playing the game.

This document proposes **behavioral detection**: server-side checks that observe
*how* someone plays after they are already logged in. The goals are to:

- reduce bot farming impact through silent, graduated responses;
- accumulate enough evidence for moderators to review before a permanent ban;
- avoid alerting bot operators with aggressive or visible countermeasures.

Bot sophistication varies widely. Cheap scripts fire actions at fixed intervals and
run many clients from one machine. More advanced tools add random delays, vary
ability rotations, and spread sessions across proxies. No single metric reliably
separates humans from bots, so the approach below combines many weak indicators
into a per-session score. Individual detection ideas are described in the sections
that follow, each with a **Code status** subsection grounded in the current tree.
Response thresholds, architecture, and suggested implementation order are at the end.

Two **hard guardrails** are in open PRs (see Existing Protections). The sections
below cover detection that operates after those land; see **Implementation Phases**
for what is already shipped.

---

## Existing Protections (Summary)

Hard guardrails (reject at the gate) and rate limits already in tree or landing via
open PRs. These are **not** scored `BotEvidence` — they block before gameplay.

| Layer | Mechanism | File / PR | Status |
|---|---|---|---|
| HTTP | Rate limiting per-IP (20 req/min) | `server/ratelimit.ts` | **Shipped** |
| HTTP | Throttle per-account (10 failures / 15 min) | `server/ratelimit.ts` | **Shipped** |
| HTTP | Cloudflare Turnstile on login + register | `server/turnstile.ts` | **Shipped** |
| HTTP | Same-origin `Origin` required on login/register (prod) | `server/web_login_guard.ts` | **PR [#441](https://github.com/levy-street/world-of-claudecraft/pull/441)** |
| WS | One character online per account (GMs exempt) | `server/game.ts` `join()` | **PR [#439](https://github.com/levy-street/world-of-claudecraft/pull/439)** |
| WS | Auth timeout 10 s | `server/main.ts` | **Shipped** |
| WS | Frame size cap 16 KiB | `server/main.ts` | **Shipped** |
| App | Suspicious registration pattern detection | `server/moderation_db.ts` | **Shipped** |
| App | Chat token bucket (burst 5, sustained 20 msg/min) | `server/game.ts` | **Shipped** |

---

## Detection Strategy

**Composite score, not a single check.** Every detection idea in this document
covers one facet of bot behavior (timing regularity, repeated routines, movement
patterns, farming efficiency, connection counts, physically impossible actions, …).
Each facet alone is easy to evade: a bot can add random jitter to its action
intervals, shuffle its ability rotation, or limit how many clients share one IP.
Reliable detection correlates **multiple independent observations** accumulated
over time.

**Recommended model:**
- Each observation adds a **typed piece of evidence** with a weight and TTL (evidence
  decays if behavior normalizes).
- Session score = weighted sum of active evidence, not an instant boolean.
- Responses (log, throttle, kick) require a **sustained score** and at least two
  evidence types, never a single spike from one check alone.
- Throughput and economy metrics compare a player to a **cohort** (class, level,
  zone, build, session length) so intensive but legitimate grinding is not flagged
  as botting.

```typescript
interface BotEvidence {
  kind: 'timing' | 'sequence' | 'trajectory' | 'reaction' | 'farm_ratio'
      | 'efficiency' | 'multi_ip' | 'impossible' | 'honeypot';
  weight: number;       // contribution to composite score
  expiresAt: number;    // TTL — evidence decays if behavior changes
  detail: string;       // human-readable summary for admin moderation
}
```

Per-account session limits are a **hard guardrail** ([PR #439](https://github.com/levy-street/world-of-claudecraft/pull/439)),
not scored evidence — farms now spread across multiple accounts instead.

See **Code Architecture** below for where this lives in memory vs Postgres and
how it is wired into the game loop.

### Applicability at a glance (current codebase)

Audited against `server/game.ts`, `server/main.ts`, `server/db.ts`, and `src/sim/`.
Nothing in the antibot module exists yet; the table below rates each signal against
**what the code already provides** vs what still needs to be built.

| Signal | Status | Effort | Notes |
|---|---|---|---|
| 1 — Timing variance | ✅ **Shipped (Phase 1)** | — | `COMBAT_CMDS` set; ring buffer + stdDev; TTL 2 min |
| 2 — Sequence repetition | Planned (Phase 2) | Medium | Fingerprint buffer; resolve `templateId` / `zoneAt` from sim |
| 3 — Farm / movement ratio | Planned (Phase 3) | Medium | High false-positive risk without cohort baselines |
| 4 — Farming efficiency (offline) | Planned (Phase 3) | Medium–high | No kill log in DB; XP/h feasible from autosave deltas |
| 6 — Multi-session per IP | ✅ **Shipped (Phase 1)** | — | Soft (score) + hard (1008 close); `MAX_WS_PER_IP_SOFT/HARD` env |
| 7 — Impossible actions | Planned (Phase 2) | Medium | Sim validates already; needs antibot hook on repeated rejections |
| 8 — Reaction times | ✅ **Shipped (Phase 1)** | — | `death` + `castStop`; Phase 1 threshold 150 ms, no RTT correction |
| 9 — Trajectories | Planned (Phase 2) | Medium | In-memory first; cross-session hash needs schema |
| 10 — Target selection | Planned (Phase 3) | Medium–high | Must define "optimal target" server-side; party false positives |
| 11 — Economic graph (offline) | Blocked (Phase 4) | High | No trade log, no market transaction log |
| 12 — Honeypots | Deferred | Very high | No server-only entities; sim + wire changes required |

**Recommended first ship set (behavioral):** `BotDetector` shell, **6**, 1, 8 — all
in-memory, no DB migration. Signals 11 and 12 remain roadmap items with explicit
prerequisites.

---

## Signal 1 — Action Timing Variance

**Principle.** Humans are irregular; naive scripted bots are precise to the
millisecond. Measure the standard deviation of intervals between consecutive actions
over a sliding window.

**Data collected per session (memory only, not in DB):**

```typescript
interface ActionTiming {
  lastActionAt: number;  // server Date.now()
  deltas: number[];      // ring buffer of the last 20 intervals (ms)
  flaggedAt?: number;    // for cooldown before action
}
```

**Computation on each significant action** (attack, cast, loot — not raw movement,
which is continuous streaming):

```typescript
function recordAction(timing: ActionTiming, now: number) {
  if (timing.lastActionAt > 0) {
    const delta = now - timing.lastActionAt;
    timing.deltas.push(delta);
    if (timing.deltas.length > 20) timing.deltas.shift();

    if (timing.deltas.length >= 10) {
      const stdDev = computeStdDev(timing.deltas);
      // see thresholds below
    }
  }
  timing.lastActionAt = now;
}
```

**Typical thresholds:**
- `stdDev < 15 ms` over ≥ 10 actions → strong evidence (near-certain bot, naive scripts)
- `stdDev < 50 ms` → moderate evidence (auto-clicker or hardware macro)
- `stdDev ≥ 50 ms` → neutral

**Complement — harmonic detection.** Beyond variance, measure whether intervals
cluster around fixed multiples (500 ms, 1500 ms, 3000 ms, character GCD period).
A human has variance *and* little periodic structure; a bot with artificial jitter
often retains a discernible dominant frequency (autocorrelation or histogram by
50 ms bucket).

**Limits.** Well-designed bots add artificial jitter that raises standard deviation
while preserving periodicity. This signal alone is not enough against a savvy operator —
most useful against naive scripts and in combination with signals 2, 7, and 8.

**Code status — Implemented (Phase 1).** Hook lives in `dispatchMessage`
(`server/game.ts`) after the `msg.t !== 'cmd'` guard, before sim routing.
Commands observed: `attack`, `cast`, `castSlot`, `loot`, `interact` (the
`COMBAT_CMDS` set in `server/antibot.ts`). State on `ClientSession.bot.timing`
(ring buffer, max 20 deltas). No DB, no sim changes. Harmonic detection (see
*Complement* above) is not yet implemented.

---

## Signal 2 — Repeated Action Sequences

**Principle.** A bot runs the same script in a loop: same ability order, same
loot/movement pattern. Fingerprint action sequences over a window and detect cycles.

**Implementation.** Ring buffer of the last N actions; compare the recent half to
the previous half using **fuzzy similarity**, not strict equality.

```
Sequence observed over 20 actions:
  [attack mob_A, cast #7, loot, move, attack mob_B, cast #7, loot, move, ...]
  → pattern [attack, cast #7, loot, move] repeated → flag
```

**What we capture (abstract fingerprint, not raw `targetId`):**
- `msg.type` (attack, cast, loot, interact, …)
- `msg.ability` (ability id)
- target `mobKind` / `levelBucket` / `zoneBucket` (not the instance id,
  which changes on every respawn)

**Fuzzy similarity:** two sequences match if ≥ 80% of slots share the same
type + ability, even when the concrete target differs. Avoids false negatives when
the bot kills different mobs but runs the same rotation script.

**Code status.** WS commands use `msg.cmd`, `msg.ability`, `msg.id` (target).
Mob entities expose `templateId` (`src/sim/entity.ts`); zones via `zoneAt(z)`
(`src/sim/data.ts`). Do not fingerprint raw `targetId` (changes on respawn).
Commands like `targetNearest` / `tab` have no explicit target in the message —
fingerprint on command type alone. Pure in-memory.

---

## Signal 3 — Farm / Movement Ratio

**Principle.** A human player stops, explores, chats, checks the map. A bot farms
continuously without ever moving in an exploratory way.

**Metrics per session (10 min sliding window):**
- `combatActions`: attacks + casts
- `idleSeconds`: seconds with no input at all
- `uniqueZones`: number of zones visited

**Suspicious ratio:** `combatActions / (elapsedSeconds - idleSeconds) > threshold`
combined with `idleSeconds < 5%` of total time.

An active human player naturally caps around 1–2 actions/s in combat and has idle
phases (inventory, chat, navigation). A bot spams at the GCD limit without pauses.

**False positives.** A legitimate player grinding one zone for hours can look like
a bot (little idle time, high action density). Always compare by **cohort**:
class + level + zone + session length. A high ratio is suspicious only if it also
exceeds the cohort p95, not the global average.

**Code status.** **Partially applicable.** `ClientSession.lastInputAt` (sim time of
last movement frame) and `joinedAt` exist; player position is server-authoritative
(`sim.entities.get(pid).pos`). Must build combat-action counters and define idle
(movement-only input still counts as active). Inventory/map UI time produces no
network traffic, so true idle is under-counted. Treat as a weak signal until
cohort baselines exist (signal 4).

---

## Signal 4 — Abnormal Farming Efficiency

**Principle.** Compare a player's XP/h and kills/h to percentiles within their
cohort. A deviation > 3σ warrants attention.

**Cohort:** class, level band (±2), primary zone, build/talents if available. Two
level-12 mages in the starter zone are not compared to a level-18 warrior in a dungeon.

**Code status.** **Partially applicable, offline only.** Available in Postgres today:
`play_sessions` (duration, account, character), `characters.state` JSONB with
`lifetimeXp`, `level`, `class`, `questLog` / `questsDone`. Autosave every 30 s
(`AUTOSAVE_SECONDS` in `game.ts`) allows XP/h estimation from save deltas. **Not
available:** kill logs; `PlayerMeta.counters.kills` (`src/sim/sim.ts`) is updated
in-session but **not** included in `serializeCharacter` / `CharacterState`. A nightly
job can flag XP/h outliers; kills/h requires a new `kill_events` table or accepts
XP-based approximation. Never triggers automatic kick alone.

**Advantage:** detects bots with artificial jitter that fool signal 1.

**False positives.** Speedrunners, highly experienced players, or optimized groups
can legitimately exceed p99. This signal feeds a review flag, not automatic action alone.

---

## Signal 6 — Simultaneous WS Connections per IP

**Principle.** A bot operator launches dozens of clients from the same machine (or
proxy). Limiting active WS connections per IP blocks cheap bot waves.

**Why this matters more after PR #439:** one-character-per-account forces farms onto
**N accounts for N bots** — the same IP still hosts N parallel WS sessions. Signal 6
caps that density; it is the complement to #439, not redundant with it.

**Implementation.** Counter per IP in the session map; reject (close 1008) beyond
the threshold.

> **NAT / shared-network caution.** A college dorm, corporate network, or
> multi-player household can easily share an IP with 5+ legitimate players. Two
> layers are recommended:
> - **Soft threshold (e.g. 5):** add `multi_ip` evidence (weight 0.4) to each
>   session's `BotTracker`. Contributes to composite score without hard-rejecting.
> - **Hard threshold (e.g. 20):** close(1008). This catches only the most obvious
>   bot farms and avoids false-positive kicks on shared networks.
> - **IPv6:** count connections by /64 prefix, not full address — a single operator
>   can trivially cycle through addresses within one prefix.

**Infra note.** The current Caddyfile (`deploy/user-data.sh:79`) has no
`limit_conn`. Protection must be application-level or added in the nginx config
for the Ansible `eastbrook_game` role (to verify).

**Limit.** Serious operators distribute across multiple IPs (proxies, VPS). Useful
against cheap farming, not dedicated infrastructure.

**Code status — Implemented (Phase 1).** `session.ip` added to `ClientSession`.
`GameServer.ipSessionCounts: Map<string, number>` incremented in `join()`,
decremented in `leave()`. Soft evidence (`multi_ip`, weight 0.4, session-scoped)
added on `join()` when `ipCount > MAX_WS_PER_IP_SOFT` (env, default 5).
Hard reject in `main.ts` `authenticateWebSocket()` when `ipCount >= MAX_WS_PER_IP_HARD`
(env, default 20) — closes with 1008 before `game.join()`. IPv6 prefix grouping
and Caddy-level `limit_conn` are not yet implemented.

---

## Signal 7 — Server-Side Impossible-Action Validation

**Principle.** The server is authoritative: it knows ground truth. Commands that
the sim rejects because they violate game rules (out of range, dead target, no LoS)
are strong bot evidence because a legitimate client should not produce them at scale.

**What the sim already validates** (`src/sim/sim.ts`, no antibot hook today):
- Cast range, min range, facing arc, line of sight, cooldowns, resources, stun state
- Loot / interact distance (`INTERACT_RANGE` in `lootCorpse`, `pickUpObject`)
- Market proximity (`nearMerchant`), dungeon door proximity (checked in `game.ts`)

**What is already server-authoritative (little antibot value):**
- **Movement** is computed from `moveInput` frames only; the client never sends
  position. Speedhack / teleport via normal WS protocol is not possible.
- `dev_teleport` exists but is gated by `ALLOW_DEV_COMMANDS=1` (never production).

**What still needs building:**
- Instrument `dispatchMessage` (or wrap sim calls) to detect **repeated hard
  rejections**: loot/cast/attack on out-of-range or dead entities.
- Distinguish bot impossibles from lag-induced edge cases (rate-limit evidence, do
  not ban on one event).
- GCD spam is rejected **silently** (`gcdRemaining > 0` → return, no error) — that
  is normal client behavior, not impossible-action evidence.

**Response:** count rejections internally; at threshold, add high-weight `impossible`
evidence. Do not add new client-visible error messages.

---

## Signal 8 — Abnormal Reaction Times

**Principle.** Bots react too quickly and too consistently to world events. Measure
delays between an observable event and the player's response.

**Measurable events:**
- Mob enters range / becomes targetable → first cast or attack
- Mob dies → first loot or target change
- Cooldown ready (GCD expires) → next combat action
- Add aggro → target switch or defensive ability use

**Thresholds (server-measured, RTT included).** Server-measured reaction =
client reaction time + round-trip latency. A human reacts in 200–500 ms; at
50 ms RTT the server sees 250–550 ms. A bot reacting in < 5 ms client-side still
reads ≈ RTT + 5 ms on the server — well below any human range at any RTT.

Threshold: `(median_reaction − estimated_session_rtt) < 80 ms` or standard
deviation < 30 ms over ≥ 10 events → suspicious. Estimate session RTT from the
WS handshake ping/pong or the first few observed action deltas. **Never apply
the raw 100 ms cutoff without subtracting RTT** — a 100 ms ping player would
appear suspicious even with human-level reactions.

**Complement to signal 1:** artificial jitter on inter-action intervals does not
mask instant reactions to world events.

**Code status — Implemented (Phase 1).** `observeEvent` hooked in `routeEvents`
(`server/game.ts`) for `death` and `castStop` events (the `REACTION_EVENTS` set).
`observeAction` clears `reactionPending` and accumulates a ring buffer (max 20).
Phase 1 threshold: median < 150 ms → weight 0.6; stdDev < 30 ms → weight 0.3;
both with TTL 2 min. **No RTT correction yet** (Phase 1 uses a conservative 150 ms
threshold; even a 0-RTT bot can't sustain median < 150 ms at human-like reaction
speed). Phase 2 will subtract estimated RTT and tighten to 80 ms.

---

## Signal 9 — Trajectory Analysis

**Principle.** Even with temporal jitter, bots often follow the same paths: same
waypoints, same angles, same stops, identical geometric loops.

**Implementation:**
- Sample position every 2–5 s (not every movement frame)
- Hash the path on a coarse grid (e.g. 5 yd cells) over a 10 min window
- Compare current session hashes vs previous sessions for the same character
- Detect repeated closed loops (A → B → C → A) with low inter-waypoint timing variance

**What we capture:** path shape, not exact speed. A bot patrolling a spawn point
produces the same trajectory hash session after session.

**Code status.** **Applicable in-memory; cross-session needs schema.** Player
position is server-authoritative (`sim.entities.get(pid).pos`). Sample every 2–5 s
(not every 20 Hz tick). `zoneAt(z)` available for zone context. Legitimate teleports
(dungeon doors, respawn, arena) produce discontinuous paths — exclude or normalize.
`characters.trajectory_hashes` (an array of the last 5 session hashes) does not
exist yet (Phase 2). A single hash is insufficient — a bot alternating between two
routes never self-matches; storing the last N hashes catches it.
`dev_teleport` (`ALLOW_DEV_COMMANDS=1`) distorts dev measurements.

---

## Signal 10 — Non-Human Target Selection

**Principle.** Bots systematically choose the optimal target without hesitation or error.

**Indicators:**
- Always the closest / weakest / most profitable target (XP gold/min)
- Never a wrong target (mob already engaged by another, out-of-level mob)
- Never a target switch after add aggro, unless scripted
- Near-zero targeting decision time (< 50 ms) repeatedly

**Measurement:** ratio `optimalTargetChoices / totalTargetChanges`. A score > 95%
over ≥ 20 target changes is suspicious; a human hesitates, mis-clicks, or prioritizes
differently (quests, RP, specific mobs).

**Code status.** **Partially applicable.** Commands `target`, `tab`, `targetNearest`,
`targetNearestFriendly` exist in `dispatchMessage`. Sim exposes entity positions,
levels, `templateId`, hostility. Must implement server-side "optimal target" heuristic
and compare on each target change. High false-positive risk in parties (focus fire,
assists). Lower priority than timing / reaction signals.

---

## Signal 11 — Economic and Social Graph (Offline)

**Principle.** Bots farm to feed a central account (mule). Transfer patterns leave
traces even when gameplay looks clean.

**Code status — not ready for full mule-network detection.** The gameplay economy
is not journaled today:

| Data needed | Status in codebase |
|---|---|
| P2P trade history | **Missing** — `tradeConfirm()` swaps in-memory only (`src/sim/sim.ts`); nothing persisted |
| Market buy/sell history | **Missing** — only current listings in `world_state` key `'market'`; `marketBuy()` not logged |
| Mail transfers | **N/A** — no mail system |
| Seller identity on market | **Partial** — `sellerKey` is **character name**, not `account_id`; join via `characters.name` |
| IP / account linkage | **Exists** — `play_sessions.ip_address`, `accounts.created_ip`, `last_login_ip` |
| Chat / social activity | **Exists** — `chat_logs`, `friendships`, `guilds` |
| Quest / grind profile | **Exists** — `characters.state` JSONB (`questsDone`, `questLog`, `lifetimeXp`) |

**What is feasible without new logging (signal 11 light):**
- Cluster accounts by shared IP / user-agent / registration burst (overlap with
  existing `createSuspiciousRegistrationReport` in `moderation_db.ts`). **More
  important after PR #439:** mule networks are necessarily cross-account.
- Flag accounts with long playtime, zero chat, empty `questsDone`, high `lifetimeXp` delta.

**What requires new instrumentation (Phase 3 prerequisite):**
- Trade log table (hook `tradeConfirm`).
- Market transaction log (hook `marketBuy` / `marketCollect`).
- Then nightly `bot_economy_clusters` job.

**Response:** flag clusters for admin review, never automatic ban.

---

## Signal 12 — Discreet Honeypots (Optional, Advanced)

**Principle.** Traps invisible to a legitimate client but attractive to a bot that
reads game memory or parses snapshot entities.

**Code status — not ready.** `broadcastSnapshots()` in `game.ts` serializes every
entity within interest radius to all nearby clients. There is no server-only entity
type excluded from the wire format. A honeypot mob in the sim would appear in normal
player snapshots unless the wire layer gains explicit filtering. Bots can also send
commands with guessed entity IDs without relying on the snapshot. Implementing this
requires sim + snapshot changes and strict false-positive review.

**Examples (future, if server-only entities exist):**
- Entities present for command validation but omitted from client snapshots
- Internal-only template ids never referenced by the official client

**Safeguards:**
- Never trap a legitimate player: honeypots must not be visible or reachable via normal UI
- A single honeypot interaction = strong evidence, not moderate
- Document each honeypot; periodic false-positive review

> **Kick behaviour with `distinctKinds ≥ 2` required (see Escalation):** a honeypot
> hit alone (score = 1.0, kinds = 1) immediately reaches the **shadow-throttle**
> threshold but does **not** auto-kick. The response is throttle + moderation
> report; an admin confirms before ban. This is intentional: honeypot false-positive
> risk justifies human confirmation, and a half-speed bot is far less damaging than
> a wrongly kicked legitimate player.

**Defer** until behavioral signals (1–9) are stable. Lowest priority.

---

## Composite Score and Admin Moderation

**Accumulation:** each signal adds a `BotEvidence` with weight and TTL.
Example indicative weights:

| Signal | Weight | TTL |
|---|---|---|
| Impossible (signal 7) | 1.0 | 5 min |
| Honeypot (signal 12) | 1.0 | permanent |
| Timing < 15 ms (signal 1) | 0.7 | 2 min |
| Reaction < 100 ms (signal 8) | 0.6 | 2 min |
| Repeated sequence (signal 2) | 0.5 | 5 min |
| Identical trajectory (signal 9) | 0.5 | 10 min |
| Multi-IP (signal 6) | 0.4 | session |
| Efficiency > 3σ (signal 4) | 0.3 | 24 h |
| High farm ratio (signal 3) | 0.2 | 10 min |

**Decision thresholds (composite score, not isolated signal):**
- Score ≥ 0.5 for 30 s with ≥ 2 evidence types → log + moderation report
- Score ≥ 0.8 for 60 s with ≥ 2 evidence types → shadow-throttle
- Score ≥ 1.0 for 2 min with ≥ 2 evidence types → kick + flag account for admin review
- Admin confirmation → ban or suspend

**Admin observation mode:** keep a compact summary per flagged session
(not full raw logs):
- Current score and historical snapshots (see Code Architecture below)
- List of active evidence with `kind`, `weight`, `detail`
- Metrics: actions/min, XP/h percentiles vs cohort, trajectory hashes,
  linked sessions (IP, account)
- Lets a moderator confirm or dismiss before ban

---

## Code Architecture

This section describes how the detection model is wired into the existing server.
**Phase 1 is shipped:** `server/antibot.ts` (BotTracker, Signals 1/6/8, escalation
state machine), `server/antibot_db.ts` (auto-reports into `player_reports`), hooks
in `server/game.ts` (ClientSession, join/leave, dispatchMessage, routeEvents, game
loop) and `server/main.ts` (hard IP reject). Hard guardrails in PRs
[#439](https://github.com/levy-street/world-of-claudecraft/pull/439) and
[#441](https://github.com/levy-street/world-of-claudecraft/pull/441) ship separately.
The design follows current conventions: detection logic in a dedicated module, SQL
in a `*_db.ts` companion, per-session ephemeral state on `ClientSession` (same
pattern as `chatTokens`), and automated flags surfaced through the existing
moderation queue (`player_reports`).

### Where state lives

| Data | Storage | Lifetime | Why |
|---|---|---|---|
| Ring buffers (timing, sequences, trajectories) | In-memory, per session | Current WS session | High frequency, no value after disconnect |
| Active `BotEvidence[]`, composite score, escalation timers | In-memory, per session | Current WS session | Recomputed every tick; TTL is seconds to minutes |
| Shadow-throttle multiplier | In-memory, per session | Current WS session | Must affect the sim loop immediately |
| WS connection count per IP | In-memory, global | Process lifetime | Signal 6; derived from `GameServer.clients` |
| Per-account online cap | Hard reject at `join()` | N/A | PR #439 — not scored, not in `BotTracker` |
| Auto-generated moderation reports | Postgres (`player_reports`) | Permanent | Reuses existing admin queue and review workflow |
| Account review flag, kick/ban history | Postgres (`accounts` column or events table) | Permanent | Survives reconnect; moderators need cross-session view |
| Trajectory hashes, efficiency baselines | Postgres | Days to weeks | Compares current session to past behavior and cohort |
| Economic graph clusters (signal 11) | Postgres | Permanent | Built offline; queried at review time |

The four Postgres rows above are **categories**, not individual tables. Each maps to
concrete schema as follows:

#### 1. Auto-generated moderation reports → mostly exists

| Piece | Status | Detail |
|---|---|---|
| `player_reports` table | **Exists** | `server/db.ts` — moderation queue already reads it |
| `createAutomatedBotReport()` | **Exists** | `server/antibot_db.ts` — 24 h dedup, NULL reporter, `reason = 'cheating'`, details prefixed `Automated bot detection:` |
| Admin queue UI | **Exists** | `moderationQueue()` surfaces open reports; no new UI needed for v1 |

**When it fires:** score ≥ 0.5 for 30 s → one row in `player_reports`
(`reporter_account_id = NULL`, `reason = 'cheating'`, details prefixed
`Automated bot detection:`).

#### 2. Account review flag, kick/ban history → partially exists

| Piece | Status | Detail |
|---|---|---|
| Ban / suspend / reason on account | **Exists** | `accounts.banned_at`, `suspended_until`, `moderation_reason` |
| Moderation action audit log | **Exists** | `account_moderation_actions` (admin ban/suspend history) |
| `bot_detection_events` table | **To create** | Per-session audit: peak score, evidence JSON, action taken (`report` / `throttle` / `kick`) |
| `accounts.bot_review_at` column | **To create** (optional) | Lightweight "needs bot review" flag; v1 can rely on open `player_reports` instead |
| Kick itself | **Exists** | `game.leave()` / WS close — just needs wiring from escalation |

**When it fires:** kick (score ≥ 1.0 for 2 min) → row in `bot_detection_events` +
 richer `player_reports` entry. Ban remains a manual admin action via existing
moderation flow.

#### 3. Trajectory hashes, efficiency baselines → mostly to create

| Piece | Status | Detail |
|---|---|---|
| `characters.last_trajectory_hash` | **To create** | One column; written on leave if session was flagged (signal 9) |
| Cohort percentile baselines (XP/h, kills/h) | **To create** | New table, e.g. `bot_cohort_stats`; populated by nightly job |
| Source data for XP/h | **Partially exists** | `characters.state` JSONB has `lifetimeXp`; `play_sessions` has duration; autosave every 30 s gives deltas without a dedicated snapshot table |
| Source data for kills/h | **To create** | No kill log in DB today; either add `kill_events` or approximate from XP (less accurate) |

**When it fires:** offline job (nightly) computes baselines; on next `join()`, an
outlier flag is loaded into `BotTracker` as pre-seeded evidence. Real-time action
still requires live signals — offline alone only triggers review.

#### 4. Economic graph clusters → mostly to create

| Piece | Status | Detail |
|---|---|---|
| IP / account linkage | **Exists** | `play_sessions.ip_address`, `accounts.created_ip`, `last_login_ip` |
| Social graph | **Exists** | `friendships`, `guilds`, `guild_members` |
| Chat activity | **Exists** | `chat_logs` (detects accounts that never chat) |
| Current market state | **Partially exists** | `world_state` key `'market'` — active listings with `sellerKey`, but no transaction history |
| Trade history | **To create** | P2P trades are sim-only today, nothing persisted |
| Mail history | **N/A** | No mail system in the game |
| Market transaction log | **To create** | Buys/sells are not logged; only current listings survive |
| `bot_economy_clusters` table | **To create** | Nightly job output: groups of accounts linked by transfers/trades/IP |

**When it fires:** nightly job builds clusters offline; result is a review flag, never
an automatic ban.

#### Implementation phases (Postgres impact)

| Phase | What ships | DB migration? |
|---|---|---|
| **1** | `BotDetector`, signal 6, signals 1/8, auto-reports | **No** — reuses `player_reports` only |
| **2** | Signals 2/7/9, kick, shadow-throttle, audit trail | **Yes** — `bot_detection_events` (+ optional trajectory hash column) |
| **3** | Signals 3/4/10, 11-light, cohort baselines | **Yes** — cohort tables; optional `kill_events` |
| **4** | Signal 11-full (mule graph) | **Yes** — trade log, market transaction log, cluster table |
| **Deferred** | Signal 12 | Sim + wire changes only |

**Rule of thumb:** if it changes more than once per second or expires within minutes,
keep it in memory. If a moderator needs it after the player disconnects, or if an
offline job produces it, persist it.

### Proposed modules

```
server/
  antibot.ts       # BotDetector: all detection logic, zero SQL
  antibot_db.ts    # persistence: events, flags, cohort snapshots
  game.ts          # thin hooks: observe on dispatch, tick, join/leave
  main.ts          # connection limits before game.join()
```

`BotDetector` mirrors the `ChatFilter` / `SocialService` split already used in
`game.ts`: the game loop calls into a service object; the service never touches
`pool.query` directly.

### Core types

```typescript
// server/antibot.ts

// Phase 1 (shipped): 'timing' | 'reaction' | 'multi_ip'
// Phase 2+: 'sequence' | 'trajectory' | 'impossible' | 'farm_ratio' | 'efficiency' | 'honeypot'
export type BotEvidenceKind =
  | 'timing' | 'sequence' | 'trajectory' | 'reaction' | 'farm_ratio'
  | 'efficiency' | 'multi_ip' | 'impossible' | 'honeypot';

export interface BotEvidence {
  kind: BotEvidenceKind;
  weight: number;
  expiresAt: number;   // sim time or Date.now(), pick one and stay consistent
  detail: string;      // human-readable, shown in admin review
}

export interface BotTracker {
  // score and distinctKinds are only valid AFTER recomputeScore(). They are stale
  // between observeAction() calls and the next onSimTick(). Never read them outside
  // of onSimTick / checkEscalation — e.g. an admin debug endpoint must call
  // recomputeScore() first.
  evidence: BotEvidence[];
  score: number;
  distinctKinds: number;
  // Escalation state: when did we first cross each threshold?
  aboveLogSince: number | null;
  aboveThrottleSince: number | null;
  aboveKickSince: number | null;
  throttleMultiplier: number;      // 1.0 = normal, 2.0 = shadow-throttle active
  throttleActiveSince: number | null;  // when throttleMultiplier became 2.0; safety valve
  autoReportSent: boolean;

  // Per-signal scratch state (memory only)
  timing: ActionTiming;
  recentActions: ActionFingerprint[];
  reactionPending: ReactionEvent | null;
  trajectoryCells: string[];    // coarse grid hashes, last 10 min
  farmMetrics: FarmMetrics;
}

// Extend ClientSession in game.ts:
//   bot: BotTracker;
```

Each connected player gets a `BotTracker` at `join()`, cleared at `leave()`. No
cross-session state is required for real-time detection except what we explicitly
load from DB on join (see below).

### Lifecycle hooks

```
main.ts                          game.ts                         antibot.ts
────────                         ───────                         ──────────
/api/login, /api/register
  └─ web Origin guard (#441) ──► 403 if programmatic (prod)

WS auth handshake
  ├─ count sessions per IP  ──►  reject if over limit (signal 6)
  └─ game.join()
       ├─ one char / account (#439) ──► reject if account already online
       ├─ create BotTracker
       ├─ load account flags ──────────►  seed evidence if flagged
       └─ load trajectory hash from DB (optional)
       │
       ▼
50 ms game loop (existing)
  ├─ dispatchMessage(session, msg)
  │    └─ antibot.observeAction(session, msg)  ──►  update buffers, add evidence
  ├─ sim tick
  │    └─ antibot.onSimTick(session, sim)      ──►  prune expired evidence,
  │                                                 recompute score, check thresholds
  └─ snapshot send
       │
       ▼
game.leave()
  └─ antibot.onLeave(session)  ──►  flush summary to DB if score was elevated,
                                    save trajectory hash
```

**`observeAction`** runs inside `dispatchMessage` after field validation. For signals
1, 2, 8: timestamp and fingerprint **before** the `sim.*` call. For signal 7: inspect
**sim rejection** (wrap call or check return path) — the sim already validates; the
antibot layer counts repeated hard failures.

**`onSimTick`** runs once per tick per online session (or only for sessions with
non-empty evidence to save CPU). It:
1. Prunes expired evidence (`expiresAt < now`).
2. Recomputes `score` and `distinctKinds`.
3. Updates escalation timers (`aboveLogSince`, etc.).
4. Fires responses when thresholds are sustained (see below).

**`onLeave`** persists a compact summary if the session was ever flagged. Drop
all in-memory buffers.

### Composite score computation

Keep this pure and testable:

```typescript
function recomputeScore(tracker: BotTracker, now: number): void {
  tracker.evidence = tracker.evidence.filter(e => e.expiresAt > now);
  tracker.score = tracker.evidence.reduce((s, e) => s + e.weight, 0);
  tracker.distinctKinds = new Set(tracker.evidence.map(e => e.kind)).size;
}

function addEvidence(tracker: BotTracker, ev: BotEvidence): void {
  // Keep only the strongest piece per kind; silently discard weaker updates.
  const existing = tracker.evidence.find(e => e.kind === ev.kind);
  if (existing && existing.weight >= ev.weight) return;
  tracker.evidence = tracker.evidence.filter(e => e.kind !== ev.kind);
  tracker.evidence.push(ev);
}
```

Signal detectors call `addEvidence()` when they fire; they never touch escalation
logic directly. This keeps each signal self-contained and easy to unit-test in
Vitest without a running game loop.

### Escalation and responses

A small state machine inside `onSimTick`, separate from individual signals:

```typescript
// Returns the action that game.ts must perform — antibot.ts never calls game.kick()
// directly (would create a circular import antibot.ts ↔ game.ts).
// Caller pattern in game.ts:
//   const action = antibot.onSimTick(session, sim, now);
//   if (action === 'kick') game.kick(session, 'disconnected');
type BotAction = 'none' | 'kick';

function checkEscalation(tracker: BotTracker, session: ClientSession, now: number): BotAction {
  const { score, distinctKinds } = tracker;

  if (score >= 0.5 && distinctKinds >= 2) {
    tracker.aboveLogSince ??= now;
  } else {
    tracker.aboveLogSince = null;
  }

  if (score >= 0.8 && distinctKinds >= 2) {
    tracker.aboveThrottleSince ??= now;
  } else {
    tracker.aboveThrottleSince = null;
    tracker.throttleMultiplier = 1.0;
    tracker.throttleActiveSince = null;
  }

  // Same ≥ 2 kinds guard as log/throttle. A honeypot hit alone (score = 1.0,
  // kinds = 1) shadow-throttles + reports but never auto-kicks; admin confirms.
  if (score >= 1.0 && distinctKinds >= 2) {
    tracker.aboveKickSince ??= now;
  } else {
    tracker.aboveKickSince = null;
  }

  if (tracker.aboveLogSince && now - tracker.aboveLogSince >= 30_000 && !tracker.autoReportSent) {
    tracker.autoReportSent = true;
    void createAutomatedBotReport(session, tracker)  // antibot_db.ts
      .catch(err => console.error('[antibot] report insert failed', err));
  }

  if (tracker.aboveThrottleSince && now - tracker.aboveThrottleSince >= 60_000) {
    tracker.throttleMultiplier = 2.0;
    tracker.throttleActiveSince ??= now;
  }

  // Safety valve: 30 min of sustained throttle without reaching kick → force kick
  // path. A legitimate player silently degraded for 30 min is worse than a kick
  // that lands in the admin review queue.
  const MAX_THROTTLE_MS = 30 * 60_000;
  if (tracker.throttleActiveSince && now - tracker.throttleActiveSince >= MAX_THROTTLE_MS) {
    tracker.aboveKickSince ??= now;
  }

  if (tracker.aboveKickSince && now - tracker.aboveKickSince >= 120_000) {
    // Phase 2: flagAccountForReview(session.accountId, summarize(tracker))
    return 'kick';  // game.ts calls game.leave(session, 'disconnected')
  }

  return 'none';
}
```

Escalation timers reset when the score drops. A player who briefly spikes then
returns to normal play never reaches kick.

### Shadow-throttle integration

The throttle multiplier must affect sim outcomes silently. Two options, in order
of preference:

1. **GCD stretch in command validation** (inside `dispatchMessage` or a sim
   wrapper): before accepting a combat command, check
   `session.bot.throttleMultiplier` against the player's last action time.
   Reject the command silently (same as signal 7: no error message).

2. **Sim-level modifier** (if GCD checks are centralized in sim): pass
   `gcdScale: tracker.throttleMultiplier` into the sim call. Requires a sim
   change; prefer option 1 if GCD is already validated server-side per command.

Either way, the client receives no feedback that throttling is active.

> **Maximum throttle duration.** As long as the score stays ≥ 0.8, shadow-throttle
> has no inherent expiry. Cap at **30 minutes** via `throttleActiveSince` on
> `BotTracker` (see `checkEscalation` above): after 30 min of continuous throttle
> without reaching the kick threshold, `aboveKickSince` is force-set and the normal
> kick path takes over within 2 min. This ensures the system always converges to a
> decision rather than leaving a player in limbo indefinitely.

### What gets persisted to Postgres

Do **not** write every evidence add to the DB. Persist only at escalation
boundaries and for offline analysis.

**On auto-report (score ≥ 0.5 for 30 s):**
Insert into `player_reports` using the same pattern as
`createSuspiciousRegistrationReport` in `moderation_db.ts`: `reporter_account_id
= NULL`, `reason = 'cheating'`, details prefixed with a system marker, e.g.
`Automated bot detection:` followed by the evidence summary. This lands in the
existing moderation queue with no admin UI changes required for v1.

> **Cross-session deduplication.** `autoReportSent` is per-session and resets on
> every reconnect — a persistent bot reconnecting hourly would flood the queue with
> one report per session. Before inserting, check whether an open `player_reports`
> row already exists for this `account_id` with `reason = 'cheating'` and the
> automated marker in the last 24 h; skip the insert if so. Rate: at most one
> automated report per account per day.

**On kick (score ≥ 1.0 for 2 min):**
- Set an account-level review flag (new `accounts.bot_review_at` column, or a
  lightweight `bot_detection_events` table).
- Insert a second, richer report with full evidence snapshot.

**On leave (if session was ever flagged):**
- Append one row to `bot_detection_events` (account_id, character_id, play_session_id,
  peak_score, evidence_summary JSONB, created_at). Cheap audit trail.
- Optionally update `characters.last_trajectory_hash` for cross-session comparison
  (signal 9).

**Offline jobs (signals 4, 11):**
- Nightly job reads `play_sessions`, `characters.state` (`lifetimeXp` deltas), and
  (once added) kill / trade / market transaction logs.
- Writes cohort percentile baselines and cluster flags to dedicated tables.
- On next `join()`, load any active offline flag into `BotTracker` as pre-seeded
  evidence (weight 0.3, TTL 24 h). Real-time signals still required for
  automatic action; offline flags alone only trigger admin review.
- **Signal 11 full mule detection is blocked** until trade and market transaction
  logging ships; until then, limit offline jobs to IP/social/chat/quest heuristics.

Example schema sketch (not final):

```sql
CREATE TABLE bot_detection_events (
  id            bigserial PRIMARY KEY,
  account_id    int NOT NULL REFERENCES accounts(id),
  character_id  int REFERENCES characters(id),
  play_session_id int REFERENCES play_sessions(id),
  peak_score    numeric(4,2) NOT NULL,
  evidence      jsonb NOT NULL,   -- [{kind, weight, detail}, ...]
  action_taken  text NOT NULL,    -- 'report' | 'throttle' | 'kick'
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bot_detection_events_account_idx ON bot_detection_events (account_id, created_at DESC);
```

SQL lives in `antibot_db.ts`; DDL added to `db.ts` `SCHEMA` like every other table.

### Connection limits (signal 6) and account cap (PR #439)

Neither needs a `BotTracker`. **PR #439** handles the account cap inside
`GameServer.join()`. **Signal 6** (per IP) still belongs in `main.ts` before
`game.join()`:

```typescript
const ip = requestMetadata(req).ip;
if (countSessionsByIp(ip) >= MAX_WS_PER_IP) { ws.close(1008); return; }
// account cap: PR #439 in game.join() — do not duplicate here
```

Counters for IP are derived from `game.clients` (`ip` stored on `ClientSession`
at WS auth — not present today; must be added). Increment/decrement is implicit
via join/leave. No DB, no `BotEvidence` for either guardrail.

### CPU budget

At 20 Hz, per-session work must stay cheap. Guidelines:

- **Signal 1, 8:** O(1) per action (ring buffer push + stdDev on ≤ 20 samples).
- **Signal 2:** O(N) on action, N ≤ 20.
- **Signal 9:** sample position every 2 s, not every tick (accumulate sim time).
- **`onSimTick`:** skip sessions with empty evidence and zero escalation timers.
- **Offline signals:** zero per-tick cost; run as a cron/nightly script.

With 200 players online, this is well within budget if we avoid per-tick DB calls
and per-tick heavy math.

### Admin review surfacing

v1 requires no new admin UI beyond what exists:

- Auto-reports appear in the moderation queue (`moderationQueue` in
  `moderation_db.ts`) with `reason = 'cheating'` and a parseable details block.
- v2 adds an admin endpoint (`GET /admin/api/bot-review/:accountId`) reading
  from `bot_detection_events`, returning the compact summary described in
  Admin observation mode above.

> **False-positive feedback loop (v2).** When a moderator dismisses a bot report,
> record the dismissal against each evidence `kind` present. A signal with ≥ 5
> admin dismissals should be flagged for weight/threshold recalibration. Without
> this loop the system has no way to self-correct noisy signals short of a manual
> code review.

> **Meta-monitoring (v2).** Track an hourly count of sessions crossing each
> escalation threshold (from `bot_detection_events`). A sudden spike — e.g. > 20 %
> of online sessions flagged in one hour — almost certainly indicates a
> miscalibrated signal, not a real bot wave. A simple Postgres query + alert to a
> dev Slack channel suffices; no external monitoring infra required.

### Testing strategy

- **Unit (Vitest):** `tests/antibot.test.ts` — 31 tests covering `createTracker`,
  `addEvidence`, `recomputeScore`, Signals 1 and 8 (bot / human cases), escalation
  state machine (log / throttle / kick timers, safety valve, honeypot single-kind
  guard). `tests/antibot_db.test.ts` — 7 tests (dedup, insert, SQL params).
  No WebSocket, no live DB.
- **E2E:** `scripts/antibot_e2e.mjs` — no `ALLOW_DEV_COMMANDS=1` needed. Opens
  5 background sessions + 1 bot session from `127.0.0.1` (triggers `multi_ip`),
  sends `attack` every 500 ms (triggers Signal 1, stdDev ≈ 0), waits 38 s, then
  queries Postgres to assert the auto-report was created.

Add tests alongside each signal as it lands.

---

## Graduated Responses

Do not ban immediately — that alerts the bot operator and they adapt their script.
Prefer silent escalation:

| Score / duration | Response | Effect on bot |
|---|---|---|
| Score ≥ 0.5, ≥ 2 evidence, 30 s | Log + auto moderation report | None (invisible) |
| Score ≥ 0.8, ≥ 2 evidence, 60 s | **Shadow-throttle**: silent GCD ×2 | Bot slows down without noticing |
| Score ≥ 1.0, ≥ 2 evidence, 2 min | Kick + flag account for admin review | Reconnect possible, but account marked |
| Admin confirmation | Ban or suspend | Definitive |

Shadow-throttle is the standard MMO technique: the bot thinks it is working normally,
it just farms half as fast, reducing impact without revealing that detection is active.

**Shadow-throttle precautions:**
- Apply only when ≥ 2 evidence types agree (avoid throttling on a single noisy signal)
- Prefer very high scores (≥ 0.8) or accounts already correlated by other signals
- A false positive here silently degrades a real player's experience:
  kick + admin review is preferable to prolonged throttle when doubt remains

---

## Implementation Phases

Grouped by what the codebase can support today without new economy logging.

| Phase | Goal | Signals / scope | Postgres impact | Status |
|---|---|---|---|---|
| **Phase 1 — Real-time guardrails, no migration** | Stop cheap bot waves; collect moderator-visible evidence | **`BotDetector` shell**, signal **6**, 1, 8; auto-reports. Account cap + web login: PRs **#439**, **#441** | None | **✅ Shipped** |
| **Phase 2 — Behavioral depth + audit trail** | Catch scripted bots; review across reconnects | 2, 7 (rejection hooks), 9; shadow-throttle; kick; `bot_detection_events`; optional trajectory hash | New audit table (+ optional columns) | Planned |
| **Phase 3 — Offline analytics (conditional)** | Outlier farming + weak economy heuristics | 3, 4 (XP/h from saves; kills/h needs `kill_events`); 10; 11-light (IP/social/chat/quest only) | Cohort tables; optional kill log | Planned |
| **Phase 4 — Full economy graph (blocked on logging)** | Mule-network detection | 11-full after trade + market transaction logs | Trade log, market log, `bot_economy_clusters` | Blocked |
| **Deferred** | Honeypots | 12 — requires server-only entities + snapshot filtering | Sim + wire changes | Deferred |

**Recommended rollout:** Phase 1 first (highest ROI, zero schema change). Phase 2 once
thresholds are calibrated on real traffic. Phase 3 only after enough save history for
cohorts. Phase 4 and signal 12 are explicitly gated on prerequisites listed above.

---

## Suggested Implementation Priority

Order reflects **code readiness** (see Applicability at a glance). Build the shell
before individual detectors so each signal plugs in without rework.

1. **PRs [#439](https://github.com/levy-street/world-of-claudecraft/pull/439) + [#441](https://github.com/levy-street/world-of-claudecraft/pull/441)** — hard guardrails (account cap, web Origin on auth). Not part of `BotDetector`.
2. ✅ **`BotDetector` shell + escalation state machine** — `server/antibot.ts`, `ClientSession.bot: BotTracker`; no SQL.
3. ✅ **Signal 6** (WS per IP) — `session.ip`, `ipSessionCounts` map, soft evidence in `join()`, hard reject in `main.ts`.
4. ✅ **Signal 1** (timing variance) — `COMBAT_CMDS` set, ring buffer in `observeAction`. Harmonic detection (item *Complement*) not yet done.
5. ✅ **Signal 8** (reaction times) — `observeEvent` + `observeAction`, Phase 1 threshold 150 ms without RTT correction.
6. ✅ **Auto-reports** — `server/antibot_db.ts`; 24 h dedup; lands in existing moderation queue.
7. **Signal 2** (sequence repetition) — abstract fingerprint via `templateId` / `zoneAt`.
8. **Signal 7** (impossible actions) — instrument sim **rejections** (range, dead target,
   LoS); not speedhack (already server-authoritative movement).
9. **Signal 9** (trajectories) — in-memory first; persist hash in Phase 2.
10. **Phase 2 persistence** — `bot_detection_events`, kick wiring, shadow-throttle.
11. **Signals 3 & 4** (offline) — XP/h from autosave deltas; defer kills/h until
    `kill_events` exists; always cohort-scoped.
12. **Signal 10** (target selection) — after party false-positive policy is defined.
13. **Signal 11-light** — IP / chat / quest heuristics (cross-account clusters post-#439).
14. **Signal 11-full + Phase 4** — blocked until trade and market transaction logging.
15. **Signal 12** (honeypots) — deferred; requires server-only entities.
