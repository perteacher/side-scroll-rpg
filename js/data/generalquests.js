// 일반 퀘스트: 마을 게시판에서 수주한다. 영입/시나리오와 달리 반복 수행이 가능하고,
// 보상으로 경험치 카드와 스탠스 수련서를 준다.
// step.type: hunt(지정 사냥터 몹 처치) / collect(재료 수집) / deliver(제작품 납품)
const GENERAL_QUEST_DATA = [
  {
    id: 'g1_bandit', town: 'town1', minLevel: 1, title: '숲길 정비',
    desc: '숲도적이 길목을 막고 있다. 정리해 달라.',
    steps: [
      { type: 'hunt', zoneId: 'field1a', enemyName: '숲도적', count: 6, text: '초심자의 숲에서 숲도적 6마리 처치' },
    ],
    reward: { gold: 300, items: [{ id: 'exp_card_basic', count: 1 }] },
  },
  {
    id: 'g1_hide', town: 'town1', minLevel: 1, title: '가죽 납품',
    desc: '무두장이가 짐승 가죽을 찾는다.',
    steps: [
      { type: 'collect', itemId: 'beast_hide', count: 5, text: '짐승 가죽 5개 수집' },
    ],
    reward: { gold: 400, items: [{ id: 'stance_card_basic', count: 1 }] },
  },
  {
    id: 'g1_wolf', town: 'town1', minLevel: 5, title: '늑대 솎아내기',
    desc: '골짜기의 늑대가 가축을 노린다.',
    steps: [
      { type: 'hunt', zoneId: 'field1b', enemyName: '회색늑대', count: 8, text: '늑대 골짜기에서 회색늑대 8마리 처치' },
      { type: 'collect', itemId: 'wolf_fang', count: 4, text: '늑대 송곳니 4개 수집' },
    ],
    reward: { gold: 700, items: [{ id: 'exp_card_basic', count: 2 }] },
  },
  {
    id: 'g2_skeleton', town: 'town2', minLevel: 10, title: '채석장 위령',
    desc: '해골병사를 정리해 채석장을 되찾자.',
    steps: [
      { type: 'hunt', zoneId: 'field2a', enemyName: '해골병사', count: 10, text: '버려진 채석장에서 해골병사 10마리 처치' },
    ],
    reward: { gold: 1200, items: [{ id: 'exp_card_basic', count: 3 }] },
  },
  {
    id: 'g2_charm', town: 'town2', minLevel: 12, title: '부적 공급',
    desc: '순찰대에 나눠줄 퇴마 부적이 필요하다.',
    steps: [
      { type: 'collect', itemId: 'grave_moss', count: 6, text: '무덤 이끼 6개 수집' },
      { type: 'deliver', itemId: 'ward_charm', count: 1, text: '퇴마 부적 1개 제작해 납품' },
    ],
    reward: { gold: 2000, items: [{ id: 'exp_card_basic', count: 3 }, { id: 'stance_card_basic', count: 2 }] },
  },
  {
    id: 'g2_golem', town: 'town2', minLevel: 15, title: '골렘 해체',
    desc: '채석골렘이 굴을 막고 있다.',
    steps: [
      { type: 'hunt', zoneId: 'field2b', enemyName: '채석골렘', count: 5, text: '망령의 계곡에서 채석골렘 5기 파괴' },
      { type: 'collect', itemId: 'stone_core', count: 5, text: '석심 조각 5개 수집' },
    ],
    reward: { gold: 2600, items: [{ id: 'exp_card_basic', count: 4 }] },
  },
  {
    id: 'g3_pirate', town: 'town3', minLevel: 20, title: '항로 확보',
    desc: '약탈자를 몰아내야 배가 뜬다.',
    steps: [
      { type: 'hunt', zoneId: 'field3a', enemyName: '해적 약탈자', count: 12, text: '해적의 은신처에서 약탈자 12마리 처치' },
    ],
    reward: { gold: 4500, items: [{ id: 'exp_card_basic', count: 5 }] },
  },
  {
    id: 'g3_pearl', town: 'town3', minLevel: 23, title: '진주 수집',
    desc: '세공사가 심해 진주를 급히 구한다.',
    steps: [
      { type: 'collect', itemId: 'deep_pearl', count: 6, text: '심해 진주 6개 수집' },
    ],
    reward: { gold: 5200, items: [{ id: 'stance_card_basic', count: 4 }] },
  },
  {
    id: 'g3_compass', town: 'town3', minLevel: 25, title: '나침반 제작 의뢰',
    desc: '원양 항해에 쓸 나침반이 필요하다.',
    steps: [
      { type: 'hunt', zoneId: 'field3b', enemyName: '수중 망령', count: 10, text: '침몰선 잔해에서 수중 망령 10마리 처치' },
      { type: 'deliver', itemId: 'sea_compass', count: 1, text: '항해 나침반 1개 제작해 납품' },
    ],
    reward: { gold: 8000, items: [{ id: 'exp_card_basic', count: 6 }, { id: 'stance_card_high', count: 1 }] },
  },
  {
    id: 'g4_sand', town: 'town4', minLevel: 30, title: '대상로 경비',
    desc: '사막 도적이 상단을 노린다.',
    steps: [
      { type: 'hunt', zoneId: 'field4a', enemyName: '사막 도적', count: 14, text: '모래폭풍 협곡에서 사막 도적 14마리 처치' },
    ],
    reward: { gold: 14000, items: [{ id: 'exp_card_basic', count: 8 }] },
  },
  {
    id: 'g4_relic', town: 'town4', minLevel: 33, title: '유물 회수',
    desc: '발굴단이 잃어버린 파편을 찾는다.',
    steps: [
      { type: 'hunt', zoneId: 'field4b', enemyName: '유적 수호자', count: 12, text: '고대 유적에서 수호자 12기 파괴' },
      { type: 'collect', itemId: 'relic_fragment', count: 8, text: '유물 파편 8개 수집' },
    ],
    reward: { gold: 20000, items: [{ id: 'exp_card_basic', count: 10 }, { id: 'stance_card_high', count: 2 }] },
  },
  {
    id: 'g4_key', town: 'town4', minLevel: 36, title: '봉인 열쇠',
    desc: '유적 심부를 열 열쇠를 만들어 오라.',
    steps: [
      { type: 'deliver', itemId: 'relic_key', count: 1, text: '유물 열쇠 1개 제작해 납품' },
    ],
    reward: { gold: 30000, items: [{ id: 'exp_card_basic', count: 12 }] },
  },
  {
    id: 'g5_scout', town: 'town5', minLevel: 40, title: '전선 방어',
    desc: '척후병을 밀어내야 성벽이 버틴다.',
    steps: [
      { type: 'hunt', zoneId: 'field5a', enemyName: '마족 척후병', count: 16, text: '성벽 앞 전선에서 척후병 16기 처치' },
    ],
    reward: { gold: 42000, items: [{ id: 'exp_card_basic', count: 16 }] },
  },
  {
    id: 'g5_crystal', town: 'town5', minLevel: 43, title: '흑정석 확보',
    desc: '마도구 제작에 흑정석이 필요하다.',
    steps: [
      { type: 'hunt', zoneId: 'field5b', enemyName: '마족 전사', count: 14, text: '마족의 진지에서 마족 전사 14기 처치' },
      { type: 'collect', itemId: 'dark_crystal', count: 5, text: '흑정석 5개 수집' },
    ],
    reward: { gold: 60000, items: [{ id: 'exp_card_basic', count: 20 }, { id: 'stance_card_high', count: 3 }] },
  },
  {
    id: 'g5_banner', town: 'town5', minLevel: 45, title: '성화 군기',
    desc: '전선의 사기를 올릴 군기를 만들어 오라.',
    steps: [
      { type: 'deliver', itemId: 'holy_banner', count: 1, text: '성화 군기 1개 제작해 납품' },
    ],
    reward: { gold: 90000, items: [{ id: 'exp_card_basic', count: 25 }] },
  },
  {
    id: 'g6_dragon', town: 'town6', minLevel: 100, title: '용린 사냥',
    desc: '관문을 넘보는 용린 병사를 처리하라.',
    steps: [
      { type: 'hunt', zoneId: 'field6a', enemyName: '용린 병사', count: 20, text: '용의 둥지 외곽에서 용린 병사 20기 처치' },
    ],
    reward: { gold: 200000, items: [{ id: 'exp_card_veteran', count: 2 }] },
  },
  {
    id: 'g6_void', town: 'town6', minLevel: 101, title: '균열 봉쇄',
    desc: '심연에서 기어나오는 것들을 막아라.',
    steps: [
      { type: 'hunt', zoneId: 'field6b', enemyName: '균열의 포식자', count: 24, text: '심연의 균열에서 포식자 24기 처치' },
      { type: 'collect', itemId: 'dark_crystal', count: 10, text: '흑정석 10개 수집' },
    ],
    reward: { gold: 600000, items: [{ id: 'exp_card_veteran', count: 4 }, { id: 'stance_card_high', count: 5 }] },
  },
  {
    id: 'g6_time', town: 'town6', minLevel: 111, title: '멈춘 시간',
    desc: '회랑의 파수꾼들이 다시 움직이기 시작했다.',
    steps: [
      { type: 'hunt', zoneId: 'field6c', enemyName: '정지된 파수꾼', count: 28, text: '시간이 멈춘 회랑에서 파수꾼 28기 처치' },
    ],
    reward: { gold: 2000000, items: [{ id: 'exp_card_expert', count: 3 }] },
  },
  {
    id: 'g6_chronos', town: 'town6', minLevel: 121, title: '시간의 지배자',
    desc: '회랑 끝의 크로노스를 토벌하라.',
    steps: [
      { type: 'hunt', zoneId: 'field6c', enemyName: '시간의 지배자 크로노스', count: 1, text: '크로노스 토벌' },
    ],
    reward: { gold: 8000000, items: [{ id: 'exp_card_master', count: 2 }] },
  },
];
