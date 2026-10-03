// 屋顶：庑殿 / 歇山 / 悬山 / 攒尖，含举折曲面、翼角起翘、筒瓦实例、瓦当滴水、正脊垂脊戗脊、吻兽、椽飞
import * as THREE from 'three';
import { PartBuilder, sweepRect, box, lathe, mergeGeometries } from './util.js';
import { AM } from './materials.js';

const V = THREE.Vector3;

/**
 * 屋面“面”的描述：局部坐标系中檐口沿 x 轴、位于 z=R；坡面朝 -z 升至脊线（z=R-run·t）。
 * E: 檐口宽；R: 檐口到脊线的平面距离；run: t∈[0,1] 的水平行程；K: 半宽随 t 的收缩率；
 * tMax: 面的上界（歇山撒头、重檐下檐只到部分高度）；rotY: 绕 Y 旋转到世界坐标。
 */
function makeFace(E, R, run, K, tMax, rotY, tLift) {
  return { E, R, run, K, tMax, rotY, tLift, cos: Math.cos(rotY), sin: Math.sin(rotY) };
}

/** 举折曲线：t∈[0,1] → 相对檐口的升高（凹曲线，近脊处更陡） */
function riseOf(t, H, a = 0.52) { return H * (a * t + (1 - a) * t * t); }

/** 面上一点（世界坐标），u∈[-1,1] 横向，t∈[0,tMax] 纵向 */
function facePoint(face, u, t, p, liftH, out = new V()) {
  const hx = hxOf(face, t);
  let x = u * hx;
  let z = face.R - face.run * t;
  let y = p.eaveY + riseOf(t, p.H, p.a);
  if (liftH > 0 && face.tLift > 0) {
    const au = Math.abs(u);
    const e = Math.max(0, (au - p.u0) / (1 - p.u0));
    const ease = e * e * (3 - 2 * e) * e; // 平滑后再加权，翼角起翘集中在端部
    const decay = Math.max(0, 1 - t / face.tLift); // 沿椽长线性衰减（椽为直材，靠角梁垫高）
    const l = liftH * ease * decay;
    y += l;
    z += l * 0.75; // 出翘
  }
  // 旋转到世界
  const wx = x * face.cos + z * face.sin;
  const wz = -x * face.sin + z * face.cos;
  return out.set(wx, y, wz);
}

/** 局部切向（沿 t 向上坡）与横向（沿 u）、法线 */
const _a = new V(), _b = new V(), _c = new V(), _d = new V();
function faceFrame(face, u, t, p, liftH, pos, tanT, tanU, nor) {
  const dt = 0.01, du = 0.02;
  facePoint(face, u, t, p, liftH, pos);
  facePoint(face, u, Math.min(face.tMax, t + dt), p, liftH, _a);
  facePoint(face, u, Math.max(0, t - dt), p, liftH, _b);
  tanT.subVectors(_a, _b).normalize();
  facePoint(face, Math.min(1, u + du), t, p, liftH, _c);
  facePoint(face, Math.max(-1, u - du), t, p, liftH, _d);
  tanU.subVectors(_c, _d).normalize();
  nor.crossVectors(tanU, tanT).normalize();
  if (nor.y < 0) nor.negate();
}

