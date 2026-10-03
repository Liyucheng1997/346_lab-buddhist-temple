// 共用的身体模块：立像（长袍覆足）与坐像（结跏趺坐）的躯干、袈裟、衣纹。
import { arm, handAt, ridge, V, spline } from './anatomy.js';

/**
 * 立像身体。局部单位：足底 y=0，颈根 y≈1.62，头部中心约 y=1.8（由调用者放置）。
 * opts: { robe, robeIn, edge, skin, sway(躯干侧倾), width }
 */
export function standingBody(F, o = {}) {
  const robe = o.robe || 'robe', robeIn = o.robeIn || 'robeIn', edge = o.edge || 'robeEdge';
  const w = o.width ?? 1;
  // 长裙：自腰垂至足面，下摆微微外展并有垂直衣褶
  F.cone([0, 1.0, 0], [0, 0.05, 0.02], 0.2 * w, 0.26 * w, { mat: robe, k: 0.05, folds: { dir: [1, 0, 0.3], freq: 26, amp: 0.008, wobble: 0.3 } });
  F.cone([0, 1.0, 0], [0, 0.05, 0.02], 0.17 * w, 0.24 * w, { mat: robe, k: 0.05, folds: { dir: [0.3, 0, 1], freq: 24, amp: 0.008, wobble: 0.3 } });
  F.ellipsoid([0, 0.05, 0.03], [0.27 * w, 0.05, 0.26 * w], { mat: robe, k: 0.04 });            // 裙摆底边
  // 露出的足尖（赤足或莲足）
  if (o.feet !== false) F.mirror((m) => m.ellipsoid([0.09, 0.04, 0.24], [0.055, 0.035, 0.08], { mat: o.skin || 'skin', k: 0.02 }));
  // 躯干
  F.ellipsoid([0, 1.1, 0], [0.21 * w, 0.17, 0.16], { mat: robe, k: 0.08 });
  F.ellipsoid([0, 1.32, 0.0], [0.23 * w, 0.17, 0.15], { mat: robeIn, k: 0.08 });
  F.ellipsoid([0, 1.5, -0.01], [0.25 * w, 0.14, 0.15], { mat: robe, k: 0.08 });
  F.capsule([-0.17 * w, 1.58, -0.02], [0.17 * w, 1.58, -0.02], 0.085, { mat: robe, k: 0.08 });      // 肩
  F.cone([0, 1.55, 0], [0, 1.72, 0.01], 0.065, 0.058, { mat: o.skin || 'skin', k: 0.03 });           // 颈
  F.torus([0, 1.665, 0.003], 0.06, 0.005, { mat: o.skin || 'skin', k: 0.006, rot: [0.1, 0, 0] });
  // 腰带（僧祇支束带）
  ridge(F, [[-0.2 * w, 1.2, 0], [-0.1, 1.19, 0], [0, 1.185, 0], [0.1, 1.19, 0], [0.2 * w, 1.2, 0]], [0, 0, 1], 0.012, { mat: edge, taper: false, lift: -0.003 });
  // 双领下垂的袈裟衣领
  F.mirror((m) => {
    ridge(m, [[0.06, 1.63, 0], [0.1, 1.5, 0], [0.11, 1.38, 0], [0.085, 1.25, 0], [0.05, 1.2, 0]], [0, 0, 1], 0.012, { mat: edge, taper: false, lift: -0.005, far: 0.5 });
    ridge(m, [[0.07, 1.6, 0.05], [0.12, 1.6, 0.0], [0.15, 1.58, -0.06], [0.16, 1.56, -0.12]], [0, 1, 0], 0.011, { mat: edge, taper: false, lift: -0.005, far: 0.1 });
  });
  F.ellipsoid([0, 1.55, 0.1], [0.055, 0.07, 0.1], { op: 'paint', mat: o.skin || 'skin' });              // 胸口肌肤
  // 裙身上几条垂直大衣纹
  for (const x of [-0.14, -0.05, 0.06, 0.15]) ridge(F, [[x * w, 1.0, 1], [x * w * 1.3, 0.5, 1], [x * w * 1.5, 0.1, 1]], [0, 0, 1], 0.009, { mat: robe, far: 1.2 });
  return { shoulderL: [0.22 * w, 1.55, -0.02], shoulderR: [-0.22 * w, 1.55, -0.02], neckTop: [0, 1.72, 0.01] };
}

