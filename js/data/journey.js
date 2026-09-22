// 길잡이(튜토리얼)와 여정(장기 과제).
//
// 이 게임은 조작이 단순한 대신 시스템이 많다 — 스탠스 · 무기 세트 · 자동전투 · 강화 · 잠재능력 ·
// 영입 · 승급 · 탑. 전부 한 번에 설명하면 아무것도 안 남는다. 그래서 둘로 나눴다.
//
//   길잡이 … 한 번에 하나씩. "지금 이걸 해 보세요" → 실제로 하면 그 자리에서 보상.
//            시스템을 여는 순서 자체가 손에 익는 순서가 되게 짰다.
//   여정  … 길게 보는 과제. 진행도 막대가 차고, 다 차면 직접 [수령]을 눌러 받는다.
//            받는 행동을 플레이어 손에 남겨 두는 게 핵심이다. 저절로 들어오면 기억에 안 남는다.
//
// 보상은 전부 기존 경제 안에서만 준다(골드 · 소모품 · 큐브 · 경험치 카드). 새 재화를 만들지 않는다.

// ===== 길잡이 =====
// goal.type = notify()로 들어오는 사건 이름. n번 일어나면 완료.
// 순서: 움직인다 → 때린다 → 자동전투를 켠다(이 게임의 본체) → 줍는다 → 키운다 → 갖춘다 → 넓힌다
const TUTORIAL_STEPS = [
  {
    id: 'move', title: '움직여 보기', goal: { type: 'move', n: 1 },
    desc: '방향키로 걸어 보세요.',
    why: '쿼터뷰라 방향키 두 개를 같이 누르면 대각선으로 움직입니다.',
    reward: { gold: 100 },
  },
  {
    id: 'attack', title: '직접 때려 보기', goal: { type: 'kill', n: 1 },
    desc: '적에게 다가가 Space로 공격해 한 마리를 쓰러뜨리세요.',
    why: 'Space는 공격이자 대화입니다. NPC 곁에서는 말을 겁니다.',
    reward: { gold: 150, items: [['hp_potion', 3]] },
  },
  {
    id: 'auto', title: '자동 사냥 켜기', goal: { type: 'automode', n: 1 },
    desc: '화면 아래 캐릭터 칸에서 [킵] 버튼을 누르세요.',
    why: '이 게임의 사냥은 대부분 자동전투로 굴러갑니다. 정지 / 킵(이동하며 사냥) / 홀드(제자리) 세 가지입니다.',
    reward: { gold: 200, items: [['mp_potion', 3]] },
  },
  {
    id: 'loot', title: '전리품 줍기', goal: { type: 'pickup', n: 5 },
    desc: '바닥에 떨어진 전리품 5개를 주우세요. 가까이 가면 빨려옵니다.',
    why: '60초가 지나거나 사냥터를 옮기면 사라집니다. 장비는 색 빛기둥이 섭니다.',
    reward: { gold: 250 },
  },
  {
    id: 'skill', title: '스킬 배우기', goal: { type: 'learnSkill', n: 1 },
    desc: '캐릭터 정보(C) → 스탠스·스킬 탭에서 스킬 하나를 습득하세요.',
    why: '스킬포인트는 캐릭터 레벨이 아니라 스탠스 레벨에서 나옵니다. 쓰는 자세를 키워야 늡니다.',
    reward: { gold: 300, items: [['stance_card_basic', 1]] },
  },
  {
    id: 'useSkill', title: '스킬 써 보기', goal: { type: 'useSkill', n: 3 },
    desc: '배운 스킬을 Q·W·E로 세 번 쓰세요. (2번째 캐릭터는 A·S·D, 3번째는 Z·X·C)',
    why: '자동전투도 배운 스킬을 알아서 씁니다. 배워 두기만 해도 화력이 오릅니다.',
    reward: { gold: 350, items: [['mp_potion', 5]] },
  },
  {
    id: 'equip', title: '장비 갈아입기', goal: { type: 'equip', n: 1 },
    desc: '가방(I)에서 주운 장비를 하나 장착하세요.',
    why: '무기를 바꾸면 스탠스가 바뀌고, 스탠스가 바뀌면 사거리와 스킬이 통째로 바뀝니다.',
    reward: { gold: 400 },
  },
  {
    id: 'sell', title: '상점에서 팔기', goal: { type: 'sell', n: 1 },
    desc: '마을 잡화상에게 잡템이나 장비를 파세요.',
    why: '판매는 마을 상점에서만 됩니다. 설정(O)에서 낮은 등급 장비를 자동으로 팔게 할 수도 있습니다.',
    reward: { gold: 500, items: [['hp_potion', 5]] },
  },
  {
    id: 'enhance', title: '장비 강화하기', goal: { type: 'enhance', n: 1 },
    desc: '잡화상의 강화·잠재능력 탭에서 장비를 한 번 강화하세요.',
    why: '별 하나마다 성능이 오릅니다. 12성부터는 파괴 확률이 붙으니 그때부터 고민이 시작됩니다.',
    reward: { gold: 700, items: [['suspicious_cube', 1]] },
  },
  {
    id: 'recruit', title: '동료 구하기', goal: { type: 'recruitAccept', n: 1 },
    desc: '마을에서 머리 위에 ! 가 뜬 사람을 클릭해 영입 퀘스트를 받으세요.',
    why: '45명이 각자 다른 시험을 냅니다. 영입한 동료는 병영(B)에서 파티에 넣습니다.',
    reward: { gold: 800 },
  },
  {
    id: 'teleport', title: '사냥터 옮기기', goal: { type: 'teleport', n: 1 },
    desc: '텔레포트(T)로 다른 사냥터에 가 보세요.',
    why: '가 본 곳은 언제든 다시 갈 수 있습니다. 레벨이 맞는 사냥터일수록 경험치가 잘 붙습니다.',
    reward: { gold: 1000, items: [['hp_potion_large', 3]] },
  },
  {
    id: 'scenario', title: '이야기 따라가기', goal: { type: 'scenarioStep', n: 1 },
    desc: '파란 이름표가 붙은 NPC를 찾아가 시나리오를 한 단계 진행하세요.',
    why: '시나리오를 따라가면 새 마을과 사냥터가 열리고, 일부 동료는 그 대목을 지나야 합류합니다.',
    reward: { gold: 1200, items: [['exp_card_basic', 1]] },
  },
];

