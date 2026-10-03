// 殿堂：台基（须弥座）、踏跺御路、栏杆、檐柱金柱、额枋平板枋、斗拱、屋顶、墙体、隔扇槛窗、天花藻井、匾额对联
import * as THREE from 'three';
import { PartBuilder, sweepRect, rectProfile, box, lathe, mat4, shadowed, mergeGeometries } from './util.js';
import { AM } from './materials.js';
import { buildRoof } from './roof.js';
import { dougongGeometry } from './dougong.js';

const V = THREE.Vector3;

/** 开间宽度序列：明间最宽，次间、梢间递减 */
export function bayWidths(bays, bayWidth) {
  const ws = [];
  const half = (bays - 1) / 2;
  for (let i = 0; i < bays; i++) {
    const k = Math.abs(i - half);
    ws.push(k === 0 ? bayWidth : k === half && bays > 3 ? bayWidth * 0.82 : bayWidth * 0.9);
  }
  return ws;
}
function gridFromWidths(ws) {
  const total = ws.reduce((a, b) => a + b, 0);
  const xs = [-total / 2];
  for (const w of ws) xs.push(xs[xs.length - 1] + w);
  return { xs, total };
}

/**
 * 须弥座台基 + 踏跺 + 栏杆。返回 { group(Builder 内容), topY }
 */
