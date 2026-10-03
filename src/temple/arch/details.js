// 小品：大香炉（鼎）、石狮、幡杆、石灯、石碑（赑屃座）、蜡烛台、供桌（五供）
import * as THREE from 'three';
import { PartBuilder, box, lathe, mat4, rectProfile, colorize } from './util.js';
import { AM } from './materials.js';
import { buildRoof } from './roof.js';

const V = THREE.Vector3;

/** 大香炉：三足两耳铜鼎，顶部小攒尖亭盖，炉内香束 */
export function buildIncenseBurner({ scale = 1 } = {}) {
  const g = new THREE.Group();
  g.name = '香炉';
  const b = new PartBuilder();
  const s = scale;
  const bronze = AM.bronze(), dark = AM.darkBronze();
  // 石基座
  b.add(rectProfile([[0, 0], [0, 0.25], [0.08, 0.3], [0.08, 0.5], [0, 0.55], [0, 0.6]], 3.2 * s, 3.2 * s, { uvScale: 1 }), AM.marble());
  const y0 = 0.6;
  // 三足（略外撇）
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const leg = new THREE.CylinderGeometry(0.1 * s, 0.16 * s, 0.9 * s, 10);
    b.add(leg, dark, mat4(Math.cos(a) * 0.75 * s, y0 + 0.45 * s, Math.sin(a) * 0.75 * s, Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12));
    b.add(new THREE.SphereGeometry(0.17 * s, 10, 8), dark, mat4(Math.cos(a) * 0.72 * s, y0 + 0.08 * s, Math.sin(a) * 0.72 * s));
  }
  // 鼎身（圆腹）
  const body = lathe([[0.55, 0], [0.85, 0.1], [1.0, 0.45], [1.02, 0.8], [0.95, 1.1], [0.98, 1.22], [1.08, 1.3], [1.08, 1.4], [0.9, 1.4], [0.86, 1.3], [0.86, 1.0], [0, 1.0]].map(([r, y]) => [r * s, y * s]), 32);
  b.add(body, bronze, mat4(0, y0 + 0.8 * s, 0));
  // 腹部饕餮纹带（凸起的环与方块）
  b.add(new THREE.TorusGeometry(1.0 * s, 0.03 * s, 6, 32).rotateX(Math.PI / 2), dark, mat4(0, y0 + 1.25 * s, 0));
  b.add(new THREE.TorusGeometry(1.02 * s, 0.03 * s, 6, 32).rotateX(Math.PI / 2), dark, mat4(0, y0 + 1.55 * s, 0));
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.add(box(0.22 * s, 0.22 * s, 0.05 * s), dark, mat4(Math.cos(a) * 1.0 * s, y0 + 1.4 * s, Math.sin(a) * 1.0 * s, 0, -a + Math.PI / 2, 0)); }
  // 双耳（立耳）
  for (const sx of [-1, 1]) {
    const ear = new THREE.TorusGeometry(0.28 * s, 0.07 * s, 8, 14, Math.PI);
    b.add(ear, bronze, mat4(sx * 0.85 * s, y0 + 2.2 * s, 0, 0, Math.PI / 2, 0));
    b.add(box(0.14 * s, 0.3 * s, 0.14 * s), bronze, mat4(sx * 0.85 * s, y0 + 2.1 * s, 0.28 * s));
    b.add(box(0.14 * s, 0.3 * s, 0.14 * s), bronze, mat4(sx * 0.85 * s, y0 + 2.1 * s, -0.28 * s));
  }
  // 香灰面
  b.add(new THREE.CircleGeometry(0.84 * s, 24).rotateX(-Math.PI / 2), AM.greyStone(), mat4(0, y0 + 1.9 * s, 0));
  // 香束：细杆 + 发光红头
  const stick = new THREE.CylinderGeometry(0.012, 0.012, 0.8 * s, 4);
  const tip = new THREE.SphereGeometry(0.02, 5, 4);
  const sm = [], tm = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * 0.6 * s;
    const tilt = (rnd() - 0.5) * 0.3, tilt2 = (rnd() - 0.5) * 0.3;
    const m = mat4(Math.cos(a) * r, y0 + 1.9 * s + 0.4 * s, Math.sin(a) * r, tilt, 0, tilt2);
    sm.push(m);
    tm.push(m.clone().multiply(mat4(0, 0.4 * s, 0)));
  }
  b.inst(stick, AM.darkWood(), sm);
  b.inst(tip, AM.ember(), tm);
  // 亭盖：四柱 + 小攒尖顶（覆在鼎口上方）
  const yTop = y0 + 2.3 * s;
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; b.add(new THREE.CylinderGeometry(0.06 * s, 0.06 * s, 1.1 * s, 8), bronze, mat4(Math.cos(a) * 0.95 * s, yTop + 0.55 * s, Math.sin(a) * 0.95 * s)); }
  b.add(box(1.9 * s, 0.12 * s, 0.1 * s), bronze, mat4(0, yTop + 1.1 * s, 0.9 * s));
  b.add(box(1.9 * s, 0.12 * s, 0.1 * s), bronze, mat4(0, yTop + 1.1 * s, -0.9 * s));
  b.add(box(0.1 * s, 0.12 * s, 1.9 * s), bronze, mat4(0.9 * s, yTop + 1.1 * s, 0));
  b.add(box(0.1 * s, 0.12 * s, 1.9 * s), bronze, mat4(-0.9 * s, yTop + 1.1 * s, 0));
  b.build(g);
  const roof = buildRoof({ style: 'cuanjian', width: 2.9 * s, depth: 2.9 * s, eaveHeight: yTop + 1.2 * s, ridgeHeight: 1.1 * s, overhang: 0.5, sides: 4, tileColor: 'green', beasts: 0, rafters: false, ridgeScale: 0.5, liftH: 0.15 });
  // 亭盖用青铜材质替换瓦面
  roof.traverse((o) => { if (o.isMesh) o.material = o.material === AM.gold() ? AM.gold() : bronze; });
  g.add(roof);
  g.userData = { height: yTop + 2.4 * s };
  return g;
}

