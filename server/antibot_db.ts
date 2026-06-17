import { pool } from './db';
import { cleanText } from './moderation_db';
import type { BotTracker, BotSessionRef } from './antibot';

const SYSTEM_PREFIX = 'Automated bot detection:';
const DETAILS_MAX = 2000;

export async function createAutomatedBotReport(
  session: BotSessionRef,
  tracker: BotTracker,
): Promise<void> {
  const evidenceSummary = tracker.evidence
    .map(e => `${e.kind}(w=${e.weight.toFixed(2)}): ${e.detail}`)
    .join('\n');
  const details = cleanText(`${SYSTEM_PREFIX}\n${evidenceSummary}`, DETAILS_MAX);

  // At most one automated report per account per 24 hours.
  const dup = await pool.query(
    `SELECT id FROM player_reports
     WHERE reporter_account_id IS NULL
       AND reported_account_id = $1
       AND reason = 'cheating'
       AND details LIKE $2
       AND created_at > now() - interval '24 hours'
     LIMIT 1`,
    [session.accountId, `${SYSTEM_PREFIX}%`],
  );
  if (dup.rows[0]) return;

  await pool.query(
    `INSERT INTO player_reports
       (reporter_account_id, reporter_character_id, reporter_character_name,
        reported_account_id, reported_character_id, reported_character_name,
        reason, details)
     VALUES (NULL, NULL, '', $1, $2, $3, 'cheating', $4)`,
    [session.accountId, session.characterId, session.name, details],
  );
}
