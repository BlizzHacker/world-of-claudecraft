#!/usr/bin/env python3
"""Re-add imports that were lost when import hunks picked a side.

Reads a tsc log, collects every "Cannot find name 'X'" (TS2304/TS2552), finds
which module in the repo exports X, and adds the import to the erroring file -
merging into an existing import from that module when there is one.

Only acts when EXACTLY ONE module exports the symbol, so an ambiguous name is
reported rather than guessed.

Usage: readd_lost_imports.py <repo> <tsc.log> [--apply]
"""
import io
import os
import re
import sys
from collections import defaultdict

repo = sys.argv[1].rstrip("/")
log = sys.argv[2]
apply = "--apply" in sys.argv

ERR = re.compile(r"^([^(]+)\((\d+),\d+\): error TS(?:2304|2552): Cannot find name '([^']+)'")
wanted = defaultdict(set)
for line in io.open(log, encoding="utf-8", errors="replace"):
    m = ERR.match(line.strip())
    if m:
        wanted[m.group(1)].add(m.group(3))

# index exports across the tree
exports = defaultdict(set)   # symbol -> {module rel path without ext}
EXP = re.compile(
    r"^export\s+(?:declare\s+)?(?:async\s+)?"
    r"(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)", re.M)
EXP_LIST = re.compile(r"^export\s*\{([^}]*)\}", re.M)
for root in ("src", "server"):
    for dirpath, _, files in os.walk(os.path.join(repo, root)):
        if "node_modules" in dirpath:
            continue
        for f in files:
            if not f.endswith(".ts") or f.endswith(".d.ts"):
                continue
            p = os.path.join(dirpath, f)
            try:
                src = io.open(p, encoding="utf-8", errors="replace").read()
            except OSError:
                continue
            rel = os.path.relpath(p, repo).replace("\\", "/")[:-3]
            for m in EXP.finditer(src):
                exports[m.group(1)].add(rel)
            for m in EXP_LIST.finditer(src):
                for part in m.group(1).split(","):
                    s = " ".join(part.split())
                    if not s or " as " in s:
                        continue
                    exports[s[5:].strip() if s.startswith("type ") else s].add(rel)

added = ambiguous = missing = 0
for rel, syms in sorted(wanted.items()):
    path = os.path.join(repo, rel)
    if not os.path.isfile(path):
        continue
    src = io.open(path, encoding="utf-8").read()
    lines = src.split("\n")
    base = os.path.dirname(rel)
    plan = defaultdict(list)     # module spec -> symbols
    for sym in sorted(syms):
        # single/two--char names are locals, not module exports
        if len(sym) < 3:
            continue
        cands = exports.get(sym, set())
        cands = {c for c in cands if c != rel[:-3]}
        if len(cands) != 1:
            if cands:
                ambiguous += 1
            else:
                missing += 1
            continue
        target = next(iter(cands))
        spec = os.path.relpath(target, base).replace("\\", "/")
        if not spec.startswith("."):
            spec = "./" + spec
        plan[spec].append(sym)

    if not plan:
        continue
    for spec, syms2 in plan.items():
        # merge into an existing single-line import from the same module
        pat = re.compile(r"^import\s+(type\s+)?\{([^}]*)\}\s*from\s*'" + re.escape(spec) + r"';$", re.M)
        m = pat.search(src)
        if m:
            existing = [x.strip() for x in m.group(2).split(",") if x.strip()]
            allsyms = sorted(set(existing + syms2), key=str.lower)
            repl = "import %s{ %s } from '%s';" % (m.group(1) or "", ", ".join(allsyms), spec)
            src = src[:m.start()] + repl + src[m.end():]
        else:
            newline = "import { %s } from '%s';" % (", ".join(sorted(syms2, key=str.lower)), spec)
            lines = src.split("\n")
            ins = 0
            for i, l in enumerate(lines[:400]):
                if l.startswith("import ") or l.startswith("} from '"):
                    ins = i + 1
            lines.insert(ins, newline)
            src = "\n".join(lines)
        added += len(syms2)
        print("  %-44s + %s from '%s'" % (rel, ", ".join(syms2), spec))
    if apply:
        io.open(path, "w", encoding="utf-8", newline="\n").write(src)

print("\nre-added %d symbol import(s); ambiguous=%d unknown=%d%s"
      % (added, ambiguous, missing, "" if apply else "  (dry run)"))
