import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });



const CHAIN = [
  ['LeftShoulder', 'LeftArm'], ['LeftArm', 'LeftForeArm'], ['LeftForeArm', 'LeftHand'],
  ['RightShoulder', 'RightArm'], ['RightArm', 'RightForeArm'], ['RightForeArm', 'RightHand'],
];
const ARM_NAMES = new Set(CHAIN.flat());
const HANDS = ['LeftHand', 'RightHand'];

function inv4(m) {
  const i = new Array(16);
  i[0]=m[5]*m[10]*m[15]-m[5]*m[11]*m[14]-m[9]*m[6]*m[15]+m[9]*m[7]*m[14]+m[13]*m[6]*m[11]-m[13]*m[7]*m[10];
  i[4]=-m[4]*m[10]*m[15]+m[4]*m[11]*m[14]+m[8]*m[6]*m[15]-m[8]*m[7]*m[14]-m[12]*m[6]*m[11]+m[12]*m[7]*m[10];
  i[8]=m[4]*m[9]*m[15]-m[4]*m[11]*m[13]-m[8]*m[5]*m[15]+m[8]*m[7]*m[13]+m[12]*m[5]*m[11]-m[12]*m[7]*m[9];
  i[12]=-m[4]*m[9]*m[14]+m[4]*m[10]*m[13]+m[8]*m[5]*m[14]-m[8]*m[6]*m[13]-m[12]*m[5]*m[10]+m[12]*m[6]*m[9];
  i[1]=-m[1]*m[10]*m[15]+m[1]*m[11]*m[14]+m[9]*m[2]*m[15]-m[9]*m[3]*m[14]-m[13]*m[2]*m[11]+m[13]*m[3]*m[10];
  i[5]=m[0]*m[10]*m[15]-m[0]*m[11]*m[14]-m[8]*m[2]*m[15]+m[8]*m[3]*m[14]+m[12]*m[2]*m[11]-m[12]*m[3]*m[10];
  i[9]=-m[0]*m[9]*m[15]+m[0]*m[11]*m[13]+m[8]*m[1]*m[15]-m[8]*m[3]*m[13]-m[12]*m[1]*m[11]+m[12]*m[3]*m[9];
  i[13]=m[0]*m[9]*m[14]-m[0]*m[10]*m[13]-m[8]*m[1]*m[14]+m[8]*m[2]*m[13]+m[12]*m[1]*m[10]-m[12]*m[2]*m[9];
  i[2]=m[1]*m[6]*m[15]-m[1]*m[7]*m[14]-m[5]*m[2]*m[15]+m[5]*m[3]*m[14]+m[13]*m[2]*m[7]-m[13]*m[3]*m[6];
  i[6]=-m[0]*m[6]*m[15]+m[0]*m[7]*m[14]+m[4]*m[2]*m[15]-m[4]*m[3]*m[14]-m[12]*m[2]*m[7]+m[12]*m[3]*m[6];
  i[10]=m[0]*m[5]*m[15]-m[0]*m[7]*m[13]-m[4]*m[1]*m[15]+m[4]*m[3]*m[13]+m[12]*m[1]*m[7]-m[12]*m[3]*m[5];
  i[14]=-m[0]*m[5]*m[14]+m[0]*m[6]*m[13]+m[4]*m[1]*m[14]-m[4]*m[2]*m[13]-m[12]*m[1]*m[6]+m[12]*m[2]*m[5];
  i[3]=-m[1]*m[6]*m[11]+m[1]*m[7]*m[10]+m[5]*m[2]*m[11]-m[5]*m[3]*m[10]-m[9]*m[2]*m[7]+m[9]*m[3]*m[6];
  i[7]=m[0]*m[6]*m[11]-m[0]*m[7]*m[10]-m[4]*m[2]*m[11]+m[4]*m[3]*m[10]+m[8]*m[2]*m[7]-m[8]*m[3]*m[6];
  i[11]=-m[0]*m[5]*m[11]+m[0]*m[7]*m[9]+m[4]*m[1]*m[11]-m[4]*m[3]*m[9]-m[8]*m[1]*m[7]+m[8]*m[3]*m[5];
  i[15]=m[0]*m[5]*m[10]-m[0]*m[6]*m[9]-m[4]*m[1]*m[10]+m[4]*m[2]*m[9]+m[8]*m[1]*m[6]-m[8]*m[2]*m[5];
  let d = m[0]*i[0] + m[1]*i[4] + m[2]*i[8] + m[3]*i[12];
  if (!d) return null;
  d = 1 / d;
  return i.map((v) => v * d);
}

