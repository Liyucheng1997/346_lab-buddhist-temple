// 莲花座（须弥座 + 覆莲 + 仰莲）与火焰背光。单位与造像一致（坐像底宽≈1.1）。
import * as THREE from 'three';
import { M } from '../core/materials.js';
import { petalGeometry } from '../sculpt/props.js';

function lathe(profile, seg = 64) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}
function mesh(g, m) { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o; }

// 朱红莲瓣 + 描金叶脉（Canvas 程序贴图；金线同时写入金属度贴图）
let _petalMat = null;
function redPetalMaterial() {
  if (_petalMat) return _petalMat;
  const W = 256, H = 512;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const col = mk(), met = mk();
  const g = col.getContext('2d'), m = met.getContext('2d');
  const grd = g.createLinearGradient(0, H, 0, 0);
  grd.addColorStop(0, '#5e1410'); grd.addColorStop(0.35, '#8e231b'); grd.addColorStop(0.8, '#a8352a'); grd.addColorStop(1, '#b8473a');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
  const line = (ctx, w, color) => { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; };
  // 叶脉：自瓣根中心放射到瓣尖附近
  for (const ctx of [g, m]) {
    line(ctx, 3.2, ctx === g ? '#e9be62' : '#fff');
    for (let i = -7; i <= 7; i++) {
      const t = i / 7.5;
      ctx.beginPath();
      ctx.moveTo(W / 2 + t * 18, H - 4);
      ctx.quadraticCurveTo(W / 2 + t * W * 0.5, H * 0.45, W / 2 + t * W * 0.28 * (1 - Math.abs(t) * 0.3), H * (0.08 + 0.12 * Math.abs(t) ** 1.6));
      ctx.stroke();
    }
    // 描金边
    line(ctx, 9, ctx === g ? '#f0c86a' : '#fff');
    ctx.strokeRect(0, 0, W, H);
  }
  const map = new THREE.CanvasTexture(col); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const metalnessMap = new THREE.CanvasTexture(met);
  _petalMat = new THREE.MeshStandardMaterial({ map, metalnessMap, metalness: 1, roughness: 0.42, side: THREE.DoubleSide });
  return _petalMat;
}

/**
 * 莲花座。返回 Group，顶面在 y = top（返回值 group.userData.top）。
 * r: 座面半径（造像盘坐半宽 ≈ 0.56 → r ≈ 0.6）
 */
export function lotusThrone(r = 0.62, opt = {}) {
  const g = new THREE.Group();
  const red = M.lacquerRed(), gold = M.gold();
  const petalGold = opt.petalMat || redPetalMaterial();
  const petalInner = petalGold;
  const seg = 96;

  // ---- 须弥座（束腰） ----
  const R0 = r * 1.3;
  const base = lathe([
    [0, 0], [R0, 0], [R0, 0.05], [R0 * 0.96, 0.06], [R0 * 0.96, 0.1],
    [R0 * 0.86, 0.17], [R0 * 0.8, 0.19], [R0 * 0.8, 0.3], [R0 * 0.86, 0.32], [R0 * 0.96, 0.4], [R0 * 0.98, 0.42], [R0 * 0.98, 0.46], [0, 0.46],
  ], seg);
  g.add(mesh(base, red));
  // 金色线脚
  for (const [rr, y, h] of [[R0 * 0.97, 0.055, 0.012], [R0 * 0.81, 0.19, 0.01], [R0 * 0.81, 0.3, 0.01], [R0 * 0.985, 0.42, 0.012]]) {
    const t = mesh(new THREE.TorusGeometry(rr, h, 8, seg), gold);
    t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t);
  }
  // 束腰上的壶门装饰（小方框）
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const box = mesh(new THREE.BoxGeometry(R0 * 0.26, 0.07, 0.012), gold);
    box.position.set(Math.sin(a) * R0 * 0.8, 0.245, Math.cos(a) * R0 * 0.8);
    box.rotation.y = a;
    g.add(box);
  }

  // ---- 覆莲（向下） ----
  const y0 = 0.46;
  const down = petalGeometry(0.2, 0.09, 0.03, 0.02);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const p = mesh(down, petalGold);
    p.position.set(Math.sin(a) * R0 * 0.78, y0 + 0.18, Math.cos(a) * R0 * 0.78);
    p.rotation.order = 'YXZ'; p.rotation.y = a; p.rotation.x = Math.PI - 0.55;
    g.add(p);
  }
  g.add(mesh(lathe([[0, y0], [R0 * 0.95, y0], [R0 * 0.75, y0 + 0.2], [0, y0 + 0.2]], seg), red));

  // ---- 仰莲（三层） ----
  const y1 = y0 + 0.2;
  g.add(mesh(lathe([[0, y1], [R0 * 0.75, y1], [r * 0.8, y1 + 0.2], [r * 0.82, y1 + 0.3], [0, y1 + 0.3]], seg), M.paint(0x7a2b22, 0.6)));
  const layers = [[r * 1.0, 0.72, 20, 0.37, 0.125], [r * 0.9, 0.52, 18, 0.34, 0.12], [r * 0.8, 0.36, 16, 0.31, 0.115]];
  layers.forEach(([rr, tilt, cnt, len, w], li) => {
    const pg = petalGeometry(len, w, 0.06, 0.05);
    for (let i = 0; i < cnt; i++) {
      const a = ((i + li * 0.5) / cnt) * Math.PI * 2;
      const p = mesh(pg, li === 2 ? petalInner : petalGold);
      p.position.set(Math.sin(a) * rr, y1 + 0.01 + li * 0.015, Math.cos(a) * rr);
      p.rotation.order = "YXZ"; p.rotation.y = a; p.rotation.x = tilt;
      g.add(p);
    }
  });
  const top = y1 + 0.3;
  g.add(mesh(lathe([[0, top - 0.02], [r, top - 0.02], [r, top], [0, top]], seg), gold));
  g.userData.top = top;
  return g;
}

