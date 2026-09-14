const MOVE_SPEED = 200;
const WORLD_HEIGHT = 540;
const WORLD_WIDTH = 960;
const FOLLOW_DISTANCE = 220;
const FOLLOW_SPEED = 230;

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.input = new InputManager();
    const log = (text, tag) => this.ui.logChat(text, tag);
    this.ui = new UIManager(null, null, null);
    this.pm = new PartyManager(log);
    this.zm = new ZoneManager(log);
    this.qm = new QuestManager(log, this.pm);
    this.sm = new ScenarioManager(log, this.pm);
    this.fm = new FamilyManager(log);
    this.gq = new GeneralQuestManager(log, this.pm);
    this.tower = new TowerManager(log);
    this.stats = new StatsTracker();
    this.pm.stats = this.stats;
    SettingsManager.load();
    this.ui.pm = this.pm; this.ui.zm = this.zm; this.ui.qm = this.qm; this.ui.sm = this.sm; this.ui.fm = this.fm; this.ui.gq = this.gq;
    this.ui.tower = this.tower;
    this.ui.stats = this.stats;
    this.renderer = new Renderer(this.ctx, WORLD_WIDTH, WORLD_HEIGHT);
    this.effects = new EffectManager();
    EFFECTS = this.effects;
    this.audio = new AudioManager();
    SOUND = this.audio;
    this.projectiles = [];
    this.lastTime = 0;
    this.elapsed = 0;
    this.warpCooldown = 0;
    this._seenLevels = new Map();
  }

  init() {
    this.ui.init();
    this.ui.logChat('클래스를 고르고 닉네임을 정하세요.', 'system');

    this.ui.onCreateCharacter = (specs) => this._startGame(specs);
    this.ui.onStoryTalk = (npcId) => {
      if (this.sm.isDeliverNpc(npcId)) this.sm.tryDeliver();
      else this.sm.onTalk(npcId);
      this.qm.onTalk(npcId);
      this.ui.refreshQuest();
    };
    this.ui.onEquip = (gearUid, slot) => {
      const unit = this.pm.activeUnit;
      const gear = this.pm.takeGear(gearUid);
      if (!gear) return;
      const result = unit.equip(gear, slot);
      if (!result.ok) { this.pm.gear.push(gear); return; }
      if (result.previous) this.pm.gear.push(result.previous);
      this.ui.logChat(`${unit.name} ${gear.displayName} 장착`, 'system');
      this.ui.rebuildPartySlots();
      this.ui.refreshOpenWindows();
    };
    this.ui.onUnequip = (slot) => {
      const unit = this.pm.activeUnit;
      const removed = unit.unequip(slot);
      if (!removed) return;
      this.pm.gear.push(removed);
      this.ui.logChat(`${unit.name} ${removed.displayName} 해제`, 'system');
      this.ui.rebuildPartySlots();
      this.ui.refreshOpenWindows();
    };
    this.ui.onSignaturePress = (slotIndex) => this._useSignature(this.pm.partyUnits[slotIndex], true);
    this.ui.onPresetSwap = (setIndex) => this._swapWeaponSet(setIndex);
    this.ui.onPresetAssign = (gearUid, setIndex, slotIdx) => {
      const unit = this.pm.activeUnit;
      const gear = this.pm.takeGear(gearUid);
      if (!gear) return;
      const result = unit.assignWeapon(gear, setIndex, slotIdx);
      if (!result.ok) { this.pm.gear.push(gear); return; }
      if (result.previous) this.pm.gear.push(result.previous);
      this.ui.logChat(`${unit.name} 세트 ${setIndex + 1}에 ${gear.displayName} 등록`, 'system');
      this.ui.rebuildPartySlots();
      this.ui.refreshOpenWindows();
    };
    this.ui.onPresetRemove = (setIndex, slotIdx) => {
      const unit = this.pm.activeUnit;
      const removed = unit.removeWeapon(setIndex, slotIdx);
      if (!removed) return;
      this.pm.gear.push(removed);
      this.ui.logChat(`${unit.name} 세트 ${setIndex + 1}에서 ${removed.displayName} 회수`, 'system');
      this.ui.rebuildPartySlots();
      this.ui.refreshOpenWindows();
    };
    this.ui.onCreateInBarracks = (classId, nickname) => {
      const unit = this.pm.createPlayerCharacter(classId, nickname);
      if (!unit) return;
      unit.x = this.pm.activeUnit ? this.pm.activeUnit.x : 120;
      unit.y = GROUND_Y - unit.height;
      this.ui.rebuildPartySlots();
      this.ui.refreshOpenWindows();
    };
    this.ui.onDismiss = (unitId) => {
      if (!this.pm.dismiss(unitId)) return;
      this.ui.rebuildPartySlots();
      this.ui.refreshOpenWindows();
    };
    this.ui.onSellGear = (gearUid) => { this.pm.sellGear(gearUid); this.ui.refreshOpenWindows(); };
    this.ui.onEnhance = (gearUid) => {
      const gear = this.pm.findGear(gearUid);
      if (gear) this.pm.enhanceGear(gear);
      this.ui.rebuildPartySlots();
      this.ui.refreshOpenWindows();
    };
    this.ui.onEnchant = (gearUid) => {
      const gear = this.pm.findGear(gearUid);
      if (gear) this.pm.enchantGear(gear);
      this.ui.rebuildPartySlots();
      this.ui.refreshOpenWindows();
    };
    this.ui.onSell = (itemId, count) => { this.pm.sellItem(itemId, count); this.ui.refreshShop(); };
    this.ui.onBuy = (itemId) => { this.pm.buyItem(itemId, 1); this.qm.checkItemSteps(); this.gq.checkItemSteps(); this.sm.checkItemSteps(); this.ui.refreshShop(); };
    this.ui.onCraft = (recipeId) => {
      const recipe = RECIPE_DATA.find((r) => r.id === recipeId);
      if (this.pm.craft(recipe)) { this.qm.checkItemSteps(); this.gq.checkItemSteps(); this.sm.checkItemSteps(); this.ui.refreshShop(); }
    };
    this.ui.onDeliver = (charId) => {
      const quest = this.qm.find(charId);
      if (quest) this.qm.tryDeliver(quest);
      this.ui.refreshQuest();
    };
    this.sm.onChapterComplete = (chapterDef) => {
      this.pm.addGold(chapterDef.reward.gold);
      const log = (t, tag) => this.ui.logChat(t, tag);
      this.pm.partyUnits.forEach((u) => u.gainXp(chapterDef.reward.xp, log));
      this.ui.rebuildPartySlots();
    };
    this.ui.onSkillPress = (slotIndex, skillIdx) => this._useHotbarSlot(slotIndex, skillIdx);
    this.ui.onSwapRequest = (charId, slotIndex) => {
      this.pm.swapIn(charId, slotIndex);
      this.ui.refreshOpenWindows();
    };
    this.ui.onAutoModeChange = (unitId, mode) => {
      this.pm.setAutoMode(unitId, mode);
      this.ui.rebuildPartySlots();
    };
    this.ui.onTeleport = (zoneIndex) => this._teleport(zoneIndex);
    this.ui.onTowerEnter = (floor) => this._enterTower(floor);
    this.ui.onTowerLeave = () => this._exitTower(true);
    this.ui.onSkillUpgrade = (skillId) => {
      const unit = this.pm.activeUnit;
      if (!unit.upgradeSkill(skillId)) return;
      const def = ROLE_SKILLS_DATA[unit.attackType][skillId];
      this.ui.logChat(`${unit.name} [${def.name}] 스킬 Lv.${unit.skillLevel(skillId)}`, 'system');
      this.ui.rebuildPartySlots();
      this.ui.refreshCharInfo();
    };
    this.ui.onBoardAccept = (id) => { this.gq.accept(id); this.ui.refreshBoard(); };
    this.ui.onBoardClaim = (id) => { this.gq.claim(id); this.ui.refreshBoard(); this.ui.refreshPartyHUD(); };
    this.ui.onBoardDeliver = (id) => { this.gq.tryDeliver(id); this.ui.refreshBoard(); };
    this.ui.onBoardAbandon = (id) => { this.gq.abandon(id); this.ui.refreshBoard(); };
    this.ui.onFamilyInvest = (id) => { if (this.fm.invest(id)) this.ui.refreshFamily(); };
    this.ui.onFamilyRefund = (id) => { if (this.fm.refund(id)) this.ui.refreshFamily(); };
    this.ui.onFamilyReset = () => { this.fm.resetAll(); this.ui.refreshFamily(); };
    this.ui.onQuestAccept = (npc) => { this.qm.accept(npc); this.ui.refreshQuest(); };
    this.ui.onQuestComplete = (charId) => this._completeRecruit(charId);

    this.ui.onUsePotion = (itemId) => {
      if (this.pm.useConsumable(itemId, this.pm.activeUnit)) this.ui.refreshOpenWindows();
    };
    this.ui.onManualSave = () => {
      const ok = SaveManager.save(this);
      this.ui.logChat(ok ? '게임을 저장했습니다.' : '저장에 실패했습니다(브라우저 저장소 차단).', 'system');
    };
    this.ui.onResetSave = () => {
      this.resetting = true; // beforeunload가 방금 지운 세이브를 다시 쓰지 않도록
      SaveManager.clear();
      window.location.reload();
    };

    this.input.bindCanvasClick(this.canvas, (sx, sy) => ({ x: sx + this.renderer.camX, y: sy }));
    this.input.onMouseClickWorld = (wx, wy) => this._handleWorldClick(wx, wy);

    window.addEventListener('beforeunload', () => {
      if (this.resetting) return;
      if (this.pm.partyIds.length > 0) SaveManager.save(this);
    });

    // 저장된 게임이 있으면 캐릭터 생성을 건너뛰고 이어서 시작한다.
    if (SaveManager.hasSave() && SaveManager.load(this)) {
      document.getElementById('create-screen').classList.add('hidden');
      this._resetPartyPositions();
      this.ui.rebuildPartySlots();
      this.ui.logChat(`저장된 게임을 불러왔습니다. (${this.zm.name})`, 'system');
    }
  }

  _startGame(specs) {
    this.pm.createPlayerParty(specs);
    this._resetPartyPositions();
    this.ui.rebuildPartySlots();
    this.ui.logChat(`${this.zm.name}에서 시작합니다. 파란 NPC = 시나리오, 노란 NPC = 영입 퀘스트.`, 'system');
    const ch = this.sm.chapter;
    this.ui.logChat(`[시나리오] 챕터 ${ch.chapter} "${ch.title}" — ${ch.intro}`, 'npc');
    this.ui.logChat(`[시나리오] 목표 — ${this.sm.objectiveText()}`, 'npc');
  }

  _completeRecruit(charId) {
    if (!this.qm.complete(charId)) return;
    this.pm.recruit(charId);
    this.ui.rebuildPartySlots();
    this.ui.refreshQuest();
  }

  // ---------- 심연의 탑 ----------
  // 현재 존을 귀환 지점으로 잡아두고 층을 만들어 들어간다.
  _enterTower(floor) {
    if (!this.tower.canEnter(this.pm.partyUnits)) {
      this.ui.logChat(`심연의 탑은 Lv.${TOWER_ENTRY_LEVEL} 이상 캐릭터가 있어야 들어갈 수 있습니다.`, 'system');
      return;
    }
    const back = this.zm.index === this.tower.zoneIndex ? this.tower.returnZoneIndex : this.zm.index;
    this.tower.start(floor, back);
    this._loadTowerZone();
    this.ui.logChat(`[심연의 탑] ${floor}층 — 층의 적을 모두 쓰러뜨리면 위층이 열립니다.`, 'npc');
    this.ui.closeWindow('tower-window');
  }

  // 탑 안에서는 존 인덱스가 그대로라 travelTo가 안 먹는다. 직접 다시 적재한다.
  _loadTowerZone() {
    this.zm._load(this.tower.zoneIndex, false);
    this.projectiles = [];
    this.ui.setTarget(null);
    this._resetPartyPositions(140);
    this.warpCooldown = 900;
    this.ui.rebuildPartySlots();
  }

  _advanceTowerFloor() {
    const cleared = this.tower.floor;
    const reward = towerFloorReward(cleared);
    this.pm.addGold(reward.gold);
    const log = (t, tag) => this.ui.logChat(t, tag);
    this.pm.partyUnits.forEach((u) => u.gainXp(reward.xp, log));
    reward.items.forEach((id) => {
      this.pm.addItem(id, 1);
      this.ui.logChat(`[탑 보상] ${ITEM_DATA[id].name} 획득`, 'system');
    });
    this.ui.logChat(`[심연의 탑] ${cleared}층 보상 — ${reward.gold}G · 경험치 +${reward.xp.toLocaleString()}`, 'system');
    this.tower.buildFloor(cleared + 1);
    this._loadTowerZone();
    this.ui.rebuildPartySlots();
    SaveManager.save(this);
  }

  _exitTower(manual) {
    if (!this.tower.active) return;
    const back = this.tower.returnZoneIndex;
    this.tower.stop();
    this.ui.logChat(manual
      ? `[심연의 탑] 도전을 마쳤습니다. 최고 기록 ${this.tower.bestFloor}층.`
      : `[심연의 탑] 전멸 — 밀려났습니다. 최고 기록 ${this.tower.bestFloor}층은 남습니다.`, 'system');
    const dest = ZONE_DATA[back].type === 'town' ? back : this._nearestTownIndex(back);
    this._teleport(dest);
    this.ui.closeWindow('tower-window');
  }

  _teleport(zoneIndex, entryX = null) {
    const fromZoneId = this.zm.def.id;
    if (!this.zm.travelTo(zoneIndex)) return;
    if (this.tower.active && zoneIndex !== this.tower.zoneIndex) this.tower.stop();
    if (entryX === 'auto') entryX = this.zm.entryXFrom(fromZoneId);
    this.projectiles = [];
    this.ui.setTarget(null);
    this._resetPartyPositions(entryX);
    this.warpCooldown = 900;
    this.audio.warp();
    this.sm.onZoneEnter(this.zm.def.id);
    if (this.zm.isTown) this._reviveAll();
    this.ui.closeWindow('teleport-window');
    SaveManager.save(this);
  }

  _resetPartyPositions(entryX = null) {
    const baseX = entryX === null ? 120 : entryX;
    this.pm.partyUnits.forEach((u, i) => {
      u.x = clamp(baseX + i * 50, 0, this.zm.width - u.width);
      u.y = GROUND_Y - u.height; u.vx = 0; u.vy = 0;
    });
  }

  // 워프 위에서 ↑를 눌러야 이동한다(그냥 닿는 것만으로는 이동하지 않음).
  _tryUseWarp() {
    if (this.warpCooldown > 0) return false;
    const unit = this.pm.activeUnit;
    const hit = this.zm.warps.find((w) => aabbIntersect(unit, w));
    if (!hit) return false;
    this.warpPrompt = hit;
    if (!this.input.wasPressed('arrowup')) return false;
    this._teleport(hit.targetIndex, 'auto');
    this.warpPrompt = null;
    return true;
  }

  start() { requestAnimationFrame((t) => this._loop(t)); }

  _loop(timestamp) {
    const dt = this.lastTime ? Math.min(50, timestamp - this.lastTime) : 16;
    this.lastTime = timestamp;
    if (!this.ui.isCreating && this.pm.partyIds.length > 0) this.update(dt);
    this.render();
    this.input.endFrame();
    requestAnimationFrame((t) => this._loop(t));
  }

  update(dt) {
    this.elapsed += dt;
    this.warpCooldown = Math.max(0, this.warpCooldown - dt);
    this._handleGlobalKeys();
    this.warpPrompt = null;
    const warped = this._tryUseWarp();
    this._updateActiveUnit(dt, warped);
    this._updateCompanions(dt);
    this._updateEnemies(dt);
    this._updateProjectiles(dt);
    this._checkDowned();
    this._updateSynergies();
    this._syncFamilyProgress();
    this._tickCooldowns(dt);
    this._tickAutosave(dt);
    this._updateBgmTheme(dt);
    this.stats.tick(dt);
    this.stats.zonesVisited.add(this.zm.def.id);
    this._tickAutoPotion(dt);
    this.zm.update(dt);
    if (this.zm.index === this.tower.zoneIndex && this.tower.update(dt, this.zm.enemies)) this._advanceTowerFloor();
    this.effects.update(dt);
    this.zm.enemies.forEach((e) => {
      e.hitFlash = Math.max(0, (e.hitFlash || 0) - dt);
      e.attackAnim = Math.max(0, (e.attackAnim || 0) - dt);
    });

    this.renderer.updateCamera(this.pm.activeUnit, this.zm.width);
    this.ui._hudDt = dt;
    this.ui.refreshPartyHUD();
    this.ui.refreshTargetBar();
    if (!document.getElementById('quest-window').classList.contains('hidden')) this.ui.refreshQuest();
  }

  _handleGlobalKeys() {
    const { input, ui, pm } = this;
    if (input.wasPressed('tab')) { pm.cycleActive(); ui.rebuildPartySlots(); ui.refreshOpenWindows(); }
    if (input.wasPressed('v')) {
      pm.activeUnit.cycleStance();
      ui.rebuildPartySlots();
      if (!document.getElementById('char-info-window').classList.contains('hidden')) ui.refreshCharInfo();
      ui.logChat(`${pm.activeUnit.name} 스탠스 전환: ${pm.activeUnit.stance.name}`, 'system');
    }
    SLOT_SKILL_KEYS.forEach((keys, slotIndex) => {
      keys.forEach((key, skillIdx) => {
        if (input.wasPressed(key)) this._useHotbarSlot(slotIndex, skillIdx);
      });
    });
    // 1/2/3 — 조작 캐릭터의 무기 세트 교체(= 전투 중 스탠스 전환)
    for (let i = 0; i < WEAPON_SET_COUNT; i++) {
      if (input.wasPressed(String(i + 1))) this._swapWeaponSet(i);
    }
    if (input.wasPressed('r')) this._useSignature(pm.activeUnit, true);
    if (input.wasPressed('i')) ui.toggleWindow('inventory-window');
    if (input.wasPressed('j')) ui.toggleWindow('quest-window');
    if (input.wasPressed('b')) ui.toggleWindow('barracks-window');
    if (input.wasPressed('t')) ui.toggleWindow('teleport-window');
    if (input.wasPressed('g')) ui.toggleWindow('tower-window');
    if (input.wasPressed('o')) ui.toggleWindow('settings-window');
    if (input.wasPressed('f')) ui.toggleWindow('family-window');
    if (input.wasPressed('alt+e')) ui.toggleWindow('char-info-window');
    if (input.wasPressed('escape')) ui.closeTopWindow();
  }

  // 무기 세트 교체. 세트마다 무기가 달라 스탠스·사거리·스킬이 통째로 바뀐다.
  _swapWeaponSet(index) {
    const unit = this.pm.activeUnit;
    if (!unit || unit.downed) return;
    if (index === unit.activeSet) return;
    if (unit.setSwapCooldown > 0) {
      this.ui.logChat(`무기 교체 대기 중 — ${(unit.setSwapCooldown / 1000).toFixed(1)}초`, 'system');
      return;
    }
    if (!unit.swapWeaponSet(index)) return;
    this.effects.swap(unit);
    this.audio.swap();
    this.ui.logChat(`${unit.name} 세트 ${index + 1} 장착 — ${unit.stance.name}`, 'system');
    this.ui.rebuildPartySlots();
    this.ui.refreshOpenWindows();
  }

  // 조작 캐릭터: 방향키를 누르면 수동 이동, 안 누르면 자동전투 모드(off/keep/hold)를 따른다.
  _updateActiveUnit(dt, warpedThisFrame = false) {
    const unit = this.pm.activeUnit;
    if (!unit) return;
    if (unit.downed) { unit.vx = 0; this._applyPhysics(unit, dt); return; }
    const speed = MOVE_SPEED * unit.stance.moveSpeedMult * (1 + (unit.bonus || EMPTY_FAMILY_BONUS).moveSpeed);
    const manualLeft = this.input.isDown('arrowleft');
    const manualRight = this.input.isDown('arrowright');

    if (manualLeft || manualRight) {
      unit.vx = manualLeft ? -speed : speed;
      unit.facing = manualLeft ? -1 : 1;
    } else {
      this._runAutoMode(unit, dt);
    }
    // 워프로 이동한 프레임에는 ↑가 소모됐으므로 점프하지 않는다.
    if (!warpedThisFrame && this.input.wasPressed('arrowup') && unit.grounded) {
      unit.vy = JUMP_VELOCITY; unit.grounded = false;
    }
    // ↓ : 발판 위에 있을 때 아래층으로 내려간다.
    if (this.input.wasPressed('arrowdown') && unit.grounded && this._standingOnPlatform(unit)) {
      unit.dropTimer = 220;
      unit.grounded = false;
    }

    this._applyPhysics(unit, dt);
    unit.x = clamp(unit.x, 0, this.zm.width - unit.width);

    if (this.input.wasPressed(' ') && unit.basicAtkCooldown <= 0) {
      const target = this._getAttackTarget(unit);
      if (target) {
        performBasicAttack(unit, target, (u, t, dmg, crit, color) => this._spawnProjectile(u, t, dmg, crit, color));
        unit.basicAtkCooldown = 450 / (1 + (unit.bonus || EMPTY_FAMILY_BONUS).atkSpeed);
        this._checkEnemyDeath(target, unit);
      }
    }
  }

  // HP가 0이면 전투 불능. 전원이 쓰러지면 가장 가까운 마을로 귀환한다.
  _checkDowned() {
    let changed = false;
    this.pm.partyUnits.forEach((unit) => {
      if (unit.hp > 0 || unit.downed) return;
      unit.downed = true;
      unit.vx = 0;
      changed = true;
      this.stats.deaths += 1;
      this.effects.damage(unit.x + unit.width / 2, unit.y - 6, 0, { text: 'DOWN', color: '#e74c3c', crit: true });
      this.audio.down();
      this.ui.logChat(`${unit.name}(이)가 쓰러졌습니다. 마을에서 회복됩니다.`, 'system');
    });

    const alive = this.pm.partyUnits.filter((u) => !u.downed);
    if (alive.length === 0 && this.pm.partyIds.length > 0 && this.tower.active) {
      this._exitTower(false);
      return;
    }
    if (alive.length === 0 && this.pm.partyIds.length > 0) {
      this.ui.logChat('파티 전원이 쓰러져 마을로 돌아갑니다.', 'system');
      const townIndex = this._nearestTownIndex();
      // 이미 마을이면 존 이동이 일어나지 않으므로 회복만 따로 처리한다.
      if (townIndex === this.zm.index) this._reviveAll();
      else this._teleport(townIndex);
      return;
    }
    if (changed && this.pm.activeUnit && this.pm.activeUnit.downed) {
      const idx = this.pm.partyUnits.findIndex((u) => !u.downed);
      if (idx >= 0) { this.pm.activeIndex = idx; this.ui.logChat(`${this.pm.activeUnit.name}(으)로 전환.`, 'system'); }
    }
    if (changed) this.ui.rebuildPartySlots();
  }

  _updateSynergies() {
    // 가문 특성은 전 캐릭터 공통이고, 고유 특성·전용기 버프는 캐릭터마다 다르다.
    // 셋을 합쳐 unit.bonus 하나로 만들어두면 데미지·이동·공속 계산이 그 값만 보면 된다.
    const famBonus = this.fm.bonus();
    this.pm.partyUnits.forEach((u) => { u.bonus = mergeBonuses(famBonus, u.personalBonus()); });
    const active = this.pm.recomputeSynergies();
    const key = active.map((s) => s.id).join(',');
    if (key === this.synergyKey) return;
    this.synergyKey = key;
    if (active.length > 0) {
      this.ui.logChat(`[파티 시너지] ${active.map((s) => s.name).join(' · ')}`, 'party');
    }
    this.ui.refreshOpenWindows();
  }

  _nearestTownIndex(fromIndex = this.zm.index) {
    let best = 0; let bestDist = Infinity;
    ZONE_DATA.forEach((z, i) => {
      if (z.type !== 'town') return;
      const d = Math.abs(i - fromIndex);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  _reviveAll() {
    let revived = 0;
    this.pm.units.forEach((unit) => {
      if (!unit.downed && unit.hp >= unit.maxHp) return;
      if (unit.downed) revived += 1;
      unit.downed = false;
      unit.hp = unit.maxHp;
      unit.mp = unit.maxMp;
    });
    if (revived > 0) this.ui.logChat(`마을에서 ${revived}명이 회복했습니다.`, 'system');
    this.ui.rebuildPartySlots();
  }

  // 존 성격에 맞는 BGM으로 갈아탄다. 보스가 붙으면 전투곡으로 바뀐다.
  _updateBgmTheme(dt) {
    this.bgmCheckTimer = (this.bgmCheckTimer || 0) - dt;
    if (this.bgmCheckTimer > 0) return;
    this.bgmCheckTimer = 500;
    const bossEngaged = this.zm.enemies.some((e) => e.boss && e.alive && e.provoked);
    if (bossEngaged) { this.audio.setTheme('boss'); return; }
    if (this.zm.def.type === 'tower') { this.audio.setTheme('tower'); return; }
    this.audio.setTheme(this.zm.isTown ? 'town' : 'field');
  }

  // 자동 물약: 자동전투가 핵심인 게임이라 회복까지 손으로 하면 흐름이 끊긴다.
  // 0.8초에 한 번만 검사하고, 한 번에 한 명씩만 먹인다(물약이 한꺼번에 녹지 않도록).
  _tickAutoPotion(dt) {
    this.potionTimer = (this.potionTimer || 0) - dt;
    if (this.potionTimer > 0) return;
    this.potionTimer = 800;
    const cfg = SettingsManager.values;
    if (!cfg.autoPotion) return;
    for (const unit of this.pm.partyUnits) {
      if (unit.downed || unit.hp <= 0) continue;
      if (unit.hp / unit.maxHp < cfg.hpThreshold && this.pm.itemCount('hp_potion') > 0) {
        if (this.pm.useConsumable('hp_potion', unit)) { this.ui.refreshOpenWindows(); return; }
      }
      if (unit.mp / unit.maxMp < cfg.mpThreshold && this.pm.itemCount('mp_potion') > 0) {
        if (this.pm.useConsumable('mp_potion', unit)) { this.ui.refreshOpenWindows(); return; }
      }
    }
  }

  _tickAutosave(dt) {
    this.autosaveTimer = (this.autosaveTimer || 0) - dt;
    if (this.autosaveTimer > 0) return;
    this.autosaveTimer = AUTOSAVE_MS;
    SaveManager.save(this);
  }

  _standingOnPlatform(unit) {
    const bottom = unit.y + unit.height;
    return this.zm.platforms.some((p) => unit.x + unit.width > p.x && unit.x < p.x + p.width
      && Math.abs(bottom - p.y) < 6);
  }

  _runAutoMode(unit, dt) {
    if (unit.downed) { unit.vx = 0; return; }
    if (unit.autoMode === 'off') { unit.vx = 0; return; }
    const aliveBefore = this.zm.enemies.filter((e) => e.alive);
    const spawn = (u, t, dmg, crit, color) => this._spawnProjectile(u, t, dmg, crit, color);
    const cast = (u, t) => this._tryAutoSkill(u, t);
    if (unit.autoMode === 'keep') updateKeepAI(unit, this.zm.enemies, dt, spawn, this.zm.platforms, cast);
    else updateHoldAI(unit, this.zm.enemies, dt, spawn, cast);
    aliveBefore.forEach((e) => { if (!e.alive) this._checkEnemyDeath(e, unit); });
  }

  _updateCompanions(dt) {
    const leader = this.pm.activeUnit;
    this.pm.partyUnits.forEach((unit, i) => {
      if (i === this.pm.activeIndex) return;
      // 리더와 너무 멀어지면 사냥을 멈추고 따라붙는다(홀드 모드는 제자리 유지가 목적이므로 제외).
      const gap = (leader.x + leader.width / 2) - (unit.x + unit.width / 2);
      if (unit.autoMode !== 'hold' && Math.abs(gap) > FOLLOW_DISTANCE) {
        const dir = Math.sign(gap);
        unit.vx = FOLLOW_SPEED * dir;
        unit.facing = dir;
      } else {
        this._runAutoMode(unit, dt);
      }
      this._applyPhysics(unit, dt);
      unit.x = clamp(unit.x, 0, this.zm.width - unit.width);
    });
  }

  // 파티 슬롯별 스킬 사용(1번 QWE / 2번 ASD / 3번 ZXC). 조작 캐릭터가 아니어도 쓸 수 있다.
  _useHotbarSlot(slotIndex, skillIdx) {
    const unit = this.pm.partyUnits[slotIndex];
    if (!unit) return;
    const skillId = unit.stance.skillIds[skillIdx];
    if (!skillId) return;
    const skillDef = ROLE_SKILLS_DATA[unit.attackType][skillId];
    if (unit.skillLevel(skillId) === 0) {
      this.ui.logChat(`[${skillDef.name}] 미습득 — 스탠스 Lv.${skillDef.reqLevel} 이상에서 스킬포인트로 습득하세요.`, 'system');
      return;
    }
    const target = this._getAttackTarget(unit);
    if (!target) {
      this.ui.logChat(`${unit.name}: 사거리 안에 적이 없습니다.`, 'system');
      return;
    }
    if (!this._castSkill(unit, skillId, target, true)) {
      const cd = Math.ceil((unit.skillCooldowns[skillId] || 0) / 1000);
      const why = cd > 0 ? `재사용까지 ${cd}초` : (unit.mp < skillDef.manaCost ? 'MP 부족' : '조건 불충족');
      this.ui.logChat(`${unit.name}: [${skillDef.name}] 사용 불가 (${why})`, 'system');
    }
  }

  // 자동전투용: 쓸 수 있는 스킬이 있으면 시전한다.
  _tryAutoSkill(unit, target) {
    // 전용기가 준비돼 있으면 먼저 쓴다(가장 강한 한 방이라).
    if (this._useSignature(unit, false)) return true;
    return unit.stance.skillIds.some((skillId) => {
      if (unit.skillLevel(skillId) === 0) return false;
      return this._castSkill(unit, skillId, target, false);
    });
  }

  // 전용기. 캐릭터마다 다른 한 방이고, 강화·회복형은 적이 없어도 쓸 수 있다.
  _useSignature(unit, verbose) {
    if (!unit || unit.downed) return false;
    const sig = unit.signature;
    if (!sig) return false;
    if (!unit.signatureUnlocked) {
      if (verbose) this.ui.logChat(`[${sig.name}]은 Lv.${SIGNATURE_REQ_LEVEL}부터 쓸 수 있습니다.`, 'system');
      return false;
    }
    if (unit.sigCooldown > 0 || unit.mp < sig.manaCost) {
      if (verbose) {
        const why = unit.sigCooldown > 0 ? `재사용까지 ${Math.ceil(unit.sigCooldown / 1000)}초` : 'MP 부족';
        this.ui.logChat(`${unit.name}: [${sig.name}] 사용 불가 (${why})`, 'system');
      }
      return false;
    }
    const needsTarget = sig.kind !== 'buff' && sig.kind !== 'heal';
    const target = needsTarget ? this._getAttackTarget(unit) : null;
    if (needsTarget && !target) {
      if (verbose) this.ui.logChat(`${unit.name}: 사거리 안에 적이 없습니다.`, 'system');
      return false;
    }
    return this._castSignature(unit, sig, target, verbose);
  }

  _castSignature(unit, sig, target, verbose) {
    this.audio.signature();
    unit.mp -= sig.manaCost;
    unit.sigCooldown = sig.cooldownMs;
    unit.attackAnim = 380;
    const color = elementColor(sig.element || unit.stance.element);
    const cx = unit.x + unit.width / 2;

    if (sig.kind === 'buff') {
      this.effects.burst(cx, unit.y + unit.height / 2, 120, color);
      this.pm.partyUnits.forEach((u) => {
        u.addBuff(sig.name, sig.buff, sig.durationMs);
        this.effects.damage(u.x + u.width / 2, u.y - 8, 0, { text: sig.name, color: '#f7dc6f' });
      });
      this.ui.logChat(`${unit.name}의 [${sig.name}]! 파티 강화 ${sig.durationMs / 1000}초`, 'party');
      this.ui.rebuildPartySlots();
      return true;
    }

    if (sig.kind === 'heal') {
      this.effects.burst(cx, unit.y + unit.height / 2, 140, '#2ecc71');
      this.pm.partyUnits.forEach((u) => {
        if (u.downed) return;
        const amount = Math.round(u.maxHp * sig.healPct);
        u.hp = clamp(u.hp + amount, 0, u.maxHp);
        this.effects.damage(u.x + u.width / 2, u.y - 8, amount, { text: `+${amount}`, color: '#2ecc71' });
      });
      this.audio.heal();
      this.ui.logChat(`${unit.name}의 [${sig.name}]! 파티 HP ${Math.round(sig.healPct * 100)}% 회복`, 'party');
      return true;
    }

    unit.facing = target.x >= unit.x ? 1 : -1;
    if (unit.attackType === 'melee') this.effects.slash(unit); else this.effects.cast(unit, color);

    const strike = (enemy, mult) => {
      const r = rollDamage(unit, enemy, mult);
      applyDamageToEnemy(enemy, r.dmg, r.isCrit, r.miss);
      if (!r.miss) applyLifesteal(unit, r.dmg);
      this._checkEnemyDeath(enemy, unit);
      return r.miss ? 0 : r.dmg;
    };

    let total = 0;
    if (sig.kind === 'aoe') {
      this.effects.burst(target.x + target.width / 2, target.y + target.height / 2, sig.aoeRadius, color);
      this._enemiesNear(target, sig.aoeRadius).forEach((t) => { total += strike(t, sig.dmgMult); });
    } else if (sig.kind === 'barrage') {
      for (let i = 0; i < sig.hits && target.alive; i++) total += strike(target, sig.dmgMult);
    } else if (sig.kind === 'chain') {
      this._chainTargets(target, sig.chainCount).forEach((t, i) => {
        if (i > 0) this.effects.spark(t.x + t.width / 2, t.y + t.height / 2, color);
        total += strike(t, sig.dmgMult);
      });
    } else if (sig.kind === 'drain') {
      total = strike(target, sig.dmgMult);
      const heal = Math.round(total * sig.healPct);
      if (heal > 0 && unit.hp < unit.maxHp) {
        unit.hp = clamp(unit.hp + heal, 0, unit.maxHp);
        this.effects.damage(cx, unit.y - 8, heal, { text: `+${heal}`, color: '#2ecc71' });
      }
    } else {
      this.effects.burst(target.x + target.width / 2, target.y + target.height / 2, 60, color);
      total = strike(target, sig.dmgMult);
    }

    if (verbose) this.ui.logChat(`${unit.name}의 전용기 [${sig.name}]! 총 ${total} 피해`, 'system');
    return true;
  }

  // 연쇄기: 첫 대상에서 가까운 순으로 최대 count체를 엮는다.
  _chainTargets(first, count) {
    const rest = this.zm.enemies
      .filter((e) => e.alive && e !== first && sameLevel(first, e))
      .sort((a, b) => Math.abs(a.x - first.x) - Math.abs(b.x - first.x))
      .slice(0, Math.max(0, count - 1));
    return [first, ...rest];
  }

  _castSkill(unit, skillId, target, verbose) {
    const skillDef = ROLE_SKILLS_DATA[unit.attackType][skillId];
    const lv = unit.skillLevel(skillId);
    if (lv === 0) return false;
    if ((unit.skillCooldowns[skillId] || 0) > 0 || unit.mp < skillDef.manaCost) return false;

    const mult = skillDamageMult(skillDef, lv);
    const color = elementColor(skillDef.element || unit.stance.element);
    this.audio.skill(skillDef.element || unit.stance.element);

    if (unit.attackType === 'melee') {
      const dist = Math.abs((target.x + target.width / 2) - (unit.x + unit.width / 2));
      if (dist > unit.stance.range * 1.3 || !sameLevel(unit, target)) return false;
      unit.mp -= skillDef.manaCost;
      unit.skillCooldowns[skillId] = skillDef.cooldownMs;
      unit.attackAnim = 320;
      unit.facing = target.x >= unit.x ? 1 : -1;
      this.effects.slash(unit);
      if (skillDef.type === 'aoe') {
        this.effects.burst(target.x + target.width / 2, target.y + target.height / 2, skillDef.aoeRadius, color);
      }
      const targets = skillDef.type === 'aoe' ? this._enemiesNear(target, skillDef.aoeRadius) : [target];
      targets.forEach((t) => {
        const r = rollDamage(unit, t, mult);
        applyDamageToEnemy(t, r.dmg, r.isCrit, r.miss);
        if (!r.miss) applyLifesteal(unit, r.dmg);
        this._checkEnemyDeath(t, unit);
      });
      if (verbose) this.ui.logChat(`${unit.name}의 [${skillDef.name} Lv.${lv}]! (${targets.length}체 타격)`, 'system');
      return true;
    }

    if (!sameLevel(unit, target)) return false;
    unit.mp -= skillDef.manaCost;
    unit.skillCooldowns[skillId] = skillDef.cooldownMs;
    unit.attackAnim = 320;
    unit.facing = target.x >= unit.x ? 1 : -1;
    this.effects.cast(unit, color);
    const r = rollDamage(unit, target, mult);
    if (r.miss) { applyDamageToEnemy(target, 0, false, true); return true; }
    const { dmg, isCrit } = r;
    const p = this._spawnProjectile(unit, target, dmg, isCrit, color);
    if (skillDef.type === 'aoe') { p.aoeRadius = skillDef.aoeRadius; p.aoeMult = mult; p.casterRef = unit; }
    if (verbose) this.ui.logChat(`${unit.name}의 [${skillDef.name} Lv.${lv}] 시전!`, 'system');
    return true;
  }

  _rollDrops(enemy) {
    const table = DROP_TABLE[enemy.name];
    if (table) {
      let row = 0;
      table.forEach((d) => {
        if (Math.random() > d.chance) return;
        this.pm.addItem(d.id, 1);
        this.audio.pickup();
        this.effects.loot(enemy.x + enemy.width / 2, enemy.y - 14 - row * 14, ITEM_DATA[d.id].name, '#ecf0f1');
        row += 1;
        this.ui.logChat(`${ITEM_DATA[d.id].name} 획득`, 'system');
      });
    }
    const equipId = rollEquipmentDrop(tierFromLevel(this.zm.def.level));
    if (equipId) {
      const gear = this.pm.addGear(equipId);
      this.effects.loot(enemy.x + enemy.width / 2, enemy.y - 44, `[장비] ${gear.item.name}`, TIER_COLOR[gear.tier]);
      this.audio.pickup();
      this.ui.logChat(`[장비 드랍] ${gear.displayName} 획득!`, 'system');
    }
    this.qm.checkItemSteps(); this.gq.checkItemSteps(); this.sm.checkItemSteps();
  }

  _enemiesNear(center, radius) {
    const cx = center.x + center.width / 2;
    return this.zm.enemies.filter((e) => e.alive && Math.abs((e.x + e.width / 2) - cx) <= radius);
  }

  _getAttackTarget(unit) {
    const alive = this.zm.enemies.filter((e) => e.alive);
    if (alive.length === 0) return null;
    if (this.ui.target && this.ui.target.alive) {
      const d = Math.abs((this.ui.target.x + this.ui.target.width / 2) - (unit.x + unit.width / 2));
      if (d <= unit.stance.range * 1.5) return this.ui.target;
    }
    let nearest = null; let nearestDist = Infinity;
    alive.forEach((e) => {
      if (!sameLevel(unit, e)) return; // 층이 다르면 조준하지 않는다
      const d = Math.abs((e.x + e.width / 2) - (unit.x + unit.width / 2));
      if (d < nearestDist && d <= unit.stance.range * 1.5) { nearestDist = d; nearest = e; }
    });
    return nearest;
  }

  // 캐릭터 레벨이 오르면 그만큼 가문 경험치를 준다.
  _syncFamilyProgress() {
    this.pm.units.forEach((u) => {
      const seen = this._seenLevels.get(u.id);
      if (seen === undefined) { this._seenLevels.set(u.id, u.level); return; }
      if (u.level > seen) {
        for (let lv = seen + 1; lv <= u.level; lv++) this.fm.onCharacterLevelUp(lv);
        this._seenLevels.set(u.id, u.level);
      }
    });
  }

  _checkEnemyDeath(enemy, killerUnit) {
    if (enemy.alive || enemy.rewarded) return;
    enemy.rewarded = true;
    this.stats.kills += 1;
    if (enemy.boss) this.stats.bossKills += 1;
    this.qm.onKill(this.zm.def.id, enemy.name);
    this.gq.onKill(this.zm.def.id, enemy.name);
    this.sm.onKill(this.zm.def.id, enemy.name);
    this._rollDrops(enemy);
    const stanceXp = Math.max(1, Math.round(enemy.xpReward * 0.6));
    this.ui.logChat(`${enemy.name} 처치! +${enemy.xpReward} EXP / 스탠스 +${stanceXp}`, 'system');
    const log = (t, tag) => this.ui.logChat(t, tag);
    killerUnit.gainXp(enemy.xpReward, log);
    killerUnit.gainStanceXp(stanceXp, log);
    if (this.ui.target === enemy) this.ui.setTarget(null);
  }

  _updateEnemies(dt) {
    this.zm.enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      enemy.attackCooldownMs -= dt;
      if (enemy.boss) {
        updateBossAI(enemy, this.pm.partyUnits, dt, {
          log: (t, tag) => this.ui.logChat(t, tag),
          partyUnits: this.pm.partyUnits,
          worldWidth: this.zm.width,
          summon: (def) => this.zm.enemies.push(new Enemy(def, this.zm.platforms)),
          bossProjectile: (boss, target, dmg, delay) => this._spawnBossProjectile(boss, target, dmg, delay),
        });
      } else {
        updateEnemyAI(enemy, this.pm.partyUnits, dt, (t, tag) => this.ui.logChat(t, tag));
      }
      enemy.x += enemy.vx * dt / 1000;
      if (enemy.platform) {
        // 2층 몹은 발판 위에 머문다.
        enemy.x = clamp(enemy.x, enemy.platform.x, enemy.platform.x + enemy.platform.width - enemy.width);
        enemy.y = enemy.platform.y - enemy.height;
      } else {
        enemy.x = clamp(enemy.x, 0, this.zm.width - enemy.width);
      }
    });
  }

  _spawnProjectile(ownerUnit, targetEnemy, dmg, isCrit, color) {
    const dir = targetEnemy.x >= ownerUnit.x ? 1 : -1;
    const p = new Projectile(
      ownerUnit.x + ownerUnit.width / 2, ownerUnit.y + ownerUnit.height / 2,
      480 * dir, ownerUnit.uid, dmg, isCrit, color,
    );
    p.targetUid = targetEnemy.uid;
    p.pendingDamage = { dmg, isCrit };
    p.ownerRef = ownerUnit;
    this.projectiles.push(p);
    return p;
  }

  // 보스의 원거리 탄막. 파티원에게 날아가며 맞으면 피해를 준다.
  _spawnBossProjectile(boss, target, dmg, offset) {
    const dir = target.x >= boss.x ? 1 : -1;
    const p = new Projectile(
      boss.x + boss.width / 2 - dir * offset, boss.y + boss.height * 0.4,
      340 * dir, boss.uid, Math.round(dmg), false, '#c0392b',
    );
    p.hostile = true;
    p.life = 2600;
    this.projectiles.push(p);
  }

  _updateProjectiles(dt) {
    this.projectiles.forEach((p) => {
      p.x += p.vx * dt / 1000;
      p.life -= dt;
      if (p.dead) return;
      if (p.hostile) {
        const box = { x: p.x - 6, y: p.y - 6, width: 12, height: 12 };
        const hitUnit = this.pm.partyUnits.find((u) => !u.downed && u.hp > 0 && aabbIntersect(box, u));
        if (hitUnit) {
          p.dead = true;
          hitUnit.hp = Math.max(0, hitUnit.hp - p.dmg);
          hitUnit.hitFlash = 180;
          this.effects.damage(hitUnit.x + hitUnit.width / 2, hitUnit.y - 4, p.dmg, { color: '#ff5a4a' });
          this.effects.spark(hitUnit.x + hitUnit.width / 2, hitUnit.y + hitUnit.height * 0.5, '#ff5a4a');
        }
        return;
      }
      const target = this.zm.enemies.find((e) => e.uid === p.targetUid && e.alive);
      if (!target) { p.dead = true; return; }
      const box = { x: p.x - 5, y: p.y - 5, width: 10, height: 10 };
      if (aabbIntersect(box, target)) {
        p.dead = true;
        applyDamageToEnemy(target, p.pendingDamage.dmg, p.pendingDamage.isCrit);
        if (p.ownerRef) applyLifesteal(p.ownerRef, p.pendingDamage.dmg);
        this._checkEnemyDeath(target, p.ownerRef);
        if (p.aoeRadius) {
          this.effects.burst(target.x + target.width / 2, target.y + target.height / 2, p.aoeRadius, p.color);
          this._enemiesNear(target, p.aoeRadius).forEach((t) => {
            if (t === target) return;
            const splash = rollDamage(p.casterRef, t, p.aoeMult);
            applyDamageToEnemy(t, splash.dmg, splash.isCrit);
            this._checkEnemyDeath(t, p.ownerRef);
          });
        }
      }
    });
    this.projectiles = this.projectiles.filter((p) => !p.dead && p.life > 0 && p.x > -50 && p.x < this.zm.width + 50);
  }

  _tickCooldowns(dt) {
    this.pm.units.forEach((unit) => {
      unit.basicAtkCooldown = Math.max(0, unit.basicAtkCooldown - dt);
      unit.setSwapCooldown = Math.max(0, (unit.setSwapCooldown || 0) - dt);
      unit.sigCooldown = Math.max(0, (unit.sigCooldown || 0) - dt);
      if (unit.tickBuffs(dt)) this.ui.rebuildPartySlots();
      unit.attackAnim = Math.max(0, (unit.attackAnim || 0) - dt);
      unit.hitFlash = Math.max(0, (unit.hitFlash || 0) - dt);
      Object.keys(unit.skillCooldowns).forEach((k) => {
        unit.skillCooldowns[k] = Math.max(0, unit.skillCooldowns[k] - dt);
      });
      if (unit.downed || unit.hp <= 0) return; // 쓰러진 캐릭터는 저절로 회복되지 않는다
      // 초당 MP 5% / HP 2% 회복
      const sec = dt / 1000;
      if (unit.mp < unit.maxMp) unit.mp = clamp(unit.mp + sec * 0.05 * unit.maxMp, 0, unit.maxMp);
      if (unit.hp < unit.maxHp) unit.hp = clamp(unit.hp + sec * 0.02 * unit.maxHp, 0, unit.maxHp);
    });
  }

  _applyPhysics(unit, dt) {
    const prevBottom = unit.y + unit.height;
    unit.dropTimer = Math.max(0, unit.dropTimer - dt);
    unit.vy += GRAVITY * dt / 1000;
    unit.x += unit.vx * dt / 1000;
    unit.y += unit.vy * dt / 1000;

    // 2층 발판은 위에서 내려올 때만 착지한다(아래에서 점프해 통과, ↓로 내려갈 때도 통과).
    let landed = false;
    if (unit.vy >= 0 && unit.dropTimer <= 0) {
      const bottom = unit.y + unit.height;
      this.zm.platforms.forEach((p) => {
        const overlapX = unit.x + unit.width > p.x && unit.x < p.x + p.width;
        if (overlapX && prevBottom <= p.y + 2 && bottom >= p.y) {
          unit.y = p.y - unit.height;
          unit.vy = 0;
          landed = true;
        }
      });
    }

    const floorY = GROUND_Y - unit.height;
    if (!landed && unit.y >= floorY) { unit.y = floorY; unit.vy = 0; landed = true; }
    unit.grounded = landed;
  }

  _handleWorldClick(wx, wy) {
    const inBox = (n) => wx >= n.x && wx <= n.x + n.width && wy >= n.y && wy <= n.y + n.height;
    if (this.zm.questBoard && inBox(this.zm.questBoard)) { this.ui.openBoard(); return; }
    if (this.zm.shopNpc && inBox(this.zm.shopNpc)) { this.ui.openShop(this.zm.shopNpc); return; }
    const story = this.zm.storyNpcs.find(inBox);
    if (story) { this.ui.showStoryDialogue(story); return; }
    const npc = this.zm.recruitNpcs.find(inBox);
    if (npc) { this.ui.showNpcDialogue(npc); return; }
    const hit = this.zm.enemies.find((e) => e.alive && wx >= e.x && wx <= e.x + e.width && wy >= e.y && wy <= e.y + e.height);
    this.ui.setTarget(hit || null);
  }

  // 영입 NPC 머리 위 표시를 진행 상태에 맞춘다.
  _recruitStatusMap() {
    const out = {};
    this.zm.recruitNpcs.forEach((npc) => {
      if (this.pm.units.has(npc.charId) || this.qm.isCompleted(npc.charId)) { out[npc.charId] = 'done'; return; }
      const quest = this.qm.find(npc.charId);
      if (!quest) { out[npc.charId] = 'available'; return; }
      out[npc.charId] = this.qm.isReady(quest) ? 'ready' : 'active';
    });
    return out;
  }

  render() {
    this.renderer.draw({
      groundColor: this.zm.groundColor,
      theme: this.zm.def.theme,
      effects: this.effects,
      target: this.ui.target,
      recruitNpcs: this.zm.recruitNpcs,
      storyNpcs: this.zm.storyNpcs,
      shopNpc: this.zm.shopNpc,
      questBoard: this.zm.questBoard,
      boardHasQuest: !!this.zm.questBoard && (
        this.gq.availableIn(this.zm.def.id, Math.max(...this.pm.partyUnits.map((u) => u.level), 1))
          .some((d) => !this.gq.isActive(d.id))
        || this.gq.active.some((q) => this.gq.isReady(q))),
      activeStoryNpcId: this.sm.step && this.sm.step.type === 'talk' ? this.sm.step.npcId : null,
      enemies: this.zm.enemies,
      warps: this.zm.warps,
      warpPrompt: this.warpPrompt,
      platforms: this.zm.platforms,
      partyUnits: this.pm.partyUnits,
      partyLevel: Math.max(1, ...this.pm.partyUnits.map((u) => u.level)),
      recruitStatus: this._recruitStatusMap(),
      activeIndex: this.pm.activeIndex,
      projectiles: this.projectiles,
      time: this.elapsed,
    });
    this.renderer.drawMinimap(document.getElementById('minimap-canvas'), {
      partyUnits: this.pm.partyUnits,
      enemies: this.zm.enemies,
      recruitNpcs: this.zm.recruitNpcs,
      warps: this.zm.warps,
      worldWidth: this.zm.width,
    });
  }
}
