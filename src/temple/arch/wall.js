// 围墙（红墙灰瓦墙帽、角柱）与影壁
import * as THREE from 'three';
import { PartBuilder, box, mat4, rectProfile, sweepRect } from './util.js';
import { AM } from './materials.js';
import { buildRoof } from './roof.js';

const V = THREE.Vector3;

/** 一段墙：从 a 到 c（水平），含下碱、红墙、墙帽（带小瓦实例） */
function wallSegment(b, a, c, height, t, tileMs, ridgeMs) {
  const len = a.distanceTo(c);
  const mid = new V().lerpVectors(a, c, 0.5);
  const ang = Math.atan2(c.x - a.x, c.z - a.z); // 沿 z 为 0
  const rotY = ang;
  const baseH = Math.min(1.0, height * 0.3);
  const m = (y, h, tt, mat) => b.add(box(tt, h, len), mat, mat4(mid.x, y + h / 2, mid.z, 0, rotY, 0));
  m(0, baseH, t * 1.1, AM.brick());
  m(baseH, height - baseH, t, AM.redWall());
  // 墙帽：白灰抹的挑檐 + 双坡瓦顶
  m(height, 0.12, t + 0.3, AM.white());
  m(height + 0.12, 0.08, t + 0.5, AM.brick());
  const capH = 0.38, capW = t + 0.7;
  // 双坡：两块倾斜板
  const slope = Math.atan2(capH, capW / 2);
  const slab = Math.hypot(capH, capW / 2);
  for (const sgn of [-1, 1]) {
    const rot = new THREE.Matrix4().makeRotationY(rotY).multiply(new THREE.Matrix4().makeRotationZ(sgn * slope));
    const mm = new THREE.Matrix4().makeTranslation(mid.x, height + 0.2 + capH / 2, mid.z).multiply(new THREE.Matrix4().makeRotationY(rotY)).multiply(mat4(sgn * capW / 4, 0, 0, 0, 0, -sgn * slope));
    b.add(box(slab, 0.06, len), AM.tile('grey'), mm);
    void rot;
    // 小筒瓦实例：沿墙每 0.3m 一条，放在坡面上
    const n = Math.floor(len / 0.3);
    for (let i = 0; i < n; i++) {
      const p = new V().lerpVectors(a, c, (i + 0.5) / n);
      tileMs.push(new THREE.Matrix4().makeTranslation(p.x, height + 0.2 + capH / 2 + 0.04, p.z).multiply(new THREE.Matrix4().makeRotationY(rotY)).multiply(mat4(sgn * capW / 4, 0, 0, 0, 0, -sgn * slope)));
    }
  }
  // 脊（墙帽顶）
  ridgeMs.push(new THREE.Matrix4().makeTranslation(mid.x, height + 0.2 + capH + 0.03, mid.z).multiply(new THREE.Matrix4().makeRotationY(rotY)).multiply(mat4(0, 0, 0, 0, 0, 0, 1, 1, len)));
}

/**
 * 围墙：矩形 width×depth（中心原点），前墙（+z）留出 gap 宽的门洞（山门处）。
 */
export function buildEnclosure({ width = 70, depth = 130, height = 3.2, thickness = 0.8, gap = 24, gapZ = null } = {}) {
  const g = new THREE.Group();
  g.name = '围墙';
  const b = new PartBuilder();
  const hw = width / 2, hd = depth / 2;
  const zF = gapZ ?? hd;
  const tileMs = [], ridgeMs = [];
  const seg = (ax, az, bx, bz) => wallSegment(b, new V(ax, 0, az), new V(bx, 0, bz), height, thickness, tileMs, ridgeMs);
  // 前墙（两段）
  seg(-hw, zF, -gap / 2, zF);
  seg(gap / 2, zF, hw, zF);
  seg(hw, zF, hw, -hd);
  seg(hw, -hd, -hw, -hd);
  seg(-hw, -hd, -hw, zF);
  // 角柱（略高的方墩 + 小帽）
  for (const [x, z] of [[-hw, zF], [hw, zF], [hw, -hd], [-hw, -hd], [-gap / 2, zF], [gap / 2, zF]]) {
    b.add(box(thickness + 0.6, height + 0.5, thickness + 0.6), AM.redWall(), mat4(x, (height + 0.5) / 2, z));
    b.add(box(thickness + 0.9, 0.14, thickness + 0.9), AM.white(), mat4(x, height + 0.57, z));
    b.add(box(thickness + 0.5, 0.35, thickness + 0.5), AM.tile('grey'), mat4(x, height + 0.8, z));
    b.add(new THREE.SphereGeometry(0.2, 8, 6), AM.ridge('grey'), mat4(x, height + 1.05, z));
  }
  const tube = new THREE.CylinderGeometry(0.07, 0.07, 0.45, 5, 1, true, 0, Math.PI);
  tube.rotateZ(Math.PI / 2); // 轴向 → x（横跨坡面）
  b.inst(tube, AM.tube('grey'), tileMs);
  b.inst(box(0.2, 0.12, 1), AM.ridge('grey'), ridgeMs);
  b.build(g);
  return g;
}

/** 影壁：一字影壁，须弥座、红墙心白匣、灰瓦悬山顶 */
export function buildScreenWall({ width = 14, height = 4.2, thickness = 1.0, text = '福' } = {}) {
  const g = new THREE.Group();
  g.name = '影壁';
  const b = new PartBuilder();
  const ph = 0.9;
  b.add(rectProfile([[0, 0], [0, 0.12], [0.06, 0.16], [0.06, 0.3], [0.14, 0.36], [0.14, 0.6], [0.06, 0.66], [0.06, 0.8], [0, 0.85], [0, 0.9]], width + 1.2, thickness + 1.2), AM.marble());
  b.add(box(width, height, thickness), AM.redWall(), mat4(0, ph + height / 2, 0));
  // 墙心：方形白灰盒子 + 中心岔角花（金）
  for (const sgn of [1, -1]) {
    const z = sgn * (thickness / 2 + 0.03);
    b.add(box(width * 0.55, height * 0.6, 0.06), AM.white(), mat4(0, ph + height * 0.5, z));
    b.add(box(width * 0.55 + 0.3, height * 0.6 + 0.3, 0.02), AM.brick(), mat4(0, ph + height * 0.5, sgn * (thickness / 2 + 0.005)));
    b.add(new THREE.PlaneGeometry(height * 0.42, height * 0.42), AM.plaque(text, { w: 512, h: 512, rtl: false, bg: '#e8e4da', fg: '#8c1c16', border: '#c9a040' }), mat4(0, ph + height * 0.5, z + sgn * 0.035, 0, sgn > 0 ? 0 : Math.PI, 0));
    for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) b.add(new THREE.CircleGeometry(0.28, 8), AM.gold(), mat4(sx * (width * 0.275 - 0.35), ph + height * 0.5 + sy * (height * 0.3 - 0.35), z + sgn * 0.035, 0, sgn > 0 ? 0 : Math.PI, 0));
  }
  // 墙顶叠涩与彩画带
  b.add(box(width + 0.3, 0.14, thickness + 0.3), AM.white(), mat4(0, ph + height + 0.07, 0));
  b.add(box(width + 0.6, 0.3, thickness + 0.6), AM.caihua('xuanzi'), mat4(0, ph + height + 0.3, 0));
  buildRoof({ style: 'xuanshan', width: width + 1.6, depth: thickness + 2.4, eaveHeight: ph + height + 0.6, ridgeHeight: 1.6, overhang: 1.0, tileColor: 'grey', beasts: 0, ridgeScale: 0.6 }, b);
  b.build(g);
  return g;
}

void sweepRect;
