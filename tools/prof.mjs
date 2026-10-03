globalThis.__PROF=1;
import { STATUES } from '../src/sculpt/registry.js';
import { polygonize } from './mesher_prof.js';
const def = STATUES.seatedBuddha({mudra:'earth'});
const p=def.parts[0]; const t=performance.now();
polygonize(def.S, p.bmin, p.bmax, p.h, { exclude: p.exclude });
console.log('total',(performance.now()-t)|0);
