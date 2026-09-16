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

  // --- 큐브 (잠재능력 재설정) ---
  suspicious_cube: { name: '수상한 큐브', price: 800, buyPrice: 3000, tier: 2, cube: true },
  craftsman_cube: { name: '장인의 큐브', price: 3000, tier: 3, cube: true },
  master_cube: { name: '명장의 큐브', price: 12000, tier: 5, cube: true },

  // --- 소모품 ---
  hp_potion: { name: 'HP 물약', price: 60, buyPrice: 120, tier: 1, consumable: 'hp', power: 0.5 },
  mp_potion: { name: 'MP 물약', price: 60, buyPrice: 120, tier: 1, consumable: 'mp', power: 0.5 },
  hp_potion_large: { name: '고급 HP 물약', price: 220, buyPrice: 440, tier: 3, consumable: 'hp', power: 0.9 },
  mp_potion_large: { name: '고급 MP 물약', price: 220, buyPrice: 440, tier: 3, consumable: 'mp', power: 0.9 },
  antidote: { name: '만병통치약', price: 180, buyPrice: 360, tier: 2, consumable: 'cure' },
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
  { id: 'hp_potion_large', result: 'hp_potion_large', gold: 300, tier: 3,
    materials: [{ id: 'beast_hide', count: 2 }, { id: 'sand_scale', count: 1 }] },
  { id: 'mp_potion_large', result: 'mp_potion_large', gold: 300, tier: 3,
    materials: [{ id: 'grave_moss', count: 2 }, { id: 'deep_pearl', count: 1 }] },
  { id: 'antidote', result: 'antidote', gold: 240, tier: 2,
    materials: [{ id: 'grave_moss', count: 1 }, { id: 'wolf_fang', count: 1 }] },
];

const SHOP_STOCK = ['hp_potion', 'mp_potion', 'hp_potion_large', 'mp_potion_large', 'antidote', 'suspicious_cube'];

// ===== 장비 기본형 =====
// 실제 장비 목록(레벨대 x 등급)은 js/data/gear.js에서 이 기본형을 불려 만든다.
// 등급(1~5) 표시 색. 드랍 연출과 목록에서 한눈에 구분한다.
const TIER_COLOR = { 1: '#bdc3c7', 2: '#5dade2', 3: '#58d68d', 4: '#bb8fce', 5: '#f5b041' };

function weaponNoun(stanceId) {
  const b = WEAPON_BASES.find((w) => w.stanceId === stanceId);
  return b ? b.noun : '무기';
}

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

// ===== 강화 (별 하나가 한 단계) =====
// 별을 하나씩 올린다. 높을수록 성공률이 떨어지고, 12성부터는 파괴될 수 있다.
// 15성 이상에서 실패하면 한 단계 떨어지고(15·20성은 보호), 두 번 연속 떨어지면 다음 강화는 반드시 성공한다(찬스 타임).
// 확률은 시도 전체 기준으로 성공 / 파괴 / 실패를 나눈다.
const STARFORCE_MAX_BY_TIER = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 };
const STARFORCE_SUCCESS = [0.95, 0.9, 0.85, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55,
  0.5, 0.45, 0.4, 0.35, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.1, 0.08, 0.05];
const STARFORCE_DESTROY = {
  12: 0.006, 13: 0.013, 14: 0.014, 15: 0.021, 16: 0.021, 17: 0.021,
  18: 0.028, 19: 0.028, 20: 0.07, 21: 0.07, 22: 0.15, 23: 0.2, 24: 0.25,
};
const STAR_PROTECT_RANGE = [12, 16]; // 파괴 방지를 걸 수 있는 구간(비용 2배)

function starforceSuccessRate(star) { return STARFORCE_SUCCESS[star] ?? 0; }
function starforceDestroyRate(star) { return STARFORCE_DESTROY[star] || 0; }
function canProtectStar(star) { return star >= STAR_PROTECT_RANGE[0] && star <= STAR_PROTECT_RANGE[1]; }
function starDropsOnFail(star) { return star >= 15 && star !== 15 && star !== 20; }

// 별 1~15개는 기본 성능 +5%씩, 16개부터는 +8%씩
function starforceStatMult(star) {
  return 1 + Math.min(star, 15) * 0.05 + Math.max(0, star - 15) * 0.08;
}

function starforceCost(item, star, protect) {
  const mats = TIER_MATERIALS[item.matTier || item.tier] || TIER_MATERIALS[1];
  const gold = Math.round(item.price * (0.5 + star * star * 0.12)) * (protect ? 2 : 1);
  return { gold, materials: [{ id: mats[0], count: 1 + Math.floor(star / 3) }] };
}

// ===== 잠재능력 (메이플스토리식) =====
// 등급 4단계. 큐브를 쓰면 옵션을 새로 굴리고, 일정 확률로 등급이 오른다.
const POTENTIAL_GRADES = [
  null,
  { id: 'rare', name: '레어', color: '#5dade2' },
  { id: 'epic', name: '에픽', color: '#a569bd' },
  { id: 'unique', name: '유니크', color: '#f5b041' },
  { id: 'legendary', name: '레전드리', color: '#58d68d' },
];

