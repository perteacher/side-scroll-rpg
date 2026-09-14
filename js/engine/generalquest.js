// 일반 퀘스트 진행 관리. 마을 게시판에서 수주하고, 완료 후 게시판에서 보상을 받는다.
// 반복 수행이 가능하며 완료 횟수를 기록한다.
const MAX_ACTIVE_GENERAL = 5;

class GeneralQuestManager {
  constructor(logFn, partyManager) {
    this.log = logFn;
    this.pm = partyManager;
    this.active = [];   // [{id, stepIndex, huntCount}]
    this.cleared = {};  // id -> 완료 횟수
  }

  def(id) { return GENERAL_QUEST_DATA.find((q) => q.id === id); }
  find(id) { return this.active.find((q) => q.id === id); }
  isActive(id) { return !!this.find(id); }
  clearCount(id) { return this.cleared[id] || 0; }

  availableIn(townId, partyLevel) {
    return GENERAL_QUEST_DATA.filter((q) => q.town === townId && partyLevel >= q.minLevel);
  }

  currentStep(quest) { return this.def(quest.id).steps[quest.stepIndex] || null; }
  isReady(quest) { return quest.stepIndex >= this.def(quest.id).steps.length; }

  stepText(quest) {
    const s = this.currentStep(quest);
    if (!s) return '완료 — 게시판에서 보상 수령';
    if (s.type === 'hunt') return `${s.text} (${quest.huntCount}/${s.count})`;
    return `${s.text} (${this.pm.itemCount(s.itemId)}/${s.count})`;
  }

  accept(id) {
    if (this.isActive(id)) return false;
    if (this.active.length >= MAX_ACTIVE_GENERAL) {
      this.log(`일반 퀘스트는 동시에 ${MAX_ACTIVE_GENERAL}개까지만 수주할 수 있습니다.`, 'system');
      return false;
    }
    const def = this.def(id);
    if (!def) return false;
    this.active.push({ id, stepIndex: 0, huntCount: 0 });
    this._skipSatisfied(this.find(id));
    this.log(`[일반 퀘스트 수주] ${def.title} — ${this.stepText(this.find(id))}`, 'npc');
    return true;
  }

  abandon(id) {
    if (!this.isActive(id)) return false;
    this.active = this.active.filter((q) => q.id !== id);
    this.log(`[일반 퀘스트 포기] ${this.def(id).title}`, 'npc');
    return true;
  }

  onKill(zoneId, enemyName) {
    this.active.forEach((q) => {
      const s = this.currentStep(q);
      if (!s || s.type !== 'hunt' || s.zoneId !== zoneId) return;
      if (s.enemyName && s.enemyName !== enemyName) return;
      q.huntCount += 1;
      if (q.huntCount >= s.count) this._advance(q);
    });
  }

  checkItemSteps() {
    this.active.forEach((q) => {
      const s = this.currentStep(q);
      if (!s || s.type !== 'collect') return;
      if (this.pm.itemCount(s.itemId) >= s.count) this._advance(q);
    });
  }

  // 납품 단계는 게시판에서 직접 제출한다(재료를 소모).
  tryDeliver(id) {
    const quest = this.find(id);
    const s = quest && this.currentStep(quest);
    if (!s || s.type !== 'deliver') return false;
    if (!this.pm.removeItem(s.itemId, s.count)) return false;
    this._advance(quest);
    return true;
  }

  _skipSatisfied(quest) {
    while (!this.isReady(quest)) {
      const s = this.currentStep(quest);
      if (s.type !== 'collect' || this.pm.itemCount(s.itemId) < s.count) break;
      quest.stepIndex += 1;
      quest.huntCount = 0;
    }
  }

  _advance(quest) {
    quest.stepIndex += 1;
    quest.huntCount = 0;
    this._skipSatisfied(quest);
    const def = this.def(quest.id);
    if (this.isReady(quest)) {
      this.log(`[일반 퀘스트] ${def.title} — 완료! 게시판에서 보상을 받으세요.`, 'npc');
      return;
    }
    this.log(`[일반 퀘스트] ${def.title} — 다음: ${this.stepText(quest)}`, 'npc');
  }

  // 보상 수령. 성공하면 지급 내역을 돌려준다.
  claim(id) {
    const quest = this.find(id);
    if (!quest || !this.isReady(quest)) return null;
    const def = this.def(id);
    this.active = this.active.filter((q) => q.id !== id);
    this.cleared[id] = this.clearCount(id) + 1;
    this.pm.gold += def.reward.gold;
    def.reward.items.forEach((it) => this.pm.addItem(it.id, it.count));
    const itemText = def.reward.items.map((it) => `${ITEM_DATA[it.id].name} x${it.count}`).join(', ');
    this.log(`[보상] ${def.title} — ${def.reward.gold.toLocaleString()}G, ${itemText}`, 'npc');
    return def.reward;
  }
}
