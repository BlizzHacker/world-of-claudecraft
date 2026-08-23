// The Dead Road horde defense, ONLINE: two raw-WS clients against a running
// game server (+ postgres). A invites B to a party, A sounds the alarm at the
// town defense board, and the script asserts the 'horde' delta key walks
// idle -> prep -> wave, that restless_bones wave mobs stream to the clients,
// that horde_fortify raises the ward count, and (dev-staged runs only) that
// both defenders receive the win purse when the town holds all seven waves.
//
// Staging (dev_teleport / dev_level / the /dev chat cheats) runs ONLY when the
// script is launched with ALLOW_DEV_COMMANDS=1, mirroring the flag the target
// server must itself be running with (root invariant: never in production).
// Without it the script fails SOFT: staging-dependent stages are reported as
// SKIP lines, not failures, and only the stages the unstaged session can
// actually reach are scored. Template: scripts/vale_cup_online_probe.mjs.
import WebSocket from 'ws';
import { worldAuthMessage } from './lib/world_auth.mjs';

const BASE = process.env.SERVER_URL ?? 'http://localhost:8787';
const WS_BASE = BASE.replace(/^http/, 'ws');
const DEV = process.env.ALLOW_DEV_COMMANDS === '1';
let pass = 0;
let fail = 0;
let skipped = 0;

function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`OK   ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name} ${extra}`);
  }
}

function skip(name, why) {
  skipped++;
  console.log(`SKIP ${name} (${why})`);
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
  return res.json();
}

// Entity identity fields ride only in "full" records; "lite" records inherit
// them from the previous state, and ids in snap.keep are alive but unchanged.
const ENTITY_IDENTITY_KEYS = ['k', 'tid', 'nm', 'lv', 'sc', 'c', 'dgn'];

