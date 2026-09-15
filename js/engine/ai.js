// 킵 모드: 층과 무관하게 가장 가까운 적을 목표로 삼고, 층이 다르면 층을 옮겨 쫓아간다.
function updateKeepAI(unit, enemies, dt, spawnProjectile, platforms = [], tryCastSkill = null) {
  const target = findNearestEnemy(unit, enemies);
  if (!target) { unit.vx = 0; return; }

  if (!sameLevel(unit, target)) { moveToTargetFloor(unit, target, platforms); return; }

  const dist = Math.abs((target.x + target.width / 2) - (unit.x + unit.width / 2));
  unit.facing = target.x >= unit.x ? 1 : -1;
  if (dist > unit.stance.range * 0.8) {
    unit.vx = 90 * unit.facing;
  } else {
    unit.vx = 0;
    tryAutoAttack(unit, target, spawnProjectile, tryCastSkill);
  }
}

// 목표가 위층이면 발판으로 가서 점프하고, 아래층이면 발판 밖으로 걸어나가 내려간다.
function moveToTargetFloor(unit, target, platforms) {
  const heightGap = (unit.y + unit.height) - (target.y + target.height);
  const standing = platforms.find((p) => unit.x + unit.width > p.x && unit.x < p.x + p.width
    && Math.abs((unit.y + unit.height) - p.y) < 6);

  if (heightGap > 30) { // 목표가 위층
    const dest = platforms.find((p) => target.x + target.width > p.x && target.x < p.x + p.width);
    if (!dest) { unit.vx = 0; return; }
    const under = unit.x + unit.width > dest.x && unit.x < dest.x + dest.width;
    if (!under) {
      unit.vx = 110 * ((unit.x + unit.width / 2) < dest.x ? 1 : -1);
      return;
    }
    unit.vx = 40 * (target.x >= unit.x ? 1 : -1);
    if (unit.grounded) { unit.vy = JUMP_VELOCITY; unit.grounded = false; }
    return;
  }

  // 목표가 아래층 — 발판을 통과해 바로 내려간다.
  if (standing) {
    unit.vx = 0;
    if (unit.grounded) { unit.dropTimer = 220; unit.grounded = false; }
    return;
  }
  unit.vx = 90 * (target.x >= unit.x ? 1 : -1);
}

// 홀드 모드: 움직이지 않고, 같은 층 사거리 안의 몹만 공격한다.
function updateHoldAI(unit, enemies, dt, spawnProjectile, tryCastSkill = null) {
  unit.vx = 0;
  const nearest = findNearestEnemy(unit, enemies, (e) => sameLevel(unit, e));
  if (!nearest) return;
  const dist = Math.abs((nearest.x + nearest.width / 2) - (unit.x + unit.width / 2));
  if (dist > unit.stance.range) return;
  unit.facing = nearest.x >= unit.x ? 1 : -1;
  tryAutoAttack(unit, nearest, spawnProjectile, tryCastSkill);
}

// 습득한 스킬이 준비돼 있으면 스킬을 먼저 쓰고, 없으면 기본공격.
function tryAutoAttack(unit, target, spawnProjectile, tryCastSkill) {
  if (unit.basicAtkCooldown > 0) return;
  if (tryCastSkill && tryCastSkill(unit, target)) {
    unit.basicAtkCooldown = 500;
    return;
  }
  performBasicAttack(unit, target, spawnProjectile);
  unit.basicAtkCooldown = 700 / (1 + ((unit.bonus || EMPTY_FAMILY_BONUS).atkSpeed));
}

// 화면상 가장 가까운 적. 높이 차도 거리로 친다(바로 위층 몹 > 멀리 있는 같은 층 몹).
function findNearestEnemy(unit, enemies, filterFn = null) {
  let nearest = null; let nearestDist = Infinity;
  const ux = unit.x + unit.width / 2;
  const uy = unit.y + unit.height;
  enemies.forEach((e) => {
    if (!e.alive) return;
    if (filterFn && !filterFn(e)) return;
    const dx = (e.x + e.width / 2) - ux;
    const dy = (e.y + e.height) - uy;
    const d = Math.hypot(dx, dy);
    if (d < nearestDist) { nearestDist = d; nearest = e; }
  });
  return nearest;
}