/** 石狮：side='left'（雄，踩绣球）| 'right'（雌，抚幼狮）。面朝 +z，底座原点。 */
export function buildStoneLion(side = 'left') {
  const g = new THREE.Group();
  g.name = '石狮';
  const b = new PartBuilder();
  const st = AM.greyStone();
  // 须弥座
  b.add(rectProfile([[0, 0], [0, 0.2], [0.08, 0.26], [0.08, 0.5], [0.16, 0.56], [0.16, 0.84], [0.08, 0.9], [0.08, 1.1], [0, 1.16], [0, 1.25]], 1.5, 2.0), st);
  const y0 = 1.25;
  const lion = (m, k = 1) => {
    // 躯干（坐姿：后臀低、前胸高）
    const torso = new THREE.SphereGeometry(0.42 * k, 14, 10);
    b.add(torso, st, m.clone().multiply(mat4(0, 0.78 * k, -0.25 * k, 0.35, 0, 0, 1, 1.35, 1.25)));
    // 后臀
    b.add(new THREE.SphereGeometry(0.4 * k, 12, 9), st, m.clone().multiply(mat4(0, 0.42 * k, -0.45 * k, 0, 0, 0, 1.1, 0.9, 1)));
    // 前腿（直立）
    for (const sx of [-1, 1]) {
      b.add(new THREE.CylinderGeometry(0.11 * k, 0.13 * k, 0.75 * k, 10), st, m.clone().multiply(mat4(sx * 0.25 * k, 0.38 * k, 0.28 * k)));
      b.add(box(0.26 * k, 0.14 * k, 0.36 * k), st, m.clone().multiply(mat4(sx * 0.25 * k, 0.07 * k, 0.36 * k))); // 爪
      // 后腿（蹲）
      b.add(new THREE.SphereGeometry(0.2 * k, 10, 8), st, m.clone().multiply(mat4(sx * 0.36 * k, 0.28 * k, -0.35 * k, 0, 0, 0, 1, 1.1, 1.4)));
      b.add(box(0.22 * k, 0.14 * k, 0.4 * k), st, m.clone().multiply(mat4(sx * 0.4 * k, 0.07 * k, -0.1 * k)));
    }
    // 头
    b.add(new THREE.SphereGeometry(0.36 * k, 14, 10), st, m.clone().multiply(mat4(0, 1.42 * k, 0.1 * k, 0, 0, 0, 1.05, 0.95, 1)));
    // 口鼻（张口）
    b.add(box(0.36 * k, 0.22 * k, 0.3 * k), st, m.clone().multiply(mat4(0, 1.3 * k, 0.38 * k)));
    b.add(box(0.26 * k, 0.1 * k, 0.16 * k), AM.darkWood(), m.clone().multiply(mat4(0, 1.3 * k, 0.5 * k))); // 口内
    b.add(new THREE.SphereGeometry(0.07 * k, 8, 6), st, m.clone().multiply(mat4(0, 1.44 * k, 0.5 * k))); // 鼻
    for (const sx of [-1, 1]) {
      b.add(new THREE.SphereGeometry(0.07 * k, 8, 6), st, m.clone().multiply(mat4(sx * 0.15 * k, 1.55 * k, 0.4 * k))); // 眼
      b.add(new THREE.SphereGeometry(0.09 * k, 8, 6), st, m.clone().multiply(mat4(sx * 0.33 * k, 1.68 * k, 0.0, 0, 0, 0, 0.8, 1, 0.5))); // 耳
    }
    // 鬃毛卷（头周与肩背）
    const curl = new THREE.SphereGeometry(0.085 * k, 7, 6);
    const ms = [];
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; ms.push(m.clone().multiply(mat4(Math.cos(a) * 0.36 * k, 1.5 * k + Math.sin(a) * 0.3 * k, -0.08 * k))); }
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; ms.push(m.clone().multiply(mat4(Math.cos(a) * 0.34 * k, 1.22 * k + Math.sin(a) * 0.12 * k, -0.2 * k))); }
    for (let i = 0; i < 8; i++) ms.push(m.clone().multiply(mat4((i % 2 ? 0.12 : -0.12) * k, 1.05 * k - i * 0.07 * k, -0.45 * k - i * 0.05 * k)));
    b.inst(curl, st, ms);
    // 项圈与铃铛
    b.add(new THREE.TorusGeometry(0.3 * k, 0.04 * k, 6, 16).rotateX(Math.PI / 2 - 0.3), st, m.clone().multiply(mat4(0, 1.08 * k, 0.12 * k)));
    b.add(new THREE.SphereGeometry(0.08 * k, 8, 6), st, m.clone().multiply(mat4(0, 0.95 * k, 0.38 * k)));
    // 尾（贴背上卷）
    b.add(new THREE.TorusGeometry(0.16 * k, 0.05 * k, 6, 12, Math.PI * 1.3), st, m.clone().multiply(mat4(0.2 * k, 0.7 * k, -0.78 * k, 0, Math.PI / 2, 0)));
  };
  lion(mat4(0, y0, 0));
  if (side === 'left') {
    // 雄狮：右前爪踩绣球
    b.add(new THREE.SphereGeometry(0.2, 12, 10), st, mat4(0.3, y0 + 0.2, 0.42));
    b.add(new THREE.TorusGeometry(0.2, 0.025, 5, 12).rotateX(Math.PI / 3), st, mat4(0.3, y0 + 0.2, 0.42));
  } else {
    // 雌狮：左前爪抚幼狮
    lion(mat4(-0.38, y0, 0.3, 0, 0.5, 0), 0.38);
  }
  b.build(g);
  g.userData = { height: y0 + 1.9 };
  return g;
}

