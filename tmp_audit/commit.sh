#!/bin/bash
set -e
cd /opt/cryptic-realm
git add src/render/characters/manifest.generated.ts \
        src/render/characters/realm_wield.generated.ts \
        src/sim/realms/rosters.generated.ts \
        scripts/realm_assets/bodies_geometry.generated.json \
        scripts/ip_purge.mjs \
        scripts/quarantine_staging_ip.mjs
git commit -q -F - <<'MSG'
fix(assets): quarantine 31 protected-likeness bodies and re-cast the rosters

Renaming a franchise asset does not make it original. scripts/ip_rename*.mjs
swapped protected NAMES for original slugs and kept every MODEL, on the premise
"genre-inspired is fine, protected names are not" - which is wrong for an asset
that IS the character. A Space Marine called void_legionary is still a Space
Marine, and he_man_toy_action was renamed twice (thewn_champion, then
action_figure_hero_toys) before landing on a roster card.

Names were therefore unusable as evidence. Every body here was rendered and
looked at. Three signals found what a name scan cannot:

  * the 8-hex asset id survives renames, so ip_rename's own log rebuilds the
    real suspect list (32 laundered bodies were still served and registered);
  * Meshy issues sequential ids per generation batch, so IP clusters by hash
    prefix - armored_guardian_characters_weap_0193fba5 (an Ultramarine on a
    live roster card) sits beside _0193fba7 and was never franchise-named;
  * a confirmed hit implies a FAMILY sharing its prompt slug, so purging only
    the roster-visible member leaves siblings the next regeneration re-picks.

Quarantined (moved, never deleted): 40K marines, He-Man, Stormtroopers,
She-Hulk, The Flash, a Power Ranger, Predator, Majin Buu, Kakashi, Bart
Simpson, Eddie, Walter White, Bruce Lee and Mike Tyson likenesses; and under
ip-brand, textures carrying live Coca-Cola and Nike marks.

rosters.generated.ts is regenerated, not hand-edited - it picks from the
manifest pools, so cleaning the pools is the fix. That also repairs 10 entries
still naming keys the PREVIOUS purge removed without regenerating; those cards
had been rendering nothing.

The purge is now durable. emit_manifest reads STAGING, so pulling a body from
the store alone is undone by the next regeneration - measurably what happened
here, with 26 bodies back after the last quarantine commit. 37 staged copies of
quarantined bodies were moved out of the emitter's input.

All 144 roster bodies were rendered and reviewed; the roster converged clean.
Typecheck holds at 79, check_dangling at 0.
MSG
git log --oneline -1
git status --porcelain | grep -v '^??' || echo "working tree clean (tracked)"
MSG_DONE=1
