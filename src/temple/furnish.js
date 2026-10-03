// 殿内陈设：按伽蓝规制在各殿安放造像、佛坛、供桌、灯烛。
import * as THREE from 'three';
import { loadStatue } from '../sculpt/load.js';
import { lotusThrone, mandorla } from './throne.js';
import { M } from '../core/materials.js';

// 真实尺寸（米）：造像局部高度 → 目标高度
const SIZES = {
  maitreya: 2.3, weituo: 3.0, king: 4.4, buddha: 3.3, monk: 2.3, guanyin: 3.6, arhat: 1.6,
};

function interiorOf(hall) {
  // hall.userData 中的范围为殿堂局部坐标（殿中心为原点），这里换算为世界坐标
  const u = hall?.userData || {};
  const box = u.interior || {};
  const z0 = hall?.z ?? 0;
  const xMin = box.xMin ?? -10, xMax = box.xMax ?? 10, zMin = (box.zMin ?? -6) + z0, zMax = (box.zMax ?? 6) + z0;
  return { floorY: u.floorY ?? 0, xMin, xMax, zMin, zMax, cx: (xMin + xMax) / 2, cz: (zMin + zMax) / 2 };
}

// 佛坛（须弥座式高台）
function altarPlatform(w, d, h) {
  const g = new THREE.Group();
  const red = M.lacquerRed(), gold = M.gold();
  const steps = [[1, 0.25], [0.93, 0.15], [0.9, 0.35], [0.95, 0.15], [1, 0.1]];
  let y = 0;
  for (const [s, hf] of steps) {
    const hh = h * hf;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w * s, hh, d * s), red);
    m.position.y = y + hh / 2; m.castShadow = m.receiveShadow = true; g.add(m);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w * s + 0.04, 0.03, d * s + 0.04), gold);
    trim.position.y = y + hh; g.add(trim);
    y += hh;
  }
  g.userData.top = y;
  return g;
}

// 蜡烛与油灯：暖光 + 自发光火苗
function candle(x, y, z, scene, animators, big = false) {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(big ? 0.05 : 0.025, big ? 0.06 : 0.03, big ? 0.8 : 0.3, 10), M.lacquerRed());
  stick.position.y = (big ? 0.4 : 0.15); g.add(stick);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.06 : 0.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd080 }));
  flame.scale.y = 1.8; flame.position.y = big ? 0.86 : 0.34; g.add(flame);
  const light = new THREE.PointLight(0xff9a3a, big ? 18 : 6, big ? 14 : 8, 2);
  light.position.copy(flame.position); g.add(light);
  g.position.set(x, y, z);
  scene.add(g);
  animators.push((dt, t) => { const f = 1 + 0.15 * Math.sin(t * 13 + x * 7) * Math.sin(t * 7 + z * 3); light.intensity = (big ? 18 : 6) * f; flame.scale.set(f, 1.8 * f, f); });
  return g;
}

