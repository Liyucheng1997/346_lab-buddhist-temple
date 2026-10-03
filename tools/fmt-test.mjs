import { encode, decode } from '../src/sculpt/format.js';
const parts=[{name:'a',positions:new Float32Array([0,1,2,3,4,5]),normals:new Float32Array([0,1,0,1,0,0]),colors:new Float32Array([0.5,0.2,1,0,0,0]),groups:{gold:new Uint32Array([0,1,0])}}];
const b=encode({parts,props:[{type:'x'}],height:1.1,name:'t'});const d=decode(b);
console.log(JSON.stringify({n:d.name,h:d.height,p:d.parts[0].positions[4],c:d.parts[0].colors[0],g:[...d.parts[0].groups.gold]}));