class Client {
  constructor(label) {
    this.label = label;
    this.events = [];
    this.pid = -1;
    this.self = {};
    this.ents = new Map();
    this.inputSeq = 0;
  }
  connect(token, characterId) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${WS_BASE}/ws`);
      const to = setTimeout(() => reject(new Error('connect timeout')), 8000);
      this.ws.on('message', (data) => {
        const msg = JSON.parse(String(data));
        if (msg.t === 'hello') {
          this.pid = msg.pid;
          clearTimeout(to);
          resolve();
        } else if (msg.t === 'events') this.events.push(...msg.list);
        else if (msg.t === 'snap') {
          Object.assign(this.self, msg.self);
          const next = new Map();
          for (const e of msg.ents ?? []) {
            const prev = this.ents.get(e.id);
            if (prev && e.k === undefined) {
              for (const key of ENTITY_IDENTITY_KEYS) if (key in prev) e[key] = prev[key];
            }
            next.set(e.id, e);
          }
          for (const id of msg.keep ?? []) {
            const prev = this.ents.get(id);
            if (prev) next.set(id, prev);
          }
          this.ents = next;
        }
      });
      this.ws.on('open', () => this.ws.send(JSON.stringify(worldAuthMessage(token, characterId))));
      this.ws.on('error', reject);
    });
  }
  cmd(p) {
    this.ws.send(JSON.stringify({ t: 'cmd', ...p }));
  }
  input(mi, facing) {
    this.ws.send(
      JSON.stringify({
        t: 'input',
        seq: ++this.inputSeq,
        mi: { f: 0, b: 0, tl: 0, tr: 0, sl: 0, sr: 0, ...mi },
        ...(facing !== undefined ? { facing } : {}),
      }),
    );
  }
  hordeMobs() {
    return [...this.ents.values()].filter((e) => e.tid === 'restless_bones' && !e.dead);
  }
  sawEvent(pred) {
    return this.events.some(pred);
  }
  close() {
    this.ws?.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uniq = Date.now().toString(36);
const alpha = uniq.replace(/[0-9]/g, (d) => 'abcdefghij'[Number(d)]).slice(-6);

/** Poll until `read()` is truthy or the budget runs out; wire keys are
 *  cadence-throttled (the 'horde' key rides the 1 Hz vcup-cadence block), so
 *  every wait here is generous. */
async function until(read, ms, step = 300) {
  const t0 = Date.now();
  for (;;) {
    const v = read();
    if (v) return v;
    if (Date.now() - t0 >= ms) return null;
    await sleep(step);
  }
}

async function main() {
  const r1 = await api('/api/register', {
    username: `horde_${uniq}_a`,
    password: 'hunter22',
    email: `horde_${uniq}_a@example.com`,
  });
  const r2 = await api('/api/register', {
    username: `horde_${uniq}_b`,
    password: 'hunter22',
    email: `horde_${uniq}_b@example.com`,
  });
  const c1 = await api('/api/characters', { name: `Warda${alpha}`, class: 'warrior' }, r1.token);
  const c2 = await api('/api/characters', { name: `Wardb${alpha}`, class: 'warrior' }, r2.token);
  const a = new Client('A');
  const b = new Client('B');
  await a.connect(r1.token, c1.id);
  await b.connect(r2.token, c2.id);
  await sleep(500);
  check('both clients joined', a.pid > 0 && b.pid > 0);

  // Party up: A invites, B receives the invite event and accepts.
  a.cmd({ cmd: 'pinvite', id: b.pid });
  const invite = await until(
    () => b.events.find((e) => e.type === 'partyInvite' && e.fromPid === a.pid),
    8000,
  );
  check('B receives the party invite', !!invite);
  b.cmd({ cmd: 'paccept' });
  const party = await until(() => (a.self.party?.members?.length ?? 0) === 2 && a.self.party, 8000);
  check('party of two forms on the wire', !!party, JSON.stringify(a.self.party ?? null));

  // Dev staging: level up, walk both defenders onto the plaza line, and fund
  // the fortify. Guarded by the flag; without it the fresh spawns must already
  // be inside the venue for the alarm to take.
  if (DEV) {
    for (const c of [a, b]) {
      c.cmd({ cmd: 'dev_level', level: 30 });
      c.cmd({ cmd: 'chat', text: '/dev god' });
      c.cmd({ cmd: 'chat', text: '/dev smite' });
      c.cmd({ cmd: 'chat', text: '/dev gold 5' });
    }
    a.cmd({ cmd: 'dev_teleport', x: -4, z: 24 });
    b.cmd({ cmd: 'dev_teleport', x: 6, z: 24 });
    await sleep(800);
    check('dev staging leveled both defenders', a.self.lv === 30 && b.self.lv === 30);
  }

  // A prior event may still be winding down on a shared server: wait it out.
  await until(() => !a.self.horde || a.self.horde.phase === 'idle', 90_000, 1000);
  const phaseBefore = a.self.horde?.phase ?? null;
  check(
    'horde key reads idle (or out-of-range null) before the alarm',
    phaseBefore === null || phaseBefore === 'idle',
    `phase=${phaseBefore}`,
  );

  // Sound the alarm from the defense board.
  a.cmd({ cmd: 'horde_start' });
  const prep = await until(() => a.self.horde?.phase === 'prep' && a.self.horde, 15_000);
  if (!prep) {
    const ranged = a.sawEvent(
      (e) => e.type === 'error' && /town defense board/i.test(String(e.text ?? '')),
    );
    if (ranged && !DEV) {
      // Fresh spawn landed outside the venue and no dev_teleport was allowed:
      // every remaining stage depends on that staging, so fail soft.
      skip('horde idle -> prep -> wave walk', 'spawn outside the venue, no ALLOW_DEV_COMMANDS=1');
      skip('restless_bones wave mobs stream', 'staging skipped');
      skip('horde_fortify raises wards', 'staging skipped');
      skip('win purse', 'staging skipped');
      finish(a, b);
      return;
    }
  }
  check('horde_start moves the phase to prep (A)', a.self.horde?.phase === 'prep');
  await until(() => b.self.horde?.phase === 'prep', 8000);
  check('B sees the same prep phase on its own horde key', b.self.horde?.phase === 'prep');

  // Fortify during prep: +1 ward (3 -> 4) and both clients see the new count.
  const wardsBefore = a.self.horde?.wards ?? 0;
  if (DEV || (a.self.copper ?? 0) >= (a.self.horde?.fortifyCostCopper ?? 2000)) {
    a.cmd({ cmd: 'horde_fortify' });
    const raised = await until(() => (a.self.horde?.wards ?? 0) > wardsBefore, 10_000);
    check(
      'horde_fortify raises the ward count',
      !!raised,
      `wards ${wardsBefore} -> ${a.self.horde?.wards}`,
    );
    await until(() => (b.self.horde?.wards ?? 0) > wardsBefore, 8000);
    check('B sees the raised ward count', (b.self.horde?.wards ?? 0) > wardsBefore);
  } else {
    skip('horde_fortify raises wards', 'not enough copper on a fresh character and no dev gold');
  }

  // Prep is 20s; wave 1 follows.
  const wave = await until(() => a.self.horde?.phase === 'wave', 45_000, 500);
  check('phase advances prep -> wave', !!wave, `phase=${a.self.horde?.phase}`);
  const mobsSeen = await until(() => a.hordeMobs().length > 0 && a.hordeMobs(), 20_000, 400);
  check('restless_bones wave mobs stream to A', !!mobsSeen, `count=${a.hordeMobs().length}`);
  await until(() => b.hordeMobs().length > 0, 10_000, 400);
  check('restless_bones wave mobs stream to B', b.hordeMobs().length > 0);

  if (!DEV) {
    skip('win purse', 'clearing seven waves needs the dev-staged smite loop');
    finish(a, b);
    return;
  }

  // Fight it out: smite mode one-shots every landed swing, god mode keeps the
  // line honest, so the loop is pure target-walk-swing until the event settles.
  const copperA = a.self.copper ?? 0;
  const copperB = b.self.copper ?? 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 480_000) {
    const h = a.self.horde;
    if (h && h.phase === 'over') break;
    for (const c of [a, b]) {
      const mobs = c.hordeMobs();
      if (mobs.length === 0) {
        c.input({});
        continue;
      }
      const px = c.self.x ?? 0;
      const pz = c.self.z ?? 0;
      mobs.sort((m, n) => Math.hypot(m.x - px, m.z - pz) - Math.hypot(n.x - px, n.z - pz));
      const m = mobs[0];
      const d = Math.hypot(m.x - px, m.z - pz);
      const facing = Math.atan2(m.x - px, m.z - pz);
      if (d > 3.5) {
        c.input({ f: 1 }, facing);
      } else {
        c.input({}, facing);
        if (c.self.target !== m.id) c.cmd({ cmd: 'target', id: m.id });
        c.cmd({ cmd: 'attack' });
      }
    }
    await sleep(300);
  }
  check(
    'the town survives all waves (phase over, won)',
    a.self.horde?.phase === 'over' && a.self.horde?.won === true,
    JSON.stringify(a.self.horde ?? null),
  );

  // The purse: every defender standing near the square shares the payout.
  const purseA = await until(() => (a.self.copper ?? 0) >= copperA + 8000, 15_000, 500);
  const purseB = await until(() => (b.self.copper ?? 0) >= copperB + 8000, 15_000, 500);
  check('A receives the win purse', !!purseA, `copper ${copperA} -> ${a.self.copper}`);
  check('B receives the win purse', !!purseB, `copper ${copperB} -> ${b.self.copper}`);
  check(
    'both clients see the town-stands log line',
    a.sawEvent((e) => e.type === 'log' && /The town stands!/.test(String(e.text ?? ''))) &&
      b.sawEvent((e) => e.type === 'log' && /The town stands!/.test(String(e.text ?? ''))),
  );

  finish(a, b);
}

function finish(a, b) {
  a.close();
  b.close();
  console.log(`\n${pass} passed, ${fail} failed, ${skipped} skipped`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
