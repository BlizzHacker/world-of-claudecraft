# The condemned body bank

The `infernal_human_*` body bank was reviewed body by body on a render sheet
and rejected in full by the owner on 2026-08-17 - "100% all of these are
failures", "I want them 100% removed". The phase-1 body catalog reached the
same verdict independently and on its own evidence: of the 18 GLBs behind these
keys it marks **15 `reject`, 2 `marginal`, 0 `ship`**.

The bank is banned in source by `tests/condemned_body_bank_guard.test.ts`.

---

## Part 1 - Wade's audit record (verbatim)

Everything in Part 1 was **written by Wade** in
`src/render/characters/infernal_roster.ts`. It is his body-by-body audit - the
record of why these decisions were made - and it was moved here **intact** when
the bank was purged, so that removing the code would not destroy the reasoning.

**Not one word has been changed.** Only the leading `//` and ` * ` comment
markers were removed so the text reads as prose; his line breaks are preserved
exactly. Each block is fenced so nothing is reflowed or reinterpreted.

### The 2026-08-08 audit, and why the rotation is short

*Origin: src/render/characters/infernal_roster.ts, above INFERNAL_HUMAN_VISUAL_KEYS (lines 8-43).*

```text
AUDIT 2026-08-08. Every body reachable as an infernal hero/class/NPC and every
crypticrealm class body was rendered through the game's own preview renderer at
four phases each of Idle, Walk and Attack, from two angles, and looked at. The
bank is in far worse shape than the previous note implied: of the 28 distinct
GLBs behind these keys, only three civilians survive with working limbs.

The rotation below is now the SHORT list, not the long one. A body qualifies
only if its arms are driven by the arm bones (they move through Walk), it has
hands, and nothing shears into a plank. Everything else moved to
INFERNAL_DEFECTIVE_BODY_KEYS with the reason recorded there.

This is deliberately a short list rather than fourteen mostly-broken ones: a
town of a few repeated men reads as cheap, a town of scarecrows reads as
broken. Repairing the bank is what takes this list back up - see the note on
INFERNAL_DEFECTIVE_BODY_KEYS.

2026-08-08 (second pass): monk was rendered for the first time and PASSES, so
the rotation is four rather than three. The bind span of 0.94 that got it
barred is a FIGHTER'S GUARD, not a T-pose: the arms rest away from the body
but they are driven, and Attack, Taunt and Wave all move them. It is the exact
case the queue note warned "must not be judged on numbers".
2026-08-15: assassin joins the rotation, making it five. It was repaired with
the rule K recipe at the bottom of this file and then RENDERED before/after at
four phases each of Idle, Walk and Attack via scripts/rig_contact_sheet.mjs
(new — an offline harness, so this no longer needs a live client and an auth
token). The sheets are at /opt/cr-rig-repair/shots/.

What the render shows, which is why this one un-bars and the other five in the
same batch did not: the sleeves that used to end in flat dark blades resolve
into readable forearms and hands, the arms articulate across all four phases of
Idle and Walk instead of holding bind, and Attack no longer collapses the coat
into planes. The boots were already real geometry with toes, so this body never
had the plank-feet fault that keeps forge_worker and hermit barred.

The pre-repair GLB is kept at /opt/cr-backups/rig-preweight/ and the repaired
bytes are what /opt/cr-realms-store/infernal/ now serves.
```

### Bodies barred from the civilian rotation, grouped by what is wrong

*Origin: src/render/characters/infernal_roster.ts, above INFERNAL_DEFECTIVE_BODY_KEYS (lines 52-122).*

