import * as THREE from "three";
import { box, mat, rng, kaptenFaceTexture, citizenFaceTexture, headWithFace } from "./vox";

// ============================================================================
// Kapten Blok 3D — LANSKAP (1920x1080) world for long videos: "KaptenMenara".
// Same Kota Mainan as the portrait KaptenBlok composition (character rigs,
// tower, shadow monster, cat, citizens are reused verbatim), with the town
// WIDENED for 16:9 framing: plaza tiles extended, more houses/trees on both
// wings, a second street lamp, a back row of houses, distant hills and
// drifting voxel clouds — so landscape shots never show empty edges.
// Kapten Blok is an ORIGINAL voxel captain (navy / red / white / gold) built
// for this channel — not a copy of any existing game avatar.
// ============================================================================

export const WALL_Z = -12.86;
export const LAMP_POS: [number, number, number] = [3.2, 0, -6.0];
export const CAT_HOME: [number, number, number] = [3.2, 0, -8.8];
export const PEDESTAL_POS: [number, number, number] = [5.3, 0, -6.4];
export const PEDESTAL_TOP = 0.98;

export interface CharRefs {
  g: THREE.Group; head: THREE.Group;
  armL: THREE.Group; armR: THREE.Group;
  legL: THREE.Group; legR: THREE.Group; torso: THREE.Group;
}
export interface WorldRefs {
  kapten: CharRefs;
  warga: CharRefs[];
  cat: THREE.Group; catHead: THREE.Group; catPawR: THREE.Group; catTail: THREE.Group;
  shadow: THREE.Group; shadowJaw: THREE.Group; shadowFangs: THREE.Group;
  lampLight: THREE.PointLight; lampGlow: THREE.Mesh;
  handLamp: THREE.Group; handLampLight: THREE.PointLight; handLampGlow: THREE.Mesh;
  sunMesh: THREE.Mesh;
  clouds: THREE.Group;
}

function instanced(parent: THREE.Object3D, items: { p: [number, number, number]; s: [number, number, number]; c: string; ry?: number }[]) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const byColor = new Map<string, typeof items>();
  for (const it of items) { const a = byColor.get(it.c) ?? []; a.push(it); byColor.set(it.c, a); }
  const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler(); const v = new THREE.Vector3(); const sc = new THREE.Vector3();
  for (const [color, arr] of byColor) {
    const im = new THREE.InstancedMesh(geo, mat(color), arr.length);
    arr.forEach((it, i) => {
      e.set(0, it.ry ?? 0, 0); q.setFromEuler(e);
      v.set(...it.p); sc.set(...it.s);
      m4.compose(v, q, sc); im.setMatrixAt(i, m4);
    });
    im.castShadow = true; im.receiveShadow = true;
    parent.add(im);
  }
}

