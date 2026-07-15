# Cryptic Realm recovery runbook

This runbook is the promotion guard for the private recovery line. The manifest at
`config/cryptic-recovery/features.json` is the source of truth for target identity,
upstream anchors, feature disposition, and rollout defaults.

## Reconcile before mutation

Run `node scripts/admin/check_recovery_manifest.mjs` from a clean candidate checkout.
Run the strict form before any promotion: `node scripts/admin/check_recovery_manifest.mjs
--strict`. A strict failure is a hard stop. Refresh local refs, advertised remote refs,
and preserved bundle heads, then classify every new commit by stable patch ID before
changing `discovery.status` to `complete`.

The only evidenced production target is Proxmox `192.168.0.6`, LXC `171`, repository
`/opt/cryptic-realm`. Legacy names in the manifest are inventory only and must never be
used as deployment fallbacks. The current candidate must be tested locally and on an
isolated exact-artifact stage with dev commands disabled.

## QA and backups

Capture `tmp/qa-loop/LEDGER.md` and `tmp/qa-loop/REPORT.md` for every checkpoint. Run the
focused regression matrix, `npm run gate`, `npm run security:gate`, release malware audit,
wire/schema canaries, migration checks, and stage smoke. Before a production push, create
an immutable private Git backup, a database/runtime-config backup, and record a verified
rollback SHA. Do not include tokens, credentials, private URLs, or personal data in
manifests, reports, sanitized patches, or public contribution receipts.

## Promotion and rollback

Promotion is automatic only after strict manifest, QA, backup, stage, and health gates all
pass. The deploy wrapper must re-check the exact host/container/repository identity, stage
the artifact, run health and realm smoke checks, and retain the previous SHA. Any failed
post-deploy health, schema, or realm check rolls the ring back atomically to that verified
SHA. Never mix versions across realm processes.

Incomplete minigame features (F-016 and F-018 through F-022) remain server-controlled
default-off until their IWorld, server wire, persistence, client, accessibility, and
dedicated QA checkpoints are green.
