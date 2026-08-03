# Xbox Controller Platform Implementation Plan

## Canonical team workflow

The skill template names Opus 4.8. In environments where that exact model is unavailable, use the best available Codex model at high or maximum reasoning and preserve the workflow below.

1. Pre-flight: inspect `git status`, preserve concurrent/user work, use an isolated worktree when the shared checkout is dirty, and scan `MEMORY.md` if memory is configured.
2. Load context: spawn a read-only Explore agent for the phase packet, relevant source, and governing `CLAUDE.md` files. Keep raw large-file reads out of the orchestrator context.
3. Choose orchestration: use the lightest option that fits. Explicitly request bounded parallel workers for independent vertical slices. Use a structured workflow only for true batch work.
4. Implement vertically: each owner changes behavior and its tests together. Never hand-edit generated output.
5. Validate: run the phase matrix from `state.md`, then dispatch only reviewers whose change-surface gates match the actual diff. Review for coverage first, rank second.
6. Update `progress.md` and `state.md` in the same logical commit. Stage only explicit paths. Never use `git add -A`.
7. Do not publish, deploy, upload, answer IARC, or change Store availability as an implementation side effect.

The root `AGENTS.md` recovery identity overrides any legacy deploy example from a generic skill. Current production is LXC 171 `/opt/cryptic-realm`; legacy `/opt/eastbrook` inventory must never be used automatically.

## Phase summary

| Phase | Implementation | QA focus |
|---|---|---|
| 1 | Reconcile the branch and establish one canonical UWP WebView2 Xbox release lane. | Source completeness, package identity, workflow reproducibility, obsolete-path removal. |
| 2 | Add a server-authoritative Microsoft Store-safe product profile without cash/crypto benefits. | Bypass resistance, web/Microsoft profile separation, legal and IARC evidence accuracy. |
| 3 | Move controller ownership to application lifetime and consolidate modes/cursor/dispatch. | Keyboard/touch parity, lifecycle edges, one controller state machine. |
| 4 | Make landing, auth, realm, and character flows controller-first. | OSK, focus restoration, errors, 2FA/SSO fallbacks, launch-to-world E2E. |
| 5 | Add analog gameplay and complete access to every action slot and bindable action. | Action-dispatch parity, radial/layer UX, haptics, combat regressions. |
| 6 | Complete controller HUD, chat, accessibility, safe areas, scrolling, and non-drag alternatives. | Modal/window matrix, no chat movement leak, mobile and 10-foot layouts. |
| 7 | Harden the native Xbox bridge for multi-pad, analog triggers, rumble, reconnect, suspend, and console generation. | Native serialization, lifecycle, co-op, performance budgets, hardware smoke. |
| 8 | Harden Cartridge and EmulatorJS controller behavior across the shell and stream server. | Document-ready resend, explicit mappings, exit suppression, save/load, representative cores. |
| 9 | Prepare honest Store discovery repair and ID@Xbox onboarding evidence. | Xbox offer actions, rating truthfulness, listing completeness, no unauthorized publication. |
| 10 | Capture truthful progression, complete hardware/WACK QA, and prepare certification handoff. | Screenshot provenance, Xbox matrix, artifact hashes, final gate and rollback evidence. |

Each implementation phase is followed immediately by its matching `phase-XX-qa.md` session. Phase 10 QA is the final packet gate and must offer packet teardown only after surfacing all deferred follow-ups and obtaining explicit user confirmation.

## Commit strategy

- Planning packet: `docs: add xbox controller platform phased implementation plan`
- Phase work: 2 to 5 small Conventional Commits per phase, using explicit paths.
- Cross-repository work: commit independently inside each repository. Never combine Cryptic Realm and Cartridge changes into one Git commit.
- Store receipts and signed artifacts are evidence, not substitutes for source commits.

## External-action boundary

Read-only catalog and Partner Center inspection is allowed. Any final submission, publication, IARC certification, account enrollment, credential grant, package upload, or production deployment requires the appropriate user confirmation and the repository's release gates at action time. Store publication is not part of Phases 1 through 10; it may run only as a separate action after Phase 10 QA is green and the user gives fresh confirmation for the exact reviewed change.
