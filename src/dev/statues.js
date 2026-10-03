// 造像工作台：单独预览每尊造像，便于迭代塑形
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SculptPool, assembleStatue } from '../sculpt/pool.js';
import { lotusThrone, mandorla } from '../temple/throne.js';

const PRESETS = {
  '释迦牟尼佛（触地印）': ['seatedBuddha', { mudra: 'earth' }],
  '药师佛（托钵）': ['seatedBuddha', { mudra: 'bowl' }],
  '阿弥陀佛（托莲）': ['seatedBuddha', { mudra: 'lotus' }],
  '禅定印佛': ['seatedBuddha', { mudra: 'dhyana' }],
  '说法印佛': ['seatedBuddha', { mudra: 'teach' }],
  '东方持国天王': ['heavenlyKing', { which: 'east' }],
  '南方增长天王': ['heavenlyKing', { which: 'south' }],
  '西方广目天王': ['heavenlyKing', { which: 'west' }],
  '北方多闻天王': ['heavenlyKing', { which: 'north' }],
  '韦驮菩萨': ['heavenlyKing', { which: 'weituo' }],
  '弥勒佛': ['maitreya', {}],
  '观音菩萨': ['guanyin', {}],
  '迦叶尊者': ['monk', { which: 'kasyapa' }],
  '阿难尊者': ['monk', { which: 'ananda' }],
  '罗汉 1 坐鹿': ['arhat', { index: 0 }],
  '罗汉 2 喜庆': ['arhat', { index: 1 }],
  '罗汉 10 探手': ['arhat', { index: 9 }],
  '罗汉 15 长眉': ['arhat', { index: 14 }],
  '罗汉 18 伏虎': ['arhat', { index: 17 }],
};
window.PRESETS = PRESETS;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1412);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.01, 100);
camera.position.set(1.2, 1.6, 4.2);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.3, 0);
controls.enableDamping = true;

const key = new THREE.DirectionalLight(0xffe2b8, 2.0);
key.position.set(1.5, 3.5, 3);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = key.shadow.camera.bottom = -1.5;
key.shadow.camera.right = key.shadow.camera.top = 1.5;
key.shadow.bias = -0.0005;
scene.add(key);
const rim = new THREE.DirectionalLight(0xffc890, 0.9);
rim.position.set(-2, 1.5, -2);
scene.add(rim);
scene.add(new THREE.HemisphereLight(0xfff0e0, 0x2a1a10, 0.35));
for (const x of [-1.4, 1.4]) { const c = new THREE.PointLight(0xff9a40, 6, 6, 2); c.position.set(x, 0.9, 1.6); scene.add(c); }
const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshStandardMaterial({ color: 0x2e2622, roughness: 0.6, metalness: 0.1 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const pool = new SculptPool();
const throne = lotusThrone(0.62); scene.add(throne);
const back = mandorla(1.75, 2.5, { headY: 0.35 }); back.position.set(0, throne.userData.top + 0.55, -0.42); scene.add(back);
const pedY = throne.userData.top;
let current = null;
const sel = document.getElementById('type');
for (const k of Object.keys(PRESETS)) sel.add(new Option(k, k));
const qs = new URLSearchParams(location.search);
if (qs.get('s') && PRESETS[qs.get('s')]) sel.value = qs.get('s');

async function generate() {
  const [type, params] = PRESETS[sel.value];
  document.getElementById('info').textContent = '雕塑中…';
  const t0 = performance.now();
  let data;
  try { data = await pool.run(type, params); } catch (e) { document.getElementById('info').textContent = '出错：' + e.message; window.__ready = true; return; }
  if (current) scene.remove(current);
  current = assembleStatue(data);
  const seated = type === 'seatedBuddha' || type === 'maitreya' || type === 'arhat';
  throne.visible = seated; back.visible = seated;
  current.position.y = seated ? pedY : 0;
  scene.add(current);
  let tris = 0;
  current.traverse((o) => { if (o.isMesh && o.geometry.index) tris += o.geometry.index.count / 3; });
  document.getElementById('info').textContent = `${(performance.now() - t0) | 0} ms（worker ${data.ms | 0} ms），${(tris / 1000) | 0}k 三角面`;
  window.__ready = true;
}
document.getElementById('go').onclick = generate;
sel.onchange = generate;
// 画廊模式：?all=名称1,名称2（或 all=1 显示全部），并排生成
const all = qs.get('all');
if (all) {
  throne.visible = back.visible = false;
  const names = all === '1' ? Object.keys(PRESETS) : all.split(',');
  document.getElementById('info').textContent = '雕塑中…';
  let done = 0;
  const t0 = performance.now();
  names.forEach((name, i) => {
    const [type, params] = PRESETS[name];
    pool.run(type, params).then((data) => {
      const g = assembleStatue(data);
      const scaleTo = 2.2 / data.height; // 统一到相近高度
      g.scale.setScalar(scaleTo);
      g.position.set((i - (names.length - 1) / 2) * 2.4, 0, 0);
      scene.add(g);
      if (++done === names.length) { document.getElementById('info').textContent = `${names.length} 尊，${(performance.now() - t0) | 0} ms`; window.__ready = true; }
    }).catch((e) => { document.getElementById('info').textContent = '出错：' + e.message; window.__ready = true; });
  });
} else generate();

window.setView = (x, y, z, tx, ty, tz) => { camera.position.set(x, y, z); controls.target.set(tx, ty, tz); controls.update(); renderer.render(scene, camera); };
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
