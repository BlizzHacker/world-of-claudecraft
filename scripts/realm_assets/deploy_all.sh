#!/bin/bash
# ONE serialized pass over all 36 rings.
#
# Earlier waves were launched concurrently and raced inside the same worktrees: a
# later wave checked out its sha while an earlier one was still building, leaving
# rings scattered across six different commits. Never run two of these at once.
#
# `systemctl restart` returning 0 says NOTHING about whether the new binary is
# live -- a ring once served a freshly built client against a 10-hour-old server
# process, which the client reads as a version mismatch and refuses to enter. So
# every ring is now checked: the process must have started AFTER the build it is
# serving, or the ring is reported STALE rather than OK.
set -u
SHA="${1:?sha}"
cd /opt/cryptic-realm
ok=0; fail=0; stale=0
for r in infernal classic dominion arcane fps arcadevoid crypticrealm claudecraft exchange; do
  for s in live dev alpha beta; do
    d="/opt/cr-stages/$r/$s"
    [ -e "$d/.git" ] || continue
    if [ "$(git -C "$d" rev-parse --short HEAD 2>/dev/null)" = "$SHA" ] \
       && [ -f "$d/dist-server/server.cjs" ] \
       && systemctl is-active --quiet "cryptic-realm-stage@$r-$s"; then
      st=$(date -d "$(systemctl show -p ActiveEnterTimestamp --value "cryptic-realm-stage@$r-$s")" +%s 2>/dev/null || echo 0)
      bt=$(stat -c %Y "$d/dist-server/server.cjs")
      if [ "$st" -ge "$bt" ]; then echo "SKIP $r/$s (already current)"; ok=$((ok+1)); continue; fi
    fi
    # -f, because the BUILD dirties the worktree it just built in: `npm run build`
    # regenerates tracked artifacts (src/guide/content.generated.ts among them),
    # so every ring is left with local modifications and the NEXT deploy's plain
    # checkout is refused. That is not hypothetical - it failed all 36 rings at
    # once, silently, reporting only "SKIP (checkout)". A stage worktree holds no
    # work worth keeping; the sha is the whole truth here.
    git -C "$d" checkout -f --detach "$SHA" >/dev/null 2>&1 || { echo "SKIP $r/$s (checkout)"; fail=$((fail+1)); continue; }
    if ( cd "$d" && timeout 1800 npm run build >"/tmp/d_${r}_$s.log" 2>&1 \
         && timeout 900 npm run build:server >>"/tmp/d_${r}_$s.log" 2>&1 ); then
      systemctl restart "cryptic-realm-stage@$r-$s" 2>/dev/null
      sleep 3
      st=$(date -d "$(systemctl show -p ActiveEnterTimestamp --value "cryptic-realm-stage@$r-$s")" +%s 2>/dev/null || echo 0)
      bt=$(stat -c %Y "$d/dist-server/server.cjs")
      if systemctl is-active --quiet "cryptic-realm-stage@$r-$s" && [ "$st" -ge "$bt" ]; then
        echo "OK $r/$s"; ok=$((ok+1))
      else
        echo "STALE $r/$s (process older than its build)"; stale=$((stale+1))
      fi
    else
      echo "FAIL $r/$s"; fail=$((fail+1)); tail -3 "/tmp/d_${r}_$s.log"
    fi
  done
done
echo "DEPLOY_COMPLETE ok=$ok stale=$stale fail=$fail"
