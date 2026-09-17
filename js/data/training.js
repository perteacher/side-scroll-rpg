// 수련장 — 병작(쩔) 전용 사냥터.
//
// 그라나도 에스파다의 '병작'처럼, 고레벨 캐릭터가 저레벨 캐릭터를 끌어 올리는 자리다.
// 파티 경험치는 쓰러지지 않은 전원이 똑같이 받으므로, 저레벨 캐릭터를 [정지]로 세워 두고
// 고레벨 둘이 [킵]으로 잡으면 그대로 큰다.
//
// 이 존은 들어갈 때마다 파티 최고 레벨에 맞춰 몹을 다시 만든다.
//   - 체력은 낮게(빨리 죽어야 쩔이 된다), 공격력도 낮게(세워 둔 저레벨이 위험하지 않게)
//   - 대신 마리당 경험치도 낮다. 본캐 사냥터보다 효율이 좋으면 다들 여기만 돌게 된다
// 저레벨 캐릭터를 몹이 노리지 않는 규칙(ai.js)과 한 마리당 경험치 상한(entity.js)이 함께 움직인다.

const TRAINING_ZONE_ID = 'training';
const TRAINING_HP_MULT = 0.4;
const TRAINING_ATK_MULT = 0.55;
const TRAINING_XP_MULT = 0.7;
const TRAINING_COUNT = 10;      // 존 적재 때 3배로 불어난다(spreadEnemies) — 실제로는 30마리쯤
const TRAINING_KINDS = [
  { name: '수련용 표적', race: 'inanimate' },
  { name: '수련장 골렘', race: 'inanimate' },
  { name: '훈련된 늑대', race: 'beast' },
];

// 그 레벨대 사냥터의 몹 수치를 그대로 빌려 쓴다(따로 곡선을 관리하지 않으려고).
function trainingBaseFor(level) {
  const fields = ZONE_DATA.filter((z) => z.type === 'field' && z.level <= level);
  const src = fields.length ? fields[fields.length - 1] : ZONE_DATA.find((z) => z.type === 'field');
  const mob = (src.enemies || []).find((e) => !e.boss);
  return mob || { hp: 40, atk: 5, defense: 3, xpReward: 20 };
}

function makeTrainingEnemies(level, zoneWidth) {
  const base = trainingBaseFor(level);
  const spacing = Math.floor((zoneWidth - 700) / TRAINING_COUNT);
  const list = [];
  for (let i = 0; i < TRAINING_COUNT; i++) {
    const kind = TRAINING_KINDS[i % TRAINING_KINDS.length];
    list.push({
      name: kind.name,
      race: kind.race,
      x: 360 + i * spacing,
      floor: i % 4 === 3 ? 2 : 1,
      level,
      hp: Math.max(1, Math.round(base.hp * TRAINING_HP_MULT)),
      atk: Math.max(1, Math.round(base.atk * TRAINING_ATK_MULT)),
      defense: Math.max(0, Math.round((base.defense || 0) * 0.5)),
      xpReward: Math.max(1, Math.round(base.xpReward * TRAINING_XP_MULT)),
      aggressive: true,
    });
  }
  return list;
}
