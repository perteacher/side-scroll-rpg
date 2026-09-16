// 승급(베테랑 → 익스퍼트 → 마스터).
//
// 예전에는 경험치만 쌓으면 100레벨을 지나 자동으로 베테랑이 됐다. 이제는 구간마다 벽이 있다.
//   기본 1~100 → [베테랑 승급] → 베테랑 1~10(내부 101~110) → [익스퍼트 승급] → … → 마스터 10(130)
// 승급하려면 그 구간의 끝 레벨에 도달하고, 사냥으로 모은 재료와 보스가 떨어뜨리는 인장을 내야 한다.
// 재료에는 저레벨 사냥터 재료가 반드시 섞여 있다(상위 존만 돌면 승급이 안 된다).

const RANK_LEVEL_CAP = [100, 110, 120, 130]; // rank 0~3의 레벨 상한(마지막은 MAX_LEVEL과 같다)

// 승급 인장 — 보스만 떨어뜨린다.
ITEM_DATA.rank_seal_veteran = { name: '승급 인장 · 베테랑', price: 3000, tier: 3, seal: 'veteran' };
ITEM_DATA.rank_seal_expert = { name: '승급 인장 · 익스퍼트', price: 12000, tier: 4, seal: 'expert' };
ITEM_DATA.rank_seal_master = { name: '승급 인장 · 마스터', price: 40000, tier: 5, seal: 'master' };

const PROMOTIONS = [
  {
    rank: 1, id: 'veteran', name: '베테랑', atLevel: 100, gold: 150000,
    desc: '기본 구간을 끝낸 자에게 주어지는 첫 승급.',
    materials: [
      { id: 'bandit_cloth', count: 40 }, { id: 'beast_hide', count: 40 },
      { id: 'bone_shard', count: 30 }, { id: 'pirate_coin', count: 25 },
      { id: 'sand_scale', count: 20 }, { id: 'demon_horn', count: 15 },
      { id: 'rank_seal_veteran', count: 3 },
    ],
  },
  {
    rank: 2, id: 'expert', name: '익스퍼트', atLevel: 110, gold: 600000,
    desc: '베테랑 10레벨에서 한 번 더 껍질을 깬다.',
    materials: [
      { id: 'wolf_fang', count: 60 }, { id: 'grave_moss', count: 50 },
      { id: 'wet_timber', count: 40 }, { id: 'relic_fragment', count: 35 },
      { id: 'dark_crystal', count: 25 }, { id: 'rank_seal_veteran', count: 2 },
      { id: 'rank_seal_expert', count: 3 },
    ],
  },
  {
    rank: 3, id: 'master', name: '마스터', atLevel: 120, gold: 2500000,
    desc: '익스퍼트 10레벨. 마지막 승급이다.',
    materials: [
      { id: 'beast_hide', count: 80 }, { id: 'stone_core', count: 60 },
      { id: 'deep_pearl', count: 50 }, { id: 'ancient_gear', count: 45 },
      { id: 'war_banner_scrap', count: 35 }, { id: 'rank_seal_expert', count: 2 },
      { id: 'rank_seal_master', count: 3 },
    ],
  },
];

// 예전 세이브(승급 개념이 없던 시절)에는 레벨만 있다. 레벨에서 등급을 되짚는다.
function rankFromLevel(level) {
  if (level > 120) return 3;
  if (level > 110) return 2;
  if (level > 100) return 1;
  return 0;
}

function promotionFor(rank) { return PROMOTIONS.find((p) => p.rank === rank + 1) || null; }
function rankName(rank) { return rank === 0 ? '기본' : PROMOTIONS[rank - 1].name; }
function levelCapForRank(rank) { return RANK_LEVEL_CAP[clamp(rank, 0, 3)]; }

// 보스가 떨어뜨리는 인장. 낮은 존에서도 베테랑 인장은 나오게 해서, 승급 준비가 저레벨 사냥과 이어지도록 한다.
const SEAL_DROPS = [
  { id: 'rank_seal_veteran', minLevel: 5, chance: 0.5 },
  { id: 'rank_seal_expert', minLevel: 60, chance: 0.45 },
  { id: 'rank_seal_master', minLevel: 100, chance: 0.4 },
];

function rollSealDrops(zoneLevel) {
  return SEAL_DROPS.filter((s) => zoneLevel >= s.minLevel && Math.random() < s.chance).map((s) => s.id);
}
