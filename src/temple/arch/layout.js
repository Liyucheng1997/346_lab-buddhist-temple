// 总体布局：影壁 → 山门 → 钟鼓楼 → 天王殿 → 大雄宝殿（主院）→ 藏经楼，中轴线 x=0，入口在 +z，向北为 -z
import * as THREE from 'three';
import { mergeGroups, box, mat4, PartBuilder, shadowed } from './util.js';
import { AM } from './materials.js';
import { buildHall } from './hall.js';
import { buildGate } from './gate.js';
import { buildTower } from './tower.js';
import { buildEnclosure, buildScreenWall } from './wall.js';
import { buildIncenseBurner, buildStoneLion, buildFlagPole, buildStoneLantern, buildStele, buildAltarTable, buildCandleStand } from './details.js';
import { buildPine, buildGinkgo, buildBanner } from './vegetation.js';

/** 殿堂参数（供布局与尺寸表共用） */
export const HALL_SPECS = {
  tianwang: { name: '天王殿', bays: 5, bayWidth: 4.2, depthBays: 3, bayDepth: 3.8, columnHeight: 4.0, roofStyle: 'xieshan', doubleEave: false, platformHeight: 1.0, balustrade: false, plaqueText: '天王殿', coupletText: ['大肚能容容天下难容之事', '开口便笑笑世间可笑之人'], doors: 'lattice', z: 27 },
  daxiong: { name: '大雄宝殿', bays: 7, bayWidth: 4.8, depthBays: 5, bayDepth: 4.0, columnHeight: 5.6, roofStyle: 'xieshan', doubleEave: true, platformHeight: 2.2, balustrade: true, plaqueText: '大雄宝殿', coupletText: ['佛日增辉法轮常转', '风调雨顺国泰民安'], doors: 'lattice', z: -12 },
  cangjing: { name: '藏经楼', bays: 5, bayWidth: 4.4, depthBays: 3, bayDepth: 4.0, columnHeight: 4.4, roofStyle: 'xieshan', doubleEave: true, storeys: 2, platformHeight: 1.2, balustrade: false, plaqueText: '藏经楼', coupletText: ['经藏三千世界', '慧灯万古常明'], doors: 'lattice', z: -47 },
};
export const AXIS = {
  screenWallZ: 72, gateZ: 58, towerZ: 42, towerX: 22, burnerZ: 8,
  enclosure: { width: 74, depth: 122, centerZ: -3 }, // z 范围 +58 … -64
};

/**
 * 寺院尺寸表：供造像放置使用（世界坐标）。
 * 每项：{ z 殿中心, floorY 室内地面高, interior 世界坐标室内范围, entrance, innerRows 金柱排 z }
 */
export const TEMPLE_DIMENSIONS = {};

function hallEntry(hall, z) {
  const u = hall.userData;
  return {
    z, floorY: u.floorY,
    interior: { xMin: u.interior.xMin, xMax: u.interior.xMax, zMin: u.interior.zMin + z, zMax: u.interior.zMax + z, yMax: u.interior.yMax },
    entrance: [u.entrance[0], u.entrance[1], u.entrance[2] + z],
    innerRows: { front: u.innerRows.front + z, back: u.innerRows.back + z },
    columnHeight: u.columnHeight, roofTop: u.roofTop,
  };
}

