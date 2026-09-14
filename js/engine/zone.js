// 현재 존의 몹/NPC/워프/발판을 관리한다. 존은 exits로 여러 갈래와 이어진다.
const WARP_WIDTH = 54;
const WARP_HEIGHT = 84;

function findZoneIndex(zoneId) { return ZONE_DATA.findIndex((z) => z.id === zoneId); }

// 2층(floor 2)에 놓인 대상의 y를 그 x 위치의 발판 기준으로 계산한다.
function floorYFor(def, platforms, height) {
  if (def.floor !== 2) return GROUND_Y - height;
  const p = platforms.find((pl) => def.x + 20 > pl.x && def.x < pl.x + pl.width);
  return (p ? p.y : GROUND_Y) - height;
}

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
    this.def = null;
    this._load(0, false);
  }

  _load(index, announce = true) {
    this.index = index;
    this.def = ZONE_DATA[index];
    this.platforms = this.def.platforms || [];
    // 몹 레벨은 존 권장 레벨을 따른다(몹 정의가 직접 들고 있으면 그쪽이 우선).
    this.enemies = (this.def.enemies || []).map((e) => new Enemy({ level: this.def.level, ...e }, this.platforms));
    this.recruitNpcs = (this.def.recruits || []).map((r) => new RecruitNpc(r, this.platforms));
    this.storyNpcs = (this.def.storyNpcs || []).map((n) => new StoryNpc(n, this.platforms));
    this.shopNpc = this.def.shopNpc ? new ShopNpc(this.def.shopNpc, this.platforms) : null;
    this.questBoard = this.def.questBoard ? new QuestBoard(this.def.questBoard, this.platforms) : null;
    this.warps = this._buildWarps();
    if (announce) this.log(`${this.def.name} 도착. (권장 Lv.${this.def.level})`, 'system');
  }

  _buildWarps() {
    return (this.def.exits || []).map((exit) => {
      const targetIndex = findZoneIndex(exit.to);
      const target = ZONE_DATA[targetIndex];
      return {
        x: exit.x, y: GROUND_Y - WARP_HEIGHT, width: WARP_WIDTH, height: WARP_HEIGHT,
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

  get width() { return this.def.width; }
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