// ---------------------------------------------------------------- characters
function buildKapten(scene: THREE.Scene): CharRefs {
  const root = new THREE.Group(); scene.add(root);
  const SKIN = "#eebd93", NAVY = "#274b8f", NAVY_D = "#1e3a6e", WHITE = "#f4f6f8",
    RED = "#c93a32", GOLD = "#f2c14e", DARK = "#26221f";
  const mkLeg = (side: number) => {
    const hip = new THREE.Group(); hip.position.set(0.22 * side, 0.78, 0); root.add(hip);
    box(hip, WHITE, 0.36, 0.62, 0.4, 0, -0.31, 0);                    // white trousers
    box(hip, RED, 0.38, 0.1, 0.42, 0, -0.58, 0, { shadow: false });  // trouser cuff stripe
    box(hip, DARK, 0.4, 0.16, 0.58, 0, -0.7, 0.08);                  // shoe
    return hip;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);
  const torso = new THREE.Group(); torso.position.y = 0.78; root.add(torso);
  box(torso, NAVY, 0.98, 0.85, 0.52, 0, 0.425, 0);                   // navy jacket
  box(torso, WHITE, 0.4, 0.6, 0.05, 0, 0.46, 0.26, { shadow: false }); // shirt front
  const scarf = box(torso, RED, 0.36, 0.2, 0.06, 0, 0.76, 0.27, { shadow: false });
  scarf.rotation.x = 0.3;                                            // red neckerchief
  box(torso, GOLD, 0.09, 0.09, 0.04, -0.32, 0.55, 0.27, { shadow: false }); // buttons
  box(torso, GOLD, 0.09, 0.09, 0.04, 0.32, 0.55, 0.27, { shadow: false });
  box(torso, GOLD, 0.09, 0.09, 0.04, -0.32, 0.33, 0.27, { shadow: false });
  box(torso, GOLD, 0.09, 0.09, 0.04, 0.32, 0.33, 0.27, { shadow: false });
  box(torso, "#2b2b30", 0.99, 0.14, 0.53, 0, 0.07, 0);               // belt
  box(torso, GOLD, 0.2, 0.12, 0.04, 0, 0.07, 0.28, { shadow: false }); // buckle
  box(torso, GOLD, 0.36, 0.07, 0.42, -0.58, 0.86, 0);                // epaulettes
  box(torso, GOLD, 0.36, 0.07, 0.42, 0.58, 0.86, 0);
  box(torso, NAVY_D, 0.98, 0.12, 0.52, 0, 0.82, 0);                  // collar band
  const mkArm = (side: number) => {
    const sh = new THREE.Group(); sh.position.set(0.6 * side, 1.52, 0); root.add(sh);
    box(sh, NAVY, 0.3, 0.48, 0.34, 0, -0.22, 0);
    box(sh, WHITE, 0.32, 0.13, 0.36, 0, -0.5, 0, { shadow: false }); // cuff
    box(sh, SKIN, 0.28, 0.3, 0.32, 0, -0.68, 0);                     // hand
    return sh;
  };
  const armL = mkArm(-1), armR = mkArm(1);
  const headG = new THREE.Group(); headG.position.y = 1.6; root.add(headG);
  const face = headWithFace(kaptenFaceTexture(), SKIN);
  face.scale.set(0.94, 0.94, 0.94); face.position.y = 0.47; headG.add(face);
  // captain's peaked cap: white crown, navy band, dark brim, gold badge
  box(headG, WHITE, 1.04, 0.34, 1.04, 0, 1.08, 0);
  box(headG, WHITE, 0.88, 0.13, 0.88, 0, 1.3, 0);
  box(headG, NAVY_D, 1.06, 0.19, 1.06, 0, 0.88, 0);
  box(headG, "#16283f", 0.98, 0.07, 0.56, 0, 0.85, 0.66);            // brim
  box(headG, GOLD, 0.2, 0.2, 0.05, 0, 0.88, 0.54, { shadow: false }); // badge
  box(headG, "#232022", 0.14, 0.3, 0.62, -0.45, 0.64, -0.08);        // hair sides
  box(headG, "#232022", 0.14, 0.3, 0.62, 0.45, 0.64, -0.08);
  box(headG, "#232022", 0.94, 0.32, 0.14, 0, 0.64, -0.44);            // hair back
  root.scale.setScalar(1.06);
  root.traverse((o) => { o.frustumCulled = false; });
  return { g: root, head: headG, armL, armR, legL, legR, torso };
}

