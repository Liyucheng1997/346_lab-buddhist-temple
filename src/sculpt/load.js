// 造像加载：优先读取预烘焙的 /statues/<id>.bin，缺失时回退到 Worker 实时雕塑。
import { decode } from './format.js';
import { STATUE_LIST } from './list.js';
import { SculptPool, assembleStatue } from './pool.js';

let pool = null;
const byId = new Map(STATUE_LIST.map((s) => [s.id, s]));

export async function loadStatue(id, opts = {}) {
  const entry = byId.get(id);
  if (!entry) throw new Error('未知造像 ' + id);
  let data = null;
  try {
    const res = await fetch(import.meta.env.BASE_URL + 'statues/' + id + '.bin');
    if (res.ok) data = decode(await res.arrayBuffer());
  } catch (e) { /* 回退到实时生成 */ }
  if (!data) {
    pool ??= new SculptPool();
    data = await pool.run(entry.type, { ...entry.params, quality: opts.quality ?? 1.25 });
  }
  const group = assembleStatue(data, opts);
  group.userData.statue = { id, height: data.height, name: data.name };
  return group;
}

export { STATUE_LIST };
