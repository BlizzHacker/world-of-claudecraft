#!/usr/bin/env python3
"""Merge the conflicted src/ui/i18n.catalog/*.ts files.

Base is UPSTREAM's file: it carries hundreds of translator-facing comments (787 in
hud_chrome.ts), upstream's formatting, and all upstream-new keys. We then overlay
only what the fork must own:

1. Shared leaves are compared on NORMALIZED content, so upstream's quote-style
   reformatting (1028 leaves in hud_chrome, 1940 in shell) is not fought.
2. Where real content differs, OURS wins only when the value is fork-owned -
   Cryptic/MoveWeight/ArcForge branding, the $CR token, platinum, Hellmaw, our
   domains - or when upstream's value carries upstream branding. Otherwise
   UPSTREAM wins, so its newer prose and its own feature renames survive.
3. Fork-only leaves are inserted, creating any ancestor groups upstream lacks
   (e.g. sim.venues, coop, contributions, arcade, discord.relay.*).

Writes the merged file. Prints an audit of every ours-wins decision.
"""
import io
import re
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

FORK_OURS = re.compile(
    r"cryptic|crypticrealm|moveweight|arcforge|\$CR\b|\$?WOC\b|platinum|hellmaw|"
    r"eastbrook|thornwheel|boarpit|skirmish|exchange realm|discord\.gg/Zdj3JGrx",
    re.I,
)
UPSTREAM_BRAND = re.compile(r"claudecraft|worldofclaudecraft|\bWOC\b|\$WOC", re.I)


def norm(v):
    s = re.sub(r"\s*\n\s*", " ", v.strip())
    m = re.match(r"^(['\"`])(.*)\1$", s, re.S)
    if m:
        s = m.group(2)
    s = s.replace("\\'", "'").replace('\\"', '"')
    return re.sub(r"\s+", " ", s).strip()


def root_close(lines):
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].strip() in ("};", "} as const;"):
            return i
    raise SystemExit("no root close")


def merge(rel):
    ot, tt = stage(REPO, 2, rel), stage(REPO, 3, rel)
    olines, ol, og = parse(ot)
    tlines, tl, tg = parse(tt)

    shared = set(ol) & set(tl)
    only_ours = [p for p in ol if p not in tl]

    # ---- 1/2. value overrides on real content differences
    replace = {}   # theirs start line -> replacement text lines
    audit = []
    for p in sorted(shared):
        o, t = ol[p], tl[p]
        if norm(o["value"]) == norm(t["value"]):
            continue
        ours_owns = bool(FORK_OURS.search(norm(o["value"]))) or bool(
            UPSTREAM_BRAND.search(norm(t["value"]))
        )
        if not ours_owns:
            continue
        key = p[-1]
        body = o["value"]
        # re-indent our value block to upstream's indent for this leaf
        blines = body.split("\n")
        out = [t["indent"] + key + ": " + blines[0].strip()]
        for b in blines[1:]:
            out.append(t["indent"] + "  " + b.strip())
        out[-1] = out[-1] + ","
        replace[t["start"]] = (t["end"], out)
        audit.append((".".join(p), norm(o["value"])[:60], norm(t["value"])[:60]))

    # ---- 3. insert fork-only leaves, creating missing ancestor groups
    rclose = root_close(tlines)
    inserts = {}   # anchor line -> list of text lines
    created = {}
    for p in only_ours:
        # deepest existing ancestor group
        anchor_path = None
        for i in range(len(p) - 1, 0, -1):
            if p[:i] in tg and tg[p[:i]]["close"] is not None:
                anchor_path = p[:i]
                break
        if anchor_path is None:
            anchor_line, base_indent = rclose, ""
            missing = list(p[:-1])
        else:
            anchor_line = tg[anchor_path]["close"]
            base_indent = tg[anchor_path]["indent"] + "  "
            missing = list(p[len(anchor_path):-1])
        bucket = inserts.setdefault((anchor_line, tuple(missing), base_indent), [])
        bucket.append(p)
        if missing:
            created.setdefault(".".join(list(anchor_path or ()) + missing), 0)
            created[".".join(list(anchor_path or ()) + missing)] += 1

    ins_lines = {}
    for (anchor_line, missing, base_indent), paths in sorted(inserts.items()):
        block = []
        ind = base_indent
        for g in missing:
            block.append(ind + g + ": {")
            ind += "  "
        for p in sorted(paths):
            v = ol[p]["value"]
            vl = v.split("\n")
            block.append(ind + p[-1] + ": " + vl[0].strip())
            for b in vl[1:]:
                block.append(ind + "  " + b.strip())
            block[-1] += ","
        for _ in missing:
            ind = ind[:-2]
            block.append(ind + "},")
        ins_lines.setdefault(anchor_line, []).extend(block)

    # ---- emit
    out = []
    i = 0
    while i < len(tlines):
        if i in ins_lines:
            out.extend(ins_lines[i])
            del ins_lines[i]
        if i in replace:
            end, repl = replace[i]
            out.extend(repl)
            i = end
            continue
        out.append(tlines[i])
        i += 1
    for leftover in ins_lines.values():
        out.extend(leftover)

    text = "\n".join(out)
    if not text.endswith("\n"):
        text += "\n"
    io.open(REPO + "/" + rel, "w", encoding="utf-8", newline="\n").write(text)
    return audit, len(only_ours), created


total_ours = 0
for rel in FILES:
    audit, n_new, created = merge(rel)
    total_ours += len(audit)
    print("=" * 72)
    print("%s: %d ours-wins overrides, %d fork-only leaves inserted" % (rel.split("/")[-1], len(audit), n_new))
    if created:
        print("  groups created: %s" % ", ".join("%s(%d)" % (k, v) for k, v in sorted(created.items())))
    for k, o, t in audit[:10]:
        print("   %s\n     ours  : %s\n     theirs: %s" % (k, o, t))
print("=" * 72)
print("total ours-wins overrides: %d" % total_ours)
