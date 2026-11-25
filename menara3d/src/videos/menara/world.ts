import * as THREE from "three";
import { box, mat, rng, faceTexture, tiredFaceTexture, headWithFace } from "./vox";

// ============================================================================
// Dunia untuk LONG lanskap "Lomba Menara Tertinggi" (Dunia Bima 3D).
// Tata letak: lapangan lomba di tengah (z -10..12), sungai membentang
// sepanjang sumbu x di z=-20 (lebar 8), seberang sungai z=-28 ke bawah.
// Bima dibangun PERSIS seperti world.ts episode pertama (desain terkunci).
// ============================================================================

export const RIVER_Z = -20;
export const BRIDGE_X = -10;

export interface MenaraRefs {
  bima: THREE.Group; bimaHead: THREE.Group; headNormal: THREE.Object3D; headTired: THREE.Object3D;
  armL: THREE.Group; armR: THREE.Group; legL: THREE.Group; legR: THREE.Group; torso: THREE.Group;
  tetangga: THREE.Group; tetanggaHead: THREE.Group; tArmL: THREE.Group; tArmR: THREE.Group; tLegL: THREE.Group; tLegR: THREE.Group;
  tetangga2: THREE.Group; tetangga2Head: THREE.Group; t2ArmL: THREE.Group; t2ArmR: THREE.Group;
  monster: THREE.Group; monsterHead: THREE.Group; mArmL: THREE.Group; mArmR: THREE.Group; mLegL: THREE.Group; mLegR: THREE.Group;
  kelinci: THREE.Group; kelinciHead: THREE.Group;
  ayam: THREE.Group; ayamHead: THREE.Group;
  bebek: THREE.Group; bebekHead: THREE.Group;
  sapi: THREE.Group; sapiHead: THREE.Group; sapiAnak: THREE.Group;
  towerBima: THREE.Group; towerBimaLayers: THREE.Group[]; towerFlag: THREE.Group;
  towerTetangga: THREE.Group; towerTetanggaLayers: THREE.Group[];
  towerMonster: THREE.Group; towerMonsterLayers: THREE.Group[];
  towerKelinci: THREE.Group;
  rubbleBima: THREE.Group; rubbleTetangga: THREE.Group;
  ladderSmall: THREE.Group;
  bridge: THREE.Group; bridgeDeck: THREE.Object3D[]; bridgeRails: THREE.Group; bridgeFlag: THREE.Group;
  water: THREE.Mesh; storm: THREE.Group; stars: THREE.Group;
  sunMesh: THREE.Mesh; skyMat: THREE.ShaderMaterial;
  applyEnv?: (dark: number, sunset: number) => void;
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

function buildGround(scene: THREE.Scene) {
  const g = new THREE.Group(); scene.add(g);
  const r = rng(42);
  const items: { p: [number, number, number]; s: [number, number, number]; c: string }[] = [];
  const greens = ["#69b84a", "#5da843", "#76c253", "#63ae47"];
  for (let ix = -34; ix <= 34; ix++) for (let iz = -34; iz <= 30; iz++) {
    const x = ix * 2, z = iz * 2;
    if (z < -15.5 && z > -24.5) continue; // river channel
    const c = greens[Math.floor(r() * greens.length)];
    items.push({ p: [x, -1, z], s: [2.02, 2, 2.02], c });
    if (r() < 0.04 && (z > -14 || z < -26)) items.push({ p: [x, 0.15, z], s: [0.3, 0.3, 0.3], c: ["#e86a8a", "#f2c14e", "#ffffff"][Math.floor(r() * 3)] });
  }
  instanced(g, items);
  // dirt competition field
  box(g, "#b08d5a", 46, 0.18, 24, 0, 0.06, 0, { shadow: false });
  box(g, "#a3804f", 46, 0.1, 1.2, 0, 0.1, -13.6, { shadow: false });
  // river banks (dirt lips)
  box(g, "#9a6b46", 140, 0.5, 1.6, 0, 0.1, -15.2, { shadow: false });
  box(g, "#9a6b46", 140, 0.5, 1.6, 0, 0.1, -24.8, { shadow: false });
  // river bed
  box(g, "#7a5c38", 140, 0.3, 9.4, 0, -1.15, RIVER_Z, { shadow: false });
}

function house(parent: THREE.Object3D, x: number, y: number, z: number, ry: number, wall: string, s = 1) {
  const h = new THREE.Group(); h.position.set(x, y, z); h.rotation.y = ry; h.scale.setScalar(s); parent.add(h);
  box(h, wall, 4.6, 2.8, 3.8, 0, 1.4, 0);
  box(h, "#7a4b2d", 1.1, 1.9, 0.2, 0, 0.95, 1.95);
  box(h, "#3d2b1f", 0.18, 0.18, 0.18, 0.35, 0.95, 2.06);
  box(h, "#ffe9a8", 0.9, 0.9, 0.15, -1.3, 1.7, 1.93, { shadow: false });
  box(h, "#ffe9a8", 0.9, 0.9, 0.15, 1.3, 1.7, 1.93, { shadow: false });
  box(h, "#8a5a34", 5.6, 0.55, 4.8, 0, 3.05, 0);
  box(h, "#96653c", 4.4, 0.55, 3.7, 0, 3.55, 0);
  box(h, "#8a5a34", 3.1, 0.55, 2.5, 0, 4.05, 0);
  box(h, "#96653c", 1.7, 0.55, 1.3, 0, 4.55, 0);
  return h;
}

function buildVillage(scene: THREE.Scene) {
  const g = new THREE.Group(); scene.add(g);
  // far bank houses (across the river), facing +z toward the field
  house(g, -22, 0, -31, 0.15, "#e8dcc4");
  house(g, -4, 0, -32, -0.1, "#dfc9a8");
  house(g, 15, 0, -31, 0.2, "#e5d3b3");
  // near-side village behind the spectator area
  house(g, -30, 0, 20, 2.6, "#e8dcc4");
  house(g, 30, 0, 21, -2.7, "#dfc9a8");
  house(g, -38, 0, 2, 1.4, "#e5d3b3");
  house(g, 38, 0, -2, -1.5, "#e8dcc4");
  // balai kampung (hall) — bigger house at right side for night scenes
  house(g, 27, 0, 13, -0.7, "#e8dcc4", 1.5);
  // fences along the field sides
  const r = rng(7);
  for (let i = 0; i < 22; i++) {
    const x = -24 + i * 2.3;
    box(g, "#8a5a34", 0.18, 1.0, 0.18, x, 0.5, 13.5, { shadow: false });
    void r;
  }
  box(g, "#e3c568", 1.4, 1.0, 1.4, 14, 0.5, 12); box(g, "#e3c568", 1.4, 1.0, 1.4, 14.2, 1.5, 12.2);
  box(g, "#a9743f", 1.2, 1.2, 1.2, -15, 0.6, 12.5);
  // dinner table in front of the balai (celebration scenes)
  box(g, "#7a4b2d", 6.5, 0.25, 1.6, 22.5, 0.95, 9.5);
  box(g, "#7a4b2d", 0.25, 0.95, 0.25, 19.6, 0.48, 9.5); box(g, "#7a4b2d", 0.25, 0.95, 0.25, 25.4, 0.48, 9.5);
  for (let i = 0; i < 5; i++) box(g, "#f2ede2", 0.62, 0.18, 0.62, 20.2 + i * 1.15, 1.16, 9.5, { shadow: false });
}

function buildTree(scene: THREE.Scene) {
  const g = new THREE.Group(); g.position.set(-27, 0, -9); scene.add(g);
  const r = rng(99);
  for (let i = 0; i < 9; i++) {
    const w = 2.6 - i * 0.16;
    box(g, i % 2 ? "#7a4b2d" : "#845231", w, 2.1, w, (r() - 0.5) * 0.3, 1 + i * 2, (r() - 0.5) * 0.3);
  }
  box(g, "#7a4b2d", 3.4, 1.6, 1.4, -2.2, 15.5, 0).rotation.z = 0.5;
  box(g, "#7a4b2d", 1.4, 1.6, 3.2, 0.6, 15.8, -1.8).rotation.x = -0.45;
  const leaves: { p: [number, number, number]; s: [number, number, number]; c: string }[] = [];
  const fruits: { p: [number, number, number]; s: [number, number, number]; c: string }[] = [];
  const greens = ["#4f9e3d", "#5cab47", "#478f36", "#66b854"];
  for (let i = 0; i < 210; i++) {
    const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1), rad = 3.2 + r() * 3.4;
    const x = Math.sin(ph) * Math.cos(th) * rad, y = Math.cos(ph) * rad * 0.72, z = Math.sin(ph) * Math.sin(th) * rad;
    const s = 1.1 + r() * 1.3;
    leaves.push({ p: [x, 21 + y, z], s: [s, s, s], c: greens[Math.floor(r() * 4)] });
    if (r() < 0.16) fruits.push({ p: [x * 1.06, 20.4 + y * 1.02, z * 1.06], s: [0.55, 0.55, 0.55], c: "#f08a2e" });
  }
  instanced(g, leaves); instanced(g, fruits);
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
  const sun = new THREE.Mesh(new THREE.BoxGeometry(16, 16, 2), new THREE.MeshBasicMaterial({ color: "#ffd94d", fog: false }));
  sun.position.set(-150, 190, -320); scene.add(sun);
  return { sun, mtl };
}