```text
Bodies kept registered (an explicit assignment or an operator override can
still name one) but barred from the civilian rotation.

Grouped by what is actually wrong, because the fix differs per group:

ARMS NEVER MOVE - the arm surface is weighted to Hips/Spine instead of the arm
chain, so the arms hold their bind pose through every clip. Where that bind is
a T-pose the character walks through town as a scarecrow ("arms spread like a
kite"). Measurable: bind-pose X span / height >= 0.94 and hand vertices
carrying almost no arm-chain weight.
  forge_worker   span 1.06, 31% arm weight on the hands. Arms locked straight
                 out, forearms shredded to flat blades, feet dragged as planks.
  hermit         span 1.19, 9% arm weight, LeftHand carries NO weight at all.
  white_sage     no face under the hat, arm stubs with no hands, plank feet.
  road_mercenary forearms end in flat blades, no hands; RightHand 0% arm weight.
  vanguard       no forearms and no hands at all - frozen stubs at the pauldrons.

ONE ARM FROZEN - one side's hand joint carries no weight, so that arm holds
bind while the other animates.
  iron_ranger    LeftHand dead; the whole lower body shears into one flat plank.
  veil_adept     RightHand dead; robe hem lies on the ground through Idle.
  crusader       LeftHand dead; the held weapon stays on the floor as the body
                 walks away from it.
  spiritborn     left hand travels 0.027 of body height per Walk against the
                 right's 0.123 - it grips its book rigidly while the right arm
                 gestures.

HANDS FUSED TO THE WAIST - forearms pinned at the belt, hands merged into the
buckle, feet torn into planks. reweight_topo already shipped one pass at this
body and it still fails, so it needs a re-bind, not more weight surgery.
  barbarian

TORN CLOTH - limbs are sound but the hem/skirt tears into a flat slab that
lies on the ground through the whole Idle loop.
  tainted_hood

TEMPEST is the same GLB as the class Wizard body: frozen arms, no hands, and a
slab under the gown in every Idle frame.

BLOOD_KNIGHT is the one entry here that is NOT a rig fault - it renders and
animates correctly. It is barred from the CIVILIAN rotation because it is a
blue horned demoness, and handing it to a random townsperson (it was cast on
mercenary_kael) is why the town read wrong. It stays fully usable as a hero or
class body.

ASSASSIN was rendered 2026-08-08 and FAILS, confirming its numbers (13% arm
weight, 256x worst stretch): the sleeves end in flat pale blades with no hands
at all, and they hold that shape unchanged through every Idle and Walk phase
while the torso moves under them. The face is also lost under the hat brim.
Stays barred - this one is now looked at, not assumed.

REPAIR: forge_worker and hermit both come back inside the healthy band under
scripts/reweight_topo.mjs rule K (the geodesic claim) - see the recipe at the
bottom of this file. Both were RENDERED 2026-08-08 and both stay barred:

  The arm repair is real and it is visible. Where the originals hold a rigid
  horizontal T through every clip, the repaired bodies swing their arms
  through Walk, raise both arms overhead in Attack, and give a readable Wave.
  That is exactly what the claim rule was written to fix and it worked.

  It is not enough to un-bar them. Reweighting moves weight; it cannot build
  geometry. In the repaired bodies the forearms still END IN FLAT BLADES with
  no hands, and both feet are still sheared into flat planks - clearly visible
  in a full-size Idle frame, which is the pose a townsperson holds most of the
  time. A villager standing in the square with no hands and plank feet is the
  scarecrow complaint, whether or not his arms swing when he walks.

  These two need hand and foot geometry (a re-bind or a mesh fix), not more
  weight surgery. The staged CLAIM.glb files are kept for whoever does that.
```

### The playable class bank has the same disease

*Origin: src/render/characters/infernal_roster.ts, above INFERNAL_DEFECTIVE_CLASS_BODY_KEYS (lines 141-171).*

