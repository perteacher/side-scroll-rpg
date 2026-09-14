// 시나리오 챕터 1~5. 챕터1은 첫 마을, 챕터5는 마지막 마을에서 진행된다.
// step.type: talk(지정 NPC와 대화) / hunt(지정 사냥터에서 N마리 처치) / reach(지정 존 도달)
const SCENARIO_DATA = [
  {
    chapter: 1, title: '숲을 삼킨 도적단', townZoneId: 'town1',
    intro: '로스피에 외곽에 도적단이 자리를 잡았다. 경비대장이 손을 빌려달라 한다.',
    steps: [
      { type: 'talk', npcId: 'delgado', text: '경비대장 델가도에게 사정을 듣는다.',
        line: '"새로 온 용병인가? 초심자의 숲에 도적 놈들이 진을 쳤다. 놈들부터 솎아내 주게."' },
      { type: 'hunt', zoneId: 'field1a', enemyName: '숲도적', count: 8, text: '초심자의 숲에서 숲도적 8마리를 처치한다.' },
      { type: 'talk', npcId: 'delgado', text: '델가도에게 결과를 보고한다.',
        line: '"솜씨가 제법이군. 하지만 놈들 배후에 국경 쪽 세력이 있는 것 같다. 에르난데스로 가 보게."' },
    ],
    reward: { gold: 300, xp: 80 },
  },
  {
    chapter: 2, title: '국경의 망령', townZoneId: 'town2',
    intro: '국경 마을의 채석장에서 죽은 자들이 걸어 다닌다는 소문이 돈다.',
    steps: [
      { type: 'talk', npcId: 'lorenzo', text: '사제 로렌초를 만난다.',
        line: '"채석장의 망자들이 안식을 잃었소. 그들을 눕혀 주시오. 그래야 계곡의 문이 열립니다."' },
      { type: 'hunt', zoneId: 'field2a', enemyName: '해골병사', count: 10, text: '버려진 채석장에서 해골병사 10마리를 처치한다.' },
      { type: 'reach', zoneId: 'field2b', text: '망령의 계곡으로 들어간다.' },
      { type: 'talk', npcId: 'herrera', text: '대장장이 에레라에게 계곡에서 본 것을 전한다.',
        line: '"계곡 안쪽의 금속이라… 이건 바다 건너 항구에서 쓰는 물건이오. 포르토벨로로 가 보시오."' },
    ],
    reward: { gold: 600, xp: 260 },
  },
  {
    chapter: 3, title: '항구의 검은 연맹', townZoneId: 'town3',
    intro: '포르토벨로의 해적 연맹이 국경까지 손을 뻗치고 있다.',
    steps: [
      { type: 'talk', npcId: 'camila', text: '항만장 카밀라에게 밀수 경로를 묻는다.',
        line: '"연맹 놈들이 은신처에서 물건을 옮깁니다. 약탈자들을 쳐내면 길이 보일 거예요."' },
      { type: 'hunt', zoneId: 'field3a', enemyName: '해적 약탈자', count: 12, text: '해적의 은신처에서 약탈자 12마리를 처치한다.' },
      { type: 'reach', zoneId: 'field3b', text: '침몰선 잔해를 조사한다.' },
      { type: 'talk', npcId: 'camila', text: '카밀라에게 침몰선에서 찾은 봉인석을 보여준다.',
        line: '"이 문양… 사막의 유적에서 나온 겁니다. 알카사르의 고고학자를 찾아가세요."' },
    ],
    reward: { gold: 1200, xp: 900 },
  },
  {
    chapter: 4, title: '유적의 봉인', townZoneId: 'town4',
    intro: '봉인석의 정체를 아는 사람은 사막 도시의 고고학자뿐이다.',
    steps: [
      { type: 'talk', npcId: 'isabel', text: '고고학자 이사벨에게 봉인석을 감정받는다.',
        line: '"봉인석이 깨지고 있어요. 유적의 수호자들이 폭주한 것도 그 탓입니다. 놈들을 멈춰 주세요."' },
      { type: 'hunt', zoneId: 'field4b', enemyName: '유적 수호자', count: 14, text: '고대 유적에서 수호자 14기를 파괴한다.' },
      { type: 'talk', npcId: 'isabel', text: '이사벨에게 봉인이 풀린 이유를 듣는다.',
        line: '"봉인을 푼 건 마족입니다. 무라예스 성벽이 다음 목표예요. 서두르세요."' },
    ],
    reward: { gold: 2400, xp: 2600 },
  },
  {
    chapter: 5, title: '무라예스 공방전', townZoneId: 'town5',
    intro: '마족 군세가 성벽 도시로 몰려온다. 마지막 전선이다.',
    steps: [
      { type: 'talk', npcId: 'bernard', text: '총사령관 베르나르에게 전황을 보고받는다.',
        line: '"성벽 앞이 이미 뚫렸다. 척후병을 밀어내고 놈들의 진지를 쳐라."' },
      { type: 'hunt', zoneId: 'field5a', enemyName: '마족 척후병', count: 16, text: '성벽 앞 전선에서 마족 척후병 16기를 처치한다.' },
      { type: 'hunt', zoneId: 'field5b', enemyName: '마족 대장', count: 2, text: '마족의 진지에서 마족 대장 2기를 토벌한다.' },
      { type: 'talk', npcId: 'bernard', text: '베르나르에게 승전을 알린다.',
        line: '"우리가 이겼다! …허나 놈들의 본대는 아직 바다 건너에 있다. 다음 장을 기약하지."' },
    ],
    reward: { gold: 5000, xp: 9000 },
  },
];
