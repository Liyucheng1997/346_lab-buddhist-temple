// 观音菩萨立像：高髻宝冠（冠中化佛），璎珞帔帛，右手持杨柳枝，左手托净瓶。通身贴金，发髻石青。
import { Sculpt } from '../sdf.js';
import { Frame, head, arm, handAt, V, spline } from '../anatomy.js';
import { standingBody } from '../bodies.js';
import { palette } from './palette.js';

export function guanyin(p = {}) {
  const S = new Sculpt(palette({ pearl: { color: '#f4efe4', cls: 'gloss' } }));
  const F = new Frame(S);
  const B = standingBody(F, { width: 0.95 });

  // ---------------- 手臂：右手持柳枝（举至胸前），左手托净瓶于腰侧 ----------------
  const sl = { sleeve: 0.12, ru: 0.062, rf: 0.052, rw: 0.038, upper: 0.27, fore: 0.26, mat: 'robe' };
  const r = arm(F.mirrored(), B.shoulderL, [0.16, 1.25, 0.26], { ...sl, pole: [1, -0.6, -0.5] });
  handAt(F.mirrored(), r.wrist, [-0.2, 1, 0.2], [0, 0, 1], 'mudra', 'skin', 1.0);
  const props = [{ type: 'willow', pos: [-0.17, 1.33, 0.3] }];
  const l = arm(F, B.shoulderL, [0.26, 1.05, 0.2], { ...sl, pole: [1, -0.3, -0.7] });
  handAt(F, l.wrist, [-0.3, 0.1, 0.95], [0, 1, 0], 'flat', 'skin', 1.0, { left: true, curl: 0.25 });
  props.push({ type: 'vase', pos: [0.24, 1.1, 0.3] });

  // ---------------- 璎珞：项链 + 胸前垂饰 ----------------
  const necklace = spline([[-0.14, 1.6, 0.06], [-0.1, 1.5, 0.14], [0, 1.44, 0.17], [0.1, 1.5, 0.14], [0.14, 1.6, 0.06]], 4);
  for (let i = 0; i < necklace.length; i += 2) { const q = necklace[i]; F.sphere(F.surface([q[0], q[1], 0], [0, 0, 1], 0.6), 0.011, { mat: 'pearl', k: 0.002 }); }
  F.sphere(F.surface([0, 1.43, 0], [0, 0, 1], 0.6), 0.028, { mat: 'jewel', k: 0.004 });
  const pend = spline([[0, 1.42, 0.17], [-0.06, 1.3, 0.17], [0, 1.2, 0.18], [0.06, 1.3, 0.17], [0, 1.42, 0.17]], 4);
  for (let i = 0; i < pend.length; i += 2) { const q = pend[i]; F.sphere(F.surface([q[0], q[1], 0], [0, 0, 1], 0.6), 0.009, { mat: 'pearl', k: 0.002 }); }
  F.sphere(F.surface([0, 1.19, 0], [0, 0, 1], 0.6), 0.02, { mat: 'jewel', k: 0.004 });
  // 臂钏 / 手镯
  F.mirror((m) => m.torus([0.235, 1.3, 0.05], 0.058, 0.009, { mat: 'gold', k: 0.004, rot: [0, 0, 0.3] }));

  // ---------------- 帔帛：自双肩绕臂飘落 ----------------
  const rib = (pts, tw) => F.ribbon(spline(pts, 6), [0.04, 0.055, 0.055, 0.045], 0.008, { mat: 'robeIn', k: 0.012, up: [0, 0, 1], twist: tw });
  rib([[0.18, 1.62, -0.05], [0.36, 1.45, -0.1], [0.42, 1.1, -0.02], [0.36, 0.7, 0.1], [0.3, 0.3, 0.18]], 2);
  rib([[-0.18, 1.62, -0.05], [-0.36, 1.45, -0.1], [-0.42, 1.1, -0.02], [-0.36, 0.7, 0.1], [-0.3, 0.3, 0.18]], -2);

  // ---------------- 头：高髻 + 宝冠（化佛） ----------------
  const H = F.child([0, 1.86, 0.03], 0.25, [0.05, 0, 0]);
  head(H, { style: 'bodhisattva', fat: 0.4, smile: 0.2 });
  // 宝冠：花叶形冠叶围绕发髻，正中一尊小化佛
  for (let i = -2; i <= 2; i++) {
    const a = i * 0.5;
    H.ellipsoid([Math.sin(a) * 0.3, 0.42 + Math.abs(i) * -0.03, Math.cos(a) * 0.3 - 0.05], [0.09, 0.16, 0.025], { mat: 'gold', k: 0.01, rot: [0, a, 0] });
    H.sphere([Math.sin(a) * 0.3, 0.45, Math.cos(a) * 0.3 - 0.02], 0.03, { mat: 'jewel', k: 0.004 });
  }
  H.torus([0, 0.3, -0.04], 0.33, 0.025, { mat: 'gold', k: 0.008, rot: [0.1, 0, 0] }); // 冠箍
  // 化佛（阿弥陀小像，简化为坐像剪影）
  const A = H.child([0, 0.52, 0.27], 0.16, [0, 0, 0]);
  A.ellipsoid([0, 0.1, 0], [0.4, 0.14, 0.25], { mat: 'gold', k: 0.05 });
  A.ellipsoid([0, 0.38, -0.02], [0.22, 0.28, 0.18], { mat: 'gold', k: 0.05 });
  A.sphere([0, 0.8, 0], 0.17, { mat: 'gold', k: 0.03 });
  A.sphere([0, 0.97, -0.02], 0.08, { mat: 'hair', k: 0.02 });
  // 冠带自耳侧垂下
  H.mirror((m) => m.ribbon([[0.3, 0.2, 0.1], [0.42, -0.2, 0.12], [0.45, -0.7, 0.1]], 0.05, 0.012, { mat: 'robeIn', k: 0.01, up: [1, 0, 0] }));

  const headBox = [[-0.17, 1.68, -0.16], [0.17, 2.12, 0.16]];
  const handBox = [[-0.3, 1.05, 0.15], [-0.05, 1.42, 0.4]];
  const parts = [
    { name: 'body', bmin: [-0.55, -0.02, -0.3], bmax: [0.55, 1.72, 0.45], h: 0.009, exclude: [headBox, handBox] },
    { name: 'head', bmin: headBox[0], bmax: headBox[1], h: 0.0025 },
    { name: 'hand', bmin: handBox[0], bmax: handBox[1], h: 0.003 },
  ];
  return { S, parts, props, height: 2.12, name: '观音菩萨' };
}
