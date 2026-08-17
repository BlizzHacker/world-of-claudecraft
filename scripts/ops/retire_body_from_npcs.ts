/**
 * URGENT: get the shirtless `infernal_human_monk` body off every player-visible
 * NPC, by PUBLISHED OVERRIDE only. Data-only, heals live, no deploy.
 *
 * Uses the exported draft/publish mutators rather than the HTTP routes. That is
 * the SAME serialized path the routes call: same validation, same revision
 * assertions, same pg advisory lock, same snapshot + audit trail. Only the HTTP
 * auth middleware is skipped, and actorAccountId is passed explicitly - which
 * avoids either harvesting a live user's bearer token out of the DB or creating
 * an account to get one.
 *
 *   npx tsx scripts/_depants.ts            # dry run
 *   npx tsx scripts/_depants.ts --commit
 */
import {
  publishDraftRealmVisuals,
  upsertDraftRealmVisual,
} from '../server/realm_visuals';
import { loadRealmVisualsState } from '../server/realm_visuals_db';

const COMMIT = process.argv.includes('--commit');
const ACTOR = 1;
const CONDEMNED_FILE = 'infernal_human_monk';

// Three bodies, all from the approved catalog, all LOOKED AT on their phase-1
// contact sheet crops and confirmed covered head to toe. Deliberately NOT used:
// ember_clad_nomad (open shirt, bare chest) and class_warrior_f (bare thigh) -
// both would repeat the complaint being fixed.
const HOODED_FIGHTER = {
  url: '/cr-realms/infernal/realm_infernal_hero_demon_hunter.glb',
  name: 'Hooded Enforcer',
};
const ROBED_ELDER = {
  url: '/cr-realms/infernal/realm_infernal_hero_monk.glb',
  name: 'Robed Elder',
};
const HOODED_ACOLYTE = {
  url: '/cr-realms/infernal/realm_infernal_hero_sigil_acolyte.glb',
  name: 'Hooded Acolyte',
};

/** Role-fitted so the town does not become fourteen identical men. */
const ASSIGNMENT: Record<string, { url: string; name: string }> = {
  // brawlers, marshals, enforcers, yard bosses
  pit_master_grott: HOODED_FIGHTER,
  warmarshal_draven_kole: HOODED_FIGHTER,
  fury: HOODED_FIGHTER,
  wardsmith_orun: HOODED_FIGHTER,
  quartermaster_sela: HOODED_FIGHTER,
  salvage_boss_ryna: HOODED_FIGHTER,
  town_defense_board: HOODED_FIGHTER,
  // clerks, ledgers, trades
  bursar_petra_vell: ROBED_ELDER,
  auctioneer_voss: ROBED_ELDER,
  reeve_ottoline: ROBED_ELDER,
  weaver_amelle: ROBED_ELDER,
  salvager_edda: ROBED_ELDER,
  // night office, rites
  sexton_marrow: HOODED_ACOLYTE,
  lampman_cobb: HOODED_ACOLYTE,
};

const REALMS = ['infernal', 'crypticrealm'] as const;

interface Doc {
  publishedOverrides?: Record<string, { assetUrl?: string }>;
  draftOverrides?: Record<string, { assetUrl?: string }>;
  publishedRevision?: number;
  draftRevision?: number;
}

async function readDoc(realm: string): Promise<Doc> {
  return ((await loadRealmVisualsState(`realm_visuals:${realm}`)) ?? {}) as Doc;
}

let failures = 0;

for (const realm of REALMS) {
  const doc = await readDoc(realm);
  const pub = doc.publishedOverrides ?? {};
  const draft = doc.draftOverrides ?? {};
  console.log(`\n================ ${realm} ================`);
  console.log(`published rev ${doc.publishedRevision} (${Object.keys(pub).length} keys), ` +
              `draft rev ${doc.draftRevision} (${Object.keys(draft).length} keys)`);

  // SAFETY: publish copies the WHOLE draft over published. If someone has staged
  // unpublished work, publishing would release it as a side effect of this fix.
  const pubKeys = Object.keys(pub).sort();
  const draftKeys = Object.keys(draft).sort();
  const diverged =
    JSON.stringify(pubKeys) !== JSON.stringify(draftKeys) ||
    pubKeys.some((k) => pub[k]?.assetUrl !== draft[k]?.assetUrl);
  if (diverged) {
    console.log('  !! REFUSING: draft has unpublished changes; publishing would release them.');
    console.log('     Resolve the draft first, then re-run.');
    failures++;
    continue;
  }

  const todo: string[] = [];
  const skipped: string[] = [];
  for (const templateId of Object.keys(ASSIGNMENT)) {
    const key = `npc:${templateId}`;
    const existing = pub[key]?.assetUrl;
    if (existing && !existing.includes(CONDEMNED_FILE)) {
      // Already overridden onto something else - leave that choice alone.
      skipped.push(`${key} (already on ${existing.split('/').pop()})`);
      continue;
    }
    todo.push(key);
  }
  console.log(`  to write: ${todo.length}   already covered: ${skipped.length}`);
  for (const s of skipped) console.log(`     skip  ${s}`);

  if (!COMMIT) {
    for (const key of todo) {
      const a = ASSIGNMENT[key.slice(4)];
      console.log(`     WOULD SET ${key.padEnd(34)} -> ${a.url.split('/').pop()}`);
    }
    continue;
  }

  // Serialized: each upsert bumps draftRevision by one, so re-read and chain.
  for (const key of todo) {
    const a = ASSIGNMENT[key.slice(4)];
    const before = await readDoc(realm);
    await upsertDraftRealmVisual({
      realm,
      key,
      assetUrl: a.url,
      assetName: a.name,
      expectedDraftRevision: before.draftRevision,
      actorAccountId: ACTOR,
    });
    console.log(`     set ${key.padEnd(34)} -> ${a.url.split('/').pop()}`);
  }

  const beforePublish = await readDoc(realm);
  await publishDraftRealmVisuals({
    realm,
    expectedDraftRevision: beforePublish.draftRevision,
    actorAccountId: ACTOR,
  });
  const after = await readDoc(realm);
  console.log(`  PUBLISHED: revision ${doc.publishedRevision} -> ${after.publishedRevision} ` +
              `(${Object.keys(after.publishedOverrides ?? {}).length} keys)`);

  const still = Object.entries(after.publishedOverrides ?? {}).filter(([, v]) =>
    (v.assetUrl ?? '').includes(CONDEMNED_FILE),
  );
  console.log(`  remaining published refs to the condemned body: ${still.length}`);
  if (still.length) {
    for (const [k, v] of still) console.log(`     !! ${k} -> ${v.assetUrl}`);
    failures++;
  }
}

console.log(`\n${COMMIT ? 'COMMIT' : 'DRY RUN'} complete. failures=${failures}`);
process.exit(failures ? 1 : 0);
