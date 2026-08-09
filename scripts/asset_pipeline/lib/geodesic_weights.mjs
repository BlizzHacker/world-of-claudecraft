// Geodesic (surface-distance) skin-weight model for rebindSkinInPlace.
//
// WHY
//   The default solver in manual_rig.mjs weights a vertex by STRAIGHT-LINE
//   distance to each bone segment. Its own docstring admits the assumption:
//   chibi bodies are "blobby and forgiving". A pale, hollow, thin-limbed,
//   A-posed skeleton is none of those, and Euclidean distance then claims
//   surface for bones the surface does not connect to:
//     - a hollow ribcage's INNER wall is millimetres from the upper-arm axis,
//       so the arm claims the chest and the ribcage balloons;
//     - a pelvis plate hanging in front of the thighs is nearest to the leg
//       bones, so it tears off and floats;
//     - claws hanging past the wrist are nearest to the FOREARM segment's end
//       cap, so the hand collapses into the forearm;
//     - the A-posed upper arm runs alongside the torso, so torso and arm
//       trade surface and the arm goes noodly.
//   Every one of those is the same error: two surfaces that are CLOSE IN THE
//   AIR but FAR ACROSS THE MESH.
//
// THE MODEL
//   1. WELD    positions at `weldEps` so split-normal / split-UV seams do not
//              fragment the graph (this mesh: 59,037 instances -> 25,417 welded).
//   2. GRAPH   every triangle edge, cost = its BIND-POSE length. Surface
//              distance is Dijkstra over that graph — the same field
//              scripts/reweight_topo.mjs uses to separate a pelt resting on a
//              forearm from the forearm itself.
//   3. SEED    each bone from surface it UNAMBIGUOUSLY owns. Four filters, each
//              answering a failure the others cannot see:
//              (A) AXIAL — only a bone's SHAFT may seed. Its two end caps are
//                  shared with its parent and its child, so surface projecting
//                  onto them belongs to the joint. Without this the thigh bone,
//                  whose head sits inside the pelvic bowl, seeds the pelvis;
//                  the two thighs then split the pelvis between them and it
//                  tears apart the moment the legs move oppositely.
//              (B) NORMAL — the bone must lie UNDER the skin, not across a gap:
//                  the vector from the bone out to the vertex must agree with
//                  the outward normal. This is what stops an A-posed upper arm
//                  from anchoring on the ribcage standing beside it.
//              (C) DOMINANCE — a vertex is a candidate only for a bone that
//                  beats the runner-up by `geoSeedMargin`, and only inside a
//                  radius grown from that bone's OWN closest decile
//                  (`geoSeedCoreFactor`). How deep a bone sits under its own
//                  surface is a property of the body, not a constant — here the
//                  spine floats ~0.10 inside a hollow ribcage while the forearm
//                  sits ~0.01 under the skin — so one fixed radius cannot serve
//                  both. Anchoring on the closest decile rather than the median
//                  matters: the A-posed upper arm's Euclidean territory is
//                  mostly ribcage, so its MEDIAN candidate IS the ribcage.
//              (D) ISLAND — a bone's seeds are split into connected patches and
//                  any patch that never comes within `geoSeedCoreBand` of the
//                  bone's closest seed is dropped. Filters (A) and (B) both go
//                  blind on a THIN SHELL: the inner face of a rib points back
//                  into the body, so an arm outside that rib is legitimately
//                  "under" it. The tell is connectivity — that patch is a
//                  separate island, reachable only by leaving the arm, crossing
//                  the shoulder and coming down the chest. On a skeletal body,
//                  where one mis-seeded island captures a whole rib, this is
//                  the difference between a repair and a ballooned ribcage.
//              Then COVERAGE: any bone left under `geoSeedMin` seeds takes the
//              nearest still-unseeded vertices to sample points along its own
//              segments. Without it a short bone on a thick body (a clavicle, a
//              lower-spine link) can never win a dominance test and stays at
//              ZERO influence forever — which is exactly the defect being
//              repaired here, where both shoulders and Spine02 carried none.
//   4. FIELD   one multi-source Dijkstra per bone -> g_b(v), surface distance
//              from that bone's seed region.
//   5. FALLOFF w_b = exp(-(g_b - g_min) / geoBand) — a softmax over surface
//              distance. NOT 1/g^p: that is singular at the seeds, so every
//              seeded patch becomes a rigid core with a wall around it, and on
//              a fine mesh (edges ~0.007 here) against a 0.5 limb throw those
//              walls tear. The exponential has no singularity and `geoBand` is
//              literally the surface distance over which one bone hands off to
//              the next, so the gradient — which is what tears — is bounded by
//              construction. Wide beats narrow: reweight_topo.mjs measured
//              0.26-0.28 cutting torn edges another 20-25% over 0.12 on three
//              shipped bodies. Cap at `influences` (<=4, the VEC4 limit),
//              renormalise to sum 1.
//   6. DIFFUSE a few Laplacian passes over the same graph. It only ever
//              averages a vertex with its own surface neighbours, so it cannot
//              invent a shape, and it removes the hard boundary a top-K
//              truncation leaves behind.
//
//   Vertices no seed can reach (a genuinely detached prop shell) fall back to
//   the caller's Euclidean solver, so this model never leaves a shell unweighted.
//
// STATUS — 2026-08-07. OPT-IN AND NOT YET SHIPPED ON ANY ASSET.
//   With `weightModel` unset manual_rig.mjs is byte-identical to the version
//   before this file existed; that was re-proven over 10 cases (6 bodies through
//   rebindSkinInPlace, one non-default option set, and three option sets through
//   manualRigOntoReference, the path 1,672 registered bodies use).
//
//   Measured on realm_infernal_hero_skullbeast (the target this was written
//   for), the model DOES fix the ownership problem: all three real joints that
//   carried zero influence — LeftShoulder, RightShoulder, Spine02 — end up
//   weighted, the deltoid stops reading `neck` 0.50 / LeftArm 0.11 and becomes a
//   genuine LeftArm / LeftShoulder / Spine02 blend, the hanging pelvis blade
//   returns to Hips, and the claws stay on LeftHand instead of collapsing into
//   the forearm.
//
//   It still does NOT clear the visual gate on that body, and the reason is
//   arithmetic, not tuning. Its edges are ~0.007 long and its limbs throw ~0.5,
//   so keeping an edge under 1.5x needs the weight to change by <1% per edge —
//   a hand-off spread over ~1.0 of surface, most of the torso. Narrow bands keep
//   the rib bars crisp and tear at every piece boundary (band 0.03: Walk 3,694
//   edges/frame >2x); wide bands stop the tearing and melt the rib bars instead,
//   because blending four bone transforms on a thin bar is linear-blend-skinning
//   volume collapse (band 0.15 + 30 diffusion: ribcage visibly smeared in Idle).
//   The best compromise found (band 0.06, 20 diffusion passes) balloons the
//   ribcage in Walk and webs the shoulder-to-arm gap in Run. The original bind
//   scores well on stretch (Walk 86 edges/frame >2x) only because it barely uses
//   the arm bones at all — which IS the defect — so that metric rewards
//   under-committing on this body and must not be read as a target on its own.
//
//   Before reaching for this on another asset: it is aimed at bodies whose
//   surfaces TOUCH but should not share weight. It is not a fix for a body whose
//   mesh is a lattice of thin rigid bars; that needs the deltoid re-bound at the
//   rig or the cap merged into the arm at the mesh, which is the same conclusion
//   scripts/reweight_topo.mjs reached from the distance side.
//
// LEAF BONES
//   buildSegments() gives a leaf joint a stub pointing +Z (or up, for a head).
//   That is fine for a T-posed chibi and wrong for a hand at the end of an
//   A-posed arm: the stub points across the palm instead of along it, so the
//   hand never gets a seed region of its own and the claws fall to the forearm.
//   Here a leaf's stub CONTINUES ITS OWN LIMB — half the parent bone's length
//   along the parent->joint direction. Tip MARKERS (`*_end`) are skipped: they
//   are locators, not bones, and handing them surface would make horns and
//   skull caps follow a node the exporter only baked for orientation.

