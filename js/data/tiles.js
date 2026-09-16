// 쿼터뷰 바닥 타일. 한 칸은 월드에서 32×32(정사각)이고, 화면에서는 64×32 마름모로 보인다.
// 도트 격자에 맞추려고 마름모 마스크를 32×16 도트로 만들고(도트 한 칸 = 2px), 팔레트만 존 테마별로 갈아 끼운다.
//
// 글자: a=바닥  b=밝은 얼룩  c=어두운 얼룩  d=아래쪽 모서리(칸 경계가 보이게)

const TILE_DOT_W = 32; // 도트 기준 가로
const TILE_DOT_H = 16; // 도트 기준 세로

// 마름모 한 장. seed로 얼룩 위치를 바꿔 같은 타일이 반복돼 보이지 않게 한다.
function isoTileRows(seed = 0) {
  const rows = [];
  for (let r = 0; r < TILE_DOT_H; r++) {
    const half = r < TILE_DOT_H / 2 ? (r + 1) * 2 : (TILE_DOT_H - r) * 2;
    const pad = TILE_DOT_W / 2 - half;
    let line = '';
    for (let i = 0; i < half * 2; i++) {
      const gx = pad + i;
      const h = (gx * 7 + r * 13 + seed * 31) % 17;
      let ch = 'a';
      if (h === 0) ch = 'b';
      else if (h === 5) ch = 'c';
      if (r >= TILE_DOT_H - 2 && (i < 2 || i >= half * 2 - 2)) ch = 'd'; // 아래 모서리
      line += ch;
    }
    rows.push('.'.repeat(pad) + line + '.'.repeat(pad));
  }
  return rows;
}

const TILE_VARIANTS = 4;
const TILE_SHAPES = Array.from({ length: TILE_VARIANTS }, (_, i) => isoTileRows(i));

// 존의 바닥 색에서 타일 팔레트를 뽑는다.
function tilePalette(groundColor) {
  return {
    a: groundColor,
    b: shadeHex(groundColor, 1.14),
    c: shadeHex(groundColor, 0.88),
    d: shadeHex(groundColor, 0.66),
  };
}

// 길(마을 광장·사냥터 오솔길)은 흙길 색으로 확실히 구분되게 깐다.
function roadPalette(groundColor) {
  const base = mixHex(shadeHex(groundColor, 1.3), '#b68a55', 0.6);
  return {
    a: base,
    b: shadeHex(base, 1.1),
    c: shadeHex(base, 0.9),
    d: shadeHex(base, 0.72),
  };
}

// 테마별로 바닥에 세울 장식(기존 배경 스프라이트를 그대로 세워 쓴다).
const ISO_PROPS = {
  trees: [{ shape: 'tree_round', scale: 3 }, { shape: 'tree_pine', scale: 3 }, { shape: 'bush', scale: 2 }],
  deadtrees: [{ shape: 'deadtree', scale: 3 }, { shape: 'rock_small', scale: 2 }],
  rocks: [{ shape: 'rock_big', scale: 2 }, { shape: 'rock_small', scale: 2 }],
  houses: [{ shape: 'house', scale: 2 }, { shape: 'bush', scale: 2 }, { shape: 'tree_round', scale: 2 }],
  ships: [{ shape: 'ship', scale: 2 }, { shape: 'rock_small', scale: 2 }],
  wrecks: [{ shape: 'wreck', scale: 2 }, { shape: 'rock_big', scale: 2 }],
  dunes: [{ shape: 'rock_small', scale: 2 }, { shape: 'dune', scale: 2 }],
  pillars: [{ shape: 'pillar', scale: 3 }, { shape: 'rock_small', scale: 2 }],
  walls: [{ shape: 'wall', scale: 2 }, { shape: 'rock_big', scale: 2 }],
  spikes: [{ shape: 'spike', scale: 3 }, { shape: 'rock_small', scale: 2 }],
};
