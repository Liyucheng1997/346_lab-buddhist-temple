// 钟楼 / 鼓楼：两层方亭，下层砖墙券门，上层开敞带栏杆，攒尖顶；内悬铜钟或置大鼓
import * as THREE from 'three';
import { PartBuilder, box, lathe, mat4, rectProfile, sweepRect } from './util.js';
import { AM } from './materials.js';
import { buildRoof } from './roof.js';
import { dougongGeometry } from './dougong.js';

const V = THREE.Vector3;

/** 铜钟（旋成体）+ 蒲牢钟钮，原点在钟口中心向上 */
function bell(b, m, r = 0.9) {
  const prof = [[0, 0], [r, 0], [r * 1.03, 0.06], [r * 0.98, 0.15], [r * 0.95, 0.5], [r * 0.93, 1.0], [r * 0.88, 1.5], [r * 0.78, 1.9], [r * 0.6, 2.15], [r * 0.35, 2.28], [0, 2.32]].map(([a, y]) => [a, y * r]);
  b.add(lathe(prof, 32), AM.bronze(), m);
  // 钟口内凹（内壁）
  b.add(lathe([[0, 0.02 * r], [r * 0.9, 0.02 * r], [r * 0.8, 1.5 * r], [0, 1.8 * r]].reverse(), 24), AM.darkBronze(), m);
  // 钟带（横向凸纹）
  for (const y of [0.3, 0.95, 1.6]) b.add(new THREE.TorusGeometry(r * (0.97 - y * 0.06), 0.03 * r, 6, 32).rotateX(Math.PI / 2), AM.bronze(), m.clone().multiply(mat4(0, y * r, 0)));
  // 乳钉（钟体上的小凸点）
  const nail = new THREE.SphereGeometry(0.05 * r, 6, 5);
  const ms = [];
  for (let i = 0; i < 24; i++) for (let j = 0; j < 3; j++) {
    const a = (i / 24) * Math.PI * 2;
    const y = (1.1 + j * 0.16) * r, rr = r * (0.96 - (y / r) * 0.06);
    ms.push(m.clone().multiply(mat4(Math.cos(a) * rr, y, Math.sin(a) * rr)));
  }
  b.inst(nail, AM.bronze(), ms);
  // 蒲牢（钟钮：双龙拱起的环）
  b.add(new THREE.TorusGeometry(0.28 * r, 0.08 * r, 8, 16), AM.bronze(), m.clone().multiply(mat4(0, 2.5 * r, 0)));
  b.add(new THREE.SphereGeometry(0.14 * r, 8, 6), AM.bronze(), m.clone().multiply(mat4(0.3 * r, 2.35 * r, 0)));
  b.add(new THREE.SphereGeometry(0.14 * r, 8, 6), AM.bronze(), m.clone().multiply(mat4(-0.3 * r, 2.35 * r, 0)));
}

/** 大鼓（轴向沿 x）+ 鼓架 */
function drum(b, m, r = 1.1, len = 1.7) {
  const body = new THREE.CylinderGeometry(r, r, len, 28);
  body.rotateZ(Math.PI / 2);
  b.add(body, AM.redWood(), m.clone().multiply(mat4(0, r + 0.6, 0)));
  const skin = new THREE.CircleGeometry(r * 0.96, 28);
  b.add(skin, AM.drumSkin(), m.clone().multiply(mat4(len / 2 + 0.005, r + 0.6, 0, 0, Math.PI / 2, 0)));
  b.add(skin, AM.drumSkin(), m.clone().multiply(mat4(-len / 2 - 0.005, r + 0.6, 0, 0, -Math.PI / 2, 0)));
  // 鼓钉圈
  const nail = new THREE.SphereGeometry(0.04, 6, 5);
  const ms = [];
  for (const sx of [1, -1]) for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; ms.push(m.clone().multiply(mat4(sx * (len / 2 - 0.08), r + 0.6 + Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98))); }
  b.inst(nail, AM.gold(), ms);
  // 鼓架（红木 X 形支架）
  for (const sx of [1, -1]) {
    b.add(box(0.12, 1.4, 0.12), AM.darkWood(), m.clone().multiply(mat4(sx * (len / 2 + 0.2), 0.7, 0.5, 0.5, 0, 0)));
    b.add(box(0.12, 1.4, 0.12), AM.darkWood(), m.clone().multiply(mat4(sx * (len / 2 + 0.2), 0.7, -0.5, -0.5, 0, 0)));
    b.add(box(0.14, 0.12, 1.6), AM.darkWood(), m.clone().multiply(mat4(sx * (len / 2 + 0.2), 0.06, 0)));
  }
  b.add(box(len + 0.6, 0.12, 0.14), AM.darkWood(), m.clone().multiply(mat4(0, 1.35, 0)));
}

/**
 * 钟楼 / 鼓楼。返回 Group，userData = { floorY, upperFloorY }
 */