// 몹 AI: 선공 몹은 어그로 범위 안의 파티원을 쫓고, 비선공 몹은 맞기 전까지 배회만 한다.
function updateEnemyAI(enemy, partyUnits, dt, logFn) {
  if (!enemy.alive) return;
  const alive = partyUnits.filter((u) => u.hp > 0);
  const hostile = enemy.aggressive || enemy.provoked;

  if (alive.length === 0 || !hostile) { updateWander(enemy, dt); return; }

  let nearest = null; let nearestDist = Infinity;
  alive.forEach((u) => {
    const d = Math.abs((u.x + u.width / 2) - (enemy.x + enemy.width / 2));
    if (d < nearestDist) { nearestDist = d; nearest = u; }
  });

  // 맞아서 화난 몹은 어그로 범위를 넓게 잡아 끝까지 쫓아온다.
  const chaseRange = enemy.provoked ? enemy.aggroRange * 2 : enemy.aggroRange;
  if (nearestDist > chaseRange) { updateWander(enemy, dt); return; }

  enemy.facing = nearest.x >= enemy.x ? 1 : -1;
  if (nearestDist > enemy.attackRange) {
    enemy.vx = 70 * enemy.facing;
  } else {
    enemy.vx = 0;
    if (enemy.attackCooldownMs <= 0) {
      nearest.hp = Math.max(0, nearest.hp - enemy.atk);
      enemy.attackCooldownMs = 1000;
      enemy.attackAnim = 260;
      nearest.hitFlash = 160;
      if (SOUND) SOUND.hurt();
      if (EFFECTS) {
        EFFECTS.damage(nearest.x + nearest.width / 2, nearest.y - 4, enemy.atk, { color: '#ff7b6b' });
        EFFECTS.spark(nearest.x + nearest.width / 2, nearest.y + nearest.height * 0.5, '#ff7b6b');
      }
      if (logFn) logFn(`${enemy.name} → ${nearest.name} ${enemy.atk} 피해`, 'system');
    }
  }
}

// 보스 AI: 평소엔 접근/평타, 쿨마다 패턴을 예고한 뒤 발동한다. HP 절반 밑이면 광폭화.
function updateBossAI(boss, partyUnits, dt, ctx) {
  const alive = partyUnits.filter((u) => u.hp > 0 && !u.downed);
  if (alive.length === 0) { boss.vx = 0; return; }

  const data = boss.bossData || BOSS_DATA[boss.name];
  let nearest = null; let nearestDist = Infinity;
  alive.forEach((u) => {
    const d = Math.abs((u.x + u.width / 2) - (boss.x + boss.width / 2));
    if (d < nearestDist) { nearestDist = d; nearest = u; }
  });
  boss.facing = nearest.x >= boss.x ? 1 : -1;

  if (data && !boss.enraged && boss.hp / boss.maxHp <= data.enrageAt) {
    boss.enraged = true;
    boss.atk = Math.round(boss.atk * 1.35);
    ctx.log(`${boss.name}(이)가 광폭화했습니다!`, 'system');
    if (EFFECTS) EFFECTS.burst(boss.x + boss.width / 2, boss.y + boss.height / 2, 120, 'rgba(231,76,60,0.8)');
  }
  const haste = boss.enraged ? 0.65 : 1;

  if (boss.phase === 'telegraph') {
    boss.vx = 0;
    boss.phaseTimer -= dt;
    if (boss.phaseTimer <= 0) _startBossPattern(boss, nearest, ctx);
    return;
  }

  if (boss.phase === 'active') {
    boss.phaseTimer -= dt;
    if (boss.current.type === 'charge') {
      boss.vx = boss.current.speed * boss.facing;
      alive.forEach((u) => {
        if (!aabbIntersect(boss, u) || u.chargeHitBy === boss.uid) return;
        u.chargeHitBy = boss.uid;
        const dmg = boss.current.damage * (boss.enraged ? 1.35 : 1);
        _bossHit(u, dmg, ctx);
        bossPatternStatus(u, 'charge', dmg);
      });
    }
    if (boss.phaseTimer <= 0) {
      boss.phase = 'idle';
      boss.vx = 0;
      alive.forEach((u) => { u.chargeHitBy = null; });
      boss.patternTimer = (boss.current.cooldown || 4000) * haste;
      boss.current = null;
    }
    return;
  }

  // idle: 접근 + 평타, 패턴 쿨이 돌면 예고 시작
  boss.patternTimer -= dt;
  if (data && boss.patternTimer <= 0 && nearestDist < boss.aggroRange) {
    boss.current = data.patterns[boss.patternIndex % data.patterns.length];
    boss.patternIndex += 1;
    boss.phase = 'telegraph';
    boss.phaseTimer = boss.current.telegraph * haste;
    ctx.log(`${boss.name}: ${boss.current.warn}`, 'system');
    if (SOUND) SOUND.bossWarn();
    return;
  }

  if (nearestDist > boss.aggroRange) { updateWander(boss, dt); return; }
  if (nearestDist > boss.attackRange) {
    boss.vx = 60 * boss.facing;
  } else {
    boss.vx = 0;
    if (boss.attackCooldownMs <= 0) {
      boss.attackCooldownMs = 1200;
      boss.attackAnim = 260;
      _bossHit(nearest, boss.atk, ctx);
    }
  }
}

