#!/usr/bin/env python3
"""Drop import statements whose module path no longer exists.

Upstream relocated modules (e.g. src/ui/action_bar_painter.ts ->
src/ui/hud/action_bar/action_bar_painter.ts). The fork imported the old paths, so
unioning both import blocks produced duplicate identifiers plus imports of files
that are gone.

For each unresolvable RELATIVE import: if every symbol it brings in is also
imported from a path that does resolve, the statement is stale and is removed.
Otherwise it is reported for manual attention - never silently dropped.

Usage: drop_stale_imports.py <repo> <file>...   (or --all to scan src/ + server/)
"""
import io
import os
import re
import sys

IMP = re.compile(
    r"^import\s+(?:type\s+)?(?:\{(?P<named>[^}]*)\}|[\w$]+|\*\s+as\s+[\w$]+)?"
    r"(?:\s*,\s*\{(?P<named2>[^}]*)\})?\s*from\s*'(?P<mod>[^']+)';\s*$",
    re.S,
)
EXTS = (".ts", ".tsx", ".d.ts", ".js", ".mjs", ".json")


def resolves(base_dir, mod):
    if not mod.startswith("."):
        return True                      # package import; not our problem
    p = os.path.normpath(os.path.join(base_dir, mod))
    for e in EXTS:
        if os.path.isfile(p + e):
            return True
    if os.path.isdir(p):
        for e in EXTS:
            if os.path.isfile(os.path.join(p, "index" + e)):
                return True
    return os.path.isfile(p)


def names_of(m):
    out = []
    for g in ("named", "named2"):
        v = m.group(g)
        if v:
            for part in v.split(","):
                s = " ".join(part.split())
                if s:
                    out.append(s[5:].strip() if s.startswith("type ") else s)
    return out


def process(repo, rel):
    path = os.path.join(repo, rel)
    base = os.path.dirname(path)
    src = io.open(path, encoding="utf-8").read()
    lines = src.split("\n")

    # gather import statements (may span lines)
    stmts = []
    i = 0
    while i < len(lines):
        if lines[i].startswith("import ") or lines[i].startswith("import\t"):
            start = i
            buf = lines[i]
            while buf.count("{") != buf.count("}") or not buf.rstrip().endswith(";"):
                i += 1
                if i >= len(lines):
                    break
                buf += "\n" + lines[i]
            stmts.append((start, i, buf))
        i += 1

    resolved_names = set()
    stale = []
    for start, end, buf in stmts:
        m = IMP.match(buf.strip())
        if not m:
            continue
        mod = m.group("mod")
        if resolves(base, mod):
            resolved_names.update(names_of(m))
        else:
            stale.append((start, end, buf, mod, names_of(m)))

    drop, keep = [], []
    for start, end, buf, mod, names in stale:
        if names and all(n in resolved_names for n in names):
            drop.append((start, end, mod, names))
        else:
            keep.append((mod, [n for n in names if n not in resolved_names]))

    if drop:
        kill = set()
        for start, end, _, _ in drop:
            kill.update(range(start, end + 1))
        lines = [l for n, l in enumerate(lines) if n not in kill]
        io.open(path, "w", encoding="utf-8", newline="\n").write("\n".join(lines))

    if drop or keep:
        print("  %s" % rel)
        for _, _, mod, names in drop:
            print("     dropped stale '%s' (%d symbols re-imported from new path)" % (mod, len(names)))
        for mod, missing in keep:
            print("     !! KEPT '%s' - symbols not found elsewhere: %s" % (mod, ", ".join(missing[:5])))
    return len(drop), len(keep)


repo = sys.argv[1].rstrip("/")
targets = sys.argv[2:]
if targets and targets[0] == "--all":
    targets = []
    for root in ("src", "server", "tests"):
        for dirpath, _, files in os.walk(os.path.join(repo, root)):
            if "node_modules" in dirpath:
                continue
            for f in files:
                if f.endswith(".ts") and not f.endswith(".d.ts"):
                    targets.append(os.path.relpath(os.path.join(dirpath, f), repo).replace("\\", "/"))

td = tk = 0
for rel in targets:
    try:
        d, k = process(repo, rel)
    except Exception as e:  # noqa: BLE001
        print("  ERROR %s: %s" % (rel, e)); continue
    td += d; tk += k
print("\ndropped %d stale import statements; %d flagged for manual review" % (td, tk))
