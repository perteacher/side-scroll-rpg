// 잡템(재료) · 제작품 · 소모품 정의. 잡템은 상점에 팔거나 제작/퀘스트 재료로 쓴다.
const ITEM_DATA = {
  // --- 1티어 재료 ---
  bandit_cloth: { name: '도적의 천조각', price: 12, tier: 1 },
  beast_hide: { name: '짐승 가죽', price: 14, tier: 1 },
  wolf_fang: { name: '늑대 송곳니', price: 20, tier: 1 },
  // --- 2티어 재료 ---
  bone_shard: { name: '뼛조각', price: 30, tier: 2 },
  grave_moss: { name: '무덤 이끼', price: 34, tier: 2 },
  stone_core: { name: '석심 조각', price: 48, tier: 2 },
  // --- 3티어 재료 ---
  pirate_coin: { name: '해적의 은화', price: 70, tier: 3 },
  wet_timber: { name: '젖은 선재', price: 62, tier: 3 },
  deep_pearl: { name: '심해 진주', price: 96, tier: 3 },
  // --- 4티어 재료 ---
  sand_scale: { name: '사막 비늘', price: 130, tier: 4 },
  relic_fragment: { name: '유물 파편', price: 165, tier: 4 },
  ancient_gear: { name: '고대 기어', price: 190, tier: 4 },
  // --- 5티어 재료 ---
  demon_horn: { name: '마족의 뿔', price: 240, tier: 5 },
  dark_crystal: { name: '흑정석', price: 300, tier: 5 },
  war_banner_scrap: { name: '찢긴 군기', price: 270, tier: 5 },

  // --- 제작품(퀘스트 납품용) ---
  sturdy_blade: { name: '튼튼한 검', price: 0, tier: 1, craft: true },
  ward_charm: { name: '퇴마 부적', price: 0, tier: 2, craft: true },
  sea_compass: { name: '항해 나침반', price: 0, tier: 3, craft: true },
  relic_key: { name: '유물 열쇠', price: 0, tier: 4, craft: true },
  holy_banner: { name: '성화 군기', price: 0, tier: 5, craft: true },

  // --- 무기 (slot: weapon) ---
  // stanceId를 가진 캐릭터만 장착할 수 있고, 장착하면 그 스탠스를 쓸 수 있게 된다.
  w_sword: { name: '입문용 장검', slot: 'weapon', stanceId: 'sword', atk: 12, price: 90, tier: 1 },
  w_dualblade: { name: '한 쌍의 단검', slot: 'weapon', stanceId: 'dualblade', atk: 10, price: 90, tier: 1 },
  w_spear: { name: '보병용 창', slot: 'weapon', stanceId: 'spear', atk: 13, price: 95, tier: 1 },
  w_fist: { name: '강화 너클', slot: 'weapon', stanceId: 'fist', atk: 9, price: 85, tier: 1 },
  w_longbow: { name: '사냥용 장궁', slot: 'weapon', stanceId: 'longbow', atk: 12, price: 95, tier: 1 },
  w_crossbow: { name: '경량 석궁', slot: 'weapon', stanceId: 'crossbow', atk: 13, price: 95, tier: 1 },
  w_musket: { name: '구형 머스킷', slot: 'weapon', stanceId: 'musket', atk: 15, price: 110, tier: 1 },
  w_flame: { name: '화염 지팡이', slot: 'weapon', stanceId: 'flame', atk: 14, price: 105, tier: 1 },
  w_frost: { name: '서리 지팡이', slot: 'weapon', stanceId: 'frost', atk: 14, price: 105, tier: 1 },
  w_spark: { name: '전격 지팡이', slot: 'weapon', stanceId: 'spark', atk: 14, price: 105, tier: 1 },

  // --- 방어구 (중갑/경갑/연갑) ---
  a_heavy_body: { name: '사슬 갑옷', slot: 'armor', armorClass: 'heavy', def: 18, price: 120, tier: 1 },
  a_heavy_helm: { name: '철 투구', slot: 'helmet', armorClass: 'heavy', def: 8, price: 70, tier: 1 },
  a_heavy_boots: { name: '철 각반', slot: 'boots', armorClass: 'heavy', def: 6, price: 60, tier: 1 },
  a_light_body: { name: '가죽 흉갑', slot: 'armor', armorClass: 'light', def: 12, price: 110, tier: 1 },
  a_light_helm: { name: '가죽 두건', slot: 'helmet', armorClass: 'light', def: 5, price: 65, tier: 1 },
  a_light_boots: { name: '가죽 장화', slot: 'boots', armorClass: 'light', def: 5, price: 58, tier: 1 },
  a_cloth_body: { name: '수련자 로브', slot: 'armor', armorClass: 'cloth', def: 8, price: 105, tier: 1 },
  a_cloth_helm: { name: '천 모자', slot: 'helmet', armorClass: 'cloth', def: 3, price: 60, tier: 1 },
  a_cloth_boots: { name: '천 신발', slot: 'boots', armorClass: 'cloth', def: 3, price: 55, tier: 1 },

  // --- 경험치 카드 (퀘스트 보상) ---
  // consumable: 'exp' 는 캐릭터 경험치, 'stanceExp' 는 현재 스탠스 숙련도에 들어간다.
  exp_card_basic: { name: '경험치 카드', price: 400, tier: 1, consumable: 'exp', amount: 5000 },
  exp_card_veteran: { name: '베테랑 경험치 카드', price: 4000, tier: 3, consumable: 'exp', amount: 300000, minTier: 'veteran' },
  exp_card_expert: { name: '익스퍼트 경험치 카드', price: 20000, tier: 4, consumable: 'exp', amount: 2000000, minTier: 'expert' },
  exp_card_master: { name: '마스터 경험치 카드', price: 90000, tier: 5, consumable: 'exp', amount: 12000000, minTier: 'master' },
  stance_card_basic: { name: '스탠스 수련서', price: 350, tier: 1, consumable: 'stanceExp', amount: 600 },
  stance_card_high: { name: '고급 스탠스 수련서', price: 3000, tier: 4, consumable: 'stanceExp', amount: 6000 },

  // --- 소모품 ---
  hp_potion: { name: 'HP 물약', price: 60, buyPrice: 120, tier: 1, consumable: 'hp', power: 0.5 },
  mp_potion: { name: 'MP 물약', price: 60, buyPrice: 120, tier: 1, consumable: 'mp', power: 0.5 },
};

