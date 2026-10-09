// 有符号距离场（SDF）雕塑引擎 —— 像捏泥塑一样，用平滑融合的基本体塑造造像。
// 所有尺寸为“造像局部单位”，最终网格再整体缩放。

const T_SPHERE = 0, T_ELLIPSOID = 1, T_ROUNDCONE = 2, T_BOX = 3, T_TORUS = 4, T_CYL = 5, T_FUNC = 6;
const OP_ADD = 0, OP_SUB = 1, OP_PAINT = 2, OP_INTER = 3;
const D_NONE = 0, D_FOLDS = 1, D_CURLS = 2, D_NOISE = 3, D_SCALES = 4;

// ---------- 小型噪声（岩石、衣纹扰动用） ----------
function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h & 0xffff) / 0xffff;
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const a = hash3(xi, yi, zi), b = hash3(xi + 1, yi, zi), c = hash3(xi, yi + 1, zi), d = hash3(xi + 1, yi + 1, zi);
  const e = hash3(xi, yi, zi + 1), f = hash3(xi + 1, yi, zi + 1), g = hash3(xi, yi + 1, zi + 1), h = hash3(xi + 1, yi + 1, zi + 1);
  const x1 = a + (b - a) * u, x2 = c + (d - c) * u, x3 = e + (f - e) * u, x4 = g + (h - g) * u;
  const y1 = x1 + (x2 - x1) * v, y2 = x3 + (x4 - x3) * v;
  return (y1 + (y2 - y1) * w) * 2 - 1;
}
export function fbm(x, y, z, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, z * f); f *= 2.03; a *= 0.5; }
  return s;
}

// ---------- 旋转矩阵工具（欧拉角 XYZ，弧度） ----------
function rotMat(rx = 0, ry = 0, rz = 0) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  // R = Rz * Ry * Rx（与 three.js 'XYZ' 顺序一致）
  return [
    cy * cz, sx * sy * cz - cx * sz, cx * sy * cz + sx * sz,
    cy * sz, sx * sy * sz + cx * cz, cx * sy * sz - sx * cz,
    -sy, sx * cy, cx * cy,
  ];
}

