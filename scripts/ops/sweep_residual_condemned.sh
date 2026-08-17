#!/bin/bash
#
# Residual sweep: everything the served-scope quarantine deliberately left behind.
#
# Two kinds of thing, both reintroduction routes even though neither is served:
#   1. the condemned GLBs mirrored into non-served asset dirs, and
#   2. surviving copies of the rebuild RECIPE in other worktrees, which
#      regenerate the whole bank from source assets.
#
# Moves into the SAME dated quarantine tree and APPENDS to the same md5 manifest,
# so there is one record of where every byte went.
#
# WORKTREE SAFETY: moving a TRACKED file out of a git worktree shows up as an
# uncommitted deletion, so a worktree that already has uncommitted work is
# skipped and reported rather than disturbed - with one explicitly authorised
# exception, /opt/cr-intake-v036 (the live v0.36.0 intake), where exactly one
# file is moved and nothing else is touched.
#
# The GLB mirrors under public/cr-realms and dist/cr-realms are GITIGNORED
# (.gitignore:119), so moving one cannot dirty a worktree and cannot disturb
# anybody's in-progress work. That protection is therefore applied to tracked
# files only; applying it to ignored files as well would strand the condemned
# bodies in the SERVED stages just because a generated file happened to be
# modified, which is the opposite of the intent.
#
#   bash sweep_residual_condemned.sh            # dry run
#   bash sweep_residual_condemned.sh --commit
#
set -uo pipefail

PATTERN='infernal_human_'
QUAR="/root/condemned_bank_20260817"
MANIFEST="$QUAR/MANIFEST.md5"
MODE="dry"
[ "${1:-}" = "--commit" ] && MODE="commit"

AUTHORISED_DIRTY="/opt/cr-intake-v036"

say() { printf '%s\n' "$*"; }
hr() { printf '%s\n' "-------------------------------------------------------------------"; }

say "=== RESIDUAL SWEEP (mode=$MODE) -> $QUAR"
[ -d "$QUAR" ] || { say "REFUSING: quarantine dir $QUAR does not exist."; exit 1; }
[ -f "$MANIFEST" ] || { say "REFUSING: manifest $MANIFEST missing."; exit 1; }
say "existing manifest entries: $(wc -l < "$MANIFEST")"
hr

ALL="$(mktemp)"; SAFE="$(mktemp)"; SKIP="$(mktemp)"
trap 'rm -f "$ALL" "$SAFE" "$SKIP"' EXIT
find / -xdev -type f -name "*${PATTERN}*" \
  -not -path "$QUAR/*" -not -path '*/proc/*' -not -path '*/sys/*' 2>/dev/null \
  | sort > "$ALL"
say "residual files found: $(wc -l < "$ALL")"
hr

say "[classify] tracked-vs-ignored, then worktree state"
declare -A WT_STATE
while IFS= read -r f; do
  d="$(dirname "$f")"
  root="$(git -C "$d" rev-parse --show-toplevel 2>/dev/null)"
  if [ -z "$root" ]; then
    printf '%s\n' "$f" >> "$SAFE"
    continue
  fi
  if ! git -C "$root" ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    printf '%s\n' "$f" >> "$SAFE"
    continue
  fi
  if [ -z "${WT_STATE[$root]:-}" ]; then
    if [ -n "$(git -C "$root" status --porcelain 2>/dev/null | grep -v '^??' | head -1)" ]; then
      WT_STATE[$root]="dirty"
    else
      WT_STATE[$root]="clean"
    fi
  fi
  if [ "${WT_STATE[$root]}" = "clean" ] || [ "$root" = "$AUTHORISED_DIRTY" ]; then
    printf '%s\n' "$f" >> "$SAFE"
  else
    printf '%s\t%s\n' "$f" "$root" >> "$SKIP"
  fi
done < "$ALL"
touch "$SAFE" "$SKIP"

if [ ${#WT_STATE[@]} -gt 0 ]; then
  say "  worktrees holding TRACKED matches:"
  for root in "${!WT_STATE[@]}"; do
    note=""
    [ "$root" = "$AUTHORISED_DIRTY" ] && note="  (AUTHORISED: one file only)"
    printf '     %-38s %s%s\n' "$root" "${WT_STATE[$root]}" "$note"
  done
fi
hr

say "[plan] will move: $(wc -l < "$SAFE")   will SKIP (tracked in a dirty worktree): $(wc -l < "$SKIP")"
say "  by directory:"
sed 's|/[^/]*$||' "$SAFE" | sort | uniq -c | sort -rn | sed 's/^/     /'
if [ -s "$SKIP" ]; then
  say "  SKIPPED (left strictly alone):"
  sed 's/^/     /' "$SKIP"
fi
hr

say "[recipe] rebuild-script copies in scope (the dangerous ones):"
grep 'build_infernal_human_rigs' "$SAFE" | sed 's/^/     /' || say "     (none)"
hr

if [ "$MODE" = "dry" ]; then
  say "DRY RUN - nothing moved."
  exit 0
fi

MOVED=0; BAD=0
while IFS= read -r f; do
  sum="$(nice -n 15 md5sum "$f" | awk '{print $1}')"
  dest="$QUAR${f}"
  mkdir -p "$(dirname "$dest")"
  if mv -n "$f" "$dest"; then
    printf '%s  %s\n' "$sum" "$f" >> "$MANIFEST"
    now="$(nice -n 15 md5sum "$dest" | awk '{print $1}')"
    [ "$now" = "$sum" ] || { say "  ! md5 mismatch: $dest"; BAD=$((BAD+1)); }
    MOVED=$((MOVED+1))
  else
    say "  ! failed to move: $f"; BAD=$((BAD+1))
  fi
done < "$SAFE"

LEFT=$(find / -xdev -type f -name "*${PATTERN}*" -not -path "$QUAR/*" \
  -not -path '*/proc/*' -not -path '*/sys/*' 2>/dev/null | wc -l)

say
say "RESULT: moved=$MOVED  verify-failures=$BAD  still-on-disk=$LEFT"
say "        manifest now: $(wc -l < "$MANIFEST") entries"
if [ "$LEFT" = "0" ]; then say "        CLEAN."; else say "        remaining = the skipped tracked files listed above."; fi
