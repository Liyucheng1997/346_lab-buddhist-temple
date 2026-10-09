// 寺院中所有造像的清单：id → 生成器与参数（烘焙与运行时共用）
export const STATUE_LIST = [
  { id: 'maitreya', type: 'maitreya', params: {} },
  { id: 'weituo', type: 'heavenlyKing', params: { which: 'weituo' }, q: 1.5 },
  { id: 'king_east', type: 'heavenlyKing', params: { which: 'east' }, q: 1.5 },
  { id: 'king_south', type: 'heavenlyKing', params: { which: 'south' }, q: 1.5 },
  { id: 'king_west', type: 'heavenlyKing', params: { which: 'west' }, q: 1.5 },
  { id: 'king_north', type: 'heavenlyKing', params: { which: 'north' }, q: 1.5 },
  { id: 'buddha_sakyamuni', type: 'seatedBuddha', params: { mudra: 'varada' }, q: 1.1 },
  { id: 'buddha_bhaisajya', type: 'seatedBuddha', params: { mudra: 'bowl' }, q: 1.1 },
  { id: 'buddha_amitabha', type: 'seatedBuddha', params: { mudra: 'lotus' }, q: 1.1 },
  { id: 'kasyapa', type: 'monk', params: { which: 'kasyapa' }, q: 1.5 },
  { id: 'ananda', type: 'monk', params: { which: 'ananda' }, q: 1.5 },
  { id: 'guanyin', type: 'guanyin', params: {} },
  ...Array.from({ length: 18 }, (_, i) => ({ id: 'arhat_' + (i + 1), type: 'arhat', params: { index: i }, q: 1.7 })),
];
