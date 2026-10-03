// 山门：厚重红墙开三券门（中大侧小），歇山顶，抱鼓石，红门金钉铺首
import * as THREE from 'three';
import { PartBuilder, box, lathe, mat4, rectProfile } from './util.js';
import { AM } from './materials.js';
import { buildRoof } from './roof.js';

/** 带券门洞的墙体截面（xy 平面），挤出厚度 t */
function archedWall(w, h, arches, t, mat, b, y0, zc) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(w / 2, h); shape.lineTo(-w / 2, h); shape.closePath();
  for (const a of arches) {
    const hole = new THREE.Path();
    const r = a.w / 2;
    const top = a.h - r;
    hole.moveTo(a.x - r, 0);
    hole.lineTo(a.x - r, top);
    hole.absarc(a.x, top, r, Math.PI, 0, true);
    hole.lineTo(a.x + r, 0);
    hole.closePath();
    shape.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 14 });
  g.translate(0, 0, -t / 2);
  // uv 按米缩放（挤出几何默认 uv 为坐标值）
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
  b.add(g, mat, mat4(0, y0, zc));
}

/** 一扇门板（原点在合页侧下角，向 +x 展开，面朝 +z） */
function doorLeaf(b, w, h, rows, cols, m, mirrorNails = false) {
  b.add(box(w, h, 0.12), AM.redWood(), m.clone().multiply(mat4(w / 2, h / 2, 0)));
  // 门钉：rows × cols
  const nail = new THREE.SphereGeometry(0.06, 8, 6);
  const ms = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = (c + 0.5) / cols * w, y = (r + 0.5) / rows * h;
    ms.push(m.clone().multiply(mat4(x, y, 0.08)));
  }
  b.inst(nail, AM.gold(), ms);
  // 铺首（兽面衔环）
  const px = mirrorNails ? w * 0.25 : w * 0.75;
  b.add(new THREE.SphereGeometry(0.13, 10, 8), AM.gold(), m.clone().multiply(mat4(px, h * 0.5, 0.1)));
  b.add(new THREE.TorusGeometry(0.14, 0.025, 6, 16), AM.gold(), m.clone().multiply(mat4(px, h * 0.5 - 0.16, 0.14)));
  // 包叶（角部铜饰）
  for (const [cx, cy] of [[0.08, 0.08], [w - 0.08, 0.08], [0.08, h - 0.08], [w - 0.08, h - 0.08]]) b.add(box(0.16, 0.16, 0.02), AM.gold(), m.clone().multiply(mat4(cx, cy, 0.07)));
}

/** 抱鼓石（门枕石） */
function baogushi(b, m) {
  const st = AM.marble();
  b.add(box(0.5, 0.45, 1.1), st, m.clone().multiply(mat4(0, 0.225, 0)));
  // 鼓（竖立的圆鼓）
  const drum = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 20);
  drum.rotateZ(Math.PI / 2);
  b.add(drum, st, m.clone().multiply(mat4(0, 0.9, 0.3)));
  b.add(new THREE.TorusGeometry(0.42, 0.04, 6, 20).rotateY(Math.PI / 2), st, m.clone().multiply(mat4(0.16, 0.9, 0.3)));
  b.add(new THREE.TorusGeometry(0.42, 0.04, 6, 20).rotateY(Math.PI / 2), st, m.clone().multiply(mat4(-0.16, 0.9, 0.3)));
  // 鼓上小狮
  b.add(new THREE.SphereGeometry(0.16, 10, 8), st, m.clone().multiply(mat4(0, 1.45, 0.3)));
  b.add(box(0.22, 0.2, 0.34), st, m.clone().multiply(mat4(0, 1.35, 0.32)));
}

/**
 * 山门。返回 Group，userData = { floorY, passage:{zMin,zMax}, width }
 */
