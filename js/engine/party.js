// 파티(최대 3) + 병영 관리. 시작 시 로스터는 비어 있고, 플레이어가 만든 캐릭터 1명으로 시작한다.
const MAX_PARTY = 3;
const MAX_PLAYER_CHARS = 3; // 직접 만든 기본 클래스 캐릭터 보유 상한

class PartyManager {
  constructor(logFn) {
    this.log = logFn;
    this.gold = 500;
    this.units = new Map(); // unitId -> PartyUnit
    this.partyIds = [];
    this.activeIndex = 0;
    this.items = new Map(); // itemId -> 개수 (재료/소모품)
    this.gear = []; // 미장착 장비 인스턴스
  }

  // 골드 획득은 전부 여기를 거친다(플레이 기록 집계용).
  addGold(amount) {
    if (amount <= 0) return;
    this.gold += amount;
    if (this.stats) this.stats.goldEarned += amount;
  }

  // ---------- 장비 보관 ----------
  addGear(itemId) {
    const gear = new Gear(itemId);
    this.gear.push(gear);
    return gear;
  }

  findGear(uid) {
    return this.gear.find((g) => g.uid === Number(uid))
      || [...this.units.values()].flatMap((u) => u.allGear()).find((g) => g.uid === Number(uid));
  }

  takeGear(uid) {
    const idx = this.gear.findIndex((g) => g.uid === Number(uid));
    if (idx < 0) return null;
    return this.gear.splice(idx, 1)[0];
  }

  sellGear(uid) {
    const gear = this.takeGear(uid);
    if (!gear) return 0;
    this.addGold(gear.sellPrice);
    this.log(`${gear.displayName} 판매 (+${gear.sellPrice}G)`, 'system');
    return gear.sellPrice;
  }

  _payCost(cost) {
    if (this.gold < cost.gold) return false;
    if (!cost.materials.every((m) => this.itemCount(m.id) >= m.count)) return false;
    this.gold -= cost.gold;
    cost.materials.forEach((m) => this.removeItem(m.id, m.count));
    return true;
  }

  canAfford(cost) {
    return this.gold >= cost.gold && cost.materials.every((m) => this.itemCount(m.id) >= m.count);
  }

  // ---------- 스타포스 ----------
  // catchStar: 스타캐치 성공 여부, protect: 파괴 방지(12~16성, 비용 2배)
  // result: success / keep(실패·유지) / drop(실패·하락) / destroy(파괴)
  starforceGear(gear, { catchStar = false, protect = false } = {}) {
    if (gear.star >= gear.maxStar) return { ok: false, reason: 'max' };
    const from = gear.star;
    const useProtect = protect && canProtectStar(from);
    const cost = starforceCost(gear.item, from, useProtect);
    if (!this._payCost(cost)) return { ok: false, reason: 'cost' };

    const chanceTime = gear.failStreak >= 2;
    const success = chanceTime ? 1 : Math.min(1, starforceSuccessRate(from) * (catchStar ? STARCATCH_BONUS : 1));
    const destroy = chanceTime || useProtect ? 0 : starforceDestroyRate(from);
    const roll = Math.random();
    let result;
    if (roll < success) {
      gear.star += 1;
      gear.failStreak = 0;
      result = 'success';
      this.log(`[스타포스 성공] ${gear.item.name} ★${from} → ★${gear.star}${chanceTime ? ' (찬스 타임)' : ''}`, 'system');
    } else if (roll < success + destroy) {
      result = 'destroy';
      this.removeGearEverywhere(gear);
      (TIER_MATERIALS[gear.tier] || []).forEach((id) => this.addItem(id, 2));
      this.log(`[스타포스 파괴] ${gear.item.name} ★${from} 장비가 파괴되었습니다. 재료 일부를 돌려받았습니다.`, 'system');
    } else if (starDropsOnFail(from)) {
      gear.star -= 1;
      gear.failStreak += 1;
      result = 'drop';
      this.log(`[스타포스 실패] ${gear.item.name} ★${from} → ★${gear.star}${gear.failStreak >= 2 ? ' — 다음 강화는 찬스 타임(100% 성공)' : ''}`, 'system');
    } else {
      gear.failStreak = 0;
      result = 'keep';
      this.log(`[스타포스 실패] ${gear.item.name} ★${from} 유지`, 'system');
    }
    this.units.forEach((u) => u.invalidateStats());
    return { ok: true, result, from, to: gear.star, caught: catchStar };
  }

