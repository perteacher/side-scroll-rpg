// 현재 존의 몹/NPC/워프/발판을 관리한다. 존은 exits로 여러 갈래와 이어진다.
const WARP_WIDTH = 56;
const WARP_HEIGHT = 56;

function findZoneIndex(zoneId) { return ZONE_DATA.findIndex((z) => z.id === zoneId); }

class ZoneManager {
  constructor(logFn) {
    this.log = logFn;
    this.index = 0;
    this.enemies = [];
    this.recruitNpcs = [];
    this.storyNpcs = [];
    this.shopNpc = null;
    this.questBoard = null;
    this.platforms = [];
    this.warps = [];
    this.map = null;
    this.def = null;
    this._load(0, false);
  }

  _load(index, announce = true) {
    this.index = index;
    this.def = ZONE_DATA[index];
    // 쿼터뷰: 존마다 바닥 타일맵을 만들고 그 위에 배치한다.
    this.map = new TileMap(this.def);
    setActiveMap(this.map); // 높이 판정에 쓰는 현재 지도
    this.platforms = [];
    // 몹 레벨은 존 권장 레벨을 따른다(몹 정의가 직접 들고 있으면 그쪽이 우선).
    this.enemies = (this.def.enemies || []).map((e) => new Enemy({ level: this.def.level, ...e }, this.map));
    // 마을은 배치 설계에서 정한 자리(광장·집 앞)에 사람을 세운다. 사냥터는 예전처럼 x 위치를 따른다.
    const spots = this.map.npcSpots || { plaza: [], houses: [] };
    const at = (def, list) => (list.length ? { ...def, ...list.shift() } : def);
    this.shopNpc = this.def.shopNpc ? new ShopNpc(at(this.def.shopNpc, spots.plaza), this.map) : null;
    this.questBoard = this.def.questBoard ? new QuestBoard(at(this.def.questBoard, spots.plaza), this.map) : null;
    this.storyNpcs = (this.def.storyNpcs || []).map((n) => new StoryNpc(at(n, spots.plaza), this.map));
    this.recruitNpcs = (this.def.recruits || []).map((r) => new RecruitNpc(at(r, spots.houses), this.map));
    this.warps = this._buildWarps();
    this.ropes = [];
    if (announce) this.log(`${this.def.name} 도착. (권장 Lv.${this.def.level})`, 'system');
  }

  _buildWarps() {
    return (this.def.exits || []).map((exit) => {
      const targetIndex = findZoneIndex(exit.to);
      const target = ZONE_DATA[targetIndex];
      // 워프는 길 위의 빈 칸에 놓는다.
      const spot = this.map.nearestFree(
        clamp(exit.x, TILE * 2, this.map.w - TILE * 2), (ROAD_ROW_FROM + 1) * TILE + TILE / 2,
      );
      return {
        x: spot.x - WARP_WIDTH / 2, y: spot.y - WARP_HEIGHT / 2, width: WARP_WIDTH, height: WARP_HEIGHT,
        targetIndex, label: target.name, type: target.type, level: target.level,
      };
    });
  }

  // 도착한 존에서 방금 지나온 존으로 되돌아가는 워프을 찾아, 그 옆 안쪽에 내려놓는다.
  entryXFrom(fromZoneId) {
    const back = (this.def.exits || []).find((e) => e.to === fromZoneId);
    if (!back) return 140;
    const inward = back.x < this.def.width / 2 ? 170 : -190;
    return clamp(back.x + inward, 80, this.def.width - 200);
  }

  travelTo(index) {
    if (index === this.index) return false;
    this._load(index);
    return true;
  }

  get width() { return this.map ? this.map.w : this.def.width; }
  get depth() { return this.map ? this.map.h : 0; }
  get groundColor() { return this.def.groundColor; }
  get isTown() { return this.def.type === 'town'; }
  get name() { return this.def.name; }

  update(dt) {
    let hasDeadSummon = false;
    this.enemies.forEach((e) => {
      if (e.alive) return;
      if (e.summoned) { hasDeadSummon = true; return; } // 소환된 잡몹은 부활하지 않는다
      if (this.def.noRespawn) return; // 심연의 탑: 다 잡으면 층이 끝나야 한다
      e.respawnTimer -= dt;
      if (e.respawnTimer <= 0) e.respawn();
    });
    if (hasDeadSummon) this.enemies = this.enemies.filter((e) => e.alive || !e.summoned);
  }
}
