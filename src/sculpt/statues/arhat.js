// 十八罗汉：彩塑坐像，面相、姿态、持物各异。
import { Sculpt } from '../sdf.js';
import { Frame, head, arm, handAt, beads, rng, V } from '../anatomy.js';
import { seatedBody, SLEEVE } from '../bodies.js';
import { palette, paintedSkin } from './palette.js';

// 十八罗汉名号与设定（名号按汉地通行序）
export const ARHATS = [
  { name: '宾度罗跋罗堕阇尊者（坐鹿罗汉）', age: 0.8, longBrows: false, beard: 2, prop: 'staff', pose: 'lotus' },
  { name: '迦诺迦伐蹉尊者（喜庆罗汉）', age: 0.3, smile: 0.9, mouthOpen: 0.5, prop: 'none', pose: 'kneeUp' },
  { name: '迦诺迦跋厘堕阇尊者（举钵罗汉）', age: 0.5, prop: 'bowlUp', pose: 'lotus' },
  { name: '苏频陀尊者（托塔罗汉）', age: 0.4, prop: 'pagoda', pose: 'lotus' },
  { name: '诺距罗尊者（静坐罗汉）', age: 0.6, prop: 'none', pose: 'lotus', dhyana: true },
  { name: '跋陀罗尊者（过江罗汉）', age: 0.3, prop: 'scroll', pose: 'kneeUp' },
  { name: '迦理迦尊者（骑象罗汉）', age: 0.5, beard: 1, prop: 'beads', pose: 'lotus' },
  { name: '伐阇罗弗多罗尊者（笑狮罗汉）', age: 0.4, smile: 0.8, mouthOpen: 0.4, prop: 'none', pose: 'kneeUp' },
  { name: '戍博迦尊者（开心罗汉）', age: 0.5, prop: 'none', pose: 'lotus', openChest: true },
  { name: '半托迦尊者（探手罗汉）', age: 0.4, prop: 'none', pose: 'stretch' },
  { name: '罗怙罗尊者（沉思罗汉）', age: 0.3, prop: 'none', pose: 'think' },
  { name: '那伽犀那尊者（挖耳罗汉）', age: 0.5, prop: 'none', pose: 'ear' },
  { name: '因揭陀尊者（布袋罗汉）', age: 0.6, prop: 'bag', pose: 'lotus' },
  { name: '伐那婆斯尊者（芭蕉罗汉）', age: 0.5, prop: 'fan', pose: 'lotus' },
  { name: '阿氏多尊者（长眉罗汉）', age: 0.95, longBrows: true, beard: 2, prop: 'none', pose: 'lotus' },
  { name: '注荼半托迦尊者（看门罗汉）', age: 0.4, prop: 'staff', pose: 'lotus' },
  { name: '迦叶尊者（降龙罗汉）', age: 0.5, beard: 1, prop: 'pearl', pose: 'kneeUp' },
  { name: '弥勒尊者（伏虎罗汉）', age: 0.6, prop: 'none', pose: 'lotus', tiger: true },
];

const ROBES = [['#8a3a1e', '#c8803a', '#5a2410'], ['#6b2d22', '#b45b32', '#3f1810'], ['#7a5a2e', '#c89a4a', '#4a3418'], ['#2f4a6b', '#6b86a8', '#1c2c44'], ['#5c6b3a', '#9aa85c', '#36401f']];

