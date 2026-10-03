// 斗拱：坐斗 + 翘/昂 + 拱 + 升，分层叠置。用顶点色（青绿金）合并为单一几何体，便于沿檐实例化。
import * as THREE from 'three';
import { colorize, mergeColored, shadowed } from './util.js';
import { AM } from './materials.js';

const BLUE = 0x2c4f9c, GREEN = 0x2f7d5c, GOLD = 0xd9b24c, DARK = 0x1d3a6b;
const cache = new Map();

/** 创建一块带色的盒子并放置 */
function cbox(list, w, h, d, x, y, z, hex, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)).setPosition(x, y, z));
  list.push(colorize(g, hex));
}

/** 斗 / 升：上宽下窄的小方块（用截锥近似倒梯形） */
function block(list, size, h, x, y, z, hex) {
  const g = new THREE.CylinderGeometry(size * 0.72, size * 0.5, h, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(x, y + h / 2, z);
  list.push(colorize(g, hex));
}

/**
 * 斗拱几何（归一化：总高 ≈ 1，正面朝 +z，出跳向 +z 为“外”）。
 * tiers: 2 → 三踩；3 → 五踩。底部坐斗底面位于 y=0。
 */
export function dougongGeometry({ tiers = 2 } = {}) {
  const key = 'dg' + tiers;
  if (cache.has(key)) return cache.get(key);
  const L = [];
  const u = 1 / (0.33 + tiers * 0.3); // 归一化比例，使总高≈1
  const armH = 0.15 * u, armW = 0.1 * u;
  // 坐斗（大斗）
  block(L, 0.42 * u, 0.24 * u, 0, 0, 0, GREEN);
  let y = 0.26 * u;
  for (let i = 0; i < tiers; i++) {
    const out = 0.3 * u * (i + 1); // 出跳
    const colA = i % 2 ? GREEN : BLUE;
    // 翘/昂：沿 z 向外出挑（昂有斜向下的尖头）
    const len = out * 2 + 0.25 * u;
    cbox(L, armW, armH, len, 0, y + armH / 2, 0, colA);
    if (i === tiers - 1) {
      // 昂嘴：斜向下的楔形
      const g = new THREE.BoxGeometry(armW, armH * 0.9, 0.5 * u);
      g.applyMatrix4(new THREE.Matrix4().makeRotationX(-0.55).setPosition(0, y + armH * 0.2, len / 2 + 0.16 * u));
      L.push(colorize(g, colA));
      cbox(L, armW * 1.05, armH * 0.25, 0.12 * u, 0, y + armH * 0.05, len / 2 + 0.38 * u, GOLD, -0.55);
    } else {
      cbox(L, armW * 1.02, armH * 1.02, 0.06 * u, 0, y + armH / 2, len / 2 + 0.02 * u, GOLD); // 端头金饰
      cbox(L, armW * 1.02, armH * 1.02, 0.06 * u, 0, y + armH / 2, -len / 2 - 0.02 * u, GOLD);
    }
    // 横拱：沿 x，随层数加长（瓜拱→万拱）
    const gw = (0.7 + i * 0.3) * u;
    cbox(L, gw, armH, armW, 0, y + armH / 2, 0, i % 2 ? BLUE : GREEN);
    cbox(L, 0.06 * u, armH * 1.02, armW * 1.02, gw / 2 + 0.02 * u, y + armH / 2, 0, GOLD);
    cbox(L, 0.06 * u, armH * 1.02, armW * 1.02, -gw / 2 - 0.02 * u, y + armH / 2, 0, GOLD);
    // 出跳端上的横拱（外拽瓜拱）
    cbox(L, 0.62 * u, armH, armW, 0, y + armH / 2, out, i % 2 ? BLUE : GREEN);
    cbox(L, 0.62 * u, armH, armW, 0, y + armH / 2, -out, i % 2 ? BLUE : GREEN);
    y += armH;
    // 升：各拱端的小斗
    for (const [x, z] of [[gw / 2 - 0.08 * u, 0], [-gw / 2 + 0.08 * u, 0], [0, out], [0, -out], [0.24 * u, out], [-0.24 * u, out], [0.24 * u, -out], [-0.24 * u, -out]]) block(L, 0.18 * u, 0.12 * u, x, y, z, GOLD);
    block(L, 0.24 * u, 0.12 * u, 0, y, 0, GREEN);
    y += 0.12 * u;
  }
  // 顶部枋垫（承托挑檐桁）
  cbox(L, 0.9 * u, 0.08 * u, armW * 1.4, 0, y + 0.04 * u, 0, DARK);
  const g = mergeColored(L);
  g.computeBoundingBox();
  cache.set(key, g);
  return g;
}

/** 返回单组斗拱 Mesh（预览 / 单独放置用） */
export function buildDougong({ tiers = 2, height = 1 } = {}) {
  const grp = new THREE.Group();
  const m = shadowed(new THREE.Mesh(dougongGeometry({ tiers }), AM.vcolor()));
  m.scale.setScalar(height);
  grp.add(m);
  return grp;
}
