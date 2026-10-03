import { STATUES } from '../src/sculpt/registry.js';
import { polygonize } from '../src/sculpt/mesher.js';
const t = performance.now();
const def = STATUES[process.argv[2] || 'seatedBuddha'](JSON.parse(process.argv[3] || '{}'));
console.log('prims', def.S.prims.length, 'build ms', (performance.now() - t) | 0);
for (const p of def.parts) {
  const t1 = performance.now();
  const r = polygonize(def.S, p.bmin, p.bmax, p.h, { exclude: p.exclude });
  const tris = Object.values(r.groups).reduce((a, g) => a + g.length / 3, 0);
  console.log(p.name, (performance.now() - t1) | 0, 'ms', 'tris', tris, Object.keys(r.groups).join(','));
}
