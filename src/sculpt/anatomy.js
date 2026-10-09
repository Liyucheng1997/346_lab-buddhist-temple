// 造像解剖工具：局部坐标系、头面部、手、臂、飘带等可复用的塑形模块。
import { rotMat } from './sdf.js';

// ---------- 3x3 矩阵（行主序）与向量 ----------
export const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
export function m3mul(A, B) {
  const C = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    C[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
  }
  return C;
}
export function m3v(A, v) {
  return [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
}
// 以 dir 为局部 z 轴的旋转矩阵
export function lookRot(dir, up = [0, 1, 0]) {
  const z = V.norm(dir);
  let x = V.cross(up, z);
  if (V.len(x) < 1e-5) x = V.cross([1, 0, 0], z);
  x = V.norm(x);
  const y = V.cross(z, x);
  return [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
}
export const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
// M·A·M，M = diag(-1,1,1)：镜像空间中的等价旋转
export function mirrorM(A) { return [A[0], -A[1], -A[2], -A[3], A[4], A[5], -A[6], A[7], A[8]]; }

// 确定性随机数
export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/**
 * 局部坐标系：world = o + s * R * local
 * 支持 mx = -1 的镜像（左右对称塑造）。
 */
export class Frame {
  constructor(S, o = [0, 0, 0], s = 1, R = I3, mx = 1) {
    this.S = S; this.o = o; this.s = s; this.R = R; this.mx = mx;
  }
  child(o, s = 1, rot = null, Rm = null) {
    let Rc = I3;
    if (Rm) Rc = this.mx < 0 ? mirrorM(Rm) : Rm;
    else if (rot) Rc = this.mx < 0 ? rotMat(rot[0], -rot[1], -rot[2]) : rotMat(rot[0], rot[1], rot[2]);
    return new Frame(this.S, this.p(o), this.s * s, m3mul(this.R, Rc), this.mx);
  }
  mirrored() { return new Frame(this.S, this.o, this.s, this.R, -this.mx); }
  p(v) { const l = [v[0] * this.mx, v[1], v[2]]; const r = m3v(this.R, l); return [this.o[0] + r[0] * this.s, this.o[1] + r[1] * this.s, this.o[2] + r[2] * this.s]; }
  d(v) { return m3v(this.R, [v[0] * this.mx, v[1], v[2]]); }
  _rotOf(o) {
    let Rp = I3;
    if (o.R) Rp = this.mx < 0 ? mirrorM(o.R) : o.R;
    else if (o.rot) Rp = this.mx < 0 ? rotMat(o.rot[0], -o.rot[1], -o.rot[2]) : rotMat(o.rot[0], o.rot[1], o.rot[2]);
    return m3mul(this.R, Rp);
  }
  _opts(o) {
    const n = { ...o };
    delete n.rot;
    n.k = (o.k ?? 0.02) * this.s;
    if (o.mbias) n.mbias = o.mbias * this.s;
    if (o.folds) n.folds = { ...o.folds, amp: o.folds.amp * this.s, freq: o.folds.freq / this.s, dir: this.d(o.folds.dir) };
    if (o.curls) n.curls = { amp: o.curls.amp * this.s, freq: o.curls.freq / this.s };
    if (o.noise) n.noise = { ...o.noise, amp: o.noise.amp * this.s, freq: o.noise.freq / this.s };
    if (o.scales) n.scales = { amp: o.scales.amp * this.s, freq: o.scales.freq / this.s };
    if (o.clip) n.clip = [this.p(o.clip[0]), this.d(o.clip[1])];
    if (o.round !== undefined) n.round = o.round * this.s;
    return n;
  }
  sphere(c, r, o = {}) { this.S.sphere(this.p(c), r * this.s, this._opts(o)); return this; }
  ellipsoid(c, r, o = {}) { const n = this._opts(o); n.R = this._rotOf(o); this.S.ellipsoid(this.p(c), r.map((v) => v * this.s), n); return this; }
  box(c, h, o = {}) { const n = this._opts(o); n.R = this._rotOf(o); this.S.box(this.p(c), h.map((v) => v * this.s), n); return this; }
  torus(c, R0, r, o = {}) { const n = this._opts(o); n.R = this._rotOf(o); this.S.torus(this.p(c), R0 * this.s, r * this.s, n); return this; }
  cylinder(c, r, h, o = {}) { const n = this._opts(o); n.R = this._rotOf(o); this.S.cylinder(this.p(c), r * this.s, h * this.s, n); return this; }
  cone(a, b, ra, rb, o = {}) { this.S.cone(this.p(a), this.p(b), ra * this.s, rb * this.s, this._opts(o)); return this; }
  capsule(a, b, r, o = {}) { return this.cone(a, b, r, r, o); }
  chain(pts, radii, o = {}) {
    for (let i = 0; i < pts.length - 1; i++) {
      const ra = Array.isArray(radii) ? radii[i] : radii, rb = Array.isArray(radii) ? radii[i + 1] : radii;
      this.cone(pts[i], pts[i + 1], ra, rb, o);
    }
    return this;
  }
  // 扁平带状物：沿路径放置压扁的椭球段（飘带、衣边、帔帛）。twist：沿程扭转的总角度
  ribbon(pts, width, thick, o = {}) {
    const up0 = o.up || [0, 1, 0];
    const n = pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[i + 1];
      const dir = V.sub(b, a); const L = V.len(dir);
      const t = (i + 0.5) / n;
      let w = width;
      if (Array.isArray(width)) { // 宽度数组按路径参数插值
        const tt = t * (width.length - 1);
        const j = Math.min(Math.floor(tt), width.length - 2);
        w = width[j] + (width[j + 1] - width[j]) * (tt - j);
      }
      let up = o.normal ? o.normal(i) : up0;
      if (o.twist) { // 绕路径方向旋转 up 向量
        const dn = V.norm(dir);
        const ang = o.twist * t + (o.twistPhase || 0);
        const u = V.norm(V.sub(up, V.mul(dn, V.dot(up, dn))));
        const v = V.cross(dn, u);
        up = V.add(V.mul(u, Math.cos(ang)), V.mul(v, Math.sin(ang)));
      }
      const R = lookRot(dir, up);
      this.ellipsoid(V.lerp(a, b, 0.5), [w, thick, L * 0.85], { ...o, R, normal: undefined, up: undefined, twist: undefined, twistPhase: undefined });
    }
    return this;
  }
  // 局部坐标下定义的函数场（fn 以局部单位返回距离），c/br 为局部包围球
  field(fn, c, br, o = {}) {
    const O = this.o, s = this.s, R = this.R, mx = this.mx;
    const wfn = (x, y, z) => {
      const dx = (x - O[0]) / s, dy = (y - O[1]) / s, dz = (z - O[2]) / s;
      return fn((R[0] * dx + R[3] * dy + R[6] * dz) * mx, R[1] * dx + R[4] * dy + R[7] * dz, R[2] * dx + R[5] * dy + R[8] * dz) * s;
    };
    this.S.field(wfn, this.p(c), br * s, this._opts(o));
    return this;
  }
  // 局部 → 世界的变换（供着色器把顶点换回局部坐标）
  xform() { return { o: this.o, s: this.s, R: this.R }; }
  mirror(fn) { fn(this); fn(this.mirrored()); return this; }
  surface(v, dir, far = 1.5) {
    const w = this.p(v);
    const dw = this.d(dir);
    const r = this.S.surface(w[0], w[1], w[2], dw, far * this.s);
    // 转回局部坐标
    const rel = [(r[0] - this.o[0]) / this.s, (r[1] - this.o[1]) / this.s, (r[2] - this.o[2]) / this.s];
    const RT = [this.R[0], this.R[3], this.R[6], this.R[1], this.R[4], this.R[7], this.R[2], this.R[5], this.R[8]];
    const l = m3v(RT, rel);
    return [l[0] * this.mx, l[1], l[2]];
  }
}

// ---------- Catmull-Rom 平滑曲线 ----------
export function spline(points, segs = 6) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(i + 2, points.length - 1)];
    for (let j = 0; j < segs; j++) {
      const t = j / segs, t2 = t * t, t3 = t2 * t;
      out.push([0, 1, 2].map((k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/**
 * 头部。局部单位：下颌到头顶约 1.0，眼睛在 y≈0，面朝 +z。
 * style: 'buddha' | 'bodhisattva' | 'king' | 'monk' | 'maitreya' | 'general' | 'old'
 */
export function head(F, opt = {}) {
  const st = opt.style || 'buddha';
  const skin = opt.skin || 'skin';
  const fat = opt.fat ?? 0.3;          // 面部丰满度
  const fierce = opt.fierce ?? 0;      // 怒目程度
  const smile = opt.smile ?? 0.2;
  const age = opt.age ?? 0;            // 皱纹、颧骨
  const long = 1 + (opt.long ?? 0);    // 脸长

  // 颅骨 + 面部体块
  F.ellipsoid([0, 0.1, -0.05], [0.36, 0.42, 0.44], { mat: skin, k: 0.1 });
  F.ellipsoid([0, -0.1 * long, 0.07], [0.3 + fat * 0.03, 0.37 * long, 0.33], { mat: skin, k: 0.12 });
  F.ellipsoid([0, -0.29 * long, 0.06], [0.25 + fat * 0.07, 0.2, 0.28], { mat: skin, k: 0.12 });
  // 下巴
  F.ellipsoid([0, -0.42 * long, 0.24], [0.1 + fat * 0.02, 0.08 + fat * 0.02, 0.09], { mat: skin, k: 0.07 });
  if (fat > 0.5) F.ellipsoid([0, -0.47 * long, 0.12], [0.2, 0.08, 0.16], { mat: skin, k: 0.1 }); // 双下巴
  // 颧骨与脸颊
  F.mirror((m) => {
    m.ellipsoid([0.17, -0.1, 0.23 - age * 0.03], [0.12 + fat * 0.02, 0.11, 0.1 + fat * 0.02], { mat: skin, k: 0.08 });
    m.ellipsoid([0.22, 0.0, 0.17], [0.08, 0.06, 0.08], { mat: skin, k: 0.06 });
    if (age > 0.3) m.ellipsoid([0.13, -0.18, 0.3], [0.05, 0.08, 0.04], { op: 'sub', k: 0.05 * age }); // 面颊凹陷
  });
  // 眉弓
  F.mirror((m) => {
    const inY = 0.07 - fierce * 0.06, outY = 0.09 + fierce * 0.04;
    m.cone([0.04, inY, 0.36 + fierce * 0.02], [0.27, outY, 0.23], 0.045 + fierce * 0.02, 0.035, { mat: skin, k: 0.06 });
  });
  if (fierce > 0) {
    // 眉心的怒纹
    F.ellipsoid([0, 0.1, 0.37], [0.05, 0.07, 0.04], { mat: skin, k: 0.04 });
    F.mirror((m) => m.cone([0.02, 0.06, 0.4], [0.02, 0.16, 0.39], 0.008, 0.006, { op: 'sub', k: 0.01 }));
  }
  // 眼窝与眼睛
  F.mirror((m) => {
    m.ellipsoid([0.14, -0.005, 0.34], [0.1, 0.065, 0.07], { op: 'sub', k: 0.05 });
    if ((st === 'king' || st === 'general') && fierce > 0.3) {
      // 怒目圆睁：眼球外凸，上下睑围成大杏眼，眉头紧锁
      m.sphere([0.15, 0.0, 0.3], 0.095, { mat: 'eyeWhite', k: 0.012 });
      m.sphere([0.155, 0.005, 0.385], 0.038, { op: 'paint', mat: 'pupil' });
      m.sphere([0.15, 0.0, 0.3], 0.11, { mat: skin, k: 0.02, clip: [[0.15, 0.0, 0.33], [0, 0, 1]] });        // 眼眶壳（露出前半球）
      m.ellipsoid([0.15, 0.085, 0.33], [0.12, 0.03, 0.07], { mat: skin, k: 0.025, rot: [0.4, 0, -0.35] });   // 上睑（内低外高的怒相）
      m.ellipsoid([0.15, -0.085, 0.33], [0.11, 0.025, 0.06], { mat: skin, k: 0.025, rot: [-0.3, 0, 0.15] });  // 下睑
      m.ribbon([[0.03, 0.09, 0.0], [0.12, 0.14, 0.0], [0.24, 0.19, 0.0], [0.33, 0.17, 0.0]].map((q) => m.surface(q, [0, 0, 1], 0.6)), [0.02, 0.035, 0.035, 0.015], 0.03, { op: 'paint', mat: 'hairBlack', up: [0, 0, 1] }); // 浓眉
      m.chain([[0.03, 0.09, 0.36], [0.14, 0.15, 0.34], [0.26, 0.2, 0.26]], [0.03, 0.04, 0.025], { mat: skin, k: 0.05 }); // 隆起的眉骨
    } else {
      if (smile > 0.7) {
        // 开怀大笑：双眼弯成月牙，眼睑被脸颊顶起
        m.ellipsoid([0.15, 0.0, 0.3], [0.09, 0.05, 0.06], { mat: skin, k: 0.03 });
        m.ellipsoid([0.15, -0.045, 0.32], [0.1, 0.045, 0.05], { mat: skin, k: 0.03 });
        const arc = [];
        for (let i = 0; i <= 6; i++) { const t = i / 6; const x = 0.06 + t * 0.19; arc.push([x, 0.0 + 0.045 * Math.sin(Math.PI * t), 0]); }
        m.ribbon(arc.map((q) => m.surface(q, [0, 0, 1], 0.6)), 0.012, 0.03, { op: 'paint', mat: 'eyeLine', up: [0, 0, 1] });
        for (let i = 0; i < arc.length - 1; i++) m.cone(m.surface(arc[i], [0, 0, 1], 0.6), m.surface(arc[i + 1], [0, 0, 1], 0.6), 0.006, 0.006, { op: 'sub', k: 0.006 });
        return;
      }
      // 慈悲垂目：眼睑饱满，眼缝细长、外眼角上挑
      const open = st === 'general' ? 0.012 : st === 'monk' || st === 'old' ? 0.008 : 0.005;
      m.ellipsoid([0.14, 0.0, 0.29], [0.085, 0.055, 0.065], { mat: skin, k: 0.02 });
      m.ellipsoid([0.14, 0.018, 0.305], [0.095, 0.04, 0.06], { mat: skin, k: 0.02, rot: [0, 0, 0.12] });
      m.ellipsoid([0.145, -0.008, 0.352], [0.088, open, 0.035], { op: 'sub', mat: 'eyeLine', k: 0.006, rot: [0, -0.15, 0.13] });
      F.S.paintCut();
      // 上眼线（彩绘）
      m.ellipsoid([0.145, -0.002, 0.35], [0.09, 0.009, 0.03], { op: 'paint', mat: 'eyeLine', rot: [0, -0.15, 0.13] });
    }
    // 眉毛（彩绘细线 / 长寿眉）
    if (opt.browPaint !== false) {
      m.ellipsoid([0.15, 0.095 + fierce * 0.0, 0.33], [0.11, 0.012 + fierce * 0.012, 0.06], { op: 'paint', mat: opt.browMat || 'brow', rot: [0, -0.3, (0.12 - fierce * 0.5)] });
    }
    if (opt.longBrows) {
      // 长眉罗汉：眉毛垂至面颊
      m.chain([[0.12, 0.1, 0.37], [0.25, 0.08, 0.34], [0.33, -0.05, 0.3], [0.36, -0.25, 0.27], [0.38, -0.42, 0.25]], [0.03, 0.035, 0.03, 0.025, 0.012], { mat: 'whiteHair', k: 0.02 });
    }
  });
  // 鼻
  const nl = fierce > 0.5 ? 1.15 : 1;
  F.cone([0, 0.03, 0.36], [0, -0.17 * nl, 0.44 + fierce * 0.02], 0.033, 0.052 + fierce * 0.015, { mat: skin, k: 0.035 });
  F.mirror((m) => {
    m.ellipsoid([0.055 + fierce * 0.02, -0.19 * nl, 0.375], [0.045 + fierce * 0.015, 0.035, 0.04], { mat: skin, k: 0.03 });
    m.ellipsoid([0.035, -0.215 * nl, 0.41], [0.017, 0.01, 0.015], { op: 'sub', k: 0.012 });
    // 法令纹
    if (fierce > 0.2 || age > 0.3 || smile > 0.5) m.cone([0.09, -0.17, 0.37], [0.13, -0.3, 0.33], 0.012, 0.01, { op: 'sub', k: 0.02 });
  });
  // 嘴
  const my = -0.29 * long;
  if (opt.mouthOpen) {
    // 张口（怒吼或大笑）
    const w = opt.mouthOpen;
    if (smile > 0.7) {
      // 大笑：口角上扬的宽口，露出上齿，两颊鼓起
      F.mirror((m) => m.ellipsoid([0.17, my + 0.07, 0.3], [0.1, 0.09, 0.08], { mat: skin, k: 0.06 }));
      F.ellipsoid([0, my - 0.02, 0.4], [0.16, 0.04, 0.06], { op: 'sub', mat: 'mouth', k: 0.01, rot: [0, 0, 0] });
      F.S.paintCut();
      F.mirror((m) => m.sphere([0.15, my + 0.03, 0.37], 0.03, { op: 'sub', mat: 'mouth', k: 0.015 }));
      F.S.paintCut();
      F.ellipsoid([0, my + 0.03, 0.38], [0.16, 0.012, 0.03], { op: 'paint', mat: 'lip', rot: [0, 0, 0] });
      F.ellipsoid([0, my - 0.07, 0.37], [0.12, 0.014, 0.03], { op: 'paint', mat: 'lip' });
    } else {
      F.ellipsoid([0, my + 0.005, 0.37], [0.13 + smile * 0.04, 0.05 + w * 0.03, 0.05], { mat: 'lip', k: 0.02 });
      F.ellipsoid([0, my - 0.01, 0.41], [0.11 + smile * 0.04, 0.022 + w * 0.045, 0.08], { op: 'sub', mat: 'mouth', k: 0.012 });
      F.S.paintCut();
    }
    if (opt.teeth) for (let i = -4; i <= 4; i++) F.box([i * 0.022, my + (smile > 0.7 ? 0.0 : 0.012 + w * 0.02), 0.375], [0.009, 0.012, 0.012], { mat: 'eyeWhite', k: 0.003, round: 0.003 }); // 上齿列
  } else {
    F.ellipsoid([0, my + 0.02, 0.37], [0.1, 0.03, 0.04], { mat: skin, k: 0.02 });
    F.ellipsoid([0, my - 0.03, 0.36], [0.08, 0.033, 0.04], { mat: skin, k: 0.02 });
    F.ellipsoid([0, my + 0.002, 0.405], [0.1, 0.006, 0.03], { op: 'sub', mat: 'mouth', k: 0.006, rot: [0, 0, 0] });
    F.S.paintCut();
    F.mirror((m) => m.sphere([0.105, my + 0.01 + smile * 0.02, 0.35], 0.018, { op: 'sub', k: 0.015 }));
    // 唇色
    F.ellipsoid([0, my - 0.008, 0.39], [0.075, 0.032, 0.035], { op: 'paint', mat: 'lip' });
  }
  // 人中
  F.ellipsoid([0, my + 0.065, 0.405], [0.018, 0.035, 0.012], { op: 'sub', k: 0.012 });

  // 耳
  const lobe = st === 'buddha' || st === 'bodhisattva' || st === 'maitreya' ? 1 : st === 'king' ? 0.6 : 0.4;
  F.mirror((m) => {
    m.ellipsoid([0.355, 0.0, 0.0], [0.06, 0.18, 0.11], { mat: skin, k: 0.03, rot: [0, -0.35, 0.08] });
    m.ellipsoid([0.39, 0.03, 0.03], [0.03, 0.12, 0.07], { op: 'sub', k: 0.02, rot: [0, -0.35, 0.08] });
    m.cone([0.37, -0.12, 0.02], [0.36, -0.12 - 0.28 * lobe, 0.05], 0.045, 0.05 + 0.01 * lobe, { mat: skin, k: 0.03 });
    if (lobe > 0.8) m.ellipsoid([0.38, -0.2 - 0.12 * lobe, 0.05], [0.012, 0.07 * lobe, 0.022], { op: 'sub', k: 0.01 });
  });

  // 头发 / 发型
  if (st === 'buddha') {
    const curls = { amp: 0.014, freq: 80 };
    // 发际线在前额较高处，向后逐渐降低
    F.ellipsoid([0, 0.12, -0.05], [0.38, 0.435, 0.462], { mat: 'hair', k: 0.015, curls, clip: [[0, 0.15, 0], [0, -1, 0.34]] });
    // 肉髻：低而宽的圆隆
    F.ellipsoid([0, 0.55, -0.07], [0.25, 0.17, 0.26], { mat: 'hair', k: 0.07, curls });
    // 髻珠
    F.sphere([0, 0.5, 0.17], 0.045, { mat: 'jewel', k: 0.008 });
    // 白毫
    F.sphere([0, 0.115, 0.372], 0.019, { mat: 'urna', k: 0.004 });
  } else if (st === 'bodhisattva') {
    // 高发髻 + 披发
    F.ellipsoid([0, 0.13, -0.05], [0.38, 0.43, 0.46], { mat: 'hair', k: 0.02, clip: [[0, 0.1, 0], [0, -1, 0.42]], folds: { dir: [1, 0, 0], freq: 90, amp: 0.006 } });
    F.ellipsoid([0, 0.6, -0.08], [0.17, 0.26, 0.18], { mat: 'hair', k: 0.08, folds: { dir: [1, 0, 0.3], freq: 70, amp: 0.008 } });
    F.mirror((m) => m.chain([[0.33, 0.1, -0.1], [0.38, -0.2, -0.12], [0.42, -0.55, -0.1], [0.48, -0.9, -0.05]], [0.08, 0.07, 0.06, 0.04], { mat: 'hair', k: 0.06, folds: { dir: [0, 0, 1], freq: 80, amp: 0.008 } }));
    F.sphere([0, 0.11, 0.375], 0.02, { mat: 'jewel', k: 0.004 });
  } else if (st === 'monk' || st === 'old' || st === 'maitreya') {
    // 光头：轻微的头型起伏
    if (age > 0.4) F.mirror((m) => m.cone([0.05, 0.3, 0.36], [0.2, 0.27, 0.3], 0.006, 0.005, { op: 'sub', k: 0.01 })); // 额纹
    if (age > 0.4) F.cone([-0.18, 0.37, 0.31], [0.18, 0.37, 0.31], 0.006, 0.006, { op: 'sub', k: 0.012 });
  } else if (st === 'king' || st === 'general') {
    F.ellipsoid([0, 0.13, -0.06], [0.38, 0.43, 0.46], { mat: 'hairBlack', k: 0.02, clip: [[0, 0.28, 0.3], [0, -1, 0.4]], folds: { dir: [1, 0.2, 0], freq: 80, amp: 0.006 } });
  }

  // 胡须
  if (opt.beard) {
    const bm = opt.beardMat || 'hairBlack';
    // 八字胡
    F.mirror((m) => m.chain([[0.02, my + 0.06, 0.4], [0.12, my + 0.03, 0.38], [0.2, my - 0.03, 0.33], [0.26, my - 0.1, 0.3]], [0.022, 0.025, 0.018, 0.008], { mat: bm, k: 0.015 }));
    if (opt.beard > 1) {
      // 长髯
      F.ellipsoid([0, -0.52, 0.27], [0.16, 0.18, 0.08], { mat: bm, k: 0.06, folds: { dir: [1, 0, 0], freq: 110, amp: 0.008 } });
      F.cone([0, -0.55, 0.29], [0, -0.85, 0.3], 0.1, 0.03, { mat: bm, k: 0.06, folds: { dir: [1, 0, 0], freq: 110, amp: 0.008 } });
      F.mirror((m) => m.cone([0.24, -0.25, 0.2], [0.15, -0.55, 0.24], 0.05, 0.07, { mat: bm, k: 0.05, folds: { dir: [0, 1, 0], freq: 60, amp: 0.006 } }));
    }
  }
  if (age > 0.5 && !opt.beard) {
    // 老者面部的皱纹
    F.mirror((m) => {
      m.cone([0.24, 0.03, 0.27], [0.28, -0.04, 0.24], 0.005, 0.004, { op: 'sub', k: 0.008 });
      m.cone([0.235, 0.0, 0.28], [0.29, -0.01, 0.23], 0.005, 0.004, { op: 'sub', k: 0.008 });
    });
  }
}

// ---------- 手 ----------
/**
 * 手部局部坐标：手腕在原点，手指指向 +z，手背朝 +y，拇指在 +x（右手）。
 * pose: 'flat'（平掌）| 'fist'（握拳）| 'hold'（握持圆柱，孔沿 x 轴）| 'mudra'（说法印，拇指食指相捻）| 'point'
 */
export function hand(F, pose = 'flat', mat = 'skin', o = {}) {
  const k = 0.01;
  // 掌：厚实饱满
  F.ellipsoid([0, 0, 0.05], [0.04, 0.017, 0.048], { mat, k: 0.012 });
  F.ellipsoid([0, 0.003, 0.015], [0.036, 0.018, 0.032], { mat, k: 0.012 });
  F.ellipsoid([0.012, -0.008, 0.035], [0.028, 0.014, 0.03], { mat, k: 0.012 }); // 大鱼际
  const fingers = [[-0.03, 0.05], [-0.011, 0.058], [0.008, 0.056], [0.027, 0.05]]; // x, 长度（小指→食指）
  if (pose === 'flat' || pose === 'mudra' || pose === 'point' || pose === 'abhaya') {
    fingers.forEach(([x, L], i) => {
      const curl = pose === 'mudra' && i === 3 ? 0.9 : (o.curl ?? 0.15) * (1 + (3 - i) * 0.15) * (pose === 'point' && i < 3 ? 6 : 1);
      const base = [x, 0.0, 0.09];
      const mid = [x * 1.02, -curl * 0.02, 0.09 + L * 0.55];
      const tip = [x * 1.04, -curl * 0.06, 0.09 + L * (1 - curl * 0.35)];
      F.chain([base, mid, tip], [0.0105, 0.0095, 0.0075], { mat, k });
      F.sphere(mid, 0.0098, { mat, k }); // 指节
    });
    const tc = pose === 'mudra' ? [0.032, -0.02, 0.11] : [0.066, -0.004, 0.085];
    F.chain([[0.03, -0.006, 0.025], [0.052, -0.008, 0.058], tc], [0.014, 0.011, 0.009], { mat, k });
  } else if (pose === 'fist' || pose === 'hold') {
    const r = pose === 'hold' ? 0.022 : 0.012;
    fingers.forEach(([x, L], i) => {
      const base = [x, 0.0, 0.09];
      const knuckle = [x, 0.0, 0.105 + L * 0.15];
      const mid = [x, -0.02 - r * 0.6, 0.108 + L * 0.2 + r * 0.4];
      const tip = [x, -0.03 - r * 1.2, 0.08];
      F.chain([base, knuckle, mid, tip], [0.011, 0.0105, 0.0095, 0.008], { mat, k });
    });
    F.chain([[0.03, -0.01, 0.025], [0.058, -0.02, 0.065], [0.02, -0.035 - r * 0.3, 0.105]], [0.014, 0.012, 0.01], { mat, k });
  }
}

/**
 * 双段手臂（简易 IK）。返回 {elbow, wrist}。
 * pole：肘部朝向。sleeve：宽袖下垂量。
 */
export function arm(F, shoulder, wrist, o = {}) {
  const Lu = o.upper ?? 0.27, Lf = o.fore ?? 0.25;
  const d = V.sub(wrist, shoulder);
  let L = V.len(d);
  const maxL = (Lu + Lf) * 0.999;
  if (L > maxL) { wrist = V.add(shoulder, V.mul(V.norm(d), maxL)); L = maxL; }
  const a = (Lu * Lu - Lf * Lf + L * L) / (2 * L);
  const h = Math.sqrt(Math.max(Lu * Lu - a * a, 0));
  const dn = V.norm(d);
  let pole = V.norm(o.pole || [0, -1, -0.3]);
  pole = V.norm(V.sub(pole, V.mul(dn, V.dot(pole, dn))));
  const elbow = V.add(V.add(shoulder, V.mul(dn, a)), V.mul(pole, h));
  const mat = o.mat || 'robe';
  const ru = o.ru ?? 0.07, rf = o.rf ?? 0.055, rw = o.rw ?? 0.04;
  F.cone(shoulder, elbow, ru, rf * 1.05, { mat, k: 0.04, folds: o.folds });
  F.cone(elbow, wrist, rf, rw, { mat: o.foreMat || mat, k: 0.03, folds: o.folds });
  if (o.sleeve) {
    // 宽大的垂袖：从小臂向下垂坠
    const s = o.sleeve;
    const mid = V.lerp(elbow, wrist, 0.55);
    const low = V.add(mid, [0, -s, 0.0]);
    F.cone(V.lerp(elbow, wrist, 0.2), low, rf * 1.3, rf * 0.9, { mat, k: 0.05, folds: { dir: V.norm(V.sub(wrist, elbow)), freq: 60, amp: 0.006 } });
    F.ellipsoid(V.lerp(mid, low, 0.6), [rf * 1.6, s * 0.55, rf * 1.4], { mat, k: 0.05, R: lookRot(V.sub(wrist, elbow), [0, 1, 0]), folds: { dir: [1, 0, 0.4], freq: 55, amp: 0.007 } });
  }
  return { elbow, wrist };
}

// 前臂末端的手：根据小臂方向放置
export function handAt(F, wrist, dir, up, pose, mat, s = 1, o = {}) {
  const Rc = lookRot(dir, up);
  const R = m3mul(F.R, F.mx < 0 ? mirrorM(Rc) : Rc);
  const H = new Frame(F.S, F.p(wrist), F.s * s, R, F.mx * (o.left ? -1 : 1));
  hand(H, pose, mat, o);
  return H;
}

// 念珠（沿圆环排列的珠子）
export function beads(F, c, R0, r, n, rot, mat = 'beads') {
  const Rm = rotMat(rot[0], rot[1], rot[2]);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = m3v(Rm, [Math.cos(a) * R0, 0, Math.sin(a) * R0]);
    F.sphere(V.add(c, p), r, { mat, k: 0.002 });
  }
}

// ---------- 衣纹 ----------
// 把一组起点沿 outward 方向投影到已塑造的表面上，连成凸起的衣纹线
export function ridge(F, pts, outward, r, o = {}) {
  const q = pts.map((p) => {
    const s = F.surface(p, outward, o.far ?? 1.2);
    const lo = o.lift ?? 0;
    return [s[0] + outward[0] * lo, s[1] + outward[1] * lo, s[2] + outward[2] * lo];
  });
  const sm = spline(q, o.segs ?? 3);
  const radii = sm.map((_, i) => {
    const t = i / (sm.length - 1);
    const taper = o.taper === false ? 1 : Math.min(1, Math.sin(Math.PI * t) * 1.8 + 0.25);
    return r * taper;
  });
  F.chain(sm, radii, { mat: o.mat || 'robe', k: o.k ?? r * 1.2 });
  return sm;
}
// 阴刻衣纹（凹槽）
export function groove(F, pts, outward, r, o = {}) {
  const q = pts.map((p) => F.surface(p, outward, o.far ?? 1.2));
  const sm = spline(q, o.segs ?? 3);
  for (let i = 0; i < sm.length - 1; i++) F.cone(sm[i], sm[i + 1], r, r, { op: 'sub', k: o.k ?? r });
  return sm;
}
