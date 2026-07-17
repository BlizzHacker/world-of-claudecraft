# QA checklist

- [ ] Offline deterministic scenario passes for every mode.
- [ ] Online authoritative scenario passes for every mode.
- [ ] Invite/reconnect/leave flows do not strand sessions or escrow.
- [ ] Existing characters and realm state load unchanged.
- [ ] Cross-realm custody is atomic, auditable, reversible, and destination-validated.
- [ ] Four-player touch/controller layouts are usable.
- [ ] Missing 3D assets fall back without breaking the sheet.
- [ ] All locale and typecheck guards pass.
- [ ] Full release gate, isolated stage, backup, rollback, and live health pass.