// 길잡이를 전부 끝내면 주는 마무리 보상
const TUTORIAL_FINISH_REWARD = { gold: 3000, items: [['craftsman_cube', 1], ['hp_potion_large', 5], ['exp_card_basic', 2]] };

// ===== 여정 =====
// metric … 아래 journeyMetrics()가 계산하는 값의 이름
// need   … 그 값이 이만큼이 되면 수령할 수 있다
const JOURNEY_CHAPTERS = [
  {
    id: 'j1', name: '1장 · 첫 걸음',
    tasks: [
      { id: 'j1_kill', title: '몬스터 10마리 처치', metric: 'kills', need: 10, reward: { gold: 300 } },
      { id: 'j1_level', title: '레벨 5 달성', metric: 'level', need: 5, reward: { gold: 400, items: [['hp_potion', 5]] } },
      { id: 'j1_zone', title: '사냥터 2곳 밟아 보기', metric: 'zones', need: 2, reward: { gold: 400 } },
      { id: 'j1_stance', title: '스탠스 레벨 5 찍기', metric: 'stanceLevel', need: 5, reward: { gold: 500, items: [['stance_card_basic', 1]] } },
    ],
  },
  {
    id: 'j2', name: '2장 · 동료를 모아라',
    tasks: [
      { id: 'j2_kill', title: '몬스터 100마리 처치', metric: 'kills', need: 100, reward: { gold: 1200 } },
      { id: 'j2_level', title: '레벨 10 달성', metric: 'level', need: 10, reward: { gold: 1500, items: [['suspicious_cube', 1]] } },
      { id: 'j2_recruit', title: '동료 1명 영입', metric: 'recruits', need: 1, reward: { gold: 1500, items: [['hp_potion', 8]] } },
      { id: 'j2_chapter', title: '시나리오 챕터 1 완료', metric: 'chapters', need: 1, reward: { gold: 2000, items: [['exp_card_basic', 1]] } },
      { id: 'j2_star', title: '장비를 +3까지 강화', metric: 'stars', need: 3, reward: { gold: 1800 } },
    ],
  },
  {
    id: 'j3', name: '3장 · 넓은 세계',
    tasks: [
      { id: 'j3_zone', title: '사냥터 6곳 밟아 보기', metric: 'zones', need: 6, reward: { gold: 3000 } },
      { id: 'j3_level', title: '레벨 20 달성', metric: 'level', need: 20, reward: { gold: 4000, items: [['craftsman_cube', 1]] } },
      { id: 'j3_boss', title: '보스 3마리 토벌', metric: 'bossKills', need: 3, reward: { gold: 4000, items: [['hp_potion_large', 5]] } },
      { id: 'j3_recruit', title: '동료 3명 영입', metric: 'recruits', need: 3, reward: { gold: 5000 } },
      { id: 'j3_chapter', title: '시나리오 챕터 2 완료', metric: 'chapters', need: 2, reward: { gold: 6000, items: [['exp_card_basic', 2]] } },
      { id: 'j3_tower', title: '심연의 탑 5층 돌파', metric: 'tower', need: 5, reward: { gold: 6000, items: [['craftsman_cube', 1]] } },
    ],
  },
  {
    id: 'j4', name: '4장 · 전력을 갖춰라',
    tasks: [
      { id: 'j4_level', title: '레벨 30 달성', metric: 'level', need: 30, reward: { gold: 12000 } },
      { id: 'j4_star', title: '장비를 +8까지 강화', metric: 'stars', need: 8, reward: { gold: 14000, items: [['craftsman_cube', 2]] } },
      { id: 'j4_tier', title: '희귀(3등급) 이상 장비 착용', metric: 'gearTier', need: 3, reward: { gold: 14000 } },
      { id: 'j4_kill', title: '몬스터 1,000마리 처치', metric: 'kills', need: 1000, reward: { gold: 18000, items: [['exp_card_basic', 3]] } },
      { id: 'j4_chapter', title: '시나리오 챕터 3 완료', metric: 'chapters', need: 3, reward: { gold: 20000, items: [['master_cube', 1]] } },
    ],
  },
  {
    id: 'j5', name: '5장 · 전선으로',
    tasks: [
      { id: 'j5_level', title: '레벨 45 달성', metric: 'level', need: 45, reward: { gold: 40000 } },
      { id: 'j5_recruit', title: '동료 7명 영입', metric: 'recruits', need: 7, reward: { gold: 45000, items: [['master_cube', 1]] } },
      { id: 'j5_boss', title: '보스 15마리 토벌', metric: 'bossKills', need: 15, reward: { gold: 50000 } },
      { id: 'j5_tower', title: '심연의 탑 10층 돌파', metric: 'tower', need: 10, reward: { gold: 60000, items: [['exp_card_veteran', 1]] } },
      { id: 'j5_chapter', title: '시나리오 챕터 5 완료', metric: 'chapters', need: 5, reward: { gold: 90000, items: [['exp_card_veteran', 2]] } },
    ],
  },
  {
    id: 'j6', name: '6장 · 승급, 그리고 그 너머',
    tasks: [
      { id: 'j6_level100', title: '레벨 100 달성', metric: 'level', need: 100, reward: { gold: 150000, items: [['exp_card_veteran', 2]] } },
      { id: 'j6_rank1', title: '베테랑으로 승급', metric: 'rank', need: 1, reward: { gold: 200000, items: [['master_cube', 2]] } },
      { id: 'j6_tower25', title: '심연의 탑 25층 돌파', metric: 'tower', need: 25, reward: { gold: 300000, items: [['exp_card_expert', 1]] } },
      { id: 'j6_rank3', title: '마스터로 승급', metric: 'rank', need: 3, reward: { gold: 800000, items: [['exp_card_master', 2]] } },
      { id: 'j6_all', title: '동료 45명 전원 영입', metric: 'recruits', need: 45, reward: { gold: 1000000, items: [['exp_card_master', 3]] } },
    ],
  },
];

const JOURNEY_TASKS = JOURNEY_CHAPTERS.flatMap((c) => c.tasks.map((t) => ({ ...t, chapterId: c.id, chapterName: c.name })));

function journeyTask(id) { return JOURNEY_TASKS.find((t) => t.id === id) || null; }

const JOURNEY_METRIC_LABEL = {
  kills: '처치', bossKills: '보스 처치', level: '레벨', zones: '사냥터', recruits: '영입',
  chapters: '챕터', tower: '탑 층수', stars: '강화', gearTier: '장비 등급',
  stanceLevel: '스탠스 레벨', rank: '승급 단계',
};

// 보상 한 줄 설명
function rewardText(reward) {
  const parts = [];
  if (reward.gold) parts.push(`${reward.gold.toLocaleString()}G`);
  (reward.items || []).forEach(([id, n]) => {
    const it = ITEM_DATA[id];
    parts.push(`${it ? it.name : id} x${n}`);
  });
  return parts.join(' · ');
}
