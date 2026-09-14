// 보스 패턴 정의. 예고(telegraph) → 발동 → 후딜 순으로 돌아가며, HP가 절반 밑이면 광폭화한다.
// type: charge(돌진) / slam(주변 강타) / summon(소환) / volley(원거리 연사)
const BOSS_DATA = {
  '숲의 두목 그렐': {
    enrageAt: 0.5, patterns: [
      { type: 'charge', telegraph: 800, speed: 320, damage: 14, cooldown: 3600, warn: '돌진 준비!' },
      { type: 'slam', telegraph: 900, radius: 130, damage: 18, cooldown: 4200, warn: '내려찍기!' },
    ],
  },
  '채석장의 폭군 골모': {
    enrageAt: 0.5, patterns: [
      { type: 'slam', telegraph: 900, radius: 150, damage: 34, cooldown: 4000, warn: '대지 강타!' },
      { type: 'summon', telegraph: 1000, count: 2, minion: { name: '깨어난 돌조각', hp: 70, atk: 12, defense: 6, xpReward: 30, race: 'inanimate', aggressive: true }, cooldown: 8000, warn: '돌조각 소환!' },
      { type: 'charge', telegraph: 800, speed: 300, damage: 30, cooldown: 4400, warn: '돌진 준비!' },
    ],
  },
  '심해의 포식자 크라켄': {
    enrageAt: 0.5, patterns: [
      { type: 'volley', telegraph: 750, count: 3, damage: 42, cooldown: 3800, warn: '촉수 사격!' },
      { type: 'slam', telegraph: 950, radius: 170, damage: 58, cooldown: 4600, warn: '해일 강타!' },
      { type: 'summon', telegraph: 1000, count: 2, minion: { name: '기생 게', hp: 150, atk: 26, defense: 14, xpReward: 70, race: 'beast', aggressive: true }, cooldown: 9000, warn: '기생체 소환!' },
    ],
  },
  '유적의 수문장 아르콘': {
    enrageAt: 0.5, patterns: [
      { type: 'charge', telegraph: 700, speed: 380, damage: 72, cooldown: 3600, warn: '돌진 준비!' },
      { type: 'slam', telegraph: 900, radius: 190, damage: 88, cooldown: 4400, warn: '고대의 진동!' },
      { type: 'volley', telegraph: 800, count: 4, damage: 60, cooldown: 4200, warn: '봉인 광선!' },
    ],
  },
  '마왕군 사령관 발데': {
    enrageAt: 0.55, patterns: [
      { type: 'slam', telegraph: 850, radius: 210, damage: 120, cooldown: 4200, warn: '파멸의 일격!' },
      { type: 'charge', telegraph: 650, speed: 420, damage: 100, cooldown: 3400, warn: '돌진 준비!' },
      { type: 'summon', telegraph: 900, count: 3, minion: { name: '마족 친위병', hp: 420, atk: 58, defense: 34, xpReward: 320, race: 'demon', aggressive: true }, cooldown: 10000, warn: '친위대 소환!' },
      { type: 'volley', telegraph: 700, count: 5, damage: 90, cooldown: 3800, warn: '암흑 탄막!' },
    ],
  },
};

const BOSS_RESPAWN_MS = 60000;