// 몹 이름 → 드랍 테이블
const DROP_TABLE = {
  '숲도적': [{ id: 'bandit_cloth', chance: 0.6 }],
  '들토끼': [{ id: 'beast_hide', chance: 0.55 }],
  '회색늑대': [{ id: 'wolf_fang', chance: 0.5 }, { id: 'beast_hide', chance: 0.3 }],
  '산양': [{ id: 'beast_hide', chance: 0.6 }],
  '해골병사': [{ id: 'bone_shard', chance: 0.55 }],
  '석공 좀비': [{ id: 'bone_shard', chance: 0.4 }, { id: 'stone_core', chance: 0.25 }],
  '망령': [{ id: 'grave_moss', chance: 0.55 }],
  '채석골렘': [{ id: 'stone_core', chance: 0.5 }],
  '해적 약탈자': [{ id: 'pirate_coin', chance: 0.55 }],
  '부두 짐꾼': [{ id: 'wet_timber', chance: 0.55 }],
  '수중 망령': [{ id: 'deep_pearl', chance: 0.4 }, { id: 'wet_timber', chance: 0.3 }],
  '난파선 게': [{ id: 'deep_pearl', chance: 0.45 }],
  '사막 도적': [{ id: 'sand_scale', chance: 0.5 }],
  '모래 전갈': [{ id: 'sand_scale', chance: 0.55 }],
  '유적 수호자': [{ id: 'relic_fragment', chance: 0.5 }, { id: 'ancient_gear', chance: 0.25 }],
  '잠든 석상': [{ id: 'ancient_gear', chance: 0.45 }],
  '마족 척후병': [{ id: 'demon_horn', chance: 0.5 }],
  '마족 주술노예': [{ id: 'dark_crystal', chance: 0.35 }],
  '마족 전사': [{ id: 'demon_horn', chance: 0.45 }, { id: 'war_banner_scrap', chance: 0.3 }],
  '마족 대장': [{ id: 'dark_crystal', chance: 1.0 }, { id: 'war_banner_scrap', chance: 0.8 }],
};