/** 生成一个面的网格（曲面），normalOffset 用于底面（望板） */
function faceGeometry(face, p, liftH, nu, nt, pitch, offset = 0, flip = false) {
  const pos = [], nor = [], uv = [], idx = [];
  const P = new V(), tT = new V(), tU = new V(), N = new V();
  const slope = Math.hypot(face.run * face.tMax, riseOf(face.tMax, p.H, p.a));
  for (let j = 0; j <= nt; j++) {
    const t = (j / nt) * face.tMax;
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * 2 - 1;
      faceFrame(face, u, t, p, liftH, P, tT, tU, N);
      P.addScaledVector(N, offset);
      pos.push(P.x, P.y, P.z);
      nor.push(N.x * (flip ? -1 : 1), N.y * (flip ? -1 : 1), N.z * (flip ? -1 : 1));
      const hx = hxOf(face, t);
      uv.push(u * hx / pitch, (t / face.tMax) * slope / (pitch * 4));
    }
  }
  for (let j = 0; j < nt; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // 校正朝向：平均法线若与几何朝向不符则翻转索引
  g.computeVertexNormals();
  const n = g.attributes.normal.array;
  let sy = 0; for (let i = 1; i < n.length; i += 3) sy += n[i];
  if ((sy < 0) !== flip) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t2 = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t2; } g.computeVertexNormals(); }
  if (flip) { const nn = g.attributes.normal.array; for (let i = 0; i < nn.length; i++) nn[i] = -nn[i]; }
  return g;
}

/** 筒瓦几何：半圆柱，轴向 +z，半圆在 +y 侧；长度 L，半径 r */
function tubeGeo(r, L) {
  const g = new THREE.CylinderGeometry(r, r, L, 6, 1, true, 0, Math.PI);
  g.rotateX(Math.PI / 2); // 轴向 → z
  g.rotateZ(Math.PI / 2); // 让半圆朝 +y
  // 端部小封头（瓦口略突出）
  return g;
}

/** 鸱吻（正吻）：尾部上卷的龙鱼形，口衔脊端。scale ≈ 脊高 */
function chiwenGeo(s) {
  const parts = [];
  const add = (g, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Matrix4().compose(new V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V(sx, sy, sz));
    parts.push(g.clone().applyMatrix4(m));
  };
  // 身体（略倾斜的厚板）
  add(new THREE.BoxGeometry(1.1 * s, 2.0 * s, 0.45 * s), 0.25 * s, 1.0 * s, 0, 0, 0, 0.12);
  // 口（下颌张开咬住正脊）
  add(new THREE.BoxGeometry(0.9 * s, 0.5 * s, 0.6 * s), -0.3 * s, 0.25 * s, 0);
  add(new THREE.BoxGeometry(0.9 * s, 0.25 * s, 0.55 * s), -0.35 * s, 0.9 * s, 0, 0, 0, 0.25);
  // 眼睛
  add(new THREE.SphereGeometry(0.13 * s, 8, 6), -0.4 * s, 1.0 * s, 0.3 * s);
  add(new THREE.SphereGeometry(0.13 * s, 8, 6), -0.4 * s, 1.0 * s, -0.3 * s);
  // 尾部向内上卷（圆环段）
  const tail = new THREE.TorusGeometry(0.55 * s, 0.17 * s, 7, 14, Math.PI * 1.15);
  add(tail, 0.35 * s, 2.0 * s, 0, 0, 0, Math.PI * 0.1);
  // 背鳍（几块薄板）
  for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.2 * s, 0.45 * s, 0.1 * s), 0.85 * s - i * 0.1 * s, 0.6 * s + i * 0.42 * s, 0, 0, 0, 0.35);
  // 背兽（小兽骑在吻背上）
  add(new THREE.BoxGeometry(0.35 * s, 0.3 * s, 0.3 * s), 0.1 * s, 2.2 * s, 0);
  add(new THREE.SphereGeometry(0.14 * s, 8, 6), -0.05 * s, 2.45 * s, 0);
  // 剑把（插在背上）
  add(new THREE.BoxGeometry(0.08 * s, 0.5 * s, 0.08 * s), 0.45 * s, 2.35 * s, 0, 0, 0, -0.3);
  return mergeGeometries(parts, false);
}

