// 造像网格生成 Worker：接收 {id, type, params}，返回各分块的网格数据（可转移缓冲区）
import { STATUES } from './registry.js';
import { polygonize } from './mesher.js';

self.onmessage = (e) => {
  const { id, type, params } = e.data;
  try {
    const t0 = performance.now();
    const def = STATUES[type](params || {});
    const parts = [];
    const transfer = [];
    for (const part of def.parts) {
      const r = polygonize(def.S, part.bmin, part.bmax, part.h * (params?.quality ?? 1), { exclude: part.exclude });
      parts.push({ name: part.name, positions: r.positions, normals: r.normals, colors: r.colors, groups: r.groups });
      transfer.push(r.positions.buffer, r.normals.buffer, r.colors.buffer);
      for (const g of Object.values(r.groups)) transfer.push(g.buffer);
    }
    self.postMessage({ id, ok: true, parts, props: def.props || [], height: def.height, decal: def.decal, ms: performance.now() - t0 }, transfer);
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.stack || err) });
  }
};
