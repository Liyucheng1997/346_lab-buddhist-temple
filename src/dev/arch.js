// 建筑工作台：预览整座寺院或单个构件，便于迭代
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Sky } from 'three/addons/objects/Sky.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc9d6e2, 180, 520);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;

// 天空
const sky = new Sky();
sky.scale.setScalar(4000);
scene.add(sky);
const sunDir = new THREE.Vector3(0.45, 0.62, 0.55).normalize();
Object.assign(sky.material.uniforms.turbidity, { value: 4 });
sky.material.uniforms.rayleigh.value = 1.6;
sky.material.uniforms.mieCoefficient.value = 0.004;
sky.material.uniforms.mieDirectionalG.value = 0.8;
sky.material.uniforms.sunPosition.value.copy(sunDir);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(60, 40, 120);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 5, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.495;

// 光照：太阳 + 天光
const sun = new THREE.DirectionalLight(0xfff1dc, 3.2);
sun.position.copy(sunDir).multiplyScalar(220);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.left = sun.shadow.camera.bottom = -140;
sun.shadow.camera.right = sun.shadow.camera.top = 140;
sun.shadow.camera.near = 10; sun.shadow.camera.far = 600;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.05;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0xcfe0f5, 0x6b5a46, 0.9));

// 场景预设
const SCENES = {
  '整座寺院': async () => (await import('../temple/arch/layout.js')).buildTemple().group,
  '大雄宝殿': async () => (await import('../temple/arch/hall.js')).buildHall({ name: '大雄宝殿', bays: 7, bayWidth: 4.6, depthBays: 5, bayDepth: 4.0, columnHeight: 5.2, roofStyle: 'xieshan', doubleEave: true, platformHeight: 2.0, balustrade: true, plaqueText: '大雄宝殿', coupletText: ['佛日增辉法轮常转', '风调雨顺国泰民安'], doors: 'lattice' }),
  '天王殿': async () => (await import('../temple/arch/hall.js')).buildHall({ name: '天王殿', bays: 5, bayWidth: 4.2, depthBays: 3, bayDepth: 3.8, columnHeight: 4.0, roofStyle: 'xieshan', doubleEave: false, platformHeight: 1.0, balustrade: false, plaqueText: '天王殿', coupletText: ['大肚能容容天下难容之事', '开口便笑笑世间可笑之人'], doors: 'lattice' }),
  '屋顶-歇山': async () => (await import('../temple/arch/roof.js')).buildRoof({ style: 'xieshan', width: 30, depth: 18, eaveHeight: 6, ridgeHeight: 6, overhang: 2 }),
  '屋顶-庑殿重檐': async () => (await import('../temple/arch/roof.js')).buildRoof({ style: 'wudian', width: 30, depth: 18, eaveHeight: 10, ridgeHeight: 6, overhang: 2, doubleEave: true, lower: { eaveHeight: 5, width: 36, depth: 24, skirt: 3.5 } }),
  '屋顶-攒尖': async () => (await import('../temple/arch/roof.js')).buildRoof({ style: 'cuanjian', width: 10, depth: 10, eaveHeight: 5, ridgeHeight: 4, overhang: 1.5, sides: 4, tileColor: 'grey' }),
  '斗拱': async () => (await import('../temple/arch/dougong.js')).buildDougong({ tiers: 3, height: 4 }),
  '山门': async () => (await import('../temple/arch/gate.js')).buildGate({ plaqueText: '护国禅寺' }),
  '钟楼': async () => (await import('../temple/arch/tower.js')).buildTower({ kind: 'bell' }),
  '鼓楼': async () => (await import('../temple/arch/tower.js')).buildTower({ kind: 'drum' }),
  '小品': async () => {
    const d = await import('../temple/arch/details.js');
    const g = new THREE.Group();
    const items = [d.buildIncenseBurner(), d.buildStoneLion('left'), d.buildStoneLion('right'), d.buildFlagPole(), d.buildStoneLantern(), d.buildStele(), d.buildAltarTable({ width: 4 }), d.buildCandleStand()];
    items.forEach((o, i) => { o.position.x = (i - items.length / 2) * 6; g.add(o); });
    return g;
  },
  '植物': async () => {
    const v = await import('../temple/arch/vegetation.js');
    const g = new THREE.Group();
    [v.buildPine(1), v.buildPine(2), v.buildGinkgo(1), v.buildBanner()].forEach((o, i) => { o.position.x = (i - 1.5) * 10; g.add(o); });
    return g;
  },
  '围墙影壁': async () => {
    const w = await import('../temple/arch/wall.js');
    const g = new THREE.Group();
    g.add(w.buildEnclosure({ width: 40, depth: 30, height: 3 }));
    const s = w.buildScreenWall(); s.position.z = 25; g.add(s);
    return g;
  },
};

const sel = document.getElementById('scene');
for (const k of Object.keys(SCENES)) sel.add(new Option(k, k));
const qs = new URLSearchParams(location.search);
if (qs.get('s') && SCENES[qs.get('s')]) sel.value = qs.get('s');

let current = null;
let ground = null;
async function generate() {
  const info = document.getElementById('info');
  info.textContent = ' 构建中…';
  const t0 = performance.now();
  if (current) { scene.remove(current); current = null; }
  try {
    current = await SCENES[sel.value]();
  } catch (e) {
    console.error(e);
    info.textContent = ' 出错：' + e.message;
    window.__ready = true;
    return;
  }
  scene.add(current);
  // 非整体场景时补一块地面
  if (ground) { scene.remove(ground); ground = null; }
  if (sel.value !== '整座寺院') {
    const { AM } = await import('../temple/arch/materials.js');
    const m = AM.paving(); m.map.repeat.set(40, 40);
    ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), m);
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; ground.receiveShadow = true;
    scene.add(ground);
  }
  // 自动取景
  const bb = new THREE.Box3().setFromObject(current);
  const size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
  const r = Math.max(size.x, size.y, size.z);
  if (sel.value === '整座寺院') { camera.position.set(90, 70, 190); controls.target.set(0, 6, 0); }
  else { camera.position.set(c.x + r * 0.9, c.y + r * 0.6, c.z + r * 1.3); controls.target.copy(c); }
  controls.update();
  info.textContent = ` ${(performance.now() - t0) | 0} ms`;
  window.__ready = true;
}
document.getElementById('go').onclick = generate;
sel.onchange = () => { history.replaceState(null, '', '?s=' + encodeURIComponent(sel.value)); generate(); };

window.setView = (x, y, z, tx = 0, ty = 5, tz = 0) => {
  camera.position.set(x, y, z);
  controls.target.set(tx, ty, tz);
  controls.update();
  renderer.render(scene, camera);
};
window.shot = () => renderer.domElement.toDataURL('image/png');
window.__scene = scene; window.__renderer = renderer; window.__camera = camera;

const stats = document.getElementById('stats');
function loop() {
  requestAnimationFrame(loop);
  controls.update();
  renderer.render(scene, camera);
  const i = renderer.info.render;
  stats.textContent = `draw calls ${i.calls}\ntriangles ${(i.triangles / 1000).toFixed(0)}k\ncamera ${camera.position.x.toFixed(0)},${camera.position.y.toFixed(0)},${camera.position.z.toFixed(0)}`;
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
generate();
loop();
