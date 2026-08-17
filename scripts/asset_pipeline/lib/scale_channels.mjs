// Animation SCALE channels: the size-snap defect, and the one place it is removed.
//
// An estate-wide repair removed 716,000 scale channels from /opt/cr-realms-store
// because bodies were SNAPPING SIZE between animations. That repair could not
// hold, because it treated the symptom: the RIG REFERENCE
// (public/models/chars/players/knight.glb) still carried 444 of them, and
// manualRigOntoReference() copies the reference's clip library VERBATIM onto
// every body it rigs. Each newly rigged body was therefore born with the defect
// the sweep had just removed from its neighbours.
//
// WHY A CONSTANT SCALE TRACK IS THE DANGEROUS KIND. All 444 on knight.glb
// measured constant (1,1,1) — nonUnit 0, varying 0 — which is exactly why no
// numeric check ever flagged them. On knight itself they are inert, because
// knight's own bind scale is 1. Copied onto a body whose bind scale is not 1,
// that identity track FORCES scale to 1 for the duration of its clip and lets go
// the instant a clip WITHOUT the track takes over. The body changes size at the
// clip boundary and nothing in the file looks wrong.
//
// Two places call this, deliberately:
//   - scripts/realm_assets/strip_scale.mjs, to clean the reference itself;
//   - manualRigOntoReference(), on its own output, so a future reference
//     regression cannot leak through even if nobody re-runs the tool.
// Same belt-and-braces reasoning as banning the build step that kept
// manufacturing the condemned body bank: fix the source AND close the path.

/** Remove every animation scale channel from a document root, in place.
 *  Returns the number removed. Disposes each channel's sampler when no other
 *  channel of that animation still uses it, so the accessor is pruned rather
 *  than shipped as dead weight. */
export function stripScaleChannels(root) {
  let n = 0;
  for (const anim of root.listAnimations()) {
    for (const ch of anim.listChannels()) {
      if (ch.getTargetPath() !== 'scale') continue;
      const sampler = ch.getSampler();
      ch.dispose();
      if (sampler && !anim.listChannels().some((c) => c.getSampler() === sampler)) sampler.dispose();
      n++;
    }
  }
  return n;
}

/** Report scale channels without touching anything: total, how many carry a
 *  value other than 1, and how many actually VARY over their clip. A varying
 *  track is real animation — deleting it changes how the model looks, so the
 *  caller must stop rather than strip. */
export function auditScaleChannels(root) {
  let total = 0, nonUnit = 0, varying = 0;
  for (const anim of root.listAnimations()) {
    for (const ch of anim.listChannels()) {
      if (ch.getTargetPath() !== 'scale') continue;
      total++;
      const a = ch.getSampler()?.getOutput()?.getArray();
      if (!a) continue;
      let mn = Infinity, mx = -Infinity;
      for (let i = 0; i < a.length; i++) { if (a[i] < mn) mn = a[i]; if (a[i] > mx) mx = a[i]; }
      if (mx - mn > 1e-4) varying++;
      if (Math.abs(mn - 1) > 1e-4 || Math.abs(mx - 1) > 1e-4) nonUnit++;
    }
  }
  return { total, nonUnit, varying };
}
