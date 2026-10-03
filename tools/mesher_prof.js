// 窄带 Surface Nets：先粗网格筛出表面附近的块，再精细求值，最后把顶点投影回等值面。
import { fbm } from '../src/sculpt/sdf.js';

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
export function hexToLinear(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [srgbToLinear(((n >> 16) & 255) / 255), srgbToLinear(((n >> 8) & 255) / 255), srgbToLinear((n & 255) / 255)];
}

const CLASSES = ['gold', 'paint', 'gloss', 'metal'];

/**
 * @param sculpt  Sculpt 实例
 * @param bmin/bmax 包围盒
 * @param h 网格步长
 * @returns {positions, normals, colors, groups:{cls:[indices]}}
 */
export function polygonize(sculpt, bmin, bmax, h, opts = {}) {
  const B = 4;
  const nx = Math.ceil((bmax[0] - bmin[0]) / h) + 1;
  const ny = Math.ceil((bmax[1] - bmin[1]) / h) + 1;
  const nz = Math.ceil((bmax[2] - bmin[2]) / h) + 1;
  const ox = bmin[0], oy = bmin[1], oz = bmin[2];

  if (globalThis.__PROF) console.log("0", (performance.now() - (globalThis.__t0 ??= performance.now())) | 0); globalThis.__t0 = performance.now();
  // ---- 粗网格 ----
  const cbx = Math.ceil((nx - 1) / B), cby = Math.ceil((ny - 1) / B), cbz = Math.ceil((nz - 1) / B);
  const cnx = cbx + 1, cny = cby + 1, cnz = cbz + 1;
  const coarse = new Float32Array(cnx * cny * cnz);
  for (let k = 0; k < cnz; k++) for (let j = 0; j < cny; j++) for (let i = 0; i < cnx; i++) {
    coarse[i + cnx * (j + cny * k)] = sculpt.eval(ox + i * B * h, oy + j * B * h, oz + k * B * h);
  }
  const thresh = B * h * Math.sqrt(3) * 1.6;
  const need = new Uint8Array(cbx * cby * cbz);
  const lists = new Array(cbx * cby * cbz);
  const blockSign = new Int8Array(cbx * cby * cbz);
  for (let k = 0; k < cbz; k++) for (let j = 0; j < cby; j++) for (let i = 0; i < cbx; i++) {
    let mn = Infinity, pos = 0, neg = 0;
    for (let c = 0; c < 8; c++) {
      const v = coarse[(i + (c & 1)) + cnx * ((j + ((c >> 1) & 1)) + cny * (k + ((c >> 2) & 1)))];
      if (Math.abs(v) < mn) mn = Math.abs(v);
      if (v > 0) pos++; else neg++;
    }
    const bi = i + cbx * (j + cby * k);
    need[bi] = (mn < thresh || (pos && neg)) ? 1 : 0;
    blockSign[bi] = pos ? 1 : -1;
    if (need[bi]) {
      // 该块的候选基本体列表（含投影/求梯度所需的外扩余量）
      const bcx = ox + (i + 0.5) * B * h, bcy = oy + (j + 0.5) * B * h, bcz = oz + (k + 0.5) * B * h;
      const rb = B * h * Math.sqrt(3) * 0.5 + 2.5 * h;
      lists[bi] = sculpt.cull(bcx, bcy, bcz, rb, sculpt.eval(bcx, bcy, bcz));
    }
  }

  if (globalThis.__PROF) console.log("1", (performance.now() - (globalThis.__t0 ??= performance.now())) | 0); globalThis.__t0 = performance.now();
  // 需要精细求值的块
  const blocks = [];
  for (let b = 0; b < need.length; b++) if (need[b]) blocks.push(b);

  // ---- 精细场：远离表面的块填常数，近表面块精确求值 ----
  const field = new Float32Array(nx * ny * nz);
  const done = new Uint8Array(nx * ny * nz);
  // 默认值：所在块的符号 × 阈值（逐块填充）
  for (let bk = 0; bk < cbz; bk++) for (let bj = 0; bj < cby; bj++) for (let bi = 0; bi < cbx; bi++) {
    const b = bi + cbx * (bj + cby * bk);
    if (need[b]) continue;
    const v = blockSign[b] * thresh;
    const i1 = Math.min(bi * B + B, nx - 1), j1 = Math.min(bj * B + B, ny - 1), k1 = Math.min(bk * B + B, nz - 1);
    for (let k = bk * B; k <= k1; k++) for (let j = bj * B; j <= j1; j++) {
      const row = nx * (j + ny * k);
      for (let i = bi * B; i <= i1; i++) field[i + row] = v;
    }
  }
  for (const b of blocks) {
    const bi = b % cbx, bj = Math.floor(b / cbx) % cby, bk = Math.floor(b / (cbx * cby));
    const L = lists[b];
    const i1 = Math.min(bi * B + B, nx - 1), j1 = Math.min(bj * B + B, ny - 1), k1 = Math.min(bk * B + B, nz - 1);
    for (let k = bk * B; k <= k1; k++) for (let j = bj * B; j <= j1; j++) {
      const row = nx * (j + ny * k);
      for (let i = bi * B; i <= i1; i++) {
        const id = i + row;
        if (done[id]) continue;
        done[id] = 1;
        field[id] = sculpt.eval(ox + i * h, oy + j * h, oz + k * h, L);
      }
    }
  }

  if (globalThis.__PROF) console.log("2", (performance.now() - (globalThis.__t0 ??= performance.now())) | 0); globalThis.__t0 = performance.now();
  // ---- 每个单元生成一个顶点（仅遍历近表面块） ----
  const cx = nx - 1, cy = ny - 1, cz = nz - 1;
  const cellVert = new Map();
  const pos = [];
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  // 排除区（由更精细的分块负责），稍微收缩以与相邻分块重叠，避免裂缝
  const excl = opts.exclude && opts.exclude.length ? opts.exclude.map((b) => [b[0][0] + h, b[0][1] + h, b[0][2] + h, b[1][0] - h, b[1][1] - h, b[1][2] - h]) : null;
  for (const b of blocks) {
    const bi = b % cbx, bj = Math.floor(b / cbx) % cby, bk = Math.floor(b / (cbx * cby));
    const i1 = Math.min(bi * B + B, cx), j1 = Math.min(bj * B + B, cy), k1 = Math.min(bk * B + B, cz);
    for (let k = bk * B; k < k1; k++) for (let j = bj * B; j < j1; j++) for (let i = bi * B; i < i1; i++) {
      let mask = 0;
      for (let c = 0; c < 8; c++) {
        const v = field[(i + (c & 1)) + nx * ((j + ((c >> 1) & 1)) + ny * (k + ((c >> 2) & 1)))];
        cv[c] = v;
        if (v < 0) mask |= 1 << c;
      }
      if (mask === 0 || mask === 255) continue;
      if (excl) {
        const px = ox + (i + 0.5) * h, py = oy + (j + 0.5) * h, pz = oz + (k + 0.5) * h;
        let skip = false;
        for (const e of excl) if (px > e[0] && px < e[3] && py > e[1] && py < e[4] && pz > e[2] && pz < e[5]) { skip = true; break; }
        if (skip) continue;
      }
      let sx = 0, sy = 0, sz = 0, cnt = 0;
      for (let e = 0; e < 12; e++) {
        const a = EDGES[e][0], bb = EDGES[e][1];
        const va = cv[a], vb = cv[bb];
        if ((va < 0) === (vb < 0)) continue;
        const t = va / (va - vb);
        const ax = a & 1, ay = (a >> 1) & 1, az = (a >> 2) & 1;
        const bx = bb & 1, by = (bb >> 1) & 1, bz = (bb >> 2) & 1;
        sx += ax + (bx - ax) * t; sy += ay + (by - ay) * t; sz += az + (bz - az) * t; cnt++;
      }
      cellVert.set(i + cx * (j + cy * k), pos.length / 3);
      pos.push(ox + (i + sx / cnt) * h, oy + (j + sy / cnt) * h, oz + (k + sz / cnt) * h);
    }
  }

  if (globalThis.__PROF) console.log("3", (performance.now() - (globalThis.__t0 ??= performance.now())) | 0); globalThis.__t0 = performance.now();
  // ---- 面 ----
  const idx = [];
  const C = (i, j, k) => { const v = cellVert.get(i + cx * (j + cy * k)); return v === undefined ? -1 : v; };
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d);
  };
  for (const b of blocks) {
    const bi = b % cbx, bj = Math.floor(b / cbx) % cby, bk = Math.floor(b / (cbx * cby));
    const i1 = Math.min(bi * B + B, nx), j1 = Math.min(bj * B + B, ny), k1 = Math.min(bk * B + B, nz);
    for (let k = bk * B; k < k1; k++) for (let j = bj * B; j < j1; j++) for (let i = bi * B; i < i1; i++) {
      const v0 = field[i + nx * (j + ny * k)];
      const inside = v0 < 0;
      if (i < nx - 1 && j > 0 && k > 0 && j < ny - 1 && k < nz - 1) {
        const v1 = field[i + 1 + nx * (j + ny * k)];
        if ((v1 < 0) !== inside) quad(C(i, j - 1, k - 1), C(i, j, k - 1), C(i, j, k), C(i, j - 1, k), !inside);
      }
      if (j < ny - 1 && i > 0 && k > 0 && i < nx - 1 && k < nz - 1) {
        const v1 = field[i + nx * (j + 1 + ny * k)];
        if ((v1 < 0) !== inside) quad(C(i - 1, j, k - 1), C(i - 1, j, k), C(i, j, k), C(i, j, k - 1), !inside);
      }
      if (k < nz - 1 && i > 0 && j > 0 && i < nx - 1 && j < ny - 1) {
        const v1 = field[i + nx * (j + ny * (k + 1))];
        if ((v1 < 0) !== inside) quad(C(i - 1, j - 1, k), C(i, j - 1, k), C(i, j, k), C(i - 1, j, k), !inside);
      }
    }
  }

  if (globalThis.__PROF) console.log("4", (performance.now() - (globalThis.__t0 ??= performance.now())) | 0); globalThis.__t0 = performance.now();
  // ---- 投影到等值面 + 梯度法线 ----
  const nv = pos.length / 3;
  const positions = new Float32Array(pos);
  const normals = new Float32Array(nv * 3);
  const colors = new Float32Array(nv * 3);
  const vmat = new Uint8Array(nv);
  const e = h * 0.35;
  const palLin = sculpt.palette.map((p) => hexToLinear(p.color));
  const jitter = opts.colorJitter ?? 0.04;
  const blockList = (x, y, z) => {
    const bi = Math.min(Math.max(Math.floor((x - ox) / (B * h)), 0), cbx - 1);
    const bj = Math.min(Math.max(Math.floor((y - oy) / (B * h)), 0), cby - 1);
    const bk = Math.min(Math.max(Math.floor((z - oz) / (B * h)), 0), cbz - 1);
    return lists[bi + cbx * (bj + cby * bk)] || sculpt.prims;
  };
  for (let v = 0; v < nv; v++) {
    let x = positions[v * 3], y = positions[v * 3 + 1], z = positions[v * 3 + 2];
    const L = blockList(x, y, z);
    for (let it = 0; it < 2; it++) {
      const d = sculpt.eval(x, y, z, L);
      const gx = sculpt.eval(x + e, y, z, L) - sculpt.eval(x - e, y, z, L);
      const gy = sculpt.eval(x, y + e, z, L) - sculpt.eval(x, y - e, z, L);
      const gz = sculpt.eval(x, y, z + e, L) - sculpt.eval(x, y, z - e, L);
      const gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
      const nxv = gx / gl, nyv = gy / gl, nzv = gz / gl;
      if (it === 0) {
        let step = d;
        if (step > h * 0.6) step = h * 0.6; else if (step < -h * 0.6) step = -h * 0.6;
        x -= nxv * step; y -= nyv * step; z -= nzv * step;
      } else {
        normals[v * 3] = nxv; normals[v * 3 + 1] = nyv; normals[v * 3 + 2] = nzv;
      }
    }
    positions[v * 3] = x; positions[v * 3 + 1] = y; positions[v * 3 + 2] = z;
    const m = sculpt.matAt(x, y, z, L);
    vmat[v] = m;
    const c = palLin[m] || [1, 0, 1];
    // 轻微的色彩斑驳，模拟彩塑/贴金的手工质感
    const n = 1 + jitter * fbm(x * 9, y * 9, z * 9, 2);
    colors[v * 3] = c[0] * n; colors[v * 3 + 1] = c[1] * n; colors[v * 3 + 2] = c[2] * n;
  }

  if (globalThis.__PROF) console.log("5", (performance.now() - (globalThis.__t0 ??= performance.now())) | 0); globalThis.__t0 = performance.now();
  // ---- 按材质类别分组（贴金 / 彩绘 / 釉亮 / 金属） ----
  const groups = {};
  for (const cls of CLASSES) groups[cls] = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    // 三个顶点多数决定该三角形的类别
    const ma = vmat[a], mb = vmat[b], mc = vmat[c];
    const m = (mb === mc) ? mb : ma;
    const cls = sculpt.palette[m]?.cls || 'paint';
    groups[cls].push(a, b, c);
  }
  const out = {};
  for (const cls of CLASSES) if (groups[cls].length) out[cls] = new Uint32Array(groups[cls]);
  return { positions, normals, colors, groups: out };
}
