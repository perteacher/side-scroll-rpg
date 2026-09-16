// 캐릭터 도트 스프라이트. 16x24 격자 레이어를 겹쳐 한 장으로 합성한다.
// 순서: 다리 → 옷(방어구 등급별) → 얼굴 → 머리카락 또는 투구 → (연갑이면) 모자
// 오른쪽을 보는 모습으로 찍고, 왼쪽을 볼 때는 좌우 반전한다.
//
// 글자: s/x=피부(밝음/그늘)  r/q=머리카락  c/u=옷(캐릭터 고유색/그늘)  p=바지  b=신발
//       w/m/d=금속(방어구 티어)  l/n/o=가죽  a=티어 장식색  g=금장식

const UNIT_W = 16;
const UNIT_H = 24;
const UNIT_HEADROOM = 4; // 모자·삐친 머리가 머리 위로 올라갈 여유

// 원하는 행부터 채우고 나머지는 투명으로 메운다(행 번호를 일일이 맞추지 않으려고).
function padLayer(startRow, rows, height = UNIT_H) {
  const blank = '.'.repeat(UNIT_W);
  const out = [];
  for (let i = 0; i < height; i++) {
    const r = rows[i - startRow];
    out.push(i >= startRow && r !== undefined ? r : blank);
  }
  return out;
}

const UNIT_LAYERS = {
  head: padLayer(1, [
    '.....kkkkkk.....',
    '....kssssssk....',
    '...kssssssssk...',
    '...kssssssssk...',
    '...kssssssssk...',
    '...kssssksksk...',
    '...kssssssssk...',
    '....kssssxsk....',
    '.....kkssk......',
    '......kssk......',
  ]),

  legs_idle: padLayer(18, [
    '.....kppkppk....',
    '.....kppkppk....',
    '.....kppkppk....',
    '.....kppkppk....',
    '....kbbkkbbk....',
    '....kkkk.kkkk...',
  ]),
  legs_walk: padLayer(18, [
    '.....kppkppk....',
    '....kppk.kppk...',
    '...kppk...kppk..',
    '...kppk...kppk..',
    '..kbbbk...kbbbk.',
    '..kkkkk...kkkkk.',
  ]),

  // ---- 옷 ----
  outfit_heavy: padLayer(11, [
    '....kmmmmmmk....',
    '...kwmmccmmmk...',
    '..kwmkccccckmk..',
    '..kmdkcccccdmk..',
    '...kdkgggggkdk..',
    '...kskcccccksk..',
    '....kmmmmmmmk...',
  ]),
  outfit_light: padLayer(11, [
    '.....kccccck....',
    '....knnnnnnnk...',
    '...kcnnlnnnnck..',
    '...kcnlnnnnnck..',
    '...kcnooaoonck..',
    '...ksnnnnnnnsk..',
    '....kknnnnnkk...',
  ]),
  outfit_cloth: padLayer(11, [
    '.....kcggck.....',
    '....kccgccck....',
    '...kuccgcccuk...',
    '...kuccgcccuk...',
    '...kucogoocuk...',
    '...ksccgcccsk...',
    '....kccgcccck...',
    '....kccgcccck...',
    '...kcccgccccck..',
    '...kuuuguuuuuk..',
    '...kkkkkkkkkkk..',
  ]),

  // ---- 머리카락 (투구를 쓰면 대신 투구가 그려진다) ----
  hair_short: padLayer(0, [
    '.....kkkkkk.....',
    '....krrrrrrk....',
    '...krrrrrrrrk...',
    '..krrrrrrrrrrk..',
    '..krqrrrrrrrrk..',
    '..krqrr.....rk..',
    '..krqr......k...',
    '..krq...........',
    '...kk...........',
  ]),
  hair_long: padLayer(0, [
    '.....kkkkkk.....',
    '....krrrrrrk....',
    '...krrrrrrrrk...',
    '..krrrrrrrrrrk..',
    '..krqrrrrrrrrk..',
    '..krqrr.....rk..',
    '..krqr......k...',
    '..krqr..........',
    '..krqr..........',
    '..krqr..........',
    '..kqqk..........',
    '...kk...........',
  ]),
  hair_spiky: padLayer(0, [
    '....k..k..k.....',
    '...krkkrkkrk....',
    '...krrrrrrrrk...',
    '..krrrrrrrrrrk..',
    '..krqrrrrrrrrk..',
    '..krqrr.....rk..',
    '..krqr......k...',
    '...kk...........',
  ]),
  hair_tail: padLayer(0, [
    '.....kkkkkk.....',
    '....krrrrrrk....',
    '..kkrrrrrrrrk...',
    '.krrkrrrrrrrrk..',
    'krrqkqrrrrrrrk..',
    '.kqqkrr.....rk..',
    '..kk.qr.....k...',
    '.....k..........',
  ]),

  // ---- 투구 ----
  helm_heavy: padLayer(0, [
    '.....kkkkkk.....',
    '....kmwwmmmk....',
    '...kmwmmmmmmk...',
    '...kmmmmmmmmk...',
    '...kmmmkkkkkk...',
    '...kmmk.....k...',
    '...kdmk.........',
    '...kddk.........',
    '....kk..........',
  ]),
  helm_light: padLayer(0, [
    '......kkkk......',
    '....kknnnnkk....',
    '...knlnnnnnnk...',
    '..knlnnnnnnnnk..',
    '..knnnnnnnnnnk..',
    '..knnnk.....nk..',
    '..knnk......k...',
    '..knnk..........',
    '..knnk..........',
    '...kaak.........',
    '....kk..........',
  ]),
  // 마법사 모자는 머리 위로 솟아서 여유 공간(UNIT_HEADROOM)부터 그린다.
  helm_cloth: [
    '..kk............',
    '..kckk..........',
    '...kcck.........',
    '...kccck........',
    '....kccck.......',
    '....kcccck......',
    '...kccccccck....',
    '...kgggggggk....',
    '.kkuccccccccukk.',
    '..kkkkkkkkkkkk..',
  ],
};

