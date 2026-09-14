// 심연의 탑 진행 관리. 층을 만들고, 전멸 판정과 보상 지급 타이밍을 잡는다.
// 존 자체는 ZONE_DATA의 tower 항목 하나를 재사용하고, 층마다 내용물만 갈아 끼운다.
const TOWER_CLEAR_DELAY_MS = 1800; // 전멸 후 다음 층까지의 여유

class TowerManager {
  constructor(logFn) {
    this.log = logFn;
    this.zoneIndex = findZoneIndex(TOWER_ZONE_ID);
    this.floor = 0;
    this.bestFloor = 0;
    this.active = false;
    this.returnZoneIndex = 0;
    this.clearTimer = 0;
  }

  // 재도전할 수 있는 층 목록(1층 + 클리어한 체크포인트 층)
  get checkpoints() {
    const list = [1];
    for (let f = TOWER_CHECKPOINT; f <= this.bestFloor; f += TOWER_CHECKPOINT) list.push(f);
    return list;
  }

  canEnter(partyUnits) {
    return partyUnits.some((u) => u.level >= TOWER_ENTRY_LEVEL);
  }

  // 해당 층의 몹 배치를 존 정의에 써넣는다. 탑은 리스폰이 없어야 전멸 판정이 성립한다.
  buildFloor(floor) {
    const def = ZONE_DATA[this.zoneIndex];
    this.floor = floor;
    this.clearTimer = 0;
    def.enemies = makeTowerFloor(floor, def.width);
    def.level = Math.max(1, floor * 3);
    def.exits = [{ to: ZONE_DATA[this.returnZoneIndex].id, x: 60 }];
    return def;
  }

  start(floor, returnZoneIndex) {
    this.returnZoneIndex = returnZoneIndex;
    this.active = true;
    this.buildFloor(floor);
  }

  stop() {
    this.active = false;
    this.clearTimer = 0;
  }

  // 층을 다 비웠으면 잠깐 뒤에 다음 층으로 넘긴다. 넘어갈 때 true를 돌려준다.
  update(dt, enemies) {
    if (!this.active) return false;
    const remaining = enemies.filter((e) => e.alive).length;
    if (remaining > 0) { this.clearTimer = 0; return false; }
    if (this.clearTimer === 0) {
      this.bestFloor = Math.max(this.bestFloor, this.floor);
      this.log(`[심연의 탑] ${this.floor}층 돌파! 잠시 후 ${this.floor + 1}층으로 올라갑니다.`, 'system');
    }
    this.clearTimer += dt;
    return this.clearTimer >= TOWER_CLEAR_DELAY_MS;
  }

  get statusText() {
    if (!this.active) return `최고 기록 ${this.bestFloor}층`;
    return `${this.floor}층 도전 중 · 최고 기록 ${this.bestFloor}층`;
  }
}
