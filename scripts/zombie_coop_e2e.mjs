// Zombie Defense co-op ONLINE: two raw-WS clients against a running game
// server (+ postgres). A parties up with B (mg_invite requires a shared
// party), creates a zombie_defense minigame session, invites B to it, B joins,
// both ready up through the countdown, A starts a wave and the script asserts
// the wave counter advances with live zombies on the board, then that
// mg_zombie_build places a tower BOTH clients see. The zombie board is realm
// persistent (the server clones its stored campaign into new sessions), so
// every assertion is a DELTA over the state the session opened with, never an
// absolute wave or resource number. Template: scripts/vale_cup_online_probe.mjs
// (its Client class and check() tally).
import WebSocket from 'ws';
import { worldAuthMessage } from './lib/world_auth.mjs';

const BASE = process.env.SERVER_URL ?? 'http://localhost:8787';
const WS_BASE = BASE.replace(/^http/, 'ws');
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
          for (const e of msg.ents ?? []) {
            const prev = this.ents.get(e.id) ?? {};
            this.ents.set(e.id, { ...prev, ...e });
          }
        }
      });
      this.ws.on('open', () => this.ws.send(JSON.stringify(worldAuthMessage(token, characterId))));
      this.ws.on('error', reject);
    });
  }
  cmd(p) {
    this.ws.send(JSON.stringify({ t: 'cmd', ...p }));
  }
  /** The zombie campaign state carried on the 'mgz' delta key (null outside a
   *  zombie_defense session). */
  board() {
    return this.self.mgz?.state ?? null;
  }
  close() {
    this.ws?.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uniq = Date.now().toString(36);
const alpha = uniq.replace(/[0-9]/g, (d) => 'abcdefghij'[Number(d)]).slice(-6);

/** Generous poll: the mg/mgz keys are delta-shipped and the session machine
 *  advances on the 20 Hz loop, so nothing here is latency-critical. */
async function until(read, ms, step = 300) {
  const t0 = Date.now();
  for (;;) {
    const v = read();
    if (v) return v;
    if (Date.now() - t0 >= ms) return null;
    await sleep(step);
  }
}

/** First buildable cell: adjacent to the route row (z 0), inside the board
 *  bounds and arrow-tower range, not already holding a tower. */
function freeTowerCell(board) {
  const taken = new Set((board?.towers ?? []).map((t) => `${t.cell.x},${t.cell.z}`));
  for (const z of [1, -1, 2, -2]) {
    for (let x = -6; x <= 6; x++) {
      if (!taken.has(`${x},${z}`)) return { x, z };
    }
  }
  return null;
}

async function main() {
  const r1 = await api('/api/register', {
    username: `zomb_${uniq}_a`,
    password: 'hunter22',
    email: `zomb_${uniq}_a@example.com`,
  });
  const r2 = await api('/api/register', {
    username: `zomb_${uniq}_b`,
    password: 'hunter22',
    email: `zomb_${uniq}_b@example.com`,
  });
  const c1 = await api('/api/characters', { name: `Boarda${alpha}`, class: 'warrior' }, r1.token);
  const c2 = await api('/api/characters', { name: `Boardb${alpha}`, class: 'mage' }, r2.token);
  const a = new Client('A');
  const b = new Client('B');
  await a.connect(r1.token, c1.id);
  await b.connect(r2.token, c2.id);
  await sleep(500);
  check('both clients joined', a.pid > 0 && b.pid > 0);

  // mg_invite only reaches PARTY members, so the party forms first.
  a.cmd({ cmd: 'pinvite', id: b.pid });
  await until(() => b.events.some((e) => e.type === 'partyInvite' && e.fromPid === a.pid), 8000);
  b.cmd({ cmd: 'paccept' });
  const party = await until(() => (a.self.party?.members?.length ?? 0) === 2, 8000);
  check('party of two forms (mg_invite precondition)', !!party);

  // A creates the session; the id comes off the minigame delta ('mg').
  a.cmd({ cmd: 'mg_create', kind: 'zombie_defense', maxPlayers: 4 });
  const session = await until(
    () => (a.self.mg?.kind === 'zombie_defense' ? a.self.mg : null),
    10_000,
  );
  check(
    'mg_create surfaces the session on the minigame delta',
    !!session,
    JSON.stringify(a.self.mg ?? null),
  );
  if (!session) return finish(a, b);
  const sessionId = session.id;

  // A invites B; B must receive the minigameInvite event naming this session.
  a.cmd({ cmd: 'mg_invite', targetPlayerId: b.pid });
  const invite = await until(
    () =>
      b.events.find(
        (e) => e.type === 'minigameInvite' && e.sessionId === sessionId && e.fromPid === a.pid,
      ),
    10_000,
  );
  check(
    'B receives minigameInvite for the session',
    !!invite,
    JSON.stringify(b.events.filter((e) => e.type === 'minigameInvite')),
  );

  b.cmd({ cmd: 'mg_join', sessionId });
  const joined = await until(
    () => (a.self.mg?.players?.length ?? 0) === 2 && b.self.mg?.id === sessionId,
    10_000,
  );
  check(
    'B joins; both rosters show two players',
    !!joined,
    JSON.stringify(a.self.mg?.players ?? null),
  );

  // Both ready: lobby -> countdown (3s) -> active.
  a.cmd({ cmd: 'mg_ready', ready: true });
  b.cmd({ cmd: 'mg_ready', ready: true });
  const active = await until(() => a.self.mg?.phase === 'active', 20_000);
  check('session goes active after both ready', !!active, `phase=${a.self.mg?.phase}`);

  // The campaign board arrives on 'mgz'. It is PERSISTENT realm state, so a
  // prior run may hand this session a mid-wave or finished board.
  const board0 = await until(() => a.board(), 15_000);
  check('zombie board streams on the mgz delta', !!board0);
  if (!board0) return finish(a, b);

  if (board0.status === 'active') {
    // Wait out an inherited in-flight wave so mg_zombie_start can take.
    await until(() => a.board()?.status !== 'active', 180_000, 1000);
  }
  const boardReady = a.board();
  if (!boardReady || boardReady.status === 'won' || boardReady.status === 'lost') {
    skip('wave advance', `inherited persistent board is ${boardReady?.status}; nothing to start`);
    skip('tower build', 'board not in a startable state');
    return finish(a, b);
  }

  const waveBefore = boardReady.wave;
  a.cmd({ cmd: 'mg_zombie_start' });
  const waveOn = await until(
    () => (a.board()?.wave ?? 0) === waveBefore + 1 && a.board()?.status === 'active',
    15_000,
  );
  check(
    'mg_zombie_start advances the wave counter',
    !!waveOn,
    `wave ${waveBefore} -> ${a.board()?.wave} status=${a.board()?.status}`,
  );
  const risen = await until(() => (a.board()?.zombies?.length ?? 0) > 0, 15_000);
  check(
    'the wave puts live zombies on the board',
    !!risen,
    `zombies=${a.board()?.zombies?.length}`,
  );
  await until(() => (b.board()?.wave ?? 0) === waveBefore + 1, 10_000);
  check(
    'B mirrors the advanced wave on its own mgz key',
    (b.board()?.wave ?? 0) === waveBefore + 1,
  );

  // Build a tower on a free off-route cell. Kills refund resources, so on a
  // broke inherited board we wait for the arrow-tower price to be affordable.
  const funded = await until(
    () => ((a.board()?.resources ?? 0) >= 35 ? a.board() : null),
    60_000,
    500,
  );
  if (!funded) {
    skip('tower build', `resources never reached the arrow cost (${a.board()?.resources})`);
    return finish(a, b);
  }
  const cell = freeTowerCell(funded);
  if (!cell) {
    skip('tower build', 'no free cell beside the route on the inherited board');
    return finish(a, b);
  }
  const towersBefore = funded.towers.length;
  a.cmd({ cmd: 'mg_zombie_build', kind: 'arrow', x: cell.x, z: cell.z });
  const built = await until(() => (a.board()?.towers?.length ?? 0) > towersBefore, 15_000);
  check(
    'mg_zombie_build places a tower',
    !!built,
    `towers ${towersBefore} -> ${a.board()?.towers?.length} at ${JSON.stringify(cell)}`,
  );
  await until(() => (b.board()?.towers?.length ?? 0) > towersBefore, 10_000);
  check('B sees the placed tower', (b.board()?.towers?.length ?? 0) > towersBefore);

  return finish(a, b);
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