// value[등급] — 0이면 그 등급에서 안 나온다. flat 옵션은 장비 티어가 높을수록 커진다.
// 수치 단위는 unit.bonus와 같다(비율은 0.03, 크리티컬은 퍼센트포인트).
const POTENTIAL_OPTIONS = {
  weapon: [
    { stat: 'atkPct', value: [0, 0.03, 0.06, 0.09, 0.12] },
    { stat: 'bossDmg', value: [0, 0, 0.1, 0.2, 0.3] },
    { stat: 'pierce', value: [0, 0, 0.05, 0.1, 0.15] },
    { stat: 'critDmg', value: [0, 0, 0, 5, 8] },
    { stat: 'crit', value: [0, 2, 4, 6, 8] },
    { stat: 'str', flat: true, value: [0, 2, 4, 6, 9] },
    { stat: 'agi', flat: true, value: [0, 2, 4, 6, 9] },
    { stat: 'int', flat: true, value: [0, 2, 4, 6, 9] },
    { stat: 'skl', flat: true, value: [0, 2, 4, 6, 9] },
  ],
  armor: [
    { stat: 'hpPct', value: [0, 0.03, 0.06, 0.09, 0.12] },
    { stat: 'defPct', value: [0, 0.03, 0.06, 0.09, 0.12] },
    { stat: 'crit', value: [0, 1, 2, 3, 4] },
    { stat: 'vit', flat: true, value: [0, 2, 4, 6, 9] },
    { stat: 'str', flat: true, value: [0, 2, 4, 6, 9] },
    { stat: 'agi', flat: true, value: [0, 2, 4, 6, 9] },
    { stat: 'int', flat: true, value: [0, 2, 4, 6, 9] },
    { stat: 'sen', flat: true, value: [0, 2, 4, 6, 9] },
  ],
};

// 큐브: maxGrade까지 올릴 수 있고, upChance[현재 등급] 확률로 한 등급 오른다.
const CUBES = {
  suspicious_cube: { name: '수상한 큐브', maxGrade: 2, upChance: [0, 0.06, 0, 0, 0] },
  craftsman_cube: { name: '장인의 큐브', maxGrade: 3, upChance: [0, 0.08, 0.03, 0, 0] },
  master_cube: { name: '명장의 큐브', maxGrade: 4, upChance: [0, 0.1, 0.04, 0.015, 0] },
};

function rollPotential(gear, grade) {
  const pool = POTENTIAL_OPTIONS[gear.slot === 'weapon' ? 'weapon' : 'armor'];
  const tierMult = 1 + ((gear.tier || 1) - 1) * 0.5;
  const count = grade >= 2 ? 3 : 2;
  const lines = [];
  for (let i = 0; i < count; i++) {
    // 첫 줄은 해당 등급 수치, 둘째 줄부터는 20% 확률로만 같은 등급이고 나머지는 한 등급 아래(윗줄이 가장 좋다).
    const lineGrade = i === 0 || Math.random() < 0.2 ? grade : Math.max(1, grade - 1);
    const options = pool.filter((o) => o.value[lineGrade] > 0);
    const opt = options[Math.floor(Math.random() * options.length)];
    const raw = opt.value[lineGrade];
    lines.push({ stat: opt.stat, value: opt.flat ? Math.round(raw * tierMult) : raw, grade: lineGrade });
  }
  return { grade, lines };
}

function potentialLineText(line) {
  if (STAT_LABEL[line.stat]) return `${STAT_LABEL[line.stat]} +${line.value}`;
  return bonusText({ [line.stat]: line.value });
}

// ===== 메소(골드) 드랍 — 바닥에 떨어진 것을 줍는다 =====
const MESO_DROP_CHANCE = 0.7;
function mesoAmount(enemy) {
  return Math.max(1, Math.round(enemy.xpReward * randRange(0.25, 0.45) * (enemy.boss ? 3 : 1)));
}

// 장비 슬롯과 방어구 등급
const EQUIP_SLOTS = ['weapon1', 'weapon2', 'armor', 'helmet', 'boots', 'accessory'];
const WEAPON_SLOTS = ['weapon1', 'weapon2'];

// 무기 세트(장비교체등록): 무기 조합을 3벌까지 등록해두고 전투 중 1/2/3 키로 갈아낀다.
// 세트마다 스탠스가 달라지므로, 교체 자체가 전투 중 스탠스 전환 수단이 된다.
const WEAPON_SET_COUNT = 3;
const WEAPON_SWAP_COOLDOWN_MS = 2500; // 세트 교체 재사용 대기
const WEAPON_SWAP_LOCK_MS = 350;      // 교체 직후 공격 경직
const SLOT_LABEL = { weapon1: '주무기', weapon2: '보조무기', armor: '갑옷', helmet: '투구', boots: '신발', accessory: '장신구' };
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