```text
The playable class bank has the same disease. These keys are still registered
and still selectable as hero cards, but no class table may point at one:
REALM_CLASS_VISUALS was moved off every entry below.

  sorcerer     bind span 1.01 - a full T-pose held through Idle and Walk, with
               shredded sleeves and the elongated fingers the owner named.
  assassin     span 0.84, forearms end in pale blades, no hands.
  warlock      worst body in the bank: 0% arm weight on BOTH hands, 646x worst
               edge stretch, and the dress hem lies flat on the ground.
  wizard       frozen arms, no hands, slab under the gown every Idle frame.
  amazon       feet tear off into planks in Attack; elongated finger spike.
  paladin      feet stretched into flat pale planks.
  necromancer  RightHand dead (same GLB as the veil_adept civilian).
  crusader     LeftHand dead (same GLB as the crusader civilian).
  tempest      left arm frozen (same GLB as the spiritborn civilian).
  barbarian    hands fused to the belt (same GLB as the barbarian civilian).
  druid        same body family as barbarian, same fused hands.
  spiritborn   rendered 2026-08-08: FAILS, confirming its numbers (3% arm
               weight, 375x stretch). The winged-helm valkyrie holds both arms
               straight out horizontally through all four phases of Idle AND
               Walk - a true held T-pose - with the forearms tapering into
               flat blades. The torso lunges in Attack while the arms stay
               rigid. This is the scarecrow, unambiguously.

MONK was rendered 2026-08-08 and PASSES; it has been REMOVED from this list.
Its 0.94 bind span is a fighter's guard, not a T-pose - Attack, Taunt and Wave
all drive the arms, the hands have fingers, and the bare feet have toes rather
than planks. Note infernal_class_monk.glb and infernal_human_monk.glb are
BYTE-IDENTICAL, so this one render clears both keys.
```

### Repair recipe, and the 2026-08-15 batch that repaired six and shipped one

*Origin: src/render/characters/infernal_roster.ts, foot of file (lines 348-415).*

```text
---------------------------------------------------------------------------
REPAIR RECIPE (measured 2026-08-08, not yet visually signed off)

The "arms never move" group is repairable with the geodesic CLAIM rule, which
is exactly the case rule K was written for: the arm SURFACE is carrying core
weight, and the surface field can tell arm from torso where distance cannot.

  node scripts/reweight_topo.mjs --input <body>.glb --out <out>.glb \
    --band 0.26 --claim-gain 1.0 --claim-min 0.7 --claim-max-dist 0.35 \
    --smooth-iters 6 --smooth-lambda 0.6 --smooth-rings 4

claim-max-dist 0.35, not the 0.18 the barbarian shipped with: on these
low-poly bodies the arm surface sits up to 0.32 off its own bone axis, so 0.18
excluded half the arm and left the strip half-done.

Measured before -> after (same mesh against itself, which is the only valid
comparison):
  forge_worker  arm weight on hands 0.31 -> 0.94, hand travel per Walk
                0.084 -> 0.173 of body height, Idle worst stretch 6.42x ->
                3.43x, Attack edges over 2x 64.0 -> 20.6
  hermit        arm weight on hands 0.09 -> 0.87 (LeftHand went from carrying
                no weight at all to 0.87), hand travel 0.059 -> 0.201,
                Attack edges over 2x 47.6 -> 17.0

For reference the healthiest body in the bank (iron_warden) reads 1.00 arm
weight and 0.156 hand travel, so both repairs land inside the healthy band.
The script's own validation gate passes: animation samplers, images, node
names and primitive counts all hash identical.

Candidates are staged, NOT shipped. Nothing above was un-barred on these
numbers - the owner has rejected this work twice for bodies judged on numbers
or on a static pose, so they need the Idle/Walk/Attack render first.

2026-08-15 BATCH — six bodies repaired and RENDERED. One shipped.

First: the bank is TWO populations, and the earlier note conflated them. The
bodies judged unrepairable (forge_worker 295 welded verts, hermit 285,
white_sage 276, road_mercenary 207, vanguard 305, tempest/wizard 687) are
~300-vertex meshes. There is no hand or foot geometry to recover at that
density and no weight surgery will invent it — that verdict stands. But the
rest are 155k-304k verts, a completely different case, and those are what this
batch repaired.

Rendered before/after at four phases each of Idle, Walk and Attack with
scripts/rig_contact_sheet.mjs; sheets at /opt/cr-rig-repair/shots/.

  human_assassin   PASS and SHIPPED. Blade sleeves -> real forearms and hands,
                   arms articulate through Idle and Walk, Attack holds. Now in
                   INFERNAL_HUMAN_VISUAL_KEYS.
  class_sorcerer   IMPROVED, still barred. The held horizontal T through Idle
                   is gone — arms rest at the sides and swing in Walk, exactly
                   what rule K is for. But Attack still collapses the gown into
                   flat planes, so it fails the same gate as before.
  class_warlock    FAIL. Arm mass moved (core weight on arm surface 1386 verts
                   /945 mass -> 8/3.3) and it changed nothing you can see: the
                   dress hem still lies on the ground as a slab through every
                   Idle frame and Attack still shears the whole body into
                   planes. Geometry fault, not a weighting fault.
  class_assassin   NO GAIN. The repaired arm juts forward through Idle rather
                   than resting — arguably worse than the original tuck.
  class_spiritborn / human_spiritborn  same GLB (296594 verts both); numbers
                   improved most of the batch (core mass 29622 -> 7157) but the
                   render is not a clear pass, so both stay barred.

The lesson worth keeping: arm weight is necessary and nowhere near sufficient.
Five of six moved decisively on every metric the tool reports and only one of
them survived being looked at.
---------------------------------------------------------------------------
```

