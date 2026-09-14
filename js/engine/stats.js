// 스탯 계산. 그라나도 에스파다 UI 항목을 전부 데이터로 노출하되,
// 실제 전투 계산은 핵심 항목(공격력/치명타/방어력/속성)만 사용한다(MVP 범위).
// 레벨 체계: 기본 1~100 → 베테랑 1~10 → 익스퍼트 1~10 → 마스터 1~10.
// 내부 레벨은 1~130의 연속 정수이고, 표시할 때만 등급+등급내레벨로 쪼갠다.
const BASE_MAX_LEVEL = 100;
const TIER_SPAN = 10;
const LEVEL_TIERS = [
  { id: 'veteran', name: '베테랑', start: BASE_MAX_LEVEL + 1 },
  { id: 'expert', name: '익스퍼트', start: BASE_MAX_LEVEL + TIER_SPAN + 1 },
  { id: 'master', name: '마스터', start: BASE_MAX_LEVEL + TIER_SPAN * 2 + 1 },
];
const MAX_LEVEL = BASE_MAX_LEVEL + TIER_SPAN * LEVEL_TIERS.length;

// 내부 레벨 → { tier, sub } (기본 구간은 tier=null)
function levelTier(level) {
  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    const t = LEVEL_TIERS[i];
    if (level >= t.start) return { tier: t, sub: level - t.start + 1 };
  }
  return { tier: null, sub: level };
}

function rankLabel(level) {
  const { tier, sub } = levelTier(level);
  return tier ? `${tier.name} Lv.${sub}` : `Lv.${sub}`;
}

// 승급 구간은 경험치 요구량이 급격히 뛴다.
// 기본 구간은 완만한 다항식, 베테랑 이후는 구간마다 배율을 크게 준다.
const TIER_XP_MULT = { veteran: 60, expert: 400, master: 2500 };

function xpToNextLevel(level) {
  if (level >= MAX_LEVEL) return Infinity;
  const { tier, sub } = levelTier(level);
  if (!tier) return Math.round(50 + level * 30 + level * level * 1.8);
  const base = 50 + BASE_MAX_LEVEL * 30 + BASE_MAX_LEVEL * BASE_MAX_LEVEL * 1.8;
  return Math.round(base * TIER_XP_MULT[tier.id] * (1 + (sub - 1) * 0.45));
}

function stanceXpToNext(stanceLevel) { return 40 + stanceLevel * 45; }

// 몹 레벨 - 내 레벨 차이를 색으로. 회색=거저 / 흰색=적정 / 주황·빨강=위험.
function dangerColor(enemyLevel, myLevel) {
  const diff = (enemyLevel || 1) - (myLevel || 1);
  if (diff >= 10) return '#e74c3c';
  if (diff >= 4) return '#e67e22';
  if (diff >= -3) return '#f4f4f4';
  if (diff >= -9) return '#a9dfbf';
  return '#7f8c8d';
}

function dangerLabel(enemyLevel, myLevel) {
  const diff = (enemyLevel || 1) - (myLevel || 1);
  if (diff >= 10) return '매우 위험';
  if (diff >= 4) return '위험';
  if (diff >= -3) return '적정';
  if (diff >= -9) return '쉬움';
  return '거저';
}

// 스킬 레벨 1당 위력 +15%
function skillDamageMult(skillDef, skillLevel) {
  return skillDef.dmgMult * (1 + 0.15 * (skillLevel - 1));
}

// 전체 스탯 시트(캐릭터 정보창 표시용). 계산에 쓰이지 않는 항목은 0/기본값으로 채워 표만 완성한다.
function computeFullSheet(unit) {
  const s = unit.stats;
  const gear = unit.equipmentBonus ? unit.equipmentBonus() : { atk: 0, def: 0, crit: 0 };
  const syn = unit.synergy || EMPTY_SYNERGY;
  // bon = 가문 특성 + 캐릭터 고유 특성 + 전용기 버프를 합산한 값
  const bon = unit.bonus || EMPTY_FAMILY_BONUS;
  const isMagic = unit.attackType === 'magic';
  const physicalAtk = s.str * 2 + s.skl * 1;
  const magicAtk = s.int * 2 + s.sen * 1;
  const attackPower = Math.round(((isMagic ? magicAtk : physicalAtk) + gear.atk + bon.atk) * (1 + syn.atkPct + bon.atkPct));
  const critChance = clamp(Math.round(s.agi * 0.3 + s.skl * 0.2 + (gear.crit || 0) + syn.crit + bon.crit), 5, 75);
  const critDamage = Math.round((150 + s.skl * 1 + bon.critDmg) * 10) / 10;
  const accuracy = Math.round((s.skl * 1.2 + s.sen * 0.4 + 50) * (1 + bon.accuracy));
  const defense = Math.round((s.vit * 2 + s.str * 0.5 + gear.def + bon.def) * (1 + syn.defPct + bon.defPct));
  const defenseGrade = Math.round(s.vit * 1.5);
  const statusResist = Math.round(s.vit * 0.5 + s.sen * 0.5);

  return {
    base: { str: s.str, agi: s.agi, vit: s.vit, skl: s.skl, int: s.int, sen: s.sen },
    attack: {
      attackGrade: Math.round(s.skl * 1.5 + s.agi * 0.5),
      attackPower,
      penetration: Math.round(s.skl * 0.3),
      critChance, critDamage,
      accuracy,
      defenseIgnore: Math.round(s.skl * 0.2),
      attackSpeed: Math.round(80 + s.agi * 0.8),
      castSpeed: Math.round(80 + s.sen * 0.8),
      elemental: { physical: attackPower, fire: 0, ice: 0, lightning: 0, psychic: 0 },
    },
    bonus: {
      race: { humanoid: 100, undead: 100, demon: 100, inanimate: 100, beast: 100 },
      type: { pc: 100, monster: 100, heavyArmor: 100, lightArmor: 100, clothArmor: 100 },
    },
    defense: {
      defenseGrade, defense, statusResist,
      immunity: Math.round(s.vit * 0.3),
      elementalResist: { fire: 0, ice: 0, lightning: 0, psychic: 0 },
    },
  };
}

function elementalAtkBonus(unit) {
  const stance = STANCE_DATA[unit.currentStanceId];
  if (!stance || !stance.element) return 0;
  return Math.round(unit.stats.int * 0.8);
}

function rollDamage(attackerUnit, targetUnit, dmgMult) {
  const sheet = computeFullSheet(attackerUnit);
  const bon = attackerUnit.bonus || EMPTY_FAMILY_BONUS;

  // 명중 판정: 몹은 기본 회피율을 갖고, 조준 관련 보너스가 이를 깎는다.
  const evade = Math.max(0, (targetUnit.evade || 0) - bon.accuracy);
  if (Math.random() < evade) return { dmg: 0, isCrit: false, miss: true };

  const atkPower = sheet.attack.attackPower * dmgMult + elementalAtkBonus(attackerUnit);
  const isCrit = Math.random() * 100 < sheet.attack.critChance;
  const raw = isCrit ? atkPower * (sheet.attack.critDamage / 100) : atkPower;
  const targetDef = targetUnit.stats ? computeFullSheet(targetUnit).defense.defense : (targetUnit.defense || 0);
  // 관통 숙련만큼 상대 방어력을 무시한다.
  const effectiveDef = targetDef * (1 - clamp(bon.pierce, 0, 0.9));
  const dmg = Math.max(1, Math.round(raw - effectiveDef * 0.5));
  return { dmg, isCrit, miss: false };
}