  // 보관함이든 착용 중이든(무기 세트 포함) 그 장비를 없앤다.
  removeGearEverywhere(gear) {
    const idx = this.gear.indexOf(gear);
    if (idx >= 0) { this.gear.splice(idx, 1); return true; }
    for (const u of this.units.values()) {
      for (const slot of EQUIP_SLOTS) {
        if (!WEAPON_SLOTS.includes(slot) && u.equipment[slot] === gear) { u.unequip(slot); return true; }
      }
      for (let s = 0; s < u.weaponSets.length; s++) {
        const j = u.weaponSets[s].indexOf(gear);
        if (j >= 0) { u.removeWeapon(s, j); return true; }
      }
    }
    return false;
  }

  // ---------- 잠재능력(큐브) ----------
  useCube(gear, cubeId) {
    const cube = CUBES[cubeId];
    if (!cube || this.itemCount(cubeId) < 1) return { ok: false, reason: 'none' };
    // 큐브 한계보다 높은 등급에는 쓸 수 없다(레전드리에 수상한 큐브 등).
    if (gear.potential && gear.potential.grade > cube.maxGrade) return { ok: false, reason: 'grade' };
    this.removeItem(cubeId, 1);
    const before = gear.potential ? gear.potential.grade : 0;
    let grade = Math.max(1, before);
    if (before > 0 && grade < cube.maxGrade && Math.random() < (cube.upChance[grade] || 0)) grade += 1;
    gear.potential = rollPotential(gear, grade);
    this.units.forEach((u) => u.invalidateStats());
    const gradeName = POTENTIAL_GRADES[grade].name;
    if (before === 0) this.log(`[잠재능력] ${gear.item.name} — ${gradeName} 잠재능력이 열렸습니다.`, 'system');
    else if (grade > before) this.log(`[잠재능력 등급 상승] ${gear.item.name} → ${gradeName}!`, 'system');
    else this.log(`[잠재능력 재설정] ${gear.item.name} (${gradeName})`, 'system');
    return { ok: true, before, grade, gradeUp: before > 0 && grade > before };
  }

  // ---------- 링크 스킬 ----------
  // 보유 캐릭터마다 특성별로 가장 높은 링크 레벨만 모은다.
  linkSkills() {
    const best = new Map();
    this.units.forEach((u) => {
      const entry = SIGNATURE_DATA[u.defId];
      const lv = linkLevelOf(u.level);
      if (!entry || !lv) return;
      const cur = best.get(entry.traitId);
      if (!cur || lv > cur.level) best.set(entry.traitId, { traitId: entry.traitId, level: lv, unit: u });
    });
    return [...best.values()];
  }

  linkBonus() {
    return mergeBonuses(...this.linkSkills().map((l) => linkBonusOf(l.traitId, l.level)));
  }

  // ---------- 인벤토리 ----------
  itemCount(itemId) { return this.items.get(itemId) || 0; }

  addItem(itemId, count = 1) {
    this.items.set(itemId, this.itemCount(itemId) + count);
  }

  removeItem(itemId, count = 1) {
    if (this.itemCount(itemId) < count) return false;
    const left = this.itemCount(itemId) - count;
    if (left > 0) this.items.set(itemId, left); else this.items.delete(itemId);
    return true;
  }

  sellItem(itemId, count = 1) {
    const def = ITEM_DATA[itemId];
    if (!def || !this.removeItem(itemId, count)) return 0;
    const gain = def.price * count;
    this.addGold(gain);
    this.log(`${def.name} ${count}개 판매 (+${gain}G)`, 'system');
    return gain;
  }

  buyItem(itemId, count = 1) {
    const def = ITEM_DATA[itemId];
    const cost = (def.buyPrice || def.price) * count;
    if (this.gold < cost) return false;
    this.gold -= cost;
    this.addItem(itemId, count);
    this.log(`${def.name} ${count}개 구매 (-${cost}G)`, 'system');
    return true;
  }