const EDGE_BASE = 1 << 21; // packs (u,v) into one exact double; caps welded verts

/** Distance from p to segment ab. `out`, if given, receives the vector from the
 *  closest point on the segment to p in 0..2 — the direction the bone would
 *  have to push the surface — and the clamped parameter t in slot 3. */
function distToSeg(p, a, b, out) {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const abz = b[2] - a[2];
  const apx = p[0] - a[0];
  const apy = p[1] - a[1];
  const apz = p[2] - a[2];
  const len2 = abx * abx + aby * aby + abz * abz;
  let t = len2 > 1e-18 ? (apx * abx + apy * aby + apz * abz) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = apx - t * abx;
  const dy = apy - t * aby;
  const dz = apz - t * abz;
  if (out) {
    out[0] = dx;
    out[1] = dy;
    out[2] = dz;
    out[3] = t;
  }
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Binary min-heap over (dist, vertex). */
class Heap {
  constructor(cap) {
    this.d = new Float64Array(Math.max(16, cap));
    this.v = new Int32Array(Math.max(16, cap));
    this.n = 0;
  }
  push(dist, vert) {
    if (this.n === this.d.length) {
      const nd = new Float64Array(this.n * 2);
      const nv = new Int32Array(this.n * 2);
      nd.set(this.d);
      nv.set(this.v);
      this.d = nd;
      this.v = nv;
    }
    let i = this.n++;
    this.d[i] = dist;
    this.v[i] = vert;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (this.d[par] <= this.d[i]) break;
      const td = this.d[par];
      const tv = this.v[par];
      this.d[par] = this.d[i];
      this.v[par] = this.v[i];
      this.d[i] = td;
      this.v[i] = tv;
      i = par;
    }
  }
  pop() {
    const top = this.v[0];
    this.n--;
    if (this.n > 0) {
      this.d[0] = this.d[this.n];
      this.v[0] = this.v[this.n];
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.n && this.d[l] < this.d[m]) m = l;
        if (r < this.n && this.d[r] < this.d[m]) m = r;
        if (m === i) break;
        const dd = this.d[m];
        const vv = this.v[m];
        this.d[m] = this.d[i];
        this.v[m] = this.v[i];
        this.d[i] = dd;
        this.v[i] = vv;
        i = m;
      }
    }
    return top;
  }
}

