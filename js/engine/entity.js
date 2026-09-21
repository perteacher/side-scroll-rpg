const GRAVITY = 1400;
const GROUND_Y = 380;
const JUMP_VELOCITY = -520;

// 자동전투 모드: off(수동) / keep(이동하며 사냥) / hold(제자리에서 사거리 내만 공격)
const AUTO_MODES = ['off', 'keep', 'hold'];
const AUTO_MODE_LABEL = { off: '정지', keep: '킵', hold: '홀드' };

// 옛 1차원 배치(x + floor)를 타일맵 위의 빈 칸으로 옮긴다.
// 사냥 한 마리로 받을 수 있는 경험치의 상한(다음 레벨 요구량 대비).
// 병작으로 1레벨이 100레벨 존에 서 있어도 한 번에 세 레벨씩은 못 오른다.
const XP_PER_KILL_CAP = 0.35;

function placeOnMap(map, def, seedKey) {
  const wantY = def.y !== undefined ? def.y : isoPlaceY(def, seedKey, map);
  if (!map) return { x: def.x, y: wantY };
  return map.nearestFree(clamp(def.x, TILE, map.w - TILE), wantY);
}

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
    this.rank = runtime.rank || 0; // 0 기본 / 1 베테랑 / 2 익스퍼트 / 3 마스터
    this.xp = runtime.xp || 0;
    // 스탯은 기본치에 모든 스탠스의 레벨 성장분을 더한 값이다(get stats). 스탠스 레벨이 바뀌면 캐시를 비운다.
    this.baseStats = { ...def.baseStats };
    this._statsCache = null;
    this.currentStanceIndex = 0;
    this.autoMode = runtime.autoMode || 'off';

    // 스탠스별 숙련도: 레벨/경험치/미사용 스킬포인트/스킬레벨 (맨손 포함)
    // 단계 스탠스(베테랑/익스퍼트/마스터)도 자리를 미리 만들어 둔다. 해금 전에는 목록에 안 나올 뿐이다.
    this.tierStances = tierStancesFor(this.stanceIds);
    this.stanceProgress = {};
    ['bare', ...this.stanceIds, ...this.tierStances.map((t) => t.stanceId)].forEach((sid) => {
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

    // 쿼터뷰: width/height는 바닥에 차지하는 크기다(그림 크기가 아니다).
    this.width = 24; this.height = 24;
    this.x = 100; this.y = 320;
    this.vx = 0; this.vy = 0; this.facing = 1; this.grounded = true;

    this.maxHp = this._calcMaxHp();
    this.hp = this.maxHp;
    this.maxMp = this._calcMaxMp();
    this.mp = this.maxMp;

    this.basicAtkCooldown = 0;
    this.skillCooldowns = {};
    this.dropTimer = 0; // >0이면 발판을 통과해 아래층으로 내려간다
    this.downed = false; // HP 0 — 전투 불능. 마을에 들어가면 회복된다.
    this.statuses = {};         // 상태이상(보스 패턴의 기절·화상)
    this.ccImmuneMs = 0;
    this.onRope = null;         // 매달린 로프
    this.climbing = false;
    this.usedFlashJump = false; // 공중에서 플래시 점프를 이미 썼는지(착지하면 초기화)
    this.flashTimer = 0;
  }

  _calcMaxHp() {
    // 방어구도 체력에 보탠다. 레벨대 장비가 커질수록 방어구 수치가 커지므로,
    // 이게 없으면 상위 존에서 몹 공격력만 오르고 파티 체력은 제자리라 순식간에 녹는다.
    const gearDef = this.equipment ? this.equipmentBonus().def : 0;
    const base = 60 + this.stats.vit * 8 + this.level * 10 + gearDef * 0.5;
    const gearBonus = this.equipment ? this.equipmentBonus().hpPct : 0;
    const synergyBonus = (this.synergy || EMPTY_SYNERGY).hpPct;
    const familyBonus = (this.bonus || EMPTY_FAMILY_BONUS).hpPct;
    return Math.round(base * (1 + gearBonus + synergyBonus + familyBonus));
  }
  // 힐러는 평타부터 스킬까지 전부 MP를 쓴다. 밑천을 더 준다.
  _calcMaxMp() {
    const base = 30 + this.stats.int * 3 + this.stats.sen * 2;
    return Math.round(base * (this.attackType === 'support' ? 1.6 : 1));
  }

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

  // 세트에 등록된 무기로 쓸 수 있는 스탠스(빈 세트는 맨손).
  // 무기가 주는 것은 '계열'이라, 그 계열을 쓰는 내 스탠스들을 돌려준다.
  // 힐러의 기본 자세는 무기 없이도 되므로(weaponless) 빈 세트에서도 나온다.
  setStances(index) {
    const weapons = new Set(this.weaponSets[index].filter(Boolean).map((g) => g.stanceId));
    const ids = this.unlockedStanceIds.filter((sid) => {
      const s = STANCE_DATA[sid];
      return s.weaponless || weapons.has(s.weapon);
    });
    return ids.length ? ids : ['bare'];
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
    this.invalidateStats();
    return true;
  }

  // 비활성 세트에도 무기를 꽂을 수 있어야 한다(전투 전에 미리 등록).
  assignWeapon(gear, setIndex, slotIdx) {
    if (!gear || gear.slot !== 'weapon' || !this.canEquip(gear.itemId)) return { ok: false };
    if (setIndex < 0 || setIndex >= WEAPON_SET_COUNT || slotIdx < 0 || slotIdx > 1) return { ok: false };
    const previous = this.weaponSets[setIndex][slotIdx];
    this.weaponSets[setIndex][slotIdx] = gear;
    if (setIndex === this.activeSet) this.currentStanceIndex = 0;
    this.invalidateStats();
    return { ok: true, previous };
  }

  removeWeapon(setIndex, slotIdx) {
    const gear = this.weaponSets[setIndex][slotIdx];
    if (!gear) return null;
    this.weaponSets[setIndex][slotIdx] = null;
    if (setIndex === this.activeSet) this.currentStanceIndex = 0;
    this.invalidateStats();
    return gear;
  }

  // 방어구 + 세 세트의 무기 전부. 해고 시 회수하거나 uid로 찾을 때 쓴다.
  allGear() {
    const armor = EQUIP_SLOTS.filter((s) => !WEAPON_SLOTS.includes(s)).map((s) => this.equipment[s]);
    return [...armor, ...this.weaponSets.flat()].filter(Boolean);
  }

  // ---------- 스탯 ----------
  // 스탯 = 기본치 + 스탠스 성장 + 장비 잠재능력 + 계정 공용(몬스터 컬렉션)
  // 계정 스탯은 버전이 바뀌면 알아서 다시 계산한다.
  get stats() {
    if (!this._statsCache || this._statsVersion !== ACCOUNT_STAT_VERSION) {
      const out = { ...this.baseStats };
      const add = (src, floor) => Object.keys(STAT_LABEL).forEach((k) => {
        if (src[k]) out[k] = (out[k] || 0) + (floor ? Math.floor(src[k]) : src[k]);
      });
      add(this.stanceGrowthBonus(), true);
      add(this.potentialTotals(), false);
      add(ACCOUNT_FLAT_STATS, false);
      this._statsCache = out;
      this._statsVersion = ACCOUNT_STAT_VERSION;
    }
    return this._statsCache;
  }

  // 모든 스탠스의 (레벨-1) × 레벨당 성장치. 스탠스를 여럿 키울수록 강해진다.
  stanceGrowthBonus() {
    const bonus = {};
    Object.entries(this.stanceProgress).forEach(([sid, p]) => {
      const per = stanceGrowthPerLevel(sid);
      Object.entries(per).forEach(([k, v]) => { bonus[k] = (bonus[k] || 0) + v * (p.level - 1); });
    });
    return bonus;
  }

  // 스탠스 레벨이 바뀌었을 때: 스탯 캐시를 비우고 최대 HP/MP를 다시 잰다(현재 비율 유지).
  invalidateStats() {
    this._statsCache = null;
    if (!this.maxHp) return;
    const hpRatio = this.hp / this.maxHp;
    const mpRatio = this.maxMp ? this.mp / this.maxMp : 1;
    this.maxHp = this._calcMaxHp();
    this.maxMp = this._calcMaxMp();
    this.hp = clamp(Math.round(this.maxHp * hpRatio), 0, this.maxHp);
    this.mp = clamp(Math.round(this.maxMp * mpRatio), 0, this.maxMp);
  }

  // ---------- 스탠스 ----------
  // 해금된 스탠스 = 기본 스탠스 + 도달한 단계(베테랑/익스퍼트/마스터)의 스탠스
  get unlockedStanceIds() {
    const upper = this.tierStances.filter((t) => this.level >= tierStartLevel(t.tier)).map((t) => t.stanceId);
    return [...this.stanceIds, ...upper];
  }

  // 이 캐릭터가 쓸 수 있는 무기 계열. 스탠스가 요구하는 무기 종류들이다.
  // 힐러의 퍼스트 에이드/포르티투도는 둘 다 로자리오를 요구하므로 계열이 하나로 모인다.
  get weaponFamilies() {
    const out = new Set();
    [...this.stanceIds, ...this.tierStances.map((t) => t.stanceId)].forEach((sid) => {
      const s = STANCE_DATA[sid];
      if (s && s.weapon) out.add(s.weapon);
    });
    return out;
  }

  // 실제로 쓸 수 있는 스탠스 = 해금된 스탠스 중 장착 무기와 계열이 맞는 것. 무기가 없으면 맨손뿐.
  // 단, 힐러의 기본 자세(퍼스트 에이드·포르티투도)는 원작처럼 맨손으로도 쓴다(weaponless).
  get availableStances() { return this.setStances(this.activeSet); }

  get isSupport() { return this.attackType === 'support'; }

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
    if ((item.reqLevel || 1) > this.level) return false; // 레벨대 장비는 착용 제한이 있다
    if (item.slot === 'weapon') return this.weaponFamilies.has(item.stanceId);
    if (item.slot === 'accessory') return true;          // 장신구는 누구나 낀다
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
    this.invalidateStats();
    return { ok: true, previous };
  }

  unequip(slot) {
    const previous = this.equipment[slot];
    if (!previous) return null;
    this.equipment[slot] = null;
    this.currentStanceIndex = 0;
    this.invalidateStats();
    return previous;
  }

  equippedList() {
    return EQUIP_SLOTS.map((slot) => ({ slot, gear: this.equipment[slot] })).filter((e) => e.gear);
  }

  // 착용 장비 잠재능력 합계(항목별)
  potentialTotals() {
    const out = {};
    this.equippedList().forEach(({ gear }) => {
      Object.entries(gear.potentialTotals()).forEach(([k, v]) => { out[k] = (out[k] || 0) + v; });
    });
    return out;
  }

  equipmentBonus() {
    let atk = 0; let def = 0;
    this.equippedList().forEach(({ gear }) => { atk += gear.atk; def += gear.def; });
    const p = this.potentialTotals();
    return { atk, def, crit: p.crit || 0, hpPct: p.hpPct || 0 };
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
  // 특성 + 버프 + 잠재능력의 비율 옵션(크리·HP%는 equipmentBonus 쪽에서 이미 센다)
  personalBonus() {
    const p = this.potentialTotals();
    const gearPct = {
      atkPct: p.atkPct || 0, defPct: p.defPct || 0, critDmg: p.critDmg || 0, bossDmg: p.bossDmg || 0, pierce: p.pierce || 0,
    };
    // 스탠스 자체가 주는 보정(익스퍼트 스탠스의 면역·관통 등)도 여기서 합쳐진다.
    return mergeBonuses(this.trait ? this.trait.bonus : null, gearPct,
      stanceBonusOf(this.currentStanceId), ...this.buffs.map((b) => b.bonus));
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
    const sid = this.currentStanceId;
    const st = this.stanceState;
    const max = stanceMaxLevel(sid);
    if (st.level >= max) { st.xp = 0; return; }
    st.xp += amount;
    let leveled = false;
    while (st.level < max && st.xp >= stanceXpToNext(st.level, sid)) {
      st.xp -= stanceXpToNext(st.level, sid);
      st.level += 1;
      st.points += 1;
      leveled = true;
    }
    if (st.level >= max) st.xp = 0;
    if (!leveled) return;
    this.invalidateStats();
    if (logFn) {
      const growth = statBonusText(stanceGrowthPerLevel(sid), 1);
      logFn(`${this.name} [${this.stance.name}] 스탠스 Lv.${st.level}${st.level >= max ? ' (MAX)' : ''}! 스킬포인트 +1 · ${growth}`, 'system');
    }
  }

  // 승급하지 않으면 그 구간의 끝 레벨에서 경험치가 멈춘다.
  get levelCap() { return levelCapForRank(this.rank || 0); }

  // 병작(쩔)으로 한 방에 몇 레벨씩 뛰지 않게, 사냥 경험치는 한 마리당 다음 레벨 요구량의
  // 일부까지만 인정한다. 퀘스트·경험치 카드는 상한을 적용하지 않는다(opts.capped로 구분).
  gainXp(amount, logFn, opts = {}) {
    const cap = this.levelCap;
    if (this.level >= cap) {
      this.xp = 0;
      // 승급이 필요하다는 안내는 너무 자주 띄우지 않는다.
      this._capNoticeMs = (this._capNoticeMs || 0) - 1;
      if (logFn && this._capNoticeMs <= 0) {
        this._capNoticeMs = 60;
        const promo = promotionFor(this.rank || 0);
        if (promo) logFn(`${this.name}: ${rankLabel(this.level)} 한계입니다. 병영에서 [${promo.name} 승급]을 하면 더 성장합니다.`, 'system');
      }
      return;
    }
    const levelBefore = this.level;
    const gain = opts.capped
      ? Math.min(amount, Math.max(1, Math.round(xpToNextLevel(this.level) * XP_PER_KILL_CAP)))
      : amount;
    this.xp += gain;
    let leveled = false;
    while (this.level < cap && this.xp >= xpToNextLevel(this.level)) {
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
      // 베테랑·익스퍼트·마스터에 막 도달했으면 새 스탠스를 알린다.
      this.tierStances.forEach((t) => {
        const start = tierStartLevel(t.tier);
        if (levelBefore >= start || this.level < start || !logFn) return;
        const stance = STANCE_DATA[t.stanceId];
        const tierName = LEVEL_TIERS.find((x) => x.id === t.tier).name;
        logFn(`[스탠스 해금] ${this.name} ${tierName} 달성! 새 스탠스 「${stance.name}」 — ${weaponNoun(stance.weapon)} 계열 무기로 사용`, 'party');
      });
    }
  }
}

