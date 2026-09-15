// 몬스터 도트 스프라이트. 종족 5종(인간형/짐승/언데드/마족/무생물)마다 16x24 틀을 찍고,
// 몹 이름으로 색을 골라 입힌다. 74종을 전부 따로 그리지 않고도 서로 다르게 보이게 하려는 것.
// 보스는 같은 틀을 렌더러가 크게 키워 그린다.

const MONSTER_LAYERS = {
  humanoid: {
    body: padLayer(1, [
      '.....kkkkkk.....',
      '....kcccccck....',
      '...kcccccccck...',
      '...kuuuuuuuuk...',
      '...kssssssssk...',
      '...kssssksksk...',
      '...kssssssssk...',
      '....kssssxsk....',
      '.....kkssk......',
      '......kssk......',
      '....kccccccck...',
      '...kcccccccccck.',
      '...kucccccccuk..',
      '...kucccccccuk..',
      '...kuooooooouk..',
      '...ksucccccusk..',
      '....kkcccccckk..',
    ]),
    legs_a: padLayer(18, [
      '.....kppkppk....',
      '.....kppkppk....',
      '.....kppkppk....',
      '.....kppkppk....',
      '....kbbkkbbk....',
      '....kkkk.kkkk...',
    ]),
    legs_b: padLayer(18, [
      '.....kppkppk....',
      '....kppk.kppk...',
      '...kppk...kppk..',
      '...kppk...kppk..',
      '..kbbbk...kbbbk.',
      '..kkkkk...kkkkk.',
    ]),
  },

  beast: {
    body: padLayer(11, [
      '..........k..k..',
      '.........kfkkfk.',
      '.........kffffk.',
      'kk......kfffefkk',
      'kfk.....kffffffk',
      '.kfkkkkkkfffgkk.',
      '..kffffffffffk..',
      '..kffgffffffgk..',
      '..kflllllllfk...',
      '...kkfkkkkfkk...',
    ]),
    legs_a: padLayer(21, [
      '...kfk....kfk...',
      '...kfk....kfk...',
      '...kkk....kkk...',
    ]),
    legs_b: padLayer(21, [
      '..kfk......kfk..',
      '.kfk........kfk.',
      '.kk..........kk.',
    ]),
  },

  undead: {
    body: padLayer(1, [
      '.....kkkkkk.....',
      '....kwwwwwwk....',
      '...kwwwwwwwwk...',
      '...kwwwwwwwwk...',
      '...kwwkrkwkrkk..',
      '...kwwwwwwwwk...',
      '....kwmwmwmk....',
      '.....kkkkkk.....',
      '.......km.......',
      '......kwmk......',
      '....kwkwkwk.....',
      '...kwkkmkkwk....',
      '...kkwkmkwkk....',
      '...kwkkmkkwk....',
      '....kkcccckk....',
      '....kcccccck....',
      '.....kwmkwmk....',
    ]),
    legs_a: padLayer(18, [
      '.....kwk.kwk....',
      '.....kmk.kmk....',
      '.....kwk.kwk....',
      '.....kmk.kmk....',
      '....kwwk.kwwk...',
      '....kkkk.kkkk...',
    ]),
    legs_b: padLayer(18, [
      '.....kwk.kwk....',
      '....kmk...kmk...',
      '...kwk.....kwk..',
      '...kmk.....kmk..',
      '..kwwk.....kwwk.',
      '..kkkk.....kkkk.',
    ]),
  },

  demon: {
    body: padLayer(0, [
      '..kk......kk....',
      '..khk....khk....',
      '...khkkkkhk.....',
      '...kccccccck....',
      '..kccccccccck...',
      '..kcccyckyckk...',
      '..kccccccccck...',
      '..kcukkkkkuck...',
      '...kccwcwcck....',
      '....kkcccckk....',
      '..kkcccccccckk..',
      '.kccucccccccucck',
      '.kcuccccccccuck.',
      '.kcukcccccckuck.',
      '.kckkcccccckkck.',
      '..kk.kccccck.kk.',
      '.....kuuuuuk....',
      '.....kccccck....',
    ]),
    legs_a: padLayer(18, [
      '.....kcckcck....',
      '.....kcckcck....',
      '.....kuukuuk....',
      '.....kcckcck....',
      '....khhkkhhk....',
      '....kkkk.kkkk...',
    ]),
    legs_b: padLayer(18, [
      '.....kcckcck....',
      '....kcck.kcck...',
      '...kuuk...kuuk..',
      '...kcck...kcck..',
      '..khhhk...khhhk.',
      '..kkkkk...kkkkk.',
    ]),
  },

  inanimate: {
    body: padLayer(4, [
      '....kkkkkkkk....',
      '...kssssssssk...',
      '...ksyyssyysk...',
      '...kssssssstk...',
      '....kttttttk....',
      '..kkkkssssskkk..',
      '.kssskssssskssk.',
      '.ksstkssyssktsk.',
      '.ksstksyyysktsk.',
      '.ksstkssyssktsk.',
      '.ktttkssssskttk.',
      '.kkkkkttttkkkkk.',
      '....ksssssssk...',
      '....kttttttk....',
    ]),
    legs_a: padLayer(18, [
      '....ksskksssk...',
      '....ksskksssk...',
      '....ksskksssk...',
      '....ktttkkttk...',
      '...kssssksssk...',
      '...kkkkkkkkkk...',
    ]),
    legs_b: padLayer(18, [
      '....ksskksssk...',
      '....ksskksssk...',
      '...ksskk.ksssk..',
      '...ktttk.kkttk..',
      '..kssssk.ksssk..',
      '..kkkkkk.kkkkk..',
    ]),
  },
};

