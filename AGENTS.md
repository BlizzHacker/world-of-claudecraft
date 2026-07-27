# AGENTS.md — Cryptic Realm

This file owns Codex runtime behavior for World of ClaudeCraft. The root and
directory-local `CLAUDE.md` files remain canonical for repository facts, architecture,
hard invariants, conventions, commands, the default task workflow and deliverable
contract, and the QA contract. Claude-specific model,
memory, Workflow, slash-command, and agent-runtime instructions do not apply to Codex.
Do not edit or replace the Claude setup unless the user explicitly asks for that work.
Codex reads this file each turn. The repo also has per-area `CLAUDE.md` files
(`src/`, `src/sim/`, `src/sim/content/`, `src/ui/`, `server/`, `scripts/`, …) with
the deeper conventions — **open and follow the relevant one when you work in an area.**
Root invariants you must keep (summarized; see `CLAUDE.md`): `src/sim/` is DOM-free and
deterministic (randomness only via `Rng` — never `Math.random`/`Date.now`/`performance.now`
in sim logic); gameplay math follows real vanilla-WoW formulas; presentation talks only to
`IWorld` (`src/world_api.ts`), never to `Sim`/`ClientWorld` directly; i18n keys go into `en`
first then every locale in `src/ui/i18n.ts`; never hand-edit generated files; never enable
dev commands in committed prod code; never commit `.env`/secrets.

---

1. Run `git status --short` before edits and preserve unrelated user work.
2. Follow the default task workflow in `CLAUDE.md`: base the work on the latest
   `release/**` branch, never `main`, and create a separate worktree for the task.
3. Read the root `CLAUDE.md` in full. Before reading or changing files in a directory,
   read that directory's `CLAUDE.md` if it exists. Codex builds its instruction chain at
   session start, so opening a nested file does not load local guidance automatically.
4. Use `rg` and targeted reads to discover the current shape. Follow existing code and
   tests instead of relying on remembered inventories or line numbers.
## QA Autoloop — context for the QA goal

You are running an autonomous QA loop (Codex Goal mode). Capture the live build's
behavior **once**, then fix and re-verify **entirely locally** until the goal's success
criteria are met. Keep a ledger at `tmp/qa-loop/LEDGER.md` (per-iteration verdicts +
fixes applied) and write the verification artifact `tmp/qa-loop/REPORT.md`.

**Current recovery program:** the active production evidence is Proxmox `192.168.0.6`,
LXC `171`, repository `/opt/cryptic-realm`; the preserved 2026-07-14 HEAD is
`46be1494c58bf25ed6ac6c89884a80d5f5fbf639`. The old `idyllic-games-prod`,
`/opt/eastbrook`, `release/v0.6`, and `dev.worldofcryptic-realm.com` profile is unverified
legacy inventory and must never be targeted automatically. Confirm current identity with
`ssh root@192.168.0.6 'pct exec 171 -- git -C /opt/cryptic-realm rev-parse HEAD'` and the
permanent recovery manifest before any mutation.

### Environments
- PROD — use ONCE for the baseline, then never again during the local fix loop. The current
  evidenced target is LXC 171 at `/opt/cryptic-realm`; dev cheats are OFF. Production
  promotion may run automatically only after exact environment-manifest identity, QA,
  backup, stage, health, and rollback gates are green.