const cloudMat = new THREE.MeshLambertMaterial({ color: "#ffffff", emissive: new THREE.Color("#aebfd2"), emissiveIntensity: 0.38 });
function cloudCluster(parent: THREE.Object3D, x: number, y: number, z: number, scale: number, seed: number, material?: THREE.Material, color = "#ffffff") {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const r = rng(seed);
  const n = 12 + Math.floor(r() * 6);
  for (let i = 0; i < n; i++) {
    const bx = (r() - 0.5) * 7 * scale, by = (r() - 0.5) * 1.6 * scale, bz = (r() - 0.5) * 4.4 * scale;
    const s = (1.1 + r() * 1.9) * scale;
    box(g, color, s, s * 0.78, s * 0.85, bx, by, bz, { shadow: false, material });
  }
  return g;
}

function buildClouds(scene: THREE.Scene) {
  const g = new THREE.Group(); scene.add(g);
  const spots: [number, number, number, number][] = [
    [-40, 36, -34, 1.7], [44, 46, -22, 2.0], [-32, 60, 16, 1.5], [38, 30, 24, 1.6],
    [60, 62, 32, 1.8], [-60, 48, 36, 1.9], [0, 55, -48, 1.8], [-14, 42, 40, 1.4],
  ];
  spots.forEach(([x, y, z, s], i) => cloudCluster(g, x, y, z, s, 500 + i * 17, cloudMat));
}

