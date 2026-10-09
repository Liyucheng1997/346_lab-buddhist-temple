// 佛像背光（参考金铜佛常见样式）：莲瓣头光 + 法轮带 + 联珠短瓣纹 + 身光圆环 + 一周卷舌火焰（镂空）。
// 单位与坐佛一致、原点在座面中心，因此只需与造像同缩放、同位置即可对齐头部。
import * as THREE from 'three';
import { M, mat } from '../core/materials.js';
import { petalGeometry } from '../sculpt/props.js';

function mesh(g, m) { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o; }

let _flameGeo = null;
// 单个火焰舌：底宽约 0.7、高 1，顶端向一侧卷曲，内有两个水滴形镂空
function flameTongueGeometry() {
  if (_flameGeo) return _flameGeo;
  const s = new THREE.Shape();
  s.moveTo(-0.34, 0);
  s.bezierCurveTo(-0.5, 0.32, -0.12, 0.5, -0.2, 0.74);
  s.bezierCurveTo(-0.25, 0.9, -0.05, 1.06, 0.14, 1.0);
  s.bezierCurveTo(0.0, 0.96, -0.04, 0.84, 0.06, 0.72);
  s.bezierCurveTo(0.2, 0.56, 0.4, 0.4, 0.34, 0);
  s.lineTo(-0.34, 0);
  const drop = (cx, cy, rx, ry, tilt) => {
    const p = new THREE.Path();
    const n = 18;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2;
      const k = 1 - 0.55 * Math.max(0, Math.sin(t)); // 上尖下圆
      const x = Math.cos(t) * rx * k, y = Math.sin(t) * ry;
      const xr = x * Math.cos(tilt) - y * Math.sin(tilt), yr = x * Math.sin(tilt) + y * Math.cos(tilt);
      if (i === 0) p.moveTo(cx + xr, cy + yr); else p.lineTo(cx + xr, cy + yr);
    }
    return p;
  };
  s.holes.push(drop(0.0, 0.3, 0.12, 0.17, 0.15));
  s.holes.push(drop(-0.06, 0.62, 0.06, 0.1, 0.35));
  _flameGeo = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.035, bevelSegments: 3, curveSegments: 14 });
  _flameGeo.translate(0, 0, -0.04);
  return _flameGeo;
}

function dharmaWheel(r, m) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.TorusGeometry(r, r * 0.13, 8, 32), m));
  const hub = mesh(new THREE.CylinderGeometry(r * 0.28, r * 0.28, r * 0.25, 16), m); hub.rotation.x = Math.PI / 2; g.add(hub);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const sp = mesh(new THREE.CylinderGeometry(r * 0.07, r * 0.07, r * 0.8, 6), m);
    sp.position.set(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, 0); sp.rotation.z = a - Math.PI / 2; g.add(sp);
    const knob = mesh(new THREE.SphereGeometry(r * 0.14, 10, 8), m);
    knob.position.set(Math.cos(a + Math.PI / 8) * r * 1.12, Math.sin(a + Math.PI / 8) * r * 1.12, 0); g.add(knob);
  }
  return g;
}

// 一圈环带：平带 + 内外缘线 + 联珠纹 + 放射短瓣纹 + 法轮；返回环带外半径
function haloBand(g, c, r0, r1, m, opt = {}) {
  const band = mesh(new THREE.RingGeometry(r0, r1, 128, 1), m); band.position.set(c[0], c[1], c[2]); g.add(band);
  const back = band.clone(); back.rotation.y = Math.PI; back.position.z -= 0.004; g.add(back);
  for (const rr of [r0, r1]) {
    const t = mesh(new THREE.TorusGeometry(rr, 0.0055, 8, 160), m); t.position.set(c[0], c[1], c[2] + 0.002); g.add(t);
  }
  const m4 = new THREE.Matrix4();
  const rb = r1 + 0.014, nb = Math.round((Math.PI * 2 * rb) / 0.017);
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0068, 10, 8), m, nb);
  for (let i = 0; i < nb; i++) { const a = (i / nb) * Math.PI * 2; m4.makeTranslation(c[0] + Math.cos(a) * rb, c[1] + Math.sin(a) * rb, c[2] + 0.004); beads.setMatrixAt(i, m4); }
  beads.castShadow = true; g.add(beads);
  const rg = rb + 0.026, ng = Math.round((Math.PI * 2 * rg) / 0.016);
  const gad = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.0055, 0.018, 4, 8), m, ng);
  const q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 0.6), p = new THREE.Vector3(), z = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < ng; i++) {
    const a = (i / ng) * Math.PI * 2;
    q.setFromAxisAngle(z, a - Math.PI / 2);
    p.set(c[0] + Math.cos(a) * rg, c[1] + Math.sin(a) * rg, c[2] + 0.003);
    m4.compose(p, q, s1); gad.setMatrixAt(i, m4);
  }
  gad.castShadow = true; g.add(gad);
  const outer = mesh(new THREE.TorusGeometry(rg + 0.017, 0.006, 8, 180), m); outer.position.set(c[0], c[1], c[2] + 0.002); g.add(outer);
  if (opt.wheels) {
    for (let i = 0; i < opt.wheels; i++) {
      const a = (opt.wheelStart ?? Math.PI / 2) + (i / opt.wheels) * Math.PI * 2;
      if (opt.skip && opt.skip(a)) continue;
      const w = dharmaWheel(opt.wheelR ?? 0.02, m);
      w.position.set(c[0] + Math.cos(a) * (r0 + r1) / 2, c[1] + Math.sin(a) * (r0 + r1) / 2, c[2] + 0.008);
      g.add(w);
    }
  }
  return rg + 0.023;
}

