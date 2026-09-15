// 스탠스(무기 자세) 정의. 스탠스를 바꾸면 attackType/사거리/스킬셋이 바뀐다.
// skillIds는 ROLE_SKILLS_DATA[attackType]의 키이며, 요구 스탠스 레벨 1/3/5 순으로 배치한다.
const STANCE_DATA = {
  // 무기를 하나도 장착하지 않았을 때만 쓰는 스탠스. 스킬이 없고 위력도 낮다.
  bare: {
    id: 'bare', name: '맨손', attackType: 'melee',
    range: 36, moveSpeedMult: 1.05, basicAtkMult: 0.6,
    skillIds: [],
  },
  sword: {
    id: 'sword', name: '검술', attackType: 'melee',
    range: 55, moveSpeedMult: 1.0, basicAtkMult: 1.0,
    skillIds: ['slash_combo', 'guard_break', 'sweep'],
  },
  dualblade: {
    id: 'dualblade', name: '쌍검', attackType: 'melee',
    range: 48, moveSpeedMult: 1.1, basicAtkMult: 0.85,
    skillIds: ['flurry', 'bleed_stab', 'war_cry'],
  },
  spear: {
    id: 'spear', name: '창술', attackType: 'melee',
    range: 72, moveSpeedMult: 0.95, basicAtkMult: 1.1,
    skillIds: ['thrust_line', 'guard_break', 'sweep'],
  },
  fist: {
    id: 'fist', name: '격투', attackType: 'melee',
    range: 40, moveSpeedMult: 1.15, basicAtkMult: 0.9,
    skillIds: ['flurry', 'stun_punch', 'war_cry'],
  },
  longbow: {
    id: 'longbow', name: '장궁', attackType: 'ranged',
    range: 260, moveSpeedMult: 1.0, basicAtkMult: 1.0,
    skillIds: ['power_shot', 'snipe', 'arrow_rain'],
  },
  crossbow: {
    id: 'crossbow', name: '석궁', attackType: 'ranged',
    range: 230, moveSpeedMult: 0.95, basicAtkMult: 1.05,
    skillIds: ['multi_shot', 'suppress', 'scatter_shot'],
  },
  musket: {
    id: 'musket', name: '머스킷', attackType: 'ranged',
    range: 300, moveSpeedMult: 0.9, basicAtkMult: 1.2,
    skillIds: ['power_shot', 'snipe', 'scatter_shot'],
  },
  flame: {
    id: 'flame', name: '화염술', attackType: 'magic', element: 'fire',
    range: 220, moveSpeedMult: 0.9, basicAtkMult: 1.0,
    skillIds: ['fireball', 'ignite', 'flame_nova'],
  },
  frost: {
    id: 'frost', name: '빙한술', attackType: 'magic', element: 'ice',
    range: 220, moveSpeedMult: 0.9, basicAtkMult: 1.0,
    skillIds: ['frostbolt', 'freeze', 'ice_nova'],
  },
  spark: {
    id: 'spark', name: '전격술', attackType: 'magic', element: 'lightning',
    range: 220, moveSpeedMult: 0.9, basicAtkMult: 1.0,
    skillIds: ['sparkbolt', 'shock', 'chain_lightning'],
  },
};

// ===== 단계별 스탠스 =====
// 무기 종류가 곧 스탠스 계열이다(장검 → 검술 계열). 상급·마스터 스탠스는 같은 무기로 쓰는 더 강한 자세.
// 캐릭터는 일반(1~100) 단계에 기본 스탠스 2개로 시작하고, 단계가 오를 때마다 하나씩 더 배운다.
//   베테랑   → 첫째 무기의 상급 스탠스
//   익스퍼트 → 둘째 무기의 상급 스탠스
//   마스터   → 첫째 무기의 마스터 스탠스

Object.values(STANCE_DATA).forEach((s) => {
  s.weapon = s.id === 'bare' ? null : s.id;
  s.grade = s.id === 'bare' ? 'bare' : 'base';
});

// 등급별 레벨 상한 · 스탯 성장 배율 · 스탠스 경험치 요구 배율
// 상위 스탠스는 고레벨 사냥터(몹 경험치가 수만~수백만)에서 키우므로 요구량을 크게 곱한다.
const STANCE_GRADE = {
  bare: { label: '맨손', maxLevel: 10, growthMult: 0.5, xpMult: 1 },
  base: { label: '기본', maxLevel: 20, growthMult: 1, xpMult: 1 },
  advanced: { label: '상급', maxLevel: 25, growthMult: 1.5, xpMult: 300 },
  master: { label: '마스터', maxLevel: 30, growthMult: 2, xpMult: 15000 },
};

const STAT_LABEL = { str: '힘', agi: '민첩', vit: '체력', skl: '기술', int: '지능', sen: '감각' };

