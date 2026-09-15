// 상태이상. 스킬 이름에만 있던 기절·빙결·출혈·화상·감전에 실제 효과를 붙인다.
// hardCc: 이동·공격 불가 / slow: 이동 속도 감소(공격 속도는 그 절반만큼) /
// dot: 틱마다 "건 순간의 피해 × 비율"만큼 피해(중첩마다 곱) / dmgTaken: 받는 피해 증가 / defDown: 방어력 감소
const STATUS_DATA = {
  stun: { id: 'stun', name: '기절', color: '#f7dc6f', durationMs: 1600, hardCc: true, desc: '이동·공격 불가' },
  freeze: { id: 'freeze', name: '빙결', color: '#aee9ff', durationMs: 2000, hardCc: true, dmgTaken: 0.1, desc: '이동·공격 불가, 받는 피해 +10%' },
  chill: { id: 'chill', name: '냉기', color: '#5dade2', durationMs: 3500, slow: 0.45, desc: '이동 속도 -45%, 공격 속도 -25%' },
  bleed: { id: 'bleed', name: '출혈', color: '#e74c3c', durationMs: 5000, tickMs: 500, dot: 0.05, maxStacks: 5, desc: '0.5초마다 피해, 최대 5중첩' },
  burn: { id: 'burn', name: '화상', color: '#ff8c1a', durationMs: 4000, tickMs: 500, dot: 0.09, maxStacks: 1, desc: '0.5초마다 화염 피해' },
  shock: { id: 'shock', name: '감전', color: '#f4d03f', durationMs: 4000, dmgTaken: 0.2, desc: '받는 피해 +20%' },
  armor_break: { id: 'armor_break', name: '방어 붕괴', color: '#bdc3c7', durationMs: 6000, defDown: 0.5, desc: '방어력 -50%' },
};
const STATUS_ORDER = ['stun', 'freeze', 'chill', 'shock', 'burn', 'bleed', 'armor_break'];

// 보스는 행동 불가가 짧게 걸리고, 한 번 걸리면 한동안 면역이다(무한 기절 방지). 둔화도 절반만.
const STATUS_BOSS_CC_MULT = 0.35;
const STATUS_CC_IMMUNE_MS = 6000;
const STATUS_BOSS_SLOW_MULT = 0.5;
// 스킬 레벨 1당 부여 확률 +5%p
const STATUS_CHANCE_PER_SKILL_LV = 0.05;
// 속성 스탠스의 기본 공격은 낮은 확률로 속성 상태이상을 건다.
const ELEMENT_STATUS = { fire: 'burn', ice: 'chill', lightning: 'shock' };
const BASIC_STATUS_CHANCE = 0.1;

// 스킬별 부여 상태이상. chance는 스킬 Lv.1 기준.
const SKILL_STATUS = {
  // 근접
  flurry: [{ id: 'bleed', chance: 0.25 }],
  guard_break: [{ id: 'armor_break', chance: 1 }],
  bleed_stab: [{ id: 'bleed', chance: 1 }],
  stun_punch: [{ id: 'stun', chance: 1 }],
  war_cry: [{ id: 'armor_break', chance: 0.6 }],
  crushing_blow: [{ id: 'stun', chance: 0.4 }],
  blade_storm: [{ id: 'bleed', chance: 0.6 }],
  dragon_fury: [{ id: 'stun', chance: 1 }],
  divine_slash: [{ id: 'armor_break', chance: 1 }, { id: 'stun', chance: 0.3 }],
  // 원거리
  snipe: [{ id: 'armor_break', chance: 0.5 }],
  suppress: [{ id: 'chill', chance: 1 }],
  arrow_rain: [{ id: 'bleed', chance: 0.3 }],
  scatter_shot: [{ id: 'chill', chance: 0.4 }],
  piercing_shot: [{ id: 'armor_break', chance: 0.6 }],
  storm_volley: [{ id: 'bleed', chance: 0.45 }],
  heaven_arrow: [{ id: 'stun', chance: 0.6 }],
  hail_of_fire: [{ id: 'burn', chance: 0.6 }],
  // 마법
  fireball: [{ id: 'burn', chance: 0.3 }],
  frostbolt: [{ id: 'chill', chance: 0.4 }],
  sparkbolt: [{ id: 'shock', chance: 0.3 }],
  ignite: [{ id: 'burn', chance: 1 }],
  freeze: [{ id: 'freeze', chance: 1 }],
  shock: [{ id: 'shock', chance: 1 }],
  flame_nova: [{ id: 'burn', chance: 0.6 }],
  ice_nova: [{ id: 'chill', chance: 1 }, { id: 'freeze', chance: 0.25 }],
  chain_lightning: [{ id: 'shock', chance: 0.6 }],
  inferno: [{ id: 'burn', chance: 0.8 }],
  glacier: [{ id: 'chill', chance: 1 }, { id: 'freeze', chance: 0.4 }],
  thunderstorm: [{ id: 'shock', chance: 0.8 }],
  solar_flare: [{ id: 'burn', chance: 1 }],
  eternal_ice: [{ id: 'freeze', chance: 1 }],
  judgment_bolt: [{ id: 'shock', chance: 1 }, { id: 'stun', chance: 0.4 }],
  meteor: [{ id: 'burn', chance: 1 }, { id: 'stun', chance: 0.3 }],
  blizzard: [{ id: 'chill', chance: 1 }, { id: 'freeze', chance: 0.4 }],
  heaven_storm: [{ id: 'shock', chance: 1 }],
};

