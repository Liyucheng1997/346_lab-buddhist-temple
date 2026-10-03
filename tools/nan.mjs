import { STATUES } from '../src/sculpt/registry.js';
const def = STATUES[process.argv[2]](JSON.parse(process.argv[3]||'{}'));
const S = def.S;
console.log('eval@center', S.eval(0,1.2,0));
S.prims.forEach((p,i)=>{ const d=S._primDist(p,0.1,1.2,0.1); if(!Number.isFinite(d)) console.log('bad prim',i,p.t,JSON.stringify(p).slice(0,200)); });
