# Xbox Controller Platform Progress

Packet approved: 2026-08-03

| Session | Status | Started | Completed |
|---|---|---|---|
| Phase 1 | Pending | | |
| Phase 1 QA | Pending | | |
| Phase 2 | Pending | | |
| Phase 2 QA | Pending | | |
| Phase 3 | Pending | | |
| Phase 3 QA | Pending | | |
| Phase 4 | Pending | | |
| Phase 4 QA | Pending | | |
| Phase 5 | Pending | | |
| Phase 5 QA | Pending | | |
| Phase 6 | Pending | | |
| Phase 6 QA | Pending | | |
| Phase 7 | Pending | | |
| Phase 7 QA | Pending | | |
| Phase 8 | Pending | | |
| Phase 8 QA | Pending | | |
| Phase 9 | Pending | | |
| Phase 9 QA | Pending | | |
| Phase 10 | Pending | | |
| Phase 10 QA | Pending | | |

## Phase deliverables

### Phase 1: Canonical Xbox release lane

- [ ] Reconcile the exact Xbox candidate without overwriting dirty user work.
- [ ] Restore missing client/platform modules and `https://app.local` auth support.
- [ ] Establish UWP WebView2 as the only Xbox build path and remove obsolete claims.
- [ ] Bind package version, source SHA, client artifact hash, and server compatibility.
- [ ] Phase 1 QA completed with no blocking findings.

### Phase 2: Store-safe product profile

- [ ] Define one typed product-policy seam for web and Microsoft distributions.
- [ ] Enforce cash/crypto benefit exclusion server-side for Microsoft builds.
- [ ] Align UI, legal copy, Store copy, and test evidence with real behavior.
- [ ] Prove web behavior cannot leak into the Microsoft profile.
- [ ] Phase 2 QA completed with no blocking findings.

### Phase 3: App-lifetime controller foundation

- [ ] Create controller service before world entry.
- [ ] Define explicit landing/auth/character/world/menu/pointer/chat modes.
- [ ] Consolidate duplicate cursor and action-dispatch paths.
- [ ] Preserve keyboard, mouse, and touch behavior.
- [ ] Phase 3 QA completed with no blocking findings.

### Phase 4: Controller-first onboarding

- [ ] Controller navigation from cold launch through world entry.
- [ ] Xbox OSK behavior for every required text field.
- [ ] Error, 2FA, external-auth, realm, create/select/delete flows covered.
- [ ] Real-browser E2E and packaged-origin auth tests green.
- [ ] Phase 4 QA completed with no blocking findings.

### Phase 5: Gameplay controller depth

- [ ] Preserve analog stick magnitude.
- [ ] Reach all 23 action slots without pointer-only interaction.
- [ ] Every offered binding dispatches or is no longer offered.
- [ ] Context glyphs and haptic events are covered by tests.
- [ ] Phase 5 QA completed with no blocking findings.

### Phase 6: HUD, chat, and accessibility

- [ ] Every modal and managed window has a controller contract.
- [ ] Scroll and drag alternatives are controller accessible.
- [ ] Chat focus, submit, cancel, channel, recipient, and quick-chat behavior is explicit.
- [ ] 10-foot safe areas and accessibility settings cover all app surfaces and mobile remains green.
- [ ] Phase 6 QA completed with no blocking findings.

### Phase 7: Native Xbox bridge

- [ ] Multiple pads, analog triggers, standard index 16 placeholder, and haptics.
- [ ] Reconnect, removal, suspend/resume, focus loss, and reassignment behavior.
- [ ] Xbox One and Series generation budgets are stamped and honored.
- [ ] Native/JS contract tests plus available hardware smoke pass.
- [ ] Phase 7 QA completed with no blocking findings.

### Phase 8: Cartridge and EmulatorJS

- [ ] Ready handshake force-sends current controller state per document.
- [ ] Exit chord is singular, documented, and suppressed from the emulated core.
- [ ] Explicit default controls and user remaps work across representative systems.
- [ ] Resume, save, load, exit, disconnect, and authentication are controller accessible.
- [ ] Canonical source and deployed-copy drift are recorded without deployment.
- [ ] Phase 8 QA completed with no blocking findings.

### Phase 9: Store discovery and ID@Xbox

- [ ] Xbox availability becomes publicly browsable/acquirable in evidence or remains explicitly blocked.
- [ ] IARC answers follow shipped behavior; cash rewards are not merely hidden in metadata.
- [ ] Xbox listing assets and requirements are complete and accurate.
- [ ] ID@Xbox concept/onboarding dossier is ready with OPEN Microsoft decisions listed.
- [ ] No Store submission/publication occurs without confirmation.
- [ ] Phase 9 QA completed with no blocking findings.

### Phase 10: Screenshots, hardware, and release

- [ ] Ten current 1600x900 progression screenshots have provenance and accurate captions.
- [ ] Xbox hardware, WACK, offline/online, lifecycle, multiplayer/chat, and upgrade matrices are recorded.
- [ ] Source, artifact, signing, Store receipt, rollback, and health evidence remain distinct.
- [ ] Final certification handoff is complete with no unsupported claim.
- [ ] Phase 10 QA completed and packet teardown offered to the user.

## Notes

- Planning began in a dirty shared worktree. Only files under this packet may be staged for the planning commit.
- Production and Partner Center remain unchanged during planning.
