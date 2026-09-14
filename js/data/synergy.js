// 파티 시너지: 파티 구성에 따라 파티원 전원이 받는 보정.
// check(units) → 조건 충족 여부, buff → { atkPct, defPct, crit, hpPct }
function countType(units, type) { return units.filter((u) => u.attackType === type).length; }

const SYNERGY_DATA = [
  {
    id: 'balanced', name: '균형 잡힌 진형',
    desc: '근접 · 원거리 · 마법이 모두 있으면 공격/방어 +10%',
    check: (u) => countType(u, 'melee') >= 1 && countType(u, 'ranged') >= 1 && countType(u, 'magic') >= 1,
    buff: { atkPct: 0.10, defPct: 0.10 },
  },
  {
    id: 'frontline', name: '전열 결속',
    desc: '근접 2명 이상이면 방어 +18%, 최대 HP +8%',
    check: (u) => countType(u, 'melee') >= 2,
    buff: { defPct: 0.18, hpPct: 0.08 },
  },
  {
    id: 'volley', name: '일제 사격',
    desc: '원거리 2명 이상이면 공격 +15%',
    check: (u) => countType(u, 'ranged') >= 2,
    buff: { atkPct: 0.15 },
  },
  {
    id: 'resonance', name: '마력 공명',
    desc: '마법 2명 이상이면 공격 +12%, 크리티컬 +8',
    check: (u) => countType(u, 'magic') >= 2,
    buff: { atkPct: 0.12, crit: 8 },
  },
  {
    id: 'fullparty', name: '삼인 완편',
    desc: '파티가 3명이면 최대 HP +10%',
    check: (u) => u.length >= 3,
    buff: { hpPct: 0.10 },
  },
  {
    id: 'veteran', name: '역전의 용사',
    desc: '파티 전원이 Lv.10 이상이면 공격 +10%, 크리티컬 +5',
    check: (u) => u.length > 0 && u.every((x) => x.level >= 10),
    buff: { atkPct: 0.10, crit: 5 },
  },
];

const EMPTY_SYNERGY = { atkPct: 0, defPct: 0, crit: 0, hpPct: 0 };
