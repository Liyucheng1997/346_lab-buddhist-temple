// 坐佛身躯（结跏趺坐），按日式/汉式金铜佛常见的“通肩宽、胸腹饱满、双领下垂袈裟”塑造。
// 与头部相同的思路：躯干与盘腿是连续的解析场；袈裟是覆在身体上的一层“布”（等距外壳 ∩ 衣缘区域），
// 衣缘自然形成一道干净的台阶并加一条宽边（不再用一串胶囊模拟衣边）；衣纹是管状起伏的位移。
// 局部单位：盘坐底面 y=0，面朝 +z，造像的右侧为 -x。
import { V, lookRot, m3mul, mirrorM, Frame } from './anatomy.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const bell2 = (a, b) => { const u = 1 - a * a - b * b; return u > 0 ? u * u : 0; };
function smin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
function smax(a, b, k) { return -smin(-a, -b, k); }
function sdEll(x, y, z, rx, ry, rz) {
  const ax = x / rx, ay = y / ry, az = z / rz;
  const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
  const bx = ax / rx, by = ay / ry, bz = az / rz;
  const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
  return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
}
function sdCapsule(x, y, z, a, b, ra, rb) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const px = x - a[0], py = y - a[1], pz = z - a[2];
  const h = clamp01((px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz));
  const dx = px - bx * h, dy = py - by * h, dz = pz - bz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * h);
}
function table(pts) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), m = pts.length;
  // 分段 smoothstep 插值（单调、C1）
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[m - 1]) return ys[m - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
    return ys[i] + (ys[i + 1] - ys[i]) * t * t * (3 - 2 * t);
  };
}
// 单点缓存
function memo(fn) {
  let a = NaN, b = NaN, c = NaN, v = 0;
  return (x, y, z) => { if (x !== a || y !== b || z !== c) { a = x; b = y; c = z; v = fn(x, y, z); } return v; };
}
// 管状衣纹剖面：圆润的脊 + 尖窄的谷（s 为相位，周期 1）
// （C1 连续，谷底不出尖点，避免网格撕裂）
function tube(s) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * s); const v = 1 - w; return 1 - v * v - 0.55; }

// ---------------- 躯干（肉身） ----------------
const TW = table([[0.16, 0.235], [0.26, 0.222], [0.34, 0.212], [0.42, 0.212], [0.5, 0.222], [0.55, 0.22], [0.59, 0.19], [0.625, 0.13], [0.655, 0.085]]);
const TZf = table([[0.16, 0.1], [0.24, 0.142], [0.32, 0.156], [0.38, 0.146], [0.44, 0.128], [0.5, 0.138], [0.56, 0.128], [0.61, 0.096], [0.672, 0.055]]);
const TZb = table([[0.16, -0.17], [0.4, -0.152], [0.55, -0.14], [0.62, -0.1], [0.655, -0.06]]);
const TY0 = 0.16, TY1 = 0.655;

function torsoLoft(x, y, z) {
  const yc = y < TY0 ? TY0 : y > TY1 ? TY1 : y;
  const W = TW(yc), Zf = TZf(yc), Zb = TZb(yc), n = 2.4;
  const z0 = Zb + 0.5 * (Zf - Zb);
  const u = Math.abs(x) / W, Dz = z > z0 ? Zf - z0 : z0 - Zb, v = (z - z0) / Dz;
  const un1 = Math.pow(u, n - 1);
  const G = un1 * u + v * v;
  const gx = n * un1 / W, gz = 2 * v / Dz;
  let d = (G - 1) / Math.sqrt(gx * gx + gz * gz + 1e-4);
  if (y < TY0) d = Math.max(d, TY0 - y);
  if (y > TY1) d = Math.max(d, y - TY1);
  return d;
}

