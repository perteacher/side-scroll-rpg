// 시나리오 챕터 진행 관리. 챕터 → 스텝 순서대로 진행하며, 스텝은 대화/사냥/도달 3종.
class ScenarioManager {
  constructor(logFn, partyManager) {
    this.log = logFn;
    this.pm = partyManager;
    this.chapterIndex = 0;
    this.stepIndex = 0;
    this.huntCount = 0;
    this.finished = false;
    this.onChapterComplete = null; // game.js가 보상 지급을 연결한다
  }

  get chapter() { return SCENARIO_DATA[this.chapterIndex]; }
  get step() { return this.finished ? null : this.chapter.steps[this.stepIndex]; }

  // 해당 NPC가 지금 대화해야 할 상대인지
  isStepNpc(npcId) {
    const s = this.step;
    return !!s && s.type === 'talk' && s.npcId === npcId;
  }

  objectiveText() {
    if (this.finished) return '모든 챕터를 완료했습니다.';
    const s = this.step;
    if (s.type === 'hunt') return `${s.text} (${this.huntCount}/${s.count})`;
    if ((s.type === 'collect' || s.type === 'deliver') && this.pm) {
      return `${s.text} (${this.pm.itemCount(s.itemId)}/${s.count})`;
    }
    return s.text;
  }

  // 재료 수집 단계는 인벤토리가 바뀔 때마다 확인한다.
  checkItemSteps() {
    const s = this.step;
    if (!s || s.type !== 'collect' || !this.pm) return;
    if (this.pm.itemCount(s.itemId) >= s.count) this._advance();
  }

  // 납품 단계는 NPC에게 제출할 때 재료를 소모한다.
  tryDeliver() {
    const s = this.step;
    if (!s || s.type !== 'deliver' || !this.pm) return false;
    if (!this.pm.removeItem(s.itemId, s.count)) return false;
    this._advance();
    return true;
  }

  // 대화 단계에서, 그 NPC가 납품도 받는 경우를 함께 처리한다.
  isDeliverNpc(npcId) {
    const s = this.step;
    return !!s && s.type === 'deliver' && s.npcId === npcId;
  }

  onTalk(npcId) {
    if (!this.isStepNpc(npcId)) return false;
    this._advance();
    return true;
  }

  onKill(zoneId, enemyName) {
    const s = this.step;
    if (!s || s.type !== 'hunt' || s.zoneId !== zoneId) return;
    if (s.enemyName && s.enemyName !== enemyName) return;
    this.huntCount += 1;
    if (this.huntCount >= s.count) {
      this.log(`[시나리오] 목표 달성 — ${s.text}`, 'npc');
      this._advance();
    }
  }

  onZoneEnter(zoneId) {
    const s = this.step;
    if (!s || s.type !== 'reach' || s.zoneId !== zoneId) return;
    this._advance();
  }

  _advance() {
    this.huntCount = 0;
    this.stepIndex += 1;
    // 이미 재료를 갖고 있으면 수집 단계는 건너뛴다.
    while (this.stepIndex < this.chapter.steps.length) {
      const next = this.chapter.steps[this.stepIndex];
      if (next.type !== 'collect' || !this.pm || this.pm.itemCount(next.itemId) < next.count) break;
      this.stepIndex += 1;
    }
    if (this.stepIndex < this.chapter.steps.length) {
      this.log(`[시나리오] 다음 목표 — ${this.objectiveText()}`, 'npc');
      return;
    }
    const done = this.chapter;
    this.log(`[시나리오] 챕터 ${done.chapter} "${done.title}" 완료! (골드 +${done.reward.gold})`, 'npc');
    if (this.onChapterComplete) this.onChapterComplete(done);
    this.stepIndex = 0;
    this.chapterIndex += 1;
    if (this.chapterIndex >= SCENARIO_DATA.length) {
      this.chapterIndex = SCENARIO_DATA.length - 1;
      this.finished = true;
      this.log('[시나리오] 챕터 1~5를 모두 완료했습니다.', 'npc');
      return;
    }
    this.log(`[시나리오] 챕터 ${this.chapter.chapter} "${this.chapter.title}" 시작 — ${this.chapter.intro}`, 'npc');
  }

  // 완료된 챕터의 보상(골드/경험치)
  lastReward() { return SCENARIO_DATA[Math.max(0, this.chapterIndex - 1)].reward; }
}
