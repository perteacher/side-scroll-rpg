// 월드 = 마을 5개 + 사냥터 10개가 갈래로 이어진 그래프.
// 각 존은 exits로 여러 갈래의 워프를 갖고, platforms로 점프해 올라가는 2층을 갖는다.

const FLOOR2_Y = 296; // 지면(380)에서 84px 위 — 점프 한 번으로 닿는 높이

function makeEnemies(template, count, startX, spacing, floor = 1) {
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push({ ...template, x: startX + i * spacing, floor });
  }
  return list;
}

// 마을별 영입 대상. x 간격과 높이를 흩어 배치하고 일부는 2층에 올린다.
const SCATTER_X = [0, 70, -50, 40, -80, 30, -30];

function makeRecruits(charIds, tier, startX, spacing) {
  return charIds.map((charId, i) => ({
    charId,
    tier,
    x: startX + i * spacing + SCATTER_X[i % SCATTER_X.length],
    floor: i % 3 === 2 ? 2 : 1,
  }));
}

const TOWN_PLATFORMS = [
  { x: 560, width: 420, y: FLOOR2_Y },
  { x: 1180, width: 460, y: FLOOR2_Y },
];

const ZONE_DATA = [
  // ================= 1티어 =================
  {
    id: 'town1', theme: 'town_forest', type: 'town', name: '초심자 마을 로스피에', level: 1, width: 1800, groundColor: '#3d5a3d',
    platforms: TOWN_PLATFORMS,
    exits: [{ to: 'field1a', x: 1400 }, { to: 'field1b', x: 1620 }],
    storyNpcs: [
      { id: 'delgado', name: '경비대장 델가도', x: 420 },
      { id: 'marta', name: '약초상 마르타', x: 1250, floor: 2 },
    ],
    shopNpc: { name: '잡화상 페드로', x: 700, floor: 2 },
    questBoard: { x: 980, name: '의뢰 게시판' },
    recruits: makeRecruits(['paion', 'clode', 'itju', 'panfilos', 'scowt', 'wizarr', 'jackson'], 1, 250, 210),
  },
  {
    id: 'field1a', theme: 'forest', type: 'field', name: '초심자의 숲', level: 1, width: 2800, groundColor: '#2e4d2e',
    platforms: [{ x: 620, width: 520, y: FLOOR2_Y }, { x: 1760, width: 540, y: FLOOR2_Y }],
    exits: [{ to: 'town1', x: 40 }, { to: 'field1b', x: 1420 }, { to: 'town2', x: 2680 }],
    enemies: [
      ...makeEnemies({ name: '숲도적', hp: 40, atk: 5, defense: 3, xpReward: 20, race: 'humanoid', aggressive: true }, 6, 420, 260),
      ...makeEnemies({ name: '들토끼', hp: 30, atk: 6, defense: 1, xpReward: 15, race: 'beast', aggressive: false }, 3, 680, 160, 2),
      ...makeEnemies({ name: '숲도적', hp: 40, atk: 5, defense: 3, xpReward: 20, race: 'humanoid', aggressive: true }, 3, 1820, 160, 2),
    ],
  },
  {
    id: 'field1b', theme: 'valley', type: 'field', name: '늑대 골짜기', level: 5, width: 3000, groundColor: '#2b4a35',
    platforms: [{ x: 700, width: 500, y: FLOOR2_Y }, { x: 1900, width: 560, y: FLOOR2_Y }],
    exits: [{ to: 'town1', x: 40 }, { to: 'field1a', x: 1500 }, { to: 'town2', x: 2880 }],
    enemies: [
      ...makeEnemies({ name: '회색늑대', hp: 55, atk: 8, defense: 4, xpReward: 28, race: 'beast', aggressive: true }, 8, 420, 290),
      ...makeEnemies({ name: '산양', hp: 48, atk: 6, defense: 5, xpReward: 24, race: 'beast', aggressive: false }, 3, 760, 160, 2),
      ...makeEnemies({ name: '회색늑대', hp: 55, atk: 8, defense: 4, xpReward: 28, race: 'beast', aggressive: true }, 3, 1960, 170, 2),
      { name: '숲의 두목 그렐', x: 2700, hp: 320, atk: 14, defense: 8, xpReward: 260, race: 'humanoid', aggressive: true, boss: true, floor: 1 },
    ],
  },

  // ================= 2티어 =================
  {
    id: 'town2', theme: 'town_border', type: 'town', name: '국경 마을 에르난데스', level: 10, width: 1800, groundColor: '#4a4a38',
    platforms: TOWN_PLATFORMS,
    exits: [
      { to: 'field1a', x: 60 }, { to: 'field1b', x: 230 },
      { to: 'field2a', x: 1400 }, { to: 'field2b', x: 1620 },
    ],
    storyNpcs: [
      { id: 'lorenzo', name: '사제 로렌초', x: 400 },
      { id: 'herrera', name: '대장장이 에레라', x: 1300, floor: 2 },
    ],
    shopNpc: { name: '잡화상 니콜라', x: 700, floor: 2 },
    questBoard: { x: 980, name: '의뢰 게시판' },
    recruits: makeRecruits(['ramirof', 'adelin', 'emilrea', 'sohoa', 'vernelia', 'mbomar', 'risael'], 2, 250, 210),
  },
  {
    id: 'field2a', theme: 'quarry', type: 'field', name: '버려진 채석장', level: 10, width: 3200, groundColor: '#4d4534',
    platforms: [{ x: 640, width: 540, y: FLOOR2_Y }, { x: 2000, width: 560, y: FLOOR2_Y }],
    exits: [{ to: 'town2', x: 40 }, { to: 'field2b', x: 1600 }, { to: 'town3', x: 3080 }],
    enemies: [
      ...makeEnemies({ name: '해골병사', hp: 80, atk: 11, defense: 7, xpReward: 42, race: 'undead', aggressive: true }, 9, 420, 290),
      ...makeEnemies({ name: '석공 좀비', hp: 100, atk: 9, defense: 9, xpReward: 46, race: 'undead', aggressive: false }, 3, 700, 170, 2),
      ...makeEnemies({ name: '해골병사', hp: 80, atk: 11, defense: 7, xpReward: 42, race: 'undead', aggressive: true }, 3, 2060, 170, 2),
    ],
  },
  {
    id: 'field2b', theme: 'haunted', type: 'field', name: '망령의 계곡', level: 15, width: 3200, groundColor: '#3f4048',
    platforms: [{ x: 760, width: 520, y: FLOOR2_Y }, { x: 2100, width: 540, y: FLOOR2_Y }],
    exits: [{ to: 'town2', x: 40 }, { to: 'field2a', x: 1600 }, { to: 'town3', x: 3080 }],
    enemies: [
      ...makeEnemies({ name: '망령', hp: 95, atk: 14, defense: 6, xpReward: 55, race: 'undead', aggressive: true }, 8, 420, 280),
      ...makeEnemies({ name: '채석골렘', hp: 150, atk: 17, defense: 14, xpReward: 80, race: 'inanimate', aggressive: false }, 3, 820, 170, 2),
      ...makeEnemies({ name: '망령', hp: 95, atk: 14, defense: 6, xpReward: 55, race: 'undead', aggressive: true }, 3, 2160, 170, 2),
      { name: '채석장의 폭군 골모', x: 2900, hp: 900, atk: 26, defense: 20, xpReward: 700, race: 'inanimate', aggressive: true, boss: true, floor: 1 },
    ],
  },

  // ================= 3티어 =================
  {
    id: 'town3', theme: 'town_port', type: 'town', name: '항구 마을 포르토벨로', level: 20, width: 1800, groundColor: '#35505a',
    platforms: TOWN_PLATFORMS,
    exits: [
      { to: 'field2a', x: 60 }, { to: 'field2b', x: 230 },
      { to: 'field3a', x: 1400 }, { to: 'field3b', x: 1620 },
    ],
    storyNpcs: [
      { id: 'camila', name: '항만장 카밀라', x: 430 },
      { id: 'tobias', name: '밀수꾼 토비아스', x: 1320, floor: 2 },
    ],
    shopNpc: { name: '항구 잡화상 마리', x: 700, floor: 2 },
    questBoard: { x: 980, name: '의뢰 게시판' },
    recruits: makeRecruits(['musketya', 'cortasal', 'andrei', 'alejandr', 'graciel', 'rorken', 'tiburan'], 3, 250, 210),
  },
  {
    id: 'field3a', theme: 'port', type: 'field', name: '해적의 은신처', level: 20, width: 3400, groundColor: '#3a4a52',
    platforms: [{ x: 700, width: 560, y: FLOOR2_Y }, { x: 2200, width: 580, y: FLOOR2_Y }],
    exits: [{ to: 'town3', x: 40 }, { to: 'field3b', x: 1700 }, { to: 'town4', x: 3280 }],
    enemies: [
      ...makeEnemies({ name: '해적 약탈자', hp: 140, atk: 20, defense: 12, xpReward: 90, race: 'humanoid', aggressive: true }, 10, 420, 290),
      ...makeEnemies({ name: '부두 짐꾼', hp: 165, atk: 16, defense: 15, xpReward: 95, race: 'humanoid', aggressive: false }, 3, 760, 180, 2),
      ...makeEnemies({ name: '해적 약탈자', hp: 140, atk: 20, defense: 12, xpReward: 90, race: 'humanoid', aggressive: true }, 3, 2260, 180, 2),
    ],
  },
  {
    id: 'field3b', theme: 'sunken', type: 'field', name: '침몰선 잔해', level: 25, width: 3400, groundColor: '#2f4450',
    platforms: [{ x: 820, width: 540, y: FLOOR2_Y }, { x: 2260, width: 560, y: FLOOR2_Y }],
    exits: [{ to: 'town3', x: 40 }, { to: 'field3a', x: 1700 }, { to: 'town4', x: 3280 }],
    enemies: [
      ...makeEnemies({ name: '수중 망령', hp: 170, atk: 24, defense: 14, xpReward: 115, race: 'undead', aggressive: true }, 10, 420, 290),
      ...makeEnemies({ name: '난파선 게', hp: 200, atk: 19, defense: 20, xpReward: 120, race: 'beast', aggressive: false }, 3, 880, 180, 2),
      ...makeEnemies({ name: '수중 망령', hp: 170, atk: 24, defense: 14, xpReward: 115, race: 'undead', aggressive: true }, 3, 2320, 180, 2),
      { name: '심해의 포식자 크라켄', x: 3100, hp: 2200, atk: 42, defense: 30, xpReward: 1800, race: 'beast', aggressive: true, boss: true, floor: 1 },
    ],
  },

  // ================= 4티어 =================
  {
    id: 'town4', theme: 'town_desert', type: 'town', name: '사막 도시 알카사르', level: 30, width: 1800, groundColor: '#6b5a35',
    platforms: TOWN_PLATFORMS,
    exits: [
      { to: 'field3a', x: 60 }, { to: 'field3b', x: 230 },
      { to: 'field4a', x: 1400 }, { to: 'field4b', x: 1620 },
    ],
    storyNpcs: [
      { id: 'isabel', name: '고고학자 이사벨', x: 410 },
      { id: 'jamal', name: '대상 상인 자말', x: 1290, floor: 2 },
    ],
    shopNpc: { name: '대상 잡화상 하산', x: 700, floor: 2 },
    questBoard: { x: 980, name: '의뢰 게시판' },
    recruits: makeRecruits(['catrenne', 'granmar', 'rominas', 'sharife', 'brunia', 'yeganel', 'vikia'], 4, 250, 210),
  },
  {
    id: 'field4a', theme: 'desert', type: 'field', name: '모래폭풍 협곡', level: 30, width: 3600, groundColor: '#6a5b3a',
    platforms: [{ x: 720, width: 580, y: FLOOR2_Y }, { x: 2350, width: 600, y: FLOOR2_Y }],
    exits: [{ to: 'town4', x: 40 }, { to: 'field4b', x: 1800 }, { to: 'town5', x: 3480 }],
    enemies: [
      ...makeEnemies({ name: '사막 도적', hp: 220, atk: 30, defense: 18, xpReward: 150, race: 'humanoid', aggressive: true }, 11, 420, 290),
      ...makeEnemies({ name: '모래 전갈', hp: 250, atk: 26, defense: 22, xpReward: 158, race: 'beast', aggressive: false }, 4, 780, 170, 2),
      ...makeEnemies({ name: '사막 도적', hp: 220, atk: 30, defense: 18, xpReward: 150, race: 'humanoid', aggressive: true }, 4, 2410, 170, 2),
    ],
  },
  {
    id: 'field4b', theme: 'ruins', type: 'field', name: '고대 유적', level: 35, width: 3600, groundColor: '#5c5340',
    platforms: [{ x: 840, width: 560, y: FLOOR2_Y }, { x: 2400, width: 580, y: FLOOR2_Y }],
    exits: [{ to: 'town4', x: 40 }, { to: 'field4a', x: 1800 }, { to: 'town5', x: 3480 }],
    enemies: [
      ...makeEnemies({ name: '유적 수호자', hp: 280, atk: 36, defense: 24, xpReward: 195, race: 'inanimate', aggressive: true }, 11, 420, 290),
      ...makeEnemies({ name: '잠든 석상', hp: 340, atk: 30, defense: 32, xpReward: 205, race: 'inanimate', aggressive: false }, 4, 900, 170, 2),
      ...makeEnemies({ name: '유적 수호자', hp: 280, atk: 36, defense: 24, xpReward: 195, race: 'inanimate', aggressive: true }, 4, 2460, 170, 2),
      { name: '유적의 수문장 아르콘', x: 3300, hp: 4800, atk: 66, defense: 46, xpReward: 4200, race: 'inanimate', aggressive: true, boss: true, floor: 1 },
    ],
  },

  // ================= 5티어 =================
  {
    id: 'town5', theme: 'town_castle', type: 'town', name: '성벽 도시 무라예스', level: 40, width: 1800, groundColor: '#3a3a4d',
    platforms: TOWN_PLATFORMS,
    exits: [
      { to: 'field4a', x: 60 }, { to: 'field4b', x: 230 },
      { to: 'field5a', x: 1400 }, { to: 'field5b', x: 1620 },
    ],
    storyNpcs: [
      { id: 'bernard', name: '총사령관 베르나르', x: 440 },
      { id: 'rosalind', name: '종군사제 로잘린', x: 1270, floor: 2 },
    ],
    shopNpc: { name: '군납 상인 오르텐', x: 700, floor: 2 },
    questBoard: { x: 980, name: '의뢰 게시판' },
    recruits: makeRecruits(['wolak', 'valerian', 'beatria', 'lionello', 'darian', 'helenia', 'clera'], 5, 250, 210),
  },
  {
    id: 'field5a', theme: 'warfront', type: 'field', name: '성벽 앞 전선', level: 40, width: 3800, groundColor: '#3a3a4d',
    platforms: [{ x: 760, width: 600, y: FLOOR2_Y }, { x: 2500, width: 620, y: FLOOR2_Y }],
    exits: [{ to: 'town5', x: 40 }, { to: 'field5b', x: 1900 }],
    enemies: [
      ...makeEnemies({ name: '마족 척후병', hp: 340, atk: 44, defense: 28, xpReward: 250, race: 'demon', aggressive: true }, 13, 420, 250),
      ...makeEnemies({ name: '마족 주술노예', hp: 400, atk: 38, defense: 33, xpReward: 262, race: 'demon', aggressive: false }, 4, 820, 170, 2),
      ...makeEnemies({ name: '마족 척후병', hp: 340, atk: 44, defense: 28, xpReward: 250, race: 'demon', aggressive: true }, 4, 2560, 170, 2),
    ],
  },
  {
    id: 'field5b', theme: 'demon', type: 'field', name: '마족의 진지', level: 45, width: 3800, groundColor: '#402f3f',
    platforms: [{ x: 880, width: 580, y: FLOOR2_Y }, { x: 2600, width: 600, y: FLOOR2_Y }],
    exits: [{ to: 'town5', x: 40 }, { to: 'field5a', x: 1900 }, { to: 'town6', x: 3680 }],
    enemies: [
      ...makeEnemies({ name: '마족 전사', hp: 420, atk: 52, defense: 34, xpReward: 320, race: 'demon', aggressive: true }, 14, 420, 230),
      ...makeEnemies({ name: '마족 전사', hp: 420, atk: 52, defense: 34, xpReward: 320, race: 'demon', aggressive: true }, 4, 940, 170, 2),
      ...makeEnemies({ name: '마족 대장', hp: 900, atk: 70, defense: 45, xpReward: 900, race: 'demon', aggressive: true }, 2, 2660, 300, 2),
      { name: '마왕군 사령관 발데', x: 3500, hp: 12000, atk: 96, defense: 64, xpReward: 12000, race: 'demon', aggressive: true, boss: true, floor: 1 },
    ],
  },
  // ================= 승급 구간 (베테랑 / 익스퍼트 / 마스터) =================
  // 기본 100레벨을 찍은 뒤 들어오는 지역. 몹 경험치가 자릿수부터 다르다.
  {
    id: 'town6', theme: 'town_castle', type: 'town', name: '고룡의 관문 드라켄호프', level: 100, width: 1800, groundColor: '#2f3a4d',
    platforms: TOWN_PLATFORMS,
    exits: [
      { to: 'field5b', x: 60 },
      { to: 'field6a', x: 1400 }, { to: 'field6b', x: 1620 },
    ],
    storyNpcs: [
      { id: 'valen', name: '관문지기 발렌', x: 430 },
      { id: 'orla', name: '연대기 기록자 오를라', x: 1280, floor: 2 },
    ],
    shopNpc: { name: '관문 보급관 테오', x: 700, floor: 2 },
    questBoard: { x: 980, name: '드라켄호프 의뢰 게시판' },
    recruits: [],
  },
  {
    id: 'field6a', theme: 'warfront', type: 'field', name: '용의 둥지 외곽', level: 100, width: 4000, groundColor: '#3b3340',
    platforms: [{ x: 800, width: 620, y: FLOOR2_Y }, { x: 2600, width: 640, y: FLOOR2_Y }],
    exits: [{ to: 'town6', x: 40 }, { to: 'field6b', x: 2000 }],
    enemies: [
      ...makeEnemies({ name: '용린 병사', hp: 9000, atk: 320, defense: 180, xpReward: 42000, race: 'humanoid', aggressive: true }, 12, 420, 280),
      ...makeEnemies({ name: '둥지 수호룡', hp: 12000, atk: 280, defense: 220, xpReward: 48000, race: 'beast', aggressive: false }, 4, 860, 180, 2),
      ...makeEnemies({ name: '용린 병사', hp: 9000, atk: 320, defense: 180, xpReward: 42000, race: 'humanoid', aggressive: true }, 4, 2660, 180, 2),
      { name: '둥지의 어미용 바르가', x: 3800, hp: 120000, atk: 520, defense: 300, xpReward: 900000, race: 'beast', aggressive: true, boss: true, floor: 1 },
    ],
  },
  {
    id: 'field6b', theme: 'demon', type: 'field', name: '심연의 균열', level: 110, width: 4200, groundColor: '#2a1c33',
    platforms: [{ x: 900, width: 640, y: FLOOR2_Y }, { x: 2800, width: 660, y: FLOOR2_Y }],
    exits: [{ to: 'town6', x: 40 }, { to: 'field6a', x: 2100 }, { to: 'field6c', x: 4080 }],
    enemies: [
      ...makeEnemies({ name: '균열의 포식자', hp: 42000, atk: 1100, defense: 640, xpReward: 260000, race: 'demon', aggressive: true }, 13, 420, 270),
      ...makeEnemies({ name: '공허 유충', hp: 55000, atk: 900, defense: 780, xpReward: 290000, race: 'demon', aggressive: false }, 4, 960, 180, 2),
      ...makeEnemies({ name: '균열의 포식자', hp: 42000, atk: 1100, defense: 640, xpReward: 260000, race: 'demon', aggressive: true }, 4, 2860, 180, 2),
      { name: '균열 군주 네뷸라', x: 4000, hp: 620000, atk: 1800, defense: 1100, xpReward: 5200000, race: 'demon', aggressive: true, boss: true, floor: 1 },
    ],
  },
  {
    id: 'field6c', theme: 'ruins', type: 'field', name: '시간이 멈춘 회랑', level: 120, width: 4400, groundColor: '#4a4433',
    platforms: [{ x: 950, width: 660, y: FLOOR2_Y }, { x: 2950, width: 680, y: FLOOR2_Y }],
    exits: [{ to: 'field6b', x: 40 }],
    enemies: [
      ...makeEnemies({ name: '정지된 파수꾼', hp: 260000, atk: 4200, defense: 2600, xpReward: 1600000, race: 'inanimate', aggressive: true }, 14, 420, 260),
      ...makeEnemies({ name: '태엽 거인', hp: 340000, atk: 3600, defense: 3200, xpReward: 1800000, race: 'inanimate', aggressive: false }, 5, 1010, 180, 2),
      ...makeEnemies({ name: '정지된 파수꾼', hp: 260000, atk: 4200, defense: 2600, xpReward: 1600000, race: 'inanimate', aggressive: true }, 5, 3010, 180, 2),
      { name: '시간의 지배자 크로노스', x: 4200, hp: 4200000, atk: 7200, defense: 4800, xpReward: 42000000, race: 'inanimate', aggressive: true, boss: true, floor: 1 },
    ],
  },
];

const ENEMY_RESPAWN_MS = 12000;
