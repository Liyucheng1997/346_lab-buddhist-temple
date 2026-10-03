// 迦叶 / 阿难：侍立于佛两侧的比丘立像，双手合十。彩塑。
import { Sculpt } from '../sdf.js';
import { Frame, head, arm, handAt } from '../anatomy.js';
import { standingBody } from '../bodies.js';
import { palette, paintedSkin } from './palette.js';

export function monk(p = {}) {
  const old = p.which === 'kasyapa'; // 迦叶年长清癯，阿难年轻丰润
  const S = new Sculpt(palette({
    ...paintedSkin(old ? '#d4a47c' : '#efcfae'),
    robe: { color: old ? '#7a3a22' : '#8c4a2a', cls: 'paint' },
    robeIn: { color: old ? '#b8763a' : '#c8884a', cls: 'paint' },
    robeEdge: { color: '#d8b060', cls: 'gold' },
  }));
  const F = new Frame(S);
  const B = standingBody(F, { width: old ? 0.86 : 0.95 });
  // 双手合十于胸前
  const sl = { sleeve: 0.1, ru: 0.06, rf: 0.05, rw: 0.037, upper: 0.27, fore: 0.26, mat: 'robe' };
  for (const x of [1, -1]) {
    const Fx = x > 0 ? F : F.mirrored();
    const a = arm(Fx, B.shoulderL, [0.04, 1.3, 0.22], { ...sl, pole: [1, -0.6, -0.6] });
    handAt(Fx, a.wrist, [-0.05, 1, 0.1], [1, 0, 0], 'flat', 'skin', 1.0, { left: x > 0, curl: 0.05 });
  }
  const H = F.child([0, 1.86, 0.03], 0.24, [0.04, 0, 0]);
  head(H, { style: 'monk', age: old ? 0.9 : 0.05, smile: old ? 0.1 : 0.35, fat: old ? 0.0 : 0.5, long: old ? 0.12 : -0.02, browMat: old ? 'whiteHair' : 'brow' });

  const headBox = [[-0.14, 1.72, -0.13], [0.14, 2.02, 0.15]];
  const handBox = [[-0.12, 1.2, 0.12], [0.12, 1.48, 0.36]];
  const parts = [
    { name: 'body', bmin: [-0.4, -0.02, -0.3], bmax: [0.4, 1.75, 0.4], h: 0.009, exclude: [headBox, handBox] },
    { name: 'head', bmin: headBox[0], bmax: headBox[1], h: 0.0025 },
    { name: 'hands', bmin: handBox[0], bmax: handBox[1], h: 0.003 },
  ];
  return { S, parts, props: [], height: 2.0, name: old ? '迦叶尊者' : '阿难尊者' };
}
