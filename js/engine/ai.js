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
const AI_SPEED = 90;
const STUCK_MS = 150;    // 이만큼 제자리걸음이면 막힌 것으로 본다
const SIDESTEP_MS = 520; // 막혔을 때 옆으로 도는 시간
const PROBE_DIST = 28;   // 옆으로 돌 때 이만큼 앞이 비었는지 찔러 본다

// 나무·절벽에 코를 박고 제자리걸음하면 옆으로 돌아 나간다(길찾기가 없어서 필요한 처리).
// 목표 방향 (dx, dy)를 받아 실제로 갈 방향을 돌려준다.
function avoidStuck(unit, dx, dy, dt) {
  const moved = Math.hypot(unit.x - (unit._lastX === undefined ? unit.x : unit._lastX),
    unit.y - (unit._lastY === undefined ? unit.y : unit._lastY));
  unit._lastX = unit.x;
  unit._lastY = unit.y;

  // 도는 중이면 그 방향을 유지한다(왔다 갔다 하지 않게).
  if (unit._sideMs > 0) {
    unit._sideMs -= dt;
    if (unit._sideMs > 0) {
      return unit._sideDir ? { x: -dy * unit._sideDir, y: dx * unit._sideDir } : { x: -dx, y: -dy };
    }
    unit._stuckMs = 0;
  }

  unit._stuckMs = moved < 0.35 ? (unit._stuckMs || 0) + dt : 0;
  if (unit._stuckMs <= STUCK_MS) return { x: dx, y: dy };

  // 막혔다. 좌우 중 실제로 발 디딜 수 있는 쪽으로 돈다(장식·절벽 둘 다 canStand로 걸러진다).
  const map = ACTIVE_MAP;
  const c = entityCenter(unit);
  const free = (s) => !map || map.canStand(c.x, c.y, c.x - dy * s * PROBE_DIST, c.y + dx * s * PROBE_DIST);
  const dirs = [];
  if (free(1)) dirs.push(1);
  if (free(-1)) dirs.push(-1);
  unit._sideMs = SIDESTEP_MS;
  unit._sideDir = dirs.length ? dirs[hashStr(`${unit.id}:${Math.round(unit.x / 64)}`) % dirs.length] : 0;
  // 양쪽 다 막히면 뒤로 물러났다가 다시 붙는다.
  return unit._sideDir ? { x: -dy * unit._sideDir, y: dx * unit._sideDir } : { x: -dx, y: -dy };
}

// 경사로 쪽으로 걸어간다. 단차 때문에 곧장 못 가는 상황에서 쓴다.
function walkToRamp(unit, map, dt) {
  const a = entityCenter(unit);
  const ramp = map && map.nearestRamp ? map.nearestRamp(a.x, a.y) : null;
  if (!ramp) { unit.vx = 0; unit.vy = 0; return false; }
  const len = Math.hypot(ramp.x - a.x, ramp.y - a.y) || 1;
  const s = avoidStuck(unit, (ramp.x - a.x) / len, (ramp.y - a.y) / len, dt);
  unit.vx = s.x * AI_SPEED;
  unit.vy = s.y * AI_SPEED;
  setFacing(unit, unit.vx, unit.vy);
  return true;
}

