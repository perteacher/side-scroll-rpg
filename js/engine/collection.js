// 몬스터 컬렉션 진행. 처치 수를 이름별로 세고, 단계가 오르면 계정 스탯과 마일스톤 보너스를 다시 계산한다.
class CollectionManager {
  constructor(logFn) {
    this.log = logFn;
    this.entries = buildCollectionEntries();
    this.byName = new Map(this.entries.map((e) => [e.name, e]));
    this.kills = {};
    this.bonus = { ...EMPTY_FAMILY_BONUS };
    this._reached = 0;
    this.recompute();
  }

  thresholds(entry) { return COLLECTION_STAGES.map((s) => (entry.boss ? s.boss : s.normal)); }

  stageOf(entry) {
    const n = this.kills[entry.name] || 0;
    return this.thresholds(entry).filter((t) => n >= t).length;
  }

  get registeredCount() { return this.entries.filter((e) => this.stageOf(e) > 0).length; }

  milestoneTarget(m) { return m.count === 'all' ? this.entries.length : m.count; }

  // 단계가 올랐으면 true (계정 스탯이 바뀌었으니 호출한 쪽이 캐릭터 최대 HP 등을 다시 잰다)
  onKill(enemy) {
    if (enemy.summoned) return false;
    const entry = this.byName.get(enemy.name);
    if (!entry) return false;
    const before = this.stageOf(entry);
    this.kills[entry.name] = (this.kills[entry.name] || 0) + 1;
    const after = this.stageOf(entry);
    if (after === before) return false;

    const stat = STAT_LABEL[COLLECTION_RACE_STAT[entry.race] || 'str'];
    this.log(`[몬스터 컬렉션] ${entry.name} ${COLLECTION_STAGES[after - 1].name}! 계정 전체 ${stat} +1`, 'party');
    const reachedBefore = this._reached;
    this.recompute();
    if (this._reached > reachedBefore) {
      const m = COLLECTION_MILESTONES[this._reached - 1];
      this.log(`[컬렉션 마일스톤] ${this.registeredCount}종 등록 — ${bonusText(m.bonus)}`, 'party');
    }
    return true;
  }

  recompute() {
    const flat = {};
    this.entries.forEach((e) => {
      const stage = this.stageOf(e);
      if (!stage) return;
      const k = COLLECTION_RACE_STAT[e.race] || 'str';
      flat[k] = (flat[k] || 0) + stage;
    });
    ACCOUNT_FLAT_STATS = flat;
    ACCOUNT_STAT_VERSION += 1;
    const reached = COLLECTION_MILESTONES.filter((m) => this.registeredCount >= this.milestoneTarget(m));
    this._reached = reached.length;
    this.bonus = mergeBonuses(...reached.map((m) => m.bonus));
  }

  serialize() { return { kills: { ...this.kills } }; }

  restore(data) {
    this.kills = (data && data.kills) || {};
    this.recompute();
  }
}