/** 幡杆：石座 + 高杆 + 顶饰 + 长幡 */
export function buildFlagPole({ height = 14, bannerText = '南无阿弥陀佛' } = {}) {
  const g = new THREE.Group();
  g.name = '幡杆';
  const b = new PartBuilder();
  // 夹杆石
  b.add(rectProfile([[0, 0], [0, 0.4], [0.06, 0.44], [0.06, 0.9], [0, 0.95], [0, 1.0]], 1.2, 0.8), AM.marble());
  b.add(box(0.26, 1.8, 0.2), AM.marble(), mat4(-0.3, 1.4, 0));
  b.add(box(0.26, 1.8, 0.2), AM.marble(), mat4(0.3, 1.4, 0));
  // 杆（收分）
  b.add(new THREE.CylinderGeometry(0.07, 0.13, height, 10), AM.redWood(), mat4(0, height / 2 + 0.6, 0));
  // 铁箍
  for (let i = 1; i < 6; i++) b.add(new THREE.TorusGeometry(0.13 - i * 0.01, 0.02, 5, 12).rotateX(Math.PI / 2), AM.darkBronze(), mat4(0, 0.6 + i * height / 6, 0));
  // 顶饰：宝珠与横杆
  b.add(new THREE.SphereGeometry(0.16, 10, 8), AM.gold(), mat4(0, height + 0.8, 0));
  b.add(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6).rotateZ(Math.PI / 2), AM.darkBronze(), mat4(0, height + 0.3, 0));
  // 长幡（略带波浪的布）
  const bw = 0.7, bh = height * 0.55;
  const cloth = new THREE.PlaneGeometry(bw, bh, 2, 12);
  const pos = cloth.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setZ(i, Math.sin(y * 1.6) * 0.12); }
  cloth.computeVertexNormals();
  b.add(cloth, AM.banner('#b5261c'), mat4(0.55, height + 0.3 - bh / 2, 0));
  void bannerText;
  b.build(g);
  return g;
}

