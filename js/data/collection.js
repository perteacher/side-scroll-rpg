// 몬스터 컬렉션 (메이플스토리 '몬스터 컬렉션'에서 가져온 시스템).
// 같은 몬스터를 일정 수 잡으면 단계(등록 → 숙련 → 정복)가 오르고, 단계마다 계정 전체(모든 캐릭터)의 스탯이 +1 오른다.
// 오르는 스탯은 몬스터 종족으로 정해지고, 등록한 몬스터 수가 늘면 마일스톤 보상이 붙는다.

// 계정 공용 스탯. 컬렉션이 바뀌면 버전을 올려 캐릭터들의 스탯 캐시가 스스로 다시 계산되게 한다.
let ACCOUNT_FLAT_STATS = {};
let ACCOUNT_STAT_VERSION = 0;

const COLLECTION_STAGES = [
  { id: 'register', name: '등록', normal: 30, boss: 1 },
  { id: 'skilled', name: '숙련', normal: 300, boss: 5 },
  { id: 'conquer', name: '정복', normal: 1500, boss: 20 },
];

const COLLECTION_RACE_STAT = { humanoid: 'str', beast: 'agi', undead: 'vit', demon: 'int', inanimate: 'skl' };

// count: 등록(1단계 이상)한 몬스터 수. 'all'은 전부.
const COLLECTION_MILESTONES = [
  { count: 5, bonus: { atkPct: 0.02 } },
  { count: 12, bonus: { hpPct: 0.04 } },
  { count: 20, bonus: { crit: 3 } },
  { count: 28, bonus: { atkPct: 0.03, defPct: 0.03 } },
  { count: 'all', bonus: { bossDmg: 0.1 } },
];

// 사냥터·보스 몬스터를 이름 기준으로 모은다(탑 몬스터와 보스 소환물은 제외).
function buildCollectionEntries() {
  const seen = new Map();
  ZONE_DATA.forEach((z) => {
    if (z.type === 'tower') return;
    (z.enemies || []).forEach((e) => {
      if (seen.has(e.name)) return;
      seen.set(e.name, { name: e.name, race: e.race, boss: !!e.boss, level: z.level, zone: z.name });
    });
  });
  return [...seen.values()].sort((a, b) => a.level - b.level || Number(a.boss) - Number(b.boss));
}
