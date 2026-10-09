// 佛头：方圆丰满的面相、新月眉、垂目、小口，石青螺发与低平肉髻。
// 与旧版“椭球堆砌”不同，面部是一个连续的解析场：
//   正面轮廓 W(y) + 侧面轮廓 Zf/Zb(y) 放样出“方圆”的脸型，五官作为平滑位移叠加在其上，
//   因此没有体块之间的接缝与鼓包；细线（眉、眼线、唇色、须）交给着色器逐像素绘制（faceDecal.js）。
// 局部单位：眼线 y=0，下颌底 y≈-0.585，发际 y≈0.26，面朝 +z。
import { CURVES, curveY } from './faceCurves.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const bell = (t) => { const u = 1 - t * t; return u > 0 ? u * u : 0; };
const bell2 = (a, b) => { const u = 1 - a * a - b * b; return u > 0 ? u * u : 0; };
function smin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
function smax(a, b, k) { return -smin(-a, -b, k); }
// 保零的软最大值（两个位移都为 0 时结果也为 0，避免在作用区边界留下台阶）
const smaxPos = (a, b, k) => 0.5 * (a + b + Math.sqrt((a - b) * (a - b) + k * k)) - 0.5 * k;
function ellipsoid(x, y, z, r) {
  const ax = x / r[0], ay = y / r[1], az = z / r[2];
  const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
  const bx = ax / r[0], by = ay / r[1], bz = az / r[2];
  const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
  return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(r[0], r[1], r[2]);
}