### On the curated-human rebuild pipeline

*Origin: src/render/characters/manifest.ts, above `INFERNAL_HUMAN_CLIPS`. Moved
here when the rebuild script it names was deleted with the bank.*

```text
Curated Infernal humans are rebuilt by build_infernal_human_rigs.mjs. Exact-rig
actions are used where available and donor actions are transferred as rest-pose
deltas, so each distinct body stays upright through every gameplay state.
meshy24, the clip bank's own rig family, so the bank fills everything the 10
baked takes leave empty: walkBack, sit, swim, the extra swings, and 20 real
emote gestures instead of aliasing four of them onto Wave and Taunt. Their own
Wave/Taunt stay as the fallback behind each bank clip.
```

### On the crypticrealm class table

*Origin: src/sim/realms/class_visuals.ts, above `REALM_CLASS_VISUALS.crypticrealm`.*

```text
Six of these nine pointed at a body whose arms do not move. Repointed
2026-08-08 onto bodies rendered at four phases each of Idle, Walk and
Attack and looked at; see INFERNAL_DEFECTIVE_BODY_KEYS for what each one
was doing wrong. The bank cannot currently field nine distinct working
bodies, so classes share until it is repaired.
```

---

## Part 2 - Purge census (authored by the purge, 2026-08-17)

This section is **not Wade's text.** It is the reference census taken before
the bank was removed, kept so the removal is auditable.

### The 18 condemned bodies

