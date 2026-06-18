#!/usr/bin/env bash
# Merge MOVEWEIGHT (local id=1) with akadmin (OIDC id=8).
#
# Post-merge state:
#   - MOVEWEIGHT becomes admin
#   - MOVEWEIGHT inherits akadmin's authentik OAuth identity (so next SSO
#     login lands on MOVEWEIGHT, not a fresh row)
#   - Any characters / tokens / social rows on akadmin transfer to MOVEWEIGHT
#   - akadmin row is deleted
#
# Idempotent: rerunning is a no-op once the merge has happened.

set -euo pipefail
set -a
. /opt/cryptic-realm/.env
set +a

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

DO $$
DECLARE
  v_kept  INT;
  v_drop  INT;
  v_provider TEXT;
  v_sub  TEXT;
BEGIN
  SELECT id INTO v_kept FROM accounts WHERE username = 'MOVEWEIGHT' LIMIT 1;
  SELECT id, oauth_provider, oauth_sub INTO v_drop, v_provider, v_sub
    FROM accounts WHERE username = 'akadmin' LIMIT 1;

  IF v_kept IS NULL THEN
    RAISE NOTICE 'MOVEWEIGHT not found — nothing to do.';
    RETURN;
  END IF;

  -- Always grant MOVEWEIGHT admin, even if akadmin already merged.
  UPDATE accounts SET is_admin = TRUE WHERE id = v_kept;

  IF v_drop IS NULL THEN
    RAISE NOTICE 'akadmin row already gone; MOVEWEIGHT is_admin = TRUE.';
    RETURN;
  END IF;

  -- Transfer akadmin's children (characters / tokens / social rows) to
  -- MOVEWEIGHT before we drop the source. Tables with ON DELETE CASCADE
  -- would lose them otherwise.
  UPDATE characters    SET account_id = v_kept WHERE account_id = v_drop;
  UPDATE auth_tokens   SET account_id = v_kept WHERE account_id = v_drop;

  -- Social tables: friends / ignores / guild members (best-effort — skip
  -- silently if any table doesn't exist on this deploy).
  BEGIN
    UPDATE friends      SET account_id = v_kept WHERE account_id = v_drop;
  EXCEPTION WHEN undefined_table OR undefined_column THEN END;
  BEGIN
    UPDATE friends      SET friend_account_id = v_kept WHERE friend_account_id = v_drop;
  EXCEPTION WHEN undefined_table OR undefined_column THEN END;
  BEGIN
    UPDATE ignore_list  SET account_id = v_kept WHERE account_id = v_drop;
  EXCEPTION WHEN undefined_table OR undefined_column THEN END;
  BEGIN
    UPDATE ignore_list  SET target_account_id = v_kept WHERE target_account_id = v_drop;
  EXCEPTION WHEN undefined_table OR undefined_column THEN END;
  BEGIN
    UPDATE guild_members SET account_id = v_kept WHERE account_id = v_drop;
  EXCEPTION WHEN undefined_table OR undefined_column THEN END;
  BEGIN
    UPDATE play_sessions SET account_id = v_kept WHERE account_id = v_drop;
  EXCEPTION WHEN undefined_table OR undefined_column THEN END;

  -- Release the partial unique index on (oauth_provider, oauth_sub) before
  -- re-attaching it to MOVEWEIGHT.
  UPDATE accounts SET oauth_provider = NULL, oauth_sub = NULL WHERE id = v_drop;

  -- Attach akadmin's OAuth identity to MOVEWEIGHT so next SSO login
  -- resolves to MOVEWEIGHT.
  UPDATE accounts
     SET oauth_provider = v_provider,
         oauth_sub      = v_sub
   WHERE id = v_kept;

  -- Goodbye akadmin.
  DELETE FROM accounts WHERE id = v_drop;

  RAISE NOTICE 'Merged akadmin (id=%) into MOVEWEIGHT (id=%) and granted admin.', v_drop, v_kept;
END $$;

COMMIT;

-- Show final state.
SELECT id, username, is_admin, is_moderator,
       oauth_provider, oauth_sub IS NOT NULL AS has_sub
FROM accounts
WHERE username IN ('MOVEWEIGHT','akadmin')
ORDER BY id;
SQL
