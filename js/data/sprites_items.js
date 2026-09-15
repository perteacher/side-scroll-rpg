// 아이템 도트 스프라이트. 이미지 파일 없이 16x16 픽셀 격자를 코드로 정의한다.
// 한 글자 = 한 픽셀. '.'은 투명이고, 나머지 글자는 팔레트에서 색을 찾는다.
// 모양은 종류별로 한 번만 찍고, 티어·속성은 팔레트만 바꿔 입힌다(130여 종을 전부 따로 그리지 않는다).
//
// 공통 글자: k=외곽선  w/m/d=금속(밝음/중간/어두움)  h/j=나무(중간/어두움)  g=금장식  e=활시위

const PIXEL_BASE = { k: '#17151c', h: '#8d6e3a', j: '#5a4020', g: '#d4a017', e: '#e8e0c8' };

// 좌우 대칭 모양은 왼쪽 8칸만 적고 뒤집어 붙인다.
function mirrorRows(leftRows) {
  return leftRows.map((r) => r + r.split('').reverse().join(''));
}

// ---------- 티어 팔레트 ----------
const TIER_METAL = {
  1: { w: '#e3e8ec', m: '#8c96a0', d: '#4b545c' },
  2: { w: '#d6e6f5', m: '#6f8fb3', d: '#3a5270' },
  3: { w: '#d9f3e2', m: '#5fae7a', d: '#2f6a45' },
  4: { w: '#eadcfb', m: '#9b7ec4', d: '#5b4282' },
  5: { w: '#fff0b8', m: '#e0a83a', d: '#8a5a12' },
};
// 경갑: 가죽 바탕은 같고 장식(a)만 티어 색
const LEATHER = { l: '#c99a6b', n: '#9a6b43', o: '#5e3f26', z: '#2a2226' };
// 연갑: 옷감 색 자체가 티어마다 바뀐다
const TIER_CLOTH = {
  1: { c: '#d8d1c2', e: '#8f8676', f: '#5e574b' },
  2: { c: '#aac8e8', e: '#4f7fb0', f: '#2d4f73' },
  3: { c: '#b9e3c6', e: '#4c9a67', f: '#2c5e3e' },
  4: { c: '#d9c6f0', e: '#8a63b8', f: '#523574' },
  5: { c: '#f2b8a8', e: '#b8423a', f: '#6e211c' },
};
const ELEMENT_ORB = {
  flame: { o: '#e67e22', w: '#ffe3b3', d: '#9c4a0b' },
  frost: { o: '#5dade2', w: '#e4f4fd', d: '#21618c' },
  spark: { o: '#f4d03f', w: '#fffbe0', d: '#9a7d0a' },
};