function dijkstra(nW, csrStart, csrTo, csrW, seeds) {
  // Float64, and staleness decided ONLY by `settled`. Holding the field in
  // Float32 while the heap keys are Float64 makes the usual `d > dist[u]`
  // staleness test reject the CORRECT entry whenever the stored value rounded
  // down — that vertex then never relaxes its neighbours and the field acquires
  // real discontinuities. A discontinuous field is a weight cliff, and a weight
  // cliff is a tear: it shredded this body's claws and tail before it was found.
  const dist = new Float64Array(nW).fill(Infinity);
  const heap = new Heap(seeds.length * 2);
  for (const s of seeds) {
    if (dist[s] === 0) continue;
    dist[s] = 0;
    heap.push(0, s);
  }
  const settled = new Uint8Array(nW);
  while (heap.n > 0) {
    const d = heap.d[0];
    const u = heap.pop();
    if (settled[u]) continue;
    settled[u] = 1;
    for (let e = csrStart[u]; e < csrStart[u + 1]; e++) {
      const v = csrTo[e];
      const nd = d + csrW[e];
      if (nd < dist[v]) {
        dist[v] = nd;
        heap.push(nd, v);
      }
    }
  }
  return dist;
}

/** Welded position graph over every primitive that carries POSITION. */
function buildGraph(prims, weldEps) {
  const scaleE = 1 / weldEps;
  const weldId = new Map();
  let nW = 0;
  const primRep = [];
  const el = [];
  const posOf = [];
  for (const prim of prims) {
    const pos = prim.getAttribute('POSITION');
    const n = pos.getCount();
    const rep = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      pos.getElement(i, el);
      const k = `${Math.round(el[0] * scaleE)},${Math.round(el[1] * scaleE)},${Math.round(el[2] * scaleE)}`;
      let id = weldId.get(k);
      if (id === undefined) {
        id = nW++;
        weldId.set(k, id);
        posOf.push(el[0], el[1], el[2]);
      }
      rep[i] = id;
    }
    primRep.push(rep);
  }
  if (nW >= EDGE_BASE) throw new Error(`geodesic: ${nW} welded vertices exceeds the ${EDGE_BASE} edge-packing base`);
  const wp = Float64Array.from(posOf);

  const edgeSet = new Set();
  const push = (a, b) => {
    if (a === b) return;
    const u = a < b ? a : b;
    const v = a < b ? b : a;
    edgeSet.add(u * EDGE_BASE + v);
  };
  // Area-weighted vertex normals straight off the triangle winding, not off the
  // NORMAL attribute: welding has already merged the split-normal seams, and the
  // winding is the one thing a shading normal cannot contradict.
  const nrm = new Float64Array(nW * 3);
  const tri = (a, b, c) => {
    push(a, b);
    push(b, c);
    push(a, c);
    const ux = wp[b * 3] - wp[a * 3];
    const uy = wp[b * 3 + 1] - wp[a * 3 + 1];
    const uz = wp[b * 3 + 2] - wp[a * 3 + 2];
    const vx = wp[c * 3] - wp[a * 3];
    const vy = wp[c * 3 + 1] - wp[a * 3 + 1];
    const vz = wp[c * 3 + 2] - wp[a * 3 + 2];
    const fx = uy * vz - uz * vy;
    const fy = uz * vx - ux * vz;
    const fz = ux * vy - uy * vx;
    for (const w of [a, b, c]) {
      nrm[w * 3] += fx;
      nrm[w * 3 + 1] += fy;
      nrm[w * 3 + 2] += fz;
    }
  };
  prims.forEach((prim, pi) => {
    const rep = primRep[pi];
    const idx = prim.getIndices();
    if (idx) {
      const ia = idx.getArray();
      for (let t = 0; t + 2 < ia.length; t += 3) tri(rep[ia[t]], rep[ia[t + 1]], rep[ia[t + 2]]);
    } else {
      for (let t = 0; t + 2 < rep.length; t += 3) tri(rep[t], rep[t + 1], rep[t + 2]);
    }
  });
  // Winding should already make these point out of the body; confirm it against
  // the centroid rather than trusting it, and flip the whole field if not.
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let v = 0; v < nW; v++) {
    cx += wp[v * 3];
    cy += wp[v * 3 + 1];
    cz += wp[v * 3 + 2];
  }
  cx /= nW;
  cy /= nW;
  cz /= nW;
  let outward = 0;
  for (let v = 0; v < nW; v++) {
    outward += nrm[v * 3] * (wp[v * 3] - cx) + nrm[v * 3 + 1] * (wp[v * 3 + 1] - cy) + nrm[v * 3 + 2] * (wp[v * 3 + 2] - cz);
  }
  const flip = outward < 0 ? -1 : 1;
  for (let v = 0; v < nW; v++) {
    const len = Math.hypot(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]);
    if (len > 1e-18) {
      nrm[v * 3] = (flip * nrm[v * 3]) / len;
      nrm[v * 3 + 1] = (flip * nrm[v * 3 + 1]) / len;
      nrm[v * 3 + 2] = (flip * nrm[v * 3 + 2]) / len;
    }
  }

  const deg = new Int32Array(nW + 1);
  for (const key of edgeSet) {
    deg[Math.floor(key / EDGE_BASE)]++;
    deg[key % EDGE_BASE]++;
  }
  const csrStart = new Int32Array(nW + 1);
  for (let i = 0; i < nW; i++) csrStart[i + 1] = csrStart[i] + deg[i];
  const csrTo = new Int32Array(csrStart[nW]);
  const csrW = new Float32Array(csrStart[nW]);
  const fill = csrStart.slice(0, nW);
  for (const key of edgeSet) {
    const u = Math.floor(key / EDGE_BASE);
    const v = key % EDGE_BASE;
    const len = Math.hypot(wp[u * 3] - wp[v * 3], wp[u * 3 + 1] - wp[v * 3 + 1], wp[u * 3 + 2] - wp[v * 3 + 2]);
    csrTo[fill[u]] = v;
    csrW[fill[u]++] = len;
    csrTo[fill[v]] = u;
    csrW[fill[v]++] = len;
  }
  return { nW, wp, nrm, primRep, csrStart, csrTo, csrW, edges: edgeSet.size, windingFlipped: flip < 0 };
}