const NECK_A = [0, 0.6, -0.012], NECK_B = [0, 0.8, 0.012];
function torsoSkin(x, y, z) {
  let d = torsoLoft(x, y, z);
  const ax = Math.abs(x);
  // 胸肌（柔和的两块隆起，下缘略清楚）
  if (z > 0.04 && y > 0.4 && y < 0.62) d -= 0.016 * bell2((ax - 0.105) / 0.125, (y - 0.525) / 0.085) * ss(0.04, 0.1, z);
  // 肩
  d = smin(d, sdCapsule(ax, y, z, [0.03, 0.592, -0.03], [0.17, 0.528, -0.022], 0.06, 0.072), 0.07); // 斜方肌：自颈根斜落到肩头
  d = smin(d, sdEll(ax - 0.2, y - 0.512, z + 0.012, 0.076, 0.084, 0.08), 0.06);
  // 颈：短而粗，三道蚕节纹
  let dn = sdCapsule(x, y, z, NECK_A, NECK_B, 0.074, 0.066);
  if (y > 0.64 && y < 0.76) {
    for (const yr of [0.676, 0.706]) {
      const yy = yr - 0.012 * (1 - Math.min(1, (x / 0.075) ** 2)) * (z > 0 ? 1 : 0.2);
      dn += 0.0038 * Math.exp(-(((y - yy) / 0.0052) ** 2));
    }
  }
  d = smin(d, dn, 0.05);
  return d;
}

// 袈裟开口（双领下垂）：正面 |x| < EX(y) 的区域露出胸膛与僧祇支
const EX = table([[0.22, 0.02], [0.3, 0.045], [0.38, 0.075], [0.46, 0.102], [0.53, 0.112], [0.59, 0.104], [0.63, 0.088], [0.7, 0.084]]);
function robeOpen(x, y, z) {
  const o = EX(y) - Math.abs(x);
  const front = ss(-0.04, 0.05, z);
  let r = o * front - 0.05 * (1 - front);
  r = Math.max(r, y - 0.668); // 衣领只到颈根
  return r;
}

// ---------------- 盘腿（全部覆以袈裟） ----------------
function lapRaw(x, y, z) {
  const ax = Math.abs(x);
  // 主体：宽扁的“圆角方墩”
  const qx = ax / 0.56, qy = (y - 0.1) / 0.112, qz = (z - 0.07) / 0.31;
  const G = Math.pow(qx, 3.2) + qy * qy + Math.pow(Math.abs(qz), 2.6);
  let d = (Math.pow(G, 1 / 2.6) - 1) * 0.12;
  // 膝
  d = smin(d, sdEll(ax - 0.425, y - 0.118, z - 0.2, 0.13, 0.11, 0.13), 0.09);
  // 交叠的双胫（右胫在上）
  d = smin(d, sdCapsule(x, y, z, [-0.4, 0.15, 0.25], [0.12, 0.192, 0.31], 0.085, 0.072), 0.07);
  d = smin(d, sdCapsule(x, y, z, [0.4, 0.118, 0.27], [-0.1, 0.12, 0.34], 0.078, 0.066), 0.06);
  // 悬裳：衣摆垂覆座沿
  d = smin(d, sdEll(x, y - 0.03, z - 0.33, 0.4, 0.045, 0.085), 0.05);
  return d;
}
function lapFolds(x, y, z) {
  // 以腹前为圆心的弧形衣纹，在膝盖与外缘渐隐；悬裳正面为竖向衣纹
  const ax = Math.abs(x);
  const top = ss(0.1, 0.17, y);
  const r = Math.sqrt(x * x * 0.55 + (z + 0.04) * (z + 0.04));
  const m1 = top * ss(0.2, 0.3, r) * (1 - ss(0.5, 0.6, r)) * (1 - 0.6 * ss(0.32, 0.5, ax));
  let D = 0.009 * m1 * tube(r * 16 + 0.3 * Math.sin(x * 8));
  // 双胫正面：顺着小腿方向的横向衣纹，层层叠叠
  const front = ss(0.26, 0.34, z) * ss(0.045, 0.07, y) * (1 - ss(0.17, 0.21, y)) * (1 - ss(0.4, 0.5, ax));
  const ph = y * 24 + 0.9 * Math.sin(x * 4.2 + 0.6) + 0.25 * Math.sin(x * 11);
  D += 0.0068 * front * tube(ph);
  // 悬裳下缘：少量竖向垂褶
  const hem = ss(0.33, 0.39, z) * (1 - ss(0.035, 0.06, y)) * (1 - ss(0.28, 0.38, ax));
  D += 0.007 * hem * tube(x * 11 + 0.3 * Math.sin(x * 19));
  return D;
}

