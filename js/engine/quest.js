// 영입 퀘스트: 마을 NPC에게 수락 → 여러 단계(사냥/수집/대화/납품)를 차례로 완수 → NPC에게 돌아와 영입.
class QuestManager {
  constructor(logFn, partyManager) {
    this.log = logFn;
    this.pm = partyManager;
    this.sm = null; // 시나리오 진행도(게이트 판정용). game.js가 연결한다
    this.totalKills = 0;
    this.active = []; // [{charId, charName, tier, steps, stepIndex, huntCount}]
    this.completed = new Set();
  }

  // 완료한 시나리오 챕터 수
  get clearedChapters() {
    if (!this.sm) return 99;
    return this.sm.finished ? SCENARIO_DATA.length : this.sm.chapterIndex;
  }

  // 이야기와 얽힌 인물은 그 대목을 지나야 따라나선다.
  lockReason(charId) {
    const need = recruitReqChapter(charId);
    if (!need || this.clearedChapters >= need) return null;
    const ch = SCENARIO_DATA.find((c) => c.chapter === need);
    return `시나리오 챕터 ${need} "${ch ? ch.title : ''}"을(를) 마쳐야 합니다`;
  }

  canAccept(charId) { return !this.lockReason(charId); }

  isActive(charId) { return this.active.some((q) => q.charId === charId); }
  isCompleted(charId) { return this.completed.has(charId); }
  find(charId) { return this.active.find((q) => q.charId === charId); }

  currentStep(quest) { return quest.steps[quest.stepIndex] || null; }
  isReady(quest) { return quest.stepIndex >= quest.steps.length; }

  stepText(quest) {
    const s = this.currentStep(quest);
    if (!s) return '완료 — NPC에게 돌아가기';
    if (s.type === 'hunt') return `${s.text} (${quest.huntCount}/${s.count})`;
    if (s.type === 'collect') return `${s.text} (${this.pm.itemCount(s.itemId)}/${s.count})`;
    if (s.type === 'deliver') return `${s.text} (${this.pm.itemCount(s.itemId)}/${s.count})`;
    if (s.type === 'pay') return `${s.text} (보유 ${this.pm.gold.toLocaleString()}G)`;
    return s.text;
  }

  accept(npc) {
    if (this.isActive(npc.charId) || this.isCompleted(npc.charId)) return;
    const locked = this.lockReason(npc.charId);
    if (locked) { this.log(`[영입 불가] ${npc.charDef.name} — ${locked}`, 'system'); return; }
    this.active.push({
      charId: npc.charId,
      charName: npc.charDef.name,
      tier: npc.tier,
      steps: makeRecruitSteps(npc.charId),
      stepIndex: 0,
      huntCount: 0,
    });
    const quest = this.find(npc.charId);
    this.log(`[영입 퀘스트 수락] ${npc.charDef.name} — ${this.stepText(quest)}`, 'npc');
  }

  onKill(zoneId, enemyName) {
    this.totalKills += 1;
    this.active.forEach((q) => {
      const s = this.currentStep(q);
      if (!s || s.type !== 'hunt' || s.zoneId !== zoneId) return;
      if (s.enemyName && s.enemyName !== enemyName) return;
      q.huntCount += 1;
      if (q.huntCount >= s.count) this._advance(q);
    });
  }

  // 재료 수집/제작 단계는 인벤토리 변동 때마다 확인한다.
  checkItemSteps() {
    this.active.forEach((q) => {
      const s = this.currentStep(q);
      if (!s || s.type !== 'collect') return;
      if (this.pm.itemCount(s.itemId) >= s.count) this._advance(q);
    });
  }

  // 정찰 단계: 그 사냥터에 발을 들이면 통과한다.
  onZoneEnter(zoneId) {
    this.active.forEach((q) => {
      const s = this.currentStep(q);
      if (!s || s.type !== 'reach' || s.zoneId !== zoneId) return;
      this._advance(q);
    });
  }

  // 지불 단계: 골드를 실제로 깎는다.
  tryPay(quest) {
    const s = this.currentStep(quest);
    if (!s || s.type !== 'pay') return false;
    if (!this.pm.spendGold(s.gold)) return false;
    this._advance(quest);
    return true;
  }

  onTalk(npcId) {
    let advanced = false;
    this.active.forEach((q) => {
      const s = this.currentStep(q);
      if (!s || s.type !== 'talk' || s.npcId !== npcId) return;
      this._advance(q);
      advanced = true;
    });
    return advanced;
  }

  // 납품 단계: 재료를 소모한다.
  tryDeliver(quest) {
    const s = this.currentStep(quest);
    if (!s || s.type !== 'deliver') return false;
    if (!this.pm.removeItem(s.itemId, s.count)) return false;
    this._advance(quest);
    return true;
  }

  _advance(quest) {
    quest.stepIndex += 1;
    quest.huntCount = 0;
    // 이미 재료를 갖고 있으면 수집 단계는 바로 통과시킨다.
    while (!this.isReady(quest)) {
      const next = this.currentStep(quest);
      if (next.type !== 'collect' || this.pm.itemCount(next.itemId) < next.count) break;
      quest.stepIndex += 1;
    }
    if (this.isReady(quest)) {
      this.log(`[영입 퀘스트] ${quest.charName} — 모든 단계 완료! NPC에게 돌아가세요.`, 'npc');
      return;
    }
    this.log(`[영입 퀘스트] ${quest.charName} — 다음: ${this.stepText(quest)}`, 'npc');
  }

  complete(charId) {
    const quest = this.find(charId);
    if (!quest || !this.isReady(quest)) return false;
    this.active = this.active.filter((q) => q.charId !== charId);
    this.completed.add(charId);
    this.log(`[영입 완료] ${quest.charName}(이)가 병영에 합류했습니다!`, 'npc');
    return true;
  }
}