function buildStorm(scene: THREE.Scene) {
  const g = new THREE.Group(); scene.add(g);
  const darkMat = new THREE.MeshLambertMaterial({ color: "#4a4f58", emissive: new THREE.Color("#23262c"), emissiveIntensity: 0.5 });
  const spots: [number, number, number, number][] = [
    [-30, 40, -20, 3.2], [0, 44, -26, 3.8], [30, 41, -18, 3.2], [-55, 46, 0, 3.0],
    [55, 47, 2, 3.0], [0, 48, 8, 3.4], [-20, 43, 20, 2.8], [22, 44, 22, 2.8],
  ];
  spots.forEach(([x, y, z, s], i) => cloudCluster(g, x, y, z, s, 900 + i * 23, darkMat, "#4a4f58"));
  g.position.set(160, 6, 0); // parked off-scene; story slides it in
  return g;
}

function buildStars(scene: THREE.Scene) {
  const g = new THREE.Group(); scene.add(g);
  const r = rng(31337);
  const items: { p: [number, number, number]; s: [number, number, number]; c: string }[] = [];
  for (let i = 0; i < 160; i++) {
    const th = r() * Math.PI * 2, ph = Math.acos(1 - r() * 0.85);
    const rad = 700;
    items.push({
      p: [Math.sin(ph) * Math.cos(th) * rad, Math.cos(ph) * rad * 0.6 + 40, Math.sin(ph) * Math.sin(th) * rad],
      s: [3.2, 3.2, 3.2], c: "#ffffff",
    });
  }
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: "#ffffff", fog: false }), items.length);
  const m4 = new THREE.Matrix4();
  items.forEach((it, i) => { m4.makeScale(...it.s); m4.setPosition(...it.p); im.setMatrixAt(i, m4); });
  g.add(im);
  g.visible = false;
  return g;
}

// ---------------------------------------------------------------- characters
// Bima: PERSIS buildBima episode pertama (desain terkunci — jangan diubah).
function buildBima(scene: THREE.Scene) {
  const root = new THREE.Group(); scene.add(root);
  const SKIN = "#f3c39c", TEAL = "#35b5ac", TEAL_D = "#2da39b", BLUE = "#2e4d9e", HAIR = "#6e4a2f";
  const mkLeg = (side: number) => {
    const hip = new THREE.Group(); hip.position.set(0.21 * side, 0.74, 0); root.add(hip);
    box(hip, BLUE, 0.34, 0.62, 0.38, 0, -0.31, 0);
    box(hip, "#26221f", 0.38, 0.16, 0.55, 0, -0.66, 0.07);
    return hip;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);
  const torso = new THREE.Group(); torso.position.y = 0.74; root.add(torso);
  box(torso, TEAL, 0.92, 0.82, 0.5, 0, 0.41, 0);
  box(torso, TEAL_D, 0.92, 0.18, 0.52, 0, 0.06, 0);
  box(torso, SKIN, 0.3, 0.16, 0.06, 0, 0.78, 0.24, { shadow: false });
  const mkArm = (side: number) => {
    const sh = new THREE.Group(); sh.position.set(0.58 * side, 1.48, 0); root.add(sh);
    box(sh, TEAL, 0.3, 0.5, 0.34, 0, -0.22, 0);
    box(sh, SKIN, 0.28, 0.34, 0.32, 0, -0.62, 0);
    return sh;
  };
  const armL = mkArm(-1), armR = mkArm(1);
  const headG = new THREE.Group(); headG.position.y = 1.56; root.add(headG);
  const faceN = headWithFace(faceTexture(), SKIN); faceN.scale.set(0.92, 0.92, 0.92); faceN.position.y = 0.46; headG.add(faceN);
  const faceT = headWithFace(tiredFaceTexture(), SKIN); faceT.scale.set(0.92, 0.92, 0.92); faceT.position.y = 0.46; faceT.visible = false; headG.add(faceT);
  box(headG, HAIR, 0.98, 0.3, 0.98, 0, 1.0, 0);
  box(headG, HAIR, 0.98, 0.34, 0.3, 0, 0.82, 0.36);
  box(headG, HAIR, 0.7, 0.22, 0.7, -0.08, 1.2, -0.05);
  box(headG, HAIR, 0.98, 0.5, 0.24, 0, 0.74, -0.4);
  box(headG, HAIR, 0.2, 0.5, 0.9, -0.42, 0.68, 0);
  box(headG, HAIR, 0.2, 0.5, 0.9, 0.42, 0.68, 0);
  box(headG, SKIN, 0.16, 0.3, 0.16, -0.53, 0.42, 0, { shadow: false });
  box(headG, SKIN, 0.16, 0.3, 0.16, 0.53, 0.42, 0, { shadow: false });
  root.traverse((o) => { o.frustumCulled = false; });
  return { root, headG, faceN, faceT, armL, armR, legL, legR, torso };
}

