// 螺发：每一颗都是带螺旋纹的小螺壳，用 InstancedMesh 一次绘制上千颗。
// 由 SDF 发层提供平滑的底面，颗粒本身用精确网格，既省三角面又能做出螺旋纹。
import * as THREE from 'three';

let _geo = null;
// 单位螺壳：底半径 1，高约 1.05，沿 +y 生长；螺旋沟 2.2 圈；底部顶点色压暗模拟缝隙遮蔽
function snailGeometry(seg = 24, rings = 12) {
  if (_geo) return _geo;
  const turns = 2.2;
  const pos = [], col = [], idx = [];
  for (let j = 0; j <= rings; j++) {
    const u = j / rings;                         // 0 底 → 1 顶
    const R = Math.pow(1 - Math.pow(u, 1.7), 0.62); // 圆顶略带尖
    const Y = 1.02 * Math.sin(u * Math.PI * 0.5) * (0.82 + 0.18 * u);
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      // 螺旋沟：沿 (a + 圈数·u) 的相位做内凹
      const ph = ((a / (Math.PI * 2) + turns * u) % 1 + 1) % 1;
      const groove = 1 - 0.3 * Math.pow(Math.max(0, Math.cos((ph - 0.5) * Math.PI * 2)), 3) * Math.min(1, u * 5) * Math.min(1, (1 - u) * 3);
      const r = R * groove;
      pos.push(Math.cos(a) * r, Y, Math.sin(a) * r);
      const ao = 0.45 + 0.55 * Math.min(1, u * 2.2);
      col.push(ao, ao, ao);
    }
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
    const a = j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  _geo = g;
  return g;
}

let _mat = null;
export function curlMaterial() {
  _mat ??= new THREE.MeshStandardMaterial({ color: 0x1f2f74, roughness: 0.6, metalness: 0.0, vertexColors: true });
  return _mat;
}

/** pr: { pts:[x,y,z…], nrm:[x,y,z…], r, h } —— 颗粒中心落在发层表面，沿法线生长 */
export function buildCurls(pr) {
  const n = pr.pts.length / 3;
  const im = new THREE.InstancedMesh(snailGeometry(), curlMaterial(), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), d = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), twist = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    d.fromArray(pr.nrm, i * 3);
    q.setFromUnitVectors(up, d);
    twist.setFromAxisAngle(up, (i * 2.399) % (Math.PI * 2)); // 每颗的螺旋起点不同
    q.multiply(twist);
    p.fromArray(pr.pts, i * 3).addScaledVector(d, -pr.r * 0.32);
    s.set(pr.r, pr.r * (pr.h ?? 0.9), pr.r);
    m.compose(p, q, s);
    im.setMatrixAt(i, m);
  }
  im.castShadow = true; im.receiveShadow = true;
  im.computeBoundingSphere();
  return im;
}