function addPlatform(b, { w, d, h, balustrade, stairs, xsCenter }) {
  const stoneM = AM.marble();
  const grey = AM.stone();
  const xumi = h >= 1.4;
  let profile;
  if (xumi) {
    // 须弥座轮廓：圭角、下枋、下枭、束腰、上枭、上枋
    const s = h;
    profile = [
      [0, 0], [0, 0.1 * s], [0.06 * s, 0.14 * s], [0.06 * s, 0.26 * s], [0.14 * s, 0.34 * s], [0.14 * s, 0.4 * s],
      [0.22 * s, 0.42 * s], [0.22 * s, 0.66 * s], [0.14 * s, 0.68 * s], [0.14 * s, 0.74 * s], [0.06 * s, 0.82 * s], [0.06 * s, 0.9 * s], [0, 0.94 * s], [0, s],
    ];
  } else {
    profile = [[0, 0], [0, h * 0.85], [0.08, h * 0.9], [0.08, h]];
  }
  b.add(rectProfile(profile, w, d, { top: true, uvScale: 2 }), xumi ? stoneM : grey);
  // 台基面（略高于须弥座顶，铺砖）
  b.add(box(w - 0.3, 0.06, d - 0.3), AM.paving(), mat4(0, h + 0.03, 0));
  // 角柱石
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(box(0.5, h, 0.5), grey, mat4(sx * (w / 2 - 0.25), h / 2, sz * (d / 2 - 0.25)));
  // 束腰处的壶门装饰（小方块等距）
  if (xumi) {
    const yb = h * 0.54;
    for (const [len, axis, fixed] of [[w, 'x', d / 2], [d, 'z', w / 2]]) {
      const n = Math.floor(len / 1.4);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n * len - len / 2;
        for (const sgn of [-1, 1]) {
          const m = axis === 'x' ? mat4(t, yb, sgn * (fixed - h * 0.22 + 0.02)) : mat4(sgn * (fixed - h * 0.22 + 0.02), yb, t);
          b.add(box(axis === 'x' ? 0.8 : 0.06, h * 0.16, axis === 'x' ? 0.06 : 0.8), stoneM, m);
        }
      }
    }
  }
  // ---- 踏跺（前方） ----
  const stairGaps = [];
  for (const st of stairs) {
    const nSteps = Math.max(3, Math.round(h / 0.15));
    const rise = h / nSteps, tread = 0.32;
    const run = nSteps * tread;
    const sw = st.width;
    const zEdge = d / 2;
    for (let i = 0; i < nSteps; i++) {
      // 第 i 级：从下往上；每级向内缩
      const y = rise * (i + 0.5);
      const z = zEdge + run - tread * (i + 0.5) ;
      const depth = run - tread * i;
      b.add(box(sw, rise, depth), grey, mat4(st.x, y, zEdge + depth / 2));
      void z;
    }
    // 垂带石（两侧斜石）
    const slopePts = [new V(0, 0.02, zEdge + run + 0.1), new V(0, h + 0.02, zEdge - 0.1)];
    for (const sgn of [-1, 1]) {
      const pts = slopePts.map((p) => p.clone().add(new V(st.x + sgn * (sw / 2 + 0.12), 0, 0)));
      b.add(sweepRect(pts, 0.26, 0.28, { yOffset: 0.1 }), stoneM);
      // 踏跺栏杆：望柱 + 斜栏板
      if (balustrade) {
        const n = 3;
        for (let k = 0; k <= n; k++) {
          const p = new V().lerpVectors(pts[0], pts[1], k / n);
          addPost(b, p.x, p.y + 0.2, p.z, stoneM, 0.9);
          if (k < n) {
            const q = new V().lerpVectors(pts[0], pts[1], (k + 0.5) / n);
            const a = new V().lerpVectors(pts[0], pts[1], (k + 0.08) / n), c = new V().lerpVectors(pts[0], pts[1], (k + 0.92) / n);
            b.add(sweepRect([a.clone().add(new V(0, 0.55, 0)), c.clone().add(new V(0, 0.55, 0))], 0.1, 0.55), stoneM);
            void q;
          }
        }
      }
    }
    // 御路（中央斜坡石雕）
    if (st.yulu) {
      const yw = Math.min(1.6, sw * 0.3);
      const pts = [new V(st.x, 0.08, zEdge + run - 0.1), new V(st.x, h + 0.09, zEdge + 0.05)];
      b.add(sweepRect(pts, yw, 0.16), stoneM);
      // 御路浮雕：云纹凸起
      const n = 5;
      for (let k = 0; k < n; k++) {
        const p = new V().lerpVectors(pts[0], pts[1], (k + 0.5) / n);
        b.add(new THREE.TorusGeometry(yw * 0.2, 0.04, 6, 14).rotateX(Math.PI / 2 - Math.atan2(h, run)), stoneM, mat4(p.x, p.y + 0.05, p.z));
      }
    }
    stairGaps.push([st.x - sw / 2 - 0.3, st.x + sw / 2 + 0.3]);
  }
  // ---- 台基栏杆 ----
  if (balustrade) {
    const inset = 0.3;
    const ring = [
      [new V(-w / 2 + inset, 0, d / 2 - inset), new V(w / 2 - inset, 0, d / 2 - inset), 'front'],
      [new V(w / 2 - inset, 0, d / 2 - inset), new V(w / 2 - inset, 0, -d / 2 + inset)],
      [new V(w / 2 - inset, 0, -d / 2 + inset), new V(-w / 2 + inset, 0, -d / 2 + inset)],
      [new V(-w / 2 + inset, 0, -d / 2 + inset), new V(-w / 2 + inset, 0, d / 2 - inset)],
    ];
    for (const [a, c, side] of ring) {
      const len = a.distanceTo(c);
      const n = Math.max(1, Math.round(len / 1.7));
      for (let k = 0; k <= n; k++) {
        const p = new V().lerpVectors(a, c, k / n);
        const inGap = side === 'front' && stairGaps.some(([g0, g1]) => p.x > g0 && p.x < g1);
        if (!inGap || stairGaps.some(([g0, g1]) => Math.abs(p.x - g0) < 0.4 || Math.abs(p.x - g1) < 0.4)) addPost(b, p.x, h, p.z, stoneM, 1.0);
        if (k < n) {
          const q0 = new V().lerpVectors(a, c, (k + 0.07) / n), q1 = new V().lerpVectors(a, c, (k + 0.93) / n);
          const mid = (q0.x + q1.x) / 2;
          if (side === 'front' && stairGaps.some(([g0, g1]) => mid > g0 && mid < g1)) continue;
          b.add(sweepRect([q0.clone().add(new V(0, h + 0.5, 0)), q1.clone().add(new V(0, h + 0.5, 0))], 0.12, 0.62), stoneM);
          // 栏板雕花：凹框
          b.add(sweepRect([q0.clone().add(new V(0, h + 0.5, 0)), q1.clone().add(new V(0, h + 0.5, 0))], 0.15, 0.3), stoneM);
        }
      }
    }
    void xsCenter;
  }
}

/** 望柱：方柱 + 莲花/云头柱头 */
function addPost(b, x, y, z, m, hh = 1.0) {
  b.add(box(0.22, hh, 0.22), m, mat4(x, y + hh / 2, z));
  b.add(lathe([[0, 0], [0.16, 0], [0.18, 0.06], [0.12, 0.1], [0.17, 0.2], [0.14, 0.3], [0.08, 0.36], [0, 0.38]], 10), m, mat4(x, y + hh, z));
}