function distToSeg(p, a, b) {
  const ab = [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
  const ap = [p[0]-a[0], p[1]-a[1], p[2]-a[2]];
  const l2 = ab[0]**2 + ab[1]**2 + ab[2]**2;
  let t = l2 > 0 ? (ap[0]*ab[0] + ap[1]*ab[1] + ap[2]*ab[2]) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const c = [a[0]+t*ab[0], a[1]+t*ab[1], a[2]+t*ab[2]];
  return Math.hypot(p[0]-c[0], p[1]-c[1], p[2]-c[2]);
}

function analyse(doc) {
  const root = doc.getRoot();
  const skin = root.listSkins()[0];
  if (!skin) return { skip: 'no skin' };
  const joints = skin.listJoints();
  const names = joints.map((j) => j.getName());
  const idx = new Map(names.map((n, i) => [n, i]));
  for (const h of HANDS) if (!idx.has(h)) return { skip: `no ${h} joint` };

  const ibmAcc = skin.getInverseBindMatrices();
  if (!ibmAcc) return { skip: 'no IBM' };
  const IBM = ibmAcc.getArray();
  const jointPos = names.map((_, i) => {
    const m = Array.from(IBM.slice(i * 16, i * 16 + 16));
    const w = inv4(m);
    return w ? [w[12], w[13], w[14]] : null;
  });

  const armIdx = new Set();
  names.forEach((n, i) => { if (ARM_NAMES.has(n)) armIdx.add(i); });
  const segs = CHAIN
    .map(([a, b]) => [jointPos[idx.get(a)], jointPos[idx.get(b)]])
    .filter(([a, b]) => a && b);

  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
  for (const mesh of root.listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const P = prim.getAttribute('POSITION')?.getArray();
      if (!P) continue;
      for (let i = 0; i < P.length; i += 3) {
        minX = Math.min(minX, P[i]); maxX = Math.max(maxX, P[i]);
        minY = Math.min(minY, P[i+1]); maxY = Math.max(maxY, P[i+1]);
      }
    }
  const height = maxY - minY;
  if (!(height > 0)) return { skip: 'no geometry' };
  const R = height * 0.055;          // arm-region radius
  const HR = height * 0.07;          // hand-presence radius

  const handVerts = { LeftHand: 0, RightHand: 0 };
  let regionW = 0, regionArmW = 0, regionVerts = 0;

  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const P = prim.getAttribute('POSITION')?.getArray();
      const J = prim.getAttribute('JOINTS_0')?.getArray();
      const W = prim.getAttribute('WEIGHTS_0')?.getArray();
      if (!P) continue;
      const n = P.length / 3;
      for (let v = 0; v < n; v++) {
        const p = [P[v*3], P[v*3+1], P[v*3+2]];
        for (const h of HANDS) {
          const hp = jointPos[idx.get(h)];
          if (hp && Math.hypot(p[0]-hp[0], p[1]-hp[1], p[2]-hp[2]) < HR) handVerts[h]++;
        }
        if (!J || !W) continue;
        let inRegion = false;
        for (const [a, b] of segs) { if (distToSeg(p, a, b) < R) { inRegion = true; break; } }
        if (!inRegion) continue;
        regionVerts++;
        for (let k = 0; k < 4; k++) {
          const j = J[v*4+k], w = W[v*4+k];
          if (!w) continue;
          regionW += w;
          if (armIdx.has(j)) regionArmW += w;
        }
      }
    }
  }

  return {
    clips: root.listAnimations().length,
    spanRatio: +( (maxX-minX) / height ).toFixed(3),
    leftHandVerts: handVerts.LeftHand,
    rightHandVerts: handVerts.RightHand,
    regionVerts,
    armDriven: regionW > 0 ? +(regionArmW / regionW).toFixed(3) : 0,
  };
}


export async function analyseFile(p) {
  const doc = await io.read(p);
  return analyse(doc);
}
