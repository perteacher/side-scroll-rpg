// 길잡이(튜토리얼) + 여정(장기 과제) 관리.
//
// 게임 쪽에서는 사건이 생길 때마다 notify('kill') 처럼 한 줄만 부르면 된다.
// 길잡이는 지금 단계의 목표와 맞는 사건만 세고, 여정은 그때그때 수치를 다시 읽어 진행도를 만든다.
// (여정 진행도를 따로 누적해 두지 않는 이유: 세이브가 어긋나면 영영 안 맞는다. 늘 현재 상태에서 계산한다)
class JourneyManager {
  constructor(logFn) {
    this.log = logFn;
    this.game = null;
    this.done = new Set();    // 끝낸 길잡이 단계 id
    this.counts = {};         // 단계별로 지금까지 센 횟수
    this.hidden = false;      // 안내를 껐는지(진행은 계속 센다)
    this.claimed = new Set(); // 이미 받은 여정 과제 id
    this.onCelebrate = null;  // 완료 연출을 UI에 맡긴다
  }

  attach(game) { this.game = game; }

  // ---------- 길잡이 ----------
  // 단계는 순서대로 안내하지만 판정은 순서를 따지지 않는다.
  // 안내를 안 보고 먼저 해 버린 것도 그대로 인정한다 — 순서를 강요하면
  // 자동사냥만 돌리는 사람은 1번 "움직여 보기"에 영영 묶인다.
  get tutorialDone() { return this.done.size >= TUTORIAL_STEPS.length; }

  get step() {
    if (this.hidden || this.tutorialDone) return null;
    return TUTORIAL_STEPS.find((s) => !this.done.has(s.id)) || null;
  }

  get stepIndex() {
    const s = this.step;
    return s ? TUTORIAL_STEPS.indexOf(s) : TUTORIAL_STEPS.length;
  }

  get stepCount() {
    const s = this.step;
    return s ? (this.counts[s.id] || 0) : 0;
  }

  get progressText() {
    const s = this.step;
    if (!s) return '';
    return s.goal.n > 1 ? ` (${Math.min(this.stepCount, s.goal.n)}/${s.goal.n})` : '';
  }

  skipTutorial() {
    if (this.hidden) return;
    this.hidden = true;
    this.log('[길잡이] 안내를 숨겼습니다. 진행은 계속 쌓이고, 설정(O)에서 다시 켤 수 있습니다.', 'system');
  }

  resumeTutorial() {
    if (this.tutorialDone) return false;
    this.hidden = false;
    return true;
  }

  // 사건 하나를 알린다. 아직 못 끝낸 단계 중 목표가 맞는 것을 찾아 올린다.
  notify(type, n = 1) {
    if (this.tutorialDone) return;
    TUTORIAL_STEPS.forEach((s) => {
      if (this.done.has(s.id) || s.goal.type !== type) return;
      this.counts[s.id] = (this.counts[s.id] || 0) + n;
      if (this.counts[s.id] >= s.goal.n) this._finishStep(s);
    });
  }

  _finishStep(s) {
    this.done.add(s.id);
    this._grant(s.reward);
    this.log(`[길잡이 완료] ${s.title} — ${rewardText(s.reward)}`, 'party');
    if (this.onCelebrate) this.onCelebrate('길잡이 완료', s.title, rewardText(s.reward));
    if (!this.tutorialDone) {
      const next = this.step;
      if (next) this.log(`[길잡이] 다음 — ${next.title}: ${next.desc}`, 'npc');
      return;
    }
    this._grant(TUTORIAL_FINISH_REWARD);
    this.log(`[길잡이 졸업] 기본은 다 익혔습니다! ${rewardText(TUTORIAL_FINISH_REWARD)}`, 'party');
    if (this.onCelebrate) this.onCelebrate('길잡이 졸업', '기본은 다 익혔습니다', rewardText(TUTORIAL_FINISH_REWARD));
  }

