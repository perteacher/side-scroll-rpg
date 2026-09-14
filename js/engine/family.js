// 가문: 계정 단위 성장. 캐릭터가 레벨업하면 가문 경험치가 쌓이고,
// 가문 레벨 1당 특성 포인트 1개를 받아 트리에 투자한다. 효과는 전 캐릭터에 적용된다.
class FamilyManager {
  constructor(logFn) {
    this.log = logFn;
    this.level = 1;
    this.xp = 0;
    this.allocations = {}; // traitId -> 투자 포인트
    FAMILY_TRAITS.forEach((t) => { this.allocations[t.id] = 0; });
  }

  get totalPoints() { return this.level; }
  get spentPoints() { return Object.values(this.allocations).reduce((s, v) => s + v, 0); }
  get freePoints() { return this.totalPoints - this.spentPoints; }

  pointsInTier(tier) {
    return FAMILY_TRAITS
      .filter((t) => t.tier === tier)
      .reduce((s, t) => s + this.allocations[t.id], 0);
  }

  // 원본 규칙: 윗 단계 투자량 + 가문 레벨 조건을 둘 다 만족해야 열린다.
  isUnlocked(trait) {
    if (this.level < trait.reqFamilyLevel) return false;
    if (trait.tier === 1) return true;
    return this.pointsInTier(trait.tier - 1) >= trait.reqPrevTierPoints;
  }

  lockReason(trait) {
    if (this.level < trait.reqFamilyLevel) return `가문 Lv.${trait.reqFamilyLevel} 필요`;
    if (trait.tier > 1) {
      const have = this.pointsInTier(trait.tier - 1);
      if (have < trait.reqPrevTierPoints) {
        return `${trait.tier - 1}단계에 ${trait.reqPrevTierPoints}포인트 필요 (현재 ${have})`;
      }
    }
    return '';
  }

  canInvest(trait) {
    return this.freePoints > 0
      && this.isUnlocked(trait)
      && this.allocations[trait.id] < trait.max;
  }

  invest(traitId) {
    const trait = FAMILY_TRAITS.find((t) => t.id === traitId);
    if (!trait || !this.canInvest(trait)) return false;
    this.allocations[traitId] += 1;
    return true;
  }

  // 회수: 하위 단계를 빼서 상위 단계 조건이 깨지면 그 상위 투자분도 함께 되돌린다.
  refund(traitId) {
    const trait = FAMILY_TRAITS.find((t) => t.id === traitId);
    if (!trait || this.allocations[traitId] <= 0) return false;
    this.allocations[traitId] -= 1;
    this._cascadeInvalid();
    return true;
  }

  resetAll() {
    FAMILY_TRAITS.forEach((t) => { this.allocations[t.id] = 0; });
    this.log('가문 특성 포인트를 모두 회수했습니다.', 'system');
  }

  _cascadeInvalid() {
    let changed = true;
    while (changed) {
      changed = false;
      FAMILY_TRAITS.forEach((t) => {
        if (this.allocations[t.id] > 0 && !this.isUnlocked(t)) {
          this.allocations[t.id] = 0;
          changed = true;
          this.log(`[가문] ${t.name} 조건이 풀려 포인트를 돌려받았습니다.`, 'system');
        }
      });
    }
  }

  bonus() {
    const out = { ...EMPTY_FAMILY_BONUS };
    FAMILY_TRAITS.forEach((t) => {
      const pts = this.allocations[t.id];
      if (pts > 0) out[t.stat] += t.perPoint * pts;
    });
    return out;
  }

  onCharacterLevelUp(charLevel) {
    if (this.level >= FAMILY_MAX_LEVEL) return;
    this.xp += familyXpFromCharacterLevelUp(charLevel);
    let leveled = 0;
    while (this.level < FAMILY_MAX_LEVEL && this.xp >= familyXpToNext(this.level)) {
      this.xp -= familyXpToNext(this.level);
      this.level += 1;
      leveled += 1;
    }
    if (leveled > 0) {
      this.log(`[가문] 가문 레벨 ${this.level} 달성! 특성 포인트 +${leveled}`, 'system');
    }
  }
}
