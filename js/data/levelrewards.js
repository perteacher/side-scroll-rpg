// 초반 성장 보상. "첫 10분"을 채우는 장치 두 가지가 여기 들어 있다.
//  1) 버닝 — 정해진 레벨까지는 한 번 오를 때마다 한 단계 더 준다(메이플 버닝식).
//  2) 레벨 보상 상자 — 보상이 곧 튜토리얼이 되도록, 단계마다 다음에 할 일을 하나씩 열어준다.

const BURNING_UNTIL_LEVEL = 20; // 이 레벨 미만에서 레벨업하면 보너스 레벨 +1

const LEVEL_REWARDS = [
  { level: 3, title: '첫 걸음', gold: 300, items: [['hp_potion', 5], ['mp_potion', 3]],
    hint: '설정(O)에서 자동 물약을 켜고 기준선을 조절할 수 있습니다.' },
  { level: 5, title: '장비를 손보자', gold: 600, items: [['beast_hide', 4], ['bandit_cloth', 4]],
    hint: '마을 잡화상을 클릭 → 강화·잠재능력 탭에서 무기를 강화해 보세요.' },
  { level: 8, title: '동료를 늘리자', gold: 800, items: [['wolf_fang', 3], ['hp_potion', 5]],
    hint: '마을에서 머리 위에 ! 가 뜬 사람을 클릭하면 영입 퀘스트를 받습니다.' },
  { level: 10, title: '전용기 개방', gold: 1200, items: [['suspicious_cube', 1]],
    hint: 'R키로 캐릭터마다 다른 전용기를 씁니다. 큐브로 장비에 잠재능력도 붙여 보세요.' },
  { level: 13, title: '두 번째 무기', gold: 1500, items: [['suspicious_cube', 2]],
    hint: '캐릭터 정보(Alt+E) → 장비교체등록에 무기를 등록하면 1/2/3 키로 스탠스가 통째로 바뀝니다.' },
  { level: 16, title: '더 멀리', gold: 2000, items: [['hp_potion_large', 5], ['antidote', 2]],
    hint: '텔레포트(T)로 더 높은 레벨의 사냥터에 갈 수 있습니다.' },
  { level: 20, title: '탑의 문', gold: 3000, items: [['exp_card_basic', 2], ['craftsman_cube', 1]],
    hint: '심연의 탑(G)이 열렸습니다. 층마다 강해지는 무한 던전입니다.' },
];
