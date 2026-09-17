// 레벨대 × 등급 장비.
//
// 예전에는 티어 5단계가 전부라서 40레벨 이후로는 새 장비가 나오지 않았다.
// 이제 레벨 10칸마다 '레벨대'(GEAR_BRACKETS)가 있고, 그 안에서 다시 등급 5단계(GEAR_GRADES)로 갈린다.
//   item.bracket  = 레벨대(1~13, 11~13은 베테랑·익스퍼트·마스터)
//   item.tier     = 등급(1~5). 색·강화 상한·잠재능력 계산이 전부 이 값을 쓴다(예전 티어 자리)
//   item.reqLevel = 착용 제한 레벨(그 레벨대의 시작 레벨)
//   item.matTier  = 강화·제작에 쓰는 재료 티어(레벨대에서 유도)

const GEAR_GRADES = [
  { g: 1, name: '일반', prefix: '', mult: 1.0 },
  { g: 2, name: '고급', prefix: '고급 ', mult: 1.18 },
  { g: 3, name: '희귀', prefix: '희귀 ', mult: 1.4 },
  { g: 4, name: '영웅', prefix: '영웅 ', mult: 1.7 },
  { g: 5, name: '전설', prefix: '전설 ', mult: 2.1 },
];

// scale: 그 레벨대 '일반' 등급의 배율(1티어 기본 장비 = 1).
// mat: 강화·제작에 쓰는 재료 티어. 그 레벨대에서 실제로 사냥하는 존이 주는 재료로 맞춘다
// (예전에는 11~20 장비가 1~10 존 재료를 요구해서, 상위 존으로 넘어가면 제작이 막혔다).
const GEAR_BRACKETS = [
  { b: 1, from: 1, to: 10, name: '견습', scale: 1, mat: 1 },
  { b: 2, from: 11, to: 20, name: '숙련', scale: 2.5, mat: 2 },
  { b: 3, from: 21, to: 30, name: '정예', scale: 5.5, mat: 3 },
  { b: 4, from: 31, to: 40, name: '백은', scale: 10, mat: 4 },
  { b: 5, from: 41, to: 50, name: '흑철', scale: 17, mat: 5 },
  { b: 6, from: 51, to: 60, name: '용린', scale: 26, mat: 6 },
  { b: 7, from: 61, to: 70, name: '성전', scale: 38, mat: 6 },
  { b: 8, from: 71, to: 80, name: '심연', scale: 54, mat: 7 },
  { b: 9, from: 81, to: 90, name: '신화', scale: 74, mat: 7 },
  { b: 10, from: 91, to: 100, name: '천공', scale: 100, mat: 7 },
  { b: 11, from: 101, to: 110, name: '베테랑', scale: 150, mat: 5, rank: 'veteran' },
  { b: 12, from: 111, to: 120, name: '익스퍼트', scale: 230, mat: 5, rank: 'expert' },
  { b: 13, from: 121, to: 130, name: '마스터', scale: 350, mat: 5, rank: 'master' },
];

const GEAR_GRADE_NAME = {};
GEAR_GRADES.forEach((x) => { GEAR_GRADE_NAME[x.g] = x.name; });

function gearBracket(b) { return GEAR_BRACKETS.find((x) => x.b === b) || GEAR_BRACKETS[0]; }

// 레벨 → 그 레벨에 맞는 레벨대
function bracketFromLevel(level) {
  const lv = clamp(level || 1, 1, 130);
  return GEAR_BRACKETS.find((x) => lv >= x.from && lv <= x.to) || GEAR_BRACKETS[GEAR_BRACKETS.length - 1];
}

// 장신구. 예전에는 없던 부위라 여기서 기본형을 정의한다(반지·목걸이 두 종류).
const ACCESSORY_BASES = [
  { key: 'acc_ring', noun: '반지', shape: 'ring', atk: 5, def: 4, price: 100 },
  { key: 'acc_amulet', noun: '목걸이', shape: 'amulet', atk: 4, def: 6, price: 110 },
];

ACCESSORY_BASES.forEach((base) => {
  ITEM_DATA[base.key] = {
    name: `${GEAR_BRACKETS[0].name} ${base.noun}`, slot: 'accessory', accShape: base.shape,
    atk: base.atk, def: base.def, price: base.price, tier: 1, bracket: 1, reqLevel: 1, matTier: 1,
  };
});

// 기본 장비(1레벨대 일반 등급)에도 새 필드를 채워 둔다.
[...WEAPON_BASES, ...ARMOR_BASES].forEach((base) => {
  const it = ITEM_DATA[base.key];
  it.bracket = 1; it.reqLevel = 1; it.matTier = 1; it.tier = 1;
});

const GEAR_BASES = [
  ...WEAPON_BASES.map((b) => ({ ...b, slot: 'weapon' })),
  ...ARMOR_BASES,
  ...ACCESSORY_BASES.map((b) => ({ ...b, slot: 'accessory' })),
];