  // ---------- 여정 ----------
  // 과제 진행도는 늘 현재 게임 상태에서 계산한다.
  metrics() {
    const g = this.game;
    if (!g) return {};
    const units = [...g.pm.units.values()];
    const party = g.pm.partyUnits;
    const maxLevel = units.length ? Math.max(...units.map((u) => u.level)) : 1;
    const maxRank = units.length ? Math.max(...units.map((u) => u.rank || 0)) : 0;
    const allGear = units.flatMap((u) => u.allGear());
    // Gear의 강화 수치 필드는 star(단수)다. stars로 읽으면 늘 0이 나온다.
    const stars = allGear.length ? Math.max(0, ...allGear.map((x) => x.star || 0)) : 0;
    const gearTier = allGear.length ? Math.max(0, ...allGear.map((x) => x.tier || 1)) : 0;
    // '합계'로 재면 시작부터 차 있어 의미가 없다. 가장 많이 키운 자세 하나를 본다.
    const stanceLevel = party.reduce(
      (best, u) => Math.max(best, ...Object.values(u.stanceProgress).map((p) => p.level)), 1);
    return {
      kills: g.stats.kills,
      bossKills: g.stats.bossKills,
      level: maxLevel,
      zones: [...g.stats.zonesVisited].filter((id) => {
        const z = ZONE_DATA.find((x) => x.id === id);
        return z && z.type === 'field';
      }).length,
      recruits: g.qm.completed.size,
      chapters: g.sm.finished ? SCENARIO_DATA.length : g.sm.chapterIndex,
      tower: g.tower ? (g.tower.bestFloor || 0) : 0,
      stars,
      gearTier,
      stanceLevel,
      rank: maxRank,
    };
  }

  progressOf(task, m) {
    const cur = (m || this.metrics())[task.metric] || 0;
    return { cur, need: task.need, ratio: clamp(cur / task.need, 0, 1) };
  }

  isClaimed(id) { return this.claimed.has(id); }

  canClaim(task, m) {
    if (this.claimed.has(task.id)) return false;
    return this.progressOf(task, m).cur >= task.need;
  }

  claim(taskId) {
    const task = journeyTask(taskId);
    if (!task || !this.canClaim(task)) return false;
    this.claimed.add(taskId);
    this._grant(task.reward);
    this.log(`[여정 달성] ${task.title} — ${rewardText(task.reward)}`, 'party');
    if (this.onCelebrate) this.onCelebrate('여정 달성', task.title, rewardText(task.reward));
    return true;
  }

  // 받을 수 있는데 아직 안 받은 과제 수. 창 버튼에 빨간 점을 띄우는 데 쓴다.
  claimableCount() {
    const m = this.metrics();
    return JOURNEY_TASKS.filter((t) => this.canClaim(t, m)).length;
  }

  // 지금 매달릴 만한 과제 하나.
  //   1) 이미 다 채워서 받기만 하면 되는 게 있으면 그걸 먼저 보여준다(바로 누르게)
  //   2) 없으면 아직 안 끝난 가장 앞 장에서, 가장 많이 찬 과제를 고른다
  // 비율만으로 고르면 6장 과제가 1장보다 앞에 뜨는 일이 생겨서 순서를 먼저 본다.
  nextTask(m) {
    const mm = m || this.metrics();
    const ready = JOURNEY_TASKS.find((t) => !this.claimed.has(t.id) && this.progressOf(t, mm).ratio >= 1);
    if (ready) return ready;
    const chapter = JOURNEY_CHAPTERS.find((c) => c.tasks.some((t) => !this.claimed.has(t.id)));
    if (!chapter) return null;
    let best = null;
    let bestRatio = -1;
    chapter.tasks.forEach((t) => {
      if (this.claimed.has(t.id)) return;
      const p = this.progressOf(t, mm);
      if (p.ratio > bestRatio) { best = t; bestRatio = p.ratio; }
    });
    // 장 목록 쪽 원본에는 chapterId가 없다. 평탄화된 쪽을 돌려줘야 어느 장인지 알 수 있다.
    return best ? journeyTask(best.id) : null;
  }

  _grant(reward) {
    const g = this.game;
    if (!g || !reward) return;
    if (reward.gold) g.pm.addGold(reward.gold);
    (reward.items || []).forEach(([id, n]) => g.pm.addItem(id, n));
    const u = g.pm.activeUnit;
    if (u && g.effects) g.effects.loot(u.x + u.width / 2, u.y - 40, `+${(reward.gold || 0).toLocaleString()} G`, '#f7dc6f');
    if (g.audio) g.audio.levelUp();
    if (g.ui) g.ui.refreshOpenWindows();
  }

  serialize() {
    return { done: [...this.done], counts: this.counts, hidden: this.hidden, claimed: [...this.claimed] };
  }

  restore(data) {
    if (!data) return;
    this.counts = data.counts || {};
    this.hidden = !!data.hidden;
    this.claimed = new Set(data.claimed || []);
    if (data.done) { this.done = new Set(data.done); return; }
    // 옛 세이브(순서 기반): 거기까지 끝낸 것으로 옮긴다.
    const upto = data.tutorialDone ? TUTORIAL_STEPS.length : (data.stepIndex || 0);
    this.done = new Set(TUTORIAL_STEPS.slice(0, upto).map((s) => s.id));
  }
}