/** 仙人骑凤 + 小兽行列 + 垂兽，沿脊方向 +z（向上坡），返回几何数组（局部，原点在脊面） */
function beastRow(n, s) {
  const list = [];
  const add = (g, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)).setPosition(x, y, z);
    list.push(g.clone().applyMatrix4(m));
  };
  const body = new THREE.BoxGeometry(0.22 * s, 0.22 * s, 0.4 * s);
  const head = new THREE.SphereGeometry(0.12 * s, 8, 6);
  const ear = new THREE.ConeGeometry(0.05 * s, 0.12 * s, 5);
  const leg = new THREE.BoxGeometry(0.06 * s, 0.14 * s, 0.06 * s);
  // 仙人骑凤（最前端）：凤身 + 仙人
  add(new THREE.BoxGeometry(0.2 * s, 0.18 * s, 0.5 * s), 0, 0.12 * s, 0.0);
  add(new THREE.SphereGeometry(0.09 * s, 8, 6), 0, 0.28 * s, -0.3 * s); // 凤头
  add(new THREE.ConeGeometry(0.06 * s, 0.25 * s, 6), 0, 0.3 * s, -0.42 * s, Math.PI / 2); // 凤喙
  add(new THREE.BoxGeometry(0.12 * s, 0.26 * s, 0.14 * s), 0, 0.34 * s, 0.05 * s); // 仙人身体
  add(new THREE.SphereGeometry(0.08 * s, 8, 6), 0, 0.54 * s, 0.05 * s); // 仙人头
  add(new THREE.ConeGeometry(0.07 * s, 0.12 * s, 6), 0, 0.66 * s, 0.05 * s); // 冠
  add(new THREE.BoxGeometry(0.5 * s, 0.06 * s, 0.2 * s), 0, 0.2 * s, 0.1 * s, 0.2); // 翅膀
  // 小兽（龙、凤、狮、天马、海马、狻猊、押鱼、獬豸、斗牛）
  for (let i = 0; i < n; i++) {
    const z = 0.75 * s + i * 0.62 * s;
    add(body, 0, 0.21 * s, z);
    add(head, 0, 0.4 * s, z - 0.18 * s);
    add(ear, -0.07 * s, 0.52 * s, z - 0.18 * s);
    add(ear, 0.07 * s, 0.52 * s, z - 0.18 * s);
    add(new THREE.ConeGeometry(0.05 * s, 0.22 * s, 5), 0, 0.32 * s, z + 0.3 * s, -Math.PI / 2 - 0.5); // 尾
    for (const [lx, lz] of [[-0.08, -0.14], [0.08, -0.14], [-0.08, 0.14], [0.08, 0.14]]) add(leg, lx * s, 0.07 * s, z + lz * s);
  }
  // 垂兽（行列末端的大兽头，朝下坡）
  const z = 0.75 * s + n * 0.62 * s + 0.2 * s;
  add(new THREE.BoxGeometry(0.4 * s, 0.5 * s, 0.6 * s), 0, 0.3 * s, z);
  add(new THREE.SphereGeometry(0.2 * s, 8, 6), 0, 0.55 * s, z - 0.25 * s);
  add(new THREE.ConeGeometry(0.07 * s, 0.25 * s, 5), -0.12 * s, 0.78 * s, z - 0.25 * s);
  add(new THREE.ConeGeometry(0.07 * s, 0.25 * s, 5), 0.12 * s, 0.78 * s, z - 0.25 * s);
  add(new THREE.BoxGeometry(0.42 * s, 0.14 * s, 0.3 * s), 0, 0.4 * s, z - 0.4 * s);
  return list;
}

/** 宝顶（攒尖顶尖）：葫芦形鎏金 */
function baodingGeo(s) {
  return lathe([[0, 0], [0.5, 0], [0.5, 0.1], [0.35, 0.14], [0.4, 0.3], [0.42, 0.55], [0.3, 0.8], [0.18, 0.9], [0.26, 1.05], [0.28, 1.25], [0.16, 1.45], [0.05, 1.55], [0.1, 1.7], [0, 1.8]].map(([r, y]) => [r * s, y * s]), 14);
}

