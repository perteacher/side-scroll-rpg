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