// ---------------- 手 ----------------
/**
 * 手部局部坐标：手腕在原点，四指指向 +z，手背 +y，拇指在 +x。
 * pose.curl：四指 [食,中,无名,小] 的弯曲（0 伸直 → 1 握拳）；pose.thumb：拇指方向与弯曲
 */
function hand(F, pose = {}, mat = 'skin') {
  const k = 0.012;
  // 掌、腕、鱼际
  F.box([0, 0, 0.05], [0.037, 0.011, 0.043], { mat, k: 0.018, round: 0.011 });
  F.ellipsoid([0, 0.002, -0.004], [0.031, 0.02, 0.03], { mat, k: 0.025 });
  F.ellipsoid([0.02, -0.008, 0.03], [0.022, 0.014, 0.03], { mat, k: 0.02, rot: [0, 0.4, 0] });
  F.ellipsoid([-0.021, -0.005, 0.045], [0.015, 0.012, 0.036], { mat, k: 0.02 });
  const fing = [[0.0265, 0.064, 0.0112], [0.009, 0.071, 0.0116], [-0.0085, 0.067, 0.0112], [-0.0255, 0.054, 0.0102]];
  const curl = pose.curl || [0.15, 0.18, 0.22, 0.26];
  const spread = pose.spread ?? 0.03;
  fing.forEach(([x, L, r], i) => {
    const c = curl[i];
    // 三节：近节 / 中节 / 远节，逐节向掌心（-y）弯曲
    const segs = [L * 0.46, L * 0.31, L * 0.25], ang = [c * 0.9, c * 1.5, c * 1.0];
    const yaw = (1.5 - i) * spread;
    let p = [x, 0.0, 0.088], a = 0;
    const pts = [p];
    for (let s = 0; s < 3; s++) {
      a += ang[s];
      const dir = [Math.sin(yaw) * Math.cos(a), -Math.sin(a), Math.cos(yaw) * Math.cos(a)];
      p = V.add(p, V.mul(dir, segs[s]));
      pts.push(p);
    }
    F.cone(pts[0], pts[1], r * 1.04, r * 0.96, { mat, k });
    F.cone(pts[1], pts[2], r * 0.96, r * 0.88, { mat, k: 0.004 });
    F.cone(pts[2], pts[3], r * 0.88, r * 0.72, { mat, k: 0.003 });
  });
  // 拇指：两节，自鱼际斜出
  const th = pose.thumb || { dir: [0.75, -0.25, 0.62], bend: 0.3 };
  const t0 = [0.03, -0.006, 0.024];
  const d0 = V.norm(th.dir);
  const t1 = V.add(t0, V.mul(d0, 0.036));
  const d1 = V.norm(V.add(d0, [-th.bend * 0.6, -th.bend * 0.3, th.bend * 0.2]));
  const t2 = V.add(t1, V.mul(d1, 0.03));
  F.cone(t0, t1, 0.0145, 0.0125, { mat, k: 0.016 });
  F.cone(t1, t2, 0.0125, 0.0095, { mat, k: 0.01 });
  return { tips: null };
}
function handAt(F, wrist, dir, up, pose, s = 1, left = false) {
  const Rc = lookRot(dir, up);
  const R = m3mul(F.R, F.mx < 0 ? mirrorM(Rc) : Rc);
  const H = new Frame(F.S, F.p(wrist), F.s * s, R, F.mx * (left ? -1 : 1));
  hand(H, pose);
  return H;
}

