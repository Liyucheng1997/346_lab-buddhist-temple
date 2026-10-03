// Worker 池 + 将网格数据组装为 three.js 对象
import * as THREE from 'three';
import { statueMaterials } from '../core/materials.js';
import { buildProp } from './props.js';

export class SculptPool {
  constructor(n = Math.max(2, Math.min(6, (navigator.hardwareConcurrency || 4) - 1))) {
    this.workers = [];
    this.queue = [];
    this.pending = new Map();
    this.idle = [];
    this.seq = 0;
    for (let i = 0; i < n; i++) {
      const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      w.onmessage = (e) => this._done(w, e.data);
      w.onerror = (e) => { console.error('造像 Worker 出错', e.message); for (const [id, job] of this.pending) { job.reject(new Error(e.message || 'worker error')); this.pending.delete(id); } if (!this.idle.includes(w)) this.idle.push(w); };
      this.workers.push(w);
      this.idle.push(w);
    }
  }
  _pump() {
    while (this.idle.length && this.queue.length) {
      const w = this.idle.pop();
      const job = this.queue.shift();
      w.postMessage({ id: job.id, type: job.type, params: job.params });
    }
  }
  _done(w, data) {
    this.idle.push(w);
    const job = this.pending.get(data.id);
    this.pending.delete(data.id);
    if (data.ok) job.resolve(data); else { console.error(data.error); job.reject(new Error(data.error)); }
    this._pump();
  }
  run(type, params) {
    return new Promise((resolve, reject) => {
      const id = ++this.seq;
      const job = { id, type, params, resolve, reject };
      this.pending.set(id, job);
      this.queue.push(job);
      this._pump();
    });
  }
  dispose() { this.workers.forEach((w) => w.terminate()); }
}

const CLASS_ORDER = ['gold', 'paint', 'gloss', 'metal'];

// 将 Worker 结果转为 Group（每个分块一个 Mesh，多材质分组）
export function assembleStatue(data, opts = {}) {
  const mats = statueMaterials();
  const group = new THREE.Group();
  for (const part of data.parts) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(part.positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(part.normals, 3));
    g.setAttribute('color', new THREE.BufferAttribute(part.colors, 3));
    const all = [];
    const materials = [];
    let start = 0;
    for (const cls of CLASS_ORDER) {
      const idx = part.groups[cls];
      if (!idx) continue;
      for (let i = 0; i < idx.length; i++) all.push(idx[i]);
      g.addGroup(start, idx.length, materials.length);
      materials.push(mats[cls]);
      start += idx.length;
    }
    if (!all.length) continue;
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(all), 1));
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = part.name;
    group.add(mesh);
  }
  for (const pr of data.props || []) {
    const o = buildProp(pr);
    if (o) group.add(o);
  }
  if (opts.scale) group.scale.setScalar(opts.scale);
  return group;
}
