// 영입 퀘스트 체인. 티어가 올라갈수록 단계가 늘고 왕복이 많아진다.
// step.type: hunt(지정 사냥터 몹 처치) / collect(재료 수집) / talk(NPC 대화) / deliver(제작품 납품)
const RECRUIT_QUEST_TIERS = {
  1: (charName) => [
    { type: 'hunt', zoneId: 'field1a', enemyName: '숲도적', count: 5,
      text: '초심자의 숲에서 숲도적 5마리 처치' },
    { type: 'talk', npcId: 'delgado', text: '경비대장 델가도에게 실력을 인정받기' },
    { type: 'collect', itemId: 'beast_hide', count: 3, text: '짐승 가죽 3개 수집' },
  ],
  2: (charName) => [
    { type: 'hunt', zoneId: 'field2a', enemyName: '해골병사', count: 8,
      text: '버려진 채석장에서 해골병사 8마리 처치' },
    { type: 'talk', npcId: 'lorenzo', text: '사제 로렌초에게 정화 의식을 부탁' },
    { type: 'collect', itemId: 'grave_moss', count: 5, text: '무덤 이끼 5개 수집' },
    { type: 'deliver', itemId: 'ward_charm', count: 1, text: '퇴마 부적 1개를 제작해 납품' },
  ],
  3: (charName) => [
    { type: 'hunt', zoneId: 'field3a', enemyName: '해적 약탈자', count: 10,
      text: '해적의 은신처에서 약탈자 10마리 처치' },
    { type: 'talk', npcId: 'tobias', text: '밀수꾼 토비아스에게 항로를 묻기' },
    { type: 'hunt', zoneId: 'field3b', enemyName: '수중 망령', count: 8,
      text: '침몰선 잔해에서 수중 망령 8마리 처치' },
    { type: 'collect', itemId: 'deep_pearl', count: 4, text: '심해 진주 4개 수집' },
    { type: 'deliver', itemId: 'sea_compass', count: 1, text: '항해 나침반 1개를 제작해 납품' },
  ],
  4: (charName) => [
    { type: 'hunt', zoneId: 'field4a', enemyName: '사막 도적', count: 12,
      text: '모래폭풍 협곡에서 사막 도적 12마리 처치' },
    { type: 'talk', npcId: 'jamal', text: '대상 상인 자말에게 통행증 받기' },
    { type: 'hunt', zoneId: 'field4b', enemyName: '유적 수호자', count: 10,
      text: '고대 유적에서 수호자 10기 파괴' },
    { type: 'collect', itemId: 'relic_fragment', count: 6, text: '유물 파편 6개 수집' },
    { type: 'talk', npcId: 'isabel', text: '고고학자 이사벨에게 파편 감정받기' },
    { type: 'deliver', itemId: 'relic_key', count: 1, text: '유물 열쇠 1개를 제작해 납품' },
  ],
  5: (charName) => [
    { type: 'hunt', zoneId: 'field5a', enemyName: '마족 척후병', count: 14,
      text: '성벽 앞 전선에서 마족 척후병 14기 처치' },
    { type: 'talk', npcId: 'rosalind', text: '종군사제 로잘린에게 축복 받기' },
    { type: 'hunt', zoneId: 'field5b', enemyName: '마족 전사', count: 12,
      text: '마족의 진지에서 마족 전사 12기 처치' },
    { type: 'collect', itemId: 'dark_crystal', count: 3, text: '흑정석 3개 수집' },
    { type: 'talk', npcId: 'bernard', text: '총사령관 베르나르에게 전황 보고' },
    { type: 'deliver', itemId: 'holy_banner', count: 1, text: '성화 군기 1개를 제작해 납품' },
  ],
};

function makeRecruitSteps(tier, charName) {
  return RECRUIT_QUEST_TIERS[tier](charName).map((s) => ({ ...s }));
}
