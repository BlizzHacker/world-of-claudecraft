// Where does the solver actually put things? Print live-seed placements so a
// visual check can stand next to one instead of wandering and hoping.
import { realmDecorCandidates, applyRealmDecorBudget } from './src/sim/realm_decor';
import { REALM_DECOR_CATALOG } from './src/sim/realm_decor.generated';

const SEED = 20061;
for (const realm of ['classic', 'infernal', 'fps']) {
  const cand = realmDecorCandidates(realm, SEED, REALM_DECOR_CATALOG) as any[];
  const kept = (applyRealmDecorBudget as any)(cand, 'ultra') ?? cand;
  console.log(`\n== ${realm}: ${cand.length} candidates, ${kept.length} at ultra`);
  for (const c of kept.slice(0, 8)) {
    const x = Math.round(c.x ?? c.pos?.x ?? 0);
    const z = Math.round(c.z ?? c.pos?.z ?? 0);
    console.log(`   ${String(c.key ?? c.assetKey ?? '?').slice(0, 52).padEnd(52)} x=${x} z=${z} band=${c.band ?? '?'}`);
  }
}