// 两段臂（袖）：IK 求肘，袖子宽大下垂，腕口一道袖缘
function sleeveArm(F, shoulder, wrist, o = {}) {
  const Lu = o.upper ?? 0.27, Lf = o.fore ?? 0.25;
  const d = V.sub(wrist, shoulder);
  let L = V.len(d);
  if (L > (Lu + Lf) * 0.999) { wrist = V.add(shoulder, V.mul(V.norm(d), (Lu + Lf) * 0.999)); L = (Lu + Lf) * 0.999; }
  const a = (Lu * Lu - Lf * Lf + L * L) / (2 * L), h = Math.sqrt(Math.max(Lu * Lu - a * a, 0));
  const dn = V.norm(d);
  let pole = V.norm(o.pole || [1, -0.4, -0.6]);
  pole = V.norm(V.sub(pole, V.mul(dn, V.dot(pole, dn))));
  const elbow = V.add(V.add(shoulder, V.mul(dn, a)), V.mul(pole, h));
  const mat = 'robe';
  F.cone(shoulder, elbow, 0.072, 0.064, { mat, k: 0.05 });
  F.cone(elbow, wrist, 0.064, 0.054, { mat, k: 0.04 });
  // 下垂的袖身
  const fd = V.norm(V.sub(wrist, elbow));
  const mid = V.lerp(elbow, wrist, 0.55);
  const sag = o.sag ?? 0.07;
  F.ellipsoid(V.add(mid, [0, -sag * 0.55, -0.005]), [0.07, sag * 0.9 + 0.03, V.len(V.sub(wrist, elbow)) * 0.42], { mat, k: 0.05, R: lookRot(fd, [0, 1, 0]) });
  // 袖缘（宽边）
  const cuff = V.add(wrist, V.mul(fd, -0.012));
  const perp = V.norm(Math.abs(fd[0]) < 0.9 ? V.cross(fd, [1, 0, 0]) : V.cross(fd, [0, 1, 0]));
  F.cylinder(cuff, 0.06, 0.011, { mat: 'robeEdge', k: 0.012, round: 0.008, R: lookRot(perp, fd) });
  return { elbow, wrist, fd };
}

/**
 * 坐佛身躯。mudra：
 *   varada 与愿印（右手垂于膝前、掌心向外；左手于腹前执衣角——即参考图的释迦像）
 *   earth 触地印 | dhyana 禅定印 | bowl 托钵 | lotus 托莲 | teach 说法印
 */
