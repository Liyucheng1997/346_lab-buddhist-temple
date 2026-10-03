// 造像色板。cls 决定渲染材质：gold 贴金（金属）、paint 矿物彩绘（哑光）、gloss 釉亮（宝珠/眼珠）、metal 铜铁。
const base = {
  skin: { color: '#ecc77e', cls: 'gold' },
  robe: { color: '#d9ad62', cls: 'gold' },
  robeEdge: { color: '#c49448', cls: 'gold' },
  robeIn: { color: '#e2b86c', cls: 'gold' },
  hair: { color: '#1a2a52', cls: 'paint' },          // 石青螺发
  hairBlack: { color: '#1a1714', cls: 'paint' },
  whiteHair: { color: '#e8e4da', cls: 'paint' },
  jewel: { color: '#c22a2a', cls: 'gloss' },
  eyeLine: { color: '#2a2018', cls: 'paint' },
  brow: { color: '#232a40', cls: 'paint' },
  lip: { color: '#b0665a', cls: 'paint' },
  urna: { color: '#f3ead8', cls: 'gloss' },
  mouth: { color: '#4a1512', cls: 'paint' },
  eyeWhite: { color: '#f2eee4', cls: 'gloss' },
  pupil: { color: '#0d0c0c', cls: 'gloss' },
  beads: { color: '#6b2a1a', cls: 'gloss' },
  gold: { color: '#e8c070', cls: 'gold' },
  rock: { color: '#6f6a60', cls: 'paint' },
  cloud: { color: '#e9e6df', cls: 'paint' },
  tiger: { color: '#d08a3a', cls: 'paint' },
  tigerStripe: { color: '#2a1a10', cls: 'paint' },
};

export function palette(over = {}) {
  const m = { ...base, ...over };
  return Object.entries(m).map(([name, v]) => ({ name, ...v }));
}

// 彩塑：肉身为肤色，衣袍为矿物色
export function paintedSkin(tone = '#e9c39b') {
  return { skin: { color: tone, cls: 'paint' } };
}
