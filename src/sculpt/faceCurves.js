// 佛面的特征曲线（头部局部单位：眼线 y=0，下颌 y≈-0.58，面朝 +z，x 取绝对值左右对称）。
// 几何塑形（buddhaHead.js）与彩绘着色器（faceDecal.js）共用同一组曲线，保证眉线、眼线、唇线与起伏严丝合缝。
// 每条曲线为 y = c0 + c1·x + c2·x² + c3·x³，由 4 个控制点做拉格朗日插值得到。

function cubicThrough(pts) {
  // 解 4×4 范德蒙方程（高斯消元）
  const A = pts.map(([x, y]) => [1, x, x * x, x * x * x, y]);
  for (let c = 0; c < 4; c++) {
    let p = c;
    for (let r = c + 1; r < 4; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 4; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 5; k++) A[r][k] -= f * A[c][k];
    }
  }
  return A.map((row, i) => row[4] / row[i]);
}

const def = {
  // 眉棱（新月形，眉头接鼻梁、眉尾下垂入鬓）
  brow: [[0.03, 0.068], [0.12, 0.089], [0.23, 0.08], [0.33, 0.034]],
  // 眼缝：内眼角低，外眼角上挑
  slit: [[0.08, -0.006], [0.15, 0.001], [0.22, 0.004], [0.29, 0.02]],
  // 口缝（嘴角微微上扬）
  mouth: [[0.0, -0.302], [0.04, -0.3], [0.08, -0.294], [0.1, -0.289]],
  // 上唇上缘（唇峰在 x≈0.03，人中处微凹）
  lipTop: [[0.0, -0.271], [0.03, -0.265], [0.07, -0.274], [0.1, -0.29]],
  // 下唇下缘
  lipBot: [[0.0, -0.338], [0.04, -0.335], [0.075, -0.322], [0.1, -0.292]],
  // 蝌蚪须
  mustache: [[0.022, -0.248], [0.06, -0.252], [0.1, -0.268], [0.135, -0.293]],
};

export const CURVES = Object.fromEntries(Object.entries(def).map(([k, pts]) => [k, cubicThrough(pts)]));

export const curveY = (c, x) => c[0] + x * (c[1] + x * (c[2] + x * c[3]));
export const curveDY = (c, x) => c[1] + x * (2 * c[2] + x * 3 * c[3]);

// 各曲线的有效区间（x 范围）
export const SPAN = {
  brow: [0.035, 0.325],
  slit: [0.082, 0.288],
  mouth: [0.0, 0.1],
  mustache: [0.022, 0.135],
};
