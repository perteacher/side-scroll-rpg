// 스탠스(무기 자세).
//
// 이름과 성격은 원작 그라나도 에스파다의 스탠스 목록(나무위키 '그라나도 에스파다/스탠스')에서 가져왔다.
// 원작은 무기 종류가 곧 스탠스 계열이고, 같은 무기라도 자세에 따라 평타 타수 · 블럭/회피 · 크리티컬이
// 전혀 다르다. 그래서 이 게임의 스탠스도 사거리/이동속도만이 아니라 아래 항목을 갖는다.
//
//   power   … 평타 한 번(모든 타수 합)의 공격력 배율. 실제 계산에 쓰는 basicAtkMult = power / hits
//   hits    … 평타 타수. 원작의 "평타가 2히트", "양손으로 두방씩 날려 4번" 같은 특징
//   splash  … 평타 스플래시 반경(px). 0이면 단일. 폴암 계열의 "평타도 스플래시"
//   splashMax … 한 번에 휘말릴 수 있는 최대 마릿수(주 대상 제외). 상한이 없으면 몹이 몰린 자리에서
//             마스터 자세가 단일 계열의 7배까지 갔다. 샷건이 가장 많이 쓸어 담는다
//             광역 평타는 원작에서 '쩔(병작)'을 맡는 자리다 — 스킬을 쓰지 않고 평타만 돌려도
//             몹이 뭉텅이로 녹아서, 세워 둔 저레벨에게 경험치가 계속 들어간다.
//             지금 그 자리에 있는 계열: 샷건(전 단계·가장 넓다) · 폴암(전 단계) ·
//             장궁(상급부터) · 속성 팔찌(마스터)
//             반경은 눈대중이 아니라 실제 몹 간격을 재서 잡았다 — 사냥터에서 한 마리 주변
//             70px 안에는 평균 0.5마리, 150px 1.3마리, 190px 3마리가 있다. 70px짜리 '광역'은
//             단일 계열과 잡은 수가 같아서 의미가 없었다.
//   bonus   … 스탠스 자체가 주는 보정. 원작의 익스퍼트(별자리) 스탠스가 면역·관통을 기본으로
//             달고 나오는 것을 그대로 옮겼다(bonus.resist / bonus.pierce)
//
// 우리 무기 계열 ↔ 원작 스탠스 계열 대응
//   장검   → 한손검      백 가드 → 핵 앤 슬래쉬 → 에퀴테스
//   쌍단검 → 단검        두발라다 코르테 → 레이드 어썰트 → 블리츠 어썰트
//   창     → 폴암        블란디르 크루스 → 마이티 크루스 → 트로나다 크루스
//   너클   → 무경오서    대지의 장 → 바람의 장 → 마샬 아츠
//   장궁   → 석궁        아발리스터 → 새지터 → 섀도우 스팅
//   석궁   → 권총(속사)  에이밍 샷 → 아웃레이지 샷 → 언리미티드 샷
//   샷건   → 샷건        샷건 블래스터 → 기간틱 블래스터 → 슈페리어 블래스터
//   머스킷 → 장총        스탠딩 샷 → 인카운터 샷 → 플린트락
//   지팡이 → 속성 팔찌   포제션 → 도미네이션 → 로드 오브 (엘리멘탈)
//   로자리오 → 힐러 계열 퍼스트 에이드 → 택티컬 어시스턴스 → 인핸스 택틱스
//                        포르티투도     → 인캔테이션        → 이노켄티오
//
// 힐러 계열(attackType: 'support')은 원작대로 평타가 공격이 아니라 치료다.
// 기본 스탠스인 퍼스트 에이드·포르티투도는 원작에서도 맨손 스탠스라 무기 없이 쓸 수 있고(weaponless),
// 그 위의 택티컬 어시스턴스·인핸스 택틱스는 로자리오를 착용해야 열린다.