// 제작법: 재료 + 골드 → 결과물
const RECIPE_DATA = [
  { id: 'sturdy_blade', result: 'sturdy_blade', gold: 120, tier: 1,
    materials: [{ id: 'bandit_cloth', count: 4 }, { id: 'beast_hide', count: 3 }] },
  { id: 'ward_charm', result: 'ward_charm', gold: 350, tier: 2,
    materials: [{ id: 'bone_shard', count: 5 }, { id: 'grave_moss', count: 4 }] },
  { id: 'sea_compass', result: 'sea_compass', gold: 800, tier: 3,
    materials: [{ id: 'pirate_coin', count: 5 }, { id: 'wet_timber', count: 4 }, { id: 'deep_pearl', count: 2 }] },
  { id: 'relic_key', result: 'relic_key', gold: 1600, tier: 4,
    materials: [{ id: 'relic_fragment', count: 6 }, { id: 'ancient_gear', count: 3 }, { id: 'sand_scale', count: 4 }] },
  { id: 'holy_banner', result: 'holy_banner', gold: 3200, tier: 5,
    materials: [{ id: 'demon_horn', count: 6 }, { id: 'dark_crystal', count: 3 }, { id: 'war_banner_scrap', count: 4 }] },
  { id: 'hp_potion', result: 'hp_potion', gold: 80, tier: 1,
    materials: [{ id: 'beast_hide', count: 1 }] },
  { id: 'mp_potion', result: 'mp_potion', gold: 80, tier: 1,
    materials: [{ id: 'grave_moss', count: 1 }] },
];

const SHOP_STOCK = ['hp_potion', 'mp_potion'];

// ===== 2~5티어 장비 생성 =====
// 1티어는 생성 시 기본 지급품이고, 상위 티어는 몹 드랍과 제작으로만 얻는다.
// 티어별 표시 색. 드랍 연출과 목록에서 등급을 한눈에 구분한다.
const TIER_COLOR = { 1: '#bdc3c7', 2: '#5dade2', 3: '#58d68d', 4: '#bb8fce', 5: '#f5b041' };

const EQUIP_TIER_PREFIX = { 2: '강철', 3: '정예', 4: '고대', 5: '마력' };

function weaponNoun(stanceId) {
  const b = WEAPON_BASES.find((w) => w.stanceId === stanceId);
  return b ? b.noun : '무기';
}
const EQUIP_TIER_SCALE = { 2: 2.5, 3: 5.5, 4: 10, 5: 17 };

const WEAPON_BASES = [
  { stanceId: 'sword', key: 'w_sword', noun: '장검' },
  { stanceId: 'dualblade', key: 'w_dualblade', noun: '쌍단검' },
  { stanceId: 'spear', key: 'w_spear', noun: '창' },
  { stanceId: 'fist', key: 'w_fist', noun: '너클' },
  { stanceId: 'longbow', key: 'w_longbow', noun: '장궁' },
  { stanceId: 'crossbow', key: 'w_crossbow', noun: '석궁' },
  { stanceId: 'musket', key: 'w_musket', noun: '머스킷' },
  { stanceId: 'flame', key: 'w_flame', noun: '화염 지팡이' },
  { stanceId: 'frost', key: 'w_frost', noun: '서리 지팡이' },
  { stanceId: 'spark', key: 'w_spark', noun: '전격 지팡이' },
];

