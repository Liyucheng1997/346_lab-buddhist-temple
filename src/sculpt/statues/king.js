// 四大天王 / 韦驮：明清彩塑风格的披甲武将。
// 局部单位：足底 y=0，盔顶约 y=2.35，面朝 +z。+x 为像的左侧。
import { Sculpt } from '../sdf.js';
import { Frame, arm, handAt, spline, V, lookRot, rng } from '../anatomy.js';
import { head } from '../anatomy.js';
import { palette } from './palette.js';

// 四天王的方位/肤色/持物（汉地通行样式）
export const KINGS = {
  east: { name: '东方持国天王', skin: '#f2e6d8', weapon: 'pipa', beard: 2, mouthOpen: 0 },
  south: { name: '南方增长天王', skin: '#3f6aa8', weapon: 'sword', beard: 1, mouthOpen: 0.6 },
  west: { name: '西方广目天王', skin: '#b8352a', weapon: 'snake', beard: 2, mouthOpen: 0.3 },
  north: { name: '北方多闻天王', skin: '#3d8a52', weapon: 'umbrella', beard: 1, mouthOpen: 0 },
  weituo: { name: '韦驮菩萨', skin: '#f1dcc4', weapon: 'vajra', beard: 0, mouthOpen: 0 },
};

export function heavenlyKing(p = {}) {
  const K = KINGS[p.which || 'east'];
  const young = K.weapon === 'vajra';
  const S = new Sculpt(palette({
    skin: { color: K.skin, cls: 'paint' },
    armorGold: { color: '#e0b352', cls: 'gold' },
    armorGreen: { color: '#2d6a4c', cls: 'paint' },
    armorRed: { color: '#8e2a1c', cls: 'paint' },
    scale: { color: '#7d6a3a', cls: 'metal' },
    plate: { color: '#6f7f86', cls: 'metal' },
    ribbonRed: { color: '#c0392b', cls: 'paint' },
    ribbonGreen: { color: '#2f8a62', cls: 'paint' },
    cloth: { color: '#2f4a8a', cls: 'paint' },
    boot: { color: '#1c1917', cls: 'paint' },
    belt: { color: '#4a2a14', cls: 'paint' },
    plume: { color: '#c22f1e', cls: 'paint' },
    demon: { color: '#5a4a3c', cls: 'paint' },
    snake: { color: '#3f7a3a', cls: 'gloss' },
    snakeBelly: { color: '#d9d2a0', cls: 'paint' },
    mouse: { color: '#c9c3bd', cls: 'paint' },
  }));
  const F = new Frame(S);
  const R = rng(p.seed ?? 3);
  const scales = { amp: 0.0025, freq: 56 };

  // ---------------- 基座：岩石 + 俯伏的小鬼 ----------------
  F.ellipsoid([0, -0.06, 0], [0.75, 0.16, 0.6], { mat: 'rock', k: 0.08, noise: { amp: 0.03, freq: 6, oct: 3 } });
  F.ellipsoid([0.25, 0.08, 0.15], [0.42, 0.14, 0.34], { mat: 'rock', k: 0.1, noise: { amp: 0.035, freq: 5, oct: 3 } });
  // 小鬼：被左脚踏住（韦驮不踏鬼）
  const D = F.child([0.3, 0.0, 0.28], young ? 0 : 1);
  if (!young) {
  D.ellipsoid([0, 0.22, 0], [0.2, 0.17, 0.24], { mat: 'demon', k: 0.05 });            // 躯干
  D.sphere([0.02, 0.33, 0.27], 0.13, { mat: 'demon', k: 0.04 });                       // 头
  D.mirror((m) => {
    m.sphere([0.05, 0.36, 0.38], 0.018, { mat: 'eyeWhite', k: 0.004 });
    m.sphere([0.053, 0.36, 0.395], 0.008, { op: 'paint', mat: 'pupil' });
    m.capsule([0.17, 0.2, 0.1], [0.3, 0.05, 0.3], 0.05, { mat: 'demon', k: 0.03 });   // 臂
    m.capsule([0.15, 0.12, -0.1], [0.28, 0.04, -0.3], 0.06, { mat: 'demon', k: 0.03 }); // 腿
    m.cone([0.06, 0.42, 0.26], [0.1, 0.52, 0.22], 0.03, 0.008, { mat: 'demon', k: 0.02 }); // 角
  });
  D.ellipsoid([0.02, 0.28, 0.38], [0.04, 0.012, 0.025], { op: 'sub', mat: 'mouth', k: 0.01 });
  S.paintCut();
  } else F.ellipsoid([0.3, 0.2, 0.28], [0.3, 0.2, 0.28], { mat: 'rock', k: 0.1, noise: { amp: 0.03, freq: 6, oct: 3 } });

  // ---------------- 腿与靴 ----------------
  // 右腿（-x）直立承重；左腿（+x）屈膝踏在小鬼背上
  const hipR = [-0.17, 1.05, 0], hipL = [0.17, 1.05, 0.02];
  const kneeR = [-0.22, 0.58, 0.02], ankleR = [-0.24, 0.12, 0.0];
  const kneeL = [0.3, 0.62, 0.3], ankleL = [0.3, 0.42, 0.42];
  for (const [h, k, a] of [[hipR, kneeR, ankleR], [hipL, kneeL, ankleL]]) {
    F.cone(h, k, 0.17, 0.12, { mat: 'cloth', k: 0.06 });                                     // 裤腿
    F.cone(k, a, 0.115, 0.085, { mat: 'armorGreen', k: 0.05, scales });                       // 胫甲
    F.torus(V.lerp(k, a, 0.08), 0.1, 0.02, { mat: 'armorGold', k: 0.01, R: lookRot(V.sub(a, k), [0, 0, 1]) }); // 膝甲边
    F.sphere(V.add(k, [0, 0.02, 0.08]), 0.11, { mat: 'armorGold', k: 0.03 });                 // 膝兽面
    // 靴
    const fwd = [0, 0, 1];
    F.ellipsoid(V.add(a, [0, -0.06, 0.1]), [0.1, 0.07, 0.2], { mat: 'boot', k: 0.03 });
    F.ellipsoid(V.add(a, [0, 0.0, -0.02]), [0.095, 0.1, 0.11], { mat: 'boot', k: 0.03 });
    F.ellipsoid(V.add(a, [0, -0.02, 0.28]), [0.06, 0.05, 0.05], { mat: 'boot', k: 0.03 });  // 靴头上翘
    void fwd;
  }
  // 甲裙（鱼鳞甲片），从腰垂至膝上
  F.cone([0, 1.12, 0.0], [0, 0.72, 0.03], 0.31, 0.33, { mat: 'scale', k: 0.05, scales: { amp: 0.0025, freq: 48 }, clip: [[0, 0.72, 0], [0, -1, 0]] });
  F.cone([0, 1.12, 0.0], [0.33, 0.78, 0.3], 0.1, 0.2, { mat: 'scale', k: 0.08, scales: { amp: 0.0025, freq: 48 } }); // 左腿抬起带动的裙片
  for (let i = 0; i < 4; i++) F.torus([0, 1.04 - i * 0.085, 0.01], 0.335 + i * 0.008, 0.012, { mat: 'armorGold', k: 0.012 }); // 甲裙的层叠边
  // 裙边与腰下的护腿甲（膝裙）
  F.torus([0, 0.73, 0.03], 0.36, 0.028, { mat: 'armorGold', k: 0.02 });
  F.mirror((m) => m.ellipsoid([0.2, 0.85, 0.3], [0.13, 0.17, 0.04], { mat: 'armorRed', k: 0.03, rot: [0.2, 0, 0] }));

  // ---------------- 躯干与胸甲 ----------------
  F.ellipsoid([0, 1.22, 0.0], [0.3, 0.2, 0.22], { mat: 'belt', k: 0.1 });                     // 腰
  F.ellipsoid([0, 1.5, 0.0], [0.38, 0.27, 0.26], { mat: 'armorGreen', k: 0.1 });              // 胸廓
  F.ellipsoid([0, 1.66, -0.02], [0.42, 0.14, 0.24], { mat: 'armorGreen', k: 0.1 });           // 肩背
  // 腹甲（抱肚）：圆鼓的腹部护甲，兽面扣
  F.ellipsoid([0, 1.25, 0.2], [0.26, 0.17, 0.1], { mat: 'armorGold', k: 0.05 });
  F.sphere([0, 1.26, 0.3], 0.085, { mat: 'armorGold', k: 0.02 });
  F.mirror((m) => m.sphere([0.04, 1.29, 0.37], 0.02, { mat: 'jewel', k: 0.004 }));
  F.ellipsoid([0, 1.22, 0.375], [0.045, 0.015, 0.02], { op: 'sub', k: 0.008 });
  // 护心镜（胸前一面大镜）
  F.cylinder([0, 1.52, 0.255], 0.1, 0.012, { mat: 'plate', k: 0.01, rot: [Math.PI / 2 - 0.12, 0, 0] });
  F.torus([0, 1.52, 0.265], 0.1, 0.016, { mat: 'armorGold', k: 0.008, rot: [Math.PI / 2 - 0.12, 0, 0] });
  F.sphere([0, 1.525, 0.27], 0.025, { mat: 'armorGold', k: 0.01 });
  // 胸甲上下边缘的金边
  F.torus([0, 1.4, 0.02], 0.3, 0.025, { mat: 'armorGold', k: 0.02, rot: [0.1, 0, 0] });
  F.torus([0, 1.18, 0.0], 0.31, 0.03, { mat: 'armorGold', k: 0.02 });                         // 腰带
  // 束甲绦带：胸前交叉
  F.mirror((m) => m.ribbon(spline([[0.0, 1.68, 0.22], [0.2, 1.5, 0.25], [0.28, 1.3, 0.2]], 4), 0.04, 0.012, { mat: 'ribbonRed', k: 0.01 }));
  // 肩甲：兽吞肩
  F.mirror((m) => {
    m.ellipsoid([0.4, 1.66, 0.0], [0.17, 0.13, 0.17], { mat: 'armorGold', k: 0.05 });
    m.ellipsoid([0.45, 1.64, 0.12], [0.08, 0.07, 0.08], { mat: 'armorGold', k: 0.03 });     // 兽吻
    m.sphere([0.43, 1.7, 0.1], 0.03, { mat: 'eyeWhite', k: 0.005 });
    m.sphere([0.44, 1.71, 0.125], 0.013, { op: 'paint', mat: 'pupil' });
    m.sphere([0.5, 1.7, 0.08], 0.03, { mat: 'eyeWhite', k: 0.005 });
    m.sphere([0.515, 1.71, 0.1], 0.013, { op: 'paint', mat: 'pupil' });
    m.ellipsoid([0.47, 1.6, 0.17], [0.07, 0.02, 0.03], { op: 'sub', mat: 'mouth', k: 0.01 }); // 兽口
    F.S.paintCut();
    m.torus([0.4, 1.56, 0.0], 0.15, 0.02, { mat: 'armorGold', k: 0.01 });
  });
  // 护项（颈甲）与领
  F.cone([0, 1.72, 0], [0, 1.86, 0], 0.17, 0.12, { mat: 'armorGreen', k: 0.03, scales });
  F.torus([0, 1.85, 0], 0.12, 0.02, { mat: 'armorGold', k: 0.01 });
  F.cone([0, 1.8, 0], [0, 1.95, 0.02], 0.1, 0.095, { mat: 'skin', k: 0.03 });              // 颈

  // ---------------- 头与盔 ----------------
  const headC = [0, 2.08, 0.03];
  const H = F.child(headC, 0.36, [0.06, 0, 0]);
  head(H, {
    style: 'king', fierce: young ? 0.25 : 1, fat: 0.2, smile: 0, beard: K.beard, mouthOpen: K.mouthOpen, teeth: K.mouthOpen > 0.4,
    browPaint: false,
  });
  // 兜鍪：盔体、盔檐、凤翅、盔缨（盔檐位于发际之上，露出额头与浓眉）
  const hc = H.p([0, 0.42, -0.05]);
  F.ellipsoid(hc, [0.165, 0.16, 0.17], { mat: 'armorGold', k: 0.03, clip: [H.p([0, 0.3, 0]), H.d([0, -1, 0.3])] });
  F.torus(H.p([0, 0.33, -0.03]), 0.16, 0.022, { mat: 'armorGold', k: 0.01, rot: [0.1, 0, 0] });        // 盔檐
  F.ellipsoid(H.p([0, 0.38, 0.4]), [0.045, 0.045, 0.028], { mat: 'jewel', k: 0.01 });                   // 额前宝珠
  F.cone(H.p([0, 0.85, -0.1]), H.p([0, 1.05, -0.1]), 0.035, 0.015, { mat: 'armorGold', k: 0.01 });   // 盔顶管
  F.sphere(H.p([0, 1.07, -0.1]), 0.028, { mat: 'jewel', k: 0.006 });
  // 盔缨（红缨后垂）
  F.chain([H.p([0, 1.0, -0.1]), H.p([0, 1.05, -0.35]), H.p([0, 0.85, -0.6]), H.p([0, 0.55, -0.72]), H.p([0, 0.2, -0.78])], [0.025, 0.05, 0.06, 0.055, 0.04], { mat: 'plume', k: 0.03, folds: { dir: [1, 0, 0], freq: 90, amp: 0.002 } });
  // 凤翅：耳侧向上展开的薄翼，带羽脊
  H.mirror((m) => {
    m.ellipsoid([0.5, 0.65, -0.1], [0.075, 0.3, 0.022], { mat: 'armorGold', k: 0.015, rot: [0.1, -0.25, -0.5] });
    for (let i = 0; i < 4; i++) m.capsule([0.38 + i * 0.05, 0.42 + i * 0.03, -0.09 - i * 0.01], [0.52 + i * 0.05, 0.85 - i * 0.04, -0.12 - i * 0.01], 0.012, { mat: 'armorGold', k: 0.01 });
    m.ellipsoid([0.36, 0.15, 0.0], [0.05, 0.11, 0.09], { mat: 'armorGold', k: 0.02, rot: [0, 0, 0.2] }); // 护耳
  });
  // 护项下垂的甲片（颈后）
  F.cone(H.p([0, 0.0, -0.3]), H.p([0, -0.6, -0.42]), 0.11, 0.15, { mat: 'scale', k: 0.03, scales, clip: [H.p([0, 0, -0.2]), H.d([0, 0, 1])] });

  // ---------------- 手臂、手与持物 ----------------
  const shL = [0.4, 1.63, 0.0], shR = [-0.4, 1.63, 0.0];
  const armOpt = { mat: 'cloth', foreMat: 'cloth', ru: 0.11, rf: 0.085, rw: 0.06, upper: 0.42, fore: 0.4, folds: { dir: [0, 1, 0], freq: 40, amp: 0.006 } };
  const guard = (elbow, wrist) => { // 臂鞲：小臂甲
    F.cone(V.lerp(elbow, wrist, 0.25), V.lerp(elbow, wrist, 0.98), 0.095, 0.075, { mat: 'armorGreen', k: 0.02, scales });
    F.torus(V.lerp(elbow, wrist, 0.98), 0.075, 0.016, { mat: 'armorGold', k: 0.008, R: lookRot(V.sub(wrist, elbow), [0, 1, 0]) });
    F.torus(V.lerp(elbow, wrist, 0.28), 0.1, 0.016, { mat: 'armorGold', k: 0.008, R: lookRot(V.sub(wrist, elbow), [0, 1, 0]) });
  };
  const props = [];
  const w = K.weapon;
  if (w === 'sword') {
    // 右手高举宝剑，左手按剑鞘于腰侧
    const wr = [-0.55, 1.95, 0.25];
    const a = arm(F, shR, wr, { ...armOpt, pole: [-1, 0.3, -0.5] });
    guard(a.elbow, a.wrist);
    handAt(F, a.wrist, [-0.3, 0.9, 0.3], [0, 0, 1], 'hold', 'skin', 1.35, { left: false });
    props.push({ type: 'sword', pos: V.add(V.add(a.wrist, V.mul(V.norm([-0.3, 0.9, 0.3]), 0.1)), V.mul(V.norm([0.1, 1, 0.05]), 0.12)), dir: [0.1, 1, 0.05], len: 1.2 });
    const wl = [0.42, 1.1, 0.3];
    const b = arm(F, shL, wl, { ...armOpt, pole: [1, -0.3, -0.6] });
    guard(b.elbow, b.wrist);
    handAt(F, b.wrist, [-0.2, -0.6, 0.75], [0, 1, 0], 'hold', 'skin', 1.35, { left: true });
    props.push({ type: 'scabbard', pos: V.add(b.wrist, [0.0, 0.1, 0.05]), dir: [0.3, 1, -0.15], len: 1.1 });
  } else if (w === 'pipa') {
    // 琵琶斜抱胸前：左手托琴颈，右手弹拨
    const wl = [0.48, 1.6, 0.42];
    const a = arm(F, shL, wl, { ...armOpt, pole: [1, 0, -0.8] });
    guard(a.elbow, a.wrist);
    handAt(F, a.wrist, [-0.4, 0.6, 0.2], [0, 0, 1], 'hold', 'skin', 1.35, { left: true });
    const wr = [-0.25, 1.2, 0.45];
    const b = arm(F, shR, wr, { ...armOpt, pole: [-1, -0.5, -0.5] });
    guard(b.elbow, b.wrist);
    handAt(F, b.wrist, [0.8, -0.1, 0.1], [0, 0, 1], 'flat', 'skin', 1.35, { curl: 0.5 });
    props.push({ type: 'pipa', pos: [0.05, 1.38, 0.42], rot: [0.25, 0, -0.75] });
  } else if (w === 'snake') {
    // 右手高举宝珠，左手握蛇；蛇身缠绕左臂
    const wr = [-0.45, 2.05, 0.2];
    const a = arm(F, shR, wr, { ...armOpt, pole: [-1, 0.2, -0.6] });
    guard(a.elbow, a.wrist);
    handAt(F, a.wrist, [-0.2, 1, 0.2], [0, 0, 1], 'flat', 'skin', 1.35, { curl: 0.6 });
    F.sphere([-0.47, 2.15, 0.27], 0.065, { mat: 'jewel', k: 0.006 });
    const wl = [0.5, 1.25, 0.4];
    const b = arm(F, shL, wl, { ...armOpt, pole: [1, -0.3, -0.7] });
    guard(b.elbow, b.wrist);
    handAt(F, b.wrist, [0.3, -0.3, 0.9], [0, 1, 0], 'hold', 'skin', 1.35, { left: true });
    // 蛇（龙）：沿左臂螺旋缠绕，头昂起
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const t = i / 28;
      const c = V.lerp(b.elbow, b.wrist, 0.1 + t * 0.95);
      const ang = t * Math.PI * 3.2;
      const rr = 0.12 - t * 0.02;
      pts.push(V.add(c, [Math.cos(ang) * rr, Math.sin(ang) * rr * 0.8, Math.sin(ang) * rr * 0.6]));
    }
    const headPts = [V.add(b.wrist, [0.12, 0.05, 0.3]), V.add(b.wrist, [0.1, 0.35, 0.4]), V.add(b.wrist, [0.0, 0.6, 0.35])];
    const all = pts.concat(headPts);
    const sm = spline(all, 2);
    const radii = sm.map((_, i) => 0.03 + 0.02 * Math.sin((i / sm.length) * Math.PI));
    F.chain(sm, radii, { mat: 'snake', k: 0.02, scales: { amp: 0.004, freq: 90 } });
    const hd = sm[sm.length - 1];
    F.ellipsoid(V.add(hd, [0, 0.04, 0.03]), [0.06, 0.045, 0.09], { mat: 'snake', k: 0.02 });
    F.mirror((m) => { m.sphere(V.add(hd, [0.04, 0.07, 0.06]), 0.016, { mat: 'eyeWhite', k: 0.003 }); m.sphere(V.add(hd, [0.045, 0.072, 0.072]), 0.008, { op: 'paint', mat: 'pupil' }); });
    F.ellipsoid(V.add(hd, [0, 0.02, 0.1]), [0.035, 0.008, 0.04], { op: 'sub', mat: 'mouth', k: 0.006 });
    S.paintCut();
  } else if (w === 'umbrella') {
    // 右手持宝伞（伞合拢竖立），左手托银鼠
    const wr = [-0.5, 1.3, 0.35];
    const a = arm(F, shR, wr, { ...armOpt, pole: [-1, -0.2, -0.7] });
    guard(a.elbow, a.wrist);
    handAt(F, a.wrist, [-0.1, -0.3, 0.95], [0, 1, 0], 'hold', 'skin', 1.35);
    props.push({ type: 'umbrella', pos: [-0.52, 1.28, 0.36], len: 1.3 });
    const wl = [0.45, 1.3, 0.38];
    const b = arm(F, shL, wl, { ...armOpt, pole: [1, -0.4, -0.6] });
    guard(b.elbow, b.wrist);
    handAt(F, b.wrist, [-0.6, 0.0, 0.8], [0, 1, 0], 'flat', 'skin', 1.35, { left: true, curl: 0.2 });
    // 银鼠：伏于掌中
    const mc = V.add(b.wrist, [-0.08, 0.06, 0.12]);
    F.ellipsoid(mc, [0.06, 0.05, 0.1], { mat: 'mouse', k: 0.02 });
    F.ellipsoid(V.add(mc, [0, 0.03, 0.11]), [0.045, 0.04, 0.06], { mat: 'mouse', k: 0.015 });
    F.mirror((m) => { m.sphere(V.add(mc, [0.035, 0.08, 0.1]), 0.022, { mat: 'mouse', k: 0.008 }); m.sphere(V.add(mc, [0.025, 0.045, 0.165]), 0.007, { mat: 'pupil', k: 0.002 }); });
    F.chain([V.add(mc, [0, 0.0, -0.1]), V.add(mc, [0.08, -0.03, -0.2]), V.add(mc, [0.16, -0.08, -0.22])], [0.014, 0.01, 0.005], { mat: 'mouse', k: 0.006 });
  } else if (w === 'vajra') {
    // 韦驮：双手合十，金刚杵横置于腕上
    for (const [sh, x] of [[shL, 1], [shR, -1]]) {
      const wr = [x * 0.07, 1.42, 0.4];
      const a = arm(F, sh, wr, { ...armOpt, pole: [x, -0.6, -0.6] });
      guard(a.elbow, a.wrist);
      handAt(F, a.wrist, [-x * 0.05, 1, 0.1], [x, 0, 0], 'flat', 'skin', 1.35, { left: x > 0, curl: 0.05 });
    }
    props.push({ type: 'vajra', pos: [0, 1.43, 0.38], rot: [0, 0, Math.PI / 2], len: 0.9 });
  }

  // ---------------- 飘带（帔帛）：从肩后扬起，绕身飞舞 ----------------
  const rib = (pts, mat, wdt, tw = 2.2) => {
    const sm = spline(pts, 7).map((q, i, arr) => V.add(q, [0, 0, 0.03 * Math.sin(i / arr.length * Math.PI * 5)]));
    F.ribbon(sm, [wdt * 0.6, wdt, wdt, wdt * 0.8], 0.009, { mat, k: 0.012, up: [0, 0, 1], twist: tw });
  };
  rib([[0.3, 1.75, -0.2], [0.75, 1.9, -0.35], [1.05, 1.55, -0.25], [0.95, 1.1, -0.1], [0.7, 0.85, 0.25]], 'ribbonGreen', 0.085, 2.5);
  rib([[-0.3, 1.75, -0.2], [-0.8, 2.05, -0.3], [-1.05, 1.6, -0.2], [-0.9, 1.15, 0.05], [-0.65, 0.9, 0.3]], 'ribbonGreen', 0.085, -2.5);
  rib([[0.1, 1.2, -0.25], [0.5, 1.0, -0.35], [0.6, 0.6, -0.2], [0.35, 0.3, 0.05]], 'ribbonRed', 0.07, 1.5);
  rib([[-0.1, 1.2, -0.25], [-0.55, 0.95, -0.3], [-0.6, 0.55, -0.1], [-0.4, 0.25, 0.1]], 'ribbonRed', 0.07, -1.5);

  // ---------------- 分块 ----------------
  const headBox = [[-0.38, 1.82, -0.5], [0.38, 2.58, 0.32]];
  const parts = [
    { name: 'body', bmin: [-1.2, -0.25, -0.9], bmax: [1.2, 2.55, 0.85], h: 0.011, exclude: [headBox] },
    { name: 'head', bmin: headBox[0], bmax: headBox[1], h: 0.0038 },
  ];
  return { S, parts, props, height: 2.45, name: K.name };
}