  // 물약 사용: 쓰러진 캐릭터에게는 쓸 수 없다(마을에서 회복).
  useConsumable(itemId, unit) {
    const def = ITEM_DATA[itemId];
    if (!def || !def.consumable || !unit || unit.downed) return false;
    if (this.itemCount(itemId) < 1) return false;
    if (def.consumable === 'exp') {
      // 승급 카드는 해당 등급에 도달한 캐릭터에게만 쓸 수 있다.
      if (def.minTier) {
        const tier = levelTier(unit.level).tier;
        const order = ['veteran', 'expert', 'master'];
        if (!tier || order.indexOf(tier.id) < order.indexOf(def.minTier)) {
          this.log(`${def.name}는 ${LEVEL_TIERS.find((t) => t.id === def.minTier).name} 이상만 사용할 수 있습니다.`, 'system');
          return false;
        }
      }
      if (unit.level >= MAX_LEVEL) { this.log(`${unit.name}(은/는) 이미 최고 레벨입니다.`, 'system'); return false; }
      unit.gainXp(def.amount, (t, tag) => this.log(t, tag));
      this.log(`${unit.name} ${def.name} 사용 (+${def.amount.toLocaleString()} EXP)`, 'system');
      this.removeItem(itemId, 1);
      return true;
    }
    if (def.consumable === 'stanceExp') {
      unit.gainStanceXp(def.amount, (t, tag) => this.log(t, tag));
      this.log(`${unit.name} ${def.name} 사용 (+${def.amount.toLocaleString()} 스탠스 EXP)`, 'system');
      this.removeItem(itemId, 1);
      return true;
    }
    if (def.consumable === 'hp') {
      if (unit.hp >= unit.maxHp) return false;
      const amount = Math.round(unit.maxHp * def.power);
      unit.hp = clamp(unit.hp + amount, 0, unit.maxHp);
      if (EFFECTS) EFFECTS.damage(unit.x + unit.width / 2, unit.y - 4, amount, { text: `+${amount}`, color: '#2ecc71' });
      this.log(`${unit.name} ${def.name} 사용 (+${amount} HP)`, 'system');
    } else {
      if (unit.mp >= unit.maxMp) return false;
      const amount = Math.round(unit.maxMp * def.power);
      unit.mp = clamp(unit.mp + amount, 0, unit.maxMp);
      if (EFFECTS) EFFECTS.damage(unit.x + unit.width / 2, unit.y - 4, amount, { text: `+${amount}`, color: '#5dade2' });
      this.log(`${unit.name} ${def.name} 사용 (+${amount} MP)`, 'system');
    }
    this.removeItem(itemId, 1);
    return true;
  }

  canCraft(recipe) {
    if (this.gold < recipe.gold) return false;
    return recipe.materials.every((m) => this.itemCount(m.id) >= m.count);
  }

  craft(recipe) {
    if (!this.canCraft(recipe)) return false;
    recipe.materials.forEach((m) => this.removeItem(m.id, m.count));
    this.gold -= recipe.gold;
    if (ITEM_DATA[recipe.result].slot) this.addGear(recipe.result);
    else this.addItem(recipe.result, 1);
    this.log(`[제작] ${ITEM_DATA[recipe.result].name} 완성!`, 'system');
    return true;
  }

  // 시작 시 3명 생성. 같은 클래스 중복 가능, 모두 Lv.1로 시작한다.
  createPlayerParty(specs) {
    specs.slice(0, MAX_PLAYER_CHARS).forEach((spec, i) => {
      this.createPlayerCharacter(spec.classId, spec.nickname, i === 0 ? 'off' : 'keep');
    });
    this.activeIndex = 0;
  }

  get playerCharacters() { return [...this.units.values()].filter((u) => u.isPlayerCreated); }

  // 파티 구성에 따른 시너지를 계산해 파티원 전원에게 적용한다.
  recomputeSynergies() {
    const units = this.partyUnits;
    const active = SYNERGY_DATA.filter((s) => s.check(units));
    const total = { atkPct: 0, defPct: 0, crit: 0, hpPct: 0 };
    active.forEach((s) => {
      Object.entries(s.buff).forEach(([k, v]) => { total[k] += v; });
    });
    this.activeSynergies = active;
    this.units.forEach((u) => { u.synergy = EMPTY_SYNERGY; });
    units.forEach((u) => {
      u.synergy = total;
      const newMax = u._calcMaxHp();
      if (newMax !== u.maxHp) {
        u.hp = clamp(u.hp * (newMax / u.maxHp), 1, newMax);
        u.maxHp = newMax;
      }
    });
    return active;
  }

