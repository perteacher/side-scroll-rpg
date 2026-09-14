// localStorage 저장/불러오기. 새로고침해도 성장·장비·진행이 유지된다.
const SAVE_KEY = 'maple_granado_save_v1';
const AUTOSAVE_MS = 10000;

function serializeGear(gear) {
  return { itemId: gear.itemId, plus: gear.plus, enchant: gear.enchant ? gear.enchant.id : null };
}

function reviveGear(data) {
  const gear = new Gear(data.itemId);
  gear.plus = data.plus || 0;
  gear.enchant = data.enchant ? ENCHANT_DATA.find((e) => e.id === data.enchant) || null : null;
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
        xp: u.xp,
        hp: u.hp,
        mp: u.mp,
        downed: !!u.downed,
        autoMode: u.autoMode,
        currentStanceIndex: u.currentStanceIndex,
        stanceProgress: u.stanceProgress,
        equipment: Object.fromEntries(EQUIP_SLOTS.map((s) => [s, u.equipment[s] ? serializeGear(u.equipment[s]) : null])),
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
      unit.xp = ud.xp;
      unit.currentStanceIndex = ud.currentStanceIndex || 0;
      unit.downed = !!ud.downed;
      if (ud.stanceProgress) Object.assign(unit.stanceProgress, ud.stanceProgress);
      EQUIP_SLOTS.forEach((slot) => {
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
    (data.gear || []).forEach((g) => pm.gear.push(reviveGear(g)));
    (data.items || []).forEach(([id, count]) => pm.items.set(id, count));

    qm.totalKills = data.quests.totalKills || 0;
    qm.completed = new Set(data.quests.completed || []);
    qm.active = (data.quests.active || []).map((q) => ({
      ...q,
      steps: makeRecruitSteps(q.tier, q.charName),
    }));

    sm.chapterIndex = data.scenario.chapterIndex || 0;
    sm.stepIndex = data.scenario.stepIndex || 0;
    sm.huntCount = data.scenario.huntCount || 0;
    sm.finished = !!data.scenario.finished;

    zm._load(clamp(data.zoneIndex || 0, 0, ZONE_DATA.length - 1), false);
    return pm.partyIds.length > 0;
  },
};