/** 一扇隔扇门（局部：底部中心在原点，朝 +z），宽 w、高 h */
function addDoorLeaf(b, w, h, lat, m) {
  const fr = 0.07; // 边梃宽
  const red = AM.redWood();
  const t = 0.06;
  // 边梃、抹头
  b.add(box(fr, h, t), red, m.clone().multiply(mat4(-w / 2 + fr / 2, h / 2, 0)));
  b.add(box(fr, h, t), red, m.clone().multiply(mat4(w / 2 - fr / 2, h / 2, 0)));
  const rails = [0, 0.34, 0.4, 0.94, 1.0];
  for (const r of rails) b.add(box(w, fr, t), red, m.clone().multiply(mat4(0, Math.min(h - fr / 2, Math.max(fr / 2, r * h)), 0)));
  // 裙板（下部实板，带凸起绦环）
  b.add(box(w - fr * 2, h * 0.34 - fr, t * 0.6), red, m.clone().multiply(mat4(0, h * 0.17, 0)));
  b.add(box((w - fr * 2) * 0.6, h * 0.2, t * 0.8), AM.gold(), m.clone().multiply(mat4(0, h * 0.17, 0.004)));
  // 绦环板（中段小板）
  b.add(box(w - fr * 2, h * 0.06 - fr * 0.5, t * 0.6), red, m.clone().multiply(mat4(0, h * 0.37, 0)));
  // 棂心（透空棂花 + 窗纸）
  const lh = h * 0.54, lw = w - fr * 2;
  const pg = new THREE.PlaneGeometry(lw, lh);
  b.add(pg, lat, m.clone().multiply(mat4(0, h * 0.67, 0.012)));
  b.add(pg, AM.paper(), m.clone().multiply(mat4(0, h * 0.67, -0.012)));
}

/**
 * 殿堂主函数。返回 Group，userData = { floorY, interior:{xMin,xMax,zMin,zMax}, entrance:[x,y,z], span:{w,d}, roofTop }
 */
