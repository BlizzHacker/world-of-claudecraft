#!/bin/bash
#
# Quarantine the CONDEMNED `infernal_human_*` body bank.
#
# DECISION (owner, 2026-08-17): the whole bank was reviewed on a render sheet and
# rejected outright — "100% all of these are failures", "I want them 100%
# removed". The phase-1 body catalog agrees independently: 15 of the 18 GLBs are
# `reject`, 2 `marginal`, 0 `ship`.
#
# This script MOVES the files (it never deletes them) into a quarantine tree
# outside every served path, preserving relative paths, with an md5 manifest
# taken before the move and verified after.
#
# IT REFUSES TO RUN while anything still points at the bank. Moving the bytes out
# from under a live override or a live source table would turn a bad body into a
# 404 and a missing character, which is worse than the bad body. Clean the
# references first; this script is the LAST step, not the first.
#
# Usage:
#   bash quarantine_condemned_bank.sh                 # dry run (default)
#   bash quarantine_condemned_bank.sh --commit        # actually move
#   bash quarantine_condemned_bank.sh --scope served  # widen what is moved
#   bash quarantine_condemned_bank.sh --force         # bypass refusal (DANGER)
#
# Scopes:
#   store   (default) the two authoritative stores everything else is built from
#   served            store + every tree that actually serves bytes to a player
#   all               served + backups, perf baselines and scratch copies
#
set -uo pipefail

# The bank this was written for. Overridable with --pattern because the chibi
# `infernal_class_` bank needs the identical treatment and the identical
# refusal gates; a second copy of this script would be a second place for the
# gates to rot.
# NAME COLLISION — READ BEFORE PASSING --pattern infernal_class_
#
# `infernal_class_` matches TWO different banks and only one of them is condemned:
#
#   infernal_class_warrior.glb          CONDEMNED chibi bank. Unprefixed. 3 copies
#                                       still in the store, 18 in the build INPUT
#                                       at moveweight-assets/forged-glbs/infernal,
#                                       which is why every build re-advertises them
#                                       in the realm manifest at a store URL that
#                                       404s.
#   realm_infernal_class_rogue_f.glb    LEGITIMATE female class bodies. 11 in the
#                                       store, and 25 LIVE realm_visuals overrides
#                                       wear them (crypticrealm hero:cipherblade,
#                                       hero:gravecaller, hero:oracle and more).
#
# A bare `--pattern infernal_class_` therefore aims at 25 live hero bodies. Gate 1
# refuses it, which is the only reason that is a near miss rather than an outage —
# do not --force past it. Anchor the pattern to the unprefixed form first.
PATTERN='infernal_human_'
STAMP="$(date +%Y%m%d)"
REPO="/opt/cryptic-realm"
DB="crypticrealm"

MODE="dry"
SCOPE="store"
FORCE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --commit) MODE="commit" ;;
    --dry-run) MODE="dry" ;;
    --scope) SCOPE="${2:-store}"; shift ;;
    --pattern) PATTERN="${2:?--pattern needs a value}"; shift ;;
    --force) FORCE=1 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
  shift
done

say() { printf '%s\n' "$*"; }
hr()  { printf '%s\n' "-------------------------------------------------------------------"; }

QUAR="/root/condemned_bank_${PATTERN%_}_${STAMP}"

say "=== QUARANTINE THE CONDEMNED ${PATTERN}* BANK ==="
say "mode=$MODE  scope=$SCOPE  quarantine=$QUAR"
hr

# ---------------------------------------------------------------------------
# Roots, by scope.
# ---------------------------------------------------------------------------
STORE_ROOTS=(
  "/opt/cr-realms-store"
  "/mnt/usb4/moveweight-assets/cr-realms-staging"
)
# `served` deliberately includes /opt/cr-stages, which holds a `live/scripts`
# copy of the rebuild recipe per realm as well as the GLBs. Those copies are
# quarantined on purpose: a script that regenerates the whole bank is a
# reintroduction route the source string-ban cannot see.
SERVED_ROOTS=(
  "/opt/cryptic-realm/public/cr-realms"
  "/opt/cryptic-realm/dist/cr-realms"
  "/opt/cr-stages"
)
DERIVED_ROOTS=(
  "/mnt/usb4/moveweight-assets/cr-realms"
  "/mnt/usb4/moveweight-assets/forged-glbs"
  "/opt/cr-backups"
  "/opt/cr-measure"
  "/opt/cr-entry-perf-baseline-dist"
  "/opt/cr-entry-perf-worktree"
  "/opt/cr-rig-repair"
)

