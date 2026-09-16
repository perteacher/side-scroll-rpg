// 자동전투·몹 AI. 쿼터뷰라 이동·거리 판정은 모두 바닥 평면(x=동쪽, y=남쪽)에서 이뤄진다.

// 화면에서 오른쪽을 보고 있는지(스프라이트 좌우 반전용). 월드 방향을 투영해 판단한다.
function facingFor(dx, dy) { return isoSX(dx, dy) >= 0 ? 1 : -1; }

// 대상 쪽으로 향하는 단위 벡터
function dirTo(from, to) {
  const a = entityCenter(from);
  const b = entityCenter(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len, dist: len };
}

// 킵 모드: 가장 가까운 적을 향해 걸어가 사거리에 들면 공격한다.
function updateKeepAI(unit, enemies, dt, spawnProjectile, map = null, tryCastSkill = null) {
  const target = findNearestEnemy(unit, enemies);
  if (!target) { unit.vx = 0; unit.vy = 0; return; }
  const d = dirTo(unit, target);
  setFacing(unit, d.x, d.y);
  if (d.dist > unit.stance.range * 0.8) {
    unit.vx = d.x * 90;
    unit.vy = d.y * 90;
  } else {
    unit.vx = 0; unit.vy = 0;
    tryAutoAttack(unit, target, spawnProjectile, tryCastSkill);
  }
}