// Tetangga: manusia voxel lain (palet berbeda dari Bima).
function buildHuman(scene: THREE.Scene, shirt: string, shirtD: string, pants: string, hair: string) {
  const root = new THREE.Group(); scene.add(root);
  const SKIN = "#e8b088";
  const mkLeg = (side: number) => {
    const hip = new THREE.Group(); hip.position.set(0.21 * side, 0.74, 0); root.add(hip);
    box(hip, pants, 0.34, 0.62, 0.38, 0, -0.31, 0);
    box(hip, "#26221f", 0.38, 0.16, 0.55, 0, -0.66, 0.07);
    return hip;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);
  const torso = new THREE.Group(); torso.position.y = 0.74; root.add(torso);
  box(torso, shirt, 0.92, 0.82, 0.5, 0, 0.41, 0);
  box(torso, shirtD, 0.92, 0.18, 0.52, 0, 0.06, 0);
  const mkArm = (side: number) => {
    const sh = new THREE.Group(); sh.position.set(0.58 * side, 1.48, 0); root.add(sh);
    box(sh, shirt, 0.3, 0.5, 0.34, 0, -0.22, 0);
    box(sh, SKIN, 0.28, 0.34, 0.32, 0, -0.62, 0);
    return sh;
  };
  const armL = mkArm(-1), armR = mkArm(1);
  const headG = new THREE.Group(); headG.position.y = 1.56; root.add(headG);
  const faceN = headWithFace(faceTexture(), SKIN); faceN.scale.set(0.92, 0.92, 0.92); faceN.position.y = 0.46; headG.add(faceN);
  box(headG, hair, 0.98, 0.3, 0.98, 0, 1.0, 0);
  box(headG, hair, 0.98, 0.34, 0.3, 0, 0.82, 0.36);
  box(headG, hair, 0.98, 0.5, 0.24, 0, 0.74, -0.4);
  box(headG, hair, 0.2, 0.5, 0.9, -0.42, 0.68, 0);
  box(headG, hair, 0.2, 0.5, 0.9, 0.42, 0.68, 0);
  root.traverse((o) => { o.frustumCulled = false; });
  return { root, headG, armL, armR, legL, legR };
}