// ---------- 모양 ----------
const ITEM_SHAPES = {
  // ===== 무기 =====
  sword: [
    '..............kk', '.............kwk', '............kwmk', '...........kwmk.',
    '..........kwmk..', '.........kwmk...', '........kwmk....', '.......kwmk.....',
    '..kk..kwmk......', '..kgkkwmk.......', '...kggmk........', '....kgk.........',
    '...kgkgk........', '..khk.kgk.......', '.khk...kk.......', '..k.............',
  ],
  dualblade: [
    '................', '.kk..........kk.', '.kwk........kwk.', '..kwk......kwk..',
    '...kwk....kwk...', '....kmk..kmk....', '.....kmkkmk.....', '......kmmk......',
    '......kmmk......', '.....kgkkgk.....', '....kgk..kgk....', '...khk....khk...',
    '..khk......khk..', '.kjk........kjk.', '.kk..........kk.', '................',
  ],
  spear: [
    '............kkk.', '...........kwwmk', '..........kwmmdk', '...........kmdk.',
    '..........kgkk..', '.........khk....', '........khk.....', '.......khk......',
    '......khk.......', '.....khk........', '....khk.........', '...khk..........',
    '..khk...........', '.kjk............', '.kk.............', '................',
  ],
  knuckle: [
    '................', '................', '................', '................',
    '..kkkkkkkkkkkk..', '.kwwkwwkwwkwwk..', '.kmdkmdkmdkmdk..', '.kkkkkkkkkkkkk..',
    '.kwmmmmmmmmmmdk.', '.kmmmmmmmmmmmdk.', '..kddddddddddk..', '...kkkkkkkkkk...',
    '................', '................', '................', '................',
  ],
  longbow: [
    '........kk......', '.......khkkk....', '......khk..e....', '.....khk...e....',
    '.....khk...e....', '....khk....e....', '....khk....e....', '....kgk....e....',
    '....kgk....e....', '....khk....e....', '....khk....e....', '.....khk...e....',
    '.....khk...e....', '......khk..e....', '.......khkkk....', '........kk......',
  ],
  crossbow: [
    '................', '................', '...........kk...', '..........khk...',
    '..........khk...', '.kkkkkkkkkkhkkk.', 'kjhhhhhhhhhwmmmk', 'kjjhhhhhhhhmddk.',
    '.kkkkjjkkkkhkkk.', '.....kjk..khk...', '......k...khk...', '..........kk....',
    '................', '................', '................', '................',
  ],
  musket: [
    '................', '................', '................', '................',
    '................', '....kkkkkkkkkkkk', 'kkkkhhhhhmmmmmwk', 'khhhhhhhhdddddkk',
    'kjjjhkkkkkkkkkk.', '.kkkkgk.........', '.....k..........', '................',
    '................', '................', '................', '................',
  ],
  staff: [
    '.........kkkk...', '........kowwok..', '........kooook..', '........kdoodk..',
    '.........kkkk...', '.........kgk....', '........khk.....', '.......khk......',
    '......khk.......', '.....khk........', '....khk.........', '...khk..........',
    '..khk...........', '.kjk............', '.kk.............', '................',
  ],

  // ===== 중갑 =====
  heavy_body: mirrorRows([
    '........', '........', '.kkkk...', 'kmmmmkkk', 'kmwmmmmm', 'kmmmmmmm', '.kkmmmmm', '..kmmmmm',
    '..kmwmmm', '..kmmmmm', '..kmmmmm', '..kggggg', '..kmmmmm', '..kmmmmm', '..kkkkkk', '........',
  ]),
  heavy_helm: mirrorRows([
    '........', '........', '.....kkk', '....kmmm', '...kmwmm', '..kmwmmm', '..kmmmmm', '.kmmmmmm',
    '.kkkkkkk', '.kmdddkk', '.kmmmmmk', '.kmmmmmm', '..kmmmmm', '...kkkkk', '........', '........',
  ]),
  // 신발은 좌우 대칭으로 뒤집으면 발끝이 서로 마주 봐서 어색하다. 두 짝을 같은 방향으로 찍는다.
  heavy_boots: [
    '................', '................', '................', '..kkkk....kkkk..',
    '..kggk....kggk..', '..kwmk....kwmk..', '..kmmk....kmmk..', '..kmmk....kmmk..',
    '..kmmk....kmmk..', '..kmmkk...kmmkk.', '..kmmmmk..kmmmmk', '..kwmmmk..kwmmmk',
    '..kddddk..kddddk', '..kkkkkk..kkkkkk', '................', '................',
  ],

  // ===== 경갑 =====
  light_body: mirrorRows([
    '........', '..kkk...', '.knnnk..', 'knlnnnkk', 'knlnnnna', 'knnnnnna', '.kknnnna', '..knnnna',
    '..knlnna', '..knnnna', '..kooooo', '..knnnnn', '..knnnnn', '..kkkkkk', '........', '........',
  ]),
  // 끝이 뾰족한 두건. 얼굴 자리는 그림자(z)로 비워 둔다.
  light_helm: mirrorRows([
    '........', '.......k', '......kn', '.....knn', '....knln', '...knlnn', '...knnnn', '..knnnkk',
    '..knnkzz', '..knnkzz', '..knnnkz', '.knnnnnk', 'knnaaaan', 'kkkkkkkk', '........', '........',
  ]),
  light_boots: [
    '................', '................', '................', '..kkkk....kkkk..',
    '..kaak....kaak..', '..klnk....klnk..', '..knnk....knnk..', '..knnk....knnk..',
    '..knnk....knnk..', '..knnkk...knnkk.', '..knnnnk..knnnnk', '..klnnnk..klnnnk',
    '..kooook..kooook', '..kkkkkk..kkkkkk', '................', '................',
  ],

  // ===== 연갑 =====
  cloth_body: mirrorRows([
    '........', '...kkkk.', '..keeeek', '.kecgeee', 'kecgeeee', 'keegeeee', '.kkgeeee', '..kgeeee',
    '..kgecee', '.kegeeee', '.kegeeee', 'keegeeee', 'keffgfff', 'kkkkkkkk', '........', '........',
  ]),
  cloth_helm: mirrorRows([
    '.......k', '......ke', '......ke', '.....kce', '.....kce', '....kcee', '....kcee', '...kceee',
    '...kgggg', '..kceeee', '.kkkkkkk', 'keeeeeee', 'kkkkkkkk', '........', '........', '........',
  ]),
  cloth_boots: [
    '................', '................', '................', '................',
    '................', '................', '................', '..kkkk....kkkk..',
    '..keck....keck..', '..keekk...keekk.', '..keeeek..keeeek', '..kceeek..kceeek',
    '..kffffk..kffffk', '..kkkkkk..kkkkkk', '................', '................',
  ],

  // ===== 재료 =====
  cloth: [
    '................', '................', '....kkkk.kkk....', '...keeeekeeek...',
    '..keceeeeeeek...', '..keeeeeeceek...', '.kkeeeeeeeeefk..', '.keeeeceeeeeefk.',
    '.keeeeeeeeeeefk.', '..keeeeeeeceefk.', '..keeeeeeeeeffk.', '...kfeeeeeefffk.',
    '...kkffkkfffkk..', '.....kk..kkk....', '................', '................',
  ],
  hide: [
    '................', '................', '..kk........kk..', '.knnk......knnk.',
    '..knnkkkkkknnk..', '...knnnlnnnnk...', '..knnnlnnnnnnk..', '..knnnnnnonnnk..',
    '..knnlnnnnnnnk..', '..knnnnnnnonnk..', '...knnnnnnnnk...', '..knnkkkkkknnk..',
    '.knnk......knnk.', '..kk........kk..', '................', '................',
  ],
  fang: [
    '................', '................', '..........kk....', '.........kwwk...',
    '.........kwwk...', '........kwwwk...', '........kwwmk...', '.......kwwmk....',
    '.......kwwmk....', '......kwwmk.....', '.....kwwmk......', '....kwmmk.......',
    '...kwmk.........', '...kkk..........', '................', '................',
  ],
  bone: [
    '................', '................', '..........kkk...', '.........kwwwk..',
    '.........kwwmk..', '........kwmkk...', '.......kwmk.....', '......kwmk......',
    '.....kwmk.......', '....kwmk........', '...kkwmk........', '..kwwmmk........',
    '..kwmmk.........', '...kkk..........', '................', '................',
  ],
  moss: [
    '................', '................', '................', '................',
    '................', '.....kkk........', '....kbbbk.kkk...', '...kbabbbkbbbk..',
    '..kbbbbabbbbabk.', '..kbabbbbbabbbk.', '.kbbbbbabbbbbbk.', '.kcbbbbbbbbabck.',
    '..kccccccccccck.', '...kkkkkkkkkkk..', '................', '................',
  ],
  core: [
    '................', '................', '................', '.....kkkkkk.....',
    '...kkssssssk....', '..ksssrsssssk...', '.kssrrrsssssk...', '.kssryyrssstk...',
    '.kssryyrssstk...', '.ksssrrsssstk...', '..kssssssttk....', '...ktssstttk....',
    '....kkkkkkk.....', '................', '................', '................',
  ],
  coin: mirrorRows([
    '........', '........', '.....kkk', '....kwww', '...kwwmm', '..kwmmmm', '..kwmmkm', '..kwmmmm',
    '..kwmmmk', '..kdmmkm', '..kddmmm', '...kddmm', '....kddd', '.....kkk', '........', '........',
  ]),
  timber: [
    '................', '................', '................', '................',
    '....b.....b.....', '...kkkkkkkkkkk..', '..khhhhhhhhhhkk.', '.khjhhhjhhhhkrrk',
    '.khhhhhhhjhhkrqk', '.khhhjhhhhhhkrrk', '..kjjjjjjjjjjkk.', '...kkkkkkkkkkk..',
    '......b.........', '................', '................', '................',
  ],
  pearl: [
    '................', '................', '................', '......kkkk......',
    '....kkppppkk....', '...kpwwppppqk...', '..kpwwpppppqqk..', '..kpwppppppqqk..',
    '..kpppppppqqqk..', '..kpppppppqqqk..', '...kppppqqqqk...', '....kkqqqqkk....',
    '......kkkk......', '................', '................', '................',
  ],
  scale: mirrorRows([
    '........', '........', '.......k', '......ks', '.....ksw', '....kssw', '...ksssw', '..kssssw',
    '..ksssst', '...kssst', '....ksst', '.....kst', '......kt', '.......k', '........', '........',
  ]),
  fragment: [
    '................', '................', '................', '...kkkkkk.......',
    '..krrrrrrkk.....', '..krrcrrrrk.....', '.krrccrrrrrrk...', '.krrrcrrcrrrk...',
    '.krrrrrccrrrrk..', '.kurrrrrrcrrrk..', '..kuurrrrrrrk...', '...kuuuurrkk....',
    '....kkkkkk......', '................', '................', '................',
  ],
  gear: mirrorRows([
    '........', '......kk', '..kk..kg', '..kgkkgg', '...kgwgg', '.kkggggk', 'kgggggk.', 'kggggk..',
    'kggggk..', 'kgggggk.', '.kkggggk', '...kgggg', '..kgkkgg', '..kk..kg', '......kk', '........',
  ]),
  horn: [
    '................', '.............kk.', '............kwk.', '...........kwmk.',
    '..........kwmk..', '.........kwmmk..', '........kwmmk...', '.......kwmmdk...',
    '......kwmmdk....', '.....kwmmddk....', '....kwmmddk.....', '...kmmmddk......',
    '..kmmdddk.......', '..kkkkkk........', '................', '................',
  ],
  crystal: mirrorRows([
    '........', '.......k', '......kw', '.....kwv', '....kwvv', '...kwvvv', '...kvvvv', '..kvvvvx',
    '..kvvvxx', '..kvvxxx', '...kvxxx', '....kxxx', '.....kxx', '......kx', '.......k', '........',
  ]),

  // ===== 제작품(퀘스트 납품) =====
  charm: mirrorRows([
    '........', '....kkkk', '....kppp', '....kprr', '....kppr', '....kprr', '....kppr', '....kprp',
    '....kppr', '....kprr', '....kppp', '....kkkk', '......kr', '.......r', '........', '........',
  ]),
  compass: [
    '................', '................', '.....kkkkkk.....', '....kggggggk....',
    '...kgccccccgk...', '..kgcccccrccgk..', '..kgccccrrccgk..', '..kgcccrrcccgk..',
    '..kgccbbccccgk..', '..kgcbbcccccgk..', '..kgccccccccgk..', '...kgccccccgk...',
    '....kggggggk....', '.....kkkkkk.....', '................', '................',
  ],
  key: [
    '................', '................', '..........kkkk..', '.........kgwggk.',
    '.........kgkkgk.', '.........kgkkgk.', '.........kggggk.', '........kgkkkk..',
    '.......kgk......', '......kgk.......', '.....kgk........', '....kgkgk.......',
    '...kgk.kgk......', '..kgkgk.k.......', '...k.k..........', '................',
  ],
  flag: [
    '................', '..kk............', '..kgkkkkkkkkk...', '..khkwwwwwwwk...',
    '..khkwwyywwwk...', '..khkwyyyywwwk..', '..khkwwyywwwk...', '..khkwwyywwk....',
    '..khkwwwwwk.....', '..khkkwkwk......', '..khk.k.k.......', '..khk...........',
    '..khk...........', '..khk...........', '..kjk...........', '..kk............',
  ],

  // ===== 소모품 =====
  potion: mirrorRows([
    '........', '......kk', '......kb', '......kk', '.......k', '......kw', '.....kwl', '....kwll',
    '...kwlll', '...kllll', '...kdlll', '...kddll', '....kddd', '.....kkk', '........', '........',
  ]),
  card: mirrorRows([
    '........', '..kkkkkk', '..kzzzzz', '..kzcccc', '..kzcccc', '..kzccee', '..kzceee', '..kzceee',
    '..kzccee', '..kzcccc', '..kzcccc', '..kzcttt', '..kzcccc', '..kzzzzz', '..kkkkkk', '........',
  ]),
  book: [
    '................', '................', '...kkkkkkkkkk...', '..kbbbbbbbbbbk..',
    '..kbaaaaaaaabpk.', '..kbabbbbbbabpk.', '..kbabyybbbabpk.', '..kbabyyybbabpk.',
    '..kbabbyybbabpk.', '..kbabbbbbbabpk.', '..kbaaaaaaaabpk.', '..kbbbbbbbbbbpk.',
    '..kkkkkkkkkkkpk.', '...kppppppppppk.', '....kkkkkkkkkkk.', '................',
  ],

  // 정의되지 않은 아이템용
  unknown: mirrorRows([
    '........', '........', '..kkkkkk', '..kppppp', '..kppkkk', '..kppppp', '..kppppk', '..kpppkk',
    '..kpppkp', '..kppppp', '..kpppkk', '..kppppp', '..kkkkkk', '........', '........', '........',
  ]),
};