function buildCitizen(scene: THREE.Scene, skin: string, shirt: string, pants: string, hair: string, scale: number): CharRefs {
  const root = new THREE.Group(); scene.add(root);
  const mkLeg = (side: number) => {
    const hip = new THREE.Group(); hip.position.set(0.2 * side, 0.72, 0); root.add(hip);
    box(hip, pants, 0.32, 0.58, 0.36, 0, -0.29, 0);
    box(hip, "#33302c", 0.36, 0.14, 0.52, 0, -0.63, 0.06);
    return hip;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);
  const torso = new THREE.Group(); torso.position.y = 0.72; root.add(torso);
  box(torso, shirt, 0.88, 0.78, 0.48, 0, 0.39, 0);
  const mkArm = (side: number) => {
    const sh = new THREE.Group(); sh.position.set(0.55 * side, 1.42, 0); root.add(sh);
    box(sh, shirt, 0.27, 0.44, 0.31, 0, -0.2, 0);
    box(sh, skin, 0.25, 0.3, 0.29, 0, -0.58, 0);
    return sh;
  };
  const armL = mkArm(-1), armR = mkArm(1);
  const headG = new THREE.Group(); headG.position.y = 1.5; root.add(headG);
  const face = headWithFace(citizenFaceTexture(skin), skin);
  face.scale.set(0.88, 0.88, 0.88); face.position.y = 0.44; headG.add(face);
  box(headG, hair, 0.92, 0.26, 0.92, 0, 0.94, 0);
  box(headG, hair, 0.92, 0.34, 0.2, 0, 0.72, -0.38);
  root.scale.setScalar(scale);
  root.traverse((o) => { o.frustumCulled = false; });
  return { g: root, head: headG, armL, armR, legL, legR, torso };
}

function buildCat(scene: THREE.Scene) {
  const g = new THREE.Group(); scene.add(g);
  const OR = "#f59b23", OR_D = "#dd8413", WH = "#fff6ea", PK = "#f2a0b5";
  box(g, OR, 0.68, 0.52, 0.8, 0, 0.27, -0.05);                        // haunches
  box(g, OR_D, 0.7, 0.12, 0.5, 0, 0.5, -0.18, { shadow: false });    // back stripe
  box(g, WH, 0.56, 0.6, 0.34, 0, 0.42, 0.3);                         // chest
  box(g, OR, 0.14, 0.52, 0.14, -0.17, 0.26, 0.4);                    // front leg L
  box(g, WH, 0.15, 0.1, 0.24, -0.17, 0.05, 0.46, { shadow: false }); // paw L foot
  const pawR = new THREE.Group(); pawR.position.set(0.17, 0.5, 0.4); g.add(pawR);
  box(pawR, OR, 0.14, 0.5, 0.14, 0, -0.25, 0);                       // front leg R (pivot)
  box(pawR, WH, 0.15, 0.1, 0.24, 0, -0.5, 0.06, { shadow: false });  // paw R foot
  const head = new THREE.Group(); head.position.set(0, 0.92, 0.3); g.add(head);
  box(head, OR, 0.56, 0.48, 0.52, 0, 0.1, 0);
  box(head, WH, 0.36, 0.22, 0.1, 0, -0.04, 0.27, { shadow: false }); // muzzle
  box(head, PK, 0.12, 0.08, 0.05, 0, 0.05, 0.32, { shadow: false }); // nose
  box(head, "#1d1a17", 0.07, 0.1, 0.04, -0.14, 0.18, 0.27, { shadow: false }); // eyes
  box(head, "#1d1a17", 0.07, 0.1, 0.04, 0.14, 0.18, 0.27, { shadow: false });
  const earL = box(head, OR, 0.17, 0.28, 0.09, -0.18, 0.44, 0); earL.rotation.z = 0.28;
  const earR = box(head, OR, 0.17, 0.28, 0.09, 0.18, 0.44, 0); earR.rotation.z = -0.28;
  box(head, PK, 0.08, 0.14, 0.04, -0.19, 0.45, 0.03, { shadow: false });
  box(head, PK, 0.08, 0.14, 0.04, 0.19, 0.45, 0.03, { shadow: false });
  const tail = new THREE.Group(); tail.position.set(0.2, 0.16, -0.45); g.add(tail);
  box(tail, OR, 0.13, 0.13, 0.55, 0, 0, -0.2);
  const t2 = box(tail, OR, 0.13, 0.5, 0.13, 0.05, 0.28, -0.45); t2.rotation.x = 0.35;
  const t3 = box(tail, OR_D, 0.12, 0.42, 0.12, 0.12, 0.62, -0.52); t3.rotation.x = 0.7;
  g.traverse((o) => { o.frustumCulled = false; });
  return { g, head, pawR, tail };
}