  // 기본 클래스 캐릭터는 최대 3명까지만 보유할 수 있다.
  createPlayerCharacter(classId, nickname, autoMode = 'keep') {
    if (this.playerCharacters.length >= MAX_PLAYER_CHARS) return null;
    const classDef = CLASS_DATA.find((c) => c.id === classId);
    if (!classDef) return null;
    const id = `player_${nextUid()}`;
    const unit = new PartyUnit(classDef, { nickname, autoMode });
    unit.id = id;
    this.units.set(id, unit);
    if (this.partyIds.length < MAX_PARTY) this.partyIds.push(id);
    this.log(`${nickname}(${classDef.name} Lv.1) 생성.`, 'system');
    return unit;
  }

  // 해고: 장착 장비는 보관함으로 돌려받는다.
  dismiss(unitId) {
    const unit = this.units.get(unitId);
    if (!unit) return false;
    // 등록해둔 무기 세트까지 전부 회수한다.
    unit.allGear().forEach((gear) => this.gear.push(gear));
    EQUIP_SLOTS.forEach((slot) => { unit.equipment[slot] = null; });
    unit.weaponSets.forEach((pair) => { pair[0] = null; pair[1] = null; });
    this.units.delete(unitId);
    const idx = this.partyIds.indexOf(unitId);
    if (idx >= 0) this.partyIds.splice(idx, 1);
    if (this.activeIndex >= this.partyIds.length) this.activeIndex = Math.max(0, this.partyIds.length - 1);
    this.log(`${unit.name}(을/를) 내보냈습니다. 장착 장비는 보관함으로 돌아갑니다.`, 'system');
    return true;
  }

  recruit(charId) {
    if (this.units.has(charId)) return null;
    const def = CHARACTER_DATA.find((c) => c.id === charId);
    // 영입 캐릭터도 Lv.1로 합류한다.
    const unit = new PartyUnit(def, { autoMode: 'keep' });
    this.units.set(charId, unit);
    if (this.partyIds.length < MAX_PARTY) this.partyIds.push(charId);
    return unit;
  }

  get partyUnits() { return this.partyIds.map((id) => this.units.get(id)).filter(Boolean); }
  get activeUnit() { return this.units.get(this.partyIds[this.activeIndex]); }
  get barracksIds() { return [...this.units.keys()].filter((id) => !this.partyIds.includes(id)); }

  cycleActive() {
    if (this.partyIds.length === 0) return;
    this.activeIndex = (this.activeIndex + 1) % this.partyIds.length;
    this.log(`${this.activeUnit.name}(으)로 조작 캐릭터 전환.`, 'system');
  }

  setAutoMode(unitId, mode) {
    const unit = this.units.get(unitId);
    if (!unit || !AUTO_MODES.includes(mode)) return;
    unit.autoMode = mode;
    this.log(`${unit.name} 자동전투: ${AUTO_MODE_LABEL[mode]}`, 'system');
  }

  swapIn(barracksCharId, slotIndex) {
    if (this.partyIds.includes(barracksCharId)) return;
    const incomingUnit = this.units.get(barracksCharId);
    if (!incomingUnit) return;
    const near = this.activeUnit;
    if (near) {
      incomingUnit.x = near.x - 40 + Math.random() * 80;
      incomingUnit.y = GROUND_Y - incomingUnit.height;
    }
    if (slotIndex >= this.partyIds.length) {
      this.partyIds.push(barracksCharId);
      this.log(`${incomingUnit.name}(을/를) 파티에 합류시켰습니다.`, 'system');
      return;
    }
    const outgoingUnit = this.units.get(this.partyIds[slotIndex]);
    this.partyIds[slotIndex] = barracksCharId;
    this.log(`${outgoingUnit.name} → 병영, ${incomingUnit.name} → 파티 투입.`, 'system');
  }
}
