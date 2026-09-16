// 엔드게임 콘텐츠 — 심연의 탑.
// 만렙까지 가는 길은 사냥터가 채우고, 그 뒤로는 이 탑이 목표가 된다.
// 층은 들어갈 때마다 생성되고 위로 갈수록 지수적으로 강해진다. 5층마다 보스가 나온다.

const TOWER_ZONE_ID = 'tower';
const TOWER_ENTRY_LEVEL = 20;   // 이 레벨 이상인 캐릭터가 있어야 입장
const TOWER_BOSS_EVERY = 5;     // 보스 층 주기
const TOWER_CHECKPOINT = 5;     // 이 배수 층부터 재도전 가능

// 층당 배율. 1.28^49 ≈ 1170배 — 50층이면 초반 몹의 천 배가 넘는다.
const TOWER_HP_GROWTH = 1.28;
const TOWER_ATK_GROWTH = 1.22;
const TOWER_DEF_GROWTH = 1.24;
const TOWER_XP_GROWTH = 1.30;

const TOWER_MONSTERS = [
  { name: '심연의 그림자', race: 'demon' },
  { name: '탑의 파수꾼', race: 'inanimate' },
  { name: '타락한 기사', race: 'humanoid' },
  { name: '공허의 사냥개', race: 'beast' },
  { name: '봉인된 망령', race: 'undead' },
];

const TOWER_BOSS_NAMES = ['탑의 감시자', '피의 집행자', '공허의 군주', '시간을 먹는 자', '심연 그 자체'];

function towerStat(base, growth, floor) {
  return Math.max(1, Math.round(base * Math.pow(growth, floor - 1)));
}

function isTowerBossFloor(floor) { return floor % TOWER_BOSS_EVERY === 0; }

// 층 번호로 그 층의 몹 배치를 만든다. 보스 층은 보스 하나 + 호위 몇 마리.
function makeTowerFloor(floor, zoneWidth) {
  // 탑은 층마다 자체 배율이 있어서 레벨 배율(balance.js)을 쓰지 않는다(noScale).
  // 대신 1층 기준값을 지금 파티 기준으로 올려 잡았다(예전 값은 한 대에 죽었다).
  const hp = towerStat(5200, TOWER_HP_GROWTH, floor);
  const atk = towerStat(24, TOWER_ATK_GROWTH, floor);
  const defense = towerStat(8, TOWER_DEF_GROWTH, floor);
  const xpReward = towerStat(600, TOWER_XP_GROWTH, floor);
  const kind = TOWER_MONSTERS[(floor - 1) % TOWER_MONSTERS.length];
  // 층에서 몹 레벨을 만든다. 전투 수치는 noScale이라 쓰지 않지만, 떨어지는 장비의 레벨대와 표시에 쓴다.
  // 사냥터가 45에서 끊기고 100에서 다시 시작하므로 그 사이 레벨대(51~90) 장비는 탑에서 나온다.
  const level = clamp(20 + floor * 2, 20, 130);
  const template = { ...kind, hp, atk, defense, xpReward, level, aggressive: true, noScale: true };

  if (!isTowerBossFloor(floor)) {
    const count = 5 + Math.min(7, Math.floor(floor / 4));
    const ground = Math.ceil(count * 0.65);
    const upper = count - ground;
    const spacing = Math.floor((zoneWidth - 500) / Math.max(1, ground));
    return [
      ...makeEnemies(template, ground, 380, spacing, 1),
      ...makeEnemies(template, upper, 540, 150, 2),
    ];
  }

  const bossName = TOWER_BOSS_NAMES[(Math.floor(floor / TOWER_BOSS_EVERY) - 1) % TOWER_BOSS_NAMES.length];
  const bossAtk = Math.round(atk * 1.8);
  return [
    ...makeEnemies(template, 3, 420, 220, 1),
    {
      name: `${bossName} (${floor}층)`,
      x: Math.round(zoneWidth * 0.72),
      hp: hp * 14, atk: bossAtk, defense: Math.round(defense * 1.6),
      xpReward: xpReward * 18, race: 'demon', aggressive: true, boss: true, floor: 1, noScale: true, level,
      // 층마다 피해량이 달라야 해서 패턴을 인스턴스에 직접 붙인다.
      bossData: {
        enrageAt: 0.5,
        patterns: [
          { type: 'slam', telegraph: 900, radius: 180, damage: Math.round(bossAtk * 1.4), cooldown: 4200, warn: '층이 흔들린다 — 내려찍기!' },
          { type: 'charge', telegraph: 700, speed: 360, damage: Math.round(bossAtk * 1.2), cooldown: 3600, warn: '돌진 준비!' },
          { type: 'volley', telegraph: 750, count: 4, damage: Math.round(bossAtk * 0.9), cooldown: 4000, warn: '어둠의 탄막!' },
          { type: 'summon', telegraph: 950, count: 2, cooldown: 9000, warn: '심연에서 무언가 기어나온다!',
            minion: { name: '심연의 조각', hp: Math.round(hp * 0.5), atk: Math.round(atk * 0.8), defense, xpReward: Math.round(xpReward * 0.4), race: 'demon', aggressive: true, noScale: true } },
        ],
      },
    },
  ];
}

// 층 보상. 골드·경험치는 층에 비례하고, 5층마다 경험치 카드가 나온다.
function towerFloorReward(floor) {
  const gold = Math.round(60 * floor * (1 + floor / 20));
  const xp = towerStat(40, TOWER_XP_GROWTH, floor);
  const items = [];
  if (isTowerBossFloor(floor)) {
    items.push(floor >= 10 ? 'master_cube' : 'craftsman_cube');
    if (floor < 15) items.push('exp_card_basic');
    else if (floor < 30) items.push('exp_card_veteran');
    else if (floor < 45) items.push('exp_card_expert');
    else items.push('exp_card_master');
    items.push(floor < 25 ? 'stance_card_basic' : 'stance_card_high');
  }
  return { gold, xp, items };
}
