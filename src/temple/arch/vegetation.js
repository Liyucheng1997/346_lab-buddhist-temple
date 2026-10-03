// 植物与经幡：古松（分层针叶云）、银杏、经幡
import * as THREE from 'three';
import { PartBuilder, box, mat4 } from './util.js';
import { AM } from './materials.js';

const V = THREE.Vector3;

function rng(seed) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

/** 松针云：几层扁平的圆锥叠成的伞状团块 */
function foliageCluster(ms, m, r, rnd) {
  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const rr = r * (1 - i * 0.22), y = i * r * 0.22;
    const rot = rnd() * Math.PI;
    ms.push(m.clone().multiply(mat4((rnd() - 0.5) * r * 0.2, y, (rnd() - 0.5) * r * 0.2, 0, rot, 0, rr, r * 0.42, rr)));
  }
}

/** 古松：弯曲主干 + 数枝横斜的枝干，每枝端部一团伞状针叶 */
export function buildPine(seed = 1, { height = 9 } = {}) {
  const g = new THREE.Group();
  g.name = '古松';
  const b = new PartBuilder();
  const rnd = rng(seed);
  const bark = AM.bark();
  // 主干：分 5 段，逐段偏斜
  const pts = [new V(0, 0, 0)];
  let dir = new V((rnd() - 0.5) * 0.3, 1, (rnd() - 0.5) * 0.3).normalize();
  const segs = 5, segL = height / segs;
  for (let i = 0; i < segs; i++) {
    dir = dir.clone().add(new V((rnd() - 0.5) * 0.5, 0.15, (rnd() - 0.5) * 0.5)).normalize();
    pts.push(pts[pts.length - 1].clone().addScaledVector(dir, segL));
  }
  const r0 = height * 0.045;
  const foliage = [];
  const addBranch = (from, to, ra, rb) => {
    const len = from.distanceTo(to);
    const mid = new V().lerpVectors(from, to, 0.5);
    const d = new V().subVectors(to, from).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new V(0, 1, 0), d);
    const m = new THREE.Matrix4().compose(mid, q, new V(1, 1, 1));
    const geo = new THREE.CylinderGeometry(rb, ra, len, 8);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * len / 2);
    b.add(geo, bark, m);
    b.add(new THREE.SphereGeometry(ra, 8, 6), bark, mat4(from.x, from.y, from.z)); // 关节球，遮缝
  };
  for (let i = 0; i < segs; i++) addBranch(pts[i], pts[i + 1], r0 * (1 - i * 0.16), r0 * (1 - (i + 1) * 0.16));
  // 侧枝：从第 2 段起，每段 1–2 枝，横向伸展后微上翘
  for (let i = 1; i < segs; i++) {
    const n = 1 + (rnd() > 0.5 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const base = new V().lerpVectors(pts[i], pts[i + 1], rnd());
      const a = rnd() * Math.PI * 2;
      const len = height * (0.28 + rnd() * 0.2) * (1 - i * 0.1);
      const tip = base.clone().add(new V(Math.cos(a) * len, len * (0.15 + rnd() * 0.2), Math.sin(a) * len));
      const elbow = new V().lerpVectors(base, tip, 0.55).add(new V(0, -len * 0.08, 0));
      addBranch(base, elbow, r0 * 0.45 * (1 - i * 0.1), r0 * 0.3);
      addBranch(elbow, tip, r0 * 0.3, r0 * 0.12);
      foliageCluster(foliage, mat4(tip.x, tip.y - 0.2, tip.z), height * (0.16 + rnd() * 0.08), rnd);
    }
  }
  // 顶冠
  const top = pts[pts.length - 1];
  foliageCluster(foliage, mat4(top.x, top.y - 0.3, top.z), height * 0.2, rnd);
  const cone = new THREE.ConeGeometry(1, 1, 9, 1, false);
  cone.translate(0, 0.5, 0);
  b.inst(cone, AM.pine(), foliage);
  b.build(g);
  // 树池（石砌）
  const pool = new PartBuilder();
  pool.add(box(2.6, 0.3, 2.6), AM.stone(), mat4(0, 0.15, 0));
  pool.add(box(2.0, 0.1, 2.0), AM.earth(), mat4(0, 0.3, 0));
  pool.build(g);
  return g;
}

