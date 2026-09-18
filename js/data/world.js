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
    exits: [{ to: 'town5', x: 40 }, { to: 'field5a', x: 1900 }, { to: 'town7', x: 3680 }],
    enemies: [
      ...makeEnemies({ name: '마족 전사', hp: 420, atk: 52, defense: 34, xpReward: 320, race: 'demon', aggressive: true }, 14, 420, 230),
      ...makeEnemies({ name: '마족 전사', hp: 420, atk: 52, defense: 34, xpReward: 320, race: 'demon', aggressive: true }, 4, 940, 170, 2),
      ...makeEnemies({ name: '마족 대장', hp: 900, atk: 70, defense: 45, xpReward: 900, race: 'demon', aggressive: true }, 2, 2660, 300, 2),
      { name: '마왕군 사령관 발데', x: 3500, hp: 12000, atk: 96, defense: 64, xpReward: 12000, race: 'demon', aggressive: true, boss: true, floor: 1 },
    ],
  },
  // ================= 중반 구간 (50~95) =================
  // 45에서 100까지 사냥터가 없어서 탑만 돌아야 했다. 다섯 티어를 채워 넣었다.
  // 몹 수치는 배율표(balance.js)를 곱하기 전 값이고, 경험치는 배율 1이라 여기 적힌 값이 그대로다.
  {
    id: 'town7', theme: 'town_snow', type: 'town', name: '설원 전초기지 카르네비아', level: 50, width: 1800, groundColor: '#54657a',
    platforms: TOWN_PLATFORMS,
    exits: [
      { to: 'field5b', x: 60 },
      { to: 'field7a', x: 1360 }, { to: 'field7b', x: 1560 }, { to: 'field8a', x: 1720 },
    ],
    storyNpcs: [
      { id: 'sigrid', name: '설원 순찰대장 시그리드', x: 430 },
      { id: 'anselm', name: '얼음 세공사 안셀름', x: 1270, floor: 2 },
    ],
    shopNpc: { name: '보급관 라우라', x: 700, floor: 2 },
    questBoard: { x: 980, name: '전초기지 의뢰 게시판' },
    recruits: makeRecruits(['sverna', 'kaltos', 'nivena', 'brandt', 'lucienne'], 6, 280, 230),
  },
  {
    id: 'field7a', theme: 'frost', type: 'field', name: '얼어붙은 고원', level: 50, width: 3800, groundColor: '#5b7285',
    platforms: [{ x: 760, width: 600, y: FLOOR2_Y }, { x: 2500, width: 620, y: FLOOR2_Y }],
    exits: [{ to: 'town7', x: 40 }, { to: 'field7b', x: 1900 }],
    enemies: [
      ...makeEnemies({ name: '서리 늑대', hp: 530, atk: 60, defense: 34, xpReward: 224, race: 'beast', aggressive: true }, 13, 420, 250),
      ...makeEnemies({ name: '얼음 정령', hp: 600, atk: 54, defense: 40, xpReward: 236, race: 'inanimate', aggressive: false }, 5, 820, 170, 2),
      ...makeEnemies({ name: '눈보라 약탈자', hp: 560, atk: 64, defense: 32, xpReward: 230, race: 'humanoid', aggressive: true }, 4, 2560, 170, 2),
    ],
  },
  {
    id: 'field7b', theme: 'frost', type: 'field', name: '서리 협곡', level: 55, width: 3800, groundColor: '#4e6478',
    platforms: [{ x: 880, width: 580, y: FLOOR2_Y }, { x: 2600, width: 600, y: FLOOR2_Y }],
    exits: [{ to: 'town7', x: 40 }, { to: 'field7a', x: 1900 }, { to: 'field8a', x: 3680 }],
    enemies: [
      ...makeEnemies({ name: '빙결 거인', hp: 670, atk: 70, defense: 42, xpReward: 253, race: 'humanoid', aggressive: true }, 13, 420, 240),
      ...makeEnemies({ name: '서리 박쥐', hp: 600, atk: 74, defense: 36, xpReward: 248, race: 'beast', aggressive: true }, 5, 940, 170, 2),
      { name: '설산의 지배자 프로스타', x: 3500, hp: 16750, atk: 126, defense: 59, xpReward: 7590, race: 'beast', aggressive: true, boss: true, floor: 1 },
    ],
  },
  {
    id: 'field8a', theme: 'volcano', type: 'field', name: '화산 기슭', level: 60, width: 3900, groundColor: '#5c3a2c',
    platforms: [{ x: 800, width: 600, y: FLOOR2_Y }, { x: 2600, width: 620, y: FLOOR2_Y }],
    exits: [{ to: 'town7', x: 40 }, { to: 'field7b', x: 240 }, { to: 'field8b', x: 1950 }],
    enemies: [
      ...makeEnemies({ name: '용암 도마뱀', hp: 850, atk: 81, defense: 50, xpReward: 286, race: 'beast', aggressive: true }, 13, 420, 250),
      ...makeEnemies({ name: '화산 골렘', hp: 980, atk: 74, defense: 62, xpReward: 300, race: 'inanimate', aggressive: false }, 5, 860, 170, 2),
      ...makeEnemies({ name: '용암 도마뱀', hp: 850, atk: 81, defense: 50, xpReward: 286, race: 'beast', aggressive: true }, 4, 2660, 170, 2),
    ],
  },
  {
    id: 'field8b', theme: 'volcano', type: 'field', name: '용암 동굴', level: 65, width: 3900, groundColor: '#4a2c22',
    platforms: [{ x: 900, width: 580, y: FLOOR2_Y }, { x: 2700, width: 600, y: FLOOR2_Y }],
    exits: [{ to: 'field8a', x: 40 }, { to: 'town8', x: 3780 }],
    enemies: [
      ...makeEnemies({ name: '불꽃 정령', hp: 1090, atk: 94, defense: 60, xpReward: 323, race: 'demon', aggressive: true }, 13, 420, 245),
      ...makeEnemies({ name: '마그마 웜', hp: 1200, atk: 88, defense: 68, xpReward: 336, race: 'beast', aggressive: false }, 5, 960, 170, 2),
      { name: '화산의 주인 이그니스', x: 3600, hp: 27250, atk: 169, defense: 84, xpReward: 9690, race: 'demon', aggressive: true, boss: true, floor: 1 },
    ],
  },
  {
    id: 'town8', theme: 'town_sky', type: 'town', name: '부유 도시 아에리스', level: 70, width: 1800, groundColor: '#5c7c99',
    platforms: TOWN_PLATFORMS,
    exits: [
      { to: 'field8b', x: 60 },
      { to: 'field9a', x: 1360 }, { to: 'field9b', x: 1560 }, { to: 'field10a', x: 1720 },
    ],
    storyNpcs: [
      { id: 'elysia', name: '항공사 엘리시아', x: 430 },
      { id: 'thane', name: '풍력 기사 테인', x: 1270, floor: 2 },
    ],
    shopNpc: { name: '구름 상인 미렐', x: 700, floor: 2 },
    questBoard: { x: 980, name: '아에리스 의뢰 게시판' },
    recruits: makeRecruits(['aeron', 'thalia', 'gorvain', 'seris', 'orwen'], 7, 280, 230),
  },
  {
    id: 'field9a', theme: 'sky_isle', type: 'field', name: '부유섬 외곽', level: 70, width: 4000, groundColor: '#5f8299',
    platforms: [{ x: 820, width: 620, y: FLOOR2_Y }, { x: 2700, width: 640, y: FLOOR2_Y }],
    exits: [{ to: 'town8', x: 40 }, { to: 'field9b', x: 2000 }],
    enemies: [
      ...makeEnemies({ name: '하늘 사냥꾼', hp: 1400, atk: 110, defense: 72, xpReward: 365, race: 'humanoid', aggressive: true }, 13, 420, 255),
      ...makeEnemies({ name: '폭풍 까마귀', hp: 1300, atk: 118, defense: 66, xpReward: 358, race: 'beast', aggressive: true }, 5, 880, 175, 2),
      ...makeEnemies({ name: '하늘 사냥꾼', hp: 1400, atk: 110, defense: 72, xpReward: 365, race: 'humanoid', aggressive: true }, 4, 2760, 175, 2),
    ],
  },
  {
    id: 'field9b', theme: 'sky_isle', type: 'field', name: '폭풍의 섬', level: 75, width: 4000, groundColor: '#4f7288',
    platforms: [{ x: 900, width: 600, y: FLOOR2_Y }, { x: 2800, width: 620, y: FLOOR2_Y }],
    exits: [{ to: 'town8', x: 40 }, { to: 'field9a', x: 2000 }, { to: 'field10a', x: 3880 }],
    enemies: [
      ...makeEnemies({ name: '번개 정령', hp: 1830, atk: 128, defense: 86, xpReward: 413, race: 'inanimate', aggressive: true }, 13, 420, 250),
      ...makeEnemies({ name: '구름 거인', hp: 2100, atk: 120, defense: 98, xpReward: 430, race: 'humanoid', aggressive: false }, 5, 980, 175, 2),
      { name: '폭풍왕 아에로스', x: 3700, hp: 45750, atk: 230, defense: 120, xpReward: 12390, race: 'inanimate', aggressive: true, boss: true, floor: 1 },
    ],
  },
  {
    id: 'field10a', theme: 'abyss', type: 'field', name: '마계 관문', level: 80, width: 4100, groundColor: '#3a2b48',
    platforms: [{ x: 840, width: 620, y: FLOOR2_Y }, { x: 2800, width: 640, y: FLOOR2_Y }],
    exits: [{ to: 'town8', x: 40 }, { to: 'field9b', x: 240 }, { to: 'field10b', x: 2050 }],
    enemies: [
      ...makeEnemies({ name: '심연 사냥개', hp: 2400, atk: 152, defense: 104, xpReward: 467, race: 'demon', aggressive: true }, 14, 420, 245),
      ...makeEnemies({ name: '타락한 기사', hp: 2700, atk: 144, defense: 118, xpReward: 486, race: 'humanoid', aggressive: false }, 5, 900, 175, 2),
      ...makeEnemies({ name: '심연 사냥개', hp: 2400, atk: 152, defense: 104, xpReward: 467, race: 'demon', aggressive: true }, 4, 2860, 175, 2),
    ],
  },
  {
    id: 'field10b', theme: 'abyss', type: 'field', name: '타락한 성소', level: 85, width: 4100, groundColor: '#2f2340',
    platforms: [{ x: 920, width: 600, y: FLOOR2_Y }, { x: 2900, width: 620, y: FLOOR2_Y }],
    exits: [{ to: 'field10a', x: 40 }, { to: 'field11a', x: 3980 }],
    enemies: [
      ...makeEnemies({ name: '나락 사제', hp: 3200, atk: 180, defense: 124, xpReward: 527, race: 'undead', aggressive: true }, 14, 420, 240),
      ...makeEnemies({ name: '공허 촉수', hp: 3600, atk: 168, defense: 140, xpReward: 548, race: 'demon', aggressive: false }, 5, 1000, 175, 2),
      { name: '나락의 대사제 모르간', x: 3800, hp: 80000, atk: 324, defense: 174, xpReward: 15810, race: 'undead', aggressive: true, boss: true, floor: 1 },
    ],
  },
  {
    id: 'field11a', theme: 'temple', type: 'field', name: '잊힌 신전', level: 90, width: 4200, groundColor: '#6b6147',
    platforms: [{ x: 880, width: 640, y: FLOOR2_Y }, { x: 2900, width: 660, y: FLOOR2_Y }],
    exits: [{ to: 'field10b', x: 40 }, { to: 'field11b', x: 2100 }, { to: 'town8', x: 240 }],
    enemies: [
      ...makeEnemies({ name: '신전 수호상', hp: 4400, atk: 215, defense: 150, xpReward: 596, race: 'inanimate', aggressive: true }, 14, 420, 250),
      ...makeEnemies({ name: '봉인된 사도', hp: 4800, atk: 205, defense: 164, xpReward: 620, race: 'undead', aggressive: false }, 5, 920, 175, 2),
      ...makeEnemies({ name: '신전 수호상', hp: 4400, atk: 215, defense: 150, xpReward: 596, race: 'inanimate', aggressive: true }, 4, 2960, 175, 2),
    ],
  },
  {
    id: 'field11b', theme: 'temple', type: 'field', name: '신들의 무덤', level: 95, width: 4200, groundColor: '#585038',
    platforms: [{ x: 950, width: 620, y: FLOOR2_Y }, { x: 3000, width: 640, y: FLOOR2_Y }],
    exits: [{ to: 'field11a', x: 40 }, { to: 'town6', x: 4080 }],
    enemies: [
      ...makeEnemies({ name: '잊힌 신관', hp: 6100, atk: 258, defense: 180, xpReward: 673, race: 'undead', aggressive: true }, 14, 420, 245),
      ...makeEnemies({ name: '신성 파수꾼', hp: 6800, atk: 244, defense: 200, xpReward: 700, race: 'inanimate', aggressive: false }, 5, 1020, 175, 2),
      { name: '잊힌 신 아스테리온', x: 3950, hp: 152500, atk: 464, defense: 252, xpReward: 20190, race: 'undead', aggressive: true, boss: true, floor: 1 },
    ],
  },
  // ================= 승급 구간 (베테랑 / 익스퍼트 / 마스터) =================
  // 기본 100레벨을 찍은 뒤 들어오는 지역. 몹 경험치가 자릿수부터 다르다.
  {
    id: 'town6', theme: 'town_castle', type: 'town', name: '고룡의 관문 드라켄호프', level: 100, width: 1800, groundColor: '#2f3a4d',
    platforms: TOWN_PLATFORMS,
    exits: [
      { to: 'field11b', x: 60 },
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

// 병작(쩔) 전용. 들어갈 때마다 파티 최고 레벨에 맞춰 몹을 다시 만든다(js/data/training.js).
ZONE_DATA.push({
  id: 'training', theme: 'quarry', type: 'training', name: '수련장', level: 1, width: 2800,
  groundColor: '#4a4a3c',
  platforms: [{ x: 600, width: 500, y: FLOOR2_Y }, { x: 1700, width: 500, y: FLOOR2_Y }],
  exits: [{ to: 'town1', x: 40 }],
  enemies: [],
});

// 엔드게임 존. 층을 올라갈 때마다 내용물을 갈아 끼우므로 enemies/exits는 비워 둔다.
// noRespawn이 있어야 "층을 다 비웠다" 판정이 성립한다.
ZONE_DATA.push({
  id: 'tower', theme: 'demon', type: 'tower', name: '심연의 탑', level: 60, width: 1700,
  groundColor: '#241a2e', noRespawn: true,
  platforms: [{ x: 470, width: 360, y: FLOOR2_Y }, { x: 1010, width: 360, y: FLOOR2_Y }],
  exits: [],
  enemies: [],
});

const ENEMY_RESPAWN_MS = 12000;