export function arhat(p = {}) {
  const idx = p.index ?? 0;
  const A = ARHATS[idx % ARHATS.length];
  const R = rng(idx + 11);
  const rc = ROBES[idx % ROBES.length];
  const S = new Sculpt(palette({
    ...paintedSkin(['#e9c39b', '#d9ad84', '#c99a74', '#f0d2b0'][idx % 4]),
    robe: { color: rc[0], cls: 'paint' }, robeIn: { color: rc[1], cls: 'paint' }, robeEdge: { color: '#d8b060', cls: 'gold' },
    bag: { color: '#a08a5a', cls: 'paint' },
  }));
  const F = new Frame(S);
  const B = seatedBody(F, { foot: A.pose !== 'kneeUp' });

  // 竖起右膝的姿势：在盘腿体块上加一条屈起的腿
  if (A.pose === 'kneeUp') {
    F.cone([-0.14, 0.14, -0.04], [-0.28, 0.46, 0.18], 0.13, 0.095, { mat: 'robe', k: 0.07 });
    F.cone([-0.28, 0.46, 0.18], [-0.3, 0.08, 0.3], 0.09, 0.08, { mat: 'robe', k: 0.06 });
    F.sphere([-0.28, 0.48, 0.2], 0.09, { mat: 'robe', k: 0.05 });
    F.ellipsoid([-0.31, 0.06, 0.4], [0.065, 0.035, 0.1], { mat: 'skin', k: 0.02 });
  }

  // ---------------- 手臂与持物 ----------------
  const props = [];
  const sl = { ...SLEEVE, mat: 'robe' };
  const L = B.shoulderL, Rr = B.shoulderR;
  const lap = (x) => [x * 0.12, 0.21, 0.21];
  const handLap = (x, pose = 'flat') => {
    const w = lap(x);
    arm(x > 0 ? F : F.mirrored(), L, [0.12, 0.21, 0.21], { ...sl, pole: [1, -0.4, -0.6] });
    handAt(F, w, [-x, 0, 0.12], [0, -1, 0], pose, 'skin', 1.0, { left: x > 0, curl: 0.1 });
  };
  switch (A.pose) {
    case 'stretch': // 探手：右臂高举伸展，左手按膝
      { const a = arm(F.mirrored(), L, [0.3, 0.95, 0.1], { ...sl, pole: [1, 0.5, -0.5] }); handAt(F.mirrored(), a.wrist, [0.2, 1, 0.2], [0, 0, 1], 'flat', 'skin', 1.0, { curl: 0.2 }); }
      { const a = arm(F, L, [0.34, 0.22, 0.25], { ...sl, pole: [1, -0.3, -0.6] }); handAt(F, a.wrist, [0.2, -1, 0.3], [0, 0.3, 1], 'flat', 'skin', 1.0, { left: true, curl: 0.3 }); }
      break;
    case 'think': // 沉思：右手托腮，左手置膝
      { const a = arm(F.mirrored(), L, [0.12, 0.72, 0.2], { ...sl, pole: [1, -0.3, -0.6] }); handAt(F.mirrored(), a.wrist, [-0.3, 1, 0.1], [0, 0, 1], 'flat', 'skin', 1.0, { curl: 0.4 }); }
      { const a = arm(F, L, [0.34, 0.22, 0.25], { ...sl, pole: [1, -0.3, -0.6] }); handAt(F, a.wrist, [0.2, -1, 0.3], [0, 0.3, 1], 'flat', 'skin', 1.0, { left: true, curl: 0.3 }); }
      break;
    case 'ear': // 挖耳：右手举至耳侧
      { const a = arm(F.mirrored(), L, [0.28, 0.82, 0.08], { ...sl, pole: [1, -0.2, -0.7] }); handAt(F.mirrored(), a.wrist, [-0.3, 0.9, 0.2], [0, 0, 1], 'point', 'skin', 1.0, { curl: 0.1 }); }
      handLap(1);
      break;
    default:
      if (A.dhyana) { handLap(1); handLap(-1); }
      else if (A.prop === 'bowlUp') {
        const a = arm(F.mirrored(), L, [0.2, 0.75, 0.22], { ...sl, pole: [1, -0.5, -0.6] }); handAt(F.mirrored(), a.wrist, [0.1, 0.3, 1], [0, 1, 0], 'flat', 'skin', 1.0, { curl: 0.2 });
        props.push({ type: 'bowl', pos: [-0.2, 0.8, 0.3], scale: 1.1 }); handLap(1);
      } else if (A.prop === 'pagoda') { handLap(1); handLap(-1); props.push({ type: 'pagoda', pos: [0, 0.25, 0.24] }); }
      else if (A.prop === 'staff') { handLap(1); { const a = arm(F.mirrored(), L, [0.32, 0.5, 0.2], { ...sl, pole: [1, -0.3, -0.7] }); handAt(F.mirrored(), a.wrist, [0.1, -0.2, 1], [0, 1, 0], 'hold', 'skin', 1.0); props.push({ type: 'staff', pos: [-0.33, 0.48, 0.28], len: 1.6 }); } }
      else if (A.prop === 'fan') { handLap(1); { const a = arm(F.mirrored(), L, [0.3, 0.42, 0.24], { ...sl, pole: [1, -0.3, -0.7] }); handAt(F.mirrored(), a.wrist, [0, 0.3, 1], [0, 1, 0], 'hold', 'skin', 1.0); props.push({ type: 'fan', pos: [-0.3, 0.5, 0.3], rot: [0.3, 0, 0.3] }); } }
      else if (A.prop === 'scroll') { handLap(1); handLap(-1); props.push({ type: 'scroll', pos: [0, 0.27, 0.25], rot: [0, 0, Math.PI / 2] }); }
      else if (A.prop === 'pearl') { handLap(1); { const a = arm(F.mirrored(), L, [0.3, 0.8, 0.15], { ...sl, pole: [1, -0.1, -0.7] }); handAt(F.mirrored(), a.wrist, [0, 1, 0.2], [0, 0, 1], 'flat', 'skin', 1.0, { curl: 0.5 }); F.sphere([-0.31, 0.9, 0.2], 0.05, { mat: 'jewel', k: 0.004 }); } }
      else if (A.prop === 'beads') { handLap(1); handLap(-1); beads(F, [0, 0.27, 0.26], 0.1, 0.014, 24, [0.2, 0, 0]); }
      else if (A.prop === 'bag') { handLap(1); handLap(-1); F.ellipsoid([0.45, 0.16, 0.2], [0.15, 0.12, 0.15], { mat: 'bag', k: 0.04, folds: { dir: [0, 1, 0.3], freq: 40, amp: 0.005 } }); }
      else { handLap(1); handLap(-1); }
  }
  if (A.tiger) {
    // 伏虎：卧虎伏于右侧
    const T = F.child([-0.55, 0.0, 0.25], 0.5, [0, 0.6, 0]);
    T.ellipsoid([0, 0.22, 0], [0.22, 0.17, 0.5], { mat: 'tiger', k: 0.05 });
    T.sphere([0, 0.32, 0.55], 0.2, { mat: 'tiger', k: 0.05 });
    T.ellipsoid([0, 0.22, 0.72], [0.12, 0.09, 0.1], { mat: 'tiger', k: 0.03 });
    T.mirror((m) => { m.sphere([0.12, 0.45, 0.6], 0.05, { mat: 'tiger', k: 0.02 }); m.sphere([0.08, 0.36, 0.72], 0.03, { mat: 'pupil', k: 0.004 }); m.capsule([0.15, 0.12, 0.35], [0.2, 0.05, 0.75], 0.07, { mat: 'tiger', k: 0.03 }); });
    T.chain([[0, 0.25, -0.5], [0.2, 0.3, -0.8], [0.35, 0.15, -1.0]], [0.05, 0.04, 0.025], { mat: 'tiger', k: 0.02 });
    for (let i = 0; i < 7; i++) T.torus([0, 0.22, -0.35 + i * 0.12], 0.21, 0.012, { op: 'paint', mat: 'tigerStripe', rot: [Math.PI / 2, 0, 0] });
  }

  // ---------------- 头 ----------------
  const H = F.child(B.headPos, 0.28, [0, 0, 0]);
  head(H, { style: 'monk', age: A.age, smile: A.smile ?? 0.2, mouthOpen: A.mouthOpen, teeth: A.mouthOpen > 0.3, longBrows: A.longBrows, beard: A.beard, beardMat: A.age > 0.6 ? 'whiteHair' : 'hairBlack', browMat: A.age > 0.6 ? 'whiteHair' : 'brow', fat: 0.3 + R() * 0.4, long: (R() - 0.5) * 0.15 });

  const headBox = [[-0.16, 0.72, -0.15], [0.16, 1.05, 0.2]];
  const parts = [
    { name: 'body', bmin: [-0.95, -0.02, -0.35], bmax: [0.7, 1.05, 0.5], h: 0.0075, exclude: [headBox] },
    { name: 'head', bmin: headBox[0], bmax: headBox[1], h: 0.0025 },
  ];
  return { S, parts, props, height: 1.05, name: A.name };
}