/** Bone segments for the geodesic model.
 *
 *  Two deliberate differences from buildSegments():
 *   - a LEAF's stub CONTINUES its own limb (half the parent bone, along the
 *     parent->joint direction) instead of pointing +Z. A hand's stub then runs
 *     down through the palm and claws instead of across the palm.
 *   - excluded tip markers stop being BONES but stay SEGMENT ENDPOINTS. Dropping
 *     `head_end` outright would leave `Head` with nothing but a 9cm stub toward
 *     the face and hand the whole skull to `neck`; keeping it as the far end of
 *     the Head segment describes the skull correctly while giving the marker
 *     itself no seeds and therefore no weight.
 *
 *  Never mutates the caller's segment list. */
function geodesicSegments(joints, jointPos, byName, armLine, excludeRe) {
  const parentOf = new Int32Array(joints.length).fill(-1);
  joints.forEach((j, i) => {
    for (const c of j.listChildren()) {
      const ci = byName.get(c.getName());
      if (ci !== undefined) parentOf[ci] = i;
    }
  });
  const segs = new Map(); // jointIdx -> [{a,b}]
  for (let i = 0; i < joints.length; i++) {
    const name = joints[i].getName();
    if (/^root$/i.test(name) || name.startsWith('handslot')) continue;
    const kids = joints[i]
      .listChildren()
      .map((c) => byName.get(c.getName()))
      .filter((ci) => ci !== undefined);
    const list = [];
    for (const ci of kids) list.push({ a: jointPos[i], b: jointPos[ci] });
    if (!list.length) {
      const p = jointPos[i];
      const par = parentOf[i];
      let dir = null;
      if (par >= 0) {
        const d = [p[0] - jointPos[par][0], p[1] - jointPos[par][1], p[2] - jointPos[par][2]];
        if (Math.hypot(d[0], d[1], d[2]) > 1e-9) dir = [d[0] * 0.5, d[1] * 0.5, d[2] * 0.5];
      }
      if (!dir) dir = /^head$/i.test(name) ? [0, 0.4 * armLine, 0] : [0, 0, 0.05 * armLine];
      list.push({ a: p, b: [p[0] + dir[0], p[1] + dir[1], p[2] + dir[2]] });
    }
    segs.set(i, list);
  }
  // Markers describe geometry but must never own surface.
  for (const i of [...segs.keys()]) if (excludeRe.test(joints[i].getName())) segs.delete(i);
  return segs;
}