export function buddhaBody(F, mudra = 'dhyana') {
  const S = F.S;
  const tSkin = memo(torsoSkin);
  // 肉身（胸、颈）
  F.field((x, y, z) => tSkin(x, y, z) / 1.3, [0, 0.45, 0], 0.45, { mat: 'skin', k: 0.002 });
  // 僧祇支（腹前内衣）+ 束带
  F.field((x, y, z) => {
    let d = tSkin(x, y, z) - 0.008;
    d = smax(d, y - 0.392, 0.008);
    if (y > 0.33 && y < 0.4 && z > 0) d -= 0.0055 * ss(0.336, 0.346, y) * (1 - ss(0.378, 0.388, y));
    return d / 1.3;
  }, [0, 0.3, 0.05], 0.3, { mat: 'robeIn', k: 0.002, mbias: 0.004 });
  // 袈裟（躯干部分）：外壳 ∩ 开口外侧，衣缘一道宽边
  F.field((x, y, z) => {
    const base = tSkin(x, y, z) - 0.017;
    const op = robeOpen(x, y, z);
    let d = smax(base, op, 0.014);
    const q = -op; // 距衣缘（向袈裟内）
    if (q > -0.01 && q < 0.05 && z > -0.02) d -= 0.006 * ss(0.002, 0.012, q) * (1 - ss(0.026, 0.038, q));
    // 腋下几道斜向衣纹（宽而缓）
    if (z > -0.08 && y > 0.32 && y < 0.56) {
      const ax = Math.abs(x);
      const m = ss(0.15, 0.19, ax) * ss(0.32, 0.4, y) * (1 - ss(0.48, 0.56, y)) * (1 - ss(0.24, 0.3, ax));
      d -= 0.007 * m * Math.sin((y * 0.8 + ax * 1.1) * 30) ** 2;
    }
    return d / 1.3;
  }, [0, 0.42, 0], 0.5, { mat: 'robe', k: 0.002, mbias: 0.006 });
  // 盘腿
  F.field((x, y, z) => (lapRaw(x, y, z) - lapFolds(x, y, z)) / 1.35, [0, 0.12, 0.08], 0.7, { mat: 'robe', k: 0.03 });

  // ---------------- 手臂与手印 ----------------
  const shL = [0.2, 0.508, -0.02];
  const Fm = F.mirrored(); // 造像右侧（-x）
  const lapHands = mudra === 'dhyana' || mudra === 'bowl' || mudra === 'lotus';
  const extra = [];
  const HS = 1.2; // 手的放大系数（佛像手大而丰腴）
  if (mudra === 'varada') {
    // 右手：垂于右膝前，掌心向外，指尖向下
    const r = sleeveArm(Fm, shL, [0.34, 0.385, 0.345], { pole: [0.6, -0.3, -0.7], sag: 0.05 });
    handAt(Fm, r.wrist, [0.05, -1, 0.3], [0, 0.25, -1], { curl: [0.05, 0.08, 0.14, 0.22], spread: 0.04, thumb: { dir: [0.55, -0.25, 0.8], bend: 0.12 } }, HS);
    extra.push([[-0.47, 0.12, 0.2], [-0.24, 0.39, 0.5]]);
    // 左手：腹前执衣角（虚拳）
    const l = sleeveArm(F, shL, [0.15, 0.335, 0.24], { pole: [0.6, -0.6, -0.5], sag: 0.07 });
    handAt(F, l.wrist, [-0.2, 0.12, 1], [1, 0.25, 0], { curl: [0.62, 0.68, 0.72, 0.76], spread: 0.0, thumb: { dir: [0.15, -0.5, 0.85], bend: 0.45 } }, HS, true);
    // 被握住的衣角：自拳中垂下，搭在腿上
    F.ribbon([[0.11, 0.335, 0.31], [0.13, 0.29, 0.335], [0.15, 0.24, 0.35], [0.17, 0.2, 0.36]], [0.022, 0.032, 0.042, 0.05], 0.009, { mat: 'robe', k: 0.012, up: [0, 0, 1] });
    extra.push([[0.02, 0.18, 0.18], [0.27, 0.42, 0.42]]);
  } else if (mudra === 'earth') {
    const r = sleeveArm(Fm, shL, [0.37, 0.27, 0.33], { pole: [1, 0.2, -0.6], sag: 0.05 });
    handAt(Fm, r.wrist, [0.0, -1, 0.35], [0, 0.2, 1], { curl: [0.12, 0.14, 0.18, 0.22] }, HS);
    extra.push([[-0.48, 0.05, 0.2], [-0.25, 0.36, 0.5]]);
  } else if (mudra === 'teach') {
    sleeveArm(Fm, shL, [0.2, 0.43, 0.24], { pole: [1, -1, -0.2], sag: 0.06 });
    handAt(Fm, [0.2, 0.43, 0.24], [-0.15, 0.95, 0.2], [0, 0, 1], { curl: [0.9, 0.15, 0.12, 0.15], thumb: { dir: [0.3, -0.3, 0.9], bend: 0.6 } }, HS);
    extra.push([[-0.31, 0.37, 0.14], [-0.1, 0.64, 0.38]]);
  }
  if (mudra !== 'varada') {
    const lw = lapHands ? [0.125, 0.272, 0.2] : [0.105, 0.27, 0.205];
    sleeveArm(F, shL, lw, { pole: [1, -0.4, -0.6], sag: 0.07 });
    handAt(F, lw, [-1, 0.0, 0.12], [0, -1, 0], { curl: [0.08, 0.08, 0.1, 0.12], spread: 0.02 }, HS, true);
    if (lapHands) {
      const rw = [-0.13, 0.29, 0.205];
      sleeveArm(Fm, shL, [0.13, 0.29, 0.205], { pole: [1, -0.4, -0.6], sag: 0.07 });
      handAt(F, rw, [1, 0.0, 0.12], [0, -1, 0], { curl: [0.08, 0.08, 0.1, 0.12], spread: 0.02 }, HS);
    }
  }
  const handBox = lapHands ? [[-0.29, 0.2, 0.08], [0.29, 0.38, 0.42]] : [[-0.05, 0.18, 0.08], [0.3, 0.38, 0.4]];
  return { handBox: mudra === 'varada' ? null : handBox, extraBoxes: extra, lapHands };
}
