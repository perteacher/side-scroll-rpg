const GRAVITY = 1400;
const GROUND_Y = 380;
const JUMP_VELOCITY = -520;

// 자동전투 모드: off(수동) / keep(이동하며 사냥) / hold(제자리에서 사거리 내만 공격)
const AUTO_MODES = ['off', 'keep', 'hold'];
const AUTO_MODE_LABEL = { off: '정지', keep: '킵', hold: '홀드' };

class PartyUnit {
  constructor(def, runtime) {
    this.id = def.id;
    this.name = runtime.nickname || def.name;
    this.className = def.name;
    this.color = def.color;
    this.stanceIds = def.stanceIds;
    this.isPlayerCreated = !!runtime.nickname;
    this.uid = nextUid();

    // 캐릭터 고유 특성(패시브)과 전용기. defId는 id가 player_N으로 덮이기 전에 붙잡아 둔다.
    this.defId = def.id;
    this.trait = traitOf(def.id);
    this.signature = signatureOf(def.id);
    this.sigCooldown = 0;
    this.buffs = []; // 전용기로 걸린 일시 강화

    this.level = runtime.level || 1;
    this.xp = runtime.xp || 0;
    this.stats = { ...def.baseStats };
    this.currentStanceIndex = 0;
    this.autoMode = runtime.autoMode || 'off';

    // 스탠스별 숙련도: 레벨/경험치/미사용 스킬포인트/스킬레벨 (맨손 포함)
    this.stanceProgress = {};
    ['bare', ...this.stanceIds].forEach((sid) => {
      this.stanceProgress[sid] = { level: 1, xp: 0, points: 1, skills: {} };
    });

    // 장비. 무기는 자기 스탠스 풀에 있는 것만, 방어구는 자기 등급만 장착할 수 있다.
    // 무기는 세트 3벌로 등록해두고 통째로 갈아끼운다(장비교체등록).
    this.armorClass = ARMOR_CLASS_BY_TYPE[def.attackType];
    this.weaponSets = [];
    for (let i = 0; i < WEAPON_SET_COUNT; i++) this.weaponSets.push([null, null]);
    this.activeSet = 0;
    this.setSwapCooldown = 0;
    this.equipment = {};
    EQUIP_SLOTS.forEach((slot) => { this.equipment[slot] = null; });
    this._bindWeaponSlots();
    this._equipStarterGear();

    this.width = 34; this.height = 52;
    this.x = 100; this.y = GROUND_Y - this.height;
    this.vx = 0; this.vy = 0; this.facing = 1; this.grounded = true;

    this.maxHp = this._calcMaxHp();
    this.hp = this.maxHp;
    this.maxMp = this._calcMaxMp();
    this.mp = this.maxMp;

    this.basicAtkCooldown = 0;
    this.skillCooldowns = {};
    this.dropTimer = 0; // >0이면 발판을 통과해 아래층으로 내려간다
    this.downed = false; // HP 0 — 전투 불능. 마을에 들어가면 회복된다.
  }

  _calcMaxHp() {
    const base = 60 + this.stats.vit * 8 + this.level * 10;
    const gearBonus = this.equipment ? this.equipmentBonus().hpPct : 0;
    const synergyBonus = (this.synergy || EMPTY_SYNERGY).hpPct;
    const familyBonus = (this.bonus || EMPTY_FAMILY_BONUS).hpPct;
    return Math.round(base * (1 + gearBonus + synergyBonus + familyBonus));
  }
  _calcMaxMp() { return 30 + this.stats.int * 3 + this.stats.sen * 2; }

  // equipment.weapon1/weapon2를 '현재 든 세트'로 연결한다.
  // 이렇게 해두면 세트를 바꾸는 것만으로 장비창·스탠스·전투 계산이 전부 따라온다.
  _bindWeaponSlots() {
    WEAPON_SLOTS.forEach((slot, i) => {
      Object.defineProperty(this.equipment, slot, {
        get: () => this.weaponSets[this.activeSet][i],
        set: (gear) => { this.weaponSets[this.activeSet][i] = gear; },
        enumerable: true,
        configurable: true,
      });
    });
  }

  // 생성 시 기본 무기를 세트1·세트2에 나눠 넣고, 등급에 맞는 기본 방어구를 입힌다.
  // 세트마다 스탠스가 다르므로 처음부터 교체(1/2키)의 의미가 생긴다.
  _equipStarterGear() {
    this.stanceIds.slice(0, WEAPON_SET_COUNT).forEach((sid, i) => {
      const weaponId = STARTER_WEAPON_BY_STANCE[sid];
      if (weaponId) this.weaponSets[i][0] = new Gear(weaponId);
    });
    const set = STARTER_ARMOR_SET[this.armorClass];
    Object.entries(set).forEach(([slot, itemId]) => { this.equipment[slot] = new Gear(itemId); });
  }