/**
 * 生成屋顶。所有尺寸为檐口（含出檐）的外轮廓：width 沿 x，depth 沿 z。
 * eaveHeight: 檐口（檐椽上皮）高度；ridgeHeight: 脊相对檐口的升高；
 * style: wudian | xieshan | xuanshan | cuanjian；sides: 攒尖边数（4/8）
 * lower: 重檐下檐 { eaveHeight, width, depth, skirt(平面进深) }（doubleEave 时使用）
 */
export function buildRoof(opt, extBuilder = null) {
  const {
    style = 'xieshan', width = 20, depth = 12, eaveHeight = 6, ridgeHeight = 5, overhang = 2,
    doubleEave = false, lower = null, tileColor = 'yellow', sides = 4,
    liftH = null, beasts = 5, ridgeScale = 1, rafters = true, name = 'roof',
  } = opt;
  const group = new THREE.Group();
  group.name = name;
  const b = new PartBuilder();
  const tileMat = opt.tileMat || AM.tile(tileColor);
  const tubeMat = AM.tube(tileColor);
  const ridgeMat = AM.ridge(tileColor);
  const pitch = THREE.MathUtils.clamp(width / 90, 0.26, 0.4); // 瓦垄间距
  const lift = liftH ?? (style === 'xuanshan' ? 0 : THREE.MathUtils.clamp(ridgeHeight * 0.17, 0.25, 1.1));

  // ---- 主屋面 ----
  const main = buildShell({
    style, W: width, D: depth, eaveY: eaveHeight, H: ridgeHeight, sides, lift, pitch, beasts, ridgeScale, rafters, overhang,
    tileMat, tubeMat, ridgeMat, tMax: 1,
  });
  b.merge(main);

  // ---- 重檐下檐（腰檐）：四坡环带 ----
  if (doubleEave && lower) {
    const lw = lower.width, ld = lower.depth, skirt = lower.skirt ?? overhang * 1.9;
    const run = ld / 2;
    const tMax = Math.min(0.95, skirt / run);
    // 下檐坡度：按 skirt 水平进深给出与主屋面相近的坡度
    const H = lower.rise ?? skirt * 0.62 / (0.52 * tMax + 0.48 * tMax * tMax) * 1.0;
    const low = buildShell({
      style: 'wudian', W: lw, D: ld, eaveY: lower.eaveHeight, H, sides: 4, lift: lift * (lower.liftScale ?? 0.85), pitch, beasts: Math.max(3, beasts - 2), ridgeScale: ridgeScale * 0.8,
      rafters, overhang, tileMat, tubeMat, ridgeMat, tMax, noMainRidge: true,
    });
    b.merge(low);
  }
  if (extBuilder) { extBuilder.merge(b); return null; }
  b.build(group);
  return group;
}

