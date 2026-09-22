// 영입 퀘스트 — 캐릭터마다 따로.
//
// 예전에는 티어별로 한 벌씩만 있어서, 같은 마을의 일곱 명이 토씨 하나 안 틀리고 같은 퀘스트를 줬다.
// 이제 45명이 각자 다른 시험을 낸다. 그 사람의 무기·성격에서 나온 시험이라,
// 무엇을 시키는지만 봐도 누구인지 짐작이 가게 했다.
//
// step.type
//   hunt    … 지정 사냥터의 지정 몹 처치 (보스 이름을 쓰면 보스 토벌 의뢰가 된다)
//   collect … 재료 수집
//   talk    … 마을 NPC와 대화
//   deliver … 제작품 납품 (재료를 소모한다)
//   reach   … 지정 사냥터에 도달 (정찰)
//   pay     … 골드 지불
//
// reqChapter … 이 시나리오 챕터를 '완료'해야 퀘스트를 받을 수 있다.
//   마을은 시나리오보다 먼저 갈 수 있으므로, 이야기와 얽힌 인물은 그 대목을 지나야 합류한다.
//   (예: 베르넬리아는 로렌초가 채석장 사건을 매듭지은 뒤에야 따라나선다)
const RECRUIT_QUESTS = {
  // ===== 1티어 · 초심자 마을 로스피에 =====
  paion: {
    intro: '"방패를 든 자는 뒤가 아니라 앞에 선다. 내가 설 자리가 있는지부터 보자."',
    steps: [
      { type: 'hunt', zoneId: 'field1a', enemyName: '숲도적', count: 4,
        text: '초심자의 숲에서 숲도적 4마리를 정면으로 상대' },
      { type: 'collect', itemId: 'bandit_cloth', count: 3, text: '도적의 천조각 3개를 증거로 수집' },
    ],
  },
  clode: {
    intro: '"느린 검은 안 쓴다. 나를 따라올 수 있는지 보자고."',
    steps: [
      { type: 'talk', npcId: 'delgado', text: '경비대장 델가도에게 결투 허가를 받기' },
      { type: 'hunt', zoneId: 'field1a', enemyName: '들토끼', count: 6, text: '숲의 들토끼 6마리를 놓치지 않고 잡기' },
      { type: 'hunt', zoneId: 'field1b', enemyName: '회색늑대', count: 5, text: '늑대 골짜기에서 회색늑대 5마리 처치' },
    ],
  },
  itju: {
    intro: '"싸움 실력은 됐고. 발이 느리면 같이 못 다녀."',
    steps: [
      { type: 'hunt', zoneId: 'field1b', enemyName: '산양', count: 8, text: '골짜기의 산양 8마리를 따라잡아 사냥' },
      { type: 'collect', itemId: 'wolf_fang', count: 4, text: '늑대 송곳니 4개 수집' },
    ],
  },
  panfilos: {
    intro: '"한 번에 끝내려 들지 마라. 오래 버티는 쪽이 이긴다. 끝까지 해내 봐라."',
    steps: [
      { type: 'hunt', zoneId: 'field1a', enemyName: '숲도적', count: 6, text: '초심자의 숲에서 숲도적 6마리 처치' },
      { type: 'hunt', zoneId: 'field1b', enemyName: '회색늑대', count: 8, text: '늑대 골짜기에서 회색늑대 8마리 처치' },
      { type: 'collect', itemId: 'beast_hide', count: 5, text: '짐승 가죽 5개 수집' },
      { type: 'deliver', itemId: 'sturdy_blade', count: 1, text: '튼튼한 검 1자루를 제작해 납품' },
    ],
  },
  scowt: {
    intro: '"쏘는 건 나중 일이다. 먼저 보는 법부터 배워라."',
    steps: [
      { type: 'reach', zoneId: 'field1b', text: '늑대 골짜기까지 들어가 지형을 눈에 담기' },
      { type: 'hunt', zoneId: 'field1b', enemyName: '회색늑대', count: 6, text: '골짜기의 회색늑대 6마리 처치' },
      { type: 'talk', npcId: 'marta', text: '약초상 마르타에게 시위에 먹일 기름을 얻기' },
    ],
  },
  wizarr: {
    intro: '"불은 세게 쓰는 게 아니라 작게 쓰는 게 어렵다. 조절을 보여다오."',
    steps: [
      { type: 'hunt', zoneId: 'field1a', enemyName: '들토끼', count: 10, text: '들토끼 10마리를 태우지 않고 잡기' },
      { type: 'collect', itemId: 'beast_hide', count: 4, text: '멀쩡한 짐승 가죽 4장 수집' },
    ],
  },
  jackson: {
    intro: '"한 발에 하나. 그게 내 셈법이다. 화약값은 자네가 내고."',
    steps: [
      { type: 'hunt', zoneId: 'field1a', enemyName: '숲도적', count: 10, text: '초심자의 숲에서 숲도적 10마리 처치' },
      { type: 'pay', gold: 300, text: '화약값 300G 지불' },
    ],
  },

  // ===== 2티어 · 국경 마을 에르난데스 =====
  ramirof: {
    intro: '"물러설 줄 아는 놈은 필요 없다. 좀비 떼 한가운데로 들어가 봐라."',
    steps: [
      { type: 'hunt', zoneId: 'field2a', enemyName: '석공 좀비', count: 12, text: '버려진 채석장에서 석공 좀비 12기 처치' },
      { type: 'collect', itemId: 'bone_shard', count: 5, text: '뼛조각 5개 수집' },
    ],
  },
  adelin: {
    reqChapter: 1,
    intro: '"로스피에 도적단을 정리했다지? 그럼 이야기가 되겠군. 급소를 아는지 보자."',
    steps: [
      { type: 'hunt', zoneId: 'field2a', enemyName: '해골병사', count: 10, text: '채석장의 해골병사 10기를 한 발씩 무너뜨리기' },
      { type: 'hunt', zoneId: 'field2b', enemyName: '망령', count: 8, text: '망령의 계곡에서 망령 8기 처치' },
      { type: 'talk', npcId: 'herrera', text: '대장장이 에레라에게 탄을 벼려 받기' },
    ],
  },
  emilrea: {
    intro: '"돌로 된 것들은 마법이 잘 안 먹힌다. 그래서 재미있지."',
    steps: [
      { type: 'collect', itemId: 'stone_core', count: 6, text: '석심 조각 6개 수집' },
      { type: 'hunt', zoneId: 'field2b', enemyName: '채석골렘', count: 8, text: '망령의 계곡에서 채석골렘 8기 파괴' },
    ],
  },
  sohoa: {
    intro: '"강한 것만 잡는 건 사냥이 아니야. 왔던 길도 되짚을 줄 알아야지."',
    steps: [
      { type: 'hunt', zoneId: 'field1b', enemyName: '회색늑대', count: 10, text: '늑대 골짜기로 되돌아가 회색늑대 10마리 처치' },
      { type: 'hunt', zoneId: 'field2a', enemyName: '해골병사', count: 12, text: '버려진 채석장에서 해골병사 12기 처치' },
      { type: 'collect', itemId: 'wolf_fang', count: 6, text: '늑대 송곳니 6개 수집' },
    ],
  },
  vernelia: {
    reqChapter: 2,
    intro: '"채석장의 망자들이 눕는 걸 보았습니다. 그 손이라면 제 기도를 맡길 만하겠군요."',
    steps: [
      { type: 'talk', npcId: 'lorenzo', text: '사제 로렌초에게 동행 허락을 구하기' },
      { type: 'collect', itemId: 'grave_moss', count: 6, text: '무덤 이끼 6개 수집' },
      { type: 'deliver', itemId: 'ward_charm', count: 1, text: '퇴마 부적 1개를 제작해 납품' },
    ],
  },
  mbomar: {
    intro: '"내 몸값은 비싸다. 돌덩이를 부술 팔과, 값을 치를 지갑. 둘 다 보여라."',
    steps: [
      { type: 'hunt', zoneId: 'field2b', enemyName: '채석골렘', count: 10, text: '망령의 계곡에서 채석골렘 10기 파괴' },
      { type: 'collect', itemId: 'stone_core', count: 8, text: '석심 조각 8개 수집' },
      { type: 'pay', gold: 1200, text: '계약금 1,200G 지불' },
    ],
  },
  risael: {
    intro: '"말이 길다. 계곡까지 들어와서 다시 말해."',
    steps: [
      { type: 'reach', zoneId: 'field2b', text: '망령의 계곡까지 들어가기' },
      { type: 'hunt', zoneId: 'field2b', enemyName: '망령', count: 14, text: '계곡의 망령 14기 처치' },
    ],
  },

  // ===== 3티어 · 항구 마을 포르토벨로 =====
  musketya: {
    intro: '"항구에서는 총성보다 은화가 먼저 말을 하죠. 둘 다 챙겨 오세요."',
    steps: [
      { type: 'hunt', zoneId: 'field3a', enemyName: '해적 약탈자', count: 12, text: '해적의 은신처에서 약탈자 12마리 처치' },
      { type: 'collect', itemId: 'pirate_coin', count: 6, text: '해적의 은화 6개 수집' },
    ],
  },
  cortasal: {
    reqChapter: 2,
    intro: '"국경 일을 마무리 짓고 왔다고? 그럼 여기 물밑 사정도 견디겠군."',
    steps: [
      { type: 'hunt', zoneId: 'field3a', enemyName: '부두 짐꾼', count: 10, text: '은신처의 부두 짐꾼 10명을 제압' },
      { type: 'talk', npcId: 'tobias', text: '밀수꾼 토비아스에게 뒷골목 소문을 사기' },
      { type: 'hunt', zoneId: 'field3b', enemyName: '수중 망령', count: 10, text: '침몰선 잔해에서 수중 망령 10기 처치' },
    ],
  },
  andrei: {
    reqChapter: 3,
    intro: '"연맹이 무너지는 걸 보았소. 판을 읽는 사람 밑에서라면 검을 들 만하지."',
    steps: [
      { type: 'talk', npcId: 'camila', text: '항만장 카밀라에게 추천을 받기' },
      { type: 'hunt', zoneId: 'field3a', enemyName: '해적 약탈자', count: 16, text: '남은 약탈자 16마리를 쓸어내기' },
      { type: 'collect', itemId: 'wet_timber', count: 6, text: '젖은 선재 6개 수집' },
      { type: 'deliver', itemId: 'sea_compass', count: 1, text: '항해 나침반 1개를 제작해 납품' },
    ],
  },
  alejandr: {
    intro: '"바닷물은 마력을 먹어치우거든. 그 아래서도 주문이 서는지 보고 싶군."',
    steps: [
      { type: 'collect', itemId: 'deep_pearl', count: 5, text: '심해 진주 5개 수집' },
      { type: 'hunt', zoneId: 'field3b', enemyName: '난파선 게', count: 12, text: '침몰선 잔해의 난파선 게 12마리 처치' },
    ],
  },
  graciel: {
    intro: '"잔챙이 숫자는 관심 없다. 채석장을 짓누르던 그 덩치를 가져와라. 그거면 됐다."',
    steps: [
      { type: 'hunt', zoneId: 'field2b', enemyName: '채석장의 폭군 골모', count: 1, text: '채석장의 폭군 골모를 단독 토벌' },
    ],
  },
  gracia: {
    intro: '"한 발에 하나씩 맞히는 건 나도 해. 나는 한 발로 여럿을 눕히지. 그게 되는지 보자."',
    steps: [
      { type: 'hunt', zoneId: 'field3a', enemyName: '해적 약탈자', count: 14, text: '해적의 은신처에서 약탈자 14마리 처치' },
      { type: 'collect', itemId: 'wet_timber', count: 5, text: '개머리판에 쓸 젖은 선재 5개 수집' },
      { type: 'pay', gold: 4000, text: '산탄 값 4,000G 지불' },
    ],
  },
  rorken: {
    intro: '"창은 물속에서 무겁다. 그래도 들고 들어갈 배짱이 있나?"',
    steps: [
      { type: 'reach', zoneId: 'field3b', text: '침몰선 잔해까지 잠입' },
      { type: 'hunt', zoneId: 'field3b', enemyName: '수중 망령', count: 14, text: '수중 망령 14기 처치' },
      { type: 'collect', itemId: 'deep_pearl', count: 4, text: '심해 진주 4개 수집' },
    ],
  },
  tiburan: {
    intro: '"나는 원래 저쪽 사람이었다. 빚이 남았어. 그것부터 털어 주면 따라가지."',
    steps: [
      { type: 'pay', gold: 5000, text: '옛 동료에게 남은 빚 5,000G 대신 갚기' },
      { type: 'hunt', zoneId: 'field3a', enemyName: '해적 약탈자', count: 14, text: '옛 동료들을 직접 정리 — 약탈자 14마리 처치' },
    ],
  },

  // ===== 4티어 · 사막 도시 알카사르 =====
  catrenne: {
    reqChapter: 3,
    intro: '"봉인석을 들고 다니는 사람이군요. 그 짐이 무거워지기 전에 손을 보태겠습니다."',
    steps: [
      { type: 'talk', npcId: 'isabel', text: '고고학자 이사벨에게 유적 출입 허가를 받기' },
      { type: 'collect', itemId: 'relic_fragment', count: 6, text: '유물 파편 6개 수집' },
      { type: 'hunt', zoneId: 'field4b', enemyName: '잠든 석상', count: 10, text: '고대 유적의 잠든 석상 10기를 깨우지 않고 부수기' },
    ],
  },
  granmar: {
    intro: '"사막은 마법사를 말려 죽인다. 전갈부터 견뎌 보게."',
    steps: [
      { type: 'hunt', zoneId: 'field4a', enemyName: '모래 전갈', count: 14, text: '모래폭풍 협곡에서 모래 전갈 14마리 처치' },
      { type: 'collect', itemId: 'sand_scale', count: 8, text: '사막 비늘 8개 수집' },
    ],
  },
  rominas: {
    intro: '"이 바닥은 실력보다 통행증이 먼저예요. 순서를 지킬 줄 아는지 보죠."',
    steps: [
      { type: 'hunt', zoneId: 'field4a', enemyName: '사막 도적', count: 16, text: '협곡의 사막 도적 16마리 처치' },
      { type: 'talk', npcId: 'jamal', text: '대상 상인 자말에게 통행증을 받기' },
      { type: 'pay', gold: 8000, text: '대상 조합 가입비 8,000G 지불' },
    ],
  },
  sharife: {
    intro: '"바다에서 내 총이 닿지 않던 놈이 하나 있었지. 자네가 그걸 끝내 줬으면 하네."',
    steps: [
      { type: 'hunt', zoneId: 'field3b', enemyName: '심해의 포식자 크라켄', count: 1, text: '침몰선 잔해의 크라켄을 토벌' },
      { type: 'collect', itemId: 'ancient_gear', count: 5, text: '고대 기어 5개 수집' },
    ],
  },
  brunia: {
    reqChapter: 4,
    intro: '"봉인이 풀린 자리를 직접 보고 온 사람이라면 믿을 만하죠. 저도 데려가세요."',
    steps: [
      { type: 'reach', zoneId: 'field4b', text: '고대 유적 심부로 다시 들어가기' },
      { type: 'hunt', zoneId: 'field4b', enemyName: '유적 수호자', count: 14, text: '유적 수호자 14기 파괴' },
      { type: 'collect', itemId: 'relic_fragment', count: 8, text: '유물 파편 8개 수집' },
      { type: 'deliver', itemId: 'relic_key', count: 1, text: '유물 열쇠 1개를 제작해 납품' },
    ],
  },
  yeganel: {
    intro: '"협곡이든 유적이든 가리지 않습니다. 대신 둘 다 하셔야죠."',
    steps: [
      { type: 'hunt', zoneId: 'field4a', enemyName: '사막 도적', count: 12, text: '모래폭풍 협곡에서 사막 도적 12마리 처치' },
      { type: 'hunt', zoneId: 'field4b', enemyName: '잠든 석상', count: 12, text: '고대 유적에서 잠든 석상 12기 파괴' },
      { type: 'collect', itemId: 'ancient_gear', count: 6, text: '고대 기어 6개 수집' },
    ],
  },
  vikia: {
    reqChapter: 4,
    intro: '"수문장을 맨손으로 눕힌 이야기를 듣고 싶군. 아니면 직접 보여주든가."',
    steps: [
      { type: 'hunt', zoneId: 'field4b', enemyName: '유적의 수문장 아르콘', count: 1, text: '봉인의 방을 지키는 아르콘을 토벌' },
    ],
  },

  // ===== 5티어 · 성벽 도시 무라예스 =====
  wolak: {
    intro: '"마족의 주술은 사람 손을 빌려 쓴다. 그 손부터 끊어 놓지."',
    steps: [
      { type: 'hunt', zoneId: 'field5a', enemyName: '마족 주술노예', count: 14, text: '성벽 앞 전선에서 마족 주술노예 14기 처치' },
      { type: 'collect', itemId: 'demon_horn', count: 6, text: '마족의 뿔 6개 수집' },
    ],
  },
  valerian: {
    reqChapter: 4,
    intro: '"성벽이 버틸지는 군기에 달렸소. 저주를 태울 사람이라면 나도 따르지."',
    steps: [
      { type: 'talk', npcId: 'rosalind', text: '종군사제 로잘린에게 축복을 받기' },
      { type: 'collect', itemId: 'war_banner_scrap', count: 8, text: '찢긴 군기 8개 수집' },
      { type: 'deliver', itemId: 'holy_banner', count: 1, text: '성화 군기 1개를 제작해 납품' },
    ],
  },
  beatria: {
    intro: '"전선과 진지, 양쪽 다 태워 봐야 마법이 어디까지 먹히는지 알아요."',
    steps: [
      { type: 'hunt', zoneId: 'field5a', enemyName: '마족 척후병', count: 18, text: '성벽 앞 전선에서 척후병 18기 처치' },
      { type: 'hunt', zoneId: 'field5b', enemyName: '마족 전사', count: 14, text: '마족의 진지에서 마족 전사 14기 처치' },
    ],
  },
  lionello: {
    reqChapter: 5,
    intro: '"성이 지켜졌다는 소식은 들었소. 이제 남은 건 바다 건너요. 나도 끼워 주시오."',
    steps: [
      { type: 'talk', npcId: 'bernard', text: '총사령관 베르나르에게 전출 허가를 받기' },
      { type: 'hunt', zoneId: 'field5b', enemyName: '마족 대장', count: 10, text: '진지에 남은 마족 대장 10기 격파' },
      { type: 'collect', itemId: 'dark_crystal', count: 5, text: '흑정석 5개 수집' },
    ],
  },
  darian: {
    intro: '"나는 용병이오. 진지까지 들어가 볼 배짱과, 선금. 그거면 충분하지."',
    steps: [
      { type: 'reach', zoneId: 'field5b', text: '마족의 진지까지 진격' },
      { type: 'hunt', zoneId: 'field5b', enemyName: '마족 전사', count: 16, text: '마족 전사 16기 격파' },
      { type: 'pay', gold: 30000, text: '용병 선금 30,000G 지불' },
    ],
  },
  marien: {
    intro: '"나는 혼자 다니는 게 편해. 그래도 뒤를 맡길 사람이라면… 진지 한복판을 쓸어 봐."',
    steps: [
      { type: 'reach', zoneId: 'field5b', text: '마족의 진지 한복판까지 들어가기' },
      { type: 'hunt', zoneId: 'field5b', enemyName: '마족 전사', count: 18, text: '마족 전사 18기를 쓸어내기' },
      { type: 'collect', itemId: 'demon_horn', count: 8, text: '마족의 뿔 8개 수집' },
    ],
  },
  helenia: {
    intro: '"저는 부서진 것을 되돌리는 쪽입니다. 부술 줄만 아는 분은 사양하겠어요."',
    steps: [
      { type: 'hunt', zoneId: 'field4b', enemyName: '유적 수호자', count: 12, text: '고대 유적으로 돌아가 폭주한 수호자 12기를 멈추기' },
      { type: 'collect', itemId: 'relic_fragment', count: 10, text: '복원용 유물 파편 10개 수집' },
      { type: 'talk', npcId: 'rosalind', text: '종군사제 로잘린에게 치유술을 인가받기' },
    ],
  },
  clera: {
    reqChapter: 5,
    intro: '"사령관 발데를 쓰러뜨린 총구라면 믿겠어요. 다른 말은 필요 없습니다."',
    steps: [
      { type: 'hunt', zoneId: 'field5b', enemyName: '마왕군 사령관 발데', count: 1, text: '마왕군 사령관 발데를 다시 한번 토벌' },
    ],
  },

  // ===== 6티어 · 설원 전초기지 카르네비아 =====
  sverna: {
    intro: '"눈보라 속에서는 창끝이 먼저 언다. 그래도 들고 설 수 있나."',
    steps: [
      { type: 'hunt', zoneId: 'field7a', enemyName: '눈보라 약탈자', count: 14, text: '얼어붙은 고원에서 눈보라 약탈자 14명 제압' },
      { type: 'collect', itemId: 'frost_shard', count: 8, text: '서리 결정 8개 수집' },
    ],
  },
  kaltos: {
    intro: '"주먹은 추위에 약해. 그러니 쉬지 말고 움직여야지. 두 군데를 돌고 와라."',
    steps: [
      { type: 'hunt', zoneId: 'field7a', enemyName: '서리 늑대', count: 16, text: '얼어붙은 고원에서 서리 늑대 16마리 처치' },
      { type: 'hunt', zoneId: 'field7b', enemyName: '서리 박쥐', count: 14, text: '서리 협곡에서 서리 박쥐 14마리 처치' },
      { type: 'talk', npcId: 'sigrid', text: '순찰대장 시그리드에게 순찰 기록을 인정받기' },
    ],
  },
  nivena: {
    intro: '"얼음은 세공하는 것이지 휘두르는 게 아니에요. 세공사에게 먼저 배우고 오세요."',
    steps: [
      { type: 'talk', npcId: 'anselm', text: '얼음 세공사 안셀름에게 서리 다루는 법을 배우기' },
      { type: 'hunt', zoneId: 'field7b', enemyName: '빙결 거인', count: 12, text: '서리 협곡의 빙결 거인 12기 처치' },
      { type: 'collect', itemId: 'frost_shard', count: 10, text: '서리 결정 10개 수집' },
    ],
  },
  brandt: {
    intro: '"설원에서 화산까지 총열이 견디려면 돈이 든다. 셋 다 맞춰 와라."',
    steps: [
      { type: 'hunt', zoneId: 'field8a', enemyName: '용암 도마뱀', count: 16, text: '화산 기슭에서 용암 도마뱀 16마리 처치' },
      { type: 'collect', itemId: 'obsidian_chip', count: 8, text: '화산 흑요석 8개 수집' },
      { type: 'pay', gold: 120000, text: '총열 개수 비용 120,000G 지불' },
    ],
  },
  lucienne: {
    intro: '"설산의 지배자가 살아 있는 한 이 기지의 부상자는 줄지 않아요. 부탁드립니다."',
    steps: [
      { type: 'hunt', zoneId: 'field7b', enemyName: '설산의 지배자 프로스타', count: 1, text: '설산의 지배자 프로스타를 토벌' },
      { type: 'talk', npcId: 'anselm', text: '안셀름에게 부상자용 성구를 받아 오기' },
    ],
  },

  // ===== 7티어 · 부유 도시 아에리스 =====
  aeron: {
    intro: '"바람 위에서는 조준선이 흔들린다. 까마귀부터 떨어뜨려 보시지."',
    steps: [
      { type: 'hunt', zoneId: 'field9a', enemyName: '폭풍 까마귀', count: 16, text: '부유섬 외곽에서 폭풍 까마귀 16마리 격추' },
      { type: 'collect', itemId: 'storm_feather', count: 10, text: '폭풍의 깃털 10개 수집' },
    ],
  },
  thalia: {
    intro: '"번개는 사람을 살릴 수도 있어요. 다루는 사람이 그럴 마음이 있다면요."',
    steps: [
      { type: 'talk', npcId: 'elysia', text: '항공사 엘리시아에게 동행 허가를 받기' },
      { type: 'hunt', zoneId: 'field9b', enemyName: '번개 정령', count: 14, text: '폭풍의 섬에서 번개 정령 14기 처치' },
      { type: 'collect', itemId: 'storm_feather', count: 12, text: '폭풍의 깃털 12개 수집' },
    ],
  },
  gorvain: {
    intro: '"마계 관문 너머를 본 적 있나? 없다면 보고 와라. 이야기는 그다음이다."',
    steps: [
      { type: 'hunt', zoneId: 'field10a', enemyName: '타락한 기사', count: 16, text: '마계 관문에서 타락한 기사 16기 처치' },
      { type: 'collect', itemId: 'abyss_fragment', count: 8, text: '나락의 조각 8개 수집' },
      { type: 'talk', npcId: 'thane', text: '풍력 기사 테인에게 관문 너머의 지형을 보고' },
    ],
  },
  seris: {
    intro: '"대사제의 목을 가져오면 나머지는 묻지 않겠다."',
    steps: [
      { type: 'hunt', zoneId: 'field10b', enemyName: '나락의 대사제 모르간', count: 1, text: '타락한 성소의 대사제 모르간을 토벌' },
      { type: 'collect', itemId: 'abyss_fragment', count: 10, text: '나락의 조각 10개 수집' },
    ],
  },
  orwen: {
    intro: '"신들의 무덤까지 올라갈 총구라면 나도 따라가지. 거기까지 가 보고 말해라."',
    steps: [
      { type: 'hunt', zoneId: 'field11a', enemyName: '봉인된 사도', count: 16, text: '잊힌 신전에서 봉인된 사도 16기 처치' },
      { type: 'collect', itemId: 'divine_relic', count: 8, text: '신성 유물 8개 수집' },
      { type: 'hunt', zoneId: 'field11b', enemyName: '잊힌 신 아스테리온', count: 1, text: '신들의 무덤에서 잊힌 신 아스테리온을 토벌' },
    ],
  },
};

// 자료가 빠진 캐릭터가 생겨도 게임이 멈추지 않게 하는 최소 퀘스트.
const RECRUIT_QUEST_FALLBACK = {
  intro: '"실력을 보여다오."',
  steps: [{ type: 'hunt', zoneId: 'field1a', enemyName: '숲도적', count: 5, text: '초심자의 숲에서 숲도적 5마리 처치' }],
};

function recruitQuestOf(charId) { return RECRUIT_QUESTS[charId] || RECRUIT_QUEST_FALLBACK; }

function makeRecruitSteps(charId) {
  return recruitQuestOf(charId).steps.map((s) => ({ ...s }));
}

// 이 캐릭터를 영입하려면 완료해야 하는 시나리오 챕터(없으면 0).
function recruitReqChapter(charId) { return recruitQuestOf(charId).reqChapter || 0; }

function recruitIntro(charId) { return recruitQuestOf(charId).intro; }
