// 造像持物（法器）：用精确的几何体建模，保证边缘锐利
import * as THREE from 'three';
import { M } from '../core/materials.js';

function lathe(profile, seg = 48) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}

function mesh(g, m) {
  const o = new THREE.Mesh(g, m);
  o.castShadow = true; o.receiveShadow = true;
  return o;
}

// 莲瓣（可复用）：参数化曲面，瓣尖上翘
export function petalGeometry(len = 1, width = 0.45, cup = 0.25, tipCurl = 0.25, seg = 10) {
  const g = new THREE.BufferGeometry();
  const pos = [], uv = [], idx = [];
  const nu = seg, nv = seg + 4;
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    // 宽度轮廓：根部窄，中部宽，尖端收为一点（桃形）
    const w = width * Math.pow(Math.sin(Math.PI * Math.min(v * 1.05, 1)), 0.75) * (1 - 0.15 * v);
    for (let i = 0; i <= nu; i++) {
      const u = i / nu * 2 - 1;
      const x = u * w;
      const y = v * len;
      // 杯状弯曲 + 瓣尖外翻
      const z = cup * (1 - u * u) * Math.sin(Math.PI * v) * 0.5 + tipCurl * Math.pow(v, 3) - cup * 0.2 * u * u;
      pos.push(x, y, z);
      uv.push(i / nu, v);
    }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const builders = {
  // 锡杖
  staff(pr) {
    const g = new THREE.Group();
    const L = pr.len || 1.6;
    const pole = mesh(new THREE.CylinderGeometry(0.014, 0.016, L, 10), M.wood()); pole.position.y = L * 0.3; g.add(pole);
    const top = mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 24), M.gold()); top.position.y = L * 0.8 + 0.06; g.add(top);
    for (let i = 0; i < 6; i++) { const ring = mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 16), M.gold()); const a = (i / 6) * Math.PI * 2; ring.position.set(Math.cos(a) * 0.06, L * 0.8 + 0.03, Math.sin(a) * 0.06); g.add(ring); }
    const fin = mesh(new THREE.ConeGeometry(0.02, 0.08, 10), M.gold()); fin.position.y = L * 0.8 + 0.15; g.add(fin);
    return g;
  },
  // 蒲扇
  fan() {
    const g = new THREE.Group();
    const shape = new THREE.Shape();
    shape.absellipse(0, 0.2, 0.17, 0.2, 0, Math.PI * 2);
    const leaf = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false }), M.paint(0xb9a66b, 0.8)); g.add(leaf);
    for (let i = -3; i <= 3; i++) { const v = mesh(new THREE.BoxGeometry(0.004, 0.36, 0.012), M.paint(0x8a7a48, 0.8)); v.position.set(i * 0.045, 0.2, 0); v.rotation.z = -i * 0.12; g.add(v); }
    const handle = mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.25, 8), M.wood()); handle.position.y = -0.12; g.add(handle);
    return g;
  },
  // 经卷
  scroll() {
    const g = new THREE.Group();
    const roll = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 16), M.paint(0xe8dcc0, 0.7)); g.add(roll);
    for (const y of [-0.14, 0.14]) { const k = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), M.gold()); k.position.y = y; g.add(k); }
    return g;
  },
  // 小塔（托塔罗汉）
  pagoda() {
    const g = new THREE.Group();
    const gold = M.gold();
    g.add(mesh(new THREE.BoxGeometry(0.1, 0.02, 0.1), gold));
    for (let i = 0; i < 5; i++) {
      const s = 1 - i * 0.14;
      const body = mesh(new THREE.BoxGeometry(0.06 * s, 0.035, 0.06 * s), gold); body.position.y = 0.03 + i * 0.05; g.add(body);
      const roof = mesh(new THREE.ConeGeometry(0.06 * s, 0.02, 4), M.paint(0x3a5a3a, 0.5)); roof.rotation.y = Math.PI / 4; roof.position.y = 0.056 + i * 0.05; g.add(roof);
    }
    const tip = mesh(new THREE.ConeGeometry(0.01, 0.08, 8), gold); tip.position.y = 0.32; g.add(tip);
    return g;
  },
  // 净瓶
  vase() {
    const g = new THREE.Group();
    g.add(mesh(lathe([[0, 0], [0.04, 0], [0.055, 0.03], [0.05, 0.08], [0.02, 0.11], [0.016, 0.17], [0.026, 0.19], [0.02, 0.2], [0, 0.2]], 32), M.pearl()));
    return g;
  },
  // 杨柳枝
  willow() {
    const g = new THREE.Group();
    const stem = mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.3, 6), M.paint(0x4a6a2a, 0.7)); stem.position.y = 0.15; g.add(stem);
    const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(0.012, 0.03, 0, 0.06); leaf.quadraticCurveTo(-0.012, 0.03, 0, 0);
    const lg = new THREE.ShapeGeometry(leaf);
    for (let i = 0; i < 9; i++) {
      const l = new THREE.Mesh(lg, M.paint(0x5f8a3a, 0.7)); l.material.side = THREE.DoubleSide;
      l.position.set((i % 2 ? 1 : -1) * 0.01, 0.1 + i * 0.025, 0); l.rotation.z = (i % 2 ? -1 : 1) * 1.1 - 0.2 * i * 0.1; l.rotation.y = i * 0.6;
      g.add(l);
    }
    return g;
  },

  // 宝剑：剑身（菱形截面）、剑格、剑柄、剑首
  sword(pr) {
    const g = new THREE.Group();
    const L = pr.len || 1;
    const blade = new THREE.BufferGeometry();
    const w = 0.07 * L, t = 0.01 * L, bl = L * 0.72;
    const v = [];
    const sec = [[w, 0], [0, t], [-w, 0], [0, -t]];
    for (let i = 0; i < 4; i++) {
      const a = sec[i], b = sec[(i + 1) % 4];
      v.push(a[0], 0, a[1], b[0], 0, b[1], b[0] * 0.08, bl, b[1] * 0.3);
      v.push(a[0], 0, a[1], b[0] * 0.08, bl, b[1] * 0.3, a[0] * 0.08, bl, a[1] * 0.3);
    }
    v.push(0, bl, 0, 0.004, bl + 0.05 * L, 0, -0.004, bl + 0.05 * L, 0);
    blade.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    blade.computeVertexNormals();
    g.add(mesh(blade, M.steel()));
    const guard = mesh(new THREE.BoxGeometry(0.22 * L, 0.035 * L, 0.05 * L), M.gold()); guard.position.y = -0.02 * L; g.add(guard);
    const grip = mesh(new THREE.CylinderGeometry(0.024 * L, 0.026 * L, 0.2 * L, 12), M.paint(0x2a1a10, 0.6)); grip.position.y = -0.13 * L; g.add(grip);
    const pommel = mesh(new THREE.SphereGeometry(0.03 * L, 14, 10), M.gold()); pommel.position.y = -0.24 * L; g.add(pommel);
    // 剑穗
    const tassel = mesh(new THREE.ConeGeometry(0.03 * L, 0.18 * L, 10), M.paint(0xb3302a, 0.8)); tassel.position.y = -0.36 * L; g.add(tassel);
    g.rotateOnAxis(new THREE.Vector3(1, 0, 0), 0); // 占位：方向由 dir 决定
    return g;
  },
  scabbard(pr) {
    const g = new THREE.Group();
    const L = pr.len || 1;
    const body = mesh(new THREE.CylinderGeometry(0.03 * L, 0.022 * L, 0.75 * L, 14), M.paint(0x1e1c2a, 0.35)); body.scale.x = 1.5; body.position.y = -0.37 * L; g.add(body);
    for (const y of [-0.05, -0.3, -0.6]) { const r = mesh(new THREE.TorusGeometry(0.032 * L, 0.006 * L, 8, 24), M.gold()); r.scale.x = 1.5; r.rotation.x = Math.PI / 2; r.position.y = y * L; g.add(r); }
    const tip = mesh(new THREE.SphereGeometry(0.03 * L, 12, 8), M.gold()); tip.scale.set(1.5, 1, 1); tip.position.y = -0.75 * L; g.add(tip);
    return g;
  },
  // 琵琶：梨形音箱 + 琴颈 + 四弦四轸
  pipa() {
    const g = new THREE.Group();
    const shape = new THREE.Shape();
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const y = t * 0.62;
      const w = 0.2 * Math.pow(Math.sin(Math.PI * Math.min(t * 1.08, 1)), 0.6) * (1 - 0.35 * t);
      pts.push(new THREE.Vector2(w, y));
    }
    for (let i = pts.length - 1; i >= 0; i--) pts.push(new THREE.Vector2(-pts[i].x, pts[i].y));
    shape.setFromPoints(pts);
    const body = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.02, bevelSegments: 4 }), M.wood());
    body.position.z = -0.05; g.add(body);
    const face = mesh(new THREE.ShapeGeometry(shape), M.paint(0xd9b98a, 0.6)); face.position.z = 0.045; face.scale.set(0.93, 0.95, 1); face.position.y = 0.01; g.add(face);
    const neck = mesh(new THREE.BoxGeometry(0.07, 0.3, 0.04), M.wood()); neck.position.set(0, 0.74, 0.0); g.add(neck);
    const headp = mesh(new THREE.BoxGeometry(0.09, 0.14, 0.05), M.wood()); headp.position.set(0, 0.92, -0.03); headp.rotation.x = -0.6; g.add(headp);
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 0.028;
      const peg = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 8), M.paint(0x3a2412, 0.5)); peg.rotation.z = Math.PI / 2; peg.position.set(i < 2 ? -0.06 : 0.06, 0.86 + (i % 2) * 0.05, -0.03); g.add(peg);
      const str = mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.84, 6), M.paint(0xe8e0c8, 0.3)); str.position.set(x, 0.46, 0.06); g.add(str);
    }
    for (let i = 0; i < 6; i++) { const fret = mesh(new THREE.BoxGeometry(0.11, 0.012, 0.012), M.paint(0xf0ead6, 0.4)); fret.position.set(0, 0.54 - i * 0.06, 0.065); g.add(fret); }
    const hole = mesh(new THREE.CircleGeometry(0.025, 16), M.paint(0x1a0f08, 0.9)); hole.position.set(0, 0.25, 0.052); g.add(hole);
    return g;
  },
  // 宝伞（合拢竖立）：伞杆、伞骨收拢的伞布、伞顶宝珠
  umbrella(pr) {
    const g = new THREE.Group();
    const L = pr.len || 1.3;
    const pole = mesh(new THREE.CylinderGeometry(0.018, 0.02, L, 12), M.lacquerRed()); pole.position.y = L * 0.35; g.add(pole);
    const canopy = mesh(lathe([[0, L * 0.3], [0.045, L * 0.33], [0.07, L * 0.5], [0.075, L * 0.7], [0.05, L * 0.84], [0, L * 0.86]], 24), M.paint(0xc8a24a, 0.6));
    g.add(canopy);
    for (let i = 0; i < 12; i++) {
      const rib = mesh(new THREE.CylinderGeometry(0.008, 0.008, L * 0.54, 6), M.paint(0x8b2d1f, 0.6));
      const a = (i / 12) * Math.PI * 2;
      rib.position.set(Math.cos(a) * 0.07, L * 0.58, Math.sin(a) * 0.07);
      g.add(rib);
    }
    const knob = mesh(new THREE.SphereGeometry(0.04, 16, 12), M.gold()); knob.position.y = L * 0.9; g.add(knob);
    const ring = mesh(new THREE.TorusGeometry(0.075, 0.012, 8, 24), M.gold()); ring.rotation.x = Math.PI / 2; ring.position.y = L * 0.33; g.add(ring);
    return g;
  },
  // 金刚杵（三钴杵）
  vajra(pr) {
    const g = new THREE.Group();
    const L = pr.len || 0.9;
    const gold = M.gold();
    const grip = mesh(new THREE.CylinderGeometry(0.035 * L, 0.035 * L, 0.32 * L, 16), gold); g.add(grip);
    const ball = mesh(new THREE.SphereGeometry(0.06 * L, 18, 14), gold); g.add(ball);
    for (const dir of [1, -1]) {
      const lotus = mesh(lathe([[0, 0], [0.09 * L, 0.03 * L], [0.1 * L, 0.06 * L], [0.07 * L, 0.1 * L], [0.03 * L, 0.11 * L]], 20), gold);
      lotus.position.y = dir * 0.16 * L; lotus.scale.y = dir; g.add(lotus);
      const spike = mesh(new THREE.ConeGeometry(0.03 * L, 0.3 * L, 12), gold); spike.position.y = dir * 0.42 * L; spike.scale.y = dir; g.add(spike);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const prong = new THREE.Mesh(new THREE.TorusGeometry(0.12 * L, 0.018 * L, 8, 24, Math.PI * 0.75), gold);
        prong.castShadow = true;
        prong.position.set(0, dir * 0.27 * L, 0);
        prong.rotation.set(0, a, dir > 0 ? -Math.PI * 0.12 : Math.PI + Math.PI * 0.12);
        prong.rotation.order = 'YXZ';
        g.add(prong);
      }
    }
    return g;
  },

  // 药师佛的药钵
  bowl() {
    const g = new THREE.Group();
    const b = mesh(lathe([[0, -0.035], [0.05, -0.034], [0.075, -0.015], [0.08, 0.01], [0.072, 0.03], [0.068, 0.03], [0.07, 0.01], [0.0, 0.0]]), M.darkBronze());
    g.add(b);
    const lid = mesh(lathe([[0, 0.065], [0.02, 0.062], [0.05, 0.045], [0.068, 0.03], [0.0, 0.03]]), M.darkBronze());
    g.add(lid);
    const knob = mesh(new THREE.SphereGeometry(0.012, 16, 12), M.gold());
    knob.position.y = 0.07;
    g.add(knob);
    return g;
  },
  // 阿弥陀佛手中的莲台
  lotusBud() {
    const g = new THREE.Group();
    const pg = petalGeometry(0.07, 0.03, 0.02, 0.012);
    for (let layer = 0; layer < 3; layer++) {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const p = mesh(pg, layer === 2 ? M.paint(0xf0c8c8, 0.5) : M.gold());
        const a = (i + layer * 0.5) / n * Math.PI * 2;
        p.position.set(Math.sin(a) * 0.01, 0.01 + layer * 0.006, Math.cos(a) * 0.01);
        p.rotation.set(0, a, 0, 'YXZ');
        p.rotateX(-(0.9 - layer * 0.3));
        g.add(p);
      }
    }
    return g;
  },
};

export function buildProp(pr) {
  const b = builders[pr.type];
  if (!b) { console.warn('未知持物', pr.type); return null; }
  const o = b(pr);
  if (pr.pos) o.position.fromArray(pr.pos);
  if (pr.rot) o.rotation.fromArray(pr.rot);
  if (pr.dir) { o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().fromArray(pr.dir).normalize()); }
  if (pr.scale) o.scale.setScalar(pr.scale);
  return o;
}

export { builders as propBuilders };
