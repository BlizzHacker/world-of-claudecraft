// Antibot behavioral detection e2e against a running game server + Postgres.
//
// Test A — action timing variance + concurrent sessions per IP (multi_ip)
//   Does NOT need ALLOW_DEV_COMMANDS=1.
//   Scenario: 5 background accounts hold ipCount at 5.
//   Timing bot connects as 6th → multi_ip evidence (0.4).
//   Sends attack every 500 ms → stdDev ≈ 0 ms → timing evidence (0.7).
//   Score 1.1, 2 kinds → auto-report after 30 s.
//
// Test B — reaction time + concurrent sessions per IP (multi_ip)
//   Requires the server to run with ALLOW_DEV_COMMANDS=1.
//   Enable: ANTIBOT_E2E_DEVMODE=1 node scripts/antibot_e2e.mjs
//   Reuses the 5 background sessions from Test A.
//   Mage bot connects as 6th → multi_ip evidence (0.4).
//   dev_level 20, dev_teleport to Wolf Run (zone 1).
//   Casts Fireball on wolves; on each castStop responds in < 5 ms.
//   Median reaction ≈ 1–3 ms (bot-like) → reaction evidence (0.6).
//   Score 1.0, 2 kinds → auto-report after 30 s.
//
// Usage:
//   Test A only (no dev commands needed):
//     npm run server
//     node scripts/antibot_e2e.mjs
//
//   Test A + B (Test B requires ALLOW_DEV_COMMANDS on the server):
//     ALLOW_DEV_COMMANDS=1 npm run server
//     ANTIBOT_E2E_DEVMODE=1 node scripts/antibot_e2e.mjs
//
// If the server is elsewhere: SERVER_URL=http://host:port node ...
// DATABASE_URL is loaded from .env (copy .env.example if needed).
import WebSocket from 'ws';
import pg from 'pg';

try { process.loadEnvFile?.(); } catch { /* .env is optional */ }

const BASE    = process.env.SERVER_URL ?? 'http://localhost:8787';
const WS_BASE = BASE.replace(/^http/, 'ws');
// Must match MAX_WS_PER_IP_SOFT on the server (env, default 5).
const SOFT_THRESHOLD    = Number(process.env.MAX_WS_PER_IP_SOFT ?? '5');
const ATTACK_INTERVAL   = 500;   // ms — perfectly regular, near-zero variance
const ATTACK_PHASE_MS   = 12_000;
const REPORT_WAIT_MS    = 26_000; // 30 s window starts after ~4 s of attacks
const CAST_CYCLES       = 10;    // Fireballs; reaction-time check needs ≥ 10 castStop events
const CAST_LOOP_MS      = 90_000;  // time budget for the cast loop (wolf respawn 25 s; 7 wolves + respawn + 3 = ~53 s)
const CAST_WAIT_MS      = 35_000; // 30 s + buffer after reaction evidence fires (~15 s in)
const WOLF_X            = -15;    // center of the zone 1 forest_wolf camp (radius 22, count 7)
const WOLF_Z            = 55;
const DEV_MODE          = process.env.ANTIBOT_E2E_DEVMODE === '1';

let pass = 0, fail = 0;

function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else       { fail++; console.log(`  FAIL ${name}${detail ? '  ← ' + detail : ''}`); }
}

async function api(path, body, token) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// Base WS client. Subclasses may override onMessage().
class Client {
  constructor() { this.pid = -1; this.connected = false; this.closed = false; this._ws = null; }

  connect(token, characterId) {
    return new Promise((resolve, reject) => {
      this._ws = new WebSocket(`${WS_BASE}/ws`);
      const to = setTimeout(() => reject(new Error('connect timeout after 8s')), 8_000);
      this._ws.on('message', (data) => {
        const msg = JSON.parse(String(data));
        if (msg.t === 'hello') { this.pid = msg.pid; this.connected = true; clearTimeout(to); resolve(); }
        this.onMessage(msg);
      });
      this._ws.on('open',  () => this._ws.send(JSON.stringify({ t: 'auth', token, character: characterId })));
      this._ws.on('close', () => { this.connected = false; this.closed = true; });
      this._ws.on('error', reject);
    });
  }

  onMessage(_msg) {}  // override in subclasses

  cmd(p)  { if (this.connected) this._ws.send(JSON.stringify({ t: 'cmd', ...p })); }
  close() { this._ws?.close(); }
}

// Extended client for reaction-time testing.
// Tracks hostile entities from snap messages and resolves Promises on castStop.
// Only keeps hostiles within CAST_RANGE yards so we never pick an out-of-range target.
const CAST_RANGE = 28; // slightly under fireball's 30-yard range

class ReactiveBotClient extends Client {
  constructor() {
    super();
    this._selfX = 0;
    this._selfZ = 0;
    this._knownHostiles = new Map(); // entityId → true (alive + hostile + in range)
    this._castStopResolvers = [];
    this.castStopCount = 0;
  }