function smin(a, b, k) {
  if (k <= 0) return a < b ? a : b;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
function smax(a, b, k) { return -smin(-a, -b, k); }

export class Sculpt {
  constructor(palette = []) {
    this.prims = [];
    this.palette = palette; // [{color:'#hex', cls:'gold'|'paint'|'gloss'|'metal'}]
    this.matIndex = new Map();
    palette.forEach((p, i) => this.matIndex.set(p.name ?? String(i), i));
    // 平移/旋转/镜像的“变换栈”：方便以局部坐标塑造头部、手部等
    this.offset = [0, 0, 0];
  }

  mat(name) {
    if (typeof name === 'number') return name;
    const i = this.matIndex.get(name);
    if (i === undefined) throw new Error('未知材质: ' + name);
    return i;
  }

  _push(p, o = {}) {
    p.op = o.op === 'sub' ? OP_SUB : o.op === 'paint' ? OP_PAINT : o.op === 'inter' ? OP_INTER : OP_ADD;
    p.k = o.k ?? 0.02;
    p.m = o.mat !== undefined ? this.mat(o.mat) : 0;
    p.mb = o.mbias ?? 0; // 材质优先级：判定顶点材质时视作更近
    p.dt = D_NONE;
    if (o.folds) { // 衣纹：沿方向 dir 的正弦起伏
      const f = o.folds;
      p.dt = D_FOLDS; p.da = f.amp; p.df = f.freq; p.dp = f.phase ?? 0;
      const d = f.dir; const l = Math.hypot(d[0], d[1], d[2]);
      p.dx = d[0] / l; p.dy = d[1] / l; p.dz = d[2] / l;
      p.dw = f.wobble ?? 0; // 衣纹弯曲度
    } else if (o.curls) { // 螺发
      p.dt = D_CURLS; p.da = o.curls.amp; p.df = o.curls.freq;
    } else if (o.noise) { // 岩石/粗糙
      p.dt = D_NOISE; p.da = o.noise.amp; p.df = o.noise.freq; p.do = o.noise.oct ?? 4;
    } else if (o.scales) { // 鱼鳞甲片
      p.dt = D_SCALES; p.da = o.scales.amp; p.df = o.scales.freq;
    }
    if (o.clip) { // 半空间裁切：保留 dot(p - c, n) <= 0 的部分
      const [c, n] = o.clip; const l = Math.hypot(n[0], n[1], n[2]);
      p.cl = true; p.cpx = c[0]; p.cpy = c[1]; p.cpz = c[2]; p.cnx = n[0] / l; p.cny = n[1] / l; p.cnz = n[2] / l;
    } else p.cl = false;
    p.br += p.k + (p.da ? Math.abs(p.da) * 1.6 : 0);
    this.prims.push(p);
    return this;
  }

  _rot(o) {
    if (o.R) return o.R;
    if (o.rot) { const r = rotMat(o.rot[0], o.rot[1], o.rot[2]); return r; }
    return null;
  }

  // 沿 +dir 方向从远处向内步进，找到表面点（用于在已塑造的身体上“贴”衣边、饰物）
  surface(x, y, z, dir = [0, 0, 1], far = 1.5) {
    const l = Math.hypot(dir[0], dir[1], dir[2]);
    const dx = dir[0] / l, dy = dir[1] / l, dz = dir[2] / l;
    let t = far, px, py, pz;
    for (let i = 0; i < 400; i++) {
      px = x + dx * t; py = y + dy * t; pz = z + dz * t;
      const d = this.eval(px, py, pz);
      if (d < 1e-4) break;
      t -= Math.max(d * 0.8, 1e-4);
      if (t < -far) break;
    }
    return [px, py, pz];
  }

  sphere(c, r, o = {}) {
    return this._push({ t: T_SPHERE, cx: c[0], cy: c[1], cz: c[2], r, br: r }, o);
  }

  ellipsoid(c, r, o = {}) {
    const R = this._rot(o);
    return this._push({ t: T_ELLIPSOID, cx: c[0], cy: c[1], cz: c[2], rx: r[0], ry: r[1], rz: r[2], R, br: Math.max(r[0], r[1], r[2]) }, o);
  }

  // 圆锥胶囊：a、b 两端半径 ra、rb（iq sdRoundCone）
  cone(a, b, ra, rb, o = {}) {
    const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
    const l2 = bx * bx + by * by + bz * bz;
    const rr = ra - rb, a2 = l2 - rr * rr;
    const len = Math.sqrt(l2);
    return this._push({
      t: T_ROUNDCONE, ax: a[0], ay: a[1], az: a[2], bx, by, bz, ra, rb, l2, rr, a2, il2: 1 / l2,
      cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, cz: (a[2] + b[2]) / 2, br: len / 2 + Math.max(ra, rb),
    }, o);
  }

  capsule(a, b, r, o = {}) { return this.cone(a, b, r, r, o); }

  // 沿折线连续放置胶囊（飘带、衣边、锁链）
  chain(points, radii, o = {}) {
    for (let i = 0; i < points.length - 1; i++) {
      const ra = Array.isArray(radii) ? radii[i] : radii;
      const rb = Array.isArray(radii) ? radii[i + 1] : radii;
      this.cone(points[i], points[i + 1], ra, rb, o);
    }
    return this;
  }

  box(c, half, o = {}) {
    const R = this._rot(o);
    const rad = o.round ?? 0;
    return this._push({ t: T_BOX, cx: c[0], cy: c[1], cz: c[2], hx: half[0], hy: half[1], hz: half[2], rnd: rad, R, br: Math.hypot(half[0], half[1], half[2]) + rad }, o);
  }

  torus(c, R0, r, o = {}) {
    const R = this._rot(o);
    return this._push({ t: T_TORUS, cx: c[0], cy: c[1], cz: c[2], tR: R0, tr: r, R, br: R0 + r }, o);
  }

  cylinder(c, r, h, o = {}) {
    const R = this._rot(o);
    const rad = o.round ?? 0;
    return this._push({ t: T_CYL, cx: c[0], cy: c[1], cz: c[2], cr: r, ch: h, rnd: rad, R, br: Math.hypot(r, h) + rad }, o);
  }

  // 任意函数场：fn(x,y,z) 返回（近似、不高估的）距离；c、br 为包围球（用于剔除）
  field(fn, c, br, o = {}) {
    return this._push({ t: T_FUNC, fn, cx: c[0], cy: c[1], cz: c[2], br }, o);
  }

  // 左右对称：对 x 取负后再调用一次
  mirror(fn) { fn(1); fn(-1); return this; }

  // ---------------- 求值 ----------------
  _primDist(p, x, y, z) {
    let lx = x - p.cx, ly = y - p.cy, lz = z - p.cz;
    let d;
    switch (p.t) {
      case T_SPHERE:
        d = Math.sqrt(lx * lx + ly * ly + lz * lz) - p.r;
        break;
      case T_ELLIPSOID: {
        if (p.R) { const R = p.R; const tx = R[0] * lx + R[3] * ly + R[6] * lz, ty = R[1] * lx + R[4] * ly + R[7] * lz, tz = R[2] * lx + R[5] * ly + R[8] * lz; lx = tx; ly = ty; lz = tz; }
        const ax = lx / p.rx, ay = ly / p.ry, az = lz / p.rz;
        const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
        const bx = ax / p.rx, by = ay / p.ry, bz = az / p.rz;
        const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
        d = k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(p.rx, p.ry, p.rz);
        break;
      }
      case T_ROUNDCONE: {
        const px = x - p.ax, py = y - p.ay, pz = z - p.az;
        const yy = px * p.bx + py * p.by + pz * p.bz;
        const qx = px * p.l2 - p.bx * yy, qy = py * p.l2 - p.by * yy, qz = pz * p.l2 - p.bz * yy;
        const x2 = qx * qx + qy * qy + qz * qz;
        const y2 = yy * yy * p.l2;
        const zz = yy - p.l2;
        const z2 = zz * zz * p.l2;
        const k = Math.sign(p.rr) * p.rr * p.rr * x2;
        if (Math.sign(zz) * p.a2 * z2 > k) {
          const ex = px - p.bx, ey = py - p.by, ez = pz - p.bz;
          d = Math.sqrt(ex * ex + ey * ey + ez * ez) - p.rb;
        } else if (Math.sign(yy) * p.a2 * y2 < k) {
          d = Math.sqrt(px * px + py * py + pz * pz) - p.ra;
        } else {
          d = (Math.sqrt(x2 * p.a2 * p.il2) + yy * p.rr) * p.il2 - p.ra;
        }
        break;
      }
      case T_BOX: {
        if (p.R) { const R = p.R; const tx = R[0] * lx + R[3] * ly + R[6] * lz, ty = R[1] * lx + R[4] * ly + R[7] * lz, tz = R[2] * lx + R[5] * ly + R[8] * lz; lx = tx; ly = ty; lz = tz; }
        const qx = Math.abs(lx) - p.hx + p.rnd, qy = Math.abs(ly) - p.hy + p.rnd, qz = Math.abs(lz) - p.hz + p.rnd;
        const mx = Math.max(qx, 0), my = Math.max(qy, 0), mz = Math.max(qz, 0);
        d = Math.sqrt(mx * mx + my * my + mz * mz) + Math.min(Math.max(qx, qy, qz), 0) - p.rnd;
        break;
      }
      case T_TORUS: {
        if (p.R) { const R = p.R; const tx = R[0] * lx + R[3] * ly + R[6] * lz, ty = R[1] * lx + R[4] * ly + R[7] * lz, tz = R[2] * lx + R[5] * ly + R[8] * lz; lx = tx; ly = ty; lz = tz; }
        const q = Math.sqrt(lx * lx + lz * lz) - p.tR;
        d = Math.sqrt(q * q + ly * ly) - p.tr;
        break;
      }
      case T_CYL: {
        if (p.R) { const R = p.R; const tx = R[0] * lx + R[3] * ly + R[6] * lz, ty = R[1] * lx + R[4] * ly + R[7] * lz, tz = R[2] * lx + R[5] * ly + R[8] * lz; lx = tx; ly = ty; lz = tz; }
        const dx = Math.sqrt(lx * lx + lz * lz) - p.cr + p.rnd, dy = Math.abs(ly) - p.ch + p.rnd;
        const mx = Math.max(dx, 0), my = Math.max(dy, 0);
        d = Math.min(Math.max(dx, dy), 0) + Math.sqrt(mx * mx + my * my) - p.rnd;
        break;
      }
      case T_FUNC:
        d = p.fn(x, y, z);
        break;
    }
    if (p.cl) {
      const pd = (x - p.cpx) * p.cnx + (y - p.cpy) * p.cny + (z - p.cpz) * p.cnz;
      if (pd > d) d = pd;
    }
    switch (p.dt) {
      case D_FOLDS: {
        let s = (x * p.dx + y * p.dy + z * p.dz) * p.df + p.dp;
        if (p.dw) s += p.dw * Math.sin(x * 7.1 + y * 5.3 + z * 6.7);
        const w = Math.sin(s);
        // 衣纹：尖峰-圆谷的不对称波形更像真实布料
        d -= p.da * (w > 0 ? w * w * 0.6 + w * 0.4 : w * 0.7);
        break;
      }
      case D_CURLS: {
        const f = p.df;
        d -= p.da * Math.abs(Math.sin(x * f) * Math.sin(y * f) * Math.sin(z * f));
        break;
      }
      case D_NOISE:
        d -= p.da * fbm(x * p.df, y * p.df, z * p.df, p.do);
        break;
      case D_SCALES: {
        const f = p.df;
        const u = y * f, v = (x + z) * f * 0.8 + (Math.floor(u) % 2) * 0.5 * Math.PI;
        d -= p.da * Math.abs(Math.sin(v)) * (u - Math.floor(u));
        break;
      }
    }
    return d;
  }

  eval(x, y, z, P = this.prims) {
    let d = 1e9;
    for (let i = 0, n = P.length; i < n; i++) {
      const p = P[i];
      if (p.op === OP_PAINT) continue;
      const ex = x - p.cx, ey = y - p.cy, ez = z - p.cz;
      const bd = Math.sqrt(ex * ex + ey * ey + ez * ez) - p.br;
      if (p.op === OP_ADD) {
        if (bd > d + p.k) continue;
        d = smin(d, this._primDist(p, x, y, z), p.k);
      } else if (p.op === OP_SUB) {
        if (bd >= p.k - d) continue;
        d = smax(d, -this._primDist(p, x, y, z), p.k);
      } else { // 交集
        d = smax(d, this._primDist(p, x, y, z), p.k);
      }
    }
    return d;
  }

  // 顶点处的材质：最近的“加法”基本体 + 涂绘覆盖
  matAt(x, y, z, P = this.prims) {
    let best = 1e9, m = 0;
    for (let i = 0, n = P.length; i < n; i++) {
      const p = P[i];
      if (p.op === OP_ADD) {
        const ex = x - p.cx, ey = y - p.cy, ez = z - p.cz;
        if (Math.sqrt(ex * ex + ey * ey + ez * ez) - p.br - p.mb > best) continue;
        const di = this._primDist(p, x, y, z) - p.mb;
        if (di < best) { best = di; m = p.m; }
      } else if (p.op === OP_PAINT) {
        const di = this._primDist(p, x, y, z);
        if (di < 0) m = p.m;
      } else if (p.op === OP_SUB && p.paintCut) {
        const di = this._primDist(p, x, y, z);
        if (di < p.k * 0.5 + 1e-4) m = p.m;
      }
    }
    return m;
  }

  // 为一个球形区域（中心 c、半径 rb，中心处场值 dc）筛选可能起作用的基本体，保持原有顺序
  cull(cx, cy, cz, rb, dc) {
    const out = [];
    const P = this.prims;
    for (let i = 0, n = P.length; i < n; i++) {
      const p = P[i];
      const ex = cx - p.cx, ey = cy - p.cy, ez = cz - p.cz;
      const lb = Math.sqrt(ex * ex + ey * ey + ez * ez) - p.br - rb; // 区域内该基本体距离的下界
      if (p.op === OP_ADD) { if (lb < dc + 1.6 * rb + p.k) out.push(p); }
      else if (p.op === OP_SUB) { if (lb < p.k - dc + 1.6 * rb) out.push(p); }
      else if (p.op === OP_PAINT) { if (lb < 0) out.push(p); }
      else out.push(p);
    }
    return out;
  }

  // 让减法也能给切口上色（如嘴内、眼窝）
  paintCut() { this.prims[this.prims.length - 1].paintCut = true; return this; }
}

export const OPS = { OP_ADD, OP_SUB, OP_PAINT };
export { rotMat };