export function buildHall(opt) {
  const {
    name = '殿', bays = 5, bayWidth = 4.2, depthBays = 3, bayDepth = 3.8, columnHeight = 4,
    roofStyle = 'xieshan', doubleEave = false, platformHeight = 1.0, balustrade = false,
    plaqueText = name, coupletText = null, doors = 'lattice', openFront = false, tileColor = 'yellow',
    storeys = 1, doorBays = 3, caihuaKind = null,
  } = opt;
  const group = new THREE.Group();
  group.name = name;
  const b = new PartBuilder();
  const hc = columnHeight;
  const d = hc / 10.5; // 柱径
  const overhang = hc * 0.36 + d; // 出檐（柱中到檐口）
  const ws = bayWidths(bays, bayWidth);
  const { xs, total: spanX } = gridFromWidths(ws);
  const dws = Array(depthBays).fill(bayDepth); dws[0] = dws[depthBays - 1] = bayDepth * 0.9;
  const { xs: zs0, total: spanZ } = gridFromWidths(dws);
  const zs = zs0.map((z) => -z); // 前(+z) → 后(-z)
  const zF = spanZ / 2, zB = -spanZ / 2;
  const xL = -spanX / 2, xR = spanX / 2;
  const ph = platformHeight;
  const floorY = ph;
  const caihua = AM.caihua(caihuaKind || (doubleEave ? 'hexi' : 'xuanzi'));
  const red = AM.redWood();

  // ---- 台基 ----
  const margin = overhang * 0.95;
  const pw = spanX + 2 * margin, pd = spanZ + 2 * margin;
  const stairs = [{ x: 0, width: ws[(bays - 1) / 2] * 0.9, yulu: ph >= 1.4 }];
  if (bays >= 7 && ph >= 1.4) {
    const k = (bays - 1) / 2;
    const cx = (xs[k - 1] + xs[k]) / 2;
    stairs.push({ x: cx, width: ws[k - 1] * 0.7, yulu: false }, { x: -cx, width: ws[k - 1] * 0.7, yulu: false });
  }
  addPlatform(b, { w: pw, d: pd, h: ph, balustrade, stairs, xsCenter: xs });

  // ---- 柱网 ----
  const colGeo = new THREE.CylinderGeometry(d * 0.46, d * 0.5, 1, 14, 1);
  colGeo.translate(0, 0.5, 0);
  const baseGeo = lathe([[0, 0], [d * 0.85, 0], [d * 0.85, d * 0.25], [d * 0.7, d * 0.3], [d * 0.6, d * 0.42], [0, d * 0.42]], 16);
  const colMs = [], baseMs = [];
  const eaveCols = [];
  for (let i = 0; i < xs.length; i++) for (let j = 0; j < zs.length; j++) {
    const edge = i === 0 || i === xs.length - 1 || j === 0 || j === zs.length - 1;
    const inner = j === 1 || j === zs.length - 2;
    if (!edge && !inner) continue;
    // 金柱减柱：内圈只保留前后两排（j==1 / j==n-2），且不在明间正中
    if (!edge && inner && depthBays < 3) continue;
    const x = xs[i], z = zs[j];
    const h = edge ? hc : hc + (doubleEave ? 0 : 0.0);
    colMs.push(mat4(x, floorY, z, 0, 0, 0, 1, h, 1));
    baseMs.push(mat4(x, floorY, z));
    if (edge) eaveCols.push([x, z]);
  }
  // ---- 檐部：额枋、平板枋、斗拱、挑檐桁 ----
  const beamH = d * 1.25;
  const dgGeo = dougongGeometry({ tiers: doubleEave ? 3 : 2 });
  const dgUnitH = dgGeo.boundingBox.max.y - dgGeo.boundingBox.min.y;
  const dgH = hc * 0.22;
  const dgS = dgH / dgUnitH;
  const dgOut = (dgGeo.boundingBox.max.z) * dgS; // 出跳距离
  const addEaveRing = (x0, x1, z0, z1, yTop, xsRow, zsRow, dgMs) => {
    // 额枋（逐间，便于彩画贴图按间重复）
    const yBeam = yTop - beamH / 2;
    for (let i = 0; i < xsRow.length - 1; i++) {
      const w = xsRow[i + 1] - xsRow[i], cx = (xsRow[i] + xsRow[i + 1]) / 2;
      b.add(box(w, beamH, d * 0.95), caihua, mat4(cx, yBeam, z1));
      b.add(box(w, beamH, d * 0.95), caihua, mat4(cx, yBeam, z0));
    }
    for (let j = 0; j < zsRow.length - 1; j++) {
      const w = Math.abs(zsRow[j + 1] - zsRow[j]), cz = (zsRow[j] + zsRow[j + 1]) / 2;
      b.add(box(w, beamH, d * 0.95), caihua, mat4(x1, yBeam, cz, 0, Math.PI / 2, 0));
      b.add(box(w, beamH, d * 0.95), caihua, mat4(x0, yBeam, cz, 0, Math.PI / 2, 0));
    }
    // 平板枋（环绕一圈）
    const pbH = d * 0.35;
    b.add(box(x1 - x0 + d * 1.4, pbH, d * 1.4), red, mat4(0, yTop + pbH / 2, z1));
    b.add(box(x1 - x0 + d * 1.4, pbH, d * 1.4), red, mat4(0, yTop + pbH / 2, z0));
    b.add(box(d * 1.4, pbH, z1 - z0), red, mat4(x1, yTop + pbH / 2, 0));
    b.add(box(d * 1.4, pbH, z1 - z0), red, mat4(x0, yTop + pbH / 2, 0));
    // 斗拱：柱头科 + 平身科 + 角科
    const yDg = yTop + pbH;
    const spacing = dgH * 1.25;
    const along = (ax, fixed, from, to, rotY) => {
      const len = Math.abs(to - from);
      const n = Math.max(1, Math.round(len / spacing));
      for (let k = 1; k < n; k++) {
        const t = from + (to - from) * (k / n);
        dgMs.push(ax === 'x' ? mat4(t, yDg, fixed, 0, rotY, 0, dgS) : mat4(fixed, yDg, t, 0, rotY, 0, dgS));
      }
    };
    for (let i = 0; i < xsRow.length - 1; i++) { along('x', z1, xsRow[i], xsRow[i + 1], 0); along('x', z0, xsRow[i], xsRow[i + 1], Math.PI); }
    for (let j = 0; j < zsRow.length - 1; j++) { along('z', x1, zsRow[j], zsRow[j + 1], Math.PI / 2); along('z', x0, zsRow[j], zsRow[j + 1], -Math.PI / 2); }
    for (const x of xsRow) { if (Math.abs(x - x0) > 1e-3 && Math.abs(x - x1) > 1e-3) { dgMs.push(mat4(x, yDg, z1, 0, 0, 0, dgS)); dgMs.push(mat4(x, yDg, z0, 0, Math.PI, 0, dgS)); } }
    for (const z of zsRow) { if (Math.abs(z - z0) > 1e-3 && Math.abs(z - z1) > 1e-3) { dgMs.push(mat4(x1, yDg, z, 0, Math.PI / 2, 0, dgS)); dgMs.push(mat4(x0, yDg, z, 0, -Math.PI / 2, 0, dgS)); } }
    // 角科（45°）
    dgMs.push(mat4(x1, yDg, z1, 0, Math.PI / 4, 0, dgS), mat4(x0, yDg, z1, 0, -Math.PI / 4, 0, dgS), mat4(x1, yDg, z0, 0, Math.PI * 0.75, 0, dgS), mat4(x0, yDg, z0, 0, -Math.PI * 0.75, 0, dgS));
    // 挑檐桁（檐檩）：在斗拱外跳端之上
    const yPur = yDg + dgH + d * 0.3;
    const pr = d * 0.32;
    const purlin = new THREE.CylinderGeometry(pr, pr, 1, 10);
    const o = dgOut;
    b.add(purlin, caihua, mat4(0, yPur, z1 + o, 0, 0, Math.PI / 2, 1, (x1 - x0) + 2 * o, 1));
    b.add(purlin, caihua, mat4(0, yPur, z0 - o, 0, 0, Math.PI / 2, 1, (x1 - x0) + 2 * o, 1));
    b.add(new THREE.CylinderGeometry(pr, pr, (z1 - z0) + 2 * o, 10).rotateX(Math.PI / 2), caihua, mat4(x1 + o, yPur, 0));
    b.add(new THREE.CylinderGeometry(pr, pr, (z1 - z0) + 2 * o, 10).rotateX(Math.PI / 2), caihua, mat4(x0 - o, yPur, 0));
    // 垫板（斗拱之间的红色背板，遮挡看进屋内）
    const padH = dgH + pbH;
    b.add(box(x1 - x0, padH, d * 0.5), AM.redWall(), mat4(0, yTop + padH / 2, z1 - d * 0.1));
    b.add(box(x1 - x0, padH, d * 0.5), AM.redWall(), mat4(0, yTop + padH / 2, z0 + d * 0.1));
    b.add(box(d * 0.5, padH, z1 - z0), AM.redWall(), mat4(x1 - d * 0.1, yTop + padH / 2, 0));
    b.add(box(d * 0.5, padH, z1 - z0), AM.redWall(), mat4(x0 + d * 0.1, yTop + padH / 2, 0));
    return yPur + pr + 0.1; // 檐口高度
  };
  const dgMs = [];
  const yColTop = floorY + hc;
  const eaveY = addEaveRing(xL, xR, zB, zF, yColTop, xs, zs, dgMs);

  // ---- 墙体：山墙 + 后檐墙（下碱青砖 + 红墙 + 墙帽） ----
  const wallT = d * 2.2;
  const wallH = hc - beamH * 0.5; // 墙顶到额枋下
  const baseH = hc * 0.28;
  const addWall = (len, cx, cz, rotY) => {
    const m = (y, h, t, mat) => b.add(box(len, h, t), mat, mat4(cx, floorY + y + h / 2, cz, 0, rotY, 0));
    m(0, baseH, wallT * 1.08, AM.brick());
    m(baseH, wallH - baseH - d * 0.5, wallT, AM.redWall());
    m(wallH - d * 0.5, d * 0.5, wallT * 1.12, AM.white());
  };
  if (!openFront || true) {
    addWall(spanX + wallT, 0, zB, 0); // 后檐墙
    addWall(spanZ, xL, 0, Math.PI / 2); // 西山墙
    addWall(spanZ, xR, 0, Math.PI / 2); // 东山墙
  }
  // ---- 前檐：隔扇门（明间及左右）与槛窗 ----
  const lat = AM.lattice('sanjiao');
  const half = (bays - 1) / 2;
  const dh = hc - beamH - d * 0.3; // 门高（到额枋下的上槛）
  for (let i = 0; i < bays; i++) {
    const w = ws[i], cx = (xs[i] + xs[i + 1]) / 2;
    const isDoor = Math.abs(i - half) <= (doorBays - 1) / 2;
    const zWall = zF;
    // 上槛 / 下槛 / 抱框
    b.add(box(w, d * 0.35, d * 0.5), red, mat4(cx, floorY + dh + d * 0.17, zWall));
    b.add(box(d * 0.5, dh, d * 0.5), red, mat4(xs[i] + d * 0.5, floorY + dh / 2, zWall));
    b.add(box(d * 0.5, dh, d * 0.5), red, mat4(xs[i + 1] - d * 0.5, floorY + dh / 2, zWall));
    // 横披窗（上槛下的一条横向棂花）
    const hpH = dh * 0.14;
    b.add(new THREE.PlaneGeometry(w - d, hpH), lat, mat4(cx, floorY + dh - hpH / 2 - d * 0.1, zWall + 0.02));
    b.add(box(w - d, d * 0.2, d * 0.35), red, mat4(cx, floorY + dh - hpH - d * 0.2, zWall)); // 中槛
    const innerW = w - d;
    if (isDoor) {
      if (openFront && Math.abs(i - half) === 0) continue; // 明间敞开
      const n = 4;
      const lw = innerW / n;
      const lh = dh - hpH - d * 0.3;
      for (let k = 0; k < n; k++) {
        const x = cx - innerW / 2 + lw * (k + 0.5);
        // 明间中央两扇半开（旋转）
        const open = Math.abs(i - half) === 0 && (k === 1 || k === 2) && doors !== 'solid';
        let m;
        if (open) {
          const hinge = k === 1 ? x - lw / 2 : x + lw / 2;
          const ang = (k === 1 ? -1 : 1) * 1.25;
          m = mat4(hinge, floorY + 0.02, zWall, 0, ang, 0).multiply(mat4(k === 1 ? lw / 2 : -lw / 2, 0, 0));
        } else m = mat4(x, floorY + 0.02, zWall);
        if (doors === 'solid') {
          b.add(box(lw - 0.02, lh, 0.08), red, m.clone().multiply(mat4(0, lh / 2, 0)));
        } else addDoorLeaf(b, lw - 0.015, lh, lat, m);
      }
      // 下槛
      b.add(box(w, d * 0.3, d * 0.6), red, mat4(cx, floorY + d * 0.15, zWall));
    } else {
      // 槛墙 + 槛窗
      const kwH = hc * 0.28;
      b.add(box(innerW, kwH, wallT), AM.brick(), mat4(cx, floorY + kwH / 2, zWall));
      b.add(box(innerW, d * 0.3, wallT * 1.1), red, mat4(cx, floorY + kwH + d * 0.15, zWall)); // 榻板/风槛
      const wh = dh - hpH - kwH - d * 0.6;
      const n = 4, lw = innerW / n;
      for (let k = 0; k < n; k++) {
        const x = cx - innerW / 2 + lw * (k + 0.5);
        const m = mat4(x, floorY + kwH + d * 0.3, zWall);
        // 槛窗：只有棂心与边框
        const fr = 0.07;
        b.add(box(fr, wh, 0.06), red, m.clone().multiply(mat4(-lw / 2 + fr / 2, wh / 2, 0)));
        b.add(box(fr, wh, 0.06), red, m.clone().multiply(mat4(lw / 2 - fr / 2, wh / 2, 0)));
        b.add(box(lw, fr, 0.06), red, m.clone().multiply(mat4(0, fr / 2, 0)));
        b.add(box(lw, fr, 0.06), red, m.clone().multiply(mat4(0, wh - fr / 2, 0)));
        b.add(new THREE.PlaneGeometry(lw - fr * 2, wh - fr * 2), lat, m.clone().multiply(mat4(0, wh / 2, 0.012)));
        b.add(new THREE.PlaneGeometry(lw - fr * 2, wh - fr * 2), AM.paper(), m.clone().multiply(mat4(0, wh / 2, -0.012)));
      }
    }
  }

  // ---- 室内：地面、天花、藻井 ----
  b.add(box(spanX, 0.04, spanZ), AM.floor(), mat4(0, floorY + 0.08, 0));
  const ceilY = floorY + hc * 0.92;
  const cell = Math.min(1.2, bayWidth / 3.5);
  const nx = Math.round(spanX / cell), nz = Math.round(spanZ / cell);
  // 天花板面（整块，带彩绘贴图按格重复）
  const tianM = AM.tianhua();
  const r0 = Math.min(bayWidth, bayDepth) * 0.55; // 藻井半径
  let tp;
  if (doubleEave) {
    // 带八角洞口的天花板（洞口上方为藻井）
    const sh = new THREE.Shape();
    const hw = (spanX - wallT) / 2, hd = (spanZ - wallT) / 2;
    sh.moveTo(-hw, -hd); sh.lineTo(hw, -hd); sh.lineTo(hw, hd); sh.lineTo(-hw, hd); sh.closePath();
    const hole = new THREE.Path();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; const x = Math.cos(a) * r0, y = Math.sin(a) * r0; i ? hole.lineTo(x, y) : hole.moveTo(x, y); }
    hole.closePath(); sh.holes.push(hole);
    tp = new THREE.ShapeGeometry(sh, 2);
    const uv = tp.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + hw) / (2 * hw) * nx, (uv.getY(i) + hd) / (2 * hd) * nz);
    tp.rotateX(Math.PI / 2);
  } else {
    tp = new THREE.PlaneGeometry(spanX - wallT, spanZ - wallT);
    tp.rotateX(Math.PI / 2);
    const uv = tp.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * nx, uv.getY(i) * nz);
  }
  b.add(tp, tianM, mat4(0, ceilY, 0));
  // 井口枋（格栅）
  for (let i = 0; i <= nx; i++) b.add(box(0.1, 0.12, spanZ - wallT), AM.rafter(), mat4(-spanX / 2 + wallT / 2 + (spanX - wallT) * (i / nx), ceilY - 0.06, 0));
  for (let j = 0; j <= nz; j++) b.add(box(spanX - wallT, 0.12, 0.1), AM.rafter(), mat4(0, ceilY - 0.06, -spanZ / 2 + wallT / 2 + (spanZ - wallT) * (j / nz)));
  if (doubleEave) {
    // 藻井：中央八角叠涩穹顶（金）
    const zj = lathe([[r0 * 1.02, 0], [r0 * 0.85, 0.5], [r0 * 0.7, 0.9], [r0 * 0.5, 1.25], [r0 * 0.3, 1.5], [0.1, 1.65], [0, 1.65]], 8);
    zj.scale(1, 1, -1); zj.computeVertexNormals(); // 翻转朝内，使穹顶从下方可见
    b.add(zj, AM.gold(), mat4(0, ceilY - 0.02, 0, 0, Math.PI / 8, 0));
    // 叠涩层（逐层收进的八角环）
    for (let k = 0; k < 3; k++) {
      const rr = r0 * (0.95 - k * 0.18), yy = ceilY + 0.3 + k * 0.42;
      b.add(new THREE.TorusGeometry(rr, 0.07, 5, 8), AM.rafter(), mat4(0, yy, 0, Math.PI / 2, Math.PI / 8, 0));
    }
    // 顶部蟠龙宝珠
    b.add(new THREE.SphereGeometry(0.18, 10, 8), AM.gold(), mat4(0, ceilY + 1.45, 0));
    b.add(new THREE.TorusGeometry(r0 * 0.98, 0.08, 6, 8), AM.rafter(), mat4(0, ceilY - 0.02, 0, Math.PI / 2, Math.PI / 8, 0));
  }
  // 内檐（金柱上的额枋）
  for (const j of [1, zs.length - 2]) if (j > 0 && j < zs.length - 1) {
    for (let i = 0; i < xs.length - 1; i++) b.add(box(xs[i + 1] - xs[i], beamH, d * 0.9), caihua, mat4((xs[i] + xs[i + 1]) / 2, yColTop - beamH / 2, zs[j]));
  }

  // ---- 匾额与对联 ----
  const plaqueW = Math.min(ws[half] * 0.72, 5.2), plaqueH = plaqueW * 0.38;
  const addPlaque = (y, z) => {
    const pm = AM.plaque(plaqueText);
    b.add(box(plaqueW, plaqueH, 0.1), AM.darkWood(), mat4(0, y, z - 0.03));
    b.add(new THREE.PlaneGeometry(plaqueW * 0.96, plaqueH * 0.92), pm, mat4(0, y, z + 0.03));
    // 金边框
    for (const [w, h, ox, oy] of [[plaqueW, 0.06, 0, plaqueH / 2], [plaqueW, 0.06, 0, -plaqueH / 2], [0.06, plaqueH, plaqueW / 2, 0], [0.06, plaqueH, -plaqueW / 2, 0]]) b.add(box(w, h, 0.14), AM.gold(), mat4(ox, y + oy, z));
  };
  if (coupletText) {
    const cw = d * 0.9, chh = hc * 0.6;
    for (const [k, text] of [[half, coupletText[1]], [half + 1, coupletText[0]]]) {
      const x = xs[k];
      const y = floorY + hc * 0.66;
      b.add(box(cw, chh, 0.06), AM.darkWood(), mat4(x, y, zF + d * 0.5 + 0.03));
      b.add(new THREE.PlaneGeometry(cw * 0.92, chh * 0.98), AM.couplet(text), mat4(x, y, zF + d * 0.5 + 0.07));
    }
  }

  // ---- 屋顶 ----
  let roof, roofTop;
  const ridgeOf = (depth) => Math.max(1.05 * hc, 0.3 * depth);
  if (doubleEave) {
    // 上檐柱 = 内圈金柱；上檐体
    const inX0 = xs[1], inX1 = xs[xs.length - 2], inZ1 = zs[1], inZ0 = zs[zs.length - 2];
    const lowerW = spanX + 2 * overhang, lowerD = spanZ + 2 * overhang;
    const skirt = overhang + (zF - inZ1) + d * 0.8;
    const run = lowerD / 2;
    const tMax = Math.min(0.95, skirt / run);
    const lowerRise = skirt * 0.5;
    const Hl = lowerRise / (0.52 * tMax + 0.48 * tMax * tMax);
    const lowerTop = eaveY + lowerRise;
    // 上檐柱身（从天花以上到上檐柱顶）
    const yUTop = lowerTop + (storeys === 2 ? hc * 0.78 : hc * 0.26);
    const colH2 = yUTop - (floorY + hc * 0.9);
    const xsU = xs.slice(1, -1), zsU = zs.slice(1, -1);
    for (const x of xsU) for (const z of zsU) {
      if (!(x === inX0 || x === inX1 || z === inZ0 || z === inZ1)) continue;
      colMs.push(mat4(x, floorY + hc * 0.9, z, 0, 0, 0, 1, colH2, 1));
    }
    // 上檐墙体（红墙，夹在柱间）
    const uWallH = yUTop - beamH * 0.5 - lowerTop + 0.4;
    const uwY = lowerTop - 0.4;
    b.add(box(inX1 - inX0, uWallH, wallT), AM.redWall(), mat4(0, uwY + uWallH / 2, inZ0));
    b.add(box(wallT, uWallH, inZ1 - inZ0), AM.redWall(), mat4(inX0, uwY + uWallH / 2, 0));
    b.add(box(wallT, uWallH, inZ1 - inZ0), AM.redWall(), mat4(inX1, uwY + uWallH / 2, 0));
    if (storeys === 2) {
      // 二层楼：前檐槛墙 + 槛窗，侧后为红墙
      const kwH = uWallH * 0.42;
      b.add(box(inX1 - inX0, kwH, wallT), AM.redWall(), mat4(0, uwY + kwH / 2, inZ1));
      b.add(box(inX1 - inX0, d * 0.3, wallT * 1.1), red, mat4(0, uwY + kwH + d * 0.15, inZ1));
      const wh = uWallH - kwH - d * 0.3 - beamH * 0.5 + 0.1;
      for (let i = 0; i < xsU.length - 1; i++) {
        const w = xsU[i + 1] - xsU[i], cx = (xsU[i] + xsU[i + 1]) / 2;
        const innerW = w - d, n = 4, lw = innerW / n, fr = 0.07;
        for (let k = 0; k < n; k++) {
          const x = cx - innerW / 2 + lw * (k + 0.5);
          const m = mat4(x, uwY + kwH + d * 0.3, inZ1);
          b.add(box(fr, wh, 0.06), red, m.clone().multiply(mat4(-lw / 2 + fr / 2, wh / 2, 0)));
          b.add(box(fr, wh, 0.06), red, m.clone().multiply(mat4(lw / 2 - fr / 2, wh / 2, 0)));
          b.add(box(lw, fr, 0.06), red, m.clone().multiply(mat4(0, wh - fr / 2, 0)));
          b.add(new THREE.PlaneGeometry(lw - fr * 2, wh - fr * 2), lat, m.clone().multiply(mat4(0, wh / 2, 0.012)));
          b.add(new THREE.PlaneGeometry(lw - fr * 2, wh - fr * 2), AM.paper(), m.clone().multiply(mat4(0, wh / 2, -0.012)));
        }
        b.add(box(d * 0.5, wh, d * 0.5), red, mat4(xsU[i] + d * 0.5, uwY + kwH + d * 0.3 + wh / 2, inZ1));
        b.add(box(d * 0.5, wh, d * 0.5), red, mat4(xsU[i + 1] - d * 0.5, uwY + kwH + d * 0.3 + wh / 2, inZ1));
      }
    } else {
      // 上檐前墙：红墙
      b.add(box(inX1 - inX0, uWallH, wallT), AM.redWall(), mat4(0, uwY + uWallH / 2, inZ1));
    }
    // 上檐檐部
    const eaveY2 = addEaveRing(inX0, inX1, inZ0, inZ1, yUTop, xsU, zsU, dgMs);
    const upperW = (inX1 - inX0) + 2 * overhang, upperD = (inZ1 - inZ0) + 2 * overhang;
    roof = buildRoof({ style: roofStyle, width: upperW, depth: upperD, eaveHeight: eaveY2, ridgeHeight: ridgeOf(upperD), overhang, doubleEave: true, lower: { eaveHeight: eaveY, width: lowerW, depth: lowerD, skirt, rise: Hl }, tileColor, beasts: 7, ridgeScale: 1.1 }, b);
    roofTop = eaveY2 + ridgeOf(upperD);
    addPlaque(yUTop - beamH * 0.5 + 0.1, inZ1 + d * 0.6);
  } else {
    const W = spanX + 2 * overhang, D = spanZ + 2 * overhang;
    roof = buildRoof({ style: roofStyle, width: W, depth: D, eaveHeight: eaveY, ridgeHeight: ridgeOf(D), overhang, tileColor, beasts: 5 }, b);
    roofTop = eaveY + ridgeOf(D);
    addPlaque(yColTop - beamH * 0.5 + 0.05, zF + d * 0.6);
  }
  // 柱与柱础实例
  b.inst(colGeo, red, colMs);
  b.inst(baseGeo, AM.stone(), baseMs);
  b.inst(dgGeo, AM.vcolor(), dgMs);

  b.build(group);
  void roof;
  group.userData = {
    floorY,
    interior: { xMin: xL + wallT, xMax: xR - wallT, zMin: zB + wallT, zMax: zF - wallT, yMax: ceilY },
    entrance: [0, floorY, zF],
    span: { w: spanX, d: spanZ, platformW: pw, platformD: pd },
    innerRows: { front: zs[1], back: zs[zs.length - 2] },
    columnHeight: hc, roofTop, eaveY,
  };
  return group;
}