// ------------------------------------------------------------- shadow puppet
const shadowMat = new THREE.MeshBasicMaterial({ color: "#1f242e", transparent: true, opacity: 0.62, depthWrite: false });
function sbox(parent: THREE.Object3D, sx: number, sy: number, sz: number, x: number, y: number, z: number) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), shadowMat);
  m.scale.set(sx, sy, sz); m.position.set(x, y, z);
  m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false;
  parent.add(m); return m;
}
function buildShadow(scene: THREE.Scene) {
  const g = new THREE.Group(); g.position.set(3.2, 0, WALL_Z); scene.add(g);
  // sitting monster-cat silhouette: haunch, back, chest, paw column, tail curl
  sbox(g, 3.6, 2.4, 0.1, 0, 1.2, 0);
  sbox(g, 3.0, 2.2, 0.1, -0.2, 3.2, 0);
  sbox(g, 2.4, 1.8, 0.1, 0.3, 4.6, 0);
  sbox(g, 0.8, 3.4, 0.1, 1.35, 1.7, 0);            // front leg column
  sbox(g, 1.3, 0.55, 0.1, 1.55, 0.28, 0);          // paw foot
  // claw spikes on the paw
  for (let i = 0; i < 3; i++) { const c = sbox(g, 0.34, 0.34, 0.1, 1.15 + i * 0.42, 0.62, 0); c.rotation.z = Math.PI / 4; }
  // curling tail on the left
  sbox(g, 2.2, 0.5, 0.1, -2.3, 0.3, 0);
  const tc = sbox(g, 0.55, 1.0, 0.1, -3.15, 0.75, 0); tc.rotation.z = 0.2;
  const tt = sbox(g, 0.5, 0.8, 0.1, -2.75, 1.35, 0); tt.rotation.z = 0.8;
  // head group with ears + jaw
  const headG = new THREE.Group(); headG.position.set(0.25, 5.9, 0); g.add(headG);
  sbox(headG, 3.1, 2.2, 0.1, 0, 0.5, 0);
  sbox(headG, 2.5, 0.9, 0.1, 0.15, -0.75, 0);      // muzzle block
  const eL = sbox(headG, 0.62, 1.9, 0.1, -1.25, 2.1, 0); eL.rotation.z = 0.16;   // pointed ears
  const eR = sbox(headG, 0.62, 1.9, 0.1, 1.35, 2.1, 0); eR.rotation.z = -0.16;
  // fangs (hidable for the payoff): upper fangs hang from the muzzle
  const fangs = new THREE.Group(); headG.add(fangs);
  for (let i = 0; i < 4; i++) { const f = sbox(fangs, 0.36, 0.62, 0.1, -0.75 + i * 0.55, -1.52, 0); f.rotation.z = Math.PI / 4; }
  // jaw: pivot at the back of the jaw so the front drops when it chomps
  const jaw = new THREE.Group(); jaw.position.set(-1.1, -1.32, 0); headG.add(jaw);
  sbox(jaw, 2.7, 0.6, 0.1, 1.3, -0.25, 0);
  for (let i = 0; i < 3; i++) { const f = sbox(jaw, 0.32, 0.55, 0.1, 0.75 + i * 0.6, 0.28, 0); f.rotation.z = Math.PI / 4; }
  g.traverse((o) => { o.frustumCulled = false; });
  return { g, headG, jaw, fangs };
}

// ------------------------------------------------------------------ the town
function buildGround(scene: THREE.Scene) {
  const g = new THREE.Group(); scene.add(g);
  box(g, "#b9c4cc", 110, 0.5, 80, 0, -0.26, -6, { shadow: false });            // base slab
  // plaza tiles in front of the tower
  const r = rng(31);
  const items: { p: [number, number, number]; s: [number, number, number]; c: string }[] = [];
  const tones = ["#e8e2d2", "#ded5c0", "#e2dac6", "#d8cfb6"];
  for (let ix = -19; ix <= 19; ix++) for (let iz = 0; iz < 7; iz++) {
    items.push({ p: [ix * 2, 0.03, -11.5 + iz * 2], s: [1.94, 0.07, 1.94], c: tones[Math.floor(r() * 4)] });
  }
  instanced(g, items);
  // road strip + dashes
  box(g, "#6f7680", 110, 0.09, 6.4, 0, 0.02, 4.6, { shadow: false });
  for (let ix = -13; ix <= 13; ix++) box(g, "#f2c14e", 1.5, 0.11, 0.34, ix * 4, 0.03, 4.6, { shadow: false });
  // sidewalks
  box(g, "#cdd5da", 110, 0.16, 1.6, 0, 0.04, 8.6, { shadow: false });
  box(g, "#cdd5da", 110, 0.16, 1.6, 0, 0.04, 0.6, { shadow: false });
}

