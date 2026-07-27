#!/usr/bin/env python3
"""Merge conflict hunks that contain only import statements.

A blind union of two import blocks produces two `import ... from 'x'` lines for
any module both sides touched, which biome rejects. This unions at the SPECIFIER
level instead: one import per module, named specifiers merged and sorted,
`import type` collapsed into a value import when both forms appear (using inline
`type` markers), and leading comments preserved.

Hunks it cannot confidently parse are left untouched and reported, so nothing is
silently mangled.

Usage: merge_imports.py <repo> <path> [<path>...]
"""
import io
import re
import sys

IMPORT_RE = re.compile(
    r"^import\s+(?:(type)\s+)?(?:\{(?P<named>[^}]*)\}|(?P<star>\*\s+as\s+[\w$]+)|(?P<dflt>[\w$]+))?"
    r"\s*(?:,\s*\{(?P<named2>[^}]*)\})?\s*from\s*['\"](?P<mod>[^'\"]+)['\"];?\s*$",
    re.S,
)
SIDE_EFFECT_RE = re.compile(r"^import\s*['\"](?P<mod>[^'\"]+)['\"];?\s*$")


def collect(lines):
    """-> (entries, ok). entries: list of dicts; ok False if anything unparsable."""
    entries = []
    pending_comments = []
    buf = ""
    for raw in lines:
        s = raw.strip()
        if not s:
            if not buf:
                pending_comments.append(raw)
            continue
        if not buf and (s.startswith("//") or s.startswith("/*") or s.startswith("*")):
            pending_comments.append(raw)
            continue
        buf = (buf + "\n" + raw) if buf else raw
        if buf.count("{") != buf.count("}"):
            continue
        if not buf.rstrip().endswith(";") and "from" not in buf:
            continue
        text = buf.strip()
        buf = ""
        m = SIDE_EFFECT_RE.match(text)
        if m:
            entries.append({"mod": m.group("mod"), "side": True, "comments": pending_comments})
            pending_comments = []
            continue
        m = IMPORT_RE.match(text)
        if not m:
            return entries, False
        named = []
        for group in ("named", "named2"):
            g = m.group(group)
            if g:
                for part in g.split(","):
                    part = " ".join(part.split())
                    if part:
                        named.append(part)
        entries.append({
            "mod": m.group("mod"),
            "type_only": bool(m.group(1)),
            "named": named,
            "star": m.group("star"),
            "dflt": m.group("dflt"),
            "side": False,
            "comments": pending_comments,
        })
        pending_comments = []
    if buf.strip():
        return entries, False
    return entries, True


def render(order, by_mod):
    out = []
    for mod in order:
        es = by_mod[mod]
        comments = []
        for e in es:
            comments.extend(e["comments"])
        if any(e["side"] for e in es):
            out.extend(comments)
            out.append("import '%s';" % mod)
            continue
        names, dflt, star = {}, None, None
        all_type = True
        for e in es:
            if not e["named"] and not e["dflt"] and not e["star"]:
                continue
            if not e["type_only"]:
                all_type = False
            for n in e["named"]:
                bare = n[5:].strip() if n.startswith("type ") else n
                is_t = n.startswith("type ") or e["type_only"]
                # a value import of the same name wins over a type-only one
                if bare in names:
                    names[bare] = names[bare] and is_t
                else:
                    names[bare] = is_t
            dflt = dflt or e["dflt"]
            star = star or e["star"]
        out.extend(comments)
        prefix = "import type " if (all_type and names and not dflt and not star) else "import "
        specs = []
        for bare in sorted(names, key=str.lower):
            if names[bare] and not all_type:
                specs.append("type " + bare)
            else:
                specs.append(bare)
        head = []
        if dflt:
            head.append(dflt)
        if star:
            head.append(star)
        body = ""
        if specs:
            body = "{ " + ", ".join(specs) + " }"
        joined = ", ".join([x for x in head + ([body] if body else []) if x])
        line = "%s%s from '%s';" % (prefix, joined, mod)
        if len(line) <= 100 or not specs:
            out.append(line)
        else:
            out.append("%s{" % prefix)
            for s in specs:
                out.append("  %s," % s)
            out.append("} from '%s';" % mod)
    return out


def process(path):
    src = io.open(path, encoding="utf-8").read()
    lines = src.split("\n")
    out = []
    i = 0
    merged = skipped = 0
    while i < len(lines):
        if not lines[i].startswith("<<<<<<<"):
            out.append(lines[i]); i += 1; continue
        start = i
        i += 1
        ours = []
        while i < len(lines) and not lines[i].startswith("======="):
            ours.append(lines[i]); i += 1
        i += 1
        theirs = []
        while i < len(lines) and not lines[i].startswith(">>>>>>>"):
            theirs.append(lines[i]); i += 1
        marker = lines[i] if i < len(lines) else ">>>>>>>"
        i += 1

        eo, ok1 = collect(ours)
        et, ok2 = collect(theirs)
        if not (ok1 and ok2) or not (eo or et):
            out.append(lines[start])
            out.extend(ours)
            out.append("=======")
            out.extend(theirs)
            out.append(marker)
            skipped += 1
            continue
        by_mod, order = {}, []
        for e in et + eo:            # upstream order first, ours appended
            if e["mod"] not in by_mod:
                by_mod[e["mod"]] = []
                order.append(e["mod"])
            by_mod[e["mod"]].append(e)
        out.extend(render(order, by_mod))
        merged += 1
    text = "\n".join(out)
    io.open(path, "w", encoding="utf-8", newline="\n").write(text)
    return merged, skipped, text.count("<<<<<<<")


for p in sys.argv[2:]:
    full = sys.argv[1].rstrip("/") + "/" + p
    try:
        m, s, left = process(full)
    except Exception as e:                      # noqa: BLE001
        print("  ERROR %-40s %s" % (p, e))
        continue
    print("  %-44s import-hunks merged=%-3d skipped=%-3d remaining=%d" % (p, m, s, left))
