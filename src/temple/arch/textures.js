// 运行时用 Canvas 2D 生成的建筑贴图：琉璃瓦、彩画、红漆木、方砖、汉白玉、青砖、匾额、对联、隔扇棂花等
import * as THREE from 'three';

const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

/** 把 canvas 包装为纹理；color=true 时标记为 sRGB 颜色贴图 */
function tex(c, { color = true, repeat = [1, 1], wrap = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  else t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// 简单可复现的伪随机
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** 给整张 canvas 叠加细噪点（模拟材质颗粒） */
function grain(ctx, w, h, amount, seed = 1, alpha = 0.08) {
  const r = rng(seed);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  void alpha;
}

/** 琉璃瓦（黄 / 灰）：瓦垄沿 v 方向，一个纹理单元 = 一条筒瓦 + 一条板瓦沟 */
export function glazedTile(color = 'yellow') {
  return cached('tile:' + color, () => {
    const w = 128, h = 256;
    const [c, ctx] = canvas(w, h);
    const base = color === 'yellow' ? [222, 164, 40] : color === 'green' ? [52, 110, 70] : [92, 96, 100];
    const dark = base.map((v) => v * 0.55);
    // 板瓦沟（凹）：横向渐变，两侧暗中间略亮
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, `rgb(${dark.join(',')})`);
    g.addColorStop(0.3, `rgb(${base.map((v) => v * 0.85).join(',')})`);
    g.addColorStop(0.5, `rgb(${base.map((v) => Math.min(255, v * 1.05)).join(',')})`);
    g.addColorStop(0.7, `rgb(${base.map((v) => v * 0.85).join(',')})`);
    g.addColorStop(1, `rgb(${dark.join(',')})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // 板瓦叠压线（每 1/4 高一条）
    for (let i = 0; i < 4; i++) {
      const y = (i / 4) * h;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, y, w, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, y + 3, w, 2);
    }
    grain(ctx, w, h, 18, 7);
    const map = tex(c);
    // 粗糙度：沟内粗糙，瓦面光滑
    const [c2, ctx2] = canvas(w, h);
    const g2 = ctx2.createLinearGradient(0, 0, w, 0);
    g2.addColorStop(0, '#8a8a8a'); g2.addColorStop(0.5, '#4a4a4a'); g2.addColorStop(1, '#8a8a8a');
    ctx2.fillStyle = g2; ctx2.fillRect(0, 0, w, h);
    const rough = tex(c2, { color: false });
    return { map, rough };
  });
}

/** 旋子彩画 / 和玺彩画 横带：蓝绿相间的枋心、箍头、藻头，金线勾边。沿 u 方向重复。 */
export function caihua(kind = 'xuanzi') {
  return cached('caihua:' + kind, () => {
    const w = 1024, h = 128;
    const [c, ctx] = canvas(w, h);
    const blue = '#2c4f9c', green = '#2f7d5c', gold = '#e2b84a', red = '#8a2a1e', white = '#e8e4d8';
    ctx.fillStyle = blue; ctx.fillRect(0, 0, w, h);
    // 上下金边
    ctx.fillStyle = gold; ctx.fillRect(0, 0, w, 6); ctx.fillRect(0, h - 6, w, 6);
    // 三段：箍头(绿) | 藻头(旋花) | 枋心(蓝，龙纹/花纹) | 藻头 | 箍头
    const seg = [0.08, 0.2, 0.44, 0.2, 0.08];
    let x = 0;
    seg.forEach((f, i) => {
      const sw = f * w;
      if (i === 0 || i === 4) {
        ctx.fillStyle = green; ctx.fillRect(x, 6, sw, h - 12);
        // 箍头内的小方格（联珠）
        ctx.fillStyle = gold;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + sw / 2, 24 + k * 40, 7, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = gold; ctx.fillRect(x + sw - 4, 6, 4, h - 12); ctx.fillRect(x, 6, 4, h - 12);
      } else if (i === 1 || i === 3) {
        // 藻头：旋子（同心圆花瓣）
        ctx.fillStyle = green; ctx.fillRect(x, 6, sw, h - 12);
        const cx = x + sw / 2, cy = h / 2;
        for (let k = 0; k < 3; k++) {
          const ccx = cx + (k - 1) * sw * 0.3;
          ctx.fillStyle = blue; ctx.beginPath(); ctx.arc(ccx, cy, 34, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = gold; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = white; ctx.beginPath(); ctx.arc(ccx, cy, 22, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = red; ctx.beginPath(); ctx.arc(ccx, cy, 11, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = gold; ctx.lineWidth = 2;
          for (let p = 0; p < 8; p++) {
            const a = (p / 8) * Math.PI * 2;
            ctx.beginPath(); ctx.moveTo(ccx + Math.cos(a) * 12, cy + Math.sin(a) * 12); ctx.lineTo(ccx + Math.cos(a) * 32, cy + Math.sin(a) * 32); ctx.stroke();
          }
        }
        // 斜向分隔金线（藻头外廓）
        ctx.strokeStyle = gold; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, 6); ctx.lineTo(x + sw * 0.12, h / 2); ctx.lineTo(x, h - 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + sw, 6); ctx.lineTo(x + sw - sw * 0.12, h / 2); ctx.lineTo(x + sw, h - 6); ctx.stroke();
      } else {
        // 枋心：蓝底金纹（和玺：行龙；旋子：锦纹）
        ctx.fillStyle = blue; ctx.fillRect(x, 6, sw, h - 12);
        ctx.strokeStyle = gold; ctx.lineWidth = 3;
        ctx.strokeRect(x + 10, 14, sw - 20, h - 28);
        if (kind === 'hexi') {
          // 简化行龙：波浪形身体 + 头部
          ctx.lineWidth = 6; ctx.lineCap = 'round';
          ctx.beginPath();
          for (let k = 0; k <= 40; k++) {
            const px = x + 30 + (k / 40) * (sw - 60);
            const py = h / 2 + Math.sin(k / 40 * Math.PI * 3) * 20;
            k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.stroke();
          ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(x + 30, h / 2, 12, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = red; ctx.beginPath(); ctx.arc(x + sw / 2, h / 2, 9, 0, Math.PI * 2); ctx.fill();
        } else {
          // 锦纹：菱形网格
          ctx.lineWidth = 1.5;
          for (let k = 0; k < 20; k++) {
            const px = x + 20 + k * (sw - 40) / 20;
            ctx.beginPath(); ctx.moveTo(px, 14); ctx.lineTo(px + 40, h - 14); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px + 40, 14); ctx.lineTo(px, h - 14); ctx.stroke();
          }
          ctx.fillStyle = gold;
          ctx.beginPath(); ctx.arc(x + sw / 2, h / 2, 16, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = red; ctx.beginPath(); ctx.arc(x + sw / 2, h / 2, 8, 0, Math.PI * 2); ctx.fill();
        }
      }
      x += sw;
    });
    grain(ctx, w, h, 10, 3);
    return tex(c, { repeat: [1, 1] });
  });
}

/** 红漆木：竖向细木纹 */
export function redLacquer() {
  return cached('redLacquer', () => {
    const w = 256, h = 256;
    const [c, ctx] = canvas(w, h);
    ctx.fillStyle = '#8c1c16'; ctx.fillRect(0, 0, w, h);
    const r = rng(11);
    for (let i = 0; i < 90; i++) {
      const x = r() * w;
      ctx.strokeStyle = `rgba(${r() > 0.5 ? '60,10,8' : '150,50,40'},${0.08 + r() * 0.12})`;
      ctx.lineWidth = 1 + r() * 2;
      ctx.beginPath(); ctx.moveTo(x, 0);
      for (let y = 0; y <= h; y += 16) ctx.lineTo(x + Math.sin(y / 40 + i) * 3, y);
      ctx.stroke();
    }
    grain(ctx, w, h, 14, 5);
    return tex(c);
  });
}

/** 地面方砖 / 金砖（深灰，带接缝与微变化）。tiles: 每张贴图的砖数 */
export function paving(kind = 'grey', tiles = 4) {
  return cached('paving:' + kind + tiles, () => {
    const w = 512, h = 512;
    const [c, ctx] = canvas(w, h);
    const base = kind === 'dark' ? [58, 58, 62] : kind === 'warm' ? [128, 118, 104] : [120, 122, 124];
    const r = rng(kind === 'dark' ? 21 : 22);
    const s = w / tiles;
    for (let i = 0; i < tiles; i++) for (let j = 0; j < tiles; j++) {
      const v = 0.86 + r() * 0.28;
      ctx.fillStyle = `rgb(${base.map((b) => Math.min(255, b * v) | 0).join(',')})`;
      ctx.fillRect(i * s, j * s, s, s);
      // 砖面轻微斑驳
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + r() * 0.05})`;
        ctx.beginPath(); ctx.ellipse(i * s + r() * s, j * s + r() * s, 8 + r() * 30, 6 + r() * 20, r() * 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    // 接缝
    ctx.strokeStyle = 'rgba(20,20,20,0.75)'; ctx.lineWidth = 3;
    for (let i = 0; i <= tiles; i++) {
      ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(w, i * s); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
    for (let i = 0; i <= tiles; i++) {
      ctx.beginPath(); ctx.moveTo(i * s + 2, 0); ctx.lineTo(i * s + 2, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * s + 2); ctx.lineTo(w, i * s + 2); ctx.stroke();
    }
    grain(ctx, w, h, 16, 9);
    return tex(c);
  });
}

/** 甬道御路图案地面：中央一条带莲花/云纹的条石带 */
export function pathPaving() {
  return cached('pathPaving', () => {
    const w = 256, h = 512;
    const [c, ctx] = canvas(w, h);
    ctx.fillStyle = '#6e6f70'; ctx.fillRect(0, 0, w, h);
    // 条石横缝
    ctx.strokeStyle = 'rgba(15,15,15,0.7)'; ctx.lineWidth = 3;
    for (let y = 0; y <= h; y += 128) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(40, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 40, 0); ctx.lineTo(w - 40, h); ctx.stroke();
    // 中央浮雕莲花（浅色线稿）
    ctx.strokeStyle = 'rgba(200,200,200,0.35)'; ctx.lineWidth = 2;
    for (let k = 0; k < 2; k++) {
      const cx = w / 2, cy = 128 + k * 256;
      for (let p = 0; p < 12; p++) {
        const a = (p / 12) * Math.PI * 2;
        ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40, 24, 10, a, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke();
    }
    grain(ctx, w, h, 14, 13);
    return tex(c);
  });
}

/** 汉白玉：淡灰白带细脉 */
export function marble() {
  return cached('marble', () => {
    const w = 256, h = 256;
    const [c, ctx] = canvas(w, h);
    ctx.fillStyle = '#e9e6df'; ctx.fillRect(0, 0, w, h);
    const r = rng(31);
    for (let i = 0; i < 24; i++) {
      ctx.strokeStyle = `rgba(150,150,145,${0.08 + r() * 0.12})`;
      ctx.lineWidth = 0.6 + r() * 1.2;
      ctx.beginPath();
      let x = r() * w, y = r() * h;
      ctx.moveTo(x, y);
      for (let k = 0; k < 10; k++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    grain(ctx, w, h, 10, 33);
    return tex(c);
  });
}

/** 青砖墙（错缝砌筑） */
export function brick() {
  return cached('brick', () => {
    const w = 256, h = 256;
    const [c, ctx] = canvas(w, h);
    ctx.fillStyle = '#4e5156'; ctx.fillRect(0, 0, w, h);
    const r = rng(41);
    const bh = 32, bw = 96;
    for (let row = 0; row < h / bh; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        const v = 0.85 + r() * 0.3;
        ctx.fillStyle = `rgb(${(82 * v) | 0},${(86 * v) | 0},${(92 * v) | 0})`;
        ctx.fillRect(x + off + 2, row * bh + 2, bw - 4, bh - 4);
      }
    }
    grain(ctx, w, h, 14, 43);
    return tex(c);
  });
}

/** 红墙抹灰（微斑驳） */
export function redPlaster() {
  return cached('redPlaster', () => {
    const w = 256, h = 256;
    const [c, ctx] = canvas(w, h);
    ctx.fillStyle = '#9a2b1f'; ctx.fillRect(0, 0, w, h);
    const r = rng(51);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? '120,40,30' : '170,70,55'},${0.08 + r() * 0.1})`;
      ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 10 + r() * 50, 8 + r() * 30, r() * 3, 0, Math.PI * 2); ctx.fill();
    }
    grain(ctx, w, h, 12, 53);
    return tex(c);
  });
}

/** 匾额：黑漆底、金字（横排，从右到左为传统，这里按参数） */
export function plaque(text, { w = 1024, h = 384, rtl = true, bg = '#15130f', fg = '#e8c05a', border = '#c9a040' } = {}) {
  return cached('plaque:' + text + rtl + bg, () => {
    const [c, ctx] = canvas(w, h);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // 金边与回纹边框
    ctx.strokeStyle = border; ctx.lineWidth = 14; ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.lineWidth = 4; ctx.strokeRect(40, 40, w - 80, h - 80);
    ctx.fillStyle = border;
    for (let x = 60; x < w - 60; x += 36) { ctx.fillRect(x, 20, 10, 10); ctx.fillRect(x, h - 30, 10, 10); }
    const chars = rtl ? [...text].reverse() : [...text];
    const n = chars.length;
    const size = Math.min(h * 0.62, (w - 160) / n * 0.9);
    ctx.font = `bold ${size}px "KaiTi","STKaiti","Kaiti SC","SimSun","Microsoft YaHei",serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = fg;
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3;
    chars.forEach((ch, i) => ctx.fillText(ch, w / 2 + (i - (n - 1) / 2) * size * 1.15, h / 2 + size * 0.04));
    return tex(c, { wrap: false });
  });
}

/** 对联（竖排）：text 竖向排列 */
export function couplet(text, { w = 256, h = 1536, bg = '#15130f', fg = '#e8c05a' } = {}) {
  return cached('couplet:' + text + bg, () => {
    const [c, ctx] = canvas(w, h);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c9a040'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, w - 20, h - 20);
    const chars = [...text];
    const n = chars.length;
    const size = Math.min(w * 0.7, (h - 100) / n * 0.86);
    ctx.font = `bold ${size}px "KaiTi","STKaiti","Kaiti SC","SimSun","Microsoft YaHei",serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = fg;
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
    chars.forEach((ch, i) => ctx.fillText(ch, w / 2, 60 + size * 0.55 + i * size * 1.1));
    return tex(c, { wrap: false });
  });
}

/**
 * 隔扇棂花：三交六椀菱花（六角网格）或步步锦。返回带透明通道的颜色贴图（透明处可透光）。
 * 用于一扇隔扇的棂心，贴图 uv 0..1 覆盖整个棂心。
 */
export function lattice(kind = 'sanjiao') {
  return cached('lattice:' + kind, () => {
    const w = 256, h = 512;
    const [c, ctx] = canvas(w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#7a1d14'; ctx.lineCap = 'round';
    if (kind === 'sanjiao') {
      // 三交六椀：三组平行线（0°、60°、120°）
      const sp = 28;
      ctx.lineWidth = 5;
      for (const ang of [0, Math.PI / 3, -Math.PI / 3]) {
        const dx = Math.cos(ang), dy = Math.sin(ang);
        const nx = -dy, ny = dx;
        for (let k = -40; k < 40; k++) {
          const ox = w / 2 + nx * k * sp, oy = h / 2 + ny * k * sp;
          ctx.beginPath(); ctx.moveTo(ox - dx * 1000, oy - dy * 1000); ctx.lineTo(ox + dx * 1000, oy + dy * 1000); ctx.stroke();
        }
      }
      // 交点处的“菱花”圆点（金）
      ctx.fillStyle = '#d9b24c';
      for (let k = -20; k < 20; k++) for (let j = -40; j < 40; j++) {
        const px = w / 2 + k * sp * 2 / Math.sqrt(3) * 1.5 + (j % 2 ? sp / Math.sqrt(3) * 1.5 : 0);
        const py = h / 2 + j * sp;
        if (px < -5 || px > w + 5 || py < -5 || py > h + 5) continue;
        ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // 步步锦：正交直棂加短横
      ctx.lineWidth = 6;
      for (let x = 0; x <= w; x += 42) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y <= h; y += 42) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.lineWidth = 4;
      for (let x = 21; x <= w; x += 42) for (let y = 21; y <= h; y += 42) {
        ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.stroke();
      }
    }
    const t = tex(c, { wrap: false });
    return t;
  });
}

/** 天花彩绘：方格内团龙/莲花图案（蓝绿底，金线） */
export function tianhua() {
  return cached('tianhua', () => {
    const w = 512, h = 512;
    const [c, ctx] = canvas(w, h);
    ctx.fillStyle = '#2f7d5c'; ctx.fillRect(0, 0, w, h);
    // 井口线（与井口枋对齐）
    ctx.strokeStyle = '#1b3d2e'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, w, h);
    // 圆光（蓝底金线团花）
    ctx.fillStyle = '#2c4f9c'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 150, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e2b84a'; ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 128, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#e2b84a';
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(w / 2 + Math.cos(a) * 80, h / 2 + Math.sin(a) * 80, 40, 16, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#8a2a1e'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 30, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e2b84a'; ctx.lineWidth = 3; ctx.stroke();
    // 岔角云（四角）
    ctx.fillStyle = '#e2b84a';
    for (const [x, y] of [[48, 48], [w - 48, 48], [48, h - 48], [w - 48, h - 48]]) {
      ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + (x < w / 2 ? 26 : -26), y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y + (y < h / 2 ? 26 : -26), 10, 0, Math.PI * 2); ctx.fill();
    }
    return tex(c);
  });
}

/** 泥土地面（墙外） */
export function earth() {
  return cached('earth', () => {
    const w = 512, h = 512;
    const [c, ctx] = canvas(w, h);
    ctx.fillStyle = '#5c5240'; ctx.fillRect(0, 0, w, h);
    const r = rng(61);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? '70,80,40' : '50,40,30'},${0.1 + r() * 0.25})`;
      ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 6 + r() * 40, 4 + r() * 20, r() * 3, 0, Math.PI * 2); ctx.fill();
    }
    grain(ctx, w, h, 20, 63);
    return tex(c);
  });
}

/** 树皮（松树）：竖向裂纹 */
export function bark() {
  return cached('bark', () => {
    const w = 256, h = 256;
    const [c, ctx] = canvas(w, h);
    ctx.fillStyle = '#5a4634'; ctx.fillRect(0, 0, w, h);
    const r = rng(71);
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = `rgba(20,12,8,${0.3 + r() * 0.4})`; ctx.lineWidth = 2 + r() * 4;
      ctx.beginPath();
      let x = r() * w; ctx.moveTo(x, 0);
      for (let y = 0; y <= h; y += 20) { x += (r() - 0.5) * 12; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(${r() > 0.5 ? '130,100,70' : '40,30,20'},${0.2 + r() * 0.3})`;
      ctx.fillRect(r() * w, r() * h, 6 + r() * 14, 10 + r() * 30);
    }
    grain(ctx, w, h, 20, 73);
    return tex(c);
  });
}

/** 经幡布：红/黄竖条，带经文暗纹 */
export function bannerCloth(color = '#b5261c') {
  return cached('banner:' + color, () => {
    const w = 128, h = 512;
    const [c, ctx] = canvas(w, h);
    ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(230,190,80,0.9)'; ctx.lineWidth = 4; ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = 'rgba(230,190,80,0.9)';
    ctx.font = 'bold 44px "KaiTi","STKaiti","SimSun",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const text = '南无阿弥陀佛';
    [...text].forEach((ch, i) => ctx.fillText(ch, w / 2, 70 + i * 62));
    return tex(c, { wrap: false });
  });
}

/** 门钉用的铜色（纯材质，无贴图）——保留接口以备扩展 */
export function solidColorTexture(hex) {
  return cached('solid:' + hex, () => {
    const [c, ctx] = canvas(4, 4);
    ctx.fillStyle = hex; ctx.fillRect(0, 0, 4, 4);
    return tex(c);
  });
}