function buildTower(scene: THREE.Scene) {
  const g = new THREE.Group(); g.position.set(-2, 0, -15.2); scene.add(g);
  // toy-block tower: stacked coloured slabs, front face flat at z=+2.2 local
  box(g, "#e8dcc4", 13, 3.2, 4.4, 0, 1.6, 0);
  box(g, "#d96f4e", 12.2, 0.7, 4.5, 0, 3.4, 0);
  box(g, "#f0e6cf", 12.4, 3.4, 4.4, 0, 5.4, 0);
  box(g, "#4e86c6", 11.6, 0.7, 4.5, 0, 7.4, 0);
  box(g, "#e8dcc4", 11.8, 3.2, 4.4, 0, 9.3, 0);
  box(g, "#d96f4e", 11.0, 0.7, 4.5, 0, 11.2, 0);
  box(g, "#f0e6cf", 8.6, 2.6, 4.2, 0, 12.8, 0);
  // clock near the top
  box(g, "#ffffff", 2.5, 2.5, 0.18, 0, 12.9, 2.28, { shadow: false });
  box(g, "#26221f", 0.16, 0.95, 0.1, 0, 13.25, 2.4, { shadow: false });
  const hand = box(g, "#26221f", 0.14, 0.8, 0.1, 0.3, 12.75, 2.4, { shadow: false }); hand.rotation.z = -0.7;
  // roof: stepped pyramid + flag
  box(g, "#8a5a34", 9.6, 0.6, 5.2, 0, 14.4, 0);
  box(g, "#96653c", 7.2, 0.6, 4.2, 0, 15.0, 0);
  box(g, "#8a5a34", 4.6, 0.6, 3.0, 0, 15.6, 0);
  box(g, "#6b4527", 0.14, 1.7, 0.14, 0, 16.7, 0, { shadow: false });
  box(g, "#c93a32", 1.15, 0.62, 0.06, 0.62, 17.2, 0, { shadow: false });
  // door + windows (kept off the shadow area: shadow plays at x 0..7 world)
  box(g, "#7a4b2d", 1.5, 2.6, 0.16, -4.6, 1.3, 2.24);
  box(g, "#ffe9a8", 1.0, 1.0, 0.14, -4.9, 5.6, 2.24, { shadow: false });
  box(g, "#ffe9a8", 1.0, 1.0, 0.14, 4.9, 9.4, 2.24, { shadow: false });
  box(g, "#ffe9a8", 1.0, 1.0, 0.14, -5.2, 9.4, 2.24, { shadow: false });
}

function toyHouse(parent: THREE.Object3D, x: number, z: number, ry: number, wall: string, roof: string) {
  const h = new THREE.Group(); h.position.set(x, 0, z); h.rotation.y = ry; parent.add(h);
  box(h, wall, 5.2, 3.1, 4.2, 0, 1.55, 0);
  box(h, "#7a4b2d", 1.15, 2.0, 0.2, 0, 1.0, 2.12);
  box(h, "#ffe9a8", 0.95, 0.95, 0.15, -1.5, 1.85, 2.12, { shadow: false });
  box(h, "#ffe9a8", 0.95, 0.95, 0.15, 1.5, 1.85, 2.12, { shadow: false });
  box(h, roof, 6.2, 0.6, 5.2, 0, 3.4, 0);
  box(h, roof, 4.6, 0.6, 3.9, 0, 3.95, 0);
  box(h, roof, 2.9, 0.6, 2.5, 0, 4.5, 0);
  return h;
}

