// 스탯 계산. 그라나도 에스파다 UI 항목을 전부 데이터로 노출하되,
// 실제 전투 계산은 핵심 항목(공격력/치명타/방어력/속성)만 사용한다(MVP 범위).
const RANKS = ['Novice', 'Journeyman', 'Expert', 'Veteran', 'Master', 'GrandMaster'];

function rankLabel(level) {
  const idx = clamp(Math.floor((level - 1) / 10), 0, RANKS.length - 1);
  const sub = ((level - 1) % 10) + 1;
  return `${RANKS[idx]} Lv.${sub}`;
}

function xpToNextLevel(level) { return 50 + level * 30; }

function stanceXpToNext(stanceLevel) { return 40 + stanceLevel * 45; }

// 스킬 레벨 1당 위력 +15%
function skillDamageMult(skillDef, skillLevel) {
  return skillDef.dmgMult * (1 + 0.15 * (skillLevel - 1));
}

// 전체 스탯 시트(캐릭터 정보창 표시용). 계산에 쓰이지 않는 항목은 0/기본값으로 채워 표만 완성한다.
function computeFullSheet(unit) {
  const s = unit.stats;
  const gear = unit.equipmentBonus ? unit.equipmentBonus() : { atk: 0, def: 0, crit: 0 };
  const syn = unit.synergy || EMPTY_SYNERGY;
  const isMagic = unit.attackType === 'magic';
  const physicalAtk = s.str * 2 + s.skl * 1;
  const magicAtk = s.int * 2 + s.sen * 1;
  const attackPower = Math.round(((isMagic ? magicAtk : physicalAtk) + gear.atk) * (1 + syn.atkPct));
  const critChance = clamp(Math.round(s.agi * 0.3 + s.skl * 0.2 + (gear.crit || 0) + syn.crit), 5, 75);
  const critDamage = Math.round((150 + s.skl * 1) * 10) / 10;
  const accuracy = Math.round(s.skl * 1.2 + s.sen * 0.4 + 50);
  const defense = Math.round((s.vit * 2 + s.str * 0.5 + gear.def) * (1 + syn.defPct));
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
  const atkPower = sheet.attack.attackPower * dmgMult + elementalAtkBonus(attackerUnit);
  const isCrit = Math.random() * 100 < sheet.attack.critChance;
  const raw = isCrit ? atkPower * (sheet.attack.critDamage / 100) : atkPower;
  const targetDef = targetUnit.stats ? computeFullSheet(targetUnit).defense.defense : (targetUnit.defense || 0);
  const dmg = Math.max(1, Math.round(raw - targetDef * 0.5));
  return { dmg, isCrit };
}