// 등급별 레벨 상한 · 스탯 성장 배율 · 스탠스 경험치 요구 배율
// 상위 스탠스는 고레벨 사냥터(몹 경험치가 수만~수백만)에서 키우므로 요구량을 크게 곱한다.
const STANCE_GRADE = {
  bare: { label: '맨손', maxLevel: 10, growthMult: 0.5, xpMult: 1 },
  base: { label: '기본', maxLevel: 20, growthMult: 1, xpMult: 1 },
  advanced: { label: '상급', maxLevel: 25, growthMult: 1.5, xpMult: 300 },
  master: { label: '마스터', maxLevel: 30, growthMult: 2, xpMult: 15000 },
};

const STAT_LABEL = { str: '힘', agi: '민첩', vit: '체력', skl: '기술', int: '지능', sen: '감각' };

// 계열별 정의. base/advanced/master 세 자세를 한 줄에 모아 두면 성장선을 한눈에 볼 수 있다.
// growth는 스탠스 레벨 1당 오르는 스탯(계열 성향). 상급·마스터는 등급 배율을 곱한다.
const STANCE_LINES = {
  sword: {
    attackType: 'melee', origin: '한손검',
    growth: { str: 1.0, vit: 0.6, skl: 0.4 },
    base: { name: '백 가드', power: 1.0, hits: 1, range: 55, speed: 1.0,
      bonus: { defPct: 0.05 }, skills: ['slash_combo', 'guard_break', 'sweep'] },
    advanced: { name: '핵 앤 슬래쉬', power: 1.25, hits: 2, range: 60, speed: 1.05,
      bonus: { atkSpeed: 0.10, crit: 4 }, skills: ['crushing_blow', 'guard_break', 'blade_storm'] },
    master: { name: '에퀴테스', power: 1.5, hits: 2, range: 66, speed: 1.08,
      bonus: { crit: 10, pierce: 0.08, resist: 0.08 }, skills: ['crushing_blow', 'dragon_fury', 'divine_slash'] },
  },
  dualblade: {
    attackType: 'melee', origin: '단검',
    growth: { agi: 1.0, str: 0.5, skl: 0.5 },
    base: { name: '두발라다 코르테', power: 0.85, hits: 2, range: 48, speed: 1.1,
      bonus: { crit: 4, atkSpeed: 0.08 }, skills: ['flurry', 'bleed_stab', 'war_cry'] },
    advanced: { name: '레이드 어썰트', power: 1.06, hits: 2, range: 53, speed: 1.15,
      bonus: { crit: 8, atkSpeed: 0.14 }, skills: ['crushing_blow', 'bleed_stab', 'blade_storm'] },
    master: { name: '블리츠 어썰트', power: 1.28, hits: 3, range: 58, speed: 1.18,
      bonus: { crit: 12, atkSpeed: 0.18, pierce: 0.08 }, skills: ['crushing_blow', 'dragon_fury', 'divine_slash'] },
  },
  spear: {
    attackType: 'melee', origin: '폴암',
    growth: { str: 0.8, vit: 0.8, skl: 0.4 },
    // 원작 블란디르 크루스 계열의 특징: 평타부터 스플래시다.
    base: { name: '블란디르 크루스', power: 1.1, hits: 1, range: 72, speed: 0.95, splash: 130, splashMax: 3,
      bonus: {}, skills: ['thrust_line', 'guard_break', 'sweep'] },
    advanced: { name: '마이티 크루스', power: 1.38, hits: 1, range: 79, speed: 1.0, splash: 165, splashMax: 4,
      bonus: { atkPct: 0.08 }, skills: ['crushing_blow', 'guard_break', 'blade_storm'] },
    master: { name: '트로나다 크루스', power: 1.65, hits: 1, range: 86, speed: 1.03, splash: 200, splashMax: 5,
      bonus: { atkPct: 0.12, pierce: 0.10, resist: 0.06 }, skills: ['crushing_blow', 'dragon_fury', 'divine_slash'] },
  },
  fist: {
    attackType: 'melee', origin: '무경오서',
    growth: { str: 0.7, agi: 0.7, vit: 0.6 },
    base: { name: '무경오서 - 대지의 장', power: 0.9, hits: 1, range: 40, speed: 1.15,
      bonus: { defPct: 0.04, atkSpeed: 0.06 }, skills: ['flurry', 'stun_punch', 'war_cry'] },
    advanced: { name: '무경오서 - 바람의 장', power: 1.13, hits: 2, range: 44, speed: 1.22,
      bonus: { atkSpeed: 0.14, moveSpeed: 0.08 }, skills: ['crushing_blow', 'stun_punch', 'blade_storm'] },
    master: { name: '마샬 아츠', power: 1.35, hits: 3, range: 48, speed: 1.25,
      bonus: { atkSpeed: 0.20, resist: 0.10, pierce: 0.06 }, skills: ['crushing_blow', 'dragon_fury', 'divine_slash'] },
  },
  longbow: {
    attackType: 'ranged', origin: '석궁',
    growth: { agi: 0.8, skl: 0.8, sen: 0.4 },
    base: { name: '아발리스터', power: 1.0, hits: 1, range: 260, speed: 1.0,
      bonus: { accuracy: 0.05 }, skills: ['power_shot', 'snipe', 'arrow_rain'] },
    // 원작 새지터는 "평타가 광역이라는 장점이 있어 병사작에서도 딜러로 쓰인다". 그대로 옮겼다.
    advanced: { name: '새지터', power: 1.25, hits: 1, range: 286, speed: 1.05, splash: 150, splashMax: 3,
      bonus: { pierce: 0.06, crit: 4 }, skills: ['piercing_shot', 'snipe', 'storm_volley'] },
    master: { name: '섀도우 스팅', power: 1.5, hits: 2, range: 312, speed: 1.08, splash: 185, splashMax: 4,
      bonus: { pierce: 0.14, crit: 8, resist: 0.06 }, skills: ['piercing_shot', 'heaven_arrow', 'hail_of_fire'] },
  },
  crossbow: {
    attackType: 'ranged', origin: '권총',
    growth: { skl: 0.9, agi: 0.6, sen: 0.5 },
    // 원작 권총 계열은 "양손으로 두 방씩 평타가 4번"인 속사 계열이다. 한 타는 약하고 타수로 채운다.
    base: { name: '에이밍 샷', power: 1.05, hits: 2, range: 230, speed: 0.95,
      bonus: { accuracy: 0.08 }, skills: ['multi_shot', 'suppress', 'scatter_shot'] },
    advanced: { name: '아웃레이지 샷', power: 1.31, hits: 4, range: 253, speed: 1.0,
      bonus: { atkSpeed: 0.15 }, skills: ['piercing_shot', 'suppress', 'storm_volley'] },
    master: { name: '언리미티드 샷', power: 1.58, hits: 4, range: 276, speed: 1.03,
      bonus: { atkSpeed: 0.20, pierce: 0.08, resist: 0.06 }, skills: ['piercing_shot', 'heaven_arrow', 'hail_of_fire'] },
  },
  // 원작에서 쩔(병작)의 대명사. 기간틱 블래스터는 "모든 스킬이 범위스킬이며 … 이 스탠스의 진정한
  // 용도로는 누가뭐라 해도 쩔용이다", 슈페리어 블래스터는 "레이드에서도 쩔을 해주는 그레이스"로 통한다.
  // 그래서 이 계열은 기본 자세부터 광역이고 반경도 게임에서 가장 넓다.
  // 대신 사거리가 짧고 한 대 위력은 다른 원거리보다 낮다 — 몹이 뭉쳐 있어야 값을 한다.
  shotgun: {
    attackType: 'ranged', origin: '샷건',
    growth: { skl: 0.9, str: 0.6, vit: 0.5 },
    base: { name: '샷건 블래스터', power: 0.95, hits: 1, range: 150, speed: 0.95, splash: 140, splashMax: 4,
      bonus: {}, skills: ['multi_shot', 'suppress', 'scatter_shot'] },
    // 원작 그대로 "샷건을 2발씩 발사한다".
    advanced: { name: '기간틱 블래스터', power: 1.2, hits: 2, range: 165, speed: 1.0, splash: 190, splashMax: 6,
      bonus: { atkSpeed: 0.08 }, skills: ['piercing_shot', 'suppress', 'storm_volley'] },
    master: { name: '슈페리어 블래스터', power: 1.45, hits: 2, range: 180, speed: 1.03, splash: 220, splashMax: 8,
      bonus: { pierce: 0.08, resist: 0.06, atkSpeed: 0.10 }, skills: ['piercing_shot', 'heaven_arrow', 'hail_of_fire'] },
  },
  musket: {
    attackType: 'ranged', origin: '장총',
    growth: { skl: 1.1, sen: 0.5, str: 0.4 },
    base: { name: '스탠딩 샷', power: 1.2, hits: 1, range: 300, speed: 0.9,
      bonus: {}, skills: ['power_shot', 'snipe', 'scatter_shot'] },
    advanced: { name: '인카운터 샷', power: 1.5, hits: 2, range: 330, speed: 0.95,
      bonus: { crit: 5 }, skills: ['piercing_shot', 'snipe', 'storm_volley'] },
    master: { name: '플린트락', power: 1.8, hits: 2, range: 360, speed: 0.98,
      bonus: { pierce: 0.12, accuracy: 0.10, resist: 0.06 }, skills: ['piercing_shot', 'heaven_arrow', 'hail_of_fire'] },
  },
  flame: {
    attackType: 'magic', element: 'fire', origin: '화염 팔찌',
    growth: { int: 1.1, sen: 0.5, vit: 0.4 },
    // 원작 속성 팔찌 스탠스는 스탠스 자체에 "해당 속성 데미지 증가" 버프가 들어 있다.
    base: { name: '포제션 파이어', power: 1.0, hits: 1, range: 220, speed: 0.9,
      bonus: { atkPct: 0.05 }, skills: ['fireball', 'ignite', 'flame_nova'] },
    advanced: { name: '도미네이션 파이어', power: 1.25, hits: 1, range: 242, speed: 0.95,
      bonus: { atkPct: 0.10 }, skills: ['fireball', 'ignite', 'inferno'] },
    // 로드 오브 계열은 원작에서도 "압도적으로 넓은 범위에 즉시시전". 평타부터 번진다.
    master: { name: '로드 오브 플레임', power: 1.5, hits: 1, range: 264, speed: 0.98, splash: 170, splashMax: 4,
      bonus: { atkPct: 0.15, pierce: 0.10, resist: 0.06 }, skills: ['fireball', 'solar_flare', 'meteor'] },
  },
  frost: {
    attackType: 'magic', element: 'ice', origin: '빙한 팔찌',
    growth: { int: 0.9, sen: 0.7, vit: 0.4 },
    base: { name: '포제션 아이스', power: 1.0, hits: 1, range: 220, speed: 0.9,
      bonus: { atkPct: 0.05 }, skills: ['frostbolt', 'freeze', 'ice_nova'] },
    advanced: { name: '도미네이션 아이스', power: 1.25, hits: 1, range: 242, speed: 0.95,
      bonus: { atkPct: 0.10 }, skills: ['frostbolt', 'freeze', 'glacier'] },
    master: { name: '로드 오브 프로스트', power: 1.5, hits: 1, range: 264, speed: 0.98, splash: 170, splashMax: 4,
      bonus: { atkPct: 0.15, pierce: 0.10, resist: 0.06 }, skills: ['frostbolt', 'eternal_ice', 'blizzard'] },
  },
  spark: {
    attackType: 'magic', element: 'lightning', origin: '전격 팔찌',
    growth: { int: 1.0, sen: 0.8, agi: 0.2 },
    base: { name: '포제션 라이트닝', power: 1.0, hits: 1, range: 220, speed: 0.9,
      bonus: { atkPct: 0.05 }, skills: ['sparkbolt', 'shock', 'chain_lightning'] },
    advanced: { name: '도미네이션 라이트닝', power: 1.25, hits: 1, range: 242, speed: 0.95,
      bonus: { atkPct: 0.10 }, skills: ['sparkbolt', 'shock', 'thunderstorm'] },
    master: { name: '로드 오브 엘리멘탈', power: 1.5, hits: 1, range: 264, speed: 0.98, splash: 170, splashMax: 4,
      bonus: { atkPct: 0.15, pierce: 0.10, resist: 0.06 }, skills: ['sparkbolt', 'judgment_bolt', 'heaven_storm'] },
  },

  // ===== 힐러 계열 =====
  // 평타가 치료다. power는 공격 배율이 아니라 "공격력의 몇 배를 회복시키는가"로 쓰인다.
  firstaid: {
    attackType: 'support', origin: '로자리오', weapon: 'rosario', weaponlessBase: true,
    growth: { int: 0.8, sen: 0.8, vit: 0.5 },
    base: { name: '퍼스트 에이드', power: 1.0, hits: 1, range: 220, speed: 1.0,
      bonus: {}, skills: ['treatment', 'healing_hands', 'recovery'] },
    advanced: { name: '택티컬 어시스턴스', power: 1.3, hits: 1, range: 250, speed: 1.05,
      bonus: { resist: 0.10, pierce: 0.04 }, skills: ['ignore_harm', 'penetration_aid', 'refresh_mind'] },
    master: { name: '인핸스 택틱스', power: 1.7, hits: 1, range: 280, speed: 1.08,
      bonus: { resist: 0.15, atkPct: 0.05 }, skills: ['fransfer', 'enhancement', 'escape_artist'] },
  },
  fortitudo: {
    attackType: 'support', origin: '로자리오', weapon: 'rosario', weaponlessBase: true,
    growth: { vit: 0.9, sen: 0.7, int: 0.5 },
    base: { name: '포르티투도', power: 0.85, hits: 1, range: 200, speed: 1.0,
      bonus: { defPct: 0.05 }, skills: ['fortitude', 'meditation', 'haste'] },
    advanced: { name: '인캔테이션', power: 1.1, hits: 1, range: 230, speed: 1.05,
      bonus: { defPct: 0.10, resist: 0.12 }, skills: ['protection_field', 'magic_barrier', 'invulnerable'] },
    master: { name: '이노켄티오', power: 1.5, hits: 1, range: 260, speed: 1.08,
      bonus: { defPct: 0.10, resist: 0.18 }, skills: ['divine_bless', 'sacred_heal', 'resuscitation'] },
  },
};

