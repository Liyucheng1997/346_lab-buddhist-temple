import { Sculpt } from '../src/sculpt/sdf.js';
import { polygonize } from '../src/sculpt/mesher.js';
const s = new Sculpt([{name:'a',color:'#ffcc00',cls:'gold'}]);
s.sphere([0,0,0],0.5,{mat:'a'});
s.cone([0,0,0],[0.6,0.5,0],0.2,0.1,{mat:'a',k:0.1});
let t=performance.now();
const r = polygonize(s,[-0.8,-0.8,-0.8],[1,1,0.8],0.01);
console.log('ms',(performance.now()-t)|0,'verts',r.positions.length/3,'tris',r.groups.gold.length/3);
const P=r.positions,I=r.groups.gold;let agree=0,dis=0;
for(let t=0;t<I.length;t+=3){const a=I[t]*3,b=I[t+1]*3,c=I[t+2]*3;
const ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];
const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
const d=nx*r.normals[a]+ny*r.normals[a+1]+nz*r.normals[a+2]; if(d>0)agree++;else dis++;}
console.log('agree',agree,'dis',dis);
