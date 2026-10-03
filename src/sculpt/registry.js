// 造像注册表：名称 → 构建函数（在 Worker 中执行）
import { seatedBuddha } from './statues/buddha.js';
import { heavenlyKing } from './statues/king.js';
import { maitreya } from './statues/maitreya.js';
import { arhat } from './statues/arhat.js';
import { guanyin } from './statues/guanyin.js';
import { monk } from './statues/monk.js';

export const STATUES = {
  seatedBuddha,
  heavenlyKing,
  maitreya,
  arhat,
  guanyin,
  monk,
};