export async function furnishTemple(scene, temple, { onProgress, onStatue, addView }) {
  const halls = temple.halls || {};
  const animators = temple.animators ||= [];
  const jobs = [];
  let done = 0;
  const total = 30;
  const place = (id, hallKey, fn) => {
    const hall = halls[hallKey];
    jobs.push(loadStatue(id).then((g) => {
      const h = g.userData.statue.height;
      const kind = id.startsWith('king') ? 'king' : id.startsWith('buddha') ? 'buddha' : id.startsWith('arhat') ? 'arhat' : id;
      const target = SIZES[kind] || 2.5;
      g.scale.setScalar(target / h);
      fn(g, interiorOf(hall), target);
      scene.add(g);
      onStatue?.(g);
      onProgress?.(++done / total, `供奉 ${g.userData.statue.name}`);
    }).catch((e) => { console.error(id, e); onProgress?.(++done / total, '…'); }));
  };

  // ============ 天王殿：弥勒居中朝南，韦驮背对弥勒朝北，四天王分列东西 ============
  const tw = interiorOf(halls.tianwang);
  const twBack = halls.tianwang.z + halls.tianwang.userData.innerRows.back;
  {
    const az = twBack + 2.3;
    const alt = altarPlatform(4.2, 3.2, 1.0); alt.position.set(0, tw.floorY, az); scene.add(alt);
    place('maitreya', 'tianwang', (g, I) => { g.position.set(0, I.floorY + alt.userData.top, az + 0.1); });
    const back = mandorla(1.75, 2.5, { headY: 0.35 }); back.scale.setScalar(1.9); back.position.set(0, tw.floorY + alt.userData.top + 1.5, az - 1.5); scene.add(back);
    const wz = twBack - 1.2;
    place('weituo', 'tianwang', (g, I) => { g.position.set(0, I.floorY + 0.6, wz); g.rotation.y = Math.PI; });
    const ped = altarPlatform(2.2, 2.2, 0.6); ped.position.set(0, tw.floorY, wz); scene.add(ped);
    // 四天王：东侧（+x）持国、增长；西侧（-x）广目、多闻；均面向中轴
    const twFront = halls.tianwang.z + halls.tianwang.userData.innerRows.front;
    const kings = [['king_east', 1, twFront + 1.3], ['king_south', 1, twBack - 1.3], ['king_west', -1, twFront + 1.3], ['king_north', -1, twBack - 1.3]];
    for (const [id, sx, z] of kings) {
      const x = sx * 6.6;
      const ped2 = altarPlatform(2.4, 2.4, 0.5); ped2.position.set(x, tw.floorY, z); scene.add(ped2);
      place(id, 'tianwang', (g, I) => { g.position.set(x, I.floorY + 0.5, z); g.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; });
    }
    for (const x of [-1.5, 1.5]) candle(x, tw.floorY + alt.userData.top, az + 1.3, scene, animators, false);
    addView?.('天王殿', [0.6, tw.floorY + 1.9, tw.zMax + 2.6], [0, tw.floorY + 2.6, az]);
    addView?.('四大天王', [-1.0, tw.floorY + 2.2, twFront + 1.3], [6.6, tw.floorY + 2.6, twFront + 1.3]);
    addView?.('韦驮', [2.8, tw.floorY + 2.0, twBack + 1.2], [0, tw.floorY + 2.4, wz]);
  }

  // ============ 大雄宝殿：横三世佛（药师-释迦-阿弥陀），迦叶阿难侍立，十八罗汉分列两厢，海岛观音在后 ============
  const dx = interiorOf(halls.daxiong);
  const dxBack = halls.daxiong.z + halls.daxiong.userData.innerRows.back;
  {
    const az = dxBack + 3.2;
    const alt = altarPlatform(16, 5.0, 0.9); alt.position.set(0, dx.floorY, az); scene.add(alt);
    const top = dx.floorY + alt.userData.top;
    const trio = [['buddha_bhaisajya', 5.2], ['buddha_sakyamuni', 0], ['buddha_amitabha', -5.2]];
    for (const [id, x] of trio) {
      const th = lotusThrone(0.95); th.scale.setScalar(1.65); th.position.set(x, top, az); scene.add(th);
      const seatY = top + th.userData.top * 1.65;
      place(id, 'daxiong', (g) => { g.position.set(x, seatY, az); });
      const back = mandorla(1.75, 2.5, { headY: 0.35 }); back.scale.setScalar(2.3); back.position.set(x, seatY + 1.25, az - 1.3); scene.add(back);
    }
    place('kasyapa', 'daxiong', (g) => { g.position.set(-2.3, top, az + 1.9); g.rotation.y = 0.35; });
    place('ananda', 'daxiong', (g) => { g.position.set(2.3, top, az + 1.9); g.rotation.y = -0.35; });
    for (const x of [-3.6, 3.6]) candle(x, top, az + 2.2, scene, animators, true);
    // 十八罗汉：东西两厢各九尊，面向中轴
    const n = 9;
    for (let i = 0; i < 18; i++) {
      const side = i < n ? 1 : -1, k = i % n;
      const x = side * (dx.xMax - 1.4);
      const z = dx.zMin + 1.2 + (k + 0.5) * ((dx.zMax - dx.zMin - 2.4) / n);
      const ped = altarPlatform(1.5, 1.5, 0.9); ped.position.set(x, dx.floorY, z); scene.add(ped);
      place('arhat_' + (i + 1), 'daxiong', (g) => { g.position.set(x, dx.floorY + 0.9, z); g.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; });
    }
    // 海岛观音：后金柱之后，面北（朝向后门）
    const gz = dxBack - 1.25;
    place('guanyin', 'daxiong', (g, I) => { g.position.set(0, I.floorY + 0.9, gz); g.rotation.y = Math.PI; });
    const gped = altarPlatform(2.2, 2.0, 0.9); gped.position.set(0, dx.floorY, gz); scene.add(gped);
    addView?.('大雄宝殿外观', [22, 9, dx.zMax + 26], [0, 9, dx.cz]);
    addView?.('大雄宝殿', [0, dx.floorY + 2.6, dx.zMax - 1.5], [0, dx.floorY + 4.0, az]);
    addView?.('释迦牟尼佛', [0.8, dx.floorY + 3.6, az + 6], [0, dx.floorY + 4.2, az]);
    addView?.('十八罗汉', [dx.xMax - 7, dx.floorY + 2.4, dx.zMax - 1.0], [dx.xMax - 1.4, dx.floorY + 1.8, (dx.zMin + dx.zMax) / 2 - 1]);
    addView?.('海岛观音', [-3.4, dx.floorY + 2.8, gz - 0.4], [0, dx.floorY + 2.8, gz]);
  }
  await Promise.all(jobs);
}