/** 组装整座寺院 */
export function buildTemple() {
  const group = new THREE.Group();
  group.name = '寺院';
  const halls = {};
  const lights = [];
  const small = []; // 待合并的小品

  // ---- 地面 ----
  const enc = AXIS.enclosure;
  {
    const earth = AM.earth(); earth.map.repeat.set(60, 60);
    const outer = shadowed(new THREE.Mesh(new THREE.PlaneGeometry(500, 500), earth));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -0.03; outer.castShadow = false;
    group.add(outer);
    const pav = AM.paving(); pav.map.repeat.set(enc.width / 1.6, enc.depth / 1.6);
    const inner = shadowed(new THREE.Mesh(new THREE.PlaneGeometry(enc.width, enc.depth), pav));
    inner.rotation.x = -Math.PI / 2; inner.position.set(0, 0.0, enc.centerZ); inner.castShadow = false;
    group.add(inner);
    // 甬道（御路条石）
    const path = AM.path();
    const addPath = (z0, z1, w = 4.2) => {
      const g = new THREE.PlaneGeometry(w, Math.abs(z1 - z0));
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i) * Math.abs(z1 - z0) / 4);
      const m = shadowed(new THREE.Mesh(g, path));
      m.rotation.x = -Math.PI / 2; m.position.set(0, 0.04, (z0 + z1) / 2); m.castShadow = false;
      group.add(m);
    };
    addPath(72 - 2, 58 + 4);
    addPath(55, 36);
    addPath(19, 4);
    addPath(-26, -39);
    // 山门到钟鼓楼的横向小道
    for (const sx of [-1, 1]) { const g = new THREE.PlaneGeometry(18, 2.5); const m = shadowed(new THREE.Mesh(g, path)); m.rotation.x = -Math.PI / 2; m.position.set(sx * 11, 0.035, AXIS.towerZ); m.castShadow = false; group.add(m); }
  }

  // ---- 围墙与影壁 ----
  const wall = buildEnclosure({ width: enc.width, depth: enc.depth, height: 3.4, thickness: 0.8, gap: 23 });
  wall.position.z = enc.centerZ;
  group.add(wall);
  const screen = buildScreenWall({ width: 15, height: 4.4, text: '佛' });
  screen.position.z = AXIS.screenWallZ;
  group.add(screen);

  // ---- 山门 ----
  const gate = buildGate({ plaqueText: '护国禅寺', width: 20, height: 7.2, thickness: 3.4 });
  gate.position.z = AXIS.gateZ;
  group.add(gate);
  halls.gate = { group: gate, userData: gate.userData, z: AXIS.gateZ };
  // 石狮（山门外两侧）
  for (const sx of [-1, 1]) {
    const lion = buildStoneLion(sx < 0 ? 'left' : 'right');
    lion.position.set(sx * 5.2, 0, AXIS.gateZ + 5.5);
    small.push(lion);
  }

  // ---- 钟楼（东 +x）/ 鼓楼（西 -x） ----
  const bellTower = buildTower({ kind: 'bell' });
  bellTower.position.set(AXIS.towerX, 0, AXIS.towerZ);
  const drumTower = buildTower({ kind: 'drum' });
  drumTower.position.set(-AXIS.towerX, 0, AXIS.towerZ);
  group.add(bellTower, drumTower);
  halls.bellTower = { group: bellTower, userData: bellTower.userData, z: AXIS.towerZ };
  halls.drumTower = { group: drumTower, userData: drumTower.userData, z: AXIS.towerZ };

  // ---- 三座殿堂 ----
  for (const key of ['tianwang', 'daxiong', 'cangjing']) {
    const spec = HALL_SPECS[key];
    const hall = buildHall(spec);
    hall.position.z = spec.z;
    group.add(hall);
    halls[key] = { group: hall, userData: hall.userData, z: spec.z };
    TEMPLE_DIMENSIONS[key] = hallEntry(hall, spec.z);
    // 殿内供桌（置于后金柱前）
    const altarW = key === 'daxiong' ? 6 : 3.6;
    const altar = buildAltarTable({ width: altarW, depth: 1.1 });
    const zAltar = spec.z + hall.userData.innerRows.back + (key === 'daxiong' ? 7.5 : 4.2); // 供桌前移，后部留出佛坛空间
    altar.position.set(0, hall.userData.floorY, zAltar);
    small.push(altar);
    for (const sx of [-1, 1]) { const c = buildCandleStand({ height: 1.3 }); c.position.set(sx * (altarW / 2 + 0.8), hall.userData.floorY, zAltar + 0.6); small.push(c); }
    TEMPLE_DIMENSIONS[key].altar = { z: zAltar, top: hall.userData.floorY + 0.95, width: altarW };
  }
  TEMPLE_DIMENSIONS.gate = { z: AXIS.gateZ, floorY: gate.userData.floorY, passage: { zMin: gate.userData.passage.zMin + AXIS.gateZ, zMax: gate.userData.passage.zMax + AXIS.gateZ } };
  TEMPLE_DIMENSIONS.bellTower = { x: AXIS.towerX, z: AXIS.towerZ, floorY: bellTower.userData.floorY, upperFloorY: bellTower.userData.upperFloorY };
  TEMPLE_DIMENSIONS.drumTower = { x: -AXIS.towerX, z: AXIS.towerZ, floorY: drumTower.userData.floorY, upperFloorY: drumTower.userData.upperFloorY };

  // ---- 主院小品 ----
  const burner = buildIncenseBurner({ scale: 1.15 });
  burner.position.set(0, 0, AXIS.burnerZ);
  group.add(burner); // 含发光香头，单独保留
  for (const sx of [-1, 1]) {
    const fp = buildFlagPole({ height: 15 }); fp.position.set(sx * 7.5, 0, 14.5); small.push(fp);
    for (const z of [16, 10, 4]) { const l = buildStoneLantern(); l.position.set(sx * 4.2, 0, z); small.push(l); }
    const st = buildStele(); st.position.set(sx * 13, 0, 15); st.rotation.y = sx < 0 ? 0.3 : -0.3; small.push(st);
    const ban = buildBanner({ width: 6, height: 5 }); ban.position.set(sx * 22, 0, 1); ban.rotation.y = Math.PI / 2; small.push(ban);
    // 第一进院：钟鼓楼前的石灯
    const l2 = buildStoneLantern(); l2.position.set(sx * 4.2, 0, 50); small.push(l2);
  }
  // ---- 院内古松、墙外树木 ----
  let seed = 1;
  const plant = (x, z, kind = 'pine', h) => {
    const t = kind === 'pine' ? buildPine(seed++, { height: h || 9 }) : buildGinkgo(seed++, { height: h || 11 });
    t.position.set(x, 0, z);
    t.rotation.y = seed * 1.7;
    small.push(t);
  };
  for (const sx of [-1, 1]) {
    plant(sx * 15, 8, 'pine', 10);
    plant(sx * 16, -1, 'pine', 9);
    plant(sx * 14, -33, 'ginkgo', 12);
    plant(sx * 13, 48, 'pine', 8);
    // 墙外
    plant(sx * 46, 20, 'pine', 11);
    plant(sx * 50, -15, 'ginkgo', 13);
    plant(sx * 44, -50, 'pine', 10);
    plant(sx * 30, 80, 'ginkgo', 12);
    plant(sx * 48, 60, 'pine', 9);
  }
  // 合并所有小品与植物为少量 draw call
  const merged = mergeGroups(small, '小品');
  group.add(merged);

  // ---- 香炉暖光 ----
  const glow = new THREE.PointLight(0xff8a3a, 20, 14, 2);
  glow.position.set(0, 3.2, AXIS.burnerZ);
  group.add(glow);
  lights.push(glow);

  return { group, halls, lights };
}

void box; void mat4; void PartBuilder;
