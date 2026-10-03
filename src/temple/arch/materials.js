// 建筑模块共享材质（全部基于运行时 Canvas 贴图或纯色）
import * as THREE from 'three';
import * as T from './textures.js';

const cache = new Map();
function m(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

export const AM = {
  /** 琉璃瓦面（带瓦垄贴图） */
  tile: (color = 'yellow') => m('tile:' + color, () => {
    const t = T.glazedTile(color);
    return new THREE.MeshStandardMaterial({ map: t.map, roughnessMap: t.rough, roughness: 0.75, metalness: 0.08, color: 0xffffff });
  }),
  /** 筒瓦 / 瓦当 / 滴水 的纯色釉面 */
  tube: (color = 'yellow') => m('tube:' + color, () => new THREE.MeshStandardMaterial({
    color: color === 'yellow' ? 0xd9a128 : color === 'green' ? 0x3b7a52 : 0x5e6266, roughness: 0.42, metalness: 0.1,
  })),
  /** 脊与脊饰：釉色略深 */
  ridge: (color = 'yellow') => m('ridge:' + color, () => new THREE.MeshStandardMaterial({
    color: color === 'yellow' ? 0xc48d1c : color === 'green' ? 0x2f6342 : 0x4a4d50, roughness: 0.5, metalness: 0.1,
  })),
  /** 彩画横带（额枋、平板枋、檩） */
  caihua: (kind = 'xuanzi') => m('caihua:' + kind, () => new THREE.MeshStandardMaterial({ map: T.caihua(kind), roughness: 0.6 })),
  /** 红漆柱、门框 */
  redWood: () => m('redWood', () => new THREE.MeshStandardMaterial({ map: T.redLacquer(), roughness: 0.45, color: 0xffffff })),
  /** 红墙抹灰 */
  redWall: () => m('redWall', () => new THREE.MeshStandardMaterial({ map: T.redPlaster(), roughness: 0.9 })),
  /** 青砖 */
  brick: () => m('brick', () => new THREE.MeshStandardMaterial({ map: T.brick(), roughness: 0.9 })),
  /** 汉白玉 */
  marble: () => m('marble', () => new THREE.MeshStandardMaterial({ map: T.marble(), roughness: 0.55, color: 0xf2efe8 })),
  /** 灰色条石（台基、台阶） */
  stone: () => m('stone', () => new THREE.MeshStandardMaterial({ map: T.paving('grey', 2), roughness: 0.85, color: 0xd8d6d0 })),
  /** 深色金砖地面 */
  floor: () => m('floor', () => new THREE.MeshStandardMaterial({ map: T.paving('dark', 4), roughness: 0.5, color: 0xffffff })),
  /** 庭院方砖 */
  paving: () => m('paving', () => new THREE.MeshStandardMaterial({ map: T.paving('grey', 4), roughness: 0.85 })),
  /** 甬道条石 */
  path: () => m('path', () => new THREE.MeshStandardMaterial({ map: T.pathPaving(), roughness: 0.8 })),
  /** 墙外泥地 */
  earth: () => m('earth', () => new THREE.MeshStandardMaterial({ map: T.earth(), roughness: 1 })),
  /** 椽子、飞椽（青绿） */
  rafter: () => m('rafter', () => new THREE.MeshStandardMaterial({ color: 0x2f6b5a, roughness: 0.7 })),
  /** 望板（屋面底板，暗红木） */
  board: () => m('board', () => new THREE.MeshStandardMaterial({ color: 0x5a2a1c, roughness: 0.8 })),
  /** 深色木（门窗、供桌暗部） */
  darkWood: () => m('darkWood', () => new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.7 })),
  /** 金饰 */
  gold: () => m('gold', () => new THREE.MeshStandardMaterial({ color: 0xe0b44a, metalness: 1, roughness: 0.32 })),
  /** 青铜 */
  bronze: () => m('bronze', () => new THREE.MeshStandardMaterial({ color: 0x5c4a2c, metalness: 0.9, roughness: 0.5 })),
  /** 深青铜（鼎身） */
  darkBronze: () => m('darkBronze', () => new THREE.MeshStandardMaterial({ color: 0x3a3426, metalness: 0.85, roughness: 0.55 })),
  /** 斗拱顶点色材质（蓝绿金） */
  vcolor: () => m('vcolor', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 })),
  /** 白色墙帽抹灰 */
  white: () => m('white', () => new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.9 })),
  /** 天花彩绘 */
  tianhua: () => m('tianhua', () => new THREE.MeshStandardMaterial({ map: T.tianhua(), roughness: 0.7 })),
  /** 松针深绿 */
  pine: () => m('pine', () => new THREE.MeshStandardMaterial({ color: 0x1f4a2a, roughness: 0.9, side: THREE.DoubleSide })),
  /** 银杏金黄 */
  ginkgo: () => m('ginkgo', () => new THREE.MeshStandardMaterial({ color: 0xd8b63a, roughness: 0.9 })),
  /** 树皮 */
  bark: () => m('bark', () => new THREE.MeshStandardMaterial({ map: T.bark(), roughness: 1 })),
  /** 匾额（每块独立材质） */
  plaque: (text) => m('plaque:' + text, () => new THREE.MeshStandardMaterial({ map: T.plaque(text), roughness: 0.4 })),
  couplet: (text) => m('couplet:' + text, () => new THREE.MeshStandardMaterial({ map: T.couplet(text), roughness: 0.4 })),
  /** 棂花（透明贴图，双面） */
  lattice: (kind = 'sanjiao') => m('lattice:' + kind, () => new THREE.MeshStandardMaterial({
    map: T.lattice(kind), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6,
  })),
  /** 窗纸（半透明暖白） */
  paper: () => m('paper', () => new THREE.MeshStandardMaterial({ color: 0xf3e9d2, roughness: 1, transparent: true, opacity: 0.85, side: THREE.DoubleSide })),
  /** 经幡布 */
  banner: (hex) => m('banner:' + hex, () => new THREE.MeshStandardMaterial({ map: T.bannerCloth(hex), side: THREE.DoubleSide, roughness: 0.95 })),
  /** 香火红 (发光) */
  ember: () => m('ember', () => new THREE.MeshStandardMaterial({ color: 0xff4a10, emissive: 0xff3000, emissiveIntensity: 2.5 })),
  /** 蜡烛火焰 */
  flame: () => m('flame', () => new THREE.MeshStandardMaterial({ color: 0xffc040, emissive: 0xffa020, emissiveIntensity: 3 })),
  /** 石狮、石碑用青灰石 */
  greyStone: () => m('greyStone', () => new THREE.MeshStandardMaterial({ color: 0x8d8b86, roughness: 0.85 })),
  /** 蜡烛红 */
  candle: () => m('candle', () => new THREE.MeshStandardMaterial({ color: 0xc8261b, roughness: 0.5 })),
  /** 鼓面皮革 */
  drumSkin: () => m('drumSkin', () => new THREE.MeshStandardMaterial({ color: 0xcfb58c, roughness: 0.8 })),
};
