import * as THREE from "three";

// Deterministic PRNG (mulberry32) so every frame/machine builds the same world.
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const matCache = new Map<string, THREE.MeshLambertMaterial>();
export function mat(color: string) {
  let m = matCache.get(color);
  if (!m) { m = new THREE.MeshLambertMaterial({ color }); matCache.set(color, m); }
  return m;
}

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
export function box(
  parent: THREE.Object3D, color: string,
  sx: number, sy: number, sz: number,
  x: number, y: number, z: number,
  opts: { shadow?: boolean; material?: THREE.Material } = {},
) {
  const mesh = new THREE.Mesh(boxGeo, opts.material ?? mat(color));
  mesh.scale.set(sx, sy, sz);
  mesh.position.set(x, y, z);
  mesh.castShadow = opts.shadow ?? true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Kapten Blok's face, painted on a canvas: warm skin, thick angled black brows
// (determined), square eyes, a neat captain's moustache and a confident grin.
// ORIGINAL design for this channel — not copied from any existing character.
export function kaptenFaceTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#eebd93"; g.fillRect(0, 0, 256, 256);
  // brows: thick, angled down toward the centre (determined captain look)
  g.fillStyle = "#26211e";
  g.save(); g.translate(74, 96); g.rotate(0.28); g.fillRect(-26, -8, 52, 16); g.restore();
  g.save(); g.translate(182, 96); g.rotate(-0.28); g.fillRect(-26, -8, 52, 16); g.restore();
  // eyes: dark squares with a white glint
  g.fillStyle = "#1d1a17";
  g.fillRect(58, 116, 26, 30); g.fillRect(172, 116, 26, 30);
  g.fillStyle = "#ffffff";
  g.fillRect(66, 120, 8, 8); g.fillRect(180, 120, 8, 8);
  // nose hint
  g.fillStyle = "#dda06e"; g.fillRect(118, 146, 20, 14);
  // moustache: full dark strip with a centre dip and angled ends
  g.fillStyle = "#33261c";
  g.fillRect(76, 168, 104, 15);
  g.save(); g.translate(76, 172); g.rotate(0.35); g.fillRect(-16, -6, 34, 12); g.restore();
  g.save(); g.translate(180, 172); g.rotate(-0.35); g.fillRect(-18, -6, 34, 12); g.restore();
  // confident open grin under the moustache
  g.fillStyle = "#7c3f2a";
  g.beginPath(); g.arc(128, 190, 40, 0.12 * Math.PI, 0.88 * Math.PI); g.closePath(); g.fill();
  g.fillStyle = "#ffffff"; g.fillRect(96, 192, 64, 12);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Generic toy-town citizen face: raised worried brows + small "o" mouth.
// Skin tone and hair-strip colour vary per citizen.
export function citizenFaceTexture(skin: string): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = skin; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#4a3826";
  g.save(); g.translate(74, 92); g.rotate(-0.22); g.fillRect(-22, -6, 44, 11); g.restore();
  g.save(); g.translate(182, 92); g.rotate(0.22); g.fillRect(-22, -6, 44, 11); g.restore();
  g.fillStyle = "#1d1a17";
  g.fillRect(62, 116, 22, 26); g.fillRect(172, 116, 22, 26);
  g.fillStyle = "#e0a878"; g.fillRect(119, 146, 18, 14);
  // small round worried mouth
  g.fillStyle = "#7c3f2a";
  g.beginPath(); g.arc(128, 196, 15, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function headWithFace(face: THREE.Texture, skin: string) {
  const skinM = mat(skin);
  const faceM = new THREE.MeshLambertMaterial({ map: face });
  // Box material order: +x, -x, +y, -y, +z (face), -z
  const m = new THREE.Mesh(boxGeo, [skinM, skinM, skinM, skinM, faceM, skinM]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const smoother = (v: number) => { v = clamp01(v); return v * v * v * (v * (v * 6 - 15) + 10); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function lerp3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
