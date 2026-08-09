# Upstream catch-up to v0.32.0: measurement

Measured 2026-07-30 on branch `codex/upstream-catchup-v0.32.0`, worktree `/opt/cr-v032`,
base `codex/cryptic-recovery-program` @ `4828f20fc`, target `v0.32.0` (`4fd3841cd`).

## Reproduce

The on-disk merge state is deliberately NOT kept (the v0.30 pass proved it is
fragile). Reproduce it in one command:

```
cd /opt/cr-v032 && git merge --no-ff --no-commit v0.32.0
```

Then classify with the committed tooling:

```
sed 's#/opt/cr-measure#/opt/cr-v032#' docs/cryptic-realm-recovery/v030/triage.py > /tmp/triage032.py
python3 /tmp/triage032.py
```

## The surface

**219 conflicted files** (the abandoned v0.30 one-jump was 201).

By how much each side contributes:

| class | files | meaning |
|---|---|---|
| FORK-ADD | 8 | upstream contributes ~nothing, keeping ours is safe |
| UPSTREAM-ADD | 17 | we contribute ~nothing, taking theirs is safe |
| INTERLEAVED | 194 | both sides substantial |

That INTERLEAVED number overstates the real work. Of it:

| group | files | how it is resolved |
|---|---|---|
| `tests/parity/golden/*` | 49 | regenerate, `UPDATE_PARITY=1` |
| `src/ui/i18n.resolved.generated/*` | 23 | regenerate, `npm run i18n:gen` |
| `src/ui/i18n.locales/*` | 20 | `merge-locales.py` (order-aware union) |
| everything else | 102 | genuine judgment |

So the honest estimate is **about 102 files needing real review**, plus 92 that
are mechanical once the source compiles.

## Ordering constraint

The 49 parity goldens and the 23 generated i18n files cannot be regenerated until
the source tree compiles, which requires the 102 judgment files to be resolved
first. So the mechanical 92 are the LAST step, not the first. Any plan that opens
with "regenerate the goldens" is wrong.

## Carry-forward traps from the v0.30 pass

These were proven then and still apply:

- Locale overlays are divergence-only and must follow `en` leaf order. A naive key
  union fails `tests/i18n_overlay_key_membership.test.ts` plus a byte gate. Use
  `merge-locales.py`.
- `hud_chrome.ts` renames `$CR` back to `WOC` if theirs wins. Check branding after.
- Of the 1046 raw locale value diffs in the v0.30 pass only 18 were real content,
  the rest quote-style noise. Merge on upstream as base to keep their new
  translator comments, then overlay only the real content diffs.
- `tests/command_schema.test.ts` and `tests/world_api_parity.test.ts` member counts
  must be re-derived by running them, never picked from a side.
- `options_ia.ts` / `options_mobile_shell.ts` arrive deleted by upstream. Accept it.
- `options_window.ts` stays the fork's wholesale.

## Status

Measured and planned only. Nothing resolved, nothing deployed. This is its own
work session; it does not block the aura sigil work, which is authored against a
clean upstream base precisely so the two tracks stay independent.
