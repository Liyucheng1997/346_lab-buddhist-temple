// 结跏趺坐佛像（释迦牟尼 / 药师佛 / 阿弥陀佛），通身贴金，石青螺发，双领下垂式袈裟。
// 局部单位：盘坐底面 y=0，肉髻顶约 y=1.08，面朝 +z。
import { Sculpt } from '../sdf.js';
import { Frame, arm, handAt, ridge, V } from '../anatomy.js';
import { buddhaFace } from '../faces.js';
import { palette } from './palette.js';

export function seatedBuddha(p = {}) {
  const mudra = p.mudra || 'dhyana'; // dhyana 禅定印 | earth 触地印 | bowl 托钵 | lotus 托莲 | teach 说法印
  const S = new Sculpt(palette(p.palette || {}));
  const F = new Frame(S);

  // ---------------- 盘腿 ----------------
  F.ellipsoid([0, 0.1, 0.08], [0.47, 0.11, 0.29], { mat: 'robe', k: 0.07 });
  F.mirror((m) => {
    m.cone([0.1, 0.13, -0.03], [0.37, 0.1, 0.19], 0.13, 0.105, { mat: 'robe', k: 0.07 });
    m.sphere([0.4, 0.1, 0.22], 0.1, { mat: 'robe', k: 0.06 });
  });
  F.cone([0.38, 0.09, 0.27], [-0.1, 0.09, 0.34], 0.08, 0.06, { mat: 'robe', k: 0.05 });   // 左小腿
  F.cone([-0.38, 0.13, 0.27], [0.1, 0.17, 0.31], 0.083, 0.064, { mat: 'robe', k: 0.05 }); // 右小腿在上
  // 露出的右足（足心向上）
  F.ellipsoid([0.215, 0.195, 0.275], [0.115, 0.034, 0.055], { mat: 'skin', k: 0.025, rot: [0.1, 0.2, 0.12] });
  for (let i = 0; i < 5; i++) {
    F.sphere([0.322 - Math.abs(i - 1.2) * 0.006, 0.212 - i * 0.002, 0.243 + i * 0.016], 0.012 - i * 0.0008, { mat: 'skin', k: 0.006 });
  }
  F.ellipsoid([0, 0.035, 0.32], [0.32, 0.05, 0.07], { mat: 'robe', k: 0.05 }); // 悬裳

  // ---------------- 躯干 ----------------
  F.ellipsoid([0, 0.18, -0.04], [0.3, 0.15, 0.22], { mat: 'robe', k: 0.08 });
  F.ellipsoid([0, 0.32, 0.0], [0.235, 0.16, 0.175], { mat: 'robeIn', k: 0.1 });
  F.ellipsoid([0, 0.465, -0.01], [0.255, 0.15, 0.165], { mat: 'robe', k: 0.1 });
  F.mirror((m) => m.ellipsoid([0.1, 0.475, 0.07], [0.11, 0.08, 0.08], { mat: 'robe', k: 0.07 }));
  F.ellipsoid([0, 0.49, -0.07], [0.265, 0.14, 0.14], { mat: 'robe', k: 0.08 });
  F.capsule([-0.16, 0.57, -0.035], [0.16, 0.57, -0.035], 0.095, { mat: 'robe', k: 0.1 });
  F.mirror((m) => m.sphere([0.235, 0.545, -0.025], 0.08, { mat: 'robe', k: 0.07 }));
  // 颈 + 三道
  F.cone([0, 0.55, -0.015], [0, 0.76, 0.0], 0.07, 0.062, { mat: 'skin', k: 0.04 });
  F.torus([0, 0.675, 0.003], 0.066, 0.006, { mat: 'skin', k: 0.008, rot: [0.12, 0, 0] });
  F.torus([0, 0.7, 0.006], 0.063, 0.0055, { mat: 'skin', k: 0.008, rot: [0.12, 0, 0] });
  F.ellipsoid([0, 0.555, 0.11], [0.07, 0.09, 0.12], { op: 'paint', mat: 'skin' }); // 胸口肌肤

  // ---------------- 袈裟衣领与衣纹（少而有力） ----------------
  F.mirror((m) => {
    ridge(m, [[0.072, 0.625, 0], [0.105, 0.56, 0], [0.11, 0.48, 0], [0.085, 0.4, 0], [0.04, 0.33, 0]], [0, 0, 1], 0.011, { mat: 'robeEdge', taper: false, lift: -0.006, far: 0.5 });
    ridge(m, [[0.075, 0.6, 0.05], [0.115, 0.6, 0.0], [0.15, 0.58, -0.06], [0.17, 0.56, -0.12]], [0, 1, 0], 0.011, { mat: 'robeEdge', taper: false, lift: -0.006, far: 0.1 });
  });
  ridge(F, [[-0.19, 0.37, 0], [-0.1, 0.36, 0], [0, 0.355, 0], [0.1, 0.36, 0], [0.19, 0.37, 0]], [0, 0, 1], 0.01, { mat: 'robeEdge', taper: false, lift: -0.003 });
  // 腿上几条放射状的大衣纹
  for (const i of [-3, -2, 2, 3]) {
    const a = i * 0.14;
    const x0 = Math.sin(a) * 0.06, x1 = Math.sin(a) * 0.42;
    ridge(F, [[x0, 1, 0.2], [x0 * 2.5 + x1 * 0.2, 1, 0.28], [x1, 1, 0.36 - Math.abs(Math.sin(a)) * 0.12]], [0, 1, 0], 0.0075, { mat: 'robe', far: 1.0 });
  }
  F.mirror((m) => {
    for (let i = 0; i < 2; i++) {
      const z = 0.08 + i * 0.08;
      ridge(m, [[0.24 + i * 0.02, 1, z - 0.02], [0.34, 1, z + 0.02], [0.45, 1, z + 0.06]], [0, 1, 0], 0.007, { mat: 'robe' });
    }
  });

  // ---------------- 手臂与手印 ----------------
  const shoulderL = [0.255, 0.525, -0.02];
  const sleeve = { sleeve: 0.07, ru: 0.066, rf: 0.056, rw: 0.04, upper: 0.25, fore: 0.24 };
  if (mudra === 'earth') {
    const r = arm(F.mirrored(), shoulderL, [0.37, 0.2, 0.33], { ...sleeve, pole: [1, 0.2, -0.6] });
    handAt(F.mirrored(), r.wrist, [0.0, -1, 0.35], [0, 0.2, 1], 'flat', 'skin', 1.0, { curl: 0.12 });
  }
  if (mudra === 'teach') {
    arm(F.mirrored(), shoulderL, [0.2, 0.42, 0.24], { ...sleeve, pole: [1, -1, -0.2] });
    handAt(F.mirrored(), [0.2, 0.42, 0.24], [-0.15, 0.95, 0.2], [0, 0, 1], 'mudra', 'skin', 1.0);
  }
  const lapHands = mudra === 'dhyana' || mudra === 'bowl' || mudra === 'lotus';
  const lw = lapHands ? [0.12, 0.205, 0.21] : [0.1, 0.21, 0.21];
  arm(F, shoulderL, lw, { ...sleeve, pole: [1, -0.4, -0.6] });
  handAt(F, lw, [-1, 0.0, 0.12], [0, -1, 0], 'flat', 'skin', 1.0, { left: true, curl: 0.1 });
  if (lapHands) {
    const rw = [-0.125, 0.225, 0.215];
    arm(F.mirrored(), shoulderL, [0.125, 0.225, 0.215], { ...sleeve, pole: [1, -0.4, -0.6] });
    handAt(F, rw, [1, 0.0, 0.12], [0, -1, 0], 'flat', 'skin', 1.0, { curl: 0.1 });
    if (mudra === 'dhyana') {
      F.chain([[-0.04, 0.24, 0.255], [-0.005, 0.27, 0.255]], [0.011, 0.0095], { mat: 'skin', k: 0.008 });
      F.chain([[0.04, 0.24, 0.255], [0.005, 0.27, 0.255]], [0.011, 0.0095], { mat: 'skin', k: 0.008 });
    }
  }

  // ---------------- 头部 ----------------
  const H = F.child([0, 0.88, 0.03], 0.3);
  buddhaFace(H, { smile: 0.25 });

  // ---------------- 分块：躯体 / 头部 / 手（各自精度） ----------------
  const headBox = [[-0.17, 0.71, -0.17], [0.17, 1.12, 0.18]];
  const handBox = lapHands ? [[-0.25, 0.14, 0.12], [0.25, 0.32, 0.36]] : [[-0.06, 0.12, 0.1], [0.3, 0.32, 0.34]];
  const parts = [
    { name: 'body', bmin: [-0.56, -0.02, -0.32], bmax: [0.56, 0.76, 0.46], h: 0.0065, exclude: [headBox, handBox] },
    { name: 'head', bmin: headBox[0], bmax: headBox[1], h: 0.0022 },
    { name: 'hands', bmin: handBox[0], bmax: handBox[1], h: 0.003 },
  ];
  if (mudra === 'earth') {
    const eb = [[-0.47, 0.03, 0.22], [-0.26, 0.26, 0.47]];
    parts[0].exclude.push(eb);
    parts.push({ name: 'handE', bmin: eb[0], bmax: eb[1], h: 0.003 });
  }
  if (mudra === 'teach') {
    const tb = [[-0.3, 0.36, 0.14], [-0.1, 0.62, 0.36]];
    parts[0].exclude.push(tb);
    parts.push({ name: 'handT', bmin: tb[0], bmax: tb[1], h: 0.003 });
  }

  const props = [];
  if (mudra === 'bowl') props.push({ type: 'bowl', pos: [0, 0.255, 0.225], scale: 1 });
  if (mudra === 'lotus') props.push({ type: 'lotusBud', pos: [0, 0.25, 0.225], scale: 1 });
  return { S, parts, props, height: 1.1 };
}