  // 세트에 등록된 무기가 주는 스탠스(빈 세트는 맨손)
  setStances(index) {
    const ids = this.weaponSets[index].filter(Boolean).map((g) => g.stanceId);
    const unique = [...new Set(ids)];
    return unique.length ? unique : ['bare'];
  }

  get swapReady() { return this.setSwapCooldown <= 0; }

  // 무기 세트 교체. 교체 직후에는 잠깐 공격이 막히고 재사용 대기가 돈다.
  swapWeaponSet(index) {
    if (index === this.activeSet || index < 0 || index >= WEAPON_SET_COUNT) return false;
    if (this.setSwapCooldown > 0) return false;
    this.activeSet = index;
    this.currentStanceIndex = 0;
    this.setSwapCooldown = WEAPON_SWAP_COOLDOWN_MS;
    this.basicAtkCooldown = Math.max(this.basicAtkCooldown, WEAPON_SWAP_LOCK_MS);
    return true;
  }

  // 비활성 세트에도 무기를 꽂을 수 있어야 한다(전투 전에 미리 등록).
  assignWeapon(gear, setIndex, slotIdx) {
    if (!gear || gear.slot !== 'weapon' || !this.canEquip(gear.itemId)) return { ok: false };
    if (setIndex < 0 || setIndex >= WEAPON_SET_COUNT || slotIdx < 0 || slotIdx > 1) return { ok: false };
    const previous = this.weaponSets[setIndex][slotIdx];
    this.weaponSets[setIndex][slotIdx] = gear;
    if (setIndex === this.activeSet) this.currentStanceIndex = 0;
    return { ok: true, previous };
  }

  removeWeapon(setIndex, slotIdx) {
    const gear = this.weaponSets[setIndex][slotIdx];
    if (!gear) return null;
    this.weaponSets[setIndex][slotIdx] = null;
    if (setIndex === this.activeSet) this.currentStanceIndex = 0;
    return gear;
  }

  // 방어구 + 세 세트의 무기 전부. 해고 시 회수하거나 uid로 찾을 때 쓴다.
  allGear() {
    const armor = EQUIP_SLOTS.filter((s) => !WEAPON_SLOTS.includes(s)).map((s) => this.equipment[s]);
    return [...armor, ...this.weaponSets.flat()].filter(Boolean);
  }

  // 실제로 쓸 수 있는 스탠스 = 장착한 무기가 주는 스탠스. 무기가 없으면 맨손뿐.
  get availableStances() {
    const ids = ['weapon1', 'weapon2']
      .map((slot) => this.equipment[slot])
      .filter(Boolean)
      .map((gear) => gear.stanceId);
    const unique = [...new Set(ids)];
    return unique.length ? unique : ['bare'];
  }

  get currentStanceId() {
    const list = this.availableStances;
    return list[clamp(this.currentStanceIndex, 0, list.length - 1)];
  }
  get stance() { return STANCE_DATA[this.currentStanceId]; }
  get attackType() { return this.stance.attackType; }

  cycleStance() {
    this.currentStanceIndex = (this.currentStanceIndex + 1) % this.availableStances.length;
  }

  canEquip(itemId) {
    const item = ITEM_DATA[itemId];
    if (!item || !item.slot) return false;
    if (item.slot === 'weapon') return this.stanceIds.includes(item.stanceId);
    return item.armorClass === this.armorClass;
  }

  // 장착에 성공하면 원래 끼고 있던 장비를 돌려준다(인벤토리로 되돌리기 위해).
  equip(gear, slot) {
    if (!this.canEquip(gear.itemId)) return { ok: false };
    const targetSlot = gear.slot === 'weapon' ? (slot || 'weapon1') : gear.slot;
    if (gear.slot === 'weapon' && !['weapon1', 'weapon2'].includes(targetSlot)) return { ok: false };
    if (gear.slot !== 'weapon' && targetSlot !== gear.slot) return { ok: false };
    const previous = this.equipment[targetSlot];
    this.equipment[targetSlot] = gear;
    this.currentStanceIndex = 0;
    return { ok: true, previous };
  }

  unequip(slot) {
    const previous = this.equipment[slot];
    if (!previous) return null;
    this.equipment[slot] = null;
    this.currentStanceIndex = 0;
    return previous;
  }

  equippedList() {
    return EQUIP_SLOTS.map((slot) => ({ slot, gear: this.equipment[slot] })).filter((e) => e.gear);
  }

  equipmentBonus() {
    let atk = 0; let def = 0; let crit = 0; let hpPct = 0;
    this.equippedList().forEach(({ gear }) => {
      atk += gear.atk;
      def += gear.def;
      crit += gear.critBonus;
      hpPct += gear.hpPct;
    });
    return { atk, def, crit, hpPct };
  }

