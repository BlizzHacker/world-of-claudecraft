#!/usr/bin/env python3
"""Hand-weave the two files where BOTH sides carry something load-bearing."""
import io
import sys

ROOT = '/opt/cr-v032/'


def weave(path, old, new):
    p = ROOT + path
    s = io.open(p, encoding='utf-8').read()
    if s.count(old) != 1:
        sys.exit('anchor missed in %s (%d)' % (path, s.count(old)))
    s = s.replace(old, new, 1)
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('  ok  %s  (markers left: %d)' % (path, s.count('<<<<<<<')))


# --- src/sim/progression/xp.ts ---------------------------------------------
# Upstream reworked rest points to read buildings from the active world content
# and take them as a parameter. The fork's contribution here is one thing only:
# the realm-aware level cap. Take upstream's structure, keep activeMaxLevel.
weave('src/sim/progression/xp.ts', """<<<<<<< HEAD
import { PROPS } from '../data';
import { activeMaxLevel } from '../realms/registry';
=======

import { buildingContainsRestPoint, buildingRestPadding } from '../building_layout';
import { getActiveWorldContent } from '../data';
>>>>>>> v0.32.0""", """
import { buildingContainsRestPoint, buildingRestPadding } from '../building_layout';
import { getActiveWorldContent } from '../data';
import { activeMaxLevel } from '../realms/registry';""")

weave('src/sim/progression/xp.ts', """<<<<<<< HEAD
export function updateRested(p: Entity, meta: PlayerMeta): void {
  if (p.level >= activeMaxLevel(MAX_LEVEL)) return;
=======
export function updateRested(
  p: Entity,
  meta: PlayerMeta,
  buildings: readonly BuildingDef[] = getActiveWorldContent().props.buildings,
): void {
  if (p.level >= MAX_LEVEL) return;
>>>>>>> v0.32.0""", """export function updateRested(
  p: Entity,
  meta: PlayerMeta,
  buildings: readonly BuildingDef[] = getActiveWorldContent().props.buildings,
): void {
  // Realm-aware cap: a realm may raise or lower MAX_LEVEL.
  if (p.level >= activeMaxLevel(MAX_LEVEL)) return;""")

# --- server/ws_auth.ts ------------------------------------------------------
# Both sides widen the join handshake. Upstream also HARDENS it: the token now
# has to carry full scope. Keep every field, keep the hardening, and re-expose
# accountId so the rest of the fork's handler keeps compiling.
weave('server/ws_auth.ts', """<<<<<<< HEAD
    // Additive couch co-op flag: a secondary same-account session from the
    // same household (see the planJoin coop arm). Absent on every existing
    // client, so the wire contract only widens.
    const coop = msg.coop === true;
    const accountId = await accountForToken(token);
    if (accountId === null || !Number.isFinite(characterId)) {
=======
    // Optional rolling-deploy capability. Exact numeric equality is deliberate:
    // strings, booleans, and unknown future versions stay on the legacy wire.
    const timerWireVersion: 1 | typeof STABLE_TIMER_WIRE_VERSION =
      msg.timerWire === STABLE_TIMER_WIRE_VERSION ? STABLE_TIMER_WIRE_VERSION : 1;
    const account = await accountAndScopeForToken(token);
    if (account === null || account.scope !== 'full' || !Number.isFinite(characterId)) {
>>>>>>> v0.32.0""", """    // Additive couch co-op flag: a secondary same-account session from the
    // same household (see the planJoin coop arm). Absent on every existing
    // client, so the wire contract only widens.
    const coop = msg.coop === true;
    // Optional rolling-deploy capability. Exact numeric equality is deliberate:
    // strings, booleans, and unknown future versions stay on the legacy wire.
    const timerWireVersion: 1 | typeof STABLE_TIMER_WIRE_VERSION =
      msg.timerWire === STABLE_TIMER_WIRE_VERSION ? STABLE_TIMER_WIRE_VERSION : 1;
    // v0.32 hardening: a join token must now carry FULL scope, not merely resolve
    // to an account. Kept as upstream wrote it; accountId is re-exposed below so
    // the rest of this handler is unchanged.
    const account = await accountAndScopeForToken(token);
    if (account === null || account.scope !== 'full' || !Number.isFinite(characterId)) {""")

weave('server/ws_auth.ts', """<<<<<<< HEAD
      coop,
=======
      timerWireVersion,
      // The character's stored action-bar layout, sent once to the owning client
      // so it restores at login on any device (game.join re-validates it).
      hotbarLayout: character.hotbar_layout ?? null,
>>>>>>> v0.32.0""", """      coop,
      timerWireVersion,
      // The character's stored action-bar layout, sent once to the owning client
      // so it restores at login on any device (game.join re-validates it).
      hotbarLayout: character.hotbar_layout ?? null,""")

# Re-expose accountId immediately after the guard so downstream fork code that
# still says `accountId` keeps working against upstream's `account` object.
s = io.open(ROOT + 'server/ws_auth.ts', encoding='utf-8').read()
if 'const accountId = account.accountId;' not in s:
    marker = """    const account = await accountAndScopeForToken(token);
    if (account === null || account.scope !== 'full' || !Number.isFinite(characterId)) {"""
    idx = s.find(marker)
    if idx == -1:
        sys.exit('could not locate the guard to append accountId after')
    end = s.find('}', s.find('\n', idx + len(marker)))
    end = s.find('\n', end) + 1
    s = s[:end] + '    const accountId = account.accountId;\n' + s[end:]
    io.open(ROOT + 'server/ws_auth.ts', 'w', encoding='utf-8', newline='').write(s)
    print('  ok  server/ws_auth.ts  accountId re-exposed')
print('done')