function updateKeepAI(unit, enemies, dt, spawnProjectile, map = null, tryCastSkill = null) {
  const target = findNearestEnemy(unit, enemies);
  // 같은 높이에 남은 몹이 없으면 가까운 경사로로 올라가(내려가) 사냥을 이어 간다.
  if (!target) {
    if (!enemies.some((e) => e.alive) || !walkToRamp(unit, map, dt)) { unit.vx = 0; unit.vy = 0; }
    return;
  }
  // 사냥감이 다른 단에 있으면 곧장 가 봐야 절벽에 박힌다. 경사로부터 탄다.
  if (!sameStep(unit, target, map)) { walkToRamp(unit, map, dt); return; }

  const d = dirTo(unit, target);
  if (d.dist > unit.stance.range * 0.8) {
    const s = avoidStuck(unit, d.x, d.y, dt);
    unit.vx = s.x * AI_SPEED;
    unit.vy = s.y * AI_SPEED;
    setFacing(unit, unit.vx, unit.vy);
  } else {
    unit.vx = 0; unit.vy = 0;
    unit._stuckMs = 0; unit._sideMs = 0;
    setFacing(unit, d.x, d.y);
    tryAutoAttack(unit, target, spawnProjectile, tryCastSkill, enemies);
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
  tryAutoAttack(unit, nearest, spawnProjectile, tryCastSkill, enemies);
}

// 습득한 스킬이 준비돼 있으면 스킬을 먼저 쓰고, 없으면 기본공격.
function tryAutoAttack(unit, target, spawnProjectile, tryCastSkill, enemies = null) {
  if (unit.basicAtkCooldown > 0) return;
  if (tryCastSkill && tryCastSkill(unit, target)) {
    unit.basicAtkCooldown = 500;
    return;
  }
  performBasicAttack(unit, target, spawnProjectile, enemies);
  unit.basicAtkCooldown = 700 / (1 + ((unit.bonus || EMPTY_FAMILY_BONUS).atkSpeed));
}

function findNearestEnemy(unit, enemies, filterFn = null) {
  let nearest = null; let nearestDist = Infinity;
  enemies.forEach((e) => {
    if (!e.alive) return;
    if (filterFn && !filterFn(e)) return;
    if (!sameHeight(unit, e)) return;
    // 같은 단에 있는 몹을 확실히 먼저 고른다(단차를 넘나드느라 버벅이지 않게).
    const d = planeDist(unit, e) + (sameStep(unit, e) ? 0 : 900);
    if (d < nearestDist) { nearestDist = d; nearest = e; }
  });
  return nearest;
}

// 높이가 두 단 이상 차이나면(절벽 위/아래) 서로 못 때린다. 예전 사이드뷰의 층 판정 자리.
function sameLevel(a, b) { return (a && b) ? sameHeight(a, b) : true; }

// 몹이 파티원을 때릴 때 실제로 들어가는 피해.
// 예전에는 몹 공격력이 방어력을 완전히 무시하고 그대로 들어갔다. 그래서 방어구를 아무리 맞춰도
// 상위 존에서 파티가 순식간에 녹았다. 파티가 몹을 때릴 때와 같은 규칙으로 맞춘다:
// 방어력의 절반을 빼되, 원 피해의 15%는 반드시 들어간다.
function incomingDamage(unit, rawAtk) {
  const def = unit.stats ? computeFullSheet(unit).defense.defense : 0;
  // 방어력은 비율로 깎는다(빼기로 하면 초반에는 1이 되고 후반에는 무의미해진다).
  // 같은 방어력이라도 레벨이 오르면 값어치가 줄어서, 늘 그 레벨대 방어구를 맞춰야 한다. 최대 75%까지 감쇄.
  const soak = Math.min(0.75, def / (def + 60 * Math.max(1, unit.level || 1)));
  return Math.max(1, Math.round(rawAtk * (1 - soak)));
}

// 몹 AI: 선공 몹은 어그로 범위 안의 파티원을 쫓고, 비선공 몹은 맞기 전까지 배회만 한다.
// 병작(쩔) 보호: 몹보다 한참 낮은 레벨은 노리지 않는다. 데리고 온 저레벨이 한 대에 죽으면
// 쩔 자체가 성립하지 않는다. 때릴 상대가 그 캐릭터밖에 없으면 그때는 노린다.
const LEECH_LEVEL_GAP = 15;

function preferredTargets(enemy, alive) {
  const grown = alive.filter((u) => (enemy.level || 1) - u.level < LEECH_LEVEL_GAP);
  return grown.length ? grown : alive;
}

function updateEnemyAI(enemy, partyUnits, dt, logFn) {
  if (!enemy.alive) return;
  const alive = preferredTargets(enemy, partyUnits.filter((u) => u.hp > 0 && !u.downed));
  const hostile = enemy.aggressive || enemy.provoked;
  if (alive.length === 0 || !hostile) { updateWander(enemy, dt); return; }

  let nearest = null; let nearestDist = Infinity;
  alive.forEach((u) => {
    if (!sameHeight(enemy, u)) return; // 절벽 너머는 쫓지 않는다
    const d = planeDist(enemy, u);
    if (d < nearestDist) { nearestDist = d; nearest = u; }
  });
  if (!nearest) { updateWander(enemy, dt); return; }

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
      const hit = incomingDamage(nearest, enemy.atk);
      nearest.hp = Math.max(0, nearest.hp - hit);
      enemy.attackCooldownMs = 1000;
      enemy.attackAnim = 260;
      nearest.hitFlash = 160;
      if (SOUND) SOUND.hurt();
      if (EFFECTS) {
        const c = entityCenter(nearest);
        EFFECTS.damage(c.x, c.y, hit, { color: '#ff7b6b' });
        EFFECTS.spark(c.x, c.y, '#ff7b6b');
      }
      if (logFn) logFn(`${enemy.name} → ${nearest.name} ${hit} 피해`, 'system');
    }
  }
}