// ---------- 아이템 → 모양 + 팔레트 ----------
const STANCE_SHAPE = {
  sword: 'sword', dualblade: 'dualblade', spear: 'spear', fist: 'knuckle',
  longbow: 'longbow', crossbow: 'crossbow', musket: 'musket',
  flame: 'staff', frost: 'staff', spark: 'staff',
};

const MATERIAL_SPRITES = {
  bandit_cloth: { shape: 'cloth', pal: { c: '#b5a58a', e: '#86775f', f: '#574b3a' } },
  beast_hide: { shape: 'hide', pal: { l: '#c49a6c', n: '#95693f', o: '#5b3b22' } },
  wolf_fang: { shape: 'fang', pal: { w: '#f5ecd6', m: '#c9b88f' } },
  bone_shard: { shape: 'bone', pal: { w: '#efe8d6', m: '#b8ad92' } },
  grave_moss: { shape: 'moss', pal: { a: '#9fd08a', b: '#5e8f4c', c: '#35572b' } },
  stone_core: { shape: 'core', pal: { s: '#8d8a80', t: '#5b5850', r: '#d35400', y: '#f7dc6f' } },
  pirate_coin: { shape: 'coin', pal: { w: '#f2f3f4', m: '#b9bec4', d: '#6f767d' } },
  wet_timber: { shape: 'timber', pal: { r: '#c8a46a', q: '#8d6e3a', b: '#5dade2' } },
  deep_pearl: { shape: 'pearl', pal: { p: '#e8e4f3', w: '#ffffff', q: '#a79cc6' } },
  sand_scale: { shape: 'scale', pal: { s: '#d9b25f', w: '#f7e3a8', t: '#9a7a33' } },
  relic_fragment: { shape: 'fragment', pal: { r: '#c2ab7f', u: '#8a7550', c: '#48c9b0' } },
  ancient_gear: { shape: 'gear', pal: { g: '#b07a3a', w: '#e8b878' } },
  demon_horn: { shape: 'horn', pal: { w: '#c98a73', m: '#7b2d26', d: '#3d1210' } },
  dark_crystal: { shape: 'crystal', pal: { v: '#6c3483', w: '#c39bd3', x: '#2e1437' } },
  war_banner_scrap: { shape: 'cloth', pal: { c: '#d65a4a', e: '#9e2f24', f: '#5c1812' } },
};