/** opt.headY：头光中心高度（坐佛局部单位，默认 0.95）；opt.bodyY：身光中心 */
export function buddhaMandorla(opt = {}) {
  const g = new THREE.Group();
  const gold = M.gold();
  const goldDeep = mat('goldDeep', () => new THREE.MeshStandardMaterial({ color: 0xd08a3c, metalness: 1, roughness: 0.36 }));
  const hc = [0, opt.headY ?? 0.95, -0.235];
  const bc = [0, opt.bodyY ?? 0.5, -0.3];

  // ---- 头光：两重莲瓣 + 法轮带 + 联珠短瓣 ----
  const disc = mesh(new THREE.CircleGeometry(0.2, 96), goldDeep); disc.position.set(hc[0], hc[1], hc[2] - 0.006); g.add(disc);
  const pBig = petalGeometry(0.15, 0.062, 0.02, 0.012, 10), pSmall = petalGeometry(0.11, 0.05, 0.018, 0.01, 10);
  for (let i = 0; i < 12; i++) {
    for (const [pg, off, r0, dz] of [[pBig, 0, 0.055, 0.012], [pSmall, 0.5, 0.05, 0.026]]) {
      const a = ((i + off) / 12) * Math.PI * 2;
      const p = mesh(pg, gold);
      p.position.set(hc[0] + Math.cos(a) * r0, hc[1] + Math.sin(a) * r0, hc[2] + dz);
      p.rotation.set(0, 0, a - Math.PI / 2);
      g.add(p);
    }
  }
  const boss = mesh(new THREE.SphereGeometry(0.055, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), gold);
  boss.rotation.x = Math.PI / 2; boss.scale.set(1, 1, 0.4); boss.position.set(hc[0], hc[1], hc[2] + 0.02); g.add(boss);
  const headR = haloBand(g, hc, 0.205, 0.262, gold, { wheels: 8, wheelR: 0.019 });

  // ---- 身光：大圆环（上部被头光遮住） ----
  const bodyR = haloBand(g, bc, 0.53, 0.556, gold, { wheels: 10, wheelR: 0.014, wheelStart: Math.PI / 2 + Math.PI / 10, skip: (a) => Math.sin(a) > 0.55 });

  // ---- 火焰：沿两圆并集的外轮廓排布，舌尖向外并向上卷 ----
  const fg = flameTongueGeometry();
  const N = 400, o = [0, 0.66];
  const outline = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
    const hit = (c, R) => { const ox = o[0] - c[0], oy = o[1] - c[1]; const b = ox * dx + oy * dy; const d2 = b * b - (ox * ox + oy * oy - R * R); return d2 < 0 ? -1 : -b + Math.sqrt(d2); };
    const t = Math.max(hit(hc, headR + 0.008), hit(bc, bodyR + 0.008));
    outline.push([o[0] + dx * t, o[1] + dy * t]);
  }
  const cum = [0];
  for (let i = 1; i <= N; i++) { const a = outline[i - 1], b = outline[i % N]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const L = cum[N];
  const at = (s) => {
    s = ((s % L) + L) % L;
    let i = 0; while (cum[i + 1] < s) i++;
    const t = (s - cum[i]) / (cum[i + 1] - cum[i]), a = outline[i], b = outline[(i + 1) % N];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const rows = [
    { size: 0.19, out: 0.0, m: goldDeep, dz: -0.012, phase: 0.5 },
    { size: 0.25, out: 0.035, m: gold, dz: 0.0, phase: 0 },
  ];
  for (const row of rows) {
    const n = Math.floor(L / 0.1);
    for (let i = 0; i < n; i++) {
      const s = ((i + row.phase) / n) * L;
      const p = at(s), p2 = at(s + 0.01);
      if (p[1] < 0.08) continue; // 座面以下不做火焰
      let nx = p2[1] - p[1], ny = -(p2[0] - p[0]); const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
      if (nx * p[0] + ny * (p[1] - o[1]) < 0) { nx = -nx; ny = -ny; }
      // 火焰向上飘：外法线与竖直方向混合，越靠上越竖直
      const lift = 0.45 + 0.35 * Math.max(0, ny);
      let fx = nx * (1 - lift), fy = ny * (1 - lift) + lift; const fl = Math.hypot(fx, fy); fx /= fl; fy /= fl;
      const k = row.size * (0.85 + 0.3 * Math.max(0, ny)) * (1 + 0.12 * Math.sin(i * 2.7));
      const f = mesh(fg, row.m);
      f.position.set(p[0] + nx * row.out * 0.5 - fx * k * 0.25, p[1] + ny * row.out * 0.5 - fy * k * 0.25, bc[2] + row.dz);
      f.rotation.z = Math.atan2(fy, fx) - Math.PI / 2;
      f.scale.set(k * (p[0] < 0 ? -1 : 1), k, 0.12);
      g.add(f);
    }
  }
  // 顶端的宝珠火焰
  const top = outline.reduce((m, q) => (q[1] > m[1] ? q : m), outline[0]);
  const crown = mesh(fg, gold); crown.position.set(0, top[1] + 0.02, bc[2] + 0.01); crown.scale.set(0.3, 0.36, 0.14); g.add(crown);
  const pearl = mesh(new THREE.SphereGeometry(0.032, 20, 14), gold); pearl.position.set(0, top[1] + 0.07, bc[2] + 0.04); g.add(pearl);
  g.userData.headCenter = hc;
  return g;
}