function toyTree(parent: THREE.Object3D, x: number, z: number, s: number) {
  const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(s); parent.add(t);
  box(t, "#7a4b2d", 0.55, 2.2, 0.55, 0, 1.1, 0);
  box(t, "#4f9e3d", 2.6, 1.6, 2.6, 0, 3.0, 0);
  box(t, "#5cab47", 1.9, 1.3, 1.9, 0.4, 4.1, 0.2);
  box(t, "#478f36", 1.3, 1.1, 1.3, -0.5, 4.9, -0.2);
  box(t, "#f08a2e", 0.4, 0.4, 0.4, 0.9, 2.8, 1.2, { shadow: false });
  box(t, "#f08a2e", 0.4, 0.4, 0.4, -1.0, 3.6, 0.9, { shadow: false });
}

function buildStreetLampAt(parent: THREE.Object3D, pos: [number, number, number], intensity: number) {
  const g = new THREE.Group(); g.position.set(...pos); parent.add(g);
  box(g, "#2f3a33", 0.9, 0.3, 0.9, 0, 0.15, 0);
  box(g, "#2f3a33", 0.24, 5.0, 0.24, 0, 2.7, 0);
  box(g, "#2f3a33", 0.5, 0.35, 0.5, 0, 5.35, 0);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62),
    new THREE.MeshBasicMaterial({ color: "#ffd76a" }));
  glow.position.set(0, 5.0, 0); g.add(glow);
  box(g, "#2f3a33", 0.7, 0.14, 0.7, 0, 5.62, 0, { shadow: false });
  const light = new THREE.PointLight(0xffc37a, intensity, 46, 1.7);
  light.position.set(0, 5.0, 0); g.add(light);
  g.traverse((o) => { o.frustumCulled = false; });
  return { light, glow };
}

function buildStreetLamp(scene: THREE.Scene) {
  return buildStreetLampAt(scene, LAMP_POS, 30);
}

function buildHandLamp(scene: THREE.Scene) {
  const g = new THREE.Group(); scene.add(g);
  const METAL = "#7a6248";
  box(g, METAL, 0.16, 0.85, 0.16, 0, -0.42, 0);                        // grip
  box(g, METAL, 1.15, 0.18, 1.15, 0, 0.09, 0);                         // frame base
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    box(g, METAL, 0.11, 0.95, 0.11, sx * 0.52, 0.62, sz * 0.52);
  box(g, METAL, 1.2, 0.16, 1.2, 0, 1.16, 0);                           // frame top
  box(g, METAL, 0.5, 0.22, 0.5, 0, 1.32, 0);
  const glassMat = new THREE.MeshLambertMaterial({
    color: "#ffca55", transparent: true, opacity: 0.3,
    emissive: new THREE.Color("#ff9d2e"), emissiveIntensity: 0.7, depthWrite: false,
  });
  box(g, "#ffca55", 1.02, 0.9, 1.02, 0, 0.62, 0, { shadow: false, material: glassMat });
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44),
    new THREE.MeshBasicMaterial({ color: "#ffd76a" }));
  glow.position.set(0, 0.62, 0); g.add(glow);
  const light = new THREE.PointLight(0xffb84d, 0, 34, 1.6);
  light.position.set(0, 0.62, 0); g.add(light);
  g.traverse((o) => { o.frustumCulled = false; });
  return { g, light, glow };
}

function buildPedestal(scene: THREE.Scene) {
  const g = new THREE.Group(); g.position.set(...PEDESTAL_POS); scene.add(g);
  box(g, "#4e86c6", 1.5, 0.5, 1.5, 0, 0.25, 0);
  box(g, "#f2c14e", 1.3, 0.16, 1.3, 0, 0.58, 0, { shadow: false });
  box(g, "#4e86c6", 1.15, 0.32, 1.15, 0, 0.82, 0);
  return g;
}

