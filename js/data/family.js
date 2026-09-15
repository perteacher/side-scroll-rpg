// 가문 특성 시스템.
//
// [원본(그라나도 에스파다)에서 확인된 규칙 — 나무위키 "가문 특성 시스템" 절]
//  - 캐릭터의 레벨 단계가 오를수록 가문 레벨이 오른다.
//  - 가문 레벨 1당 특성 포인트 1개를 얻는다.
//  - 스킬트리 구조다. 아래 단계일수록 효과가 강하고, 활성화하려면
//    "윗 단계에 일정 포인트를 투자" + "가문 레벨 조건"을 둘 다 만족해야 한다.
//  - 포인트는 언제든 자유롭게 재분배할 수 있다.
//  - 효과는 가문 전체(= 모든 캐릭터)에 적용된다.
//  - 강화 대상으로 언급된 항목: 공격증가 / 공격속도 / 이동속도 / 명중률 / 관통력.
//    (패치 이전 '가문의 보호'는 공증·공속·최대체력·방어력을 일괄 증가시켰다)
//
// [확인 불가 — 아래 수치는 이 게임에 맞춘 자체 밸런싱]
//  - 특성별 정확한 UI 명칭, 1포인트당 수치, 항목별 상한, 최대 가문 레벨.

const FAMILY_MAX_LEVEL = 60;

// 가문 경험치: 캐릭터가 레벨업할 때마다 그 레벨에 비례해 쌓인다.
function familyXpToNext(level) {
  return Math.round(120 * Math.pow(level, 1.55));
}
function familyXpFromCharacterLevelUp(charLevel) {
  return 20 + charLevel * 12;
}

// 특성 트리. tier가 클수록 강하고, reqFamilyLevel + reqPrevTierPoints를 둘 다 만족해야 투자할 수 있다.
const FAMILY_TRAITS = [
  // --- 1단계: 조건 없음 ---
  { id: 'attack', tier: 1, name: '전투 훈련', stat: 'atk', perPoint: 8, max: 10,
    reqFamilyLevel: 1, reqPrevTierPoints: 0, unit: '공격력' },
  { id: 'defense', tier: 1, name: '방어 훈련', stat: 'def', perPoint: 7, max: 10,
    reqFamilyLevel: 1, reqPrevTierPoints: 0, unit: '방어력' },
  { id: 'vitality', tier: 1, name: '체력 단련', stat: 'hpPct', perPoint: 0.015, max: 10,
    reqFamilyLevel: 1, reqPrevTierPoints: 0, unit: '최대 HP' },

  // --- 2단계: 가문 Lv.10 + 1단계에 10포인트 ---
  { id: 'attackSpeed', tier: 2, name: '공격속도 숙련', stat: 'atkSpeed', perPoint: 0.025, max: 10,
    reqFamilyLevel: 10, reqPrevTierPoints: 10, unit: '공격속도' },
  { id: 'moveSpeed', tier: 2, name: '기동 훈련', stat: 'moveSpeed', perPoint: 0.02, max: 10,
    reqFamilyLevel: 10, reqPrevTierPoints: 10, unit: '이동속도' },
  { id: 'accuracy', tier: 2, name: '조준 숙련', stat: 'accuracy', perPoint: 0.02, max: 10,
    reqFamilyLevel: 10, reqPrevTierPoints: 10, unit: '명중률' },

  // --- 3단계: 가문 Lv.25 + 2단계에 15포인트 ---
  { id: 'pierce', tier: 3, name: '관통 숙련', stat: 'pierce', perPoint: 0.025, max: 10,
    reqFamilyLevel: 25, reqPrevTierPoints: 15, unit: '방어 무시' },
  { id: 'mastery', tier: 3, name: '가문의 비전', stat: 'atkPct', perPoint: 0.025, max: 10,
    reqFamilyLevel: 25, reqPrevTierPoints: 15, unit: '공격력 증폭' },
];

const FAMILY_TIER_LABEL = { 1: '1단계 — 기초', 2: '2단계 — 숙련', 3: '3단계 — 비전' };

// 가문 특성 · 캐릭터 고유 특성 · 전용기 버프가 모두 이 형태로 합산돼 unit.bonus가 된다.
const EMPTY_FAMILY_BONUS = {
  atk: 0, def: 0, hpPct: 0, atkSpeed: 0, moveSpeed: 0, accuracy: 0, pierce: 0, atkPct: 0,
  defPct: 0, crit: 0, critDmg: 0, lifesteal: 0, bossDmg: 0,
};

// 보너스 항목 표시 이름. frac=비율(0.03→3%), point=퍼센트포인트(3→3%), flat=고정 수치
const BONUS_LABEL = {
  atk: ['공격력', 'flat'], def: ['방어력', 'flat'],
  atkPct: ['공격력', 'frac'], defPct: ['방어력', 'frac'], hpPct: ['최대 HP', 'frac'],
  atkSpeed: ['공격속도', 'frac'], moveSpeed: ['이동속도', 'frac'], accuracy: ['명중률', 'frac'],
  pierce: ['방어율 무시', 'frac'], lifesteal: ['흡혈', 'frac'], bossDmg: ['보스 공격 시 데미지', 'frac'],
  crit: ['크리티컬 확률', 'point'], critDmg: ['크리티컬 데미지', 'point'],
};

function bonusText(bonus) {
  return Object.entries(bonus || {})
    .filter(([k, v]) => v && BONUS_LABEL[k])
    .map(([k, v]) => {
      const [label, kind] = BONUS_LABEL[k];
      const sign = v > 0 ? '+' : '';
      if (kind === 'frac') return `${label} ${sign}${+(v * 100).toFixed(1)}%`;
      if (kind === 'point') return `${label} ${sign}${+v.toFixed(1)}%`;
      return `${label} ${sign}${Math.round(v)}`;
    })
    .join(' · ');
}

// 같은 형태의 보너스 여러 개를 더한다(가문 + 특성 + 버프).
function mergeBonuses(...sources) {
  const out = { ...EMPTY_FAMILY_BONUS };
  sources.forEach((src) => {
    if (!src) return;
    Object.keys(out).forEach((k) => { out[k] += src[k] || 0; });
  });
  return out;
}

// 특성 효과 설명 문구
function familyTraitEffectText(trait, points) {
  const v = trait.perPoint * points;
  if (['hpPct', 'atkSpeed', 'moveSpeed', 'accuracy', 'pierce', 'atkPct'].includes(trait.stat)) {
    return `${trait.unit} +${(v * 100).toFixed(1)}%`;
  }
  return `${trait.unit} +${Math.round(v)}`;
}
