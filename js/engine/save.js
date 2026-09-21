// localStorage 저장/불러오기. 새로고침해도 성장·장비·진행이 유지된다.
const SAVE_KEY = 'maple_granado_save_v1';
const AUTOSAVE_MS = 10000;

function serializeGear(gear) {
  return { itemId: gear.itemId, star: gear.star, failStreak: gear.failStreak, potential: gear.potential };
}

// 구버전 세이브: 강화 수치(plus)는 별로 옮기고(티어 상한까지), 인챈트는 잠재능력으로 바꿔 준다.
const LEGACY_STRONG_ENCHANTS = ['brutal', 'immortal', 'deadly'];

function reviveGear(data) {
  // 개편으로 사라진 아이템 id가 세이브에 남아 있을 수 있다. 모르는 장비는 버린다.
  if (!ITEM_DATA[data.itemId]) return null;
  const gear = new Gear(data.itemId);
  gear.star = clamp(data.star ?? data.plus ?? 0, 0, gear.maxStar);
  gear.failStreak = data.failStreak || 0;
  if (data.potential) gear.potential = data.potential;
  else if (data.enchant) gear.potential = rollPotential(gear, LEGACY_STRONG_ENCHANTS.includes(data.enchant) ? 2 : 1);
  return gear;
}

const SaveManager = {
  hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  },

  clear() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 저장소 사용 불가 */ }
  },

  save(game) {
    // 파티가 없으면 저장하지 않는다(빈 세이브가 남으면 첫 실행 판정이 흐려진다).
    if (game.pm.partyIds.length === 0) return false;
    // 초기화 직후에는 어떤 경로로도 다시 쓰지 않는다(리로드 전 자동저장 방지).
    if (game.resetting) return false;
    const { pm, zm, qm, sm } = game;
    const data = {
      v: 1,
      gold: pm.gold,
      zoneIndex: zm.index,
      partyIds: [...pm.partyIds],
      activeIndex: pm.activeIndex,
      units: [...pm.units.values()].map((u) => ({
        id: u.id,
        kind: u.isPlayerCreated ? 'class' : 'char',
        defId: u.isPlayerCreated
          ? CLASS_DATA.find((c) => c.name === u.className).id
          : CHARACTER_DATA.find((c) => c.name === u.name).id,
        nickname: u.isPlayerCreated ? u.name : null,
        level: u.level,
        rank: u.rank || 0,
        xp: u.xp,
        hp: u.hp,
        mp: u.mp,
        downed: !!u.downed,
        autoMode: u.autoMode,
        currentStanceIndex: u.currentStanceIndex,
        stanceProgress: u.stanceProgress,
        equipment: Object.fromEntries(EQUIP_SLOTS.map((s) => [s, u.equipment[s] ? serializeGear(u.equipment[s]) : null])),
        activeSet: u.activeSet,
        weaponSets: u.weaponSets.map((pair) => pair.map((g) => (g ? serializeGear(g) : null))),
      })),
      gear: pm.gear.map(serializeGear),
      items: [...pm.items.entries()],
      quests: {
        totalKills: qm.totalKills,
        completed: [...qm.completed],
        active: qm.active.map((q) => ({
          charId: q.charId, charName: q.charName, tier: q.tier,
          stepIndex: q.stepIndex, huntCount: q.huntCount,
        })),
      },
      generalQuests: { active: game.gq.active.map((q) => ({ ...q })), cleared: { ...game.gq.cleared } },
      family: {
        level: game.fm.level, xp: game.fm.xp, allocations: { ...game.fm.allocations },
      },
      seenLevels: [...(game._seenLevels || new Map())],
      tower: { bestFloor: game.tower.bestFloor },
      levelRewards: [...game.claimedLevelRewards],
      stats: game.stats.serialize(),
      collection: game.collection.serialize(),
      scenario: {
        chapterIndex: sm.chapterIndex, stepIndex: sm.stepIndex,
        huntCount: sm.huntCount, finished: sm.finished,
      },
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  },

  load(game) {
    let data;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      data = JSON.parse(raw);
    } catch (e) {
      return false;
    }
    if (!data || data.v !== 1 || !data.units || data.units.length === 0) return false;

    const { pm, zm, qm, sm } = game;
    pm.units.clear();
    pm.gear.length = 0;
    pm.items.clear();
    pm.gold = data.gold;

    data.units.forEach((ud) => {
      const def = ud.kind === 'class'
        ? CLASS_DATA.find((c) => c.id === ud.defId)
        : CHARACTER_DATA.find((c) => c.id === ud.defId);
      if (!def) return;
      const unit = new PartyUnit(def, { nickname: ud.nickname, autoMode: ud.autoMode });
      unit.id = ud.id;
      unit.level = ud.level;
      // 승급 등급. 예전 세이브에는 없으니 레벨에서 되짚는다.
      unit.rank = ud.rank !== undefined ? ud.rank : rankFromLevel(ud.level);
      unit.xp = ud.xp;
      unit.currentStanceIndex = ud.currentStanceIndex || 0;
      unit.downed = !!ud.downed;
      // 이 캐릭터가 실제로 가진 스탠스만 되살린다. 클래스 구성이 바뀌면(스카우트가 힐러가 된 것처럼)
      // 옛 세이브에 남은 스탠스 기록이 스탯 합산에 계속 끼어들기 때문이다.
      if (ud.stanceProgress) {
        Object.keys(unit.stanceProgress).forEach((sid) => {
          if (ud.stanceProgress[sid]) unit.stanceProgress[sid] = ud.stanceProgress[sid];
        });
      }
      unit.invalidateStats();
      // 무기 세트가 저장돼 있으면 그쪽을 쓰고, 구버전 세이브는 장비 슬롯을 세트1로 옮겨 담는다.
      if (ud.weaponSets) {
        unit.activeSet = clamp(ud.activeSet || 0, 0, WEAPON_SET_COUNT - 1);
        for (let i = 0; i < WEAPON_SET_COUNT; i++) {
          const pair = ud.weaponSets[i] || [null, null];
          unit.weaponSets[i] = [0, 1].map((j) => (pair[j] ? reviveGear(pair[j]) : null));
        }
      } else {
        unit.activeSet = 0;
        unit.weaponSets.forEach((pair) => { pair[0] = null; pair[1] = null; });
      }
      EQUIP_SLOTS.forEach((slot) => {
        if (ud.weaponSets && WEAPON_SLOTS.includes(slot)) return;
        unit.equipment[slot] = ud.equipment && ud.equipment[slot] ? reviveGear(ud.equipment[slot]) : null;
      });
      unit.maxHp = unit._calcMaxHp();
      unit.maxMp = unit._calcMaxMp();
      unit.hp = clamp(ud.hp, 0, unit.maxHp);
      unit.mp = clamp(ud.mp, 0, unit.maxMp);
      pm.units.set(unit.id, unit);
    });

    pm.partyIds = (data.partyIds || []).filter((id) => pm.units.has(id));
    pm.activeIndex = clamp(data.activeIndex || 0, 0, Math.max(0, pm.partyIds.length - 1));
    (data.gear || []).forEach((g) => { const gear = reviveGear(g); if (gear) pm.gear.push(gear); });
    (data.items || []).forEach(([id, count]) => { if (ITEM_DATA[id]) pm.items.set(id, count); });

    qm.totalKills = data.quests.totalKills || 0;
    qm.completed = new Set(data.quests.completed || []);
    qm.active = (data.quests.active || []).map((q) => ({
      ...q,
      steps: makeRecruitSteps(q.tier, q.charName),
    }));

    if (data.generalQuests) {
      game.gq.active = (data.generalQuests.active || []).filter((q) => game.gq.def(q.id));
      game.gq.cleared = data.generalQuests.cleared || {};
    }
    if (data.family) {
      game.fm.level = data.family.level || 1;
      game.fm.xp = data.family.xp || 0;
      FAMILY_TRAITS.forEach((t) => {
        game.fm.allocations[t.id] = (data.family.allocations || {})[t.id] || 0;
      });
    }
    // 레벨업 감지 기준선을 복원해야 로드 직후 가문 경험치가 중복 지급되지 않는다.
    game._seenLevels = new Map(data.seenLevels || []);

    sm.chapterIndex = data.scenario.chapterIndex || 0;
    sm.stepIndex = data.scenario.stepIndex || 0;
    sm.huntCount = data.scenario.huntCount || 0;
    sm.finished = !!data.scenario.finished;

    if (data.tower) game.tower.bestFloor = data.tower.bestFloor || 0;
    game.claimedLevelRewards = new Set(data.levelRewards || []);
    game.stats.restore(data.stats);
    game.collection.restore(data.collection);
    pm.units.forEach((u) => u.invalidateStats());

    // 탑 도전은 저장되지 않는다. 탑에서 저장된 게임은 가까운 마을에서 다시 시작한다.
    let zoneIndex = clamp(data.zoneIndex || 0, 0, ZONE_DATA.length - 1);
    if (ZONE_DATA[zoneIndex].type === 'tower') zoneIndex = game._nearestTownIndex(zoneIndex);
    zm._load(zoneIndex, false);
    return pm.partyIds.length > 0;
  },
};