/** Solve skin weights by surface distance. Returns per-primitive JOINTS/WEIGHTS
 *  plus a report. Pure: writes nothing, mutates nothing it was handed. */
export function solveGeodesicWeights({
  prims,
  joints,
  jointPos,
  byName,
  side,
  centerX,
  sideGuard,
  armLine,
  influences = 4,
  fallbackSolve,
  opts = {},
}) {
  const K = Math.max(1, Math.min(4, influences));
  const weldEps = opts.weldEps ?? 1e-5;
  // Hand-off width, in surface distance, as a fraction of the arm line.
  const band = (opts.geoBand ?? 0.15) * (armLine > 1e-6 ? armLine : 1);
  const excludeRe = opts.geoExcludeJoints ? new RegExp(opts.geoExcludeJoints, 'i') : /_end$/i;
  const scaleRef = armLine > 1e-6 ? armLine : 1;
  const seedRadius = (opts.geoSeedRadius ?? 0.25) * scaleRef; // absolute safety cap only
  const corePct = opts.geoSeedCorePct ?? 0.1;
  const coreFactor = opts.geoSeedCoreFactor ?? 3;
  const seedMargin = opts.geoSeedMargin ?? 0.8;
  const normalGate = opts.geoSeedNormalGate !== false;
  const normalMin = opts.geoSeedNormalMin ?? 0;
  // How far past a bone's closest seed a seed ISLAND may sit before it is
  // treated as contamination rather than as more of the same bone.
  const coreBand = (opts.geoSeedCoreBand ?? 0.04) * scaleRef;
  const axialMargin = opts.geoSeedAxialMargin ?? 0.15;
  const seedMin = opts.geoSeedMin ?? 8;
  const seedK = opts.geoSeedK ?? 6;
  const seedSamples = opts.geoSeedSamples ?? 8;
  const diffIters = opts.geoDiffuseIters ?? 20;
  const diffLambda = opts.geoDiffuseLambda ?? 0.5;
  const minW = opts.geoMinWeight ?? 1e-4;
  const preK = Math.max(K, opts.geoPreInfluences ?? K + 4);

  const graph = buildGraph(prims, weldEps);
  const { nW, wp, nrm, primRep, csrStart, csrTo, csrW } = graph;
  const boneSegs = geodesicSegments(joints, jointPos, byName, armLine, excludeRe);
  const boneList = [...boneSegs.keys()];

  const sideOk = (ji, lx) => {
    const s = side(ji);
    if (s === 1 && lx < -sideGuard) return false;
    if (s === -1 && lx > sideGuard) return false;
    return true;
  };

  // ---- seeding, pass A: unambiguous interiors ------------------------------
  const seedOf = new Int32Array(nW).fill(-1);
  const seedCount = new Map(boneList.map((ji) => [ji, 0]));
  const candOf = new Map(boneList.map((ji) => [ji, []])); // bone -> [[dist, vertex]]
  const p3 = [0, 0, 0];
  const off = [0, 0, 0, 0];
  let gateRejects = 0;
  for (let v = 0; v < nW; v++) {
    p3[0] = wp[v * 3];
    p3[1] = wp[v * 3 + 1];
    p3[2] = wp[v * 3 + 2];
    const lx = p3[0] - centerX;
    let b1 = -1;
    let d1 = Infinity;
    let d2 = Infinity;
    let gated = false;
    for (const ji of boneList) {
      if (!sideOk(ji, lx)) continue;
      let d = Infinity;
      let ok = false;
      for (const sg of boneSegs.get(ji)) {
        const dd = distToSeg(p3, sg.a, sg.b, off);
        if (dd >= d) continue;
        d = dd;
        // A bone's END CAPS are shared with its parent and its child, so
        // surface that projects onto them belongs to the JOINT, not to this
        // bone. Without this the thigh bone — whose head sits INSIDE the pelvic
        // bowl — seeds the pelvis, the two thighs split the pelvis between them
        // and it tears apart the moment the legs move oppositely. Only the
        // shaft may seed; the caps become unseeded and the field blends them.
        ok = off[3] >= axialMargin && off[3] <= 1 - axialMargin;
        if (ok && normalGate) {
          // The bone must lie UNDER this piece of skin. `off` runs from the
          // closest point on the bone out to the vertex, so a surface the bone
          // is inside of has it pointing the same way as the outward normal.
          // A ribcage wall standing beside an A-posed upper arm fails this: the
          // arm is across a gap, on the OUTSIDE of that wall, so the arm never
          // gets to anchor on the chest. This is the one test that separates
          // "under the skin" from "merely nearby", and neither Euclidean nor
          // geodesic distance can make it.
          ok = dd < 1e-9 || (off[0] * nrm[v * 3] + off[1] * nrm[v * 3 + 1] + off[2] * nrm[v * 3 + 2]) / dd >= normalMin;
        }
      }
      if (!ok) {
        gated = true;
        continue;
      }
      if (d < d1) {
        d2 = d1;
        d1 = d;
        b1 = ji;
      } else if (d < d2) d2 = d;
    }
    if (gated) gateRejects++;
    if (b1 >= 0 && d1 <= seedRadius && d1 <= seedMargin * d2) candOf.get(b1).push([d1, v]);
  }
  // Each bone gets a radius derived from its OWN core rather than a constant.
  // How deep a bone sits under the surface it owns is a property of the body,
  // not of the rig: here the spine bones float ~0.10 inside a hollow ribcage
  // while the forearm sits ~0.01 under the skin. Anchoring on the CLOSEST
  // decile (the surface that genuinely hugs the bone) and scaling by
  // `geoSeedCoreFactor` gives the forearm a tight core and the spine a broad
  // one from one rule. Anchoring on the median instead fails: the A-posed upper
  // arm's Euclidean territory is mostly ribcage, so its median IS the ribcage.
  const seedRadiusOf = new Map();
  const seedDist = new Float32Array(nW);
  for (const ji of boneList) {
    const cand = candOf.get(ji);
    if (!cand.length) continue;
    cand.sort((a, b) => a[0] - b[0]);
    const core = cand[Math.min(cand.length - 1, Math.floor(cand.length * corePct))][0];
    const r = Math.min(seedRadius, Math.max(core * coreFactor, cand[0][0]));
    seedRadiusOf.set(ji, r);
    for (const [d, v] of cand) {
      if (d > r) break;
      seedOf[v] = ji;
      seedDist[v] = d;
    }
  }

  // ---- seed patches that are not part of the bone's core are dropped -------
  // The normal gate cannot save a THIN SHELL: on a hollow ribcage the inner
  // face of a rib points back INTO the body, so an A-posed upper arm sitting
  // outside that rib is legitimately "behind" it and the gate lets the arm
  // anchor there. The tell is connectivity, not orientation — that patch is a
  // separate island of the bone's seed set, reachable only by leaving the arm,
  // crossing the shoulder and coming down the chest. Keep only the seed islands
  // that reach within `geoSeedCoreBand` of the bone's closest seed of all; on a
  // skeletal body, where one mis-seeded island captures an entire rib, this is
  // the difference between a repair and a ballooned ribcage.
  const compOf = new Int32Array(nW).fill(-1);
  const comps = [];
  const stack = [];
  for (let v0 = 0; v0 < nW; v0++) {
    if (seedOf[v0] < 0 || compOf[v0] >= 0) continue;
    const lab = seedOf[v0];
    const c = { bone: lab, n: 0, min: Infinity, ids: [] };
    compOf[v0] = comps.length;
    stack.push(v0);
    while (stack.length) {
      const u = stack.pop();
      c.n++;
      c.ids.push(u);
      if (seedDist[u] < c.min) c.min = seedDist[u];
      for (let e = csrStart[u]; e < csrStart[u + 1]; e++) {
        const w = csrTo[e];
        if (seedOf[w] === lab && compOf[w] < 0) {
          compOf[w] = comps.length;
          stack.push(w);
        }
      }
    }
    comps.push(c);
  }
  const coreMin = new Map();
  for (const c of comps) coreMin.set(c.bone, Math.min(coreMin.get(c.bone) ?? Infinity, c.min));
  const droppedIslands = [];
  for (const c of comps) {
    if (c.min <= coreMin.get(c.bone) + coreBand) continue;
    for (const v of c.ids) seedOf[v] = -1;
    droppedIslands.push(`${joints[c.bone].getName()}:${c.n}v@${c.min.toFixed(3)}`);
  }
  for (let v = 0; v < nW; v++) if (seedOf[v] >= 0) seedCount.set(seedOf[v], seedCount.get(seedOf[v]) + 1);

  // ---- seeding, pass B: coverage for bones no dominance test can reach -----
  const forced = [];
  for (const ji of boneList) {
    if (seedCount.get(ji) >= seedMin) continue;
    let added = 0;
    for (const sg of boneSegs.get(ji)) {
      for (let s = 0; s <= seedSamples; s++) {
        const t = s / seedSamples;
        const px = sg.a[0] + t * (sg.b[0] - sg.a[0]);
        const py = sg.a[1] + t * (sg.b[1] - sg.a[1]);
        const pz = sg.a[2] + t * (sg.b[2] - sg.a[2]);
        const best = [];
        for (let v = 0; v < nW; v++) {
          if (seedOf[v] >= 0) continue;
          const lx = wp[v * 3] - centerX;
          if (!sideOk(ji, lx)) continue;
          const dx = wp[v * 3] - px;
          const dy = wp[v * 3 + 1] - py;
          const dz = wp[v * 3 + 2] - pz;
          const d2v = dx * dx + dy * dy + dz * dz;
          if (best.length < seedK) {
            best.push([d2v, v]);
            best.sort((a, b) => a[0] - b[0]);
          } else if (d2v < best[best.length - 1][0]) {
            best[best.length - 1] = [d2v, v];
            best.sort((a, b) => a[0] - b[0]);
          }
        }
        for (const [, v] of best) {
          if (seedOf[v] >= 0) continue;
          seedOf[v] = ji;
          seedCount.set(ji, seedCount.get(ji) + 1);
          added++;
        }
      }
    }
    if (added) forced.push(`${joints[ji].getName()}+${added}`);
  }

  // ---- one surface-distance field per bone ---------------------------------
  const seedsOfBone = new Map(boneList.map((ji) => [ji, []]));
  for (let v = 0; v < nW; v++) if (seedOf[v] >= 0) seedsOfBone.get(seedOf[v]).push(v);
  const fields = [];
  for (const ji of boneList) {
    const seeds = seedsOfBone.get(ji);
    if (!seeds.length) continue;
    fields.push([ji, dijkstra(nW, csrStart, csrTo, csrW, seeds)]);
  }
  if (!fields.length) throw new Error('geodesic: no bone could be seeded');

  // ---- falloff -> top-preK, normalised -------------------------------------
  let cur = new Array(nW);
  let unreachable = 0;
  const cand = [];
  for (let v = 0; v < nW; v++) {
    cand.length = 0;
    let gmin = Infinity;
    // NOTE: no laterality guard here, deliberately — it belongs to seeding only.
    // The guard is a HARD cutoff at |x - centerX| = sideGuard, so applying it to
    // the weights puts a discontinuity down the middle of the body: one side of
    // the spine admits the left bones, the other does not, and every midline
    // structure (back ridge, tail, sacrum) tears along it. Surface distance
    // already separates left from right — a right-side vertex's path to a left
    // arm seed runs all the way across the torso — so the guard buys nothing
    // here and costs a seam.
    for (const [ji, dist] of fields) {
      const g = dist[v];
      if (!(g < Infinity)) continue;
      if (g < gmin) gmin = g;
      cand.push([ji, g]);
    }
    for (const c of cand) c[1] = Math.exp(-(c[1] - gmin) / band);
    if (!cand.length) {
      unreachable++;
      p3[0] = wp[v * 3];
      p3[1] = wp[v * 3 + 1];
      p3[2] = wp[v * 3 + 2];
      cur[v] = fallbackSolve(p3);
      continue;
    }
    cand.sort((a, b) => b[1] - a[1]);
    const top = cand.slice(0, preK);
    let sum = 0;
    for (const c of top) sum += c[1];
    const m = new Map();
    for (const [ji, w] of top) m.set(ji, w / sum);
    cur[v] = m;
  }

  // ---- diffusion over the same surface graph -------------------------------
  for (let it = 0; it < diffIters; it++) {
    const next = new Array(nW);
    for (let u = 0; u < nW; u++) {
      const mu = cur[u];
      if (!mu || mu.size === 0) {
        next[u] = mu;
        continue;
      }
      const acc = new Map();
      let nb = 0;
      for (let e = csrStart[u]; e < csrStart[u + 1]; e++) {
        const mv = cur[csrTo[e]];
        if (!mv || mv.size === 0) continue;
        nb++;
        for (const [ji, w] of mv) acc.set(ji, (acc.get(ji) || 0) + w);
      }
      if (nb === 0) {
        next[u] = mu;
        continue;
      }
      const m = new Map();
      for (const [ji, w] of mu) m.set(ji, w * (1 - diffLambda));
      for (const [ji, w] of acc) m.set(ji, (m.get(ji) || 0) + (diffLambda * w) / nb);
      // Prune the long tail so the support cannot grow without bound.
      let sum = 0;
      for (const [, w] of m) sum += w;
      for (const [ji, w] of [...m]) if (w / sum < minW) m.delete(ji);
      next[u] = m;
    }
    cur = next;
  }

  // ---- cap at K, renormalise ----------------------------------------------
  const finalJ = new Int32Array(nW * 4);
  const finalW = new Float32Array(nW * 4);
  const mass = new Map();
  const dominant = new Map();
  for (let v = 0; v < nW; v++) {
    const m = cur[v] || new Map();
    const entries = [...m.entries()].filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, K);
    let sum = 0;
    for (const [, w] of entries) sum += w;
    if (sum <= 0) {
      entries.length = 0;
      entries.push([boneList[0], 1]);
      sum = 1;
    }
    for (let k = 0; k < 4; k++) {
      finalJ[v * 4 + k] = k < entries.length ? entries[k][0] : 0;
      finalW[v * 4 + k] = k < entries.length ? entries[k][1] / sum : 0;
    }
    for (const [ji, w] of entries) mass.set(ji, (mass.get(ji) || 0) + w / sum);
    dominant.set(entries[0][0], (dominant.get(entries[0][0]) || 0) + 1);
  }

  // ---- scatter back to every instance -------------------------------------
  const perPrim = new Map();
  prims.forEach((prim, pi) => {
    const rep = primRep[pi];
    const n = rep.length;
    const j = new Int32Array(n * 4);
    const w = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const v = rep[i];
      for (let k = 0; k < 4; k++) {
        j[i * 4 + k] = finalJ[v * 4 + k];
        w[i * 4 + k] = finalW[v * 4 + k];
      }
    }
    perPrim.set(prim, { j, w });
  });

  // ---- optional field probe ------------------------------------------------
  // `geoProbe: [[x,y,z], ...]` reports the nearest welded vertex's surface
  // distance to EVERY bone's seed region. When a repair lands weight somewhere
  // surprising this says whether the field or the seeding is at fault, which no
  // amount of staring at the output weights can.
  const probes = [];
  for (const q of opts.geoProbe ?? []) {
    let bv = -1;
    let bd = Infinity;
    for (let v = 0; v < nW; v++) {
      const d = Math.hypot(wp[v * 3] - q[0], wp[v * 3 + 1] - q[1], wp[v * 3 + 2] - q[2]);
      if (d < bd) {
        bd = d;
        bv = v;
      }
    }
    if (bv < 0) continue;
    const rows = fields
      .map(([ji, dist]) => [joints[ji].getName(), dist[bv]])
      .filter(([, d]) => d < Infinity)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 6)
      .map(([n, d]) => `${n}=${d.toFixed(3)}`);
    probes.push({
      at: q,
      vertex: [wp[bv * 3], wp[bv * 3 + 1], wp[bv * 3 + 2]].map((x) => +x.toFixed(3)),
      snapDist: +bd.toFixed(3),
      seededAs: seedOf[bv] >= 0 ? joints[seedOf[bv]].getName() : '-',
      normal: [nrm[bv * 3], nrm[bv * 3 + 1], nrm[bv * 3 + 2]].map((x) => +x.toFixed(2)),
      geodesic: rows.join(' '),
    });
  }

  const named = (map) =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).map(([ji, c]) => [joints[ji].getName(), Math.round(c * 100) / 100]);
  const zero = boneList.filter((ji) => !mass.has(ji) || mass.get(ji) < 1e-6).map((ji) => joints[ji].getName());

  return {
    perPrim,
    report: {
      weldedVerts: nW,
      edges: graph.edges,
      bones: boneList.length,
      seeds: Object.fromEntries(
        boneList.map((ji) => [
          joints[ji].getName(),
          `${seedCount.get(ji)}@r${(seedRadiusOf.get(ji) ?? 0).toFixed(3)}`,
        ]),
      ),
      forcedSeedBones: forced,
      seedIslands: comps.length,
      droppedSeedIslands: droppedIslands,
      coreBand: +coreBand.toFixed(4),
      unreachableVerts: unreachable,
      normalGate: normalGate ? `on(min=${normalMin}) rejected-somewhere=${gateRejects}` : 'off',
      axialMargin,
      windingFlipped: graph.windingFlipped,
      coreFactor,
      corePct,
      seedMargin,
      band: +band.toFixed(4),
      seedRadius: +seedRadius.toFixed(4),
      diffusion: `${diffIters}x${diffLambda}`,
      zeroInfluenceBones: zero,
      massTop: named(mass).slice(0, 10),
      dominantTop: named(dominant).slice(0, 10),
      probes,
    },
  };
}