/** 石灯笼 */
export function buildStoneLantern() {
  const g = new THREE.Group();
  g.name = '石灯';
  const b = new PartBuilder();
  const st = AM.greyStone();
  b.add(rectProfile([[0, 0], [0, 0.2], [0.1, 0.26], [0.1, 0.4]], 1.0, 1.0), st);
  b.add(new THREE.CylinderGeometry(0.12, 0.16, 1.4, 8), st, mat4(0, 1.1, 0));
  b.add(lathe([[0, 0], [0.3, 0], [0.34, 0.08], [0.2, 0.16], [0, 0.18]], 8), st, mat4(0, 1.8, 0)); // 中台
  // 灯室（八角，开窗）
  b.add(new THREE.CylinderGeometry(0.34, 0.34, 0.55, 8), st, mat4(0, 2.27, 0));
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; b.add(box(0.2, 0.3, 0.06), AM.flame(), mat4(Math.sin(a) * 0.32, 2.27, Math.cos(a) * 0.32, 0, a, 0)); }
  // 灯顶（六角攒尖）+ 宝珠
  b.add(lathe([[0, 0], [0.52, 0], [0.5, 0.08], [0.3, 0.3], [0.12, 0.42], [0.1, 0.5], [0, 0.52]], 8), st, mat4(0, 2.55, 0));
  b.add(new THREE.SphereGeometry(0.1, 8, 6), st, mat4(0, 3.12, 0));
  b.build(g);
  return g;
}

/** 石碑：赑屃驮碑，碑首螭龙 */
export function buildStele({ text = '敕建护国禅寺碑记' } = {}) {
  const g = new THREE.Group();
  g.name = '石碑';
  const b = new PartBuilder();
  const st = AM.greyStone();
  // 赑屃（龟身）
  b.add(new THREE.SphereGeometry(1.0, 16, 10), st, mat4(0, 0.55, 0, 0, 0, 0, 1.0, 0.55, 1.5)); // 甲壳
  b.add(new THREE.SphereGeometry(0.95, 12, 8), st, mat4(0, 0.45, 0, 0, 0, 0, 1.05, 0.4, 1.45)); // 腹甲
  b.add(new THREE.SphereGeometry(0.3, 10, 8), st, mat4(0, 0.75, 1.55, 0, 0, 0, 1, 0.9, 1.3)); // 头
  b.add(new THREE.CylinderGeometry(0.22, 0.28, 0.7, 8).rotateX(Math.PI / 2 - 0.3), st, mat4(0, 0.6, 1.25));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(new THREE.SphereGeometry(0.28, 8, 6), st, mat4(sx * 0.9, 0.25, sz * 0.8, 0, 0, 0, 1, 0.7, 1.2));
  // 甲壳六角纹（小六棱柱）
  const hexes = [];
  const hex = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 6);
  for (let i = -2; i <= 2; i++) for (let j = -3; j <= 3; j++) {
    const x = i * 0.36 + (j % 2 ? 0.18 : 0), z = j * 0.32;
    if (x * x / 0.9 + z * z / 2.0 > 1) continue;
    const y = 0.55 + 0.55 * Math.sqrt(Math.max(0, 1 - x * x / 1.0 - z * z / 2.25));
    hexes.push(mat4(x, y, z, Math.atan2(z, 2.0) * 0.5, 0, -Math.atan2(x, 1) * 0.5));
  }
  b.inst(hex, st, hexes);
  // 碑身
  const bw = 1.3, bh = 3.0, bt = 0.32;
  b.add(box(bw, bh, bt), st, mat4(0, 1.0 + bh / 2, -0.1));
  b.add(new THREE.PlaneGeometry(bw * 0.8, bh * 0.85), AM.couplet(text, { bg: '#6a6864', fg: '#2a2824' }), mat4(0, 1.0 + bh / 2, -0.1 + bt / 2 + 0.005));
  // 碑首（圆首盘螭）
  b.add(new THREE.CylinderGeometry(bw / 2 + 0.1, bw / 2 + 0.1, bt + 0.1, 16, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(0), st, mat4(0, 1.0 + bh, -0.1, Math.PI / 2, 0, 0));
  b.add(new THREE.TorusGeometry(0.4, 0.08, 6, 14, Math.PI * 1.5), st, mat4(0, 1.0 + bh + 0.3, -0.1 + bt / 2 + 0.05));
  b.build(g);
  g.userData = { height: 1.0 + bh + 0.8 };
  return g;
}