// 스탠스 레벨 1당 오르는 스탯(무기 계열별 성향). 상급·마스터는 등급 배율을 곱한다.
const STANCE_GROWTH = {
  bare: { str: 0.3, agi: 0.3, vit: 0.3 },
  sword: { str: 1.0, vit: 0.6, skl: 0.4 },
  dualblade: { agi: 1.0, str: 0.5, skl: 0.5 },
  spear: { str: 0.8, vit: 0.8, skl: 0.4 },
  fist: { str: 0.7, agi: 0.7, vit: 0.6 },
  longbow: { agi: 0.8, skl: 0.8, sen: 0.4 },
  crossbow: { skl: 0.9, agi: 0.6, sen: 0.5 },
  musket: { skl: 1.1, sen: 0.5, str: 0.4 },
  flame: { int: 1.1, sen: 0.5, vit: 0.4 },
  frost: { int: 0.9, sen: 0.7, vit: 0.4 },
  spark: { int: 1.0, sen: 0.8, agi: 0.2 },
};

const UPPER_STANCE_NAMES = {
  sword: { advanced: '기사 검술', master: '성검술' },
  dualblade: { advanced: '칼날 무도', master: '쌍룡검' },
  spear: { advanced: '돌격 창술', master: '용창술' },
  fist: { advanced: '파쇄권', master: '금강권' },
  longbow: { advanced: '매의 눈', master: '천궁' },
  crossbow: { advanced: '연쇄 석궁', master: '폭풍 석궁' },
  musket: { advanced: '저격술', master: '마탄' },
  flame: { advanced: '업화술', master: '태양화염' },
  frost: { advanced: '빙결술', master: '영겁빙하' },
  spark: { advanced: '뇌격술', master: '천둥신' },
};

const MAGIC_UPPER_SKILLS = {
  fire: { aoe: 'inferno', single: 'solar_flare', ult: 'meteor' },
  ice: { aoe: 'glacier', single: 'eternal_ice', ult: 'blizzard' },
  lightning: { aoe: 'thunderstorm', single: 'judgment_bolt', ult: 'heaven_storm' },
};
const PHYSICAL_UPPER_SKILLS = {
  melee: ['crushing_blow', 'blade_storm', 'dragon_fury', 'divine_slash'],
  ranged: ['piercing_shot', 'storm_volley', 'heaven_arrow', 'hail_of_fire'],
};

// 요구 스탠스 레벨 1/3/5 순으로 배치한다.
function upperStanceSkills(base, grade) {
  if (base.attackType === 'magic') {
    const m = MAGIC_UPPER_SKILLS[base.element];
    return grade === 'advanced' ? [base.skillIds[0], base.skillIds[1], m.aoe] : [base.skillIds[0], m.single, m.ult];
  }
  const p = PHYSICAL_UPPER_SKILLS[base.attackType];
  return grade === 'advanced' ? [p[0], base.skillIds[1], p[1]] : [p[0], p[2], p[3]];
}

Object.keys(UPPER_STANCE_NAMES).forEach((weapon) => {
  const base = STANCE_DATA[weapon];
  [
    { grade: 'advanced', suffix: 'adv', range: 1.1, atk: 1.25, speed: 0.05 },
    { grade: 'master', suffix: 'master', range: 1.2, atk: 1.5, speed: 0.08 },
  ].forEach((g) => {
    const id = `${weapon}_${g.suffix}`;
    STANCE_DATA[id] = {
      id,
      name: UPPER_STANCE_NAMES[weapon][g.grade],
      attackType: base.attackType,
      element: base.element,
      weapon,
      grade: g.grade,
      range: Math.round(base.range * g.range),
      moveSpeedMult: +(base.moveSpeedMult + g.speed).toFixed(2),
      basicAtkMult: +(base.basicAtkMult * g.atk).toFixed(2),
      skillIds: upperStanceSkills(base, g.grade),
    };
  });
});

const STANCE_TIER_UNLOCKS = [
  { tier: 'veteran', pick: (ids) => `${ids[0]}_adv` },
  { tier: 'expert', pick: (ids) => `${ids[1] || ids[0]}_adv` },
  { tier: 'master', pick: (ids) => `${ids[0]}_master` },
];

// 캐릭터의 기본 스탠스 2개로부터 단계별로 배울 스탠스를 정한다.
function tierStancesFor(stanceIds) {
  return STANCE_TIER_UNLOCKS.map((u) => ({ tier: u.tier, stanceId: u.pick(stanceIds) }));
}

function stanceGradeOf(stanceId) {
  const s = STANCE_DATA[stanceId];
  return STANCE_GRADE[s ? s.grade : 'base'];
}

function stanceMaxLevel(stanceId) { return stanceGradeOf(stanceId).maxLevel; }

function stanceGrowthPerLevel(stanceId) {
  const s = STANCE_DATA[stanceId];
  if (!s) return {};
  const growth = STANCE_GROWTH[s.weapon || 'bare'] || {};
  const mult = stanceGradeOf(stanceId).growthMult;
  const out = {};
  Object.entries(growth).forEach(([k, v]) => { out[k] = v * mult; });
  return out;
}

function statBonusText(bonus, digits = 0) {
  const parts = Object.keys(STAT_LABEL)
    .filter((k) => (bonus[k] || 0) >= (digits ? 0.05 : 1))
    .map((k) => `${STAT_LABEL[k]} +${digits ? bonus[k].toFixed(digits) : Math.floor(bonus[k])}`);
  return parts.join(' · ');
}