/** 银杏：直干 + 分叉，金黄团状树冠 */
export function buildGinkgo(seed = 1, { height = 11 } = {}) {
  const g = new THREE.Group();
  g.name = '银杏';
  const b = new PartBuilder();
  const rnd = rng(seed + 100);
  const bark = AM.bark();
  const r0 = height * 0.035;
  const trunkH = height * 0.45;
  const trunk = new THREE.CylinderGeometry(r0 * 0.7, r0, trunkH, 9);
  trunk.translate(0, trunkH / 2, 0);
  b.add(trunk, bark);
  const crown = [];
  const blob = new THREE.IcosahedronGeometry(1, 1);
  // 顶点随机扰动，去掉球感
  {
    // 位移由顶点坐标哈希决定，保证重复顶点位移一致（几何体非索引）
    const pa = blob.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
      const hsh = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
      const f = 0.82 + (hsh - Math.floor(hsh)) * 0.36;
      pa.setXYZ(i, x * f, y * f, z * f);
    }
    blob.computeVertexNormals();
  }
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd();
    const len = height * 0.4;
    const tip = new V(Math.cos(a) * len * 0.35, trunkH + len, Math.sin(a) * len * 0.35);
    const from = new V(0, trunkH, 0);
    const mid = new V().lerpVectors(from, tip, 0.5);
    const d = new V().subVectors(tip, from).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new V(0, 1, 0), d);
    b.add(new THREE.CylinderGeometry(r0 * 0.25, r0 * 0.6, from.distanceTo(tip), 7), bark, new THREE.Matrix4().compose(mid, q, new V(1, 1, 1)));
    for (let k = 0; k < 9; k++) {
      const p = new V().lerpVectors(from, tip, 0.45 + k * 0.07);
      const rr = height * (0.05 + rnd() * 0.05);
      crown.push(mat4(p.x + (rnd() - 0.5) * rr * 3, p.y + (rnd() - 0.3) * rr * 2, p.z + (rnd() - 0.5) * rr * 3, rnd() * 3, rnd() * 3, 0, rr, rr * 1.2, rr));
    }
  }
  b.inst(blob, AM.ginkgo(), crown);
  b.build(g);
  return g;
}

/** 经幡：双杆横梁，悬挂数幅红黄布幡 */
export function buildBanner({ width = 6, height = 5 } = {}) {
  const g = new THREE.Group();
  g.name = '经幡';
  const b = new PartBuilder();
  const red = AM.redWood();
  for (const sx of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.06, 0.08, height, 8), red, mat4(sx * width / 2, height / 2, 0));
    b.add(new THREE.SphereGeometry(0.1, 8, 6), AM.gold(), mat4(sx * width / 2, height + 0.05, 0));
    b.add(box(0.5, 0.3, 0.5), AM.stone(), mat4(sx * width / 2, 0.15, 0));
  }
  b.add(new THREE.CylinderGeometry(0.04, 0.04, width, 6).rotateZ(Math.PI / 2), red, mat4(0, height - 0.2, 0));
  const n = 5;
  for (let i = 0; i < n; i++) {
    const x = -width / 2 + width * (i + 0.5) / n;
    const bw = width / n * 0.7, bh = height * 0.6;
    const cloth = new THREE.PlaneGeometry(bw, bh, 2, 8);
    const pos = cloth.attributes.position;
    for (let k = 0; k < pos.count; k++) pos.setZ(k, Math.sin(pos.getY(k) * 2 + i) * 0.08);
    cloth.computeVertexNormals();
    b.add(cloth, AM.banner(i % 2 ? '#c9a227' : '#b5261c'), mat4(x, height - 0.25 - bh / 2, 0));
  }
  b.build(g);
  return g;
}