export function buildTower({ kind = 'bell', size = 7.5, tileColor = 'grey' } = {}) {
  const group = new THREE.Group();
  group.name = kind === 'bell' ? '钟楼' : '鼓楼';
  const b = new PartBuilder();
  const s = size, ph = 0.7, h1 = 5.2, h2 = 4.4;
  const red = AM.redWood();
  // 台基
  b.add(rectProfile([[0, 0], [0, ph * 0.8], [0.08, ph * 0.86], [0.08, ph]], s + 2, s + 2, { uvScale: 2 }), AM.stone());
  for (let i = 0; i < 4; i++) b.add(box(2.6, ph / 4, 0.3 * (4 - i)), AM.stone(), mat4(0, (i + 0.5) * ph / 4, (s + 2) / 2 + 0.15 * (4 - i)));
  // 下层：砖墙 + 券门（前后）
  const t = 0.9;
  const baseH = 1.2;
  const archW = 2.4, archH = 3.6;
  const wallShape = (w, hh, withArch) => {
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, hh); sh.lineTo(-w / 2, hh); sh.closePath();
    if (withArch) {
      const hole = new THREE.Path(); const r = archW / 2;
      hole.moveTo(-r, 0); hole.lineTo(-r, archH - r); hole.absarc(0, archH - r, r, Math.PI, 0, true); hole.lineTo(r, 0); hole.closePath();
      sh.holes.push(hole);
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false, curveSegments: 12 });
    g.translate(0, 0, -t / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
    return g;
  };
  // 前后墙（带券门），左右墙（实）
  b.add(wallShape(s, h1, true), AM.redWall(), mat4(0, ph, s / 2 - t / 2));
  b.add(wallShape(s, h1, true), AM.redWall(), mat4(0, ph, -s / 2 + t / 2));
  b.add(wallShape(s, h1, false), AM.redWall(), mat4(0, ph, 0, 0, Math.PI / 2, 0).multiply(mat4(0, 0, s / 2 - t / 2)));
  b.add(wallShape(s, h1, false), AM.redWall(), mat4(0, ph, 0, 0, Math.PI / 2, 0).multiply(mat4(0, 0, -s / 2 + t / 2)));
  // 下碱青砖（环绕一圈，带券门缺口近似：前后用带洞形状）
  b.add(wallShape(s + 0.1, baseH, true), AM.brick(), mat4(0, ph, s / 2 - t / 2).multiply(mat4(0, 0, 0, 0, 0, 0, 1, 1, 1.12)));
  b.add(wallShape(s + 0.1, baseH, true), AM.brick(), mat4(0, ph, -s / 2 + t / 2).multiply(mat4(0, 0, 0, 0, 0, 0, 1, 1, 1.12)));
  b.add(box(t * 1.12, baseH, s + 0.1), AM.brick(), mat4(s / 2 - t / 2, ph + baseH / 2, 0));
  b.add(box(t * 1.12, baseH, s + 0.1), AM.brick(), mat4(-s / 2 + t / 2, ph + baseH / 2, 0));
  // 券脸石
  for (const sgn of [1, -1]) {
    const ring = new THREE.RingGeometry(archW / 2, archW / 2 + 0.22, 16, 1, 0, Math.PI);
    b.add(ring, AM.marble(), mat4(0, ph + archH - archW / 2, sgn * (s / 2 + 0.01), 0, sgn > 0 ? 0 : Math.PI, 0));
  }
  // 下层内地面
  b.add(box(s - 2 * t, 0.05, s - 2 * t), AM.floor(), mat4(0, ph + 0.03, 0));
  // 腰檐下的叠涩砖檐 + 彩画带
  b.add(box(s + 0.4, 0.14, s + 0.4), AM.white(), mat4(0, ph + h1 + 0.07, 0));
  b.add(box(s + 0.7, 0.14, s + 0.7), AM.brick(), mat4(0, ph + h1 + 0.21, 0));
  b.add(box(s + 0.9, 0.4, s + 0.9), AM.caihua('xuanzi'), mat4(0, ph + h1 + 0.48, 0));
  const eaveY1 = ph + h1 + 0.95;
  // 上层：楼板 + 12 根柱 + 栏杆 + 额枋 + 斗拱
  const y2 = ph + h1 + 2.3; // 上层楼板
  const s2 = s - 1.0; // 上层柱网边长
  b.add(box(s2 + 0.8, 0.3, s2 + 0.8), AM.darkWood(), mat4(0, y2 - 0.15, 0));
  b.add(box(s2 - 0.6, 0.06, s2 - 0.6), AM.floor(), mat4(0, y2 + 0.03, 0));
  const colGeo = new THREE.CylinderGeometry(0.17, 0.19, h2, 12);
  const colMs = [];
  const pts = [];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (i !== 0 || j !== 0) pts.push([i * s2 / 2, j * s2 / 2]);
  for (const [x, z] of pts) colMs.push(mat4(x, y2 + h2 / 2, z));
  b.inst(colGeo, red, colMs);
  // 栏杆（木制红色：望柱 + 寻杖 + 棂条）
  const railY = y2;
  const ring = [[-1, 1, 1, 1], [1, 1, 1, -1], [1, -1, -1, -1], [-1, -1, -1, 1]];
  for (const [ax, az, bx, bz] of ring) {
    const a = new V(ax * (s2 / 2 + 0.3), railY, az * (s2 / 2 + 0.3)), c = new V(bx * (s2 / 2 + 0.3), railY, bz * (s2 / 2 + 0.3));
    const n = 4;
    for (let k = 0; k <= n; k++) {
      const p = new V().lerpVectors(a, c, k / n);
      b.add(box(0.14, 1.0, 0.14), red, mat4(p.x, railY + 0.5, p.z));
      b.add(new THREE.SphereGeometry(0.09, 8, 6), AM.gold(), mat4(p.x, railY + 1.05, p.z));
    }
    b.add(sweepRect([a.clone().add(new V(0, 0.95, 0)), c.clone().add(new V(0, 0.95, 0))], 0.1, 0.08), red);
    b.add(sweepRect([a.clone().add(new V(0, 0.55, 0)), c.clone().add(new V(0, 0.55, 0))], 0.06, 0.06), red);
    b.add(sweepRect([a.clone().add(new V(0, 0.12, 0)), c.clone().add(new V(0, 0.12, 0))], 0.08, 0.2), red);
    // 棂条
    const len = a.distanceTo(c), m2 = Math.floor(len / 0.3);
    for (let k = 1; k < m2; k++) { const p = new V().lerpVectors(a, c, k / m2); b.add(box(0.04, 0.33, 0.04), red, mat4(p.x, railY + 0.38, p.z)); }
  }
  // 额枋 + 平板枋 + 斗拱
  const yTop = y2 + h2;
  const beamH = 0.38;
  for (const [cx, cz, ry] of [[0, s2 / 2, 0], [0, -s2 / 2, 0], [s2 / 2, 0, Math.PI / 2], [-s2 / 2, 0, Math.PI / 2]]) b.add(box(s2, beamH, 0.3), AM.caihua('xuanzi'), mat4(cx, yTop - beamH / 2, cz, 0, ry, 0));
  b.add(box(s2 + 0.5, 0.12, s2 + 0.5), red, mat4(0, yTop + 0.06, 0));
  b.add(box(s2 - 0.1, 0.9, s2 - 0.1), AM.redWall(), mat4(0, yTop + 0.55, 0)); // 斗拱间垫板
  const dg = dougongGeometry({ tiers: 2 });
  const dgH = 0.85, dgS = dgH / (dg.boundingBox.max.y - dg.boundingBox.min.y);
  const dgMs = [];
  for (const [sx, sz, ry] of [[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]]) {
    for (let k = -3; k <= 3; k++) {
      const tpos = k * s2 / 6;
      const x = sx ? sx * s2 / 2 : tpos, z = sz ? sz * s2 / 2 : tpos;
      if (Math.abs(k) === 3) continue;
      dgMs.push(mat4(x, yTop + 0.12, z, 0, ry, 0, dgS));
    }
  }
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) dgMs.push(mat4(sx * s2 / 2, yTop + 0.12, sz * s2 / 2, 0, Math.atan2(sx, sz), 0, dgS));
  b.inst(dg, AM.vcolor(), dgMs);
  const eaveY2 = yTop + 0.12 + dgH + 0.35;
  // 钟 / 鼓
  if (kind === 'bell') {
    b.add(box(0.3, 0.3, s2 - 0.3), AM.darkWood(), mat4(0, yTop - 0.6, 0));
    b.add(box(0.3, 0.3, s2 - 0.3), AM.darkWood(), mat4(0, yTop - 0.6, 0, 0, Math.PI / 2, 0));
    const r = 0.95;
    bell(b, mat4(0, yTop - 0.75 - 2.5 * r, 0), r);
    // 撞钟木
    const log = new THREE.CylinderGeometry(0.14, 0.14, 2.4, 10); log.rotateZ(Math.PI / 2);
    b.add(log, AM.darkWood(), mat4(1.9, yTop - 0.75 - 1.6 * r, 0));
  } else {
    drum(b, mat4(0, y2, 0), 1.15, 1.8);
  }
  // 屋顶：攒尖主顶 + 腰檐
  buildRoof({
    style: 'cuanjian', width: s2 + 3.2, depth: s2 + 3.2, eaveHeight: eaveY2, ridgeHeight: 4.2, overhang: 1.6, sides: 4, tileColor,
    doubleEave: true, lower: { eaveHeight: eaveY1, width: s + 3.6, depth: s + 3.6, skirt: 2.5, rise: 1.0, liftScale: 0.45 }, beasts: 3, ridgeScale: 0.8,
  }, b);
  b.build(group);
  group.userData = { floorY: ph, upperFloorY: y2, roofTop: eaveY2 + 4.2 };
  return group;
}