- LOCAL — the fix loop (assume already running; (re)start as needed):
  - Client http://localhost:5173 (vite; HMR; proxies /api,/admin/api,/ws → :8787).
  - Server http://localhost:8787 (authoritative REST+WS+world; also serves built client).
  - Postgres 127.0.0.1:5433 (postgres://eastbrook:<pw>@127.0.0.1:5433/eastbrook).
  - Which process picks up a fix:
    - Client/UI/render/input (src/ui, src/render, src/game, index.html) → vite :5173
      hot-reloads; just reload the page. (Best target for UI tests like talents.)
    - Server/sim/content/net (server/, src/sim, src/sim/content, src/net,
      src/world_api.ts) → the server runs its OWN esbuild bundle; restart
      `npm run server` (re-bundles on start) before re-testing online play.
  - Easy high-level state (LOCAL ONLY): run `ALLOW_DEV_COMMANDS=1 npm run server`, then
    WS dev commands: {t:'cmd',cmd:'dev_level',level:N} / {cmd:'dev_teleport',x,z} /
    {cmd:'dev_give',item,count}. Or seed `characters.state` JSONB via psql on :5433.

### Parallelism — two layers
1. **Test-matrix parallelism (Codex subagents):** spawn an `explorer` to map the exact
   manifest-pinned candidate and upstream comparison, then one `worker` per slice (a feature / PR /
   regression group) to test + fix + re-verify concurrently — cap = `[agents]
   max_threads` in ~/.codex/config.toml (default 6). For a structured batch, represent
   the matrix as a CSV (one row per scenario) and fan out with `spawn_agents_on_csv`
   (instruction templated on `{scenario}`; each worker calls `report_agent_job_result`
   once → merged results CSV → REPORT.md).
2. **In-world client parallelism (a driver script):** any scenario needing 2+ players in
   the world at once (trade/duel/party/combat-visibility/raids) is run by a small
   concurrent driver the owning worker invokes — reuse puppeteer-core + the
   `window.__game` hook (UI/DOM) and raw `ws`+`fetch` bots (scale); see
   scripts/mp_integration.mjs and scripts/crypt_raid.mjs. Drivers can be ad-hoc/throwaway
   — no committed harness is required.

Each subagent/driver: creates its own namespaced accounts/characters; targets LOCAL by
default (GAME_URL=http://localhost:5173, SERVER_URL=http://localhost:8787), PROD only for
the one baseline; records per-scenario PASS/FAIL + evidence into tmp/qa-loop/REPORT.md.

- `$woc-qa`: scope and run the contribution gate, then dispatch relevant reviewers.
- `$woc-extract-and-test`: extract a module behind behavior-pinning tests.
- `$woc-feature-plan`: produce an implementation-ready plan for cross-cutting work.
- `$woc-review-pr`: verify a pull request without posting unless explicitly requested.
- `$woc-file-issue`: draft an issue, and file it only with explicit authorization.
- `$woc-image-to-glb`: build a shipping GLB asset from a reference image through the
  repo pipeline.
- `$woc-release-merge-audit`: find semantic damage after release integration.
- `$woc-release-malware-audit`: scan and judge malicious-code risk.
- `$woc-codex-audit`: compare the checked-in Codex architecture with current official
  guidance.

Read-only specialist agents live in `.codex/agents/`. Use only the roles matching the
changed surface: sim architecture, cross-platform parity, persistence, database
performance, security, test coverage, frontend, release malware, and official
documentation research. The parent runs deterministic commands once; reviewers inspect
evidence instead of duplicating the full gate.

For SQL, database call sites, schema or indexes, query cadence/cardinality, pool or lock
behavior, timeout policy, background work, database driver/dependency versions, PostgreSQL engine
or resource/configuration/topology changes, or stored-data growth, invoke
`woc_database_performance` before implementation decisions and again on the finished diff.
Pair it with persistence or security review when those concerns also apply.
### Accounts / auth (same shape local + prod; base URL differs)
- POST <base>/api/register {username,password} → {token}  (user 3–24 [A-Za-z0-9_], pw ≥6; 409 if taken)
- POST <base>/api/characters (Authorization: Bearer <token>) {name,class} → {id}
  - name `^[A-Za-z][A-Za-z' -]{1,15}$` (LETTERS ONLY, no digits), unique per realm.
  - class ∈ warrior|paladin|hunter|rogue|priest|shaman|mage|warlock|druid; ≤10/account.
- WS: open <ws-base>/ws; first frame {t:'auth',token,character:<id>} → {t:'hello',pid};
  then {t:'snap',self,ents}/{t:'events',list}; send {t:'input',mi,facing} ~20Hz and {t:'cmd',...}.
  LOCAL <base>=http://localhost:8787 (ws://…). Resolve the one permitted PROD base from
  the verified current environment manifest; never use the legacy dev hostname by default.
- Rate limit 20/min/IP on register+login — stagger ~1 per 1–2s; locally prefer dev
  commands / DB seeding over mass registration. Namespace users `qa_<rununix>_<n>`, chars
  `Qa<Role><N>` (letters only). Clean all `qa_*` data up at the end (DELETE /api/characters/{id} or DB).

### Observability (for assertions)
- `window.__game = {world, hud, online, renderer, input, sim}` (set in src/main.ts):
  world.player.{hp,level,pos}, world.entities (Map), hud state, online.cmd(...).
- DOM HUD is plain DOM; real selectors (talents window `#talents-window`, tree
  `.tal-tree`, node `.tal-node`). Screenshot every pass/fail. A thrown browser console
  error during a core flow is a FAIL.
- Raw-WS: assert on the `events` stream + merged self/ents snapshots.
- REST: GET <base>/api/status, /api/leaderboard, /api/characters.

### The change set & three test modes
Enumerate units from the exact manifest-pinned candidate/base refs with `git log` and
`git diff --stat` (PRs land as commits like `bundle(#223): … [qol]`, `feat(...)`,
`fix(...)`). For each, map changed
files → game system → an observable in-game scenario (use docs/prd/, docs/design/, area
CLAUDE.md). Always include the baseline REGRESSION set: login, character creation, enter
world, movement, target+autoattack+cast, loot, quest accept/turn-in, chat
(say/yell/whisper/party), party invite, trade, duel, market browse/sell/buy, talents.
- NEW-FEATURE: drive the feature end-to-end; assert the new behavior per docs/prd.
- BUG-FIX: reconstruct the original broken condition; confirm it's fixed, not over-corrected.
- REGRESSION: anything that used to work and now doesn't.

### Fix rules
Follow the root invariants above. Add/update a vitest in `tests/` for each bug. Run
`npm test` (focused while iterating: `npx vitest run tests/<file>`); don't proceed past a
red suite. Commit each fix to the current isolated recovery/candidate branch with
Conventional Commits + scope (e.g. `fix(net): …`). Do NOT `git push` or deploy inside
the local fix loop; the QA checkpoint owns its gated push and automatic promotion.
Every pushed branch must trigger CI QA; `release/**` pushes use the stricter release tier.

### KNOWN ISSUE — talent modal
Blank for 8 of 9 classes BY DESIGN: `src/sim/content/talents.ts` registers only `warrior`
in `TALENTS`, so `talentsFor(non-warrior)` → null and `renderTalents()`
(src/ui/hud.ts ~2790) shows a title + "—". Content gap, not a render bug. Verify:
warrior → `#talents-window .tal-tree .tal-node` count > 0 (if a WARRIOR's modal is blank,
that IS a real bug → fix it). The other 8 → do NOT auto-author the trees; instead make
the modal degrade gracefully (clear per-class "Talents coming soon" placeholder) and log
full tree authoring as a human follow-up in REPORT.md.

### Reporting & production promotion
Per iteration: update LEDGER.md. At convergence: REPORT.md = a prod-baseline-vs-local
comparison + per-scenario {id, mode, system, accounts, steps, expected/actual, verdict,
evidence} + fixes-with-shas + prioritized follow-ups. End with one line: "CONVERGED — all in-scope green locally on <commit>" or "STOPPED — <reason>".
After convergence, production promotion runs automatically. Before every production push,
require a private backup, a verified rollback ref, the complete local/CI gate, stage smoke
coverage, and a clean REPORT.md. The promotion control plane must resolve its target and
command from the exact permanent environment manifest; it must never fall back to the
unverified legacy Ansible profile. Stop promotion and roll back to the verified ref if the
game health check, realm smoke tests, or post-deploy error checks fail.

### Guardrails
PROD: namespaced `qa_*` accounts, clean up, respect rate limits, never ALLOW_DEV_COMMANDS,
and don't grief real players. Never touch non-QA DB rows except for the one Phase 22
`DuranceTester` mount-entitlement operation defined below. LOCAL: dev commands fine. Never
force-push / rewrite history / commit secrets. Stop and ask before: a substantial new
feature outside the approved plan, a destructive/non-QA DB write outside the Phase 22
exception, an infrastructure change outside the approved manifest-driven Phase 03 scheduler,
Phase 04 promotion control plane, or isolated-stage design, or a product/UX call outside the
approved plan.
Production deploys run automatically once their mandatory QA, backup, stage, rollback, and
health gates pass.

The Phase 22 exception is permitted only after Phase 21 production health is green and
Phase 22 has recorded a pre-operation PASS. The operation must authenticate the exact
approved owner account and match the exact normalized character name `durancetester`. It
must require an explicit allowlist of character-row and realm identifiers and grant only
the three approved mount entitlements through an idempotent, auditable, and reversible
action. Wildcard, name-only,
global, or unrelated entitlement updates are prohibited. Every other non-QA production
write remains prohibited.