// Monster Ungu: besar, ungu, lengan tebal.
function buildMonster(scene: THREE.Scene) {
  const root = new THREE.Group(); scene.add(root);
  const P = "#8b5cc7", P_D = "#7448ab", BELLY = "#c9a8ec";
  const mkLeg = (side: number) => {
    const hip = new THREE.Group(); hip.position.set(0.45 * side, 0.9, 0); root.add(hip);
    box(hip, P_D, 0.55, 0.7, 0.6, 0, -0.35, 0);
    box(hip, "#3a2a4d", 0.62, 0.22, 0.85, 0, -0.8, 0.1);
    return hip;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);
  const torso = new THREE.Group(); torso.position.y = 0.9; root.add(torso);
  box(torso, P, 1.9, 1.5, 1.1, 0, 0.75, 0);
  box(torso, BELLY, 1.3, 1.0, 0.2, 0, 0.62, 0.58, { shadow: false });
  const mkArm = (side: number) => {
    const sh = new THREE.Group(); sh.position.set(1.12 * side, 2.2, 0); root.add(sh);
    box(sh, P, 0.5, 1.1, 0.55, 0, -0.5, 0);
    box(sh, P_D, 0.52, 0.45, 0.57, 0, -1.2, 0);
    return sh;
  };
  const armL = mkArm(-1), armR = mkArm(1);
  const headG = new THREE.Group(); headG.position.y = 2.42; root.add(headG);
  box(headG, P, 1.35, 1.05, 1.15, 0, 0.52, 0);
  box(headG, "#ffffff", 0.3, 0.34, 0.1, -0.32, 0.62, 0.6, { shadow: false });
  box(headG, "#ffffff", 0.3, 0.34, 0.1, 0.32, 0.62, 0.6, { shadow: false });
  box(headG, "#1d1a17", 0.15, 0.17, 0.06, -0.32, 0.6, 0.66, { shadow: false });
  box(headG, "#1d1a17", 0.15, 0.17, 0.06, 0.32, 0.6, 0.66, { shadow: false });
  box(headG, "#5e3a8a", 0.7, 0.16, 0.08, 0, 0.22, 0.6, { shadow: false }); // mouth
  box(headG, "#ffffff", 0.14, 0.2, 0.06, -0.2, 0.12, 0.62, { shadow: false }); // fang
  box(headG, "#ffffff", 0.14, 0.2, 0.06, 0.2, 0.12, 0.62, { shadow: false });
  box(headG, P_D, 0.3, 0.5, 0.3, -0.5, 1.25, 0).rotation.z = 0.35; // horns
  box(headG, P_D, 0.3, 0.5, 0.3, 0.5, 1.25, 0).rotation.z = -0.35;
  root.traverse((o) => { o.frustumCulled = false; });
  return { root, headG, armL, armR, legL, legR };
}

function buildBunny(scene: THREE.Scene) {
  const root = new THREE.Group(); scene.add(root);
  const W = "#f2f0ea", PINK = "#f2a7bb";
  box(root, W, 0.85, 0.7, 1.05, 0, 0.5, 0);
  box(root, W, 0.5, 0.3, 0.5, 0, 0.55, -0.65).rotation.x = 0.5; // tail base
  box(root, "#ffffff", 0.34, 0.34, 0.34, 0, 0.62, -0.78, { shadow: false }); // tail puff
  const head = new THREE.Group(); head.position.set(0, 0.95, 0.45); root.add(head);
  box(head, W, 0.72, 0.62, 0.66, 0, 0.25, 0);
  box(head, PINK, 0.16, 0.1, 0.06, 0, 0.16, 0.35, { shadow: false });
  box(head, "#1d1a17", 0.1, 0.13, 0.05, -0.18, 0.36, 0.34, { shadow: false });
  box(head, "#1d1a17", 0.1, 0.13, 0.05, 0.18, 0.36, 0.34, { shadow: false });
  box(head, W, 0.16, 0.75, 0.08, -0.18, 0.9, 0); box(head, PINK, 0.08, 0.5, 0.04, -0.18, 0.88, 0.03, { shadow: false });
  box(head, W, 0.16, 0.75, 0.08, 0.18, 0.9, 0); box(head, PINK, 0.08, 0.5, 0.04, 0.18, 0.88, 0.03, { shadow: false });
  box(root, W, 0.2, 0.3, 0.2, -0.25, 0.15, 0.3); box(root, W, 0.2, 0.3, 0.2, 0.25, 0.15, 0.3);
  box(root, W, 0.2, 0.3, 0.2, -0.25, 0.15, -0.35); box(root, W, 0.2, 0.3, 0.2, 0.25, 0.15, -0.35);
  root.traverse((o) => { o.frustumCulled = false; });
  return { root, head };
}

function buildChicken(scene: THREE.Scene) {
  const root = new THREE.Group(); scene.add(root);
  const W = "#fbfaf6", RED = "#d93a2b", OR = "#f59b23";
  box(root, W, 0.8, 0.75, 1.0, 0, 0.62, 0);
  box(root, W, 0.6, 0.5, 0.3, 0, 0.95, -0.6).rotation.x = -0.5; // tail
  const head = new THREE.Group(); head.position.set(0, 1.05, 0.4); root.add(head);
  box(head, W, 0.52, 0.52, 0.52, 0, 0.26, 0);
  box(head, RED, 0.2, 0.22, 0.3, 0, 0.62, 0, { shadow: false }); // comb
  box(head, OR, 0.24, 0.16, 0.34, 0, 0.2, 0.4, { shadow: false }); // beak
  box(head, "#1d1a17", 0.08, 0.1, 0.04, -0.2, 0.34, 0.27, { shadow: false });
  box(head, "#1d1a17", 0.08, 0.1, 0.04, 0.2, 0.34, 0.27, { shadow: false });
  box(root, OR, 0.09, 0.35, 0.09, -0.18, 0.17, 0.1); box(root, OR, 0.09, 0.35, 0.09, 0.18, 0.17, 0.1);
  root.traverse((o) => { o.frustumCulled = false; });
  return { root, head };
}

