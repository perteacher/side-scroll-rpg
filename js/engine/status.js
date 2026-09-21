// 상태이상 로직. 몹과 파티원 둘 다 같은 함수로 건다(대상에 statuses 맵을 붙인다).

function _statusMap(target) {
  if (!target.statuses) target.statuses = {};
  return target.statuses;
}

function hasStatus(target, id) { return !!(target && target.statuses && target.statuses[id]); }

function isHardCc(target) { return hasStatus(target, 'stun') || hasStatus(target, 'freeze'); }

function statusSlow(target) {
  if (!hasStatus(target, 'chill')) return 0;
  return STATUS_DATA.chill.slow * (target.boss ? STATUS_BOSS_SLOW_MULT : 1);
}

function statusDamageTakenMult(target) {
  let mult = 1;
  if (target && target.statuses) {
    Object.keys(target.statuses).forEach((id) => { mult += STATUS_DATA[id].dmgTaken || 0; });
  }
  return mult;
}

function statusDefenseMult(target) {
  return hasStatus(target, 'armor_break') ? 1 - STATUS_DATA.armor_break.defDown : 1;
}

function clearStatuses(target) {
  target.statuses = {};
  target.ccImmuneMs = 0;
}

// 표시 순서대로 정렬한 목록
function statusList(target) {
  if (!target || !target.statuses) return [];
  return STATUS_ORDER.filter((id) => target.statuses[id]).map((id) => ({ ...target.statuses[id], def: STATUS_DATA[id] }));
}

// 파티원의 상태이상 저항 확률. 캐릭터 정보창의 "상태이상 저항" 수치를 실제로 쓴다.
function statusResistChance(unit) {
  if (!unit.stats) return 0;
  const bon = unit.bonus || EMPTY_FAMILY_BONUS;
  return clamp(computeFullSheet(unit).defense.statusResist / 400 + bon.resist, 0, 0.75);
}

function _statusFloat(target, text, color) {
  if (EFFECTS) EFFECTS.damage(target.x + target.width / 2, target.y - 16, 0, { text, color });
}

// opts: chance(생략 시 확정) / durationMs / hitDmg(도트 피해 기준) / source(도트로 잡았을 때 보상 받을 유닛)
function applyStatus(target, id, opts = {}) {
  const def = STATUS_DATA[id];
  if (!def || !target) return false;
  if (target.alive === false || target.downed || target.hp <= 0) return false;
  if (opts.chance !== undefined && Math.random() >= opts.chance) return false;
  if (target.stats && Math.random() < statusResistChance(target)) { _statusFloat(target, '저항', '#95a5a6'); return false; }

  let duration = opts.durationMs || def.durationMs;
  if (def.hardCc) {
    if ((target.ccImmuneMs || 0) > 0) return false;
    if (target.boss) {
      duration *= STATUS_BOSS_CC_MULT;
      target.ccImmuneMs = duration + STATUS_CC_IMMUNE_MS;
    }
  }

  const map = _statusMap(target);
  const tickDmg = def.dot ? Math.max(1, Math.round((opts.hitDmg || 0) * def.dot)) : 0;
  const cur = map[id];
  if (cur) {
    // 다시 걸리면 시간 갱신 + 중첩. 새 글자는 띄우지 않는다(연타 중 화면이 글자로 덮이지 않게).
    cur.remaining = Math.max(cur.remaining, duration);
    cur.duration = Math.max(cur.duration, cur.remaining);
    cur.stacks = Math.min(def.maxStacks || 1, cur.stacks + 1);
    cur.tickDmg = Math.max(cur.tickDmg, tickDmg);
    if (opts.source) cur.source = opts.source;
    return true;
  }
  map[id] = { id, remaining: duration, duration, stacks: 1, tickTimer: def.tickMs || 0, tickDmg, source: opts.source || null };
  if (def.hardCc) target.vx = 0;
  _statusFloat(target, `${def.name}!`, def.color);
  if (SOUND && SOUND.status) SOUND.status(id);
  return true;
}

// 스킬·전용기·기본 공격의 상태이상 목록을 굴린다. 스킬 레벨이 오를수록 확률이 오른다.
function rollStatuses(target, list, { lv = 1, hitDmg = 0, source = null } = {}) {
  if (!list || list.length === 0 || !target || target.alive === false) return;
  list.forEach((s) => {
    const chance = Math.min(1, s.chance + STATUS_CHANCE_PER_SKILL_LV * (lv - 1));
    applyStatus(target, s.id, { chance, hitDmg, source });
  });
}

// 시간 경과. 도트 틱마다 onDot(target, dmg, def, source)을 부른다.
function tickStatuses(target, dt, onDot) {
  if (target.ccImmuneMs > 0) target.ccImmuneMs = Math.max(0, target.ccImmuneMs - dt);
  const map = target.statuses;
  if (!map) return;
  Object.keys(map).forEach((id) => {
    const s = map[id];
    if (!s) return;
    const def = STATUS_DATA[id];
    if (def.dot) {
      s.tickTimer -= dt;
      while (s.tickTimer <= 0 && s.remaining > 0) {
        s.tickTimer += def.tickMs;
        if (target.alive === false || target.downed) break;
        if (onDot) onDot(target, s.tickDmg * s.stacks, def, s.source);
      }
    }
    s.remaining -= dt;
    if (s.remaining <= 0) delete map[id];
  });
}

// 도트가 파티원에게 들어갈 때(보스 화상 등)
function applyDotToUnit(unit, dmg, def) {
  if (unit.downed || unit.hp <= 0) return;
  unit.hp = Math.max(0, unit.hp - dmg);
  if (EFFECTS) EFFECTS.damage(unit.x + unit.width / 2, unit.y - 4, dmg, { color: def.color });
}
