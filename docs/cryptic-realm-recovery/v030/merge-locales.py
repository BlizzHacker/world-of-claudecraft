#!/usr/bin/env python3
"""Order-aware key-level union for the conflicted i18n locale overlays.

Policy (docs/cryptic-realm-recovery + the v0.26.0 intake precedent):
  * union of keys
  * OURS wins on duplicate keys  - 454 shared values carry Cryptic Realm
    branding across 20 locales that upstream's values would revert
  * upstream's new keys are added - ~2149 per full locale

Ordering matters: these are divergence-only overlays whose keys must follow the
`en` leaf order, enforced by tests/i18n_overlay_key_membership.test.ts plus a
byte gate. A plain dict union would scramble that, so shared keys are emitted in
UPSTREAM's order (its catalog is the newer one) and each side's exclusive keys
are re-inserted immediately after the shared key they followed in their own
file. That keeps every key adjacent to the neighbours it was authored next to.

Header/footer are taken from upstream: they are boilerplate docs plus the
TranslationKey import, and carry no fork content.

Usage: merge_locales.py <repo> <file-list>   (files relative to repo)
"""
import io
import os
import re
import subprocess
import sys

KEYLINE = re.compile(r"^\s*'((?:[^'\\]|\\.)+)'\s*:")


def stage(repo, n, path):
    r = subprocess.run(["git", "-C", repo, "show", ":%d:%s" % (n, path)],
                       capture_output=True, text=True)
    if r.returncode != 0:
        return None
    return r.stdout


def split_file(text):
    """-> (header_lines, entries, footer_lines).

    entries = ordered [(key, [raw lines including any attached leading comments])]
    """
    lines = text.split("\n")
    # header ends at the line that opens the object literal
    start = None
    for i, l in enumerate(lines):
        if re.search(r"=\s*\{\s*$", l) and "Record" in l or re.match(r"^export const \w+.*\{\s*$", l):
            start = i
            break
    if start is None:
        for i, l in enumerate(lines):
            if l.rstrip().endswith("= {"):
                start = i
                break
    if start is None:
        raise SystemExit("cannot find object literal opening")

    # footer starts at the last line that is exactly '};'
    end = None
    for i in range(len(lines) - 1, start, -1):
        if lines[i].strip() == "};":
            end = i
            break
    if end is None:
        raise SystemExit("cannot find object literal close")

    header = lines[: start + 1]
    footer = lines[end:]
    body = lines[start + 1 : end]

    entries = []
    pending = []          # comment / blank lines awaiting their entry
    cur_key = None
    cur = []
    depth = 0

    def flush():
        if cur_key is not None:
            entries.append((cur_key, pending + cur))

    for l in body:
        if cur_key is None:
            m = KEYLINE.match(l)
            if m:
                cur_key = m.group(1)
                cur = [l]
                depth = l.count("{") - l.count("}") + l.count("[") - l.count("]")
                if depth <= 0 and l.rstrip().endswith(","):
                    entries.append((cur_key, pending + cur))
                    pending, cur_key, cur = [], None, []
            else:
                pending.append(l)
        else:
            cur.append(l)
            depth += l.count("{") - l.count("}") + l.count("[") - l.count("]")
            if depth <= 0 and l.rstrip().endswith(","):
                entries.append((cur_key, pending + cur))
                pending, cur_key, cur = [], None, []
    flush()
    return header, entries, footer


def anchors(entries, shared):
    """key -> the shared key it follows in this file (None if it precedes all)."""
    out = {}
    last = None
    for k, _ in entries:
        if k in shared:
            last = k
        else:
            out[k] = last
    return out


def merge_one(repo, rel):
    ours_t, theirs_t = stage(repo, 2, rel), stage(repo, 3, rel)
    if ours_t is None or theirs_t is None:
        return None, "missing stage"
    oh, oe, of = split_file(ours_t)
    th, te, tf = split_file(theirs_t)

    okeys = [k for k, _ in oe]
    tkeys = [k for k, _ in te]
    ours_map = dict(oe)
    theirs_map = dict(te)
    shared = set(okeys) & set(tkeys)

    oa = anchors(oe, shared)
    ta = anchors(te, shared)
    only_ours = [k for k in okeys if k not in shared]
    only_theirs = [k for k in tkeys if k not in shared]

    by_anchor_ours, by_anchor_theirs = {}, {}
    for k in only_ours:
        by_anchor_ours.setdefault(oa[k], []).append(k)
    for k in only_theirs:
        by_anchor_theirs.setdefault(ta[k], []).append(k)

    out, seen = [], set()

    def emit(k, block):
        if k in seen:
            return
        seen.add(k)
        out.extend(block)

    for k in by_anchor_ours.get(None, []):
        emit(k, ours_map[k])
    for k in by_anchor_theirs.get(None, []):
        emit(k, theirs_map[k])

    # shared keys in UPSTREAM order; ours wins the value
    for k in tkeys:
        if k not in shared:
            continue
        emit(k, ours_map[k])
        for x in by_anchor_ours.get(k, []):
            emit(x, ours_map[x])
        for x in by_anchor_theirs.get(k, []):
            emit(x, theirs_map[x])

    # safety net: nothing may be dropped
    for k in okeys:
        emit(k, ours_map[k])
    for k in tkeys:
        emit(k, theirs_map[k])

    text = "\n".join(th + out + tf)
    if not text.endswith("\n"):
        text += "\n"
    with io.open(os.path.join(repo, rel), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    return (len(shared), len(only_ours), len(only_theirs), len(seen)), None


def main():
    repo = sys.argv[1]
    files = [l.strip() for l in open(sys.argv[2]) if "i18n.locales" in l]
    print("%-30s %8s %10s %12s %8s" % ("FILE", "shared", "only-ours", "only-theirs", "total"))
    print("-" * 74)
    bad = []
    for rel in files:
        stats, err = merge_one(repo, rel)
        if err:
            bad.append((rel, err))
            continue
        s, o, t, tot = stats
        print("%-30s %8d %10d %12d %8d" % (rel.split("/")[-1], s, o, t, tot))
    print("-" * 74)
    if bad:
        print("FAILED:")
        for r, e in bad:
            print("  %s: %s" % (r, e))
        sys.exit(1)
    print("merged %d locale overlays" % len(files))


main()
