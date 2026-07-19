# Asset curation

The mounted PICKTURA library is the source of truth for the new character, NPC,
monster, vehicle, and prop pass. The build script reads both
`_manifest/manifest.animated.csv` and `_manifest/manifest.glb.csv`, excludes
armature donor files, and keeps the Infernal waypoint output name stable.

| Realm | First curated pass | Use |
| --- | --- | --- |
| Cryptic Realm | animated `Bone Herald`, `Ragged Warlord`, `Hooded Goblin Outlaw` | mixed hero and monster roster |
| Infernal Realm | `Infernal_Wizard`, `Gate_of_the_Infernal_Skull`, `Infernal Dungeon Entrance.glb` | demons, dungeon landmark, surprise faction silhouettes |
| Classic Realm | `Ironjaw_the_Orc_Warlord`, `Suncrest_Orc_Warrior`, `Serpentbound_Archmage` | orc, warrior, caster roster |
| Arcane Realm | `Serpentbound_Archmage`, animated crystal and void characters | cosmic spellcasters and void creatures |
| Arcane Void | `Gearscale_Gunslinger`, space and alien animated characters | sci-fi combat roster |
| FPS Realm | `Gearscale_Gunslinger`, animated ranger and rifle characters | first-person shooter roster |
| Claudecraft | existing Claudecraft assets only | no cross-realm substitutions |

The table is a curation queue, not a claim that the runtime already serves every
binary. Promotion happens through the asset builder and its generated manifest so
the client can choose animated, skinned characters for playable classes and reserve
static GLBs for world props. The next QA pass must capture each realm in the actual
browser before this queue is marked shipped.
