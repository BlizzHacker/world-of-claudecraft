# QA checklist

For each phase, record evidence for every applicable row.

- [ ] Offline `Sim` behavior and online `GameServer`/`ClientWorld` behavior match.
- [ ] Same seed and same input trace are deterministic.
- [ ] New player-visible copy is in the English catalog, generated for every locale, and passes
      the localization drift guard.
- [ ] Server validates every command and the client never decides outcomes.
- [ ] Snapshots are interest-scoped and do not expose private authority state.
- [ ] Stored state has additive schema/backward-compatible defaults and a round-trip test.
- [ ] Mobile/touch controls and safe-area layout are exercised for every HUD/input change.
- [ ] Focused tests, `npx tsc --noEmit`, `npm run build:server`, `npm run build`,
      `npm run security:gate`, and `npm run ci:changed` pass.
- [ ] `npm run gate` passes with generated artifacts staged, or the exact unrelated blocker is
      recorded in `tmp/qa-loop/REPORT.md`.
- [ ] Before production: private backup, manifest-pinned isolated stage, rollback ref, health
      check, realm smoke tests, and post-deploy error check all pass.
