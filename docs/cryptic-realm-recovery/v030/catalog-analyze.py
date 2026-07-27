#!/usr/bin/env python3
"""Read-only: size the catalog merge before touching anything.

For each conflicted i18n.catalog file, report shared leaves, value differences,
fork-only leaves, and - critically - how many fork-only leaves sit under a parent
group that upstream does not have (those need a group created, not just a line
inserted).
"""
import sys

sys.path.insert(0, "/tmp")
from catalog_lib import parse, stage  # noqa: E402

REPO = "/opt/cr-measure"
FILES = [
    "src/ui/i18n.catalog/guide.ts",
    "src/ui/i18n.catalog/hud_chrome.ts",
    "src/ui/i18n.catalog/index.ts",
    "src/ui/i18n.catalog/shell.ts",
]
FORK = ("cryptic", "moveweight", "arcforge", "$cr", "platinum", "hellmaw")

for rel in FILES:
    ot, tt = stage(REPO, 2, rel), stage(REPO, 3, rel)
    if ot is None or tt is None:
        print("%s: MISSING STAGE" % rel)
        continue
    _, ol, og = parse(ot)
    tl_lines, tl, tg = parse(tt)

    shared = set(ol) & set(tl)
    diff = [p for p in shared if ol[p]["value"] != tl[p]["value"]]
    only_ours = sorted(set(ol) - set(tl))
    only_theirs = set(tl) - set(ol)

    # fork-only leaves whose parent group upstream lacks
    orphan_parents = {}
    for p in only_ours:
        parent = p[:-1]
        if parent and parent not in tg:
            orphan_parents.setdefault(parent, []).append(p)

    branded = [p for p in diff if any(f in ol[p]["value"].lower() for f in FORK)]

    print("=" * 72)
    print(rel)
    print("  leaves ours=%d theirs=%d shared=%d" % (len(ol), len(tl), len(shared)))
    print("  shared values differing : %d  (of which fork-branded: %d)" % (len(diff), len(branded)))
    print("  fork-only leaves        : %d" % len(only_ours))
    print("  upstream-new leaves     : %d" % len(only_theirs))
    print("  fork-only under a parent upstream LACKS: %d leaves in %d groups"
          % (sum(len(v) for v in orphan_parents.values()), len(orphan_parents)))
    for parent, ps in list(orphan_parents.items())[:6]:
        print("      missing group %s  (%d leaves)" % (".".join(parent), len(ps)))
    for p in only_ours[:6]:
        print("      fork-only: %s" % ".".join(p))