const ARMOR_BASES = [
  { key: 'a_heavy_body', armorClass: 'heavy', slot: 'armor', noun: '갑옷' },
  { key: 'a_heavy_helm', armorClass: 'heavy', slot: 'helmet', noun: '투구' },
  { key: 'a_heavy_boots', armorClass: 'heavy', slot: 'boots', noun: '각반' },
  { key: 'a_light_body', armorClass: 'light', slot: 'armor', noun: '흉갑' },
  { key: 'a_light_helm', armorClass: 'light', slot: 'helmet', noun: '두건' },
  { key: 'a_light_boots', armorClass: 'light', slot: 'boots', noun: '장화' },
  { key: 'a_cloth_body', armorClass: 'cloth', slot: 'armor', noun: '로브' },
  { key: 'a_cloth_helm', armorClass: 'cloth', slot: 'helmet', noun: '모자' },
  { key: 'a_cloth_boots', armorClass: 'cloth', slot: 'boots', noun: '신발' },
];

// 티어별 재료 (제작에 사용)
const TIER_MATERIALS = {
  1: ['bandit_cloth', 'beast_hide', 'wolf_fang'],
  2: ['bone_shard', 'grave_moss', 'stone_core'],
  3: ['pirate_coin', 'wet_timber', 'deep_pearl'],
  4: ['sand_scale', 'relic_fragment', 'ancient_gear'],
  5: ['demon_horn', 'dark_crystal', 'war_banner_scrap'],
};

[2, 3, 4, 5].forEach((tier) => {
  const scale = EQUIP_TIER_SCALE[tier];
  const prefix = EQUIP_TIER_PREFIX[tier];
  WEAPON_BASES.forEach((base) => {
    const t1 = ITEM_DATA[base.key];
    ITEM_DATA[`${base.key}_t${tier}`] = {
      name: `${prefix} ${base.noun}`, slot: 'weapon', stanceId: base.stanceId,
      atk: Math.round(t1.atk * scale), price: Math.round(t1.price * scale * 1.6), tier,
    };
  });
  ARMOR_BASES.forEach((base) => {
    const t1 = ITEM_DATA[base.key];
    ITEM_DATA[`${base.key}_t${tier}`] = {
      name: `${prefix} ${base.noun}`, slot: base.slot, armorClass: base.armorClass,
      def: Math.round(t1.def * scale), price: Math.round(t1.price * scale * 1.6), tier,
    };
  });
});

// 티어별 장비 풀 (드랍 추첨용)
const EQUIP_POOL_BY_TIER = {};
[1, 2, 3, 4, 5].forEach((tier) => {
  EQUIP_POOL_BY_TIER[tier] = Object.keys(ITEM_DATA)
    .filter((id) => ITEM_DATA[id].slot && ITEM_DATA[id].tier === tier);
});

const EQUIP_DROP_CHANCE = 0.07;