ROOTS=("${STORE_ROOTS[@]}")
case "$SCOPE" in
  store)  ;;
  served) ROOTS+=("${SERVED_ROOTS[@]}") ;;
  all)    ROOTS+=("${SERVED_ROOTS[@]}" "${DERIVED_ROOTS[@]}") ;;
  *) echo "unknown scope: $SCOPE (want store|served|all)" >&2; exit 2 ;;
esac

# ---------------------------------------------------------------------------
# Refusal gate 1 — live realm_visuals overrides (published AND draft, every realm).
# ---------------------------------------------------------------------------
say "[gate 1] live realm_visuals overrides naming the bank"
OV_SQL_WHERE="world_state.key like 'realm_visuals:%' and e.value::text like '%${PATTERN}%'"
OV_HITS=$(cd /tmp && sudo -u postgres psql -qtA -d "$DB" -c \
  "select count(*) from world_state, jsonb_each(coalesce(data->'publishedOverrides','{}'::jsonb) || coalesce(data->'draftOverrides','{}'::jsonb)) e
   where ${OV_SQL_WHERE}" 2>/dev/null | tr -d '[:space:]')
OV_HITS="${OV_HITS:-QUERYFAILED}"
if [ "$OV_HITS" = "QUERYFAILED" ]; then
  say "  ! could not query Postgres — treating as BLOCKING"
  GATE1=1
elif [ "$OV_HITS" != "0" ]; then
  say "  BLOCKED: $OV_HITS live override entries still name the bank:"
  (cd /tmp && sudo -u postgres psql -qtA -F ' | ' -d "$DB" -c \
    "select world_state.key, e.key, e.value->>'assetUrl' from world_state, jsonb_each(coalesce(data->'publishedOverrides','{}'::jsonb) || coalesce(data->'draftOverrides','{}'::jsonb)) e
     where ${OV_SQL_WHERE} order by 1,2" 2>/dev/null) | sed 's/^/      /'
  GATE1=1
else
  say "  OK: no live published/draft override names the bank"
  GATE1=0
fi
hr

# ---------------------------------------------------------------------------
# Refusal gate 2 — source and generated tables.
# ---------------------------------------------------------------------------
say "[gate 2] source / generated tables naming the bank"
SRC_HITS=$(cd "$REPO" && grep -rlI --include='*.ts' --include='*.tsx' --include='*.js' \
  --include='*.mjs' --include='*.cjs' --include='*.json' -e "$PATTERN" src server 2>/dev/null | sort)
if [ -n "$SRC_HITS" ]; then
  say "  BLOCKED: still referenced in src/ or server/:"
  while IFS= read -r f; do
    printf '      %-58s %s refs\n' "$f" "$(grep -oI -e "$PATTERN" "$REPO/$f" 2>/dev/null | wc -l)"
  done <<< "$SRC_HITS"
  GATE2=1
else
  say "  OK: src/ and server/ are clean"
  GATE2=0
fi
hr

# ---------------------------------------------------------------------------
# Sanity: quarantine target must be outside every served path.
# ---------------------------------------------------------------------------
say "[gate 3] quarantine target is outside every served path"
GATE3=0
for r in "${SERVED_ROOTS[@]}" "${STORE_ROOTS[@]}"; do
  case "$QUAR/" in
    "$r"/*) say "  BLOCKED: $QUAR is inside served root $r"; GATE3=1 ;;
  esac
done
[ "$GATE3" = "0" ] && say "  OK: $QUAR is not under any store or served root"
hr

# ---------------------------------------------------------------------------
# Inventory.
# ---------------------------------------------------------------------------
say "[inventory] condemned files in scope=$SCOPE"
LIST="$(mktemp)"
trap 'rm -f "$LIST"' EXIT
for r in "${ROOTS[@]}"; do
  [ -d "$r" ] || { say "  (root absent, skipped: $r)"; continue; }
  find "$r" -type f -name "*${PATTERN}*" 2>/dev/null
done | sort -u > "$LIST"
COUNT=$(wc -l < "$LIST" | tr -d ' ')
BYTES=$(awk '{s+=$1} END{print s+0}' < <(xargs -r -a "$LIST" stat -c '%s' 2>/dev/null))
say "  files: $COUNT   bytes: $BYTES"
say "  by directory:"
sed 's|/[^/]*$||' "$LIST" | sort | uniq -c | sort -rn | sed 's/^/      /'
hr

# Warn if the "usb4" staging path is not actually the usb4 device. On this
# container only /mnt/usb4/meshy is a real CIFS mount; everything else under
# /mnt/usb4 is local rootfs that merely LOOKS like the share. Cleaning it here
# does not clean the real device.
if ! mountpoint -q /mnt/usb4 2>/dev/null; then
  say "[note] /mnt/usb4 is NOT a mount point in this container."
  say "       /mnt/usb4/moveweight-assets/* is local rootfs wearing the usb4 name."
  say "       Any copy on the REAL usb4 device (host 192.168.0.5) is NOT touched by this script."
  hr
fi

# ---------------------------------------------------------------------------
# Refuse or proceed.
# ---------------------------------------------------------------------------
BLOCKED=$(( GATE1 + GATE2 + GATE3 ))
if [ "$BLOCKED" -gt 0 ]; then
  say "RESULT: REFUSED — $BLOCKED gate(s) blocking."
  say "        Something still points at these files; moving them now would"
  say "        replace a bad body with a missing one. Clear the references first."
  [ "$FORCE" = "1" ] && say "        (--force was passed; refusing anyway on a dry run)"
  if [ "$MODE" = "commit" ] && [ "$FORCE" = "1" ]; then
    say "        --force + --commit: proceeding AGAINST the gates."
  else
    exit 1
  fi
fi

if [ "$MODE" = "dry" ]; then
  say "RESULT: DRY RUN — nothing moved. Files that WOULD move:"
  sed 's/^/      /' "$LIST"
  exit 0
fi

# ---------------------------------------------------------------------------
# Commit: manifest, move, verify.
# ---------------------------------------------------------------------------
mkdir -p "$QUAR"
MANIFEST="$QUAR/MANIFEST.md5"
say "[manifest] hashing $COUNT files before the move -> $MANIFEST"
: > "$MANIFEST"
while IFS= read -r f; do
  printf '%s  %s\n' "$(nice -n 15 md5sum "$f" | awk '{print $1}')" "$f" >> "$MANIFEST"
done < "$LIST"

say "[move] preserving relative paths under $QUAR"
MOVED=0
while IFS= read -r f; do
  dest="$QUAR${f}"
  mkdir -p "$(dirname "$dest")"
  if mv -n "$f" "$dest"; then MOVED=$((MOVED+1)); else say "  ! failed: $f"; fi
done < "$LIST"
say "  moved: $MOVED / $COUNT"

say "[verify] re-hashing at the quarantine location"
BAD=0
while read -r sum src; do
  dest="$QUAR${src}"
  [ -f "$dest" ] || { say "  ! missing after move: $dest"; BAD=$((BAD+1)); continue; }
  now=$(nice -n 15 md5sum "$dest" | awk '{print $1}')
  [ "$now" = "$sum" ] || { say "  ! md5 mismatch: $dest"; BAD=$((BAD+1)); }
done < "$MANIFEST"

LEFT=$(for r in "${ROOTS[@]}"; do [ -d "$r" ] && find "$r" -type f -name "*${PATTERN}*" 2>/dev/null; done | wc -l | tr -d ' ')
say
say "RESULT: moved=$MOVED  verify-failures=$BAD  still-in-scope=$LEFT"
say "        manifest: $MANIFEST"
[ "$BAD" = "0" ] && [ "$LEFT" = "0" ] && say "        CLEAN." || say "        REVIEW REQUIRED."
