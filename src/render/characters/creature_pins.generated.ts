// GENERATED once by scripts (see git history) - do NOT regenerate on pool changes.
//
// A realm's generated creature body is picked with `pool[hash(seed) % pool.length]`,
// so adding a single body to a realm reshuffles EVERY mob in it. That is not a
// theoretical risk: expanding the base realm from 2 bodies to 9 moved mire_prowler
// off its drake and onto a gorilla, which the pool-beast test caught.
//
// These pins freeze the answer for every template that already had a body when the
// base realm still shipped its two drakes. Templates added later carry no pin and
// draw from the full pool, so new content gets the variety without disturbing the
// creatures players already know. Never add a pin for a NEW template - that would
// defeat the point.
export const GENERATED_CREATURE_BODY_PINS: Record<string, Record<string, string>> = {
  crypticrealm: {
    bog_bloat: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    bonechill_widow: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    brutok_skullsmasher: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    deepfen_murloc: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    deeprock_kobold: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    fen_troll: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    forest_wolf: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    glimmermere_wader: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    glimmerscale_lurker: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    grix_the_tunnelking: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    grubjaw: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    hellmaw_primal_beast: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    ironvein_foreman: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    ironvein_sapper: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    korgath_the_bound: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    mire_prowler: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    mire_widow: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    mirefen_broodmother: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    mirefen_widowling: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    mirejaw_frenzy: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    mirejaw_the_ravenous: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    moonspawn: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    mudfin_murloc: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    ogre_crusher: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    old_cragmaw: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    old_greyjaw: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    ridge_stalker: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    sloomtooth_the_drowned: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    spider_egg_sac: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    sump_troll_devourer: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    thornpeak_ogre: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    tunnel_rat: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    vale_cup_ball: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    warlord_drogmar: 'realm_crypticrealm_shadow_drake_sentinel_019677ad',
    webwood_spider: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    wild_boar: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
    yumi_cat: 'realm_crypticrealm_shadow_drake_sentinel_019677a5',
  },
};
