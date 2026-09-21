// 캐릭터 생성 시 고를 수 있는 기본 클래스 5종.
// 영입 캐릭터(CHARACTER_DATA)와 달리 플레이어가 닉네임을 붙여 직접 만든다.
const CLASS_DATA = [
  {
    id: 'fighter', name: '파이터', attackType: 'melee', stanceIds: ['sword', 'spear'], color: '#c0392b',
    desc: '검과 창을 다루는 근접 전위. 체력과 힘이 높다.',
    baseStats: { str: 18, agi: 12, vit: 17, skl: 12, int: 6, sen: 8 },
  },
  {
    id: 'musketeer', name: '머스킷티어', attackType: 'ranged', stanceIds: ['musket', 'crossbow'], color: '#16a085',
    desc: '장거리 화기 전문. 한 방의 위력이 크다.',
    baseStats: { str: 10, agi: 15, vit: 12, skl: 18, int: 6, sen: 11 },
  },
  {
    id: 'wizard', name: '위자드', attackType: 'magic', stanceIds: ['flame', 'frost'], color: '#8e44ad',
    desc: '화염과 빙한을 다루는 원소 마법사.',
    baseStats: { str: 6, agi: 9, vit: 10, skl: 8, int: 20, sen: 14 },
  },
  {
    id: 'warlock', name: '워록', attackType: 'magic', stanceIds: ['spark', 'frost'], color: '#2c3e50',
    desc: '전격과 저주를 쓰는 술사. 감각이 높다.',
    baseStats: { str: 6, agi: 10, vit: 10, skl: 8, int: 19, sen: 16 },
  },
  // 원작 그라나도 에스파다의 스카우트를 그대로 따랐다. 평타가 공격이 아니라 치료이고,
  // 퍼스트 에이드(치료)와 포르티투도(버프)를 맨손으로도 쓴다. 무기는 로자리오.
  {
    id: 'scout', name: '스카우트', attackType: 'support', stanceIds: ['firstaid', 'fortitudo'], color: '#27ae60',
    desc: '치료와 버프를 맡는 힐러. 기본 공격 대신 동료를 회복시킨다. 무기는 로자리오.',
    baseStats: { str: 7, agi: 13, vit: 13, skl: 11, int: 18, sen: 17 },
  },
];
