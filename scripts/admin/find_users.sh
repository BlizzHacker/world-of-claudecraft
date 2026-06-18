#!/usr/bin/env bash
# Look up MOVEWEIGHT and akadmin accounts.
set -a
. /opt/cryptic-realm/.env
set +a
psql "$DATABASE_URL" --csv -c "
SELECT id, username, is_admin, is_moderator,
       oauth_provider, oauth_sub
FROM accounts
WHERE username IN ('MOVEWEIGHT','moveweight','akadmin','AKADMIN')
ORDER BY id;
"