// 单调三次（PCHIP）插值表，预采样为查找表以加速求值
function table(pts, n = 1024) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), m = pts.length;
  const d = [], t = new Array(m).fill(0);
  for (let i = 0; i < m - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  t[0] = d[0]; t[m - 1] = d[m - 2];
  for (let i = 1; i < m - 1; i++) t[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < m - 1; i++) {
    if (d[i] === 0) { t[i] = t[i + 1] = 0; continue; }
    const a = t[i] / d[i], b = t[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * d[i]; t[i + 1] = k * b * d[i]; }
  }
  const herm = (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[m - 1]) return ys[m - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], u = (x - xs[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * t[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * t[i + 1];
  };
  const x0 = xs[0], x1 = xs[m - 1], lut = new Float64Array(n + 1);
  for (let i = 0; i <= n; i++) lut[i] = herm(x0 + (x1 - x0) * i / n);
  const sc = n / (x1 - x0);
  return (x) => {
    let f = (x - x0) * sc;
    if (f <= 0) return lut[0];
    if (f >= n) return lut[n];
    const i = f | 0; f -= i;
    return lut[i] + (lut[i + 1] - lut[i]) * f;
  };
}

// ---------------- 脸型放样 ----------------
const Y0 = -0.585, Y1 = 0.42;
const LW = table([[-0.585, 0.03], [-0.565, 0.145], [-0.535, 0.222], [-0.49, 0.288], [-0.42, 0.345], [-0.32, 0.388], [-0.18, 0.41], [0.0, 0.414], [0.15, 0.407], [0.3, 0.372], [0.42, 0.3]]);
const LZf = table([[-0.585, 0.2], [-0.555, 0.3], [-0.51, 0.345], [-0.45, 0.362], [-0.38, 0.356], [-0.3, 0.372], [-0.2, 0.374], [-0.1, 0.37], [0.0, 0.362], [0.1, 0.372], [0.2, 0.36], [0.3, 0.33], [0.42, 0.27]]);
const LZb = table([[-0.585, 0.12], [-0.55, 0.03], [-0.5, -0.07], [-0.42, -0.16], [-0.3, -0.22], [-0.1, -0.25], [0.42, -0.25]]);
const LN = table([[-0.585, 2.0], [-0.47, 2.3], [-0.3, 2.75], [0.0, 2.9], [0.42, 2.6]]);

function loft(x, y, z) {
  const yc = y < Y0 ? Y0 : y > Y1 ? Y1 : y;
  const W = LW(yc), Zf = LZf(yc), Zb = LZb(yc), n = LN(yc);
  const z0 = Zb + 0.55 * (Zf - Zb);
  const ax = Math.abs(x);
  const u = ax / W;
  const Dz = z > z0 ? Zf - z0 : z0 - Zb;
  const v = (z - z0) / Dz;
  const un1 = Math.pow(u, n - 1);
  const G = un1 * u + v * v;
  const gx = n * un1 / W, gz = 2 * v / Dz;
  let d = (G - 1) / Math.sqrt(gx * gx + gz * gz + 1e-4);
  if (y < Y0) d = Math.max(d, Y0 - y);
  if (y > Y1) d = Math.max(d, y - Y1);
  return d;
}

// ---------------- 五官（相对放样曲面的法向位移，正为隆起） ----------------
const NH = table([[-0.238, 0.0], [-0.222, 0.045], [-0.204, 0.08], [-0.182, 0.094], [-0.15, 0.088], [-0.06, 0.064], [0.02, 0.04], [0.07, 0.018], [0.11, 0.0]]);
const NW = table([[-0.236, 0.074], [-0.205, 0.072], [-0.175, 0.06], [-0.13, 0.044], [-0.06, 0.032], [0.04, 0.033], [0.11, 0.05]]);

function features(ax, y) {
  let D = 0;
  // 眼窝：眉棱之下整体内收，眉棱处是一道清晰的转折
  const by = curveY(CURVES.brow, Math.min(Math.max(ax, 0.03), 0.34));
  const sd = by - y;
  const hx = bell((ax - 0.185) / 0.175);
  if (hx > 0 && sd > -0.02) D -= 0.044 * hx * ss(-0.008, 0.022, sd) * (1 - ss(0.08, 0.22, sd));
  // 眼球与上睑：饱满的弧面，眼缝在其下缘
  const ex = (ax - 0.185) / 0.118, ey = (y + 0.004) / 0.078, er = ex * ex + ey * ey;
  if (er < 1) D += 0.037 * Math.pow(1 - er, 1.5);
  // 眼缝 + 上睑缘 + 下睑
  if (ax > 0.07 && ax < 0.3) {
    const s2 = y - curveY(CURVES.slit, ax);
    const tx = ss(0.078, 0.1, ax) * (1 - ss(0.265, 0.292, ax));
    D -= 0.012 * tx * Math.exp(-((s2 / 0.0062) ** 2));
    D += 0.0045 * tx * Math.exp(-(((s2 - 0.011) / 0.0075) ** 2));
    D += 0.003 * tx * Math.exp(-(((s2 + 0.016) / 0.01) ** 2));
  }
  // 丰颊
  D += 0.024 * bell2((ax - 0.2) / 0.18, (y + 0.17) / 0.17);
  // 鼻：鼻梁窄而挺，鼻头圆润，鼻翼饱满
  if (ax < 0.13 && y > -0.25 && y < 0.12) {
    const wn = NW(y), u = ax / wn;
    let dn = u < 1 ? NH(y) * Math.pow(1 - u * u, 1.15) : 0;
    dn += 0.014 * bell2(ax / 0.042, (y + 0.18) / 0.035); // 鼻头
    const a1 = (ax - 0.062) / 0.036, a2 = (y + 0.2) / 0.03, ar = a1 * a1 + a2 * a2;
    const da = ar < 1 ? 0.04 * Math.pow(1 - ar, 1.1) : 0;
    D += smaxPos(dn, da, 0.012);
    // 鼻翼沟（只在鼻翼外上缘）
    if (ar < 2.2 && ax > 0.062) D -= 0.004 * Math.exp(-(((Math.sqrt(ar) - 1.0) / 0.14) ** 2)) * ss(0.062, 0.085, ax) * ss(-0.215, -0.19, y);
  }
  // 人中
  if (y < -0.215 && y > -0.275) D -= 0.004 * Math.exp(-((ax / 0.012) ** 2)) * bell((y + 0.245) / 0.03);
  // 口唇
  if (ax < 0.14 && y < -0.24 && y > -0.4) {
    const xx = Math.min(ax, 0.1);
    const my = curveY(CURVES.mouth, xx), ty = curveY(CURVES.lipTop, xx), bt = curveY(CURVES.lipBot, xx);
    const tm = 1 - ss(0.082, 0.112, ax);
    const v = (y - my) / Math.max(ty - my, 0.004);
    if (v > -0.3 && v < 1.5) D += 0.017 * tm * ss(-0.15, 0.2, v) * (1 - ss(0.82, 1.12, v)) * (1 - 0.35 * v);
    const w = (my - y) / Math.max(my - bt, 0.004);
    if (w > -0.3 && w < 1.5) D += 0.021 * tm * ss(-0.15, 0.3, w) * (1 - ss(0.68, 1.12, w));
    D -= 0.011 * (1 - ss(0.094, 0.114, ax)) * Math.exp(-(((y - my) / 0.0048) ** 2));
    D -= 0.008 * Math.exp(-(((ax - 0.106) / 0.012) ** 2 + ((y - my - 0.002) / 0.013) ** 2));
  }
  // 唇下沟与下巴
  D -= 0.011 * bell(ax / 0.1) * Math.exp(-(((y + 0.372) / 0.016) ** 2));
  D += 0.022 * bell2(ax / 0.13, (y + 0.458) / 0.075);
  return D;
}

const CRAN_C = [0, 0.12, -0.075], CRAN_R = [0.405, 0.43, 0.435];
function headRaw(x, y, z) {
  let d = loft(x, y, z);
  if (z > 0.05 && d < 0.12) d -= features(Math.abs(x), y) * ss(0.08, 0.26, z);
  const dc = ellipsoid(x - CRAN_C[0], y - CRAN_C[1], z - CRAN_C[2], CRAN_R);
  return smin(d, dc, 0.07);
}
// 放样+位移不是精确距离，整体缩小以保证不高估（网格剔除依赖这一点）
const LIP = 1.35;

// ---------------- 螺发与肉髻 ----------------
const USH_C = [0, 0.48, -0.085], USH_R = [0.255, 0.215, 0.265];
const HAIR_T = 0.024; // 发层厚度
// 发际线（按绕颅心的方位角 φ，0 为正前方）
const HL = table([[0, 0.262], [0.3, 0.258], [0.55, 0.232], [0.72, 0.17], [0.86, 0.07], [0.98, -0.05], [1.1, -0.12], [1.19, -0.1], [1.3, 0.1], [1.4, 0.135], [1.62, 0.13], [1.78, -0.02], [1.95, -0.26], [3.2, -0.32]]);
const hairPhi = (x, z) => Math.abs(Math.atan2(x, z - CRAN_C[2]));
function hairVolume(x, y, z, dh) {
  const du = ellipsoid(x - USH_C[0], y - USH_C[1], z - USH_C[2], USH_R);
  return smin(dh - HAIR_T, du, 0.09);
}

export function buddhaHead(F, opt = {}) {
  const skin = opt.skin || 'skin';
  const curlR = opt.curlR ?? 0.021;

  // 头部场（面 + 颅），单点缓存供发层复用
  let cx = NaN, cy = NaN, cz = NaN, cv = 0;
  const head = (x, y, z) => {
    if (x !== cx || y !== cy || z !== cz) { cx = x; cy = y; cz = z; cv = headRaw(x, y, z); }
    return cv;
  };
  F.field((x, y, z) => head(x, y, z) / LIP, [0, 0, 0.02], 0.72, { mat: skin, k: 0.002 });

  // ---------------- 发层（与面部同一场，发际处形成一道整齐的台阶） ----------------
  const hairD = (x, y, z) => {
    const v = hairVolume(x, y, z, head(x, y, z));
    return smax(v, (HL(hairPhi(x, z)) - y) * 0.8, 0.008);
  };
  F.field((x, y, z) => hairD(x, y, z) / LIP, [0, 0.2, -0.08], 0.75, { mat: 'hair', k: 0.002, mbias: 0.008 });

  // 螺发颗粒：在发层表面取大量候选点，从发际线开始逐行“贪心”铺排，形成整齐的行列
  const vol = (x, y, z) => hairVolume(x, y, z, headRaw(x, y, z));
  const grad = (p) => {
    const e = 1e-3;
    const g = [vol(p[0] + e, p[1], p[2]) - vol(p[0] - e, p[1], p[2]), vol(p[0], p[1] + e, p[2]) - vol(p[0], p[1] - e, p[2]), vol(p[0], p[1], p[2] + e) - vol(p[0], p[1], p[2] - e)];
    const l = Math.hypot(g[0], g[1], g[2]) || 1;
    return [g[0] / l, g[1] / l, g[2] / l];
  };
  const C = [0, 0.18, -0.08];
  const N = 16000, ga = Math.PI * (3 - Math.sqrt(5));
  const cand = [];
  for (let i = 0; i < N; i++) {
    const dy = 1 - (2 * (i + 0.5)) / N, rr = Math.sqrt(1 - dy * dy), a = ga * i;
    const dir = [rr * Math.cos(a), dy, rr * Math.sin(a)];
    let t = 0.9, p;
    for (let k = 0; k < 120; k++) {
      p = [C[0] + dir[0] * t, C[1] + dir[1] * t, C[2] + dir[2] * t];
      const d = vol(p[0], p[1], p[2]) / LIP;
      if (Math.abs(d) < 2e-4) break;
      t -= d;
    }
    const above = p[1] - HL(hairPhi(p[0], p[2]));
    if (above < curlR * 0.55) continue;
    cand.push({ p, above });
  }
  cand.sort((a, b) => a.above - b.above);
  const minD2 = (curlR * 1.74) ** 2;
  const curls = [];
  // 髻珠位置：肉髻正前方
  let jp = [0, 0.43, 0.6];
  for (let k = 0; k < 80; k++) { const d = vol(jp[0], jp[1], jp[2]) / LIP; if (Math.abs(d) < 2e-4) break; jp[2] -= d; }
  const jn = grad(jp);
  const jewelC = [jp[0] + jn[0] * 0.012, jp[1] + jn[1] * 0.012, jp[2] + jn[2] * 0.012];
  for (const c of cand) {
    const p = c.p;
    let ok = true;
    const dj = (p[0] - jewelC[0]) ** 2 + (p[1] - jewelC[1]) ** 2 + (p[2] - jewelC[2]) ** 2;
    if (dj < (0.034 + curlR) ** 2) continue;
    for (let j = curls.length - 1; j >= 0; j--) {
      const q = curls[j];
      const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2];
      if (dx * dx + dy * dy + dz * dz < minD2) { ok = false; break; }
    }
    if (ok) curls.push(p);
  }
  // 螺发颗粒交给实例化网格（curls.js）：这里只输出世界坐标下的位置与法线
  const pts = [], nrm = [];
  for (const p of curls) {
    const w = F.p(p), n = F.d(grad(p));
    pts.push(...w.map((v) => +v.toFixed(5)));
    nrm.push(...n.map((v) => +v.toFixed(4)));
  }
  F.sphere(jewelC, 0.03, { mat: 'jewel', k: 0.004 });   // 髻珠

  // ---------------- 耳：厚实的长垂耳，耳轮清楚，耳垂有长孔 ----------------
  F.mirror((m) => {
    const r = [0.06, -0.32, 0.04], rl = [-0.04, -0.3, 0.03];
    m.ellipsoid([0.414, -0.03, -0.04], [0.052, 0.168, 0.088], { mat: skin, k: 0.05, rot: r });
    m.ellipsoid([0.42, -0.37, -0.012], [0.046, 0.19, 0.066], { mat: skin, k: 0.06, rot: rl });
    m.ellipsoid([0.466, -0.035, -0.032], [0.02, 0.108, 0.05], { op: 'sub', k: 0.025, rot: r });        // 耳甲腔
    m.ellipsoid([0.47, 0.06, -0.06], [0.012, 0.05, 0.03], { op: 'sub', k: 0.015, rot: r });            // 三角窝
    m.ellipsoid([0.468, -0.43, -0.004], [0.022, 0.082, 0.013], { op: 'sub', k: 0.012, rot: rl });     // 耳垂孔
  });

  // 白毫
  let up = [0, 0.158, 0.6];
  for (let k = 0; k < 80; k++) { const d = headRaw(up[0], up[1], up[2]) / LIP; if (Math.abs(d) < 2e-4) break; up[2] -= d; }
  F.sphere([up[0], up[1], up[2] - 0.004], 0.019, { mat: 'urna', k: 0.003 });

  return { curls: { type: 'curls', pts, nrm, r: curlR * F.s * 1.22, h: 0.95 } };
}