/**
 * 火焰纹舟形背光（身光 + 头光）。中心在造像背后，宽 w、高 h。
 */
export function mandorla(w = 1.7, h = 2.4, opt = {}) {
  const g = new THREE.Group();
  const gold = M.gold();
  const N = 360;
  const outline = (rx, ry, flame) => {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      // 舟形：顶部收尖
      const yy = Math.sin(t), xx = Math.cos(t) * (1 - 0.28 * Math.max(yy, 0) ** 2);
      let f = 1;
      if (flame) {
        const u = t * 13;
        const saw = ((u / (Math.PI * 2)) % 1 + 1) % 1;
        f = 1 + flame * Math.pow(Math.max(0, Math.sin(saw * Math.PI)), 1.6) * (0.6 + 0.4 * Math.max(yy, -0.2));
      }
      pts.push(new THREE.Vector2(xx * rx * f, yy * ry * f));
    }
    return pts;
  };
  // 外圈火焰
  const flameShape = new THREE.Shape(outline(w / 2, h / 2, 0.11));
  const inner = new THREE.Path(outline(w / 2 * 0.86, h / 2 * 0.88, 0));
  flameShape.holes.push(inner);
  const flameMesh = mesh(new THREE.ExtrudeGeometry(flameShape, { depth: 0.035, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }), gold);
  g.add(flameMesh);
  // 内板（朱漆）+ 金色放射线
  const plate = mesh(new THREE.ExtrudeGeometry(new THREE.Shape(outline(w / 2 * 0.87, h / 2 * 0.89, 0)), { depth: 0.02, bevelEnabled: false }), M.lacquerRed());
  plate.position.z = -0.01;
  g.add(plate);
  const rays = new THREE.Group();
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const len = h / 2 * 0.84 * (1 - 0.1 * Math.abs(Math.cos(a)));
    const ray = mesh(new THREE.BoxGeometry(0.012, len, 0.012), gold);
    ray.position.set(Math.cos(a) * len / 2 * 0.98, Math.sin(a) * len / 2 * 0.98, 0.025);
    ray.rotation.z = a - Math.PI / 2;
    ray.scale.x = 1 - 0.4 * (i % 2);
    rays.add(ray);
  }
  rays.position.y = -h * 0.08;
  g.add(rays);
  // 内圈金线
  const ring = mesh(new THREE.ExtrudeGeometry((() => { const s = new THREE.Shape(outline(w / 2 * 0.7, h / 2 * 0.72, 0)); s.holes.push(new THREE.Path(outline(w / 2 * 0.68, h / 2 * 0.7, 0))); return s; })(), { depth: 0.03, bevelEnabled: false }), gold);
  g.add(ring);
  // 头光：双重圆环 + 莲瓣纹
  const hy = opt.headY ?? h * 0.22, hr = opt.headR ?? w * 0.21;
  const halo = mesh(new THREE.CylinderGeometry(hr, hr, 0.025, 64), M.paint(0x2f5a48, 0.5));
  halo.rotation.x = Math.PI / 2; halo.position.set(0, hy, 0.045); g.add(halo);
  for (const [rr, t] of [[hr, 0.02], [hr * 0.78, 0.012]]) {
    const tor = mesh(new THREE.TorusGeometry(rr, t, 10, 96), gold);
    tor.position.set(0, hy, 0.06); g.add(tor);
  }
  const pg = petalGeometry(hr * 0.42, hr * 0.17, 0.015, 0);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const p = mesh(pg, gold);
    p.position.set(Math.cos(a) * hr * 0.38, hy + Math.sin(a) * hr * 0.38, 0.06);
    p.rotation.z = a - Math.PI / 2;
    g.add(p);
  }
  return g;
}