/** 构造一组坡面（一个完整的屋顶壳体或下檐环带） */
function buildShell(o) {
  const b = new PartBuilder();
  const { style, W, D, eaveY, H, lift, pitch, tileMat, tubeMat, ridgeMat, tMax: shellTMax } = o;
  const p = { eaveY, H, a: 0.52, u0: 0.62 };
  const faces = [];
  let tBreak = 1, Lr = 0;
  if (style === 'cuanjian') {
    const n = o.sides;
    const R = W / 2; // 内切半径（对边距一半）
    const E = 2 * R * Math.tan(Math.PI / n);
    for (let k = 0; k < n; k++) faces.push(makeFace(E, R, R, E / 2, 1, (k * 2 * Math.PI) / n, 1));
  } else {
    if (style === 'xieshan') tBreak = 0.42;
    else if (style === 'xuanshan') tBreak = 0;
    else tBreak = Math.min(1, (W / D) * 0.9); // 庑殿：保证正脊长度为正
    Lr = W - D * tBreak;
    const run = D / 2;
    const K = D / 2;
    // 前后坡：半宽 W/2 - K·t（t ≤ tBreak），之后保持 Lr/2 —— 用分段：K 在 t>tBreak 时为 0
    const tLift = tBreak;
    const front = makeFace(W, D / 2, run, K, shellTMax, 0, tLift);
    const back = makeFace(W, D / 2, run, K, shellTMax, Math.PI, tLift);
    front.tBreak = back.tBreak = tBreak;
    faces.push(front, back);
    if (tBreak > 0) {
      const tSide = Math.min(tBreak, shellTMax);
      faces.push(makeFace(D, W / 2, run, K, tSide, Math.PI / 2, tLift));
      faces.push(makeFace(D, W / 2, run, K, tSide, -Math.PI / 2, tLift));
    }
  }
  // 前后坡在 tBreak 以上半宽恒定：用 hx 钳制实现（覆盖 facePoint 的 E/2-K·t）
  for (const f of faces) if (f.tBreak !== undefined && f.tBreak < 1) {
    f.K0 = f.K;
    f.hxMin = f.E / 2 - f.K * f.tBreak;
  }

  // 起翘沿坡向的衰减长度 = 檐椽长度（使直椽与曲面一致）
  const rafterLen = (o.overhang || 1.5) + 1.2;
  for (const f of faces) if (f.tLift > 0) f.tLift = Math.min(f.tLift, rafterLen / f.run);
  const nuOf = (f) => Math.max(10, Math.round(f.E / 0.9));
  const nt = 16;
  // 屋面 + 望板
  for (const f of faces) {
    b.add(faceGeometry(f, p, lift, nuOf(f), nt, pitch, 0, false), tileMat);
    b.add(faceGeometry(f, p, lift, Math.max(6, nuOf(f) >> 1), 8, pitch, -0.12, true), AM.board());
  }
  // 筒瓦、瓦当、滴水
  const tubeL = pitch * 2.2, r = pitch * 0.26;
  const tube = tubeGeo(r, tubeL);
  const wadang = new THREE.CylinderGeometry(r * 1.05, r * 1.05, 0.04, 10, 1, false, 0, Math.PI);
  wadang.rotateX(Math.PI / 2).rotateZ(Math.PI / 2); // 半圆盘，法线沿 z
  const dishui = new THREE.CylinderGeometry(0.001, pitch * 0.48, 0.03, 3, 1); // 三角形小滴水
  dishui.rotateX(Math.PI / 2);
  const tubes = [], wds = [], dss = [], rafterMs = [], feiMs = [];
  const P = new V(), tT = new V(), tU = new V(), N = new V(), side = new V();
  const M = new THREE.Matrix4();
  const basis = (pos, nrm, dirUp) => { // dirUp: 沿坡向上的切向；构造 local z=向上坡，y=法线
    side.crossVectors(nrm, dirUp).normalize();
    M.makeBasis(side, nrm, dirUp).setPosition(pos);
    return M.clone();
  };
  const rafterGeo = new THREE.CylinderGeometry(0.055, 0.055, 1, 7); // 单位长，沿 y；实例时缩放
  rafterGeo.rotateX(-Math.PI / 2); // 轴向 → +z
  rafterGeo.translate(0, 0, 0.5);
  const feiGeo = new THREE.BoxGeometry(0.09, 0.09, 1); feiGeo.translate(0, 0, 0.5);
  const fasciaPts = [];
  for (const f of faces) {
    const hx0 = f.E / 2;
    const nCol = Math.floor((hx0 - pitch * 0.5) / pitch);
    const edgePts = [];
    for (let i = -nCol; i <= nCol; i++) {
      const x = i * pitch;
      const u = x / hx0;
      // 沿坡向上逐段放置筒瓦
      let t = 0, acc = 0;
      faceFrame(f, u, 0, p, lift, P, tT, tU, N);
      // 瓦当：檐口端
      {
        const m = basis(P.clone().addScaledVector(N, r * 0.9).addScaledVector(tT, -0.01), N, tT);
        wds.push(m);
        if (i < nCol) {
          faceFrame(f, (x + pitch / 2) / hx0, 0, p, lift, P, tT, tU, N);
          dss.push(basis(P.clone().addScaledVector(N, 0.01).addScaledVector(tT, 0.0), N, tT));
        }
      }
      let prevT = 0;
      const maxT = f.tMax;
      let guard = 0;
      while (t < maxT && guard++ < 400) {
        // 推进一个瓦长
        acc = 0; const tStart = t;
        while (acc < tubeL && t < maxT) {
          facePoint(f, u, t, p, lift, _a); t = Math.min(maxT, t + 0.01); facePoint(f, u, t, p, lift, _b); acc += _a.distanceTo(_b);
        }
        const tMid = (tStart + t) / 2;
        const hxEnd = hxOf(f, t);
        if (Math.abs(x) > hxEnd - r) break; // 超出坡面边缘（戗脊覆盖处）
        const uMid = x / hxOf(f, tMid);
        faceFrame(f, uMid, tMid, p, lift, P, tT, tU, N);
        tubes.push(basis(P.clone().addScaledVector(N, r * 0.55), N, tT));
        prevT = t;
      }
      void prevT;
    }
    // 檐口连檐（沿檐口曲线）
    const nE = Math.max(16, Math.round(f.E / 0.5));
    for (let i = 0; i <= nE; i++) {
      const u = (i / nE) * 2 - 1;
      faceFrame(f, u, 0, p, lift, P, tT, tU, N);
      edgePts.push(P.clone().addScaledVector(N, -0.1).addScaledVector(tT, 0.02));
    }
    fasciaPts.push(edgePts);
    // 椽子与飞椽：沿檐口均布；翼角处椽子呈扇形
    if (o.rafters) {
      const nR = Math.floor(f.E / (pitch * 1.25));
      for (let i = 0; i <= nR; i++) {
        const u = (i / nR) * 2 - 1;
        // 位置取起翘后的檐口点，方向取未起翘的基本坡向（椽子是直的，靠角梁垫高，而非随曲面下折）
        faceFrame(f, u, 0, p, lift, P, tT, tU, N);
        // 椽方向：从起翘后的檐口点指向衰减终点（该处无起翘），与屋面一致；
        // 翼角处终点随戗脊线内收（扇形排列，最外一根与角梁平行）
        const tL = f.tLift > 0 ? Math.min(f.tMax, f.tLift) : Math.min(f.tMax, rafterLen / f.run);
        const au = Math.abs(u);
        const g = au > 0.72 ? ((au - 0.72) / 0.28) ** 1.5 : 0;
        const x0 = u * hxOf(f, 0);
        const xEnd = x0 - Math.sign(u) * (hxOf(f, 0) - hxOf(f, tL)) * g;
        const uEnd = THREE.MathUtils.clamp(xEnd / Math.max(1e-3, hxOf(f, tL)), -1, 1);
        facePoint(f, uEnd, tL, p, lift, _c);
        const dir = _c.clone().sub(P).normalize();
        // 檐椽：椽头退在飞椽之后，位于飞椽下方
        const base = P.clone().addScaledVector(N, -0.3).addScaledVector(dir, 0.45);
        const m = basis(base, N, dir);
        m.scale(new V(1, 1, rafterLen));
        rafterMs.push(m);
        // 飞椽：椽头略在瓦口之内，向内下压（即外端上翘）
        const dirF = dir.clone().addScaledVector(N, -0.16).normalize();
        const mf = basis(P.clone().addScaledVector(N, -0.17).addScaledVector(dirF, -0.06), N, dirF);
        mf.scale(new V(1, 1, 1.6));
        feiMs.push(mf);
      }
    }
  }
  b.inst(tube, tubeMat, tubes);
  b.inst(wadang, tubeMat, wds);
  b.inst(dishui, tubeMat, dss);
  if (rafterMs.length) { b.inst(rafterGeo, AM.rafter(), rafterMs); b.inst(feiGeo, AM.rafter(), feiMs); }
  for (const pts of fasciaPts) b.add(sweepRect(pts, 0.1, 0.22), AM.redWood());

  // ---- 脊 ----
  const rs = (o.ridgeScale || 1) * THREE.MathUtils.clamp(W / 30, 0.6, 1.3);
  const ridgeH = 0.75 * rs, ridgeW = 0.42 * rs;
  const hipH = 0.42 * rs, hipW = 0.32 * rs;
  const ridgeGeos = [];
  const topY = eaveY + riseOf(1, H, p.a);
  if (style === 'cuanjian') {
    // 垂脊：每个顶点到宝顶
    for (const f of faces) {
      const pts = [];
      for (let j = 0; j <= 14; j++) { const t = j / 14; facePoint(f, 1, t * 0.985, p, lift, _a); pts.push(_a.clone().add(new V(0, hipH * 0.25, 0))); }
      ridgeGeos.push(sweepRect(pts, hipW, hipH));
      ridgeGeos.push(...beastsOnHip(pts, o.beasts, rs * 0.9, f));
    }
    ridgeGeos.push(baodingGeo(rs * 1.6).translate(0, topY - 0.1, 0));
    b.add(mergeGeometries(ridgeGeos, false), ridgeMat);
    // 宝顶鎏金另加
    b.add(baodingGeo(rs * 1.6).translate(0, topY - 0.1, 0), AM.gold());
  } else {
    // 正脊
    if (!o.noMainRidge) {
      const half = Lr / 2;
      const mr = [new V(-half - ridgeW * 0.2, topY + ridgeH / 2 - 0.05, 0), new V(half + ridgeW * 0.2, topY + ridgeH / 2 - 0.05, 0)];
      ridgeGeos.push(sweepRect(mr, ridgeW, ridgeH));
      // 脊座（压当条，略宽略矮）
      ridgeGeos.push(sweepRect([new V(-half, topY + 0.08, 0), new V(half, topY + 0.08, 0)], ridgeW * 1.5, 0.25 * rs));
      // 鸱吻
      const cw = chiwenGeo(ridgeH * 1.35);
      ridgeGeos.push(cw.clone().applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI).setPosition(half + ridgeW * 0.1, topY - 0.05, 0)));
      ridgeGeos.push(cw.clone().applyMatrix4(new THREE.Matrix4().setPosition(-half - ridgeW * 0.1, topY - 0.05, 0)));
    }
    // 垂脊 / 戗脊：沿前后坡的两侧边缘（u=±1）
    const [front, back] = faces;
    for (const f of [front, back]) {
      for (const sgn of [-1, 1]) {
        const pts = [];
        const tEnd = Math.min(f.tMax, 0.995);
        const n = 18;
        for (let j = 0; j <= n; j++) {
          const t = (j / n) * tEnd;
          facePoint(f, sgn, t, p, lift, _a);
          pts.push(_a.clone().add(new V(0, hipH * 0.3, 0)));
        }
        if (style === 'xuanshan') {
          // 悬山：博风板沿山面坡缘
          ridgeGeos.push(sweepRect(pts.map((q) => q.clone().add(new V(sgn * 0.12 * (f.rotY ? -1 : 1) * 0 + 0, -0.05, 0))), 0.08, 0.5));
          continue;
        }
        // 歇山：tBreak 以上是垂脊（沿山花边缘），以下是戗脊——同一折线即可
        ridgeGeos.push(sweepRect(pts, hipW, hipH));
        // 戗脊兽行列（只放在 t ≤ tBreak 的下段）
        ridgeGeos.push(...beastsOnHip(pts.filter((q, j) => (j / n) * tEnd <= Math.max(tBreak, 0.35) + 1e-6), o.beasts, rs, f));
      }
    }
    // 歇山山花（竖直三角面）+ 博风板
    if (style === 'xieshan' && shellTMax >= 1) {
      for (const sgn of [-1, 1]) {
        const x = sgn * (Lr / 2 - 0.1);
        const tri = [];
        facePoint(front, sgn, tBreak, p, lift, _a); const zb = _a.z, yb = _a.y;
        tri.push(new V(x, yb - 0.2, 0));
        const n = 10;
        const edge = [];
        for (let j = 0; j <= n; j++) { const t = tBreak + (1 - tBreak) * (j / n); facePoint(front, sgn, t, p, lift, _a); edge.push(new V(x, _a.y - 0.02, _a.z)); }
        const edgeB = edge.map((q) => new V(q.x, q.y, -q.z)).reverse();
        const poly = [new V(x, yb - 0.15, zb), ...edge, ...edgeB.slice(1), new V(x, yb - 0.15, -zb)];
        // 扇形三角化
        const pos = [], idx = [];
        const c = new V(x, yb, 0);
        pos.push(c.x, c.y, c.z);
        for (const q of poly) pos.push(q.x, q.y, q.z);
        for (let i = 1; i < poly.length; i++) { if (sgn > 0) idx.push(0, i, i + 1); else idx.push(0, i + 1, i); }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setIndex(idx); g.computeVertexNormals();
        const uv = new Float32Array((poly.length + 1) * 2);
        for (let i = 0; i <= poly.length; i++) { uv[i * 2] = pos[i * 3 + 2] / 2; uv[i * 2 + 1] = pos[i * 3 + 1] / 2; }
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        b.add(g, AM.redWall());
        // 博风板：沿两条坡缘
        b.add(sweepRect(edge.map((q) => q.clone().add(new V(sgn * 0.1, 0.05, 0))), 0.1, 0.45), AM.rafter());
        b.add(sweepRect(edgeB.map((q) => q.clone().add(new V(sgn * 0.1, 0.05, 0))), 0.1, 0.45), AM.rafter());
        // 悬鱼
        b.add(lathe([[0, 0], [0.18, -0.2], [0.22, -0.5], [0.08, -0.7], [0, -0.75]], 10).translate(x + sgn * 0.12, topY - 0.3, 0), AM.gold());
      }
    }
    b.add(mergeGeometries(ridgeGeos, false), ridgeMat);
  }
  return b;
}

