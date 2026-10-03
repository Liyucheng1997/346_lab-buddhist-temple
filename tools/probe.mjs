import { STATUES } from '../src/sculpt/registry.js';
const def = STATUES.seatedBuddha({mudra:'earth'});
const S = def.S;
// 头部局部 → 世界：o=(0,0.88,0.03), s=0.3
const w = (v) => [v[0]*0.3, 0.88+v[1]*0.3, 0.03+v[2]*0.3];
for (const lp of [[0.11,0.125,0.355],[0.2,0.13,0.32],[0.16,0.12,0.36]]) {
  const p0 = w(lp);
  const sp = S.surface(p0[0], p0[1], p0[2]-0.3, [0,0,1], 0.6);
  console.log('local', lp, 'surface z(local)', ((sp[2]-0.03)/0.3).toFixed(3), 'mat', S.palette[S.matAt(sp[0],sp[1],sp[2])].name);
}