/**
 * 坐像身体（结跏趺坐）。与 buddha.js 同构，但材质可配置、衣纹更朴素（罗汉/弥勒用）。
 */
export function seatedBody(F, o = {}) {
  const robe = o.robe || 'robe', robeIn = o.robeIn || 'robeIn', edge = o.edge || 'robeEdge', skin = o.skin || 'skin';
  F.ellipsoid([0, 0.1, 0.08], [0.45, 0.11, 0.28], { mat: robe, k: 0.07 });
  F.mirror((m) => {
    m.cone([0.1, 0.13, -0.03], [0.36, 0.1, 0.19], 0.125, 0.1, { mat: robe, k: 0.07 });
    m.sphere([0.38, 0.1, 0.22], 0.095, { mat: robe, k: 0.06 });
  });
  F.cone([0.36, 0.09, 0.27], [-0.1, 0.09, 0.33], 0.078, 0.06, { mat: robe, k: 0.05 });
  F.cone([-0.36, 0.13, 0.27], [0.1, 0.17, 0.3], 0.08, 0.062, { mat: robe, k: 0.05 });
  if (o.foot !== false) F.ellipsoid([0.2, 0.19, 0.27], [0.11, 0.032, 0.052], { mat: skin, k: 0.025, rot: [0.1, 0.2, 0.12] });
  F.ellipsoid([0, 0.035, 0.31], [0.3, 0.05, 0.07], { mat: robe, k: 0.05 });
  F.ellipsoid([0, 0.18, -0.04], [0.29, 0.15, 0.21], { mat: robe, k: 0.08 });
  F.ellipsoid([0, 0.32, 0.0], [0.225, 0.16, 0.17], { mat: robeIn, k: 0.1 });
  F.ellipsoid([0, 0.46, -0.01], [0.245, 0.15, 0.16], { mat: robe, k: 0.1 });
  F.ellipsoid([0, 0.49, -0.07], [0.255, 0.14, 0.14], { mat: robe, k: 0.08 });
  F.capsule([-0.15, 0.565, -0.035], [0.15, 0.565, -0.035], 0.09, { mat: robe, k: 0.1 });
  F.cone([0, 0.55, -0.015], [0, 0.75, 0.0], 0.066, 0.06, { mat: skin, k: 0.04 });
  F.ellipsoid([0, 0.55, 0.1], [0.06, 0.08, 0.11], { op: 'paint', mat: skin });
  F.mirror((m) => {
    ridge(m, [[0.07, 0.62, 0], [0.1, 0.55, 0], [0.105, 0.47, 0], [0.08, 0.4, 0], [0.04, 0.33, 0]], [0, 0, 1], 0.011, { mat: edge, taper: false, lift: -0.006, far: 0.5 });
    ridge(m, [[0.07, 0.6, 0.05], [0.11, 0.6, 0.0], [0.145, 0.58, -0.06], [0.165, 0.56, -0.12]], [0, 1, 0], 0.011, { mat: edge, taper: false, lift: -0.006, far: 0.1 });
  });
  ridge(F, [[-0.18, 0.37, 0], [-0.1, 0.36, 0], [0, 0.355, 0], [0.1, 0.36, 0], [0.18, 0.37, 0]], [0, 0, 1], 0.01, { mat: edge, taper: false, lift: -0.003 });
  for (const i of [-3, -2, 2, 3]) {
    const a = i * 0.14;
    const x0 = Math.sin(a) * 0.06, x1 = Math.sin(a) * 0.4;
    ridge(F, [[x0, 1, 0.2], [x0 * 2.5 + x1 * 0.2, 1, 0.27], [x1, 1, 0.35 - Math.abs(Math.sin(a)) * 0.12]], [0, 1, 0], 0.0075, { mat: robe, far: 1.0 });
  }
  return { shoulderL: [0.25, 0.52, -0.02], shoulderR: [-0.25, 0.52, -0.02], headPos: [0, 0.87, 0.03] };
}

export const SLEEVE = { sleeve: 0.07, ru: 0.064, rf: 0.055, rw: 0.04, upper: 0.25, fore: 0.24 };
export { arm, handAt, spline, V };
