// 结跏趺坐佛像（释迦牟尼 / 药师佛 / 阿弥陀佛），通身贴金，石青螺发，双领下垂式袈裟。
// 局部单位：盘坐底面 y=0，肉髻顶约 y=1.12，面朝 +z。
import { Sculpt } from '../sdf.js';
import { Frame } from '../anatomy.js';
import { buddhaHead } from '../buddhaHead.js';
import { buddhaBody } from '../buddhaBody.js';
import { palette } from './palette.js';

export function seatedBuddha(p = {}) {
  const mudra = p.mudra || 'dhyana'; // varada 与愿印 | earth 触地印 | dhyana 禅定印 | bowl 托钵 | lotus 托莲 | teach 说法印
  const S = new Sculpt(palette(p.palette || {}));
  const F = new Frame(S);

  const body = p.headOnly ? null : buddhaBody(F, mudra);

  // 头部：微微前倾俯视
  const H = F.child([0, 0.905, 0.035], 0.33, [0.07, 0, 0]);
  const head = buddhaHead(H);

  // 分块：躯体 / 头部 / 手（各自精度）
  // 面部（含双耳）用最细的网格，发层在螺发之下，可以粗一些
  const headBox = [[-0.195, 0.685, -0.21], [0.195, 1.165, 0.22]];
  const faceBox = [[-0.163, 0.685, -0.012], [0.163, 0.995, 0.22]];
  const headParts = [
    { name: 'head', bmin: faceBox[0], bmax: faceBox[1], h: 0.0013 },
    { name: 'headHair', bmin: headBox[0], bmax: headBox[1], h: 0.0026, exclude: [faceBox] },
  ];
  const decal = { part: 'head', ...H.xform() };
  if (p.headOnly) return { S, parts: headParts, props: [head.curls], height: 1.16, decal };

  // 胸前（衣领、僧祇支）与盘腿正面（衣纹）需要更细的网格，其余身躯粗一些；手各自单独一块
  const chestBox = [[-0.27, 0.22, -0.01], [0.27, 0.72, 0.26]];
  const lapBox = [[-0.62, -0.02, 0.04], [0.62, 0.27, 0.52]];
  const handBoxes = [...(body.handBox ? [body.handBox] : []), ...body.extraBoxes];
  const parts = [
    { name: 'body', bmin: [-0.62, -0.02, -0.34], bmax: [0.62, 0.8, 0.52], h: 0.0048, exclude: [headBox, chestBox, lapBox, ...handBoxes] },
    { name: 'chest', bmin: chestBox[0], bmax: chestBox[1], h: 0.0026, exclude: [headBox, ...handBoxes] },
    { name: 'lap', bmin: lapBox[0], bmax: lapBox[1], h: 0.0032, exclude: [chestBox, ...handBoxes] },
    ...headParts,
    ...handBoxes.map((b, i) => ({ name: 'hand' + i, bmin: b[0], bmax: b[1], h: 0.0024 })),
  ];

  const props = [head.curls];
  if (mudra === 'bowl') props.push({ type: 'bowl', pos: [0, 0.322, 0.235], scale: 1 });
  if (mudra === 'lotus') props.push({ type: 'lotusBud', pos: [0, 0.318, 0.235], scale: 1 });
  return { S, parts, props, height: 1.16, decal };
}