function buildDuck(scene: THREE.Scene) {
  const root = new THREE.Group(); scene.add(root);
  const Y = "#f7d54d", OR = "#f08a1d";
  box(root, Y, 0.85, 0.65, 1.05, 0, 0.55, 0);
  box(root, Y, 0.55, 0.4, 0.3, 0, 0.85, -0.6).rotation.x = -0.5;
  const head = new THREE.Group(); head.position.set(0, 0.95, 0.42); root.add(head);
  box(head, Y, 0.56, 0.54, 0.56, 0, 0.27, 0);
  box(head, OR, 0.5, 0.14, 0.42, 0, 0.18, 0.45, { shadow: false }); // flat beak
  box(head, "#1d1a17", 0.09, 0.11, 0.04, -0.19, 0.38, 0.29, { shadow: false });
  box(head, "#1d1a17", 0.09, 0.11, 0.04, 0.19, 0.38, 0.29, { shadow: false });
  box(root, OR, 0.09, 0.3, 0.09, -0.18, 0.15, 0.1); box(root, OR, 0.09, 0.3, 0.09, 0.18, 0.15, 0.1);
  root.traverse((o) => { o.frustumCulled = false; });
  return { root, head };
}

function buildCow(scene: THREE.Scene, scale: number) {
  const root = new THREE.Group(); scene.add(root);
  const W = "#f4f1ea", D = "#3a3630", PINK = "#e8a7a0";
  box(root, W, 1.25, 1.1, 2.1, 0, 1.15, 0);
  box(root, D, 0.7, 0.6, 0.08, -0.3, 1.35, 0.6, { shadow: false });
  box(root, D, 0.55, 0.5, 0.08, 0.35, 1.0, -0.5, { shadow: false });
  box(root, D, 0.5, 0.45, 0.08, 0.1, 1.45, -0.95, { shadow: false });
  for (const [lx, lz] of [[-0.42, 0.75], [0.42, 0.75], [-0.42, -0.75], [0.42, -0.75]]) {
    box(root, W, 0.3, 0.85, 0.3, lx, 0.42, lz);
    box(root, D, 0.32, 0.14, 0.32, lx, 0.07, lz);
  }
  box(root, W, 0.14, 0.8, 0.14, 0, 1.15, -1.2).rotation.x = 0.3; // tail
  const head = new THREE.Group(); head.position.set(0, 1.55, 1.05); root.add(head);
  box(head, W, 0.85, 0.75, 0.8, 0, 0.1, 0.15);
  box(head, PINK, 0.7, 0.4, 0.25, 0, -0.12, 0.6, { shadow: false }); // snout
  box(head, "#8a5a52", 0.1, 0.08, 0.05, -0.16, -0.1, 0.74, { shadow: false });
  box(head, "#8a5a52", 0.1, 0.08, 0.05, 0.16, -0.1, 0.74, { shadow: false });
  box(head, "#1d1a17", 0.11, 0.13, 0.05, -0.3, 0.28, 0.52, { shadow: false });
  box(head, "#1d1a17", 0.11, 0.13, 0.05, 0.3, 0.28, 0.52, { shadow: false });
  box(head, "#e8dcc4", 0.34, 0.1, 0.1, -0.55, 0.42, 0.1).rotation.z = 0.4; // horns
  box(head, "#e8dcc4", 0.34, 0.1, 0.1, 0.55, 0.42, 0.1).rotation.z = -0.4;
  box(head, W, 0.22, 0.3, 0.08, -0.52, 0.22, 0.1); box(head, W, 0.22, 0.3, 0.08, 0.52, 0.22, 0.1); // ears
  root.scale.setScalar(scale);
  root.traverse((o) => { o.frustumCulled = false; });
  return { root, head };
}

// ---------------------------------------------------------------- structures
export const BIMA_PLOT: [number, number] = [-10, 0];
export const TETANGGA_PLOT: [number, number] = [8, -4];
export const MONSTER_PLOT: [number, number] = [20, 4];
export const KELINCI_PLOT: [number, number] = [-21, 6];

