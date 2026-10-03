// 预烘焙所有造像网格到 public/statues/*.bin（多线程）。
// 用法：node tools/bake.mjs [质量系数=1.25] [--force]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { STATUE_LIST } from '../src/sculpt/list.js';

const OUT = new URL('../public/statues/', import.meta.url);
const Q = Number(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 1.25);

if (!isMainThread) {
  const { STATUES } = await import('../src/sculpt/registry.js');
  const { polygonize } = await import('../src/sculpt/mesher.js');
  const { encode } = await import('../src/sculpt/format.js');
  const { id, type, params } = workerData;
  const Qe = workerData.q ?? Q;
  const def = STATUES[type](params);
  const parts = def.parts.map((p) => {
    const r = polygonize(def.S, p.bmin, p.bmax, p.h * Qe, { exclude: p.exclude });
    return { name: p.name, ...r };
  });
  const buf = encode({ parts, props: def.props || [], height: def.height, name: def.name });
  writeFileSync(new URL(id + '.bin', OUT), Buffer.from(buf));
  const tris = parts.reduce((a, p) => a + Object.values(p.groups).reduce((b, g) => b + g.length / 3, 0), 0);
  parentPort.postMessage({ id, bytes: buf.byteLength, tris });
} else {
  mkdirSync(OUT, { recursive: true });
  const manifestPath = new URL('manifest.json', OUT);
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  const force = process.argv.includes('--force');
  const only = process.argv.find((a) => a.startsWith('--only='));
  let todo = STATUE_LIST.filter((s) => force || !existsSync(new URL(s.id + '.bin', OUT)));
  if (only) todo = STATUE_LIST.filter((s) => only.slice(7).split(',').includes(s.id));
  console.log('待烘焙 ' + todo.length + ' / ' + STATUE_LIST.length + ' 尊，质量系数 ' + Q);
  const n = Math.max(1, Math.min(cpus().length - 1, 8));
  let next = 0, running = 0;
  const t0 = performance.now();
  await new Promise((resolve) => {
    const launch = () => {
      if (next >= todo.length && running === 0) return resolve();
      while (running < n && next < todo.length) {
        const job = todo[next++];
        running++;
        const w = new Worker(new URL(import.meta.url), { workerData: { ...job, q: job.q ?? Q } });
        w.on('message', (m) => {
          manifest[m.id] = { bytes: m.bytes, tris: m.tris, q: Q };
          console.log('OK ' + m.id + '  ' + (m.bytes / 1e6).toFixed(1) + ' MB  ' + ((m.tris / 1000) | 0) + 'k tris  (' + (((performance.now() - t0) / 1000) | 0) + 's)');
        });
        w.on('error', (e) => console.error('FAIL', job.id, e));
        w.on('exit', () => { running--; launch(); });
      }
    };
    launch();
  });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  console.log('完成 ' + (((performance.now() - t0) / 1000) | 0) + ' s');
}