function buildSky(scene: THREE.Scene) {
  const geo = new THREE.SphereGeometry(900, 24, 16);
  const mtl = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color("#3f7fd0") }, mid: { value: new THREE.Color("#8fbbe8") }, bot: { value: new THREE.Color("#d8ecfa") } },
    vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = h > 0.18 ? mix(mid, top, smoothstep(0.18, 0.75, h)) : mix(bot, mid, smoothstep(-0.08, 0.18, h)); gl_FragColor = vec4(c, 1.0); }",
  });
  const sky = new THREE.Mesh(geo, mtl); scene.add(sky);
  scene.fog = new THREE.Fog(new THREE.Color("#d7e7f5"), 90, 420);
  const sun = new THREE.Mesh(new THREE.BoxGeometry(16, 16, 2), new THREE.MeshBasicMaterial({ color: "#ffd94d", fog: false }));
  sun.position.set(150, 200, -330); scene.add(sun);
  return sun;
}

// ------------------------------------------------- landscape backdrop (16:9)
// Distant hills + a far row of simple houses + drifting voxel clouds, so wide
// landscape shots always end on scenery, never on empty sky/void.
function buildBackdrop(scene: THREE.Scene) {
  const g = new THREE.Group(); scene.add(g);
  // rolling cube hills FAR behind the town, low and hazy: only their tops
  // peek above the far rooftops (tall slabs at z~-55 read as a green wall)
  box(g, "#8fbf74", 52, 11, 18, -58, 0.5, -88, { shadow: false });
  box(g, "#a3cc8a", 42, 8, 16, -32, -0.5, -80, { shadow: false });
  box(g, "#8fbf74", 56, 12, 20, 54, 1.0, -90, { shadow: false });
  box(g, "#a3cc8a", 38, 7, 15, 24, -1.0, -78, { shadow: false });
  box(g, "#9fc781", 34, 6, 14, -2, -1.5, -82, { shadow: false });
  // far houses (simple silhouettes with lit windows), a second street row
  const farHouse = (x: number, z: number, s: number, wall: string, roof: string) => {
    const h = new THREE.Group(); h.position.set(x, 0, z); h.scale.setScalar(s); g.add(h);
    box(h, wall, 5.2, 3.1, 4.2, 0, 1.55, 0, { shadow: false });
    box(h, "#ffe9a8", 0.95, 0.95, 0.15, -1.4, 1.85, 2.12, { shadow: false });
    box(h, "#ffe9a8", 0.95, 0.95, 0.15, 1.4, 1.85, 2.12, { shadow: false });
    box(h, roof, 6.2, 0.6, 5.2, 0, 3.4, 0, { shadow: false });
    box(h, roof, 4.4, 0.6, 3.8, 0, 3.95, 0, { shadow: false });
  };
  farHouse(-34, -34, 1.5, "#e8d8c8", "#8a5a34");
  farHouse(-20, -36, 1.7, "#d8e2ec", "#4e6b8a");
  farHouse(14, -35, 1.6, "#ecdfc8", "#a8642e");
  farHouse(30, -33, 1.45, "#dfe8d8", "#5a7d46");
  farHouse(44, -36, 1.7, "#e8d8e2", "#7d4a6b");
  // voxel clouds (drifted slowly by story.ts via refs.clouds)
  const clouds = new THREE.Group(); scene.add(clouds);
  const cloud = (x: number, y: number, z: number, s: number) => {
    const c = new THREE.Group(); c.position.set(x, y, z); c.scale.setScalar(s); clouds.add(c);
    box(c, "#ffffff", 7.5, 1.7, 3.4, 0, 0, 0, { shadow: false });
    box(c, "#ffffff", 4.6, 1.6, 3.0, -1.2, 1.2, 0, { shadow: false });
    box(c, "#f4f9ff", 4.0, 1.4, 2.8, 2.2, 1.0, 0.2, { shadow: false });
  };
  cloud(-38, 30, -85, 1.5);
  cloud(-6, 35, -105, 1.9);
  cloud(30, 28, -80, 1.3);
  cloud(58, 33, -100, 1.7);
  clouds.traverse((o) => { o.frustumCulled = false; });
  return clouds;
}

