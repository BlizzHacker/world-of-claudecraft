#!/usr/bin/env bash
set -a
. /opt/cryptic-realm/.env
set +a
psql "$DATABASE_URL" --csv -c "
SELECT tc.table_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'accounts'
ORDER BY tc.table_name, kcu.column_name;
"