// ---- 뒷모습 레이어 ----
// 쿼터뷰에서는 화면 위쪽(북쪽)으로 걸을 때 등을 보인다.
// 앞/뒤 두 벌만 찍고 좌우 반전을 더하면 네 방향이 된다. 없는 이름은 앞모습 레이어를 그대로 쓴다.
const UNIT_BACK_LAYERS = {
  head: padLayer(1, [
    '.....kkkkkk.....',
    '....kssssssk....',
    '...kssssssssk...',
    '...kssssssssk...',
    '...kssssssssk...',
    '...kssssssssk...',
    '...kssssssssk...',
    '....kssssssk....',
    '.....kkssk......',
    '......kssk......',
  ]),

  hair_short: padLayer(0, [
    '.....kkkkkk.....',
    '....krrrrrrk....',
    '...krrrrrrrrk...',
    '..krrrrrrrrrrk..',
    '..krqrrrrrrrrk..',
    '..krqrrrrrrrrk..',
    '..krqrrrrrrrk...',
    '...kqqqqqqqk....',
    '....kkkkkkk.....',
  ]),
  hair_long: padLayer(0, [
    '.....kkkkkk.....',
    '....krrrrrrk....',
    '...krrrrrrrrk...',
    '..krrrrrrrrrrk..',
    '..krqrrrrrrrrk..',
    '..krqrrrrrrrrk..',
    '..krqrrrrrrrrk..',
    '..krqrrrrrrrrk..',
    '..krqqrrrrqqrk..',
    '..kqqqqqqqqqqk..',
    '...kqqqqqqqqk...',
    '....kkkkkkkk....',
  ]),
  hair_spiky: padLayer(0, [
    '....k..k..k.....',
    '...krkkrkkrk....',
    '...krrrrrrrrk...',
    '..krrrrrrrrrrk..',
    '..krqrrrrrrrrk..',
    '..krqrrrrrrrrk..',
    '..krqrrrrrrrk...',
    '...kqqqqqqqk....',
  ]),
  hair_tail: padLayer(0, [
    '.....kkkkkk.....',
    '....krrrrrrk....',
    '...krrrrrrrrk...',
    '..krrrrrrrrrrk..',
    '..krqrrrrrrrrk..',
    '..krqrrrrrrrrk..',
    '...krqrrrrrrk...',
    '....kqqqqqqk....',
    '.....kqqqqk.....',
    '.....kqqqqk.....',
    '......kqqk......',
    '......kkkk......',
  ]),

  helm_heavy: padLayer(0, [
    '.....kkkkkk.....',
    '....kmwwmmmk....',
    '...kmwmmmmmmk...',
    '...kmmmmmmmmk...',
    '...kmmmmmmmmk...',
    '...kmmmmmmmmk...',
    '...kdmmmmmmdk...',
    '....kdddddddk...',
    '.....kkkkkk.....',
  ]),
  helm_light: padLayer(0, [
    '......kkkk......',
    '....kknnnnkk....',
    '...knlnnnnnnk...',
    '..knnnnnnnnnnk..',
    '..knnnnnnnnnnk..',
    '..knnnnnnnnnnk..',
    '..knnnnnnnnnnk..',
    '...knnnnnnnnk...',
    '....kaaaaaak....',
    '.....kkkkkk.....',
  ]),

  outfit_heavy: padLayer(11, [
    '....kmmmmmmk....',
    '...kwmmmmmmmk...',
    '..kwmmmmmmmmmk..',
    '..kmdmmmmmmdmk..',
    '...kdmmmmmmmdk..',
    '...ksmmmmmmmsk..',
    '....kmmmmmmmk...',
  ]),
  outfit_light: padLayer(11, [
    '.....kccccck....',
    '....knnnnnnnk...',
    '...kcnnnnnnnck..',
    '...kcnnnnnnnck..',
    '...kcnnnnnnnck..',
    '...ksnnnnnnnsk..',
    '....kknnnnnkk...',
  ]),
  outfit_cloth: padLayer(11, [
    '.....kccccck....',
    '....kcccccck....',
    '...kuccccccuk...',
    '...kuccccccuk...',
    '...kuccccccuk...',
    '...ksccccccsk...',
    '....kcccccck....',
    '....kcccccck....',
    '...kcccccccck...',
    '...kuuuuuuuuk...',
    '...kkkkkkkkkk...',
  ]),
};

// 얼굴·머리 모양은 캐릭터 id로 고정해서, 같은 캐릭터는 늘 같은 모습이 되게 한다.
const SKIN_TONES = ['#f2c9a0', '#e8b48a', '#c98e62', '#f5d9b8', '#a8744d'];
const HAIR_COLORS = ['#2c2c34', '#6b3e26', '#c0842f', '#e8d27a', '#b03a2e', '#dfe3e8', '#5b4a9e', '#2e6f8e', '#3d6b3a'];
const HAIR_STYLES = ['short', 'long', 'spiky', 'tail'];

// 방어구 등급별 바지 색(중갑은 금속 정강이받이처럼 보이게)
const LEG_COLOR = { heavy: '#6b7580', light: '#4a3b2c', cloth: '#3b3550' };
