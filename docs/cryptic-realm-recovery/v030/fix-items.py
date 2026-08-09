import io
p = "/opt/cr-measure/src/sim/items.ts"
s = io.open(p, encoding="utf-8").read()
old = """<<<<<<< HEAD
  if (def.use?.type === 'townPortal') {
    // D2 town portal: consume one scroll (a stack count) and open the two-way portal.
    if (castTownPortal(ctx, () => ctx.nextId++, meta.entityId)) {
      ctx.removeItem(itemId, 1, meta.entityId);
    }
    return;
  }
  if (p.castingAbility === FISHING_CAST_ID) {
=======
  // A running non-spell cast (fishing/gather) blocks other item use. The
  // Demon Heal channel is deliberately NOT folded in: items stay usable
  // during it, as today.
  if (isNonSpellCast(p.castingAbility)) {
>>>>>>> upstream/main
"""
new = """  if (def.use?.type === 'townPortal') {
    // D2 town portal: consume one scroll (a stack count) and open the two-way portal.
    if (castTownPortal(ctx, () => ctx.nextId++, meta.entityId)) {
      ctx.removeItem(itemId, 1, meta.entityId);
    }
    return;
  }
  // A running non-spell cast (fishing/gather) blocks other item use, superseding
  // the fork's older FISHING_CAST_ID-only check. The Demon Heal channel is
  // deliberately NOT folded in: items stay usable during it, as today.
  if (isNonSpellCast(p.castingAbility)) {
"""
assert old in s, "items.ts conflict text not found"
io.open(p, "w", encoding="utf-8", newline="\n").write(s.replace(old, new, 1))
print("items.ts resolved; FISHING_CAST_ID still referenced:", s.count("FISHING_CAST_ID") - 1)