// 보스 AI: 평소엔 접근/평타, 쿨마다 패턴을 예고한 뒤 발동한다. HP 절반 밑이면 광폭화.
function updateBossAI(boss, partyUnits, dt, ctx) {
  const alive = preferredTargets(boss, partyUnits.filter((u) => u.hp > 0 && !u.downed));
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
  const dmg = incomingDamage(unit, damage);
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

// 스플래시로 휘말린 쪽이 받는 비율. 주 대상은 그대로 다 맞는다.
// 1.0이면 몹이 뭉친 곳에서 광역 평타 계열이 단일 계열의 3배를 때려 균형이 무너진다.
const SPLASH_DAMAGE_MULT = 0.7;

// 평타. 스탠스마다 타수(hits)와 스플래시(splash)가 달라서, 같은 무기라도 자세에 따라 체감이 다르다.
// 원작의 "평타가 2히트", "양손으로 두 방씩 4번", "평타도 스플래시"를 옮긴 것.
// 광역 평타 계열(폴암·새지터·로드 오브)은 쩔(병작)을 맡는 자리다.
function performBasicAttack(unit, target, spawnProjectile, enemies = null) {
  const stance = unit.stance;
  const d = dirTo(unit, target);
  unit.attackAnim = 260;
  setFacing(unit, d.x, d.y);

  // 스플래시 평타(폴암 계열): 주 대상 주변도 같이 맞는다.
  const victims = [target];
  if (stance.splash && enemies) {
    enemies.forEach((e) => {
      if (e === target || !e.alive || !sameHeight(unit, e)) return;
      if (planeDist(target, e) <= stance.splash) victims.push(e);
    });
  }

  // 몇이 휘말렸는지 보이게 한 번 터뜨린다(스킬 범위기와 같은 연출).
  if (EFFECTS && victims.length > 1) {
    EFFECTS.burst(target.x + target.width / 2, target.y + target.height / 2,
      stance.splash, elementColor(stance.element));
  }

  for (let h = 0; h < (stance.hits || 1); h++) {
    victims.forEach((v) => {
      if (!v.alive) return;
      const mult = v === target ? stance.basicAtkMult : stance.basicAtkMult * SPLASH_DAMAGE_MULT;
      const roll = rollDamage(unit, v, mult);
      const { dmg, isCrit } = roll;
      if (stance.attackType === 'melee') {
        if (EFFECTS && h === 0 && v === target) EFFECTS.slash(unit);
        if (v !== target || d.dist <= stance.range) {
          applyDamageToEnemy(v, dmg, isCrit, roll.miss);
          if (!roll.miss) {
            applyLifesteal(unit, dmg);
            rollStatuses(v, basicAttackStatuses(stance), { hitDmg: dmg, source: unit });
          }
        }
      } else if (roll.miss) {
        applyDamageToEnemy(v, 0, false, true);
      } else {
        const p = spawnProjectile(unit, v, dmg, isCrit, elementColor(stance.element));
        if (p) p.statuses = basicAttackStatuses(stance);
      }
    });
  }
}

// ===== 힐러 계열 =====
// 평타 치료 1회에 드는 MP. 무한 힐이 되지 않게 최소한의 밑천을 요구한다.
const SUPPORT_HEAL_MP = 4;

// 원작 퍼스트 에이드처럼, 힐러는 평타 자리에 치료가 들어간다. 때리지 않는다.
// 가장 많이 다친 동료(자기 포함)를 사거리 안에서 고른다. 아무도 안 다쳤으면 아무 일도 안 한다.
function findHealTarget(unit, partyUnits) {
  let best = null;
  let worst = 1;
  partyUnits.forEach((u) => {
    if (u.downed || u.hp <= 0 || u.maxHp <= 0) return;
    if (u !== unit && planeDist(unit, u) > unit.stance.range) return;
    const ratio = u.hp / u.maxHp;
    if (ratio < worst) { worst = ratio; best = u; }
  });
  return worst < 0.999 ? best : null;
}

function performHeal(unit, target) {
  const amount = healAmount(unit, target);
  target.hp = clamp(target.hp + amount, 0, target.maxHp);
  unit.attackAnim = 260;
  if (target !== unit) {
    const d = dirTo(unit, target);
    setFacing(unit, d.x, d.y);
  }
  if (EFFECTS) {
    EFFECTS.cast(unit, '#2ecc71');
    EFFECTS.damage(target.x + target.width / 2, target.y - 8, amount, { text: '+' + amount, color: '#2ecc71' });
  }
  if (SOUND) SOUND.heal();
  return amount;
}

// 힐러 자동전투. 사냥감을 쫓지 않고 파티 곁에 붙어 치료와 버프만 한다.
// keep = 위험한 동료 곁으로 따라붙으며, hold = 제자리에서 사거리 안만.
function updateSupportAI(unit, partyUnits, dt, tryCastSkill, map = null, hold = false) {
  const mates = partyUnits.filter((u) => u !== unit && !u.downed);
  if (!hold && mates.length) {
    // 가장 위험한 동료(HP 비율이 낮은 쪽) 곁으로 간다. 모두 멀쩡하면 앞에 선 동료 곁으로.
    const hurt = mates.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b));
    const anchor = hurt.hp / hurt.maxHp < 0.9 ? hurt : mates[0];
    const gap = planeDist(unit, anchor);
    if (gap > unit.stance.range * 0.6) {
      const a = entityCenter(unit);
      const b = sameHeight(unit, anchor, map) ? entityCenter(anchor)
        : ((map && map.nearestRamp(a.x, a.y)) || entityCenter(anchor));
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const s = avoidStuck(unit, (b.x - a.x) / len, (b.y - a.y) / len, dt);
      unit.vx = s.x * AI_SPEED;
      unit.vy = s.y * AI_SPEED;
      setFacing(unit, unit.vx, unit.vy);
      return;
    }
  }
  unit.vx = 0; unit.vy = 0;
  unit._stanceRotateMs = (unit._stanceRotateMs || 0) - dt;
  if (unit.basicAtkCooldown > 0) return;
  // 버프·해제·부활 같은 지원 스킬이 먼저다. 쓸 게 없을 때만 평타 치료.
  if (tryCastSkill && tryCastSkill(unit, null)) { unit.basicAtkCooldown = 600; return; }
  const target = findHealTarget(unit, partyUnits);
  if (target && unit.mp >= SUPPORT_HEAL_MP) {
    unit.mp -= SUPPORT_HEAL_MP;
    performHeal(unit, target);
    unit.basicAtkCooldown = 900 / (1 + ((unit.bonus || EMPTY_FAMILY_BONUS).atkSpeed));
    return;
  }
  // 할 일이 없으면 자세를 돌린다. 원작처럼 버프는 자세마다 따로 달려 있어서,
  // 한 자세만 붙들고 있으면 다른 자세의 파티 버프가 영영 안 걸린다.
  if (unit._stanceRotateMs <= 0 && unit.availableStances.length > 1) {
    unit.cycleStance();
    unit._stanceRotateMs = SUPPORT_STANCE_ROTATE_MS;
  }
}

// 힐러가 자세를 바꿔 다른 버프를 마저 거는 주기.
const SUPPORT_STANCE_ROTATE_MS = 3500;

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
