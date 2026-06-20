#!/usr/bin/env node
// Ladder/season + promotion-migration admin CLI. Raw SQL (no TS build needed) so
// it can run from promote.sh before a stage is rebuilt. Uses DATABASE_URL.
//
//   node ladder-admin.mjs migrate "<from realm>" "<to realm>"
//       Move every character on <from realm> to <to realm> (re-point realm).
//       MUST run only while the <from> stage process is stopped.
//
//   node ladder-admin.mjs rollover <realmBase> "<stage1>" "<stage2>" ...
//       Close the open season for <realmBase>, convert its ladder chars to
//       non-ladder across the listed stage realms, open the next season.
//
// All statements parameterized; transactions where multi-step.
import pg from 'pg';

try { process.loadEnvFile?.(); } catch { /* .env optional */ }

const conn = process.env.DATABASE_URL;
if (!conn) { console.error('DATABASE_URL required'); process.exit(1); }

const [cmd, ...rest] = process.argv.slice(2);
const client = new pg.Client({ connectionString: conn });

async function migrate(fromRealm, toRealm) {
  if (!fromRealm || !toRealm) { console.error('usage: migrate "<from>" "<to>"'); process.exit(1); }
  const res = await client.query(
    'UPDATE characters SET realm = $2, updated_at = now() WHERE realm = $1',
    [fromRealm, toRealm],
  );
  console.log(`moved ${res.rowCount} character(s): "${fromRealm}" -> "${toRealm}"`);
}

async function rollover(realmBase, stages) {
  if (!realmBase || !stages.length) { console.error('usage: rollover <realmBase> "<stage>" ...'); process.exit(1); }
  await client.query('BEGIN');
  try {
    const cur = await client.query(
      'SELECT season FROM ladder_seasons WHERE realm_base = $1 AND ended_at IS NULL ORDER BY season DESC LIMIT 1',
      [realmBase],
    );
    const oldSeason = Number(cur.rows[0]?.season ?? 0);
    const next = oldSeason + 1;
    let converted = 0;
    if (oldSeason > 0) {
      const c = await client.query(
        `UPDATE characters SET ladder = FALSE, updated_at = now()
         WHERE realm = ANY($1) AND ladder = TRUE AND season = $2`,
        [stages, oldSeason],
      );
      converted = c.rowCount ?? 0;
    }
    await client.query(
      'UPDATE ladder_seasons SET ended_at = now() WHERE realm_base = $1 AND ended_at IS NULL',
      [realmBase],
    );
    await client.query(
      `INSERT INTO ladder_seasons (realm_base, season, started_at) VALUES ($1, $2, now())
       ON CONFLICT (realm_base, season) DO NOTHING`,
      [realmBase, next],
    );
    await client.query('COMMIT');
    console.log(`rolled ${realmBase}: season ${oldSeason} -> ${next}, converted ${converted} ladder char(s) to non-ladder`);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  }
}

(async () => {
  await client.connect();
  try {
    if (cmd === 'migrate') await migrate(rest[0], rest[1]);
    else if (cmd === 'rollover') await rollover(rest[0], rest.slice(1));
    else { console.error('usage: ladder-admin.mjs <migrate|rollover> ...'); process.exit(1); }
  } finally {
    await client.end();
  }
})().catch((e) => { console.error(e.message || e); process.exit(1); });