export function buildGate({ plaqueText = '山门', width = 20, height = 7.2, thickness = 3.4, tileColor = 'grey' } = {}) {
  const group = new THREE.Group();
  group.name = '山门';
  const b = new PartBuilder();
  const ph = 0.5;
  const w = width, h = height, t = thickness;
  // 台基（前后带台阶）
  b.add(rectProfile([[0, 0], [0, ph * 0.8], [0.1, ph * 0.86], [0.1, ph]], w + 2.4, t + 3, { uvScale: 2 }), AM.stone(), null);
  for (const sgn of [1, -1]) {
    for (let i = 0; i < 3; i++) {
      const depth = 0.36 * (3 - i);
      b.add(box(w * 0.5, ph / 3, depth), AM.stone(), mat4(0, (i + 0.5) * ph / 3, sgn * ((t + 3) / 2 + depth / 2)));
    }
  }
  // 三券门
  const arches = [{ x: 0, w: 4.0, h: 5.2 }, { x: -6.2, w: 2.6, h: 4.0 }, { x: 6.2, w: 2.6, h: 4.0 }];
  const baseH = 1.3;
  archedWall(w, h, arches, t, AM.redWall(), b, ph, 0);
  // 下碱（青砖，略厚）
  archedWall(w + 0.08, baseH, arches.map((a) => ({ ...a, w: a.w - 0.08 })), t + 0.16, AM.brick(), b, ph, 0);
  // 券脸石（拱形白石边）
  for (const a of arches) {
    const r = a.w / 2, top = a.h - r;
    const ring = new THREE.RingGeometry(r, r + 0.28, 20, 1, 0, Math.PI);
    for (const sgn of [1, -1]) {
      b.add(ring, AM.marble(), mat4(a.x, ph + top, sgn * (t / 2 + 0.01), 0, sgn > 0 ? 0 : Math.PI, 0));
      b.add(box(0.28, top, 0.02), AM.marble(), mat4(a.x - r - 0.14, ph + top / 2, sgn * (t / 2 + 0.01)));
      b.add(box(0.28, top, 0.02), AM.marble(), mat4(a.x + r + 0.14, ph + top / 2, sgn * (t / 2 + 0.01)));
    }
  }
  // 冰盘檐（墙顶叠涩砖檐）
  for (let i = 0; i < 3; i++) b.add(box(w + 0.3 + i * 0.3, 0.16, t + 0.3 + i * 0.3), i === 1 ? AM.white() : AM.brick(), mat4(0, ph + h + 0.08 + i * 0.16, 0));
  // 额枋彩画带 + 简化斗拱（用彩画横带代替）
  b.add(box(w + 1.2, 0.45, t + 1.2), AM.caihua('xuanzi'), mat4(0, ph + h + 0.48 + 0.22, 0));
  // 门扇
  for (const a of arches) {
    const lw = a.w / 2 - 0.02, lh = a.h - a.w / 2 + 0.2;
    const central = a.x === 0;
    const rows = central ? 9 : 7, cols = central ? 7 : 5;
    // 左扇（合页在左），右扇（合页在右，镜像）
    const open = central ? 1.3 : 0.0; // 中门敞开
    const mL = mat4(a.x - a.w / 2, ph, -0.4, 0, -open, 0);
    const mR = mat4(a.x + a.w / 2, ph, -0.4, 0, Math.PI + open, 0);
    doorLeaf(b, lw, lh, rows, cols, mL, false);
    doorLeaf(b, lw, lh, rows, cols, mR, true);
    // 门框（红木，嵌在券洞内）
    b.add(box(0.2, a.h - a.w / 2 + 0.3, 0.3), AM.redWood(), mat4(a.x - a.w / 2 + 0.1, ph + (a.h - a.w / 2 + 0.3) / 2, -0.4));
    b.add(box(0.2, a.h - a.w / 2 + 0.3, 0.3), AM.redWood(), mat4(a.x + a.w / 2 - 0.1, ph + (a.h - a.w / 2 + 0.3) / 2, -0.4));
    b.add(box(a.w, 0.3, 0.3), AM.redWood(), mat4(a.x, ph + a.h - a.w / 2 + 0.3, -0.4));
    // 门洞地面（条石）
    b.add(box(a.w, 0.04, t), AM.stone(), mat4(a.x, ph + 0.02, 0));
  }
  // 抱鼓石（中门前两侧）
  baogushi(b, mat4(-2.5, ph, t / 2 + 0.7));
  baogushi(b, mat4(2.5, ph, t / 2 + 0.7, 0, 0, 0, -1, 1, 1));
  // 匾额（中门上方）
  const pw = 3.6, phh = 1.3;
  b.add(box(pw, phh, 0.12), AM.darkWood(), mat4(0, ph + h - 0.9, t / 2 + 0.06));
  b.add(new THREE.PlaneGeometry(pw * 0.96, phh * 0.92), AM.plaque(plaqueText), mat4(0, ph + h - 0.9, t / 2 + 0.13));
  for (const [bw, bh, ox, oy] of [[pw, 0.06, 0, phh / 2], [pw, 0.06, 0, -phh / 2], [0.06, phh, pw / 2, 0], [0.06, phh, -pw / 2, 0]]) b.add(box(bw, bh, 0.16), AM.gold(), mat4(ox, ph + h - 0.9 + oy, t / 2 + 0.08));
  // 歇山屋顶
  const eaveY = ph + h + 1.2;
  buildRoof({ style: 'xieshan', width: w + 4.2, depth: t + 4.2, eaveHeight: eaveY, ridgeHeight: 4.2, overhang: 2.1, tileColor, beasts: 5, ridgeScale: 0.9 }, b);
  b.build(group);
  group.userData = { floorY: ph, passage: { zMin: -t / 2 - 1.5, zMax: t / 2 + 1.5 }, width: w, roofTop: eaveY + 4.2 };
  return group;
}