function _startBossPattern(boss, nearest, ctx) {
  const p = boss.current;
  const mult = boss.enraged ? 1.35 : 1;
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;
  boss.attackAnim = 320;

  if (p.type === 'slam') {
    if (EFFECTS) EFFECTS.burst(cx, GROUND_Y - 10, p.radius, 'rgba(241,196,15,0.75)');
    ctx.partyUnits.forEach((u) => {
      if (u.hp <= 0 || u.downed) return;
      const d = Math.abs((u.x + u.width / 2) - cx);
      if (d > p.radius) return;
      _bossHit(u, p.damage * mult, ctx);
      bossPatternStatus(u, 'slam', p.damage * mult);
    });
    boss.phase = 'idle';
    boss.patternTimer = p.cooldown * (boss.enraged ? 0.65 : 1);
    boss.current = null;
    return;
  }

  if (p.type === 'summon') {
    for (let i = 0; i < p.count; i++) {
      ctx.summon({ ...p.minion, x: clamp(cx + randRange(-160, 160), 40, ctx.worldWidth - 60), summoned: true });
    }
    if (EFFECTS) EFFECTS.burst(cx, cy, 90, 'rgba(155,89,182,0.75)');
    boss.phase = 'idle';
    boss.patternTimer = p.cooldown * (boss.enraged ? 0.65 : 1);
    boss.current = null;
    return;
  }

  if (p.type === 'volley') {
    for (let i = 0; i < p.count; i++) {
      ctx.bossProjectile(boss, nearest, p.damage * mult, i * 12);
    }
    boss.phase = 'idle';
    boss.patternTimer = p.cooldown * (boss.enraged ? 0.65 : 1);
    boss.current = null;
    return;
  }

  // charge
  boss.phase = 'active';
  boss.phaseTimer = 600;
  ctx.partyUnits.forEach((u) => { u.chargeHitBy = null; });
}

// 보스 패턴에 맞은 파티원에게 상태이상. 내려찍기 기절은 공중에 있으면 피한다.
function bossPatternStatus(unit, patternType, damage) {
  const s = BOSS_PATTERN_STATUS[patternType];
  if (!s || (s.groundedOnly && !unit.grounded)) return;
  applyStatus(unit, s.id, { durationMs: s.durationMs, hitDmg: damage });
}

function _bossHit(unit, damage, ctx) {
  const dmg = Math.max(1, Math.round(damage));
  unit.hp = Math.max(0, unit.hp - dmg);
  unit.hitFlash = 200;
  if (SOUND) SOUND.hurt();
  if (EFFECTS) {
    EFFECTS.damage(unit.x + unit.width / 2, unit.y - 4, dmg, { color: '#ff5a4a', crit: true });
    EFFECTS.spark(unit.x + unit.width / 2, unit.y + unit.height * 0.5, '#ff5a4a');
  }
}

// 스폰 지점 주변을 어슬렁거린다.
function updateWander(enemy, dt) {
  enemy.wanderTimer -= dt;
  if (enemy.wanderTimer <= 0) {
    enemy.wanderDir = [-1, 0, 1][Math.floor(Math.random() * 3)];
    enemy.wanderTimer = randRange(1200, 3000);
  }
  const offset = enemy.x - enemy.spawnX;
  if (offset > enemy.wanderRange) enemy.wanderDir = -1;
  if (offset < -enemy.wanderRange) enemy.wanderDir = 1;
  enemy.vx = 28 * enemy.wanderDir;
  if (enemy.wanderDir !== 0) enemy.facing = enemy.wanderDir;
}