  // ---------- 고유 특성 / 전용기 ----------
  get signatureUnlocked() { return !!this.signature && this.level >= SIGNATURE_REQ_LEVEL; }

  addBuff(name, bonus, durationMs) {
    const existing = this.buffs.find((b) => b.name === name);
    if (existing) { existing.remain = durationMs; return; }
    this.buffs.push({ name, bonus, remain: durationMs });
  }

  tickBuffs(dt) {
    if (this.buffs.length === 0) return false;
    this.buffs.forEach((b) => { b.remain -= dt; });
    const before = this.buffs.length;
    this.buffs = this.buffs.filter((b) => b.remain > 0);
    return this.buffs.length !== before;
  }

  // 특성 + 걸려 있는 버프를 합쳐, 가문 보너스와 더할 수 있는 형태로 낸다.
  personalBonus() {
    return mergeBonuses(this.trait ? this.trait.bonus : null, ...this.buffs.map((b) => b.bonus));
  }

  get stanceState() { return this.stanceProgress[this.currentStanceId]; }

  skillLevel(skillId) { return this.stanceState.skills[skillId] || 0; }
  hasLearned(skillId) { return this.skillLevel(skillId) > 0; }

  canUpgradeSkill(skillId) {
    const st = this.stanceState;
    const def = ROLE_SKILLS_DATA[this.attackType][skillId];
    if (!def) return false;
    if (st.points <= 0) return false;
    if (st.level < def.reqLevel) return false;
    return this.skillLevel(skillId) < MAX_SKILL_LEVEL;
  }

  upgradeSkill(skillId) {
    if (!this.canUpgradeSkill(skillId)) return false;
    const st = this.stanceState;
    st.points -= 1;
    st.skills[skillId] = this.skillLevel(skillId) + 1;
    return true;
  }

  gainStanceXp(amount, logFn) {
    const st = this.stanceState;
    st.xp += amount;
    let leveled = false;
    while (st.xp >= stanceXpToNext(st.level)) {
      st.xp -= stanceXpToNext(st.level);
      st.level += 1;
      st.points += 1;
      leveled = true;
    }
    if (leveled && logFn) {
      logFn(`${this.name} [${this.stance.name}] 스탠스 Lv.${st.level}! (스킬포인트 +1)`, 'system');
    }
  }

  gainXp(amount, logFn) {
    if (this.level >= MAX_LEVEL) { this.xp = 0; return; }
    this.xp += amount;
    let leveled = false;
    while (this.level < MAX_LEVEL && this.xp >= xpToNextLevel(this.level)) {
      this.xp -= xpToNextLevel(this.level);
      this.level += 1;
      this.maxHp = this._calcMaxHp();
      this.maxMp = this._calcMaxMp();
      this.hp = this.maxHp; this.mp = this.maxMp;
      leveled = true;
    }
    if (leveled) {
      if (EFFECTS) EFFECTS.levelUp(this);
      if (SOUND) SOUND.levelUp();
      if (logFn) logFn(`${this.name} 레벨업! (${rankLabel(this.level)})`, 'system');
    }
  }
}

class Enemy {
  constructor(def, platforms = []) {
    this.uid = nextUid();
    this.name = def.name;
    this.race = def.race;
    this.width = 32; this.height = 48;
    this.floor = def.floor || 1;
    // 2층 몹은 발판 위에 서고, 그 발판 범위 안에서만 배회한다.
    this.platform = this.floor === 2
      ? platforms.find((p) => def.x + 20 > p.x && def.x < p.x + p.width) || null
      : null;
    this.spawnX = def.x;
    this.spawnY = (this.platform ? this.platform.y : GROUND_Y) - this.height;
    this.x = def.x; this.y = this.spawnY;
    this.vx = 0; this.vy = 0; this.facing = -1; this.grounded = true;
    this.maxHp = def.hp; this.hp = def.hp;
    this.atk = def.atk; this.defense = def.defense; this.xpReward = def.xpReward;
    this.aggroRange = 220; this.attackRange = 46;
    this.evade = def.evade !== undefined ? def.evade : 0.06; // 기본 회피율(가문 조준 숙련으로 상쇄)
    this.attackCooldownMs = 0;
    this.alive = true;
    this.respawnTimer = 0;
    this.rewarded = false;

    // 선공(aggressive) 몹은 시야에 들어오면 먼저 덤빈다. 비선공 몹은 맞아야(provoked) 반격한다.
    this.aggressive = def.aggressive !== false;
    this.provoked = false;

    // 보스: 덩치가 크고 패턴을 돌린다.
    this.boss = !!def.boss;
    this.bossData = def.bossData || null; // 층마다 수치가 달라지는 탑 보스용
    this.summoned = !!def.summoned;
    this.respawnMs = this.boss ? BOSS_RESPAWN_MS : ENEMY_RESPAWN_MS;
    if (this.boss) {
      this.width = 56; this.height = 78;
      this.y = (this.platform ? this.platform.y : GROUND_Y) - this.height;
      this.spawnY = this.y;
      this.aggroRange = 420;
      this.attackRange = 62;
      this.patternIndex = 0;
      this.patternTimer = 2000;
      this.phase = 'idle'; // idle → telegraph → active
      this.phaseTimer = 0;
      this.current = null;
      this.enraged = false;
    }
    this.wanderRange = 140;
    this.wanderTimer = randRange(500, 2500);
    this.wanderDir = 0;
  }