class Enemy {
  constructor(def, map = null) {
    this.uid = nextUid();
    this.name = def.name;
    this.race = def.race;
    this.level = def.level || 1; // 존 권장 레벨에서 받아온다(탑은 층에 비례)
    this.width = def.boss ? 48 : 28;
    this.height = this.width;
    this.floor = def.floor || 1;
    // 옛 1차원 배치(x + floor)를 평면 좌표로 옮기고, 막힌 칸이면 빈 칸으로 밀어낸다.
    const wantY = def.y !== undefined ? def.y : isoPlaceY(def, def.name || 'enemy', map);
    const spot = map
      ? map.nearestFree(clamp(def.x, TILE, map.w - TILE), wantY)
      : { x: def.x, y: wantY };
    this.x = spot.x - this.width / 2;
    this.y = spot.y - this.height / 2;
    this.spawnX = this.x; this.spawnY = this.y;
    this.vx = 0; this.vy = 0; this.facing = -1; this.grounded = true;
    // 몹 수치는 정의값 × 레벨 배율(balance.js). 탑처럼 스스로 층 배율을 가진 몹은 noScale로 건너뛴다.
    const sc = def.noScale ? { hp: 1, atk: 1, xp: 1, def: 1 } : enemyScaleFor(this.level);
    this.maxHp = Math.max(1, Math.round(def.hp * sc.hp));
    this.hp = this.maxHp;
    this.atk = Math.max(1, Math.round(def.atk * sc.atk));
    this.defense = Math.max(0, Math.round(def.defense * sc.def));
    this.xpReward = Math.max(1, Math.round(def.xpReward * sc.xp));
    this.aggroRange = 220; this.attackRange = 46;
    this.evade = def.evade !== undefined ? def.evade : 0.06; // 기본 회피율(가문 조준 숙련으로 상쇄)
    this.attackCooldownMs = 0;
    this.alive = true;
    this.respawnTimer = 0;
    this.rewarded = false;
    this.statuses = {};  // 상태이상 id → { remaining, stacks, tickDmg, ... }
    this.ccImmuneMs = 0; // 보스: 기절·빙결 면역 남은 시간

    // 선공(aggressive) 몹은 시야에 들어오면 먼저 덤빈다. 비선공 몹은 맞아야(provoked) 반격한다.
    this.aggressive = def.aggressive !== false;
    this.provoked = false;

    // 보스: 덩치가 크고 패턴을 돌린다.
    this.boss = !!def.boss;
    this.bossData = def.bossData || null; // 층마다 수치가 달라지는 탑 보스용
    this.summoned = !!def.summoned;
    this.respawnMs = this.boss ? BOSS_RESPAWN_MS : ENEMY_RESPAWN_MS;
    if (this.boss) {
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
    clearStatuses(this);
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
  constructor(recruitDef, map = null) {
    this.charId = recruitDef.charId;
    this.charDef = CHARACTER_DATA.find((c) => c.id === recruitDef.charId);
    this.name = `${this.charDef.name}`;
    this.tier = recruitDef.tier;
    this.width = 26; this.height = 26;
    const spot = placeOnMap(map, recruitDef, `npc:${this.charId}`);
    this.x = spot.x - this.width / 2;
    this.y = spot.y - this.height / 2;
    faceRoad(this, map ? map.w / 2 : null);
  }
}

// 장비 한 점. 같은 아이템이라도 강화·잠재능력이 달라서 개별 인스턴스로 관리한다.
class Gear {
  constructor(itemId) {
    this.uid = nextUid();
    this.itemId = itemId;
    this.star = 0;
    this.failStreak = 0;   // 15성 이상에서 연속으로 떨어진 횟수(2면 찬스 타임)
    this.potential = null; // { grade: 1~4, lines: [{ stat, value, grade }] }
  }

  get item() { return ITEM_DATA[this.itemId]; }
  get slot() { return this.item.slot; }
  get stanceId() { return this.item.stanceId; }
  get armorClass() { return this.item.armorClass; }
  get tier() { return this.item.tier; }
  get maxStar() { return STARFORCE_MAX_BY_TIER[this.tier] || 5; }

  get displayName() {
    return `${this.item.name}${this.star > 0 ? ` ★${this.star}` : ''}`;
  }

  _scaled(base) { return base ? Math.round(base * starforceStatMult(this.star)) : 0; }

  get atk() { return this._scaled(this.item.atk); }
  get def() { return this._scaled(this.item.def); }

  // 잠재능력 줄들을 항목별로 더한다.
  potentialTotals() {
    const out = {};
    (this.potential ? this.potential.lines : []).forEach((l) => { out[l.stat] = (out[l.stat] || 0) + l.value; });
    return out;
  }

  get sellPrice() {
    const potentialMult = this.potential ? 1 + this.potential.grade * 0.3 : 1;
    return Math.round(this.item.price * starforceStatMult(this.star) * potentialMult * 0.5);
  }
}

// 마을 잡화상. 잡템 판매 / 소모품 구매 / 제작을 제공한다.
class ShopNpc {
  constructor(def, map = null) {
    this.name = def.name;
    this.width = 26; this.height = 26;
    const spot = placeOnMap(map, def, `shop:${def.name}`);
    this.x = spot.x - this.width / 2;
    this.y = spot.y - this.height / 2;
    faceRoad(this, map ? map.w / 2 : null);
  }
}

// 마을 의뢰 게시판. 클릭하면 일반 퀘스트를 수주/완료한다.
class QuestBoard {
  constructor(def, map = null) {
    this.name = def.name;
    this.width = 34; this.height = 34;
    const spot = placeOnMap(map, def, `board:${def.name}`);
    this.x = spot.x - this.width / 2;
    this.y = spot.y - this.height / 2;
  }
}

// 시나리오 진행용 마을 NPC.
class StoryNpc {
  constructor(def, map = null) {
    this.id = def.id;
    this.name = def.name;
    this.width = 26; this.height = 26;
    const spot = placeOnMap(map, def, `story:${def.id}`);
    this.x = spot.x - this.width / 2;
    this.y = spot.y - this.height / 2;
    faceRoad(this, map ? map.w / 2 : null);
  }
}