// 홀드 모드: 제자리에서 사거리 안의 몹만 공격한다.
function updateHoldAI(unit, enemies, dt, spawnProjectile, tryCastSkill = null) {
  unit.vx = 0; unit.vy = 0;
  const nearest = findNearestEnemy(unit, enemies);
  if (!nearest) return;
  const d = dirTo(unit, nearest);
  if (d.dist > unit.stance.range) return;
  setFacing(unit, d.x, d.y);
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

function findNearestEnemy(unit, enemies, filterFn = null) {
  let nearest = null; let nearestDist = Infinity;
  enemies.forEach((e) => {
    if (!e.alive) return;
    if (filterFn && !filterFn(e)) return;
    const d = planeDist(unit, e);
    if (d < nearestDist) { nearestDist = d; nearest = e; }
  });
  return nearest;
}

// 쿼터뷰에는 층이 없다. 예전 사이드뷰의 층 판정 자리를 메우는 함수(항상 참).
function sameLevel() { return true; }

// 몹 AI: 선공 몹은 어그로 범위 안의 파티원을 쫓고, 비선공 몹은 맞기 전까지 배회만 한다.
function updateEnemyAI(enemy, partyUnits, dt, logFn) {
  if (!enemy.alive) return;
  const alive = partyUnits.filter((u) => u.hp > 0 && !u.downed);
  const hostile = enemy.aggressive || enemy.provoked;
  if (alive.length === 0 || !hostile) { updateWander(enemy, dt); return; }

  let nearest = null; let nearestDist = Infinity;
  alive.forEach((u) => {
    const d = planeDist(enemy, u);
    if (d < nearestDist) { nearestDist = d; nearest = u; }
  });

  // 맞아서 화난 몹은 어그로 범위를 넓게 잡아 끝까지 쫓아온다.
  const chaseRange = enemy.provoked ? enemy.aggroRange * 2 : enemy.aggroRange;
  if (nearestDist > chaseRange) { updateWander(enemy, dt); return; }

  const d = dirTo(enemy, nearest);
  setFacing(enemy, d.x, d.y);
  if (nearestDist > enemy.attackRange) {
    enemy.vx = d.x * 70;
    enemy.vy = d.y * 70;
  } else {
    enemy.vx = 0; enemy.vy = 0;
    if (enemy.attackCooldownMs <= 0) {
      nearest.hp = Math.max(0, nearest.hp - enemy.atk);
      enemy.attackCooldownMs = 1000;
      enemy.attackAnim = 260;
      nearest.hitFlash = 160;
      if (SOUND) SOUND.hurt();
      if (EFFECTS) {
        const c = entityCenter(nearest);
        EFFECTS.damage(c.x, c.y, enemy.atk, { color: '#ff7b6b' });
        EFFECTS.spark(c.x, c.y, '#ff7b6b');
      }
      if (logFn) logFn(`${enemy.name} → ${nearest.name} ${enemy.atk} 피해`, 'system');
    }
  }
}

// 보스 AI: 평소엔 접근/평타, 쿨마다 패턴을 예고한 뒤 발동한다. HP 절반 밑이면 광폭화.
function updateBossAI(boss, partyUnits, dt, ctx) {
  const alive = partyUnits.filter((u) => u.hp > 0 && !u.downed);
  if (alive.length === 0) { boss.vx = 0; boss.vy = 0; return; }

  const data = boss.bossData || BOSS_DATA[boss.name];
  let nearest = null; let nearestDist = Infinity;
  alive.forEach((u) => {
    const d = planeDist(boss, u);
    if (d < nearestDist) { nearestDist = d; nearest = u; }
  });
  const dir = dirTo(boss, nearest);
  setFacing(boss, dir.x, dir.y);

  if (data && !boss.enraged && boss.hp / boss.maxHp <= data.enrageAt) {
    boss.enraged = true;
    boss.atk = Math.round(boss.atk * 1.35);
    ctx.log(`${boss.name}(이)가 광폭화했습니다!`, 'system');
    if (EFFECTS) {
      const c = entityCenter(boss);
      EFFECTS.burst(c.x, c.y, 120, 'rgba(231,76,60,0.8)');
    }
  }
  const haste = boss.enraged ? 0.65 : 1;

  if (boss.phase === 'telegraph') {
    boss.vx = 0; boss.vy = 0;
    boss.phaseTimer -= dt;
    if (boss.phaseTimer <= 0) _startBossPattern(boss, nearest, ctx);
    return;
  }

  if (boss.phase === 'active') {
    boss.phaseTimer -= dt;
    if (boss.current.type === 'charge') {
      boss.vx = boss.chargeDir.x * boss.current.speed;
      boss.vy = boss.chargeDir.y * boss.current.speed;
      alive.forEach((u) => {
        if (planeDist(boss, u) > (boss.width + u.width) * 0.6 || u.chargeHitBy === boss.uid) return;
        u.chargeHitBy = boss.uid;
        const dmg = boss.current.damage * (boss.enraged ? 1.35 : 1);
        _bossHit(u, dmg, ctx);
        bossPatternStatus(u, 'charge', dmg);
      });
    }
    if (boss.phaseTimer <= 0) {
      boss.phase = 'idle';
      boss.vx = 0; boss.vy = 0;
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
    boss.vx = dir.x * 60;
    boss.vy = dir.y * 60;
  } else {
    boss.vx = 0; boss.vy = 0;
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
  const c = entityCenter(boss);
  boss.attackAnim = 320;

  if (p.type === 'slam') {
    if (EFFECTS) EFFECTS.burst(c.x, c.y, p.radius, 'rgba(241,196,15,0.75)');
    ctx.partyUnits.forEach((u) => {
      if (u.hp <= 0 || u.downed) return;
      if (planeDist(boss, u) > p.radius) return;
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
      ctx.summon({
        ...p.minion,
        level: boss.level,
        x: c.x + randRange(-120, 120),
        y: c.y + randRange(-80, 80),
        summoned: true,
      });
    }
    if (EFFECTS) EFFECTS.burst(c.x, c.y, 90, 'rgba(155,89,182,0.75)');
    boss.phase = 'idle';
    boss.patternTimer = p.cooldown * (boss.enraged ? 0.65 : 1);
    boss.current = null;
    return;
  }

  if (p.type === 'volley') {
    for (let i = 0; i < p.count; i++) ctx.bossProjectile(boss, nearest, p.damage * mult, i * 12);
    boss.phase = 'idle';
    boss.patternTimer = p.cooldown * (boss.enraged ? 0.65 : 1);
    boss.current = null;
    return;
  }

  // charge — 예고 시점의 방향으로 돌진한다.
  boss.chargeDir = dirTo(boss, nearest);
  boss.phase = 'active';
  boss.phaseTimer = 600;
  ctx.partyUnits.forEach((u) => { u.chargeHitBy = null; });
}

// 보스 패턴에 맞은 파티원에게 상태이상.
function bossPatternStatus(unit, patternType, damage) {
  const s = BOSS_PATTERN_STATUS[patternType];
  if (!s) return;
  applyStatus(unit, s.id, { durationMs: s.durationMs, hitDmg: damage });
}

function _bossHit(unit, damage, ctx) {
  const dmg = Math.max(1, Math.round(damage));
  unit.hp = Math.max(0, unit.hp - dmg);
  unit.hitFlash = 200;
  if (SOUND) SOUND.hurt();
  if (EFFECTS) {
    const c = entityCenter(unit);
    EFFECTS.damage(c.x, c.y, dmg, { color: '#ff5a4a', crit: true });
    EFFECTS.spark(c.x, c.y, '#ff5a4a');
  }
}

// 스폰 지점 주변을 어슬렁거린다(평면에서 8방향 중 하나로).
function updateWander(enemy, dt) {
  enemy.wanderTimer -= dt;
  if (enemy.wanderTimer <= 0) {
    const a = Math.floor(Math.random() * 9);
    if (a === 8) { enemy.wanderDX = 0; enemy.wanderDY = 0; } else {
      const ang = (a / 8) * Math.PI * 2;
      enemy.wanderDX = Math.cos(ang);
      enemy.wanderDY = Math.sin(ang);
    }
    enemy.wanderTimer = randRange(1200, 3000);
  }
  // 스폰 지점에서 너무 멀어지면 돌아온다.
  const dx = enemy.x - enemy.spawnX;
  const dy = enemy.y - enemy.spawnY;
  if (Math.hypot(dx, dy) > enemy.wanderRange) {
    const len = Math.hypot(dx, dy) || 1;
    enemy.wanderDX = -dx / len;
    enemy.wanderDY = -dy / len;
  }
  enemy.vx = 28 * (enemy.wanderDX || 0);
  enemy.vy = 28 * (enemy.wanderDY || 0);
  if (enemy.vx || enemy.vy) setFacing(enemy, enemy.vx, enemy.vy);
}

function performBasicAttack(unit, target, spawnProjectile) {
  const stance = unit.stance;
  const roll = rollDamage(unit, target, stance.basicAtkMult);
  const { dmg, isCrit } = roll;
  const d = dirTo(unit, target);
  unit.attackAnim = 260;
  setFacing(unit, d.x, d.y);
  if (stance.attackType === 'melee') {
    if (EFFECTS) EFFECTS.slash(unit);
    if (d.dist <= stance.range) {
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
  if (EFFECTS) {
    const c = entityCenter(unit);
    EFFECTS.damage(c.x, c.y, heal, { text: `+${heal}`, color: '#2ecc71' });
  }
}

function elementColor(element) {
  if (element === 'fire') return '#e74c3c';
  if (element === 'ice') return '#5dade2';
  if (element === 'lightning') return '#f4d03f';
  return '#ecf0f1';
}

// opts.dot: 상태이상 도트 피해(STATUS_DATA 항목) — 타격음·스파크 없이 상태 색 숫자만 띄운다.
function applyDamageToEnemy(enemy, dmg, isCrit, miss, opts = {}) {
  const c = entityCenter(enemy);
  if (miss) {
    if (EFFECTS) EFFECTS.damage(c.x, c.y, 0, { text: 'MISS', color: '#bdc3c7' });
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
    EFFECTS.damage(c.x, c.y, dmg, { color: dot.color });
  } else if (EFFECTS) {
    EFFECTS.damage(c.x, c.y, dmg, { crit: isCrit });
    EFFECTS.spark(c.x, c.y, isCrit ? '#f5b041' : '#ffe08a');
  }
  if (enemy.hp <= 0) {
    enemy.alive = false;
    if (SOUND) SOUND.kill(enemy.boss);
    enemy.respawnTimer = enemy.respawnMs || ENEMY_RESPAWN_MS;
    if (EFFECTS) EFFECTS.burst(c.x, c.y, 34, 'rgba(231,76,60,0.7)');
  }
}