const MONSTER_TINTS = {
  humanoid: ['#8e2f2f', '#2e4053', '#6e2c00', '#1d5c4e', '#5b2c6f', '#7d6608', '#34495e'],
  beast: ['#7f8c8d', '#8b5a2b', '#a0522d', '#5d6d7e', '#c9b48a', '#3e4a3d', '#6e4a7a'],
  undead: ['#4a3f35', '#3b4a5a', '#5a3a3a'],
  demon: ['#922b21', '#6c3483', '#78281f', '#4a235a', '#1f3a5f'],
  inanimate: ['#8d8a80', '#a69b7c', '#6d6a58', '#7b8a8b', '#8a6f5a'],
};

function monsterPalette(race, name) {
  const seed = hashStr(name);
  const tint = pickBySeed(MONSTER_TINTS[race], seed);
  const common = { p: '#2f3542', b: '#3a2a1c', o: '#3a2a1c' };
  if (race === 'beast') {
    return { ...common, f: tint, g: shadeHex(tint, 0.72), l: shadeHex(tint, 1.35), e: '#f7dc6f' };
  }
  if (race === 'undead') {
    // 이름에 '망령'이 들어가면 푸른 도깨비불 눈, 아니면 붉은 눈
    const ghost = name.includes('망령');
    return { ...common, w: ghost ? '#c8e6f5' : '#e6dfcc', m: ghost ? '#7fa8c2' : '#b0a58a', r: ghost ? '#5dade2' : '#e74c3c', c: tint };
  }
  if (race === 'demon') {
    return { ...common, c: tint, u: shadeHex(tint, 0.65), h: '#1c0f14', y: '#f4d03f', w: '#f2f3f4' };
  }
  if (race === 'inanimate') {
    return { ...common, s: tint, t: shadeHex(tint, 0.7), y: pickBySeed(['#f1c40f', '#48c9b0', '#e74c3c'], seed, 7) };
  }
  return { ...common, c: tint, u: shadeHex(tint, 0.7), s: pickBySeed(SKIN_TONES, seed, 3), x: '#b07a55' };
}
