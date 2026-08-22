// Vale Cup ONLINE mechanics probe: two raw-WS clients against a running game
// server (+ postgres), verifying the football mechanics behave the same over
// the wire as they do offline: the sport kit swap, ball streaming, kicking,
// dribble carry, body trap, and scoring. Requires ALLOW_DEV_COMMANDS=1 on the
// server (dev_teleport stages exact positions). Template: scripts/chat_e2e.mjs.
//
// Arms (the Sowfield holds ONE live match, so each arm needs the slot free):
//   node scripts/vale_cup_online_probe.mjs          the original 1v1 mechanics arm
//   node scripts/vale_cup_online_probe.mjs party    the party-queue backfill arm:
//     A invites B, the leader queues the two-stack into the 2v2 bracket, the
//     probe waits out the 60s VC_BACKFILL_WAIT until bots fill the far side,
//     then asserts both clients land in the SAME match with rated false. Needs
//     no dev commands: queueing and backfill are plain player flow.
import WebSocket from 'ws';
import { worldAuthMessage } from './lib/world_auth.mjs';

const BASE = process.env.SERVER_URL ?? 'http://localhost:8787';
const WS_BASE = BASE.replace(/^http/, 'ws');
let pass = 0;
let fail = 0;

function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`OK   ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name} ${extra}`);
  }
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
    this.ents = new Map(); // id -> merged {tid?, x, z, ...}
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
  // Hold a movement input for `ms`, re-sending every 150ms like a live client.
  async hold(mi, facing, ms) {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      this.ws.send(
        JSON.stringify({
          t: 'input',
          seq: ++this.inputSeq,
          mi: { f: 0, b: 0, tl: 0, tr: 0, sl: 0, sr: 0, ...mi },
          facing,
        }),
      );
      await sleep(150);
    }
    // release
    this.ws.send(
      JSON.stringify({
        t: 'input',
        seq: ++this.inputSeq,
        mi: { f: 0, b: 0, tl: 0, tr: 0, sl: 0, sr: 0 },
        facing,
      }),
    );
  }
  ball() {
    for (const e of this.ents.values()) {
      if (e.tid === 'vale_cup_ball') return e;
    }
    return null;
  }
  close() {
    this.ws?.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uniq = Date.now().toString(36);
const alpha = uniq.replace(/[0-9]/g, (d) => 'abcdefghij'[Number(d)]).slice(-6);

/** Generous poll (wire keys are cadence-throttled; the backfill arm waits out
 *  a whole 60s queue window). */
async function until(read, ms, step = 400) {
  const t0 = Date.now();
  for (;;) {
    const v = read();
    if (v) return v;
    if (Date.now() - t0 >= ms) return null;
    await sleep(step);
  }
}

// The party arm: a two-stack queued by its leader into the 2v2 bracket, backed
// up by nothing else in the queue, must be seated together against a
// bot-backfilled far side once VC_BACKFILL_WAIT (60s) runs out, and that match
// must be UNRATED (bots play, no standing moves).
async function partyArm() {
  const r1 = await api('/api/register', {
    username: `vcpp_${uniq}_a`,
    password: 'hunter22',
    email: `vcpp_${uniq}_a@example.com`,
  });
  const r2 = await api('/api/register', {
    username: `vcpp_${uniq}_b`,
    password: 'hunter22',
    email: `vcpp_${uniq}_b@example.com`,
  });
  const c1 = await api('/api/characters', { name: `Stacka${alpha}`, class: 'warrior' }, r1.token);
  const c2 = await api('/api/characters', { name: `Stackb${alpha}`, class: 'mage' }, r2.token);
  const a = new Client('A');
  const b = new Client('B');
  await a.connect(r1.token, c1.id);
  await b.connect(r2.token, c2.id);
  await sleep(500);

  // A invites B; B accepts off the invite event; the party lands on the wire.
  a.cmd({ cmd: 'pinvite', id: b.pid });
  const invited = await until(
    () => b.events.find((e) => e.type === 'partyInvite' && e.fromPid === a.pid),
    8000,
  );
  check('B receives the party invite', !!invited);
  b.cmd({ cmd: 'paccept' });
  const party = await until(() => (a.self.party?.members?.length ?? 0) === 2, 8000);
  check('party of two forms on the wire', !!party, JSON.stringify(a.self.party ?? null));

  // The LEADER queues the whole stack into the 2-fit bracket (2v2).
  a.cmd({ cmd: 'vcup_queue', bracket: 2, nation: 'vale', role: 'allrounder' });
  const queued = await until(
    () => a.events.find((e) => e.type === 'vcupQueued' && e.bracket === 2),
    10_000,
  );
  check('leader queue lands (vcupQueued, bracket 2)', !!queued);

  // Wait out the 60s VC_BACKFILL_WAIT plus scheduling slack for the bots to
  // fill the far side and the found events to fan out to BOTH members.
  const found = await until(
    () =>
      a.events.some((e) => e.type === 'vcupFound') && b.events.some((e) => e.type === 'vcupFound'),
    110_000,
    1000,
  );
  check('both party members receive vcupFound after the backfill wait', !!found);

  // The vcup snapshot must carry the same match on both clients, unrated.
  const seated = await until(
    () => a.self.vcup?.match && b.self.vcup?.match && a.self.vcup.match.id === b.self.vcup.match.id,
    30_000,
    1000,
  );
  check(
    'both clients land in the SAME match',
    !!seated,
    JSON.stringify({ a: a.self.vcup?.match?.id ?? null, b: b.self.vcup?.match?.id ?? null }),
  );
  const matchA = a.self.vcup?.match ?? null;
  const matchB = b.self.vcup?.match ?? null;
  check('the backfilled match is rated false (A)', matchA?.rated === false, JSON.stringify(matchA));
  check('the backfilled match is rated false (B)', matchB?.rated === false);
  check(
    'the party is seated on the SAME team',
    !!matchA && !!matchB && matchA.team !== null && matchA.team === matchB.team,
    JSON.stringify({ a: matchA?.team ?? null, b: matchB?.team ?? null }),
  );
  const sideOf = (m, pid) =>
    m?.teamA?.some((r) => r.pid === pid) ? 'A' : m?.teamB?.some((r) => r.pid === pid) ? 'B' : null;
  check(
    'the roster carries both humans on one side and bots on the other',
    !!matchA &&
      sideOf(matchA, a.pid) !== null &&
      sideOf(matchA, a.pid) === sideOf(matchA, b.pid) &&
      (sideOf(matchA, a.pid) === 'A' ? matchA.teamB : matchA.teamA).every((r) => r.bot),
    JSON.stringify({ teamA: matchA?.teamA, teamB: matchA?.teamB }),
  );

  a.close();
  b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

async function main() {
  const r1 = await api('/api/register', {
    username: `vcup_${uniq}_a`,
    password: 'hunter22',
    email: `vcup_${uniq}_a@example.com`,
  });
  const r2 = await api('/api/register', {
    username: `vcup_${uniq}_b`,
    password: 'hunter22',
    email: `vcup_${uniq}_b@example.com`,
  });
  const c1 = await api('/api/characters', { name: `Kicka${alpha}`, class: 'warrior' }, r1.token);
  const c2 = await api('/api/characters', { name: `Wallb${alpha}`, class: 'mage' }, r2.token);
  const a = new Client('A');
  const b = new Client('B');
  await a.connect(r1.token, c1.id);
  await b.connect(r2.token, c2.id);
  await sleep(400);

  // Queue both into a 1v1: two humans, no bots, rated path.
  a.cmd({ cmd: 'vcup_queue', bracket: 1, nation: 'vale', role: 'allrounder' });
  b.cmd({ cmd: 'vcup_queue', bracket: 1, nation: 'coliseum', role: 'allrounder' });
  await sleep(800);
  check(
    'both receive vcupFound',
    a.events.some((e) => e.type === 'vcupFound') && b.events.some((e) => e.type === 'vcupFound'),
  );

  // Pre-match briefing: both ready up (vcup_ready) to start the whistle.
  a.cmd({ cmd: 'vcup_ready' });
  b.cmd({ cmd: 'vcup_ready' });
  await sleep(400);

  // Wait out the countdown to kickoff.
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    if (a.events.some((e) => e.type === 'vcupKickoff')) break;
    await sleep(200);
  }
  check(
    'kickoff fires',
    a.events.some((e) => e.type === 'vcupKickoff'),
  );
  await sleep(400);

  // The sport kit swap must be visible on the wire for BOTH clients.
  check(
    'sport heavy field carries the role (A)',
    a.self.sport && a.self.sport.role === 'allrounder',
    JSON.stringify(a.self.sport),
  );
  check(
    'sport heavy field carries the role (B)',
    b.self.sport && b.self.sport.role === 'allrounder',
    JSON.stringify(b.self.sport),
  );
  check(
    'vcup snapshot has the live match (A)',
    !!a.self.vcup?.match,
    JSON.stringify(a.self.vcup?.match ?? null),
  );

  // The ball entity streams to both clients.
  check('ball entity streams (A)', !!a.ball(), '');
  check('ball entity streams (B)', !!b.ball(), '');

  // KICK: A stands near the center spot (kickoff taker). Kick east and watch
  // the ball's wire position respond within a few snapshots.
  const ballBefore = { ...a.ball() };
  a.cmd({ cmd: 'castAt', ability: 'sport_kick', x: ballBefore.x + 12, z: ballBefore.z });
  await sleep(700);
  const ballAfterKick = { ...a.ball() };
  check(
    'castAt sport_kick moves the ball east over the wire',
    ballAfterKick.x > ballBefore.x + 2,
    `dx=${(ballAfterKick.x - ballBefore.x).toFixed(2)}`,
  );

  // BODY TRAP: park B directly in the ball's path, then A boots it at B. The
  // ball must arrive AT B and stop (trapped), not sail through.
  a.cmd({ cmd: 'dev_teleport', x: ballAfterKick.x - 2, z: ballAfterKick.z });
  b.cmd({ cmd: 'dev_teleport', x: ballAfterKick.x + 10, z: ballAfterKick.z });
  await sleep(500);
  a.cmd({ cmd: 'castAt', ability: 'sport_boot', x: ballAfterKick.x + 26, z: ballAfterKick.z });
  await sleep(1400);
  const ballAfterTrap = { ...a.ball() };
  const bPos = a.ents.get(b.pid) ?? { x: 0, z: 0 };
  const trapDist = Math.hypot(ballAfterTrap.x - bPos.x, ballAfterTrap.z - bPos.z);
  check(
    'a booted ball traps at the fighter in its path (no pass-through)',
    trapDist < 6,
    `ball ended ${trapDist.toFixed(1)}yd from B`,
  );

  // DRIBBLE: stage B two yards WEST of the trapped ball, then hold forward
  // (facing east) through it and carry it. Track B's own wire position too so
  // a movement-input failure is distinguishable from a dribble failure.
  const staged = { ...a.ball() };
  b.cmd({ cmd: 'dev_teleport', x: staged.x - 2, z: staged.z });
  await sleep(500);
  const dribbleBefore = { ...b.ball() };
  const bSelfBefore = { x: b.self.x, z: b.self.z };
  await b.hold({ f: 1 }, Math.PI / 2, 1500); // facing: sin/cos convention, PI/2 = east
  await sleep(400);
  const dribbleAfter = { ...b.ball() };
  const bSelfAfter = { x: b.self.x, z: b.self.z };
  check(
    'held forward input moves the player over the wire (B)',
    bSelfAfter.x > bSelfBefore.x + 2,
    `B dx=${(bSelfAfter.x - bSelfBefore.x).toFixed(2)}`,
  );
  check(
    'holding forward into the ball dribbles it along (B)',
    dribbleAfter.x > dribbleBefore.x + 1.5,
    `ball dx=${(dribbleAfter.x - dribbleBefore.x).toFixed(2)}`,
  );

  // GOAL: wait out the boot cooldown, stage a clean short kick at the EAST
  // goal mouth from inside the kick range (A attacks east in a 1v1).
  const eastGoalX = 26; // GOAL_LINE_EAST_X after the pitch was enlarged
  await sleep(6500); // sport_boot cooldown from the trap stage
  const shotBall = { ...a.ball() };
  a.cmd({ cmd: 'dev_teleport', x: shotBall.x - 2, z: shotBall.z });
  b.cmd({ cmd: 'dev_teleport', x: -30, z: -122 }); // B clears the lane
  await sleep(500);
  a.cmd({ cmd: 'castAt', ability: 'sport_boot', x: eastGoalX + 4, z: shotBall.z });
  const g0 = Date.now();
  let scored = false;
  while (Date.now() - g0 < 8000) {
    if (a.events.some((e) => e.type === 'vcupGoal')) {
      scored = true;
      break;
    }
    await sleep(200);
  }
  check('a clean shot scores online (vcupGoal event)', scored);
  await sleep(600);
  check(
    'the score lands in the vcup snapshot',
    (a.self.vcup?.match?.scoreA ?? 0) >= 1,
    JSON.stringify({ a: a.self.vcup?.match?.scoreA, b: a.self.vcup?.match?.scoreB }),
  );

  // COLLISION: stack A and B on the same spot mid-pitch and confirm they push
  // apart over the wire (the same soft separation offline has). Wait out the
  // post-goal kickoff first: the scoring stage above triggers a reset that
  // snaps players to spawns and briefly freezes movement.
  const koT = Date.now();
  while (Date.now() - koT < 6000 && (a.self.vcup?.match?.phase ?? 'play') !== 'play') {
    await sleep(200);
  }
  await sleep(500);
  a.cmd({ cmd: 'dev_teleport', x: -11, z: -108 });
  b.cmd({ cmd: 'dev_teleport', x: -11, z: -108 });
  await sleep(1400);
  const ax = a.self.x;
  const az = a.self.z;
  const bEnt = a.ents.get(b.pid) ?? { x: ax, z: az };
  const sepGap = Math.hypot(ax - bEnt.x, az - bEnt.z);
  check('stacked fighters separate on the pitch online', sepGap >= 0.9, `gap=${sepGap.toFixed(2)}`);

  a.close();
  b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

const arm = process.argv[2] ?? 'core';
const run = arm === 'party' ? partyArm : main;
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
