// 共享材质库
import * as THREE from 'three';

let _statue = null;
export function statueMaterials() {
  if (_statue) return _statue;
  _statue = {
    // 贴金：高金属度，适度粗糙，保留手工贴金的柔和光泽
    gold: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 1.0, roughness: 0.3, envMapIntensity: 1.0 }),
    // 矿物彩绘：哑光
    paint: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.0, roughness: 0.72 }),
    // 宝珠、眼珠：釉亮
    gloss: new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.0, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
    metal: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.85, roughness: 0.42 }),
  };
  return _statue;
}

const cache = new Map();
// 简单的命名材质缓存（建筑、器物共享）
export function mat(name, make) {
  if (!cache.has(name)) cache.set(name, make());
  return cache.get(name);
}

export const M = {
  gold: () => mat('gold', () => new THREE.MeshStandardMaterial({ color: 0xe0ac4a, metalness: 1, roughness: 0.3 })),
  bronze: () => mat('bronze', () => new THREE.MeshStandardMaterial({ color: 0x6b5232, metalness: 0.9, roughness: 0.48 })),
  darkBronze: () => mat('darkBronze', () => new THREE.MeshStandardMaterial({ color: 0x3d3326, metalness: 0.85, roughness: 0.55 })),
  steel: () => mat('steel', () => new THREE.MeshStandardMaterial({ color: 0xcfd3d6, metalness: 1, roughness: 0.22 })),
  iron: () => mat('iron', () => new THREE.MeshStandardMaterial({ color: 0x2b2a28, metalness: 0.7, roughness: 0.6 })),
  jade: () => mat('jade', () => new THREE.MeshPhysicalMaterial({ color: 0xd8efe4, roughness: 0.15, transmission: 0.0, clearcoat: 1 })),
  pearl: () => mat('pearl', () => new THREE.MeshPhysicalMaterial({ color: 0xf6f0e6, roughness: 0.12, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color(0xffe6c0) })),
  lacquerRed: () => mat('lacquerRed', () => new THREE.MeshStandardMaterial({ color: 0x6e1a12, roughness: 0.4 })),
  green: () => mat('green', () => new THREE.MeshStandardMaterial({ color: 0x2f6b3c, roughness: 0.6 })),
  wood: () => mat('wood', () => new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.7 })),
  cloth: (hex) => mat('cloth' + hex, () => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, side: THREE.DoubleSide })),
  paint: (hex, r = 0.7) => mat('paint' + hex + r, () => new THREE.MeshStandardMaterial({ color: hex, roughness: r })),
};
