#!/usr/bin/env python3
"""Second batch of small v0.25.0 conflict resolutions.

Notes on the judgment calls:
- types.ts: godmode (ours, admin) and devGod (upstream, dev cheat) are separate
  features deliberately kept apart; keep both fields.
- bank_window.ts: upstream wins. `bank-count` is styled in components.css:4904
  while our `item-cell-count` is referenced by no stylesheet at all, so ours was
  rendering unstyled. Our comment documents the click handler below and stays.
- i18n.catalog/guide.ts: fork branding wins on `rights`; upstream's new
  `linksLabel` key is additive and kept.
- command_schema.test.ts: counts cannot be picked, they must be re-derived from
  the merged command set. Ours is kept as a placeholder and corrected by running
  the test - flagged in the status doc.
"""
import io
import sys

REPO = "/opt/cr-v030/"

R = [
    (
        "src/sim/types.ts",
        """<<<<<<< HEAD
  /** Godmode (admin tester): outgoing damage one-shots any target, and the player
   *  is invulnerable (gm is set alongside). Toggled by the admin-gated /godmode dev
   *  command so a tester can run to the final bosses without dying. Runtime-only,
   *  never persisted; re-arm after reconnect. */
  godmode?: boolean;
=======
  // [dev] /dev god cheat state, kept OFF the production gm flag so it never touches a
  // real game master (who could otherwise deal 100x or have their invuln toggled).
  devGod?: boolean;
>>>>>>> v0.25.0
""",
        """  /** Godmode (admin tester): outgoing damage one-shots any target, and the player
   *  is invulnerable (gm is set alongside). Toggled by the admin-gated /godmode dev
   *  command so a tester can run to the final bosses without dying. Runtime-only,
   *  never persisted; re-arm after reconnect. */
  godmode?: boolean;
  // [dev] /dev god cheat state, kept OFF the production gm flag so it never touches a
  // real game master (who could otherwise deal 100x or have their invuln toggled).
  devGod?: boolean;
""",
    ),
    (
        "src/ui/bank_window.ts",
        """<<<<<<< HEAD
      cell.innerHTML = `${this.deps.itemIcon(item)}${slot.showCount ? `<span class="item-cell-count">${esc(t('itemUi.bags.stackCount', { count: this.fmt(slot.count) }))}</span>` : ''}`;
      // On touch, the release click after a long-press only dismisses the peek tooltip.
=======
      cell.innerHTML = `${this.deps.itemIcon(item)}<span class="bank-count">${slot.showCount ? esc(t('itemUi.bags.stackCount', { count: this.fmt(slot.count) })) : ''}</span>`;
>>>>>>> v0.25.0
""",
        """      cell.innerHTML = `${this.deps.itemIcon(item)}<span class="bank-count">${slot.showCount ? esc(t('itemUi.bags.stackCount', { count: this.fmt(slot.count) })) : ''}</span>`;
      // On touch, the release click after a long-press only dismisses the peek tooltip.
""",
    ),
    (
        "src/ui/i18n.catalog/guide.ts",
        """<<<<<<< HEAD
    rights: 'Cryptic Realm',
=======
    rights: 'World of ClaudeCraft',
    linksLabel: 'Play and community links',
>>>>>>> v0.25.0
""",
        """    rights: 'Cryptic Realm',
    linksLabel: 'Play and community links',
""",
    ),
    (
        "tests/command_schema.test.ts",
        """<<<<<<< HEAD
const EXPECTED_SEND_COUNT = 165; // + venues + homes + horde trio + skirmish six.
const EXPECTED_DISPATCH_COUNT = 174; // + venues + homes + horde trio + skirmish six.
=======
const EXPECTED_SEND_COUNT = 136; // +Season 1 Armory skin and ignore_add/ignore_remove
const EXPECTED_DISPATCH_COUNT = 145; // +Season 1 Armory skin and ignore_add/ignore_remove
>>>>>>> v0.25.0
""",
        """const EXPECTED_SEND_COUNT = 165; // + venues + homes + horde trio + skirmish six.
const EXPECTED_DISPATCH_COUNT = 174; // + venues + homes + horde trio + skirmish six.
""",
    ),
    (
        "tests/server/http/completeness.test.ts",
        """<<<<<<< HEAD
  new URL('../../../server/oauth.ts', import.meta.url),
=======
  new URL('../../../server/claudium.ts', import.meta.url),
>>>>>>> v0.25.0
""",
        """  new URL('../../../server/claudium.ts', import.meta.url),
  new URL('../../../server/oauth.ts', import.meta.url),
""",
    ),
    (
        "tests/visual_manifest.test.ts",
        """<<<<<<< HEAD
import { setRealmHostEnv } from '../src/sim/realms/registry';
=======
import { NPCS } from '../src/sim/data';
>>>>>>> v0.25.0
""",
        """import { NPCS } from '../src/sim/data';
import { setRealmHostEnv } from '../src/sim/realms/registry';
""",
    ),
]

ok, fail = [], []
for rel, old, new in R:
    path = REPO + rel
    with io.open(path, encoding="utf-8") as fh:
        src = fh.read()
    if old not in src:
        fail.append(rel)
        continue
    src = src.replace(old, new, 1)
    with io.open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(src)
    ok.append("%s (remaining hunks: %d)" % (rel, src.count("<<<<<<<")))

print("RESOLVED:")
for s in ok:
    print("  " + s)
if fail:
    print("FAILED TO MATCH:")
    for s in fail:
        print("  " + s)
    sys.exit(1)
