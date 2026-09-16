// 프롤로그 "영웅의 기억".
// 세이브가 없는 첫 실행에서 가문 전성기의 세 사람으로 30초쯤 싸워 본다.
// 목적은 하나 — "이 게임은 여기까지 간다"를 캐릭터를 만들기 전에 눈으로 보여주는 것.

const PROLOGUE = {
  zoneId: 'field6b',      // 심연의 균열 (마계 테마)
  heroes: ['lionello', 'clera', 'beatria'],
  heroLevel: 110,         // 베테랑 Lv.10 — 상위 스탠스가 열린 상태
  durationMs: 30000,      // 보스를 못 잡아도 여기서 끝난다
  outroMs: 2600,

  boss: {
    name: '마왕 아르카논', hp: 320000, atk: 120, defense: 140, xpReward: 0,
    race: 'demon', aggressive: true, boss: true, floor: 1,
    bossData: {
      enrageAt: 0.4,
      patterns: [
        { type: 'slam', telegraph: 900, radius: 210, damage: 150, cooldown: 4200, warn: '대지가 갈라진다!' },
        { type: 'volley', telegraph: 750, count: 5, damage: 90, cooldown: 3600, warn: '어둠의 탄막!' },
        { type: 'charge', telegraph: 700, speed: 380, damage: 130, cooldown: 3800, warn: '돌진 준비!' },
        { type: 'summon', telegraph: 950, count: 2, cooldown: 9000, warn: '심연에서 군세가 기어나온다!',
          minion: { name: '심연의 군세', hp: 2600, atk: 70, defense: 60, xpReward: 0, race: 'demon', aggressive: true } },
      ],
    },
  },
  minion: { name: '심연의 군세', hp: 2600, atk: 70, defense: 60, xpReward: 0, race: 'demon', aggressive: true },

  lines: [
    { at: 0, text: '백 년 전 — 가문은 마왕의 군세 앞을 막아섰다.' },
    { at: 4200, text: '그날의 세 사람은 이렇게 싸웠다.   ( Q W E 스킬 · R 전용기 · 방향키 이동 )' },
    { at: 12000, text: '검이 부러질 때까지, 주문이 마를 때까지.' },
    { at: 21000, text: '…그리고 가문은 그 자리에서 무너졌다.' },
  ],
  outro: '이제, 당신이 그 가문을 다시 세운다.',
};
