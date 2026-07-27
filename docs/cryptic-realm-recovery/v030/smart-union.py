#!/usr/bin/env python3
"""Re-resolve a file with a similarity-aware, order-aware union rule.

Two lessons are encoded here, both learned from real damage:

1. Concatenation is safe as long as the side placed FIRST is balanced. The second
   side may leave a construct open, because the shared text following the hunk
   closes it - exactly how it read in its own parent. The earlier "both sides must
   be balanced" rule dropped `function interactKey(): void {`, orphaning its body.

2. But concatenation is WRONG when the two sides are variants of the SAME code:
   that redeclares their locals (const id / px / inCombat). Similar sides must
   pick one.

Order of decisions:
  theirs empty        -> ours
  ours empty          -> theirs
  sides similar       -> pick one (fork-sensitive wins for the fork)
  theirs balanced     -> theirs, then ours
  ours balanced       -> ours, then theirs
  neither             -> pick one

Usage: smart_union.py <repo> <merge-sha> <file>...
"""
import difflib
import io
import re
import subprocess
import sys

FORK = re.compile(
    r"cryptic|moveweight|arcforge|\$CR\b|platinum|hellmaw|infernal|eastbrook|"
    r"thornwheel|derby|boarpit|skirmish|vale_?cup|ladder|hardcore|coop|d2Mob|"
    r"godmode|pickit|waypoint|townPortal|delve",
    re.I,
)
OPEN, CLOSE = set("{(["), set("})]")
SIMILAR = 0.45

NL = chr(10)

DECL = re.compile(r"^\s*(?:export\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)")


def declared(lines):
    """Identifiers this side binds. If both sides bind the same name, they are
    alternatives - concatenating them is a redeclaration, not a merge."""
    out = set()
    for l in lines:
        m = DECL.match(l)
        if m:
            out.add(m.group(1))
        # `const a = 1, b = 2;` and destructuring are close enough for this purpose
        for m2 in re.finditer(r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)", l):
            out.add(m2.group(1))
    return out


def balanced(lines):
    d = t = 0
    for l in lines:
        s = re.sub(r"//.*$", "", l)
        for ch in s:
            if ch == "`":
                t += 1
            elif ch in OPEN:
                d += 1
            elif ch in CLOSE:
                d -= 1
    return d == 0 and t % 2 == 0


def sh(*a):
    return subprocess.run(a, capture_output=True, text=True)


def main():
    repo, merge = sys.argv[1].rstrip("/"), sys.argv[2]
    base = sh("git", "-C", repo, "merge-base", merge + "^1", merge + "^2").stdout.strip()

    for rel in sys.argv[3:]:
        for tag, rev in (("base", base), ("ours", merge + "^1"), ("theirs", merge + "^2")):
            io.open("/tmp/su_" + tag, "w", encoding="utf-8", newline=NL).write(
                sh("git", "-C", repo, "show", "%s:%s" % (rev, rel)).stdout)
        merged = sh("git", "merge-file", "-p",
                    "/tmp/su_ours", "/tmp/su_base", "/tmp/su_theirs").stdout

        lines = merged.split(NL)
        out, i, stats = [], 0, {}
        while i < len(lines):
            if not lines[i].startswith("<<<<<<<"):
                out.append(lines[i])
                i += 1
                continue
            i += 1
            ours = []
            while i < len(lines) and not lines[i].startswith("======="):
                ours.append(lines[i])
                i += 1
            i += 1
            theirs = []
            while i < len(lines) and not lines[i].startswith(">>>>>>>"):
                theirs.append(lines[i])
                i += 1
            i += 1

            o = [l for l in ours if l.strip()]
            t = [l for l in theirs if l.strip()]
            otext, ttext = NL.join(o), NL.join(t)
            forkish = bool(FORK.search(otext))

            clash = declared(ours) & declared(theirs)

            if not t:
                rule, emit = "ours", ours
            elif not o:
                rule, emit = "theirs", theirs
            elif clash:
                # both sides bind the same name: alternatives, not additions
                rule, emit = ("alt-ours", ours) if forkish else ("alt-theirs", theirs)
            elif difflib.SequenceMatcher(None, otext, ttext).ratio() >= SIMILAR:
                rule, emit = ("variant-ours", ours) if forkish else ("variant-theirs", theirs)
            elif balanced(theirs):
                rule, emit = "union", theirs + ours
            elif balanced(ours):
                rule, emit = "union-rev", ours + theirs
            else:
                rule, emit = ("pick-ours", ours) if forkish else ("pick-theirs", theirs)

            stats[rule] = stats.get(rule, 0) + 1
            out.extend(emit)

        txt = NL.join(out)
        io.open(repo + "/" + rel, "w", encoding="utf-8", newline=NL).write(txt)
        print("  %-30s %s left=%d" % (
            rel, " ".join("%s=%d" % kv for kv in sorted(stats.items())), txt.count("<<<<<<<")))


main()