| Body | Catalog verdict | Recorded reason |
|---|---|---|
| `iron_warden` | reject | CHIBI: no neck, tiny bald head, mitten hands, cartoon flat shading. The chunky low-poly attempt the operator screenshotted. Byte-identical to infernal_class_warrior.glb. |
| `vanguard` | reject | CHIBI bucket-helm knight in a blue tabard AND broken bind: no forearms, no hands, frozen stubs at the pauldrons. |
| `forge_worker` | reject | SCARECROW: arms locked in a flat horizontal T through every clip, forearms are flat blades, no hands. Bind span 1.06. |
| `white_sage` | reject | CHIBI big-hat wizard. No face under the hat, arm stubs with no hands, plank feet. |
| `tainted_hood` | reject | CHIBI robed noblewoman; hem tears into a flat slab that lies on the ground through Idle. |
| `weathered_elder` | reject | CHIBI ginger-bearded PIRATE in a tricorn hat. Wrong genre entirely for an arcane-noir realm; the Attack clip collapses the hat and head. |
| `road_mercenary` | reject | CHIBI pirate/cowboy in a slouch hat. Forearms end in flat blades, no hands, right hand 0 percent arm weight. |
| `iron_ranger` | reject | CHIBI hooded dwarf ranger, h0.95 (dwarf scale). Left hand carries no weight, lower body shears flat. |
| `hooded_wanderer` | reject | CHIBI hooded dwarf with clown-shoe feet and stubby limbs. Was the single most-used body on crypticrealm (41 NPC templates). |
| `hermit` | reject | SCARECROW: T-pose arms rendered as flat orange blades, no hands. Bind span 1.19, LeftHand carries no weight. |
| `barbarian` | reject | CHIBI viking dwarf; hands fused into the belt buckle, feet torn into planks. |
| `veil_adept` | reject | CHIBI robed caster; RightHand dead, robe hem lies on the ground through Idle. |
| `assassin` | marginal | Rig-repaired (arms articulate), but it is a WESTERN GUNSLINGER: wide-brim hat with flowers and a blue duster. Wrong genre for arcane-noir. |
| `monk` | marginal | QUALITY IS FINE: realistic anatomy, PBR skin, real hands and feet. ARCHETYPE IS WRONG: a shirtless modern MMA fighter in gym shorts. |
| `crusader` | reject | CHIBI gold sunburst-crowned crusader; LeftHand dead, held weapon stays on the floor. |
| `spiritborn` | reject | CHIBI valkyrie; left hand travels 0.027 of body height per Walk against the right at 0.123. |
| `blood_knight` | unclassified | On the examined sheet, no verdict recorded. |
| `tempest` | reject | CHIBI elf. Same GLB as the class Wizard body: frozen arms, no hands, slab under the gown. |

### Source references at census time (168 total)

| File | Refs | Role |
|---|---:|---|
| `src/render/characters/infernal_roster.ts` | 65 | 5-body rotation, 13-key bar list, ~55 NPC pins |
| `src/render/characters/manifest.ts` | 40 | 18 body registrations + 3 realm mob defaults |
| `src/sim/realms/class_visuals.ts` | 27 | legacy key union + crypticrealm class table |
| `src/ui/cryptic/realm_class_presentation.ts` | 18 | `INFERNAL_NPC_ASSETS` -> crypticrealm class cards |
| `src/sim/realms/infernal_classes.ts` | 18 | dead members of `InfernalCharacterVisualKey` |

`server/` and every generated table were already clean (0 references), so the
guard bans them there absolutely rather than on a ratchet.

### Live overrides naming the bank

Four entities, all in `realm_visuals:infernal`, all on `iron_warden`, present in
both `publishedOverrides` and `draftOverrides`: `npc:armorer_hode`,
`npc:foreman_odell`, `npc:smith_haldren`, `npc:stable_master_wren`. All four are
**tradesmen** and are deliberately left in place until the craftsman/guard bodies
land - dressing a smith as a paladin is the fault this purge exists to end.
`realm_visuals:crypticrealm` had none. A further 246 references survive in 14
snapshots of the infernal document (stored history, not served).

### Files on disk - 550 across 36 directories

| Scope | Files | Bytes |
|---|---:|---:|
| store (`cr-realms-store` + staging mirror) | 46 | 71 MB |
| served (+ `cryptic-realm/{public,dist}`, `cr-stages/*/live/{public,dist}`) | 415 | 754 MB |
| all (+ forged-glbs, backups, perf baselines, rig-repair) | 547 | 983 MB |

Quarantined by `scripts/ops/quarantine_condemned_bank.sh`, which refuses to run
while any live override or source line still names the bank.

### Two traps worth remembering

1. **`/mnt/usb4` is NOT a mount inside CT 171.** Only `/mnt/usb4/meshy` is a real
   CIFS mount (read-only, from 192.168.0.5). Everything else under that path -
   including the "staging mirror" - is the container's local rootfs wearing the
   usb4 name (`df` resolves it to `pve-vm-171-disk-0`). Cleaning it here does
   **not** clean the real usb4 device.
2. **The trailing underscore in the ban pattern is load-bearing.** `infernal_human_`
   must not match `infernal_humanoid_*`, a different and healthy body family still
   in service. A grep without it inflates the count from 168 to 214 and condemns
   two innocent bodies.