function buildTowerBima(scene: THREE.Scene) {
  const g = new THREE.Group(); g.position.set(BIMA_PLOT[0], 0, BIMA_PLOT[1]); scene.add(g);
  const layers: THREE.Group[] = [];
  const woods = ["#b08954", "#a9743f", "#bd925c", "#a3804f"];
  for (let i = 0; i < 7; i++) {
    const L = new THREE.Group(); L.position.y = i * 1.08; g.add(L);
    const c = woods[i % 4];
    const rot = (i % 2) * 0.16 - 0.08; // spiral hint
    const holder = new THREE.Group(); holder.rotation.y = rot; L.add(holder);
    box(holder, c, 1.5, 1.0, 1.5, -0.78, 0.54, -0.78);
    box(holder, c, 1.5, 1.0, 1.5, 0.78, 0.54, -0.78);
    box(holder, c, 1.5, 1.0, 1.5, -0.78, 0.54, 0.78);
    box(holder, c, 1.5, 1.0, 1.5, 0.78, 0.54, 0.78);
    layers.push(L);
  }
  // champion flag on top (visible when the tower is complete)
  const flag = new THREE.Group(); flag.position.y = 7 * 1.08; g.add(flag);
  box(flag, "#7a4b2d", 0.14, 2.4, 0.14, 0, 1.2, 0);
  const cloth = box(flag, "#e2483d", 1.5, 0.9, 0.08, 0.82, 1.95, 0, { shadow: false });
  cloth.name = "flagCloth";
  return { g, layers, flag };
}

function buildTowerTetangga(scene: THREE.Scene) {
  const g = new THREE.Group(); g.position.set(TETANGGA_PLOT[0], 0, TETANGGA_PLOT[1]); scene.add(g);
  const layers: THREE.Group[] = [];
  const bricks = ["#b5503c", "#a84a36", "#bd5a44"];
  for (let i = 0; i < 6; i++) {
    const L = new THREE.Group(); L.position.y = i * 1.02; g.add(L);
    const c = bricks[i % 3];
    box(L, c, 2.3, 0.95, 1.7, 0, 0.51, 0);
    box(L, bricks[(i + 1) % 3], 1.9, 0.14, 1.4, 0, 1.05, 0, { shadow: false });
    layers.push(L);
  }
  return { g, layers };
}

function buildTowerMonster(scene: THREE.Scene) {
  const g = new THREE.Group(); g.position.set(MONSTER_PLOT[0], 0, MONSTER_PLOT[1]); scene.add(g);
  const layers: THREE.Group[] = [];
  const sizes: [number, number][] = [[5.2, 1.1], [4.2, 1.05], [3.2, 1.0]];
  let y = 0;
  sizes.forEach(([w, h], i) => {
    const L = new THREE.Group(); L.position.y = y; g.add(L);
    box(L, i % 2 ? "#8a6844" : "#96714b", w, h, w * 0.8, 0, h / 2, 0);
    layers.push(L); y += h;
  });
  return { g, layers };
}

function buildTowerKelinci(scene: THREE.Scene) {
  const g = new THREE.Group(); g.position.set(KELINCI_PLOT[0], 0, KELINCI_PLOT[1]); scene.add(g);
  for (let i = 0; i < 3; i++) {
    box(g, "#f08a2e", 1.7, 0.95, 1.7, 0, 0.5 + i * 0.98, 0);
  }
  box(g, "#4f9e3d", 0.5, 0.9, 0.5, -0.3, 3.35, 0).rotation.z = 0.3;
  box(g, "#5cab47", 0.5, 1.0, 0.5, 0.25, 3.4, 0.1).rotation.z = -0.25;
  return g;
}

function buildRubble(scene: THREE.Scene, x: number, z: number, color: string, seed: number, spread = 4) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const r = rng(seed);
  for (let i = 0; i < 16; i++) {
    const b = box(g, color, 1.3 + r() * 0.5, 0.8 + r() * 0.4, 1.3 + r() * 0.5,
      (r() - 0.5) * spread * 2, 0.35 + (r() < 0.3 ? 0.75 : 0), (r() - 0.5) * spread);
    b.rotation.y = r() * Math.PI; b.rotation.z = (r() - 0.5) * 0.35;
  }
  g.visible = false;
  return g;
}

function buildBridge(scene: THREE.Scene) {
  const g = new THREE.Group(); scene.add(g);
  const deck: THREE.Object3D[] = [];
  const woods = ["#b08954", "#a9743f", "#bd925c"];
  for (let i = 0; i < 7; i++) {
    const z = -15.9 - i * 1.32;
    const b = box(g, woods[i % 3], 3.4, 0.55, 1.45, BRIDGE_X, 0.62, z);
    deck.push(b);
  }
  // support posts
  for (const z of [-17.5, -22.5]) {
    box(g, "#7a4b2d", 0.4, 1.6, 0.4, BRIDGE_X - 1.4, -0.2, z);
    box(g, "#7a4b2d", 0.4, 1.6, 0.4, BRIDGE_X + 1.4, -0.2, z);
  }
  const rails = new THREE.Group(); g.add(rails);
  for (const sx of [-1.62, 1.62]) {
    box(rails, "#8a5a34", 0.22, 0.22, 9.6, BRIDGE_X + sx, 1.55, RIVER_Z);
    for (let i = 0; i < 5; i++) box(rails, "#8a5a34", 0.18, 0.75, 0.18, BRIDGE_X + sx, 1.15, -16.2 - i * 1.9);
  }
  rails.visible = false;
  const flag = new THREE.Group(); flag.position.set(BRIDGE_X, 0.9, RIVER_Z); g.add(flag);
  box(flag, "#7a4b2d", 0.14, 2.6, 0.14, 0, 1.3, 0);
  const cloth = box(flag, "#e2483d", 1.6, 0.95, 0.08, 0.87, 2.1, 0, { shadow: false });
  cloth.name = "flagCloth";
  flag.visible = false;
  // picnic blanket + cake for the bridge picnic scene
  box(g, "#d94f43", 2.6, 0.1, 2.2, BRIDGE_X, 0.95, RIVER_Z + 1.5, { shadow: false }).name = "blanket";
  box(g, "#f7e3ef", 0.8, 0.5, 0.8, BRIDGE_X + 0.4, 1.2, RIVER_Z + 1.4, { shadow: false }).name = "cake";
  g.visible = false;
  return { g, deck, rails, flag };
}

