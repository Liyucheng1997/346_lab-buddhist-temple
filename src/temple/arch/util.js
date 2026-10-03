// 建筑模块通用几何工具：按材质合并、实例化、沿折线扫掠、矩形环线脚挤出
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();
const _e = new THREE.Euler();

/** 生成变换矩阵（位置、欧拉角旋转、缩放） */
export function mat4(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  _p.set(x, y, z);
  _s.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

/** 让 Mesh 投射/接收阴影 */
export function shadowed(o) {
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

/**
 * 零件装配器：收集几何体（按材质合并）与实例化批次，最终生成尽量少的 Mesh。
 * 用法：b.add(geo, mat, matrix) / b.inst(geo, mat, [matrices]) / b.build(group)
 */
export class PartBuilder {
  constructor() {
    this.buckets = new Map(); // material -> geometry[]
    this.instances = []; // {geo, mat, matrices}
  }
  add(geo, mat, matrix = null) {
    const g = matrix ? geo.clone().applyMatrix4(matrix) : geo;
    if (!this.buckets.has(mat)) this.buckets.set(mat, []);
    this.buckets.get(mat).push(g);
    return this;
  }
  /** 把另一个 builder 的内容合并进来（可附加变换） */
  merge(other, matrix = null) {
    for (const [m, list] of other.buckets) for (const g of list) this.add(g, m, matrix);
    for (const it of other.instances) {
      const ms = matrix ? it.matrices.map((mm) => new THREE.Matrix4().multiplyMatrices(matrix, mm)) : it.matrices;
      this.instances.push({ geo: it.geo, mat: it.mat, matrices: ms });
    }
    return this;
  }
  inst(geo, mat, matrices) {
    if (matrices.length) this.instances.push({ geo, mat, matrices });
    return this;
  }
  build(group = new THREE.Group()) {
    for (const [m, list] of this.buckets) {
      const merged = list.length === 1 ? list[0] : mergeGeometries(list.map((g) => ensureIndexed(stripForMerge(g))), false);
      if (!merged) continue;
      group.add(shadowed(new THREE.Mesh(merged, m)));
    }
    for (const it of this.instances) {
      const im = new THREE.InstancedMesh(it.geo, it.mat, it.matrices.length);
      it.matrices.forEach((mm, i) => im.setMatrixAt(i, mm));
      im.instanceMatrix.needsUpdate = true;
      shadowed(im);
      group.add(im);
    }
    return group;
  }
}

/** 合并前统一属性集合（去掉某些几何体独有的 uv2 等属性，避免 merge 失败） */
function stripForMerge(g) {
  const keep = ['position', 'normal', 'uv'];
  let changed = false;
  for (const k of Object.keys(g.attributes)) if (!keep.includes(k)) changed = true;
  if (!changed && g.attributes.normal && g.attributes.uv && g.index) return g;
  const c = g.clone();
  for (const k of Object.keys(c.attributes)) if (!keep.includes(k)) c.deleteAttribute(k);
  if (!c.attributes.normal) c.computeVertexNormals();
  if (!c.attributes.uv) {
    const n = c.attributes.position.count;
    c.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  }
  return c;
}
/** 确保几何体带索引（非索引几何体补一个顺序索引），使同一桶内可合并 */
function ensureIndexed(g) {
  if (g.index) return g;
  const n = g.attributes.position.count;
  const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

/**
 * 沿折线扫掠矩形截面（宽 w、高 h），截面的“上”方向保持为世界 Y，用于脊、枋、檐口板等。
 * points: Vector3[]；closed=false。返回 BufferGeometry（带法线与 uv）。
 */
export function sweepRect(points, w, h, opt = {}) {
  const yOff = opt.yOffset ?? 0; // 截面相对折线的竖向偏移（0: 折线在截面中心）
  const n = points.length;
  const pos = [], nor = [], uv = [], idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  const tan = new THREE.Vector3(), side = new THREE.Vector3(), nup = new THREE.Vector3();
  let dist = 0;
  const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
  const cn = [[-1, 0], [0, -1], [1, 0], [0, 1]]; // 每条边的法线（side, up）
  for (let i = 0; i < n; i++) {
    const p = points[i];
    if (i > 0) dist += p.distanceTo(points[i - 1]);
    const a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)];
    tan.subVectors(b, a).normalize();
    side.crossVectors(tan, up);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0); else side.normalize();
    nup.crossVectors(side, tan).normalize();
    // 每条边两个顶点（硬边）
    for (let e = 0; e < 4; e++) {
      const c0 = corners[e], c1 = corners[(e + 1) % 4];
      for (const c of [c0, c1]) {
        pos.push(p.x + side.x * c[0] * w + nup.x * (c[1] * h + yOff), p.y + side.y * c[0] * w + nup.y * (c[1] * h + yOff), p.z + side.z * c[0] * w + nup.z * (c[1] * h + yOff));
        const nn = cn[e];
        nor.push(side.x * nn[0] + nup.x * nn[1], side.y * nn[0] + nup.y * nn[1], side.z * nn[0] + nup.z * nn[1]);
        uv.push(dist, c === c0 ? 0 : 1);
      }
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let e = 0; e < 4; e++) {
      const a = i * 8 + e * 2, b = a + 1, c = a + 8, d = a + 9;
      idx.push(a, c, b, b, c, d);
    }
  }
  // 端盖
  const capStart = pos.length / 3;
  for (const end of [0, n - 1]) {
    const p = points[end];
    const a = points[Math.max(0, end - 1)], b = points[Math.min(n - 1, end + 1)];
    tan.subVectors(b, a).normalize();
    side.crossVectors(tan, up);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0); else side.normalize();
    nup.crossVectors(side, tan).normalize();
    const sgn = end === 0 ? -1 : 1;
    const base = pos.length / 3;
    for (const c of corners) {
      pos.push(p.x + side.x * c[0] * w + nup.x * (c[1] * h + yOff), p.y + side.y * c[0] * w + nup.y * (c[1] * h + yOff), p.z + side.z * c[0] * w + nup.z * (c[1] * h + yOff));
      nor.push(tan.x * sgn, tan.y * sgn, tan.z * sgn);
      uv.push(c[0] + 0.5, c[1] + 0.5);
    }
    if (sgn < 0) idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    else idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  void capStart;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/**
 * 矩形环线脚挤出：把二维轮廓（[内缩量 o, 高度 y] 序列）绕矩形 w×d 挤出，形成须弥座、墙帽等。
 * 轮廓自下而上；o 为相对外轮廓的内缩量。返回带顶盖/底盖选项的 BufferGeometry。
 */
export function rectProfile(profile, w, d, opt = {}) {
  const pos = [], nor = [], uv = [], idx = [];
  const hw = w / 2, hd = d / 2;
  // 四条边：起点角、方向、外法线
  const sides = [
    { ax: 1, az: 1, nx: 0, nz: 1, len: w }, // 前（+z）从 (-hw,hd) → (hw,hd)
    { ax: 1, az: -1, nx: 1, nz: 0, len: d }, // 右（+x）
    { ax: -1, az: -1, nx: 0, nz: -1, len: w }, // 后
    { ax: -1, az: 1, nx: -1, nz: 0, len: d }, // 左
  ];
  const cornerOf = (k, o) => {
    const cs = [[-hw + o, hd - o], [hw - o, hd - o], [hw - o, -hd + o], [-hw + o, -hd + o]];
    return cs[k % 4];
  };
  for (let s = 0; s < 4; s++) {
    const sd = sides[s];
    const base = pos.length / 3;
    for (let i = 0; i < profile.length; i++) {
      const [o, y] = profile[i];
      const c0 = cornerOf(s, o), c1 = cornerOf(s + 1, o);
      // 法线：由轮廓相邻段斜率决定（近似，用前后点）
      const pa = profile[Math.max(0, i - 1)], pb = profile[Math.min(profile.length - 1, i + 1)];
      const dy = pb[1] - pa[1], dO = -(pb[0] - pa[0]);
      const l = Math.hypot(dy, dO) || 1;
      const nOut = dy / l, nUp = dO / l;
      for (const c of [c0, c1]) {
        pos.push(c[0], y, c[1]);
        nor.push(sd.nx * nOut, nUp, sd.nz * nOut);
        uv.push(c === c0 ? 0 : sd.len, y);
      }
    }
    for (let i = 0; i < profile.length - 1; i++) {
      const a = base + i * 2, b = a + 1, c = a + 2, dd = a + 3;
      idx.push(a, b, c, b, dd, c);
    }
  }
  // 顶盖
  if (opt.top !== false) {
    const [o, y] = profile[profile.length - 1];
    const base = pos.length / 3;
    for (let k = 0; k < 4; k++) { const c = cornerOf(k, o); pos.push(c[0], y, c[1]); nor.push(0, 1, 0); uv.push((c[0] + hw) / (opt.uvScale || 1), (c[1] + hd) / (opt.uvScale || 1)); }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  if (opt.bottom) {
    const [o, y] = profile[0];
    const base = pos.length / 3;
    for (let k = 0; k < 4; k++) { const c = cornerOf(k, o); pos.push(c[0], y, c[1]); nor.push(0, -1, 0); uv.push(c[0], c[1]); }
    idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** 盒子几何（带缓存，减少重复创建） */
const boxCache = new Map();
export function box(w, h, d) {
  const k = `${w}|${h}|${d}`;
  if (!boxCache.has(k)) boxCache.set(k, new THREE.BoxGeometry(w, h, d));
  return boxCache.get(k);
}

/** 旋成体：profile = [[r, y], ...] */
export function lathe(profile, seg = 24) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}

/** 给几何体写入统一的顶点色（供 vertexColors 材质合并多色零件） */
export function colorize(geo, hex) {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  const g = geo.clone();
  g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
  return g;
}

/** 合并一组带顶点色的几何体（保留 color 属性） */
export function mergeColored(list) {
  const norm = list.map((g) => {
    const c = g.index ? g : g;
    if (!c.attributes.uv) {
      const n = c.attributes.position.count;
      c.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    }
    return c;
  });
  return mergeGeometries(norm, false);
}

export { mergeGeometries };

/**
 * 把多个 Group 中的 Mesh/InstancedMesh 按材质（与几何）合并，显著减少 draw call。
 * 各 group 需先设置好 position/rotation（函数内部会 updateMatrixWorld）。返回新的 Group。
 */
export function mergeGroups(groups, name = 'merged') {
  const b = new PartBuilder();
  const instBuckets = new Map(); // geo+mat -> {geo, mat, matrices}
  const tmp = new THREE.Matrix4();
  for (const g of groups) {
    g.updateMatrixWorld(true);
    g.traverse((o) => {
      if (!o.isMesh) return;
      if (o.isInstancedMesh) {
        const key = o.geometry.uuid + '|' + o.material.uuid;
        if (!instBuckets.has(key)) instBuckets.set(key, { geo: o.geometry, mat: o.material, matrices: [] });
        const bucket = instBuckets.get(key);
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, tmp); bucket.matrices.push(new THREE.Matrix4().multiplyMatrices(o.matrixWorld, tmp)); }
      } else {
        b.add(o.geometry, o.material, o.matrixWorld.clone());
      }
    });
  }
  for (const it of instBuckets.values()) b.inst(it.geo, it.mat, it.matrices);
  const out = b.build();
  out.name = name;
  return out;
}
