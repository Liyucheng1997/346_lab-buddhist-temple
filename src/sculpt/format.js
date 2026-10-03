// 造像网格的紧凑二进制格式：[u32 jsonLen][json][positions f32][normals i8][colors u8][indices u32 ...]
// 法线量化为 int8×3，颜色量化为 uint8×3（线性空间 ×255）。

export function encode(data) {
  const meta = { height: data.height, name: data.name, props: data.props, parts: [] };
  const chunks = [];
  let offset = 0;
  const push = (buf) => {
    chunks.push(buf);
    const o = offset;
    offset += buf.byteLength;
    if (offset % 4) { const pad = 4 - (offset % 4); chunks.push(new Uint8Array(pad)); offset += pad; }
    return o;
  };
  for (const p of data.parts) {
    const nv = p.positions.length / 3;
    const n8 = new Int8Array(nv * 3);
    for (let i = 0; i < nv * 3; i++) n8[i] = Math.round(Math.max(-1, Math.min(1, p.normals[i])) * 127);
    const c8 = new Uint8Array(nv * 3);
    for (let i = 0; i < nv * 3; i++) c8[i] = Math.round(Math.max(0, Math.min(1, p.colors[i])) * 255);
    const part = { name: p.name, nv, pos: push(new Uint8Array(p.positions.buffer, p.positions.byteOffset, p.positions.byteLength)), nrm: push(n8), col: push(c8), groups: {} };
    for (const [cls, idx] of Object.entries(p.groups)) part.groups[cls] = { off: push(new Uint8Array(idx.buffer, idx.byteOffset, idx.byteLength)), n: idx.length };
    meta.parts.push(part);
  }
  const json = new TextEncoder().encode(JSON.stringify(meta));
  const jsonPad = (4 - (json.length % 4)) % 4;
  const head = 4 + json.length + jsonPad;
  const out = new Uint8Array(head + offset);
  new DataView(out.buffer).setUint32(0, json.length, true);
  out.set(json, 4);
  let o = head;
  for (const c of chunks) { out.set(c, o); o += c.byteLength; }
  return out.buffer;
}

export function decode(buffer) {
  const dv = new DataView(buffer);
  const jsonLen = dv.getUint32(0, true);
  const meta = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, jsonLen)));
  const base = 4 + jsonLen + ((4 - (jsonLen % 4)) % 4);
  const parts = meta.parts.map((p) => {
    const positions = new Float32Array(buffer, base + p.pos, p.nv * 3);
    const n8 = new Int8Array(buffer, base + p.nrm, p.nv * 3);
    const c8 = new Uint8Array(buffer, base + p.col, p.nv * 3);
    const normals = new Float32Array(p.nv * 3), colors = new Float32Array(p.nv * 3);
    for (let i = 0; i < p.nv * 3; i++) { normals[i] = n8[i] / 127; colors[i] = c8[i] / 255; }
    const groups = {};
    for (const [cls, g] of Object.entries(p.groups)) groups[cls] = new Uint32Array(buffer, base + g.off, g.n);
    return { name: p.name, positions, normals, colors, groups };
  });
  return { parts, props: meta.props, height: meta.height, name: meta.name };
}