function buildLadderSmall(scene: THREE.Scene) {
  const g = new THREE.Group(); g.position.set(BIMA_PLOT[0] + 2.6, 0, BIMA_PLOT[1] + 0.4); scene.add(g);
  box(g, "#8a5a34", 0.3, 8.6, 0.3, -0.7, 4.3, 0).rotation.z = 0.18;
  box(g, "#8a5a34", 0.3, 8.6, 0.3, 0.7, 4.3, 0).rotation.z = 0.18;
  for (let y = 0.8; y < 8.2; y += 1.05) box(g, "#a9743f", 1.5, 0.22, 0.3, -0.12 + (y * 0.18) * 0.55, y, 0, { shadow: false });
  return g;
}

export function buildWorld(scene: THREE.Scene): MenaraRefs {
  buildGround(scene);
  buildVillage(scene);
  buildTree(scene);
  const { sun, mtl } = buildSky(scene);
  buildClouds(scene);
  const storm = buildStorm(scene);
  const stars = buildStars(scene);
  const water = box(scene, "#3f8fd2", 140, 1.1, 8.6, 0, -0.75, RIVER_Z, { shadow: false });
  (water.material as THREE.MeshLambertMaterial).transparent = true;
  (water.material as THREE.MeshLambertMaterial).opacity = 0.92;

  const b = buildBima(scene);
  const t = buildHuman(scene, "#e2703a", "#c95e30", "#4d6b35", "#2e2a26");
  const t2 = buildHuman(scene, "#3f7fd0", "#356cb4", "#5a4632", "#4a3220");
  const m = buildMonster(scene);
  const kel = buildBunny(scene);
  const ay = buildChicken(scene);
  const beb = buildDuck(scene);
  const sapi = buildCow(scene, 1.0);
  const sapiAnak = buildCow(scene, 0.55);

  const tb = buildTowerBima(scene);
  const tt = buildTowerTetangga(scene);
  const tm = buildTowerMonster(scene);
  const tk = buildTowerKelinci(scene);
  const rubbleBima = buildRubble(scene, BIMA_PLOT[0] - 1, BIMA_PLOT[1] - 3, "#a9743f", 55, 4.5);
  const rubbleTetangga = buildRubble(scene, TETANGGA_PLOT[0], TETANGGA_PLOT[1] + 1, "#a84a36", 77, 3);
  const bridge = buildBridge(scene);
  const ladderSmall = buildLadderSmall(scene);

  return {
    bima: b.root, bimaHead: b.headG, headNormal: b.faceN, headTired: b.faceT,
    armL: b.armL, armR: b.armR, legL: b.legL, legR: b.legR, torso: b.torso,
    tetangga: t.root, tetanggaHead: t.headG, tArmL: t.armL, tArmR: t.armR, tLegL: t.legL, tLegR: t.legR,
    tetangga2: t2.root, tetangga2Head: t2.headG, t2ArmL: t2.armL, t2ArmR: t2.armR,
    monster: m.root, monsterHead: m.headG, mArmL: m.armL, mArmR: m.armR, mLegL: m.legL, mLegR: m.legR,
    kelinci: kel.root, kelinciHead: kel.head,
    ayam: ay.root, ayamHead: ay.head,
    bebek: beb.root, bebekHead: beb.head,
    sapi: sapi.root, sapiHead: sapi.head, sapiAnak: sapiAnak.root,
    towerBima: tb.g, towerBimaLayers: tb.layers, towerFlag: tb.flag,
    towerTetangga: tt.g, towerTetanggaLayers: tt.layers,
    towerMonster: tm.g, towerMonsterLayers: tm.layers,
    towerKelinci: tk,
    rubbleBima, rubbleTetangga, ladderSmall,
    bridge: bridge.g, bridgeDeck: bridge.deck, bridgeRails: bridge.rails, bridgeFlag: bridge.flag,
    water, storm, stars, sunMesh: sun, skyMat: mtl,
  };
}