/** 面在 t 处的半宽：歇山前后坡在 tBreak 以上保持常量（山花边缘） */
function hxOf(f, t) {
  const hx = f.E / 2 - f.K * t;
  return f.hxMin !== undefined ? Math.max(hx, f.hxMin) : hx;
}

/** 在戗脊折线上放置走兽行列（从檐口端开始向上） */
function beastsOnHip(pts, n, s, face) {
  if (n <= 0 || pts.length < 3) return [];
  const list = beastRow(n, s);
  const out = [];
  // 沿折线取弧长位置并放置
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const total = lens[lens.length - 1];
  const at = (d) => {
    d = Math.max(0, Math.min(total, d));
    let i = 1; while (i < lens.length - 1 && lens[i] < d) i++;
    const f = (d - lens[i - 1]) / Math.max(1e-6, lens[i] - lens[i - 1]);
    return new V().lerpVectors(pts[i - 1], pts[i], f);
  };
  const start = 0.35 * s;
  const dir = new V().subVectors(at(start + 1), at(start)).normalize();
  const up = new V(0, 1, 0);
  const side = new V().crossVectors(up, dir).normalize();
  const nup = new V().crossVectors(dir, side).normalize();
  const M = new THREE.Matrix4().makeBasis(side, nup, dir).setPosition(at(start).add(new V(0, 0.2 * s, 0)));
  for (const g of list) out.push(g.applyMatrix4(M));
  void face;
  return out;
}

export { riseOf };