  onMessage(msg) {
    if (msg.t === 'snap') {
      if (msg.self) { this._selfX = msg.self.x ?? this._selfX; this._selfZ = msg.self.z ?? this._selfZ; }
      for (const e of (msg.ents ?? [])) {
        const d = Math.hypot((e.x ?? 0) - this._selfX, (e.z ?? 0) - this._selfZ);
        if (e.h && !e.dead && d <= CAST_RANGE) this._knownHostiles.set(e.id, { x: e.x ?? 0, z: e.z ?? 0 });
        else                                    this._knownHostiles.delete(e.id);
      }
    }
    if (msg.t === 'events') {
      for (const ev of (msg.list ?? [])) {
        // castStop for this player's character — react immediately
        if (ev.type === 'castStop' && ev.entityId === this.pid) {
          this.castStopCount++;
          const resolver = this._castStopResolvers.shift();
          if (resolver) resolver();
        }
      }
    }
  }

  get hostiles() { return [...this._knownHostiles.keys()]; }

  // Face toward an entity before casting (sim requires MELEE_ARC ≈ 126° half-arc).
  faceTarget(targetId) {
    const pos = this._knownHostiles.get(targetId);
    if (!pos) return;
    const facing = Math.atan2(pos.x - this._selfX, pos.z - this._selfZ);
    if (this.connected) this._ws.send(JSON.stringify({ t: 'input', facing }));
  }

  // Returns a Promise that resolves when the next castStop arrives for this pid.
  waitForCastStop(timeoutMs = 4_000) {
    return new Promise((resolve, reject) => {
      let resolver;
      const to = setTimeout(() => {
        const idx = this._castStopResolvers.indexOf(resolver);
        if (idx !== -1) this._castStopResolvers.splice(idx, 1);
        reject(new Error(`castStop not received within ${timeoutMs} ms`));
      }, timeoutMs);
      resolver = () => { clearTimeout(to); resolve(); };
      this._castStopResolvers.push(resolver);
    });
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL required — copy .env.example to .env for local dev.');
    process.exit(1);
  }