/** 蜡烛台（高脚铁烛台，带红烛与火焰） */
export function buildCandleStand({ height = 1.4 } = {}) {
  const g = new THREE.Group();
  g.name = '烛台';
  const b = new PartBuilder();
  const iron = AM.darkBronze();
  b.add(lathe([[0, 0], [0.3, 0], [0.3, 0.04], [0.12, 0.1], [0.05, 0.16], [0.05, height - 0.1], [0.14, height - 0.06], [0.14, height], [0.09, height], [0.09, height - 0.04], [0, height - 0.04]], 12), iron);
  b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 10), AM.candle(), mat4(0, height + 0.2, 0));
  b.add(new THREE.ConeGeometry(0.035, 0.14, 7), AM.flame(), mat4(0, height + 0.52, 0));
  b.build(g);
  return g;
}

/** 供桌（红漆带牙板）与五供：香炉 + 二烛台 + 二花瓶 */
export function buildAltarTable({ width = 3.0, depth = 1.0, height = 0.95 } = {}) {
  const g = new THREE.Group();
  g.name = '供桌';
  const b = new PartBuilder();
  const red = AM.redWood(), gold = AM.gold();
  b.add(box(width, 0.08, depth), red, mat4(0, height - 0.04, 0));
  b.add(box(width - 0.1, 0.16, depth - 0.1), red, mat4(0, height - 0.16, 0)); // 束腰/牙板
  b.add(box(width - 0.3, 0.05, 0.02), gold, mat4(0, height - 0.16, depth / 2 - 0.04));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(box(0.12, height - 0.2, 0.12), red, mat4(sx * (width / 2 - 0.12), (height - 0.2) / 2, sz * (depth / 2 - 0.12)));
  // 桌围（前面垂挂的黄布）
  b.add(new THREE.PlaneGeometry(width - 0.2, height - 0.3), AM.banner('#c9a227'), mat4(0, (height - 0.3) / 2 + 0.05, depth / 2 - 0.1));
  // 五供
  const yT = height;
  b.add(lathe([[0, 0], [0.12, 0], [0.14, 0.03], [0.1, 0.06], [0.16, 0.12], [0.2, 0.22], [0.18, 0.3], [0.22, 0.33], [0.22, 0.36], [0.17, 0.36], [0, 0.3]], 14), AM.bronze(), mat4(0, yT, 0));
  for (const sx of [-1, 1]) b.add(new THREE.TorusGeometry(0.06, 0.02, 6, 10), AM.bronze(), mat4(sx * 0.2, yT + 0.4, 0, 0, Math.PI / 2, 0));
  for (const sx of [-1, 1]) {
    b.add(lathe([[0, 0], [0.09, 0], [0.09, 0.02], [0.03, 0.05], [0.03, 0.25], [0.06, 0.28], [0.06, 0.3], [0, 0.3]], 10), AM.bronze(), mat4(sx * width * 0.2, yT, 0));
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8), AM.candle(), mat4(sx * width * 0.2, yT + 0.41, 0));
    b.add(new THREE.ConeGeometry(0.02, 0.08, 6), AM.flame(), mat4(sx * width * 0.2, yT + 0.56, 0));
    // 花瓶 + 莲花
    b.add(lathe([[0, 0], [0.08, 0], [0.1, 0.1], [0.07, 0.22], [0.05, 0.3], [0.07, 0.34], [0, 0.34]], 12), AM.marble(), mat4(sx * width * 0.36, yT, 0));
    b.add(new THREE.SphereGeometry(0.1, 8, 6), AM.candle(), mat4(sx * width * 0.36, yT + 0.46, 0, 0, 0, 0, 1, 0.7, 1));
    b.add(new THREE.CylinderGeometry(0.01, 0.01, 0.2, 5), AM.pine(), mat4(sx * width * 0.36, yT + 0.4, 0));
  }
  b.build(g);
  g.userData = { top: height };
  return g;
}

void colorize; void V;