function skillStatuses(skillId) { return SKILL_STATUS[skillId] || []; }

function basicAttackStatuses(stance) {
  const id = stance && ELEMENT_STATUS[stance.element];
  return id ? [{ id, chance: BASIC_STATUS_CHANCE }] : [];
}

// 전용기: 속성이 있으면 속성 상태이상, 없으면 기술 종류에 맞춰.
function signatureStatuses(sig) {
  if (!sig || sig.kind === 'buff' || sig.kind === 'heal') return [];
  if (sig.element) return [{ id: ELEMENT_STATUS[sig.element], chance: 0.6 }];
  if (sig.kind === 'nuke') return [{ id: 'stun', chance: 0.5 }];
  if (sig.kind === 'barrage' || sig.kind === 'drain') return [{ id: 'bleed', chance: 0.35 }];
  return [{ id: 'armor_break', chance: 0.4 }];
}

// 보스 패턴이 파티에 거는 상태이상. 내려찍기 기절은 공중에 떠 있으면 피할 수 있다(점프로 회피).
const BOSS_PATTERN_STATUS = {
  slam: { id: 'stun', durationMs: 1000, groundedOnly: true },
  charge: { id: 'stun', durationMs: 600 },
  volley: { id: 'burn' },
};

function statusListText(list) {
  return list.map((s) => `${STATUS_DATA[s.id].name} ${Math.round(Math.min(1, s.chance) * 100)}%`).join(' · ');
}

// 7×7 도트 아이콘. c=상태 색 / l=밝게 / d=어둡게
const STATUS_ICONS = {
  stun: [
    '...c...',
    '..clc..',
    'ccclccc',
    '.clllc.',
    '..clc..',
    '.cc.cc.',
    'c.....c',
  ],
  freeze: [
    '...l...',
    '.l.c.l.',
    '..ccc..',
    'lcclccl',
    '..ccc..',
    '.l.c.l.',
    '...l...',
  ],
  chill: [
    '..ccc..',
    '..clc..',
    '..clc..',
    'ccclccc',
    '.clllc.',
    '..clc..',
    '...c...',
  ],
  bleed: [
    '...c...',
    '..ccc..',
    '..clc..',
    '.cclcc.',
    '.ccccc.',
    '.cdddc.',
    '..ddd..',
  ],
  burn: [
    '...c...',
    '..cc...',
    '..ccc.c',
    '.cclcc.',
    'ccllccc',
    'cclllcc',
    '.ddddd.',
  ],
  shock: [
    '...ccc.',
    '..clc..',
    '.ccc...',
    'cclllc.',
    '...ccc.',
    '..cc...',
    '.c.....',
  ],
  armor_break: [
    'ccccccc',
    'cll.llc',
    'cl.lllc',
    'cll.llc',
    '.cl.lc.',
    '..c.c..',
    '...c...',
  ],
};
