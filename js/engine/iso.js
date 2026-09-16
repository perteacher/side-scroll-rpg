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
    this.npcSpots = { plaza: [], houses: [] }; // 마을에서 NPC를 세울 자리
    this._build(def);
  }

  idx(c, r) { return r * this.cols + c; }
  inside(c, r) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows; }

  _prop(c, r, shape, scale, block = true) {
    if (!this.inside(c, r) || !SCENERY_SHAPES[shape]) return;
    this.props.push({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, shape, scale });
    if (block) this.blocked[this.idx(c, r)] = 1;
  }

  _spot(kind, c, r) {
    if (!this.inside(c, r)) return;
    this.npcSpots[kind].push({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2 });
  }

  _build(def) {
    // 타일 무늬와 바깥 테두리
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const i = this.idx(c, r);
        this.variant[i] = hashStr(`${def.id}:${c}:${r}`) % TILE_VARIANTS;
        if (c < 1 || r < 1 || c >= this.cols - 1 || r >= this.rows - 1) this.blocked[i] = 1;
      }
    }
    if (def.type === 'town') this._buildTown(def); else this._buildField(def);
  }

  // 사냥터: 가운데 오솔길 + 테마 장식이 흩어진 들판
  _buildField(def) {
    const propList = ISO_PROPS[(THEME_DATA[def.theme] || DEFAULT_THEME).decor] || ISO_PROPS.trees;
    for (let r = 1; r < this.rows - 1; r++) {
      for (let c = 1; c < this.cols - 1; c++) {
        const i = this.idx(c, r);
        const h = hashStr(`${def.id}:p:${c}:${r}`);
        if (r >= ROAD_ROW_FROM && r <= ROAD_ROW_TO) { this.road[i] = 1; continue; }
        // 길에서 멀수록 장식이 잘 선다. 장식이 선 칸은 못 지나간다.
        const away = Math.min(Math.abs(r - ROAD_ROW_FROM), Math.abs(r - ROAD_ROW_TO));
        if (h % 100 < 4 + away * 2) {
          const p = propList[(h >>> 7) % propList.length];
          this._prop(c, r, p.shape, p.scale);
        }
      }
    }
  }

  // 마을: 큰길 + 가운데 광장(우물·좌판·표지판) + 길 양쪽 집 줄. NPC 자리도 여기서 정한다.
  _buildTown(def) {
    const style = TOWN_STYLE[def.theme] || TOWN_STYLE.town_forest;
    const plazaC = Math.floor(this.cols / 2);

    // 큰길이 마을을 가로지른다
    for (let r = ROAD_ROW_FROM; r <= ROAD_ROW_TO; r++) {
      for (let c = 1; c < this.cols - 1; c++) this.road[this.idx(c, r)] = 1;
    }
    // 광장은 가운데를 위아래로 넓힌 자리
    for (let r = ROAD_ROW_FROM - 4; r <= ROAD_ROW_TO + 4; r++) {
      for (let c = plazaC - 6; c <= plazaC + 6; c++) {
        if (this.inside(c, r)) this.road[this.idx(c, r)] = 1;
      }
    }

    // 광장 가구
    this._prop(plazaC, ROAD_ROW_FROM - 2, 'well', 3);
    this._prop(plazaC - 5, ROAD_ROW_FROM - 3, 'signpost', 2);
    this._prop(plazaC - 3, ROAD_ROW_TO + 3, 'stall', 3);
    this._prop(plazaC + 3, ROAD_ROW_FROM - 3, 'stall', 3);
    this._prop(plazaC - 4, ROAD_ROW_TO + 2, 'barrel', 2);
    this._prop(plazaC + 5, ROAD_ROW_TO + 2, 'crate', 2);

    // 광장 NPC 자리(상점·게시판·시나리오 NPC가 여기 선다)
    [[plazaC - 3, ROAD_ROW_TO + 2], [plazaC + 3, ROAD_ROW_FROM - 2], [plazaC - 1, ROAD_ROW_TO + 3],
      [plazaC + 1, ROAD_ROW_FROM - 4], [plazaC + 5, ROAD_ROW_TO + 3], [plazaC - 6, ROAD_ROW_TO + 3]]
      .forEach(([c, r]) => this._spot('plaza', c, r));

    // 길 양쪽으로 집을 줄 세우고, 집 앞(길 쪽)을 NPC 자리로 둔다
    for (let c = 3; c < this.cols - 4; c += 7) {
      if (Math.abs(c - plazaC) <= 7) continue;
      this._prop(c, ROAD_ROW_FROM - 3, style.house, 4);
      this._spot('houses', c, ROAD_ROW_FROM - 1);
      this._prop(c + 3, ROAD_ROW_TO + 3, style.house, 4);
      this._spot('houses', c + 3, ROAD_ROW_TO + 1);
      this._prop(c + 5, ROAD_ROW_FROM - 2, 'fence', 2);
      this._prop(c + 1, ROAD_ROW_TO + 2, 'fence', 2);
    }

    // 가로등은 길가에 세우되 길을 막지 않는다
    for (let c = 4; c < this.cols - 2; c += 9) {
      this._prop(c, ROAD_ROW_FROM - 1, 'lamp', 2, false);
      this._prop(c + 4, ROAD_ROW_TO + 1, 'lamp', 2, false);
    }

    // 마을 바깥 줄 장식
    for (let c = 2; c < this.cols - 2; c += 2) {
      const h = hashStr(`${def.id}:o:${c}`);
      if (h % 3 === 0) this._prop(c, 1 + (h % 2), style.extra, 3);
      if ((h >>> 5) % 3 === 0) this._prop(c + 1, this.rows - 2 - ((h >>> 3) % 2), style.extra, 3);
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

// 이동 방향으로 스프라이트 방향을 정한다. 화면 오른쪽인지(facing)와 등을 보이는지(facingBack).
function setFacing(e, dx, dy) {
  if (!dx && !dy) return;
  e.facing = isoSX(dx, dy) >= 0 ? 1 : -1;
  e.facingBack = (dx + dy) < 0;
}
