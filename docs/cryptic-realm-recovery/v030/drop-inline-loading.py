#!/usr/bin/env python3
"""Remove upstream's inline loading-screen implementation from src/main.ts.

The fork extracted it to src/game/loading_screen.ts (which exports exactly the
five symbols main.ts imports, and already has the tip rotation). Upstream still
has it inline, so the merged file both imports and re-declares them - TS2440.

Deletes the inline block, but only after verifying that nothing OUTSIDE the block
references the block's internals.
"""
import io
import re
import sys

P = "/opt/cr-measure/src/main.ts"
lines = io.open(P, encoding="utf-8").read().split("\n")

# locate the block: from `const LOADING_FADE_MS` to the close of hideLoadingScreen
start = None
for i, l in enumerate(lines):
    if l.startswith("const LOADING_FADE_MS"):
        start = i
        break
if start is None:
    print("inline block not found (already removed?)")
    sys.exit(0)

hid = None
for i in range(start, len(lines)):
    if lines[i].startswith("function hideLoadingScreen"):
        hid = i
        break
if hid is None:
    print("hideLoadingScreen not found"); sys.exit(1)
end = None
depth = 0
for i in range(hid, len(lines)):
    depth += lines[i].count("{") - lines[i].count("}")
    if depth == 0 and i > hid:
        end = i
        break
if end is None:
    print("could not find end of hideLoadingScreen"); sys.exit(1)

block = lines[start:end + 1]
# internals declared inside the block
decl = re.compile(r"^(?:let|const|function)\s+([A-Za-z_$][\w$]*)")
internals = set()
for l in block:
    m = decl.match(l)
    if m:
        internals.add(m.group(1))

outside = "\n".join(lines[:start] + lines[end + 1:])
imported = set()
for m in re.finditer(r"^import[^;]*?\{([^}]*)\}[^;]*;", outside, re.S | re.M):
    for part in m.group(1).split(","):
        s = " ".join(part.split())
        if s:
            imported.add(s[5:].strip() if s.startswith("type ") else s)

risky = []
for name in sorted(internals):
    if name in imported:
        continue            # comes from the shared module now
    if re.search(r"\b%s\b" % re.escape(name), outside):
        risky.append(name)

print("block lines %d-%d (%d lines); internals: %s" % (start + 1, end + 1, len(block),
                                                       ", ".join(sorted(internals))))
if risky:
    print("ABORT - still referenced outside the block and not imported: %s" % ", ".join(risky))
    sys.exit(1)

del lines[start:end + 1]
io.open(P, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
print("removed upstream's inline loading-screen block; fork's shared module now owns it")