  respawn() {
    this.x = this.spawnX; this.y = this.spawnY;
    this.hp = this.maxHp; this.alive = true;
    this.vx = 0; this.attackCooldownMs = 0; this.respawnTimer = 0;
    this.provoked = false;
    this.rewarded = false;
    this.wanderTimer = randRange(500, 2500);
    this.wanderDir = 0;
    if (this.boss) {
      this.phase = 'idle'; this.phaseTimer = 0; this.current = null;
      this.patternTimer = 2000; this.enraged = false;
    }
  }
}

class Projectile {
  constructor(x, y, vx, ownerUid, dmg, isCrit, color) {
    this.uid = nextUid();
    this.x = x; this.y = y; this.vx = vx; this.vy = 0;
    this.width = 10; this.height = 6;
    this.ownerUid = ownerUid;
    this.dmg = dmg; this.isCrit = isCrit;
    this.color = color || '#f1c40f';
    this.life = 1500;
    this.dead = false;
  }
}

// 마을의 영입 퀘스트 NPC. 클릭하면 퀘스트 수락/완료 창이 열린다.
class RecruitNpc {
  constructor(recruitDef, platforms = []) {
    this.charId = recruitDef.charId;
    this.charDef = CHARACTER_DATA.find((c) => c.id === recruitDef.charId);
    this.name = `${this.charDef.name}`;
    this.tier = recruitDef.tier;
    this.width = 30; this.height = 50;
    this.x = recruitDef.x;
    this.y = floorYFor(recruitDef, platforms, this.height);
  }
}

// 장비 한 점. 같은 아이템이라도 강화 수치·인챈트가 달라서 개별 인스턴스로 관리한다.
class Gear {
  constructor(itemId) {
    this.uid = nextUid();
    this.itemId = itemId;
    this.plus = 0;
    this.enchant = null;
  }

  get item() { return ITEM_DATA[this.itemId]; }
  get slot() { return this.item.slot; }
  get stanceId() { return this.item.stanceId; }
  get armorClass() { return this.item.armorClass; }
  get tier() { return this.item.tier; }

  get displayName() {
    const ench = this.enchant ? `${this.enchant.name} ` : '';
    const plus = this.plus > 0 ? ` +${this.plus}` : '';
    return `${ench}${this.item.name}${plus}`;
  }

  _scaled(base) {
    if (!base) return 0;
    let value = base * (1 + ENHANCE_STEP * this.plus);
    if (this.enchant && this.enchant.pct && this.enchant.stat === (this.item.atk ? 'atk' : 'def')) {
      value *= 1 + this.enchant.pct;
    }
    return Math.round(value);
  }

  get atk() { return this._scaled(this.item.atk); }
  get def() { return this._scaled(this.item.def); }
  get critBonus() { return this.enchant && this.enchant.stat === 'crit' ? this.enchant.value : 0; }
  get hpPct() { return this.enchant && this.enchant.stat === 'hp' ? this.enchant.pct : 0; }

  get sellPrice() {
    return Math.round(this.item.price * (1 + ENHANCE_STEP * this.plus) * (this.enchant ? 1.4 : 1) * 0.5);
  }
}

// 마을 잡화상. 잡템 판매 / 소모품 구매 / 제작을 제공한다.
class ShopNpc {
  constructor(def, platforms = []) {
    this.name = def.name;
    this.width = 30; this.height = 52;
    this.x = def.x;
    this.y = floorYFor(def, platforms, this.height);
  }
}

// 마을 의뢰 게시판. 클릭하면 일반 퀘스트를 수주/완료한다.
class QuestBoard {
  constructor(def, platforms = []) {
    this.name = def.name;
    this.width = 44; this.height = 54;
    this.x = def.x;
    this.y = floorYFor(def, platforms, this.height);
  }
}

// 시나리오 진행용 마을 NPC.
class StoryNpc {
  constructor(def, platforms = []) {
    this.id = def.id;
    this.name = def.name;
    this.width = 30; this.height = 52;
    this.x = def.x;
    this.y = floorYFor(def, platforms, this.height);
  }
}
