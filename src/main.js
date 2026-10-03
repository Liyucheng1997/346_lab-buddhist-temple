// 主场景：寺院建筑 + 造像陈设 + 光照/后期 + 巡礼导览
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { statueMaterials } from './core/materials.js';
import { buildTemple, AXIS } from './temple/arch/layout.js';
import { furnishTemple } from './temple/furnish.js';

const $ = (id) => document.getElementById(id);
const setProgress = (f, text) => { $('bar').firstElementChild.style.width = (f * 100).toFixed(0) + '%'; if (text) $('status').textContent = text; };

// ---------------- 渲染器 ----------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.info.autoReset = false;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xdfe6ee, 260, 1000);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1200);
camera.position.set(60, 40, 120);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 1.5;
controls.maxDistance = 400;

// ---------------- 天空与光 ----------------
const sky = new Sky();
sky.scale.setScalar(5000);
scene.add(sky);
const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(55), THREE.MathUtils.degToRad(150));
sky.material.uniforms.turbidity.value = 2.5;
sky.material.uniforms.rayleigh.value = 1.1;
sky.material.uniforms.mieCoefficient.value = 0.003;
sky.material.uniforms.mieDirectionalG.value = 0.8;
sky.material.uniforms.sunPosition.value.copy(sun);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(sky, 0.02).texture;
scene.environmentIntensity = 0.3;
// 造像的贴金/釉面使用中性暖色的室内环境贴图（殿内看不到天空，避免泛青）
const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
for (const m of Object.values(statueMaterials())) { m.envMap = roomEnv; m.envMapIntensity = 0.75; }

const sunLight = new THREE.DirectionalLight(0xfff2dc, 2.6);
sunLight.position.copy(sun).multiplyScalar(260);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(4096, 4096);
sunLight.shadow.camera.near = 50;
sunLight.shadow.camera.far = 600;
sunLight.shadow.camera.left = sunLight.shadow.camera.bottom = -140;
sunLight.shadow.camera.right = sunLight.shadow.camera.top = 140;
sunLight.shadow.bias = -0.0006;
sunLight.shadow.normalBias = 0.05;
scene.add(sunLight, sunLight.target);
scene.add(new THREE.HemisphereLight(0xcfe0f5, 0x5a4a38, 0.4));

// ---------------- 导览视角 ----------------
const VIEWS = [];
const nav = $('nav');
function addView(name, pos, target) {
  const b = document.createElement('button');
  b.textContent = name;
  b.onclick = () => flyTo(pos, target, b);
  nav.appendChild(b);
  VIEWS.push({ name, pos, target, b });
}
let flight = null;
function flyTo(pos, target, btn) {
  for (const v of VIEWS) v.b.classList.toggle('on', v.b === btn);
  flight = { p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3().fromArray(pos), t1: new THREE.Vector3().fromArray(target), s: performance.now(), d: 1800 };
}

// ---------------- 建造 ----------------
const temple = buildTemple();
scene.add(temple.group);
addView('鸟瞰全寺', [70, 60, 150], [0, 5, 0]);
addView('山门', [14, 5, AXIS.gateZ + 9], [0, 5, AXIS.gateZ]);
addView('中庭香炉', [7, 3, AXIS.burnerZ + 13], [-1, 4, AXIS.burnerZ - 10]);
setProgress(0.25, '殿宇落成，正在供奉造像…');

const labelEl = $('label');
const hoverables = [];
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2(2, 2);
addEventListener('pointermove', (e) => { mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); labelEl.style.left = e.clientX + 'px'; labelEl.style.top = e.clientY + 'px'; });

furnishTemple(scene, temple, {
  onProgress: (f, text) => setProgress(0.25 + f * 0.75, text),
  onStatue: (group) => { group.traverse((o) => { if (o.isMesh) { o.userData.statueName = group.userData.statue.name; hoverables.push(o); } }); },
  addView,
}).then(() => {
  setProgress(1, '功德圆满');
  setTimeout(() => { $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 900); }, 300);
  if (VIEWS.length) VIEWS[0].b.click();
});

// ---------------- 循环 ----------------
const clock = new THREE.Clock();
let frames = 0, acc = 0;
function animate() {
  const dt = clock.getDelta();
  if (flight) {
    const t = Math.min(1, (performance.now() - flight.s) / flight.d);
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    camera.position.lerpVectors(flight.p0, flight.p1, e);
    controls.target.lerpVectors(flight.t0, flight.t1, e);
    if (t >= 1) flight = null;
  }
  controls.update();
  // 悬停拾取（每 4 帧一次）
  if ((frames & 3) === 0 && hoverables.length) {
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(hoverables, false)[0];
    if (hit) { labelEl.style.display = 'block'; labelEl.textContent = hit.object.userData.statueName; } else labelEl.style.display = 'none';
  }
  for (const fn of temple.animators || []) fn(dt, clock.elapsedTime);
  renderer.info.reset();
  renderer.render(scene, camera);
  frames++; acc += dt;
  if (acc > 1) { $('stats').textContent = `${Math.round(frames / acc)} fps · ${(renderer.info.render.triangles / 1e6).toFixed(2)}M tris · ${renderer.info.render.calls} calls`; frames = 0; acc = 0; }
}
renderer.setAnimationLoop(animate);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
window.__app = { scene, camera, controls, renderer, temple, flyTo: (p, t) => flyTo(p, t, null) };