// 같은 층(높이 차 44px 이내)에 있어야 근접 공격이 닿는다.
function sameLevel(a, b) {
  return Math.abs((a.y + a.height) - (b.y + b.height)) <= 44;
}

function performBasicAttack(unit, target, spawnProjectile) {
  const stance = unit.stance;
  const roll = rollDamage(unit, target, stance.basicAtkMult);
  const { dmg, isCrit } = roll;
  unit.attackAnim = 260;
  unit.facing = target.x >= unit.x ? 1 : -1;
  if (stance.attackType === 'melee') {
    if (EFFECTS) EFFECTS.slash(unit);
    const dist = Math.abs((target.x + target.width / 2) - (unit.x + unit.width / 2));
    if (dist <= stance.range && sameLevel(unit, target)) {
      applyDamageToEnemy(target, dmg, isCrit, roll.miss);
      if (!roll.miss) {
        applyLifesteal(unit, dmg);
        rollStatuses(target, basicAttackStatuses(stance), { hitDmg: dmg, source: unit });
      }
    }
  } else if (roll.miss) {
    applyDamageToEnemy(target, 0, false, true);
  } else {
    const p = spawnProjectile(unit, target, dmg, isCrit, elementColor(stance.element));
    if (p) p.statuses = basicAttackStatuses(stance);
  }
}

// 흡혈 특성: 준 피해의 일정 비율을 시전자 HP로 돌려준다.
function applyLifesteal(unit, dmg) {
  const rate = (unit.bonus || EMPTY_FAMILY_BONUS).lifesteal;
  if (!rate || dmg <= 0 || unit.downed || unit.hp >= unit.maxHp) return;
  const heal = Math.max(1, Math.round(dmg * rate));
  unit.hp = clamp(unit.hp + heal, 0, unit.maxHp);
  if (EFFECTS) EFFECTS.damage(unit.x + unit.width / 2, unit.y - 8, heal, { text: `+${heal}`, color: '#2ecc71' });
}

function elementColor(element) {
  if (element === 'fire') return '#e74c3c';
  if (element === 'ice') return '#5dade2';
  if (element === 'lightning') return '#f4d03f';
  return '#ecf0f1';
}

// opts.dot: 상태이상 도트 피해(STATUS_DATA 항목) — 타격음·스파크 없이 상태 색 숫자만 띄운다.
function applyDamageToEnemy(enemy, dmg, isCrit, miss, opts = {}) {
  if (miss) {
    if (EFFECTS) EFFECTS.damage(enemy.x + enemy.width / 2, enemy.y - 4, 0, { text: 'MISS', color: '#bdc3c7' });
    if (SOUND) SOUND.miss();
    enemy.provoked = true;
    return;
  }
  const dot = opts.dot || null;
  // 감전·빙결은 받는 피해를 늘린다(도트 포함).
  dmg = Math.max(1, Math.round(dmg * statusDamageTakenMult(enemy)));
  if (SOUND && !dot) SOUND.hit(isCrit);
  enemy.hp = Math.max(0, enemy.hp - dmg);
  enemy.provoked = true; // 비선공 몹도 맞으면 반격한다
  if (!dot) enemy.hitFlash = 160;
  if (EFFECTS && dot) {
    EFFECTS.damage(enemy.x + enemy.width / 2, enemy.y - 4, dmg, { color: dot.color });
  } else if (EFFECTS) {
    EFFECTS.damage(enemy.x + enemy.width / 2, enemy.y - 4, dmg, { crit: isCrit });
    EFFECTS.spark(enemy.x + enemy.width / 2, enemy.y + enemy.height * 0.5, isCrit ? '#f5b041' : '#ffe08a');
  }
  if (enemy.hp <= 0) {
    enemy.alive = false;
    if (SOUND) SOUND.kill(enemy.boss);
    enemy.respawnTimer = enemy.respawnMs || ENEMY_RESPAWN_MS;
    if (EFFECTS) EFFECTS.burst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 34, 'rgba(231,76,60,0.7)');
  }
}
