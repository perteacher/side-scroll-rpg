// 쿼터뷰(아이소메트릭) 좌표계.
//
// 월드는 바닥 평면 하나다. x = 동쪽, y = 남쪽 (둘 다 월드 px). 높이 축은 쓰지 않는다.
// 화면 좌표는 2:1 마름모 투영이다:
//     sx = x - y,   sy = (x + y) / 2
// 한 칸(TILE=32 월드 px 정사각)은 화면에서 64×32 마름모가 된다.
// 그리는 순서(깊이)는 x + y가 작은 것부터 — 뒤에 있는 것이 먼저 그려진다.

const TILE = 32;
const ZONE_DEPTH_TILES = 22; // 존의 세로 칸 수(모든 존 공통)
const ROAD_ROW_FROM = 9;     // 가운데를 가로지르는 길
const ROAD_ROW_TO = 12;

function isoSX(x, y) { return x - y; }
function isoSY(x, y) { return (x + y) * 0.5; }
function isoDepth(e) { return e.x + e.y; }

// 옛 1차원 배치(x + floor)를 평면 좌표로 옮긴다. floor 2였던 대상은 길 위쪽(뒤쪽)에 선다.
function isoPlaceY(def, seedKey) {
  const h = hashStr(`${seedKey}:${def.x}:${def.floor || 1}`);
  if (def.floor === 2) return (4 + (h % 4)) * TILE + TILE / 2;
  return (ROAD_ROW_FROM + (h % (ROAD_ROW_TO - ROAD_ROW_FROM + 1))) * TILE + TILE / 2;
}

class TileMap {
  constructor(def) {
    this.cols = Math.max(24, Math.round(def.width / TILE));
    this.rows = ZONE_DEPTH_TILES;
    this.w = this.cols * TILE;
    this.h = this.rows * TILE;
    this.blocked = new Uint8Array(this.cols * this.rows);
    this.road = new Uint8Array(this.cols * this.rows);
    this.variant = new Uint8Array(this.cols * this.rows);
    this.props = []; // { x, y, shape, scale }
    this._build(def);
  }

  idx(c, r) { return r * this.cols + c; }
  inside(c, r) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows; }

  _build(def) {
    const propList = ISO_PROPS[(THEME_DATA[def.theme] || DEFAULT_THEME).decor] || ISO_PROPS.trees;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const i = this.idx(c, r);
        const h = hashStr(`${def.id}:${c}:${r}`);
        this.variant[i] = h % TILE_VARIANTS;
        const edge = c < 1 || r < 1 || c >= this.cols - 1 || r >= this.rows - 1;
        if (edge) { this.blocked[i] = 1; continue; }
        if (r >= ROAD_ROW_FROM && r <= ROAD_ROW_TO) { this.road[i] = 1; continue; }
        // 길에서 먼 칸일수록 장식이 잘 선다. 장식이 선 칸은 못 지나간다.
        const away = Math.min(Math.abs(r - ROAD_ROW_FROM), Math.abs(r - ROAD_ROW_TO));
        if (h % 100 < 4 + away * 2) {
          const p = propList[(h >>> 7) % propList.length];
          this.props.push({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, shape: p.shape, scale: p.scale });
          this.blocked[i] = 1;
        }
      }
    }
  }

  blockedAtWorld(x, y) {
    const c = Math.floor(x / TILE);
    const r = Math.floor(y / TILE);
    if (!this.inside(c, r)) return true;
    return this.blocked[this.idx(c, r)] === 1;
  }

  // 벽에 부딪히면 그 축만 막고 나머지 축으로는 계속 움직인다(모서리에 끼지 않게).
  moveEntity(e, dx, dy, radius = 10) {
    if (dx) {
      const nx = e.x + dx;
      if (!this.blockedAtWorld(nx + Math.sign(dx) * radius, e.y)) e.x = nx;
    }
    if (dy) {
      const ny = e.y + dy;
      if (!this.blockedAtWorld(e.x, ny + Math.sign(dy) * radius)) e.y = ny;
    }
    e.x = clamp(e.x, TILE, this.w - TILE);
    e.y = clamp(e.y, TILE, this.h - TILE);
  }

  // 막힌 칸에 놓인 대상을 가장 가까운 빈 칸으로 밀어낸다(배치 보정).
  nearestFree(x, y) {
    if (!this.blockedAtWorld(x, y)) return { x, y };
    for (let step = 1; step < 8; step++) {
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dc * step * TILE;
        const ny = y + dr * step * TILE;
        if (!this.blockedAtWorld(nx, ny)) return { x: nx, y: ny };
      }
    }
    return { x: clamp(x, TILE, this.w - TILE), y: (ROAD_ROW_FROM + 1) * TILE };
  }
}

// 화면 좌표 → 월드 좌표(마우스 클릭용). 투영의 역변환.
function isoUnproject(sx, sy) {
  return { x: sy + sx / 2, y: sy - sx / 2 };
}

// 엔티티의 바닥 중심(발 위치). 모든 거리·투영 계산은 이 점을 쓴다.
function entityCenter(e) { return { x: e.x + (e.width || 0) / 2, y: e.y + (e.height || 0) / 2 }; }

function planeDist(a, b) {
  const A = entityCenter(a);
  const B = entityCenter(b);
  return Math.hypot(A.x - B.x, A.y - B.y);
}

function worldToScreen(x, y) { return { x: isoSX(x, y), y: isoSY(x, y) }; }