const SPECIAL_SPRITES = {
  sturdy_blade: { shape: 'sword', pal: TIER_METAL[2] },
  ward_charm: { shape: 'charm', pal: { p: '#f4e3a1', r: '#c0392b' } },
  sea_compass: { shape: 'compass', pal: { g: '#c9a227', c: '#f5ecd6', r: '#e74c3c', b: '#2e86c1' } },
  relic_key: { shape: 'key', pal: { g: '#d4a017', w: '#fff0b8' } },
  holy_banner: { shape: 'flag', pal: { w: '#f8f9f9', y: '#d4a017' } },
  hp_potion: { shape: 'potion', pal: { l: '#e74c3c', w: '#fde2df', d: '#922b21', b: '#8d6e3a' } },
  mp_potion: { shape: 'potion', pal: { l: '#3498db', w: '#d6eaf8', d: '#1f5f8b', b: '#8d6e3a' } },
  exp_card_basic: { shape: 'card', pal: { z: '#b9770e', c: '#f7dc6f', e: '#ffffff', t: '#7d6608' } },
  exp_card_veteran: { shape: 'card', pal: { z: '#1f618d', c: '#85c1e9', e: '#ffffff', t: '#154360' } },
  exp_card_expert: { shape: 'card', pal: { z: '#6c3483', c: '#c39bd3', e: '#ffffff', t: '#4a235a' } },
  exp_card_master: { shape: 'card', pal: { z: '#922b21', c: '#f1948a', e: '#fff3c4', t: '#641e16' } },
  stance_card_basic: { shape: 'book', pal: { b: '#1e8449', a: '#82e0aa', p: '#f5ecd6', y: '#f7dc6f' } },
  stance_card_high: { shape: 'book', pal: { b: '#5b2c6f', a: '#d4a017', p: '#f5ecd6', y: '#f7dc6f' } },
};