  const pool       = new pg.Pool({ connectionString: dbUrl });
  const bgClients  = [];  // 5 background sessions, kept across both tests
  const uniq       = Date.now().toString(36);
  const alpha      = uniq.replace(/[0-9]/g, d => 'abcdefghij'[Number(d)]).slice(-6);
  const BG_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, SOFT_THRESHOLD);

  // Helper: query DB for the latest automated bot detection report for an account.
  async function latestBotReport(accountId) {
    const r = await pool.query(
      `SELECT id, details FROM player_reports
       WHERE reporter_account_id IS NULL
         AND reported_account_id = $1
         AND reason = 'cheating'
         AND details LIKE 'Automated bot detection:%'
         AND created_at > now() - interval '5 minutes'
       ORDER BY id DESC LIMIT 1`,
      [accountId],
    );
    return r.rows[0] ?? null;
  }

  try {
    // ── Shared setup: 5 background sessions ────────────────────────────────
    console.log(`\n[setup] registering ${SOFT_THRESHOLD} background accounts…`);
    for (const letter of BG_LETTERS) {
      const r = await api('/api/register', { username: `abg${letter}${uniq}`, password: 'hunter22' });
      const c = await api('/api/characters', { name: `Bg${letter}${alpha}`, class: 'warrior' }, r.token);
      const client = new Client();
      await client.connect(r.token, c.id);
      bgClients.push(client);
      console.log(`  bg session ${bgClients.length}: ${c.name} (pid ${client.pid})`);
    }
    check(`${SOFT_THRESHOLD} background sessions connected`, bgClients.length === SOFT_THRESHOLD);

    // ────────────────────────────────────────────────────────────────────────
    // Test A — action timing variance + multi_ip
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n══ Test A: action timing variance + multi_ip ══');

    const timingUsername = `atimingbot${uniq}`;
    const timingReg  = await api('/api/register', { username: timingUsername, password: 'hunter22' });
    const timingChar = await api('/api/characters', { name: `Tim${alpha}`, class: 'warrior' }, timingReg.token);
    const timingRow  = await pool.query('SELECT id FROM accounts WHERE username = $1', [timingUsername]);
    const timingAccountId = timingRow.rows[0].id;

    const timingBot = new Client();
    await timingBot.connect(timingReg.token, timingChar.id);
    check(`timing bot connected: ${timingChar.name} pid ${timingBot.pid} (6th session → multi_ip evidence)`, timingBot.connected);

    console.log(`  sending attack every ${ATTACK_INTERVAL} ms for ${ATTACK_PHASE_MS / 1000} s…`);
    const iv = setInterval(() => timingBot.cmd({ cmd: 'attack', entityId: 0 }), ATTACK_INTERVAL);
    await sleep(ATTACK_PHASE_MS);
    clearInterval(iv);
    check('timing bot still connected after attack phase', timingBot.connected);

    console.log(`  waiting ${REPORT_WAIT_MS / 1000} s for auto-report…`);
    await sleep(REPORT_WAIT_MS);

    const reportA = await latestBotReport(timingAccountId);
    check('Test A: auto-report created', !!reportA);
    if (reportA) {
      check('Test A: report contains timing evidence',  reportA.details.includes('timing'));
      check('Test A: report contains multi_ip evidence', reportA.details.includes('multi_ip'));
      console.log('\n  details (A):\n' + reportA.details.split('\n').map(l => '    ' + l).join('\n'));
    }

    timingBot.close();
    // Give the server a moment to process the disconnect so ipCount returns to 5.
    await sleep(300);

    // ────────────────────────────────────────────────────────────────────────
    // Test B — reaction time + multi_ip
    // ────────────────────────────────────────────────────────────────────────
    if (!DEV_MODE) {
      console.log('\n══ Test B: reaction time + multi_ip ══');
      console.log('  Skipped — set ANTIBOT_E2E_DEVMODE=1 and start the server with');
      console.log('  ALLOW_DEV_COMMANDS=1 to run this test.');
    } else {
      console.log('\n══ Test B: reaction time + multi_ip ══');

      const mageUsername = `amagebot${uniq}`;
      const mageReg  = await api('/api/register', { username: mageUsername, password: 'hunter22' });
      const mageChar = await api('/api/characters', { name: `Mag${alpha}`, class: 'mage' }, mageReg.token);
      const mageRow  = await pool.query('SELECT id FROM accounts WHERE username = $1', [mageUsername]);
      const mageAccountId = mageRow.rows[0].id;

      const mageBot = new ReactiveBotClient();
      await mageBot.connect(mageReg.token, mageChar.id);
      check(`mage bot connected: ${mageChar.name} pid ${mageBot.pid} (6th session → multi_ip evidence)`, mageBot.connected);

      // Level up and teleport to Wolf Run (zone 1, both wolf spawns in range).
      mageBot.cmd({ cmd: 'dev_level', level: 20 });
      mageBot.cmd({ cmd: 'dev_teleport', x: WOLF_X, z: WOLF_Z });
      // Wait for the snap to arrive with nearby hostiles.
      await sleep(1_000);

      // Verify wolves appeared in the snap.
      let targets = mageBot.hostiles;
      if (targets.length === 0) {
        console.log('  no hostile entities in snap yet, waiting 2 s more…');
        await sleep(2_000);
        targets = mageBot.hostiles;
      }
      check(`wolves in range (${targets.length} hostile entities within ${CAST_RANGE} yd)`, targets.length > 0);

      if (targets.length === 0) {
        console.log('  aborting Test B — no targets to cast on.');
      } else {
        console.log(`  casting Fireball on wolves (${CAST_CYCLES} cycles)…`);
        let successfulCasts = 0;

        const castDeadline = Date.now() + CAST_LOOP_MS;
        let waitingLogged = false;
        while (successfulCasts < CAST_CYCLES && Date.now() < castDeadline) {
          const available = mageBot.hostiles;
          if (available.length === 0) {
            if (!waitingLogged) {
              console.log(`  ${successfulCasts}/${CAST_CYCLES} casts done — waiting for wolf respawn (~25 s)…`);
              waitingLogged = true;
            }
            await sleep(1_000);
            continue;
          }
          waitingLogged = false;

          const targetId = available[0];
          mageBot.faceTarget(targetId);
          // Remove optimistically — prevents re-targeting a dying wolf before the
          // next snap arrives. If the wolf survives the cast, the snap re-adds it.
          mageBot._knownHostiles.delete(targetId);
          mageBot.cmd({ cmd: 'target', id: targetId });
          mageBot.cmd({ cmd: 'cast', ability: 'fireball' });

          try {
            await mageBot.waitForCastStop(4_000);
            // A snap may have re-added this wolf while the cast was in flight.
            mageBot._knownHostiles.delete(targetId);
            // Immediately respond — this is the reaction the server measures.
            mageBot.cmd({ cmd: 'attack' });
            successfulCasts++;
          } catch {
            // Cast rejected (target dead / LoS) — try next wolf.
          }
        }

        console.log(`  completed ${successfulCasts} cast cycles, ${mageBot.castStopCount} castStop events received`);
        check(`≥ 10 castStop events received (reaction-time ring buffer)`, mageBot.castStopCount >= 10,
          `only ${mageBot.castStopCount} received`);

        console.log(`  waiting ${CAST_WAIT_MS / 1000} s for auto-report…`);
        await sleep(CAST_WAIT_MS);

        const reportB = await latestBotReport(mageAccountId);
        check('Test B: auto-report created', !!reportB);
        if (reportB) {
          check('Test B: report contains reaction evidence',  reportB.details.includes('reaction'));
          check('Test B: report contains multi_ip evidence', reportB.details.includes('multi_ip'));
          console.log('\n  details (B):\n' + reportB.details.split('\n').map(l => '    ' + l).join('\n'));
        }

        mageBot.close();
      }
    }

  } finally {
    for (const c of bgClients) c.close();
    await pool.end();
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail > 0 ? 1 : 0);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