// 레벨대 × 등급 × 부위를 전부 찍어낸다. (기본형 19종 × 13레벨대 × 5등급)
GEAR_BRACKETS.forEach((br) => {
  GEAR_GRADES.forEach((gr) => {
    GEAR_BASES.forEach((base) => {
      const b1 = ITEM_DATA[base.key];
      if (br.b === 1 && gr.g === 1) return; // 기본형이 그 자리다
      const id = `${base.key}_b${br.b}g${gr.g}`;
      const mult = br.scale * gr.mult;
      const common = {
        name: `${gr.prefix}${br.name} ${base.noun}`,
        price: Math.round(b1.price * mult * 1.6),
        tier: gr.g, bracket: br.b, reqLevel: br.from, matTier: br.mat,
      };
      if (base.slot === 'weapon') {
        ITEM_DATA[id] = { ...common, slot: 'weapon', stanceId: base.stanceId, atk: Math.round(b1.atk * mult) };
      } else if (base.slot === 'accessory') {
        ITEM_DATA[id] = {
          ...common, slot: 'accessory', accShape: base.shape,
          atk: Math.round(b1.atk * mult), def: Math.round(b1.def * mult),
        };
      } else {
        ITEM_DATA[id] = {
          ...common, slot: base.slot, armorClass: base.armorClass, def: Math.round(b1.def * mult),
        };
      }
    });
  });
});

// 드랍 추첨용 풀: `${레벨대}:${등급}` → 아이템 id 목록
const GEAR_POOL = {};
Object.keys(ITEM_DATA).forEach((id) => {
  const it = ITEM_DATA[id];
  if (!it.slot || !it.bracket) return;
  const key = `${it.bracket}:${it.tier}`;
  (GEAR_POOL[key] = GEAR_POOL[key] || []).push(id);
});

// 등급 추첨. 일반 몹은 낮은 등급 위주, 보스는 높은 등급이 잘 나온다.
const GRADE_WEIGHT_MOB = [55, 27, 12, 5, 1];
const GRADE_WEIGHT_BOSS = [10, 24, 30, 24, 12];

function rollGearGrade(boss) {
  const w = boss ? GRADE_WEIGHT_BOSS : GRADE_WEIGHT_MOB;
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) {
    r -= w[i];
    if (r <= 0) return i + 1;
  }
  return 1;
}

const EQUIP_DROP_CHANCE = 0.06; // 몹이 3배라 0.1은 장비가 너무 쏟아졌다
const PARTY_WEAPON_BIAS = 0.7; // 무기가 떴을 때 파티가 쓸 수 있는 계열로 바꿔 줄 확률

// 사냥터·보스 드랍. 존 권장 레벨의 레벨대에서 등급을 굴린다.
// 보스는 반드시 한 점 떨어뜨린다.
// 무기는 10계열이라 그냥 굴리면 쓸 수 있는 무기가 좀처럼 안 나온다(레벨대가 올라가도 초반 무기를 낀 채로 버틴다).
// 그래서 무기가 나오면 대개 파티가 쓰는 계열로 바꿔 준다.
function rollEquipmentDrop(level, opts = {}) {
  const boss = !!opts.boss;
  if (!boss && Math.random() > EQUIP_DROP_CHANCE) return null;
  const br = bracketFromLevel(level);
  const grade = rollGearGrade(boss);
  const pool = GEAR_POOL[`${br.b}:${grade}`] || [];
  if (pool.length === 0) return null;
  let id = pool[Math.floor(Math.random() * pool.length)];
  const stances = opts.stances || [];
  if (stances.length && ITEM_DATA[id].slot === 'weapon' && Math.random() < PARTY_WEAPON_BIAS) {
    const mine = pool.filter((x) => ITEM_DATA[x].slot === 'weapon' && stances.includes(ITEM_DATA[x].stanceId));
    if (mine.length) id = mine[Math.floor(Math.random() * mine.length)];
  }
  return id;
}

// 장비 제작은 일반·고급 등급까지만(희귀 이상은 사냥으로 얻는다).
GEAR_BRACKETS.forEach((br) => {
  [1, 2].forEach((g) => {
    (GEAR_POOL[`${br.b}:${g}`] || []).forEach((itemId) => {
      const item = ITEM_DATA[itemId];
      const mats = TIER_MATERIALS[br.mat];
      const isWeapon = item.slot === 'weapon';
      RECIPE_DATA.push({
        id: `craft_${itemId}`,
        result: itemId,
        gold: Math.round(item.price * 1.5),
        tier: g,
        bracket: br.b,
        equipment: true,
        materials: isWeapon
          ? [{ id: mats[0], count: 6 + g * 2 }, { id: mats[2], count: 3 + g }]
          : [{ id: mats[1], count: 5 + g * 2 }, { id: mats[0], count: 3 + g }],
      });
    });
  });
});

// 표시용: "정예 · 희귀" 처럼 레벨대와 등급을 한 줄로
function gearGradeLabel(item) {
  if (!item || !item.bracket) return '';
  return `${gearBracket(item.bracket).name} · ${GEAR_GRADE_NAME[item.tier]}`;
}