// 캐릭터가 손에 쥘 때 쓰는 정보. gx/gy = 아이콘 안에서 손잡이 위치, angle = 기본 기울기,
// swing = 공격 시 휘두르는 폭(0이면 휘두르지 않고 반동만 준다 — 활·총).
const WEAPON_GRIP = {
  sword: { gx: 3, gy: 13, angle: 0, swing: 1 },
  dualblade: { gx: 7, gy: 10, angle: 0, swing: 1 },
  spear: { gx: 5, gy: 10, angle: 0.1, swing: 0.6 },
  knuckle: { gx: 7, gy: 8, angle: 0, swing: 0.4 },
  longbow: { gx: 5, gy: 8, angle: 0, swing: 0 },
  crossbow: { gx: 6, gy: 7, angle: 0, swing: 0 },
  musket: { gx: 6, gy: 7, angle: 0, swing: 0 },
  staff: { gx: 6, gy: 9, angle: 0, swing: 0.5 },
};

// 아이템 id → { shape, pal } (팔레트 키도 함께 돌려 캐시에 쓴다)
function itemSpriteSpec(itemId) {
  const item = ITEM_DATA[itemId];
  if (!item) return { shape: 'unknown', pal: { p: '#7f8c8d' }, key: 'unknown' };
  if (SPECIAL_SPRITES[itemId]) return { ...SPECIAL_SPRITES[itemId], key: itemId };
  if (MATERIAL_SPRITES[itemId]) return { ...MATERIAL_SPRITES[itemId], key: itemId };

  const tier = item.tier || 1;
  if (item.slot === 'weapon') {
    const shape = STANCE_SHAPE[item.stanceId] || 'sword';
    const pal = shape === 'staff' ? { ...TIER_METAL[tier], ...ELEMENT_ORB[item.stanceId] } : TIER_METAL[tier];
    return { shape, pal, key: `w:${item.stanceId}:${tier}` };
  }
  if (item.slot) {
    const slotShape = { armor: 'body', helmet: 'helm', boots: 'boots' }[item.slot];
    const shape = `${item.armorClass}_${slotShape}`;
    let pal;
    if (item.armorClass === 'heavy') pal = TIER_METAL[tier];
    else if (item.armorClass === 'light') pal = { ...LEATHER, a: TIER_COLOR[tier] };
    else pal = TIER_CLOTH[tier];
    return { shape, pal, key: `a:${shape}:${tier}` };
  }
  return { shape: 'unknown', pal: { p: TIER_COLOR[tier] || '#7f8c8d' }, key: `u:${tier}` };
}