// 무기를 하나도 장착하지 않았을 때만 쓰는 스탠스. 원작에서도 무기를 못 드는 맨손 자세다.
const STANCE_DATA = {
  bare: {
    id: 'bare', name: '베어너클', attackType: 'melee', grade: 'bare', weapon: null,
    range: 36, moveSpeedMult: 1.05, power: 0.6, hits: 1, basicAtkMult: 0.6, splash: 0,
    bonus: {}, skillIds: [],
  },
};

const STANCE_GRADE_SUFFIX = { base: '', advanced: '_adv', master: '_master' };

Object.entries(STANCE_LINES).forEach(([line, def]) => {
  ['base', 'advanced', 'master'].forEach((grade) => {
    const s = def[grade];
    const id = `${line}${STANCE_GRADE_SUFFIX[grade]}`;
    STANCE_DATA[id] = {
      id,
      name: s.name,
      line,
      origin: def.origin,
      attackType: def.attackType,
      element: def.element,
      grade,
      // 무기 계열. 힐러의 기본 두 자세는 맨손으로도 쓸 수 있다(weaponless).
      weapon: def.weapon || line,
      weaponless: !!(def.weaponlessBase && grade === 'base'),
      range: s.range,
      moveSpeedMult: s.speed,
      power: s.power,
      hits: s.hits,
      basicAtkMult: +(s.power / s.hits).toFixed(3),
      splash: s.splash || 0,
      splashMax: s.splashMax || 0,
      bonus: s.bonus || {},
      skillIds: s.skills,
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
  const growth = s.line ? STANCE_LINES[s.line].growth : { str: 0.3, agi: 0.3, vit: 0.3 };
  const mult = stanceGradeOf(stanceId).growthMult;
  const out = {};
  Object.entries(growth).forEach(([k, v]) => { out[k] = v * mult; });
  return out;
}

// 스탠스가 자체로 주는 보정(면역·관통·크리티컬 등). 특성·버프와 같은 형태라 그대로 합산된다.
function stanceBonusOf(stanceId) {
  const s = STANCE_DATA[stanceId];
  return s ? (s.bonus || {}) : {};
}

// 스탠스 한 줄 설명. 평타 타수·스플래시·고유 보정을 목록과 툴팁에 같이 보여준다.
function stanceTraitText(stanceId) {
  const s = STANCE_DATA[stanceId];
  if (!s) return '';
  const parts = [];
  if (s.attackType === 'support') parts.push(`평타 = 치료 (공격력 ${Math.round(s.power * 100)}%)`);
  else parts.push(s.hits > 1 ? `평타 ${s.hits}타` : '평타 1타');
  if (s.splash) parts.push(`평타 스플래시 ${s.splash}${s.splashMax ? ` (최대 ${s.splashMax}체)` : ''}`);
  const b = bonusText(s.bonus);
  if (b) parts.push(b);
  return parts.join(' · ');
}

// 스플래시 평타를 가진 자세만 골라낸다(지금 쓸 수 있는 것 + 앞으로 배울 것).
// 쩔(병작)에 세울 캐릭터를 고를 때 이걸 본다.
function splashStancesOf(stanceIds) {
  const all = [...stanceIds, ...tierStancesFor(stanceIds).map((t) => t.stanceId)];
  return all.filter((sid) => STANCE_DATA[sid] && STANCE_DATA[sid].splash > 0);
}

// 광역 평타를 언제부터 쓰는가. 'now' = 1레벨부터 / 'later' = 승급 스탠스부터 / null = 없음
// 배지는 'now'에게만 붙인다. 승급까지 100레벨을 가야 하는 캐릭터에게 지금 '쩔'이라고 써 두면
// 26명한테 배지가 붙어서 표시 자체가 뜻을 잃는다.
function leechTier(stanceIds) {
  const list = splashStancesOf(stanceIds);
  if (list.length === 0) return null;
  return list.some((sid) => STANCE_DATA[sid].grade === 'base') ? 'now' : 'later';
}

function canLeech(stanceIds) { return leechTier(stanceIds) === 'now'; }

// 툴팁·상세 화면에 쓰는 한 줄. 승급 후에 열리는 경우도 알려 준다.
function leechDetailText(stanceIds) {
  const list = splashStancesOf(stanceIds);
  if (list.length === 0) return '';
  const now = list.filter((sid) => STANCE_DATA[sid].grade === 'base');
  return now.length
    ? `광역 평타 — ${STANCE_DATA[now[0]].name} (쩔에 쓰기 좋습니다)`
    : `광역 평타 — ${STANCE_DATA[list[0]].name}부터 (${STANCE_GRADE[STANCE_DATA[list[0]].grade].label} 스탠스)`;
}

// 배지에 쓰는 짧은 문구. 'now'가 아니면 빈 문자열이라 배지가 안 붙는다.
function leechBadgeText(stanceIds) {
  return leechTier(stanceIds) === 'now' ? leechDetailText(stanceIds) : '';
}

function statBonusText(bonus, digits = 0) {
  const parts = Object.keys(STAT_LABEL)
    .filter((k) => (bonus[k] || 0) >= (digits ? 0.05 : 1))
    .map((k) => `${STAT_LABEL[k]} +${digits ? bonus[k].toFixed(digits) : Math.floor(bonus[k])}`);
  return parts.join(' · ');
}