export function buildWorld(scene: THREE.Scene): WorldRefs {
  buildGround(scene);
  buildTower(scene);
  const clouds = buildBackdrop(scene);
  const town = new THREE.Group(); scene.add(town);
  toyHouse(town, -13.5, -5, 0.55, "#f2d8e0", "#b03a5e");
  toyHouse(town, 13.8, -6, -0.55, "#d8ecf2", "#2e6da4");
  toyHouse(town, -15.5, 5, 1.25, "#fdf0d0", "#c96a2e");
  toyHouse(town, 16, 4, -1.2, "#e2f0d8", "#4f7d3a");
  // landscape wings: more houses so 16:9 frames stay filled out to ±30
  toyHouse(town, -24.5, -7, 0.5, "#e6f0da", "#527a3c");
  toyHouse(town, 25, -8, -0.5, "#f6e3c8", "#b06a28");
  toyHouse(town, -27.5, 3.5, 1.15, "#dfe9f5", "#3c6396");
  toyHouse(town, 28, 2.5, -1.15, "#f2d8e0", "#96425e");
  // back row behind the plaza (bigger, flanking the tower)
  const backL = new THREE.Group(); backL.position.set(-19, 0, -25); backL.rotation.y = 0.18; backL.scale.setScalar(1.35); town.add(backL);
  toyHouse(backL, 0, 0, 0, "#efe3cc", "#96653c");
  const backR = new THREE.Group(); backR.position.set(19.5, 0, -26); backR.rotation.y = -0.15; backR.scale.setScalar(1.45); town.add(backR);
  toyHouse(backR, 0, 0, 0, "#dde8f0", "#466b8a");
  toyTree(town, -9.5, -8.5, 1.0);   // kept off Kapten's plaza run lane (z~-3.5)
  toyTree(town, 10.8, -1.5, 1.15);
  toyTree(town, 12.5, 9.5, 0.9);
  toyTree(town, -12, 10.5, 1.05);
  toyTree(town, -20.5, -2, 1.2);
  toyTree(town, 20, -3.5, 1.1);
  toyTree(town, -23.5, 9.5, 0.95);
  toyTree(town, 23.5, 10.5, 1.0);
  toyTree(town, 7.5, 12.5, 0.85);
  toyTree(town, -6.5, 13.5, 0.9);
  // second street lamp on the west wing (decorative twin of the hero lamp)
  buildStreetLampAt(town, [-14, 0, -6], 12);
  const sunMesh = buildSky(scene);
  buildPedestal(scene);
  const street = buildStreetLamp(scene);
  const hand = buildHandLamp(scene);
  const shadowB = buildShadow(scene);
  const kapten = buildKapten(scene);
  const catB = buildCat(scene);
  const wargaSpecs: [string, string, string, string, number][] = [
    ["#f3c39c", "#e2543e", "#3c5a8a", "#3a2c1c", 0.95],
    ["#c68863", "#3e9e6b", "#6b4a8a", "#191512", 1.0],
    ["#f3c39c", "#e8a13a", "#4a6b46", "#6e4a2f", 0.9],
    ["#8a5a3b", "#4e86c6", "#8a3a3a", "#232022", 0.97],
    ["#f3c39c", "#7a4fa3", "#33526e", "#4a2f1c", 0.92],
    ["#c68863", "#d97b2f", "#54683a", "#232022", 1.03],
  ];
  const warga = wargaSpecs.map(([sk, sh, pa, ha, sc]) => buildCitizen(scene, sk, sh, pa, ha, sc));
  return {
    kapten, warga,
    cat: catB.g, catHead: catB.head, catPawR: catB.pawR, catTail: catB.tail,
    shadow: shadowB.g, shadowJaw: shadowB.jaw, shadowFangs: shadowB.fangs,
    lampLight: street.light, lampGlow: street.glow,
    handLamp: hand.g, handLampLight: hand.light, handLampGlow: hand.glow,
    sunMesh,
    clouds,
  };
}