function rollEquipmentDrop(tier) {
  if (Math.random() > EQUIP_DROP_CHANCE) return null;
  const pool = EQUIP_POOL_BY_TIER[tier] || [];
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// 존 권장 레벨 → 티어
function tierFromLevel(level) {
  if (level < 10) return 1;
  if (level < 20) return 2;
  if (level < 30) return 3;
  if (level < 40) return 4;
  return 5;
}

// 모든 장비에 제작법 추가 (재료는 해당 티어 재료 2종)
[1, 2, 3, 4, 5].forEach((tier) => {
  const mats = TIER_MATERIALS[tier];
  EQUIP_POOL_BY_TIER[tier].forEach((itemId) => {
    const item = ITEM_DATA[itemId];
    const isWeapon = item.slot === 'weapon';
    RECIPE_DATA.push({
      id: `craft_${itemId}`,
      result: itemId,
      gold: Math.round(item.price * 1.5),
      tier,
      equipment: true,
      materials: isWeapon
        ? [{ id: mats[0], count: 6 }, { id: mats[2], count: 3 }]
        : [{ id: mats[1], count: 5 }, { id: mats[0], count: 3 }],
    });
  });
});

// ===== 강화 / 인챈트 =====
const MAX_ENHANCE = 10;
const ENHANCE_STEP = 0.12; // 강화 1단계당 기본 성능 +12%

// 단계별 성공률. 실패하면 파괴되지 않고 한 단계 떨어진다(+4 미만으로는 하락 없음).
function enhanceChance(plus) {
  if (plus < 3) return 1;
  if (plus < 6) return 0.7;
  if (plus < 8) return 0.5;
  return 0.3;
}

function enhanceCost(item, plus) {
  const mats = TIER_MATERIALS[item.tier] || TIER_MATERIALS[1];
  return {
    gold: Math.round(item.price * 0.6 * (plus + 1)),
    materials: [{ id: mats[0], count: 2 + plus }],
  };
}

const ENCHANT_DATA = [
  { id: 'sharp', name: '날카로운', stat: 'atk', pct: 0.10 },
  { id: 'brutal', name: '흉폭한', stat: 'atk', pct: 0.18 },
  { id: 'solid', name: '견고한', stat: 'def', pct: 0.10 },
  { id: 'immortal', name: '불멸의', stat: 'def', pct: 0.18 },
  { id: 'precise', name: '정밀한', stat: 'crit', value: 5 },
  { id: 'deadly', name: '치명적인', stat: 'crit', value: 9 },
  { id: 'vital', name: '활력의', stat: 'hp', pct: 0.08 },
];

function enchantCost(item) {
  const mats = TIER_MATERIALS[item.tier] || TIER_MATERIALS[1];
  return {
    gold: Math.round(item.price * 1.2),
    materials: [{ id: mats[1], count: 3 }, { id: mats[2], count: 2 }],
  };
}

function rollEnchant() {
  return ENCHANT_DATA[Math.floor(Math.random() * ENCHANT_DATA.length)];
}

// 장비 슬롯과 방어구 등급
const EQUIP_SLOTS = ['weapon1', 'weapon2', 'armor', 'helmet', 'boots'];
const WEAPON_SLOTS = ['weapon1', 'weapon2'];

// 무기 세트(장비교체등록): 무기 조합을 3벌까지 등록해두고 전투 중 1/2/3 키로 갈아낀다.
// 세트마다 스탠스가 달라지므로, 교체 자체가 전투 중 스탠스 전환 수단이 된다.
const WEAPON_SET_COUNT = 3;
const WEAPON_SWAP_COOLDOWN_MS = 2500; // 세트 교체 재사용 대기
const WEAPON_SWAP_LOCK_MS = 350;      // 교체 직후 공격 경직
const SLOT_LABEL = { weapon1: '주무기', weapon2: '보조무기', armor: '갑옷', helmet: '투구', boots: '신발' };
const ARMOR_CLASS_LABEL = { heavy: '중갑', light: '경갑', cloth: '연갑' };

// 공격 타입별 방어구 등급: 근접=중갑 / 원거리=경갑 / 마법=연갑
const ARMOR_CLASS_BY_TYPE = { melee: 'heavy', ranged: 'light', magic: 'cloth' };

// 스탠스별 기본 지급 무기
const STARTER_WEAPON_BY_STANCE = {
  sword: 'w_sword', dualblade: 'w_dualblade', spear: 'w_spear', fist: 'w_fist',
  longbow: 'w_longbow', crossbow: 'w_crossbow', musket: 'w_musket',
  flame: 'w_flame', frost: 'w_frost', spark: 'w_spark',
};

// 방어구 등급별 기본 지급 세트
const STARTER_ARMOR_SET = {
  heavy: { armor: 'a_heavy_body', helmet: 'a_heavy_helm', boots: 'a_heavy_boots' },
  light: { armor: 'a_light_body', helmet: 'a_light_helm', boots: 'a_light_boots' },
  cloth: { armor: 'a_cloth_body', helmet: 'a_cloth_helm', boots: 'a_cloth_boots' },
};
