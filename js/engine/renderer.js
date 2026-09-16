// 화면 그리기 (쿼터뷰). 두 겹으로 나눠 그린다.
//  1) 월드 그림(바닥 타일·장식·캐릭터·몬스터·이펙트)은 반해상도 버퍼(480x270)에 그린 뒤 픽셀 그대로 두 배로 키운다.
//     도트 한 칸 = 월드 2px로 모든 그림의 픽셀 크기가 같아진다.
//  2) 글자와 체력바는 원래 해상도에 따로 그린다. 버퍼에 그리면 뭉개져서 못 읽는다.
//
// 좌표는 iso.js의 투영을 쓴다: sx = x - y, sy = (x + y) / 2. 그리는 순서는 x + y가 작은 것부터.
const THEME_DATA = {
  town_forest: { sky: ['#7ec8e3', '#cfe9c8'], far: '#4e7a54', mid: '#3c6144', decor: 'houses', accent: '#c0713f' },
  town_border: { sky: ['#9bb6c9', '#d8cfae'], far: '#6d6a52', mid: '#565340', decor: 'houses', accent: '#a9784a' },
  town_port: { sky: ['#79b4d6', '#bcd9e2'], far: '#41697d', mid: '#2f5163', decor: 'ships', accent: '#c9a227' },
  town_desert: { sky: ['#f0c27b', '#e8d9a0'], far: '#b08b4e', mid: '#8c6a3a', decor: 'houses', accent: '#d9a441' },
  town_castle: { sky: ['#5d6b8a', '#9aa3b8'], far: '#4a4f63', mid: '#363b4c', decor: 'walls', accent: '#8e9bb5' },
  forest: { sky: ['#7fbde0', '#bcdcc0'], far: '#3f6b46', mid: '#2d5136', decor: 'trees', accent: '#6b4f2a' },
  valley: { sky: ['#88b9c9', '#b7cfae'], far: '#4a6b55', mid: '#33503f', decor: 'trees', accent: '#6d6250' },
  quarry: { sky: ['#9aa3a8', '#c9c2a8'], far: '#6b6350', mid: '#514a3c', decor: 'rocks', accent: '#7d7360' },
  haunted: { sky: ['#4b4a63', '#736a83'], far: '#3c3a4e', mid: '#2b2a3a', decor: 'deadtrees', accent: '#6f5f8a' },
  port: { sky: ['#6fa8c9', '#a9c8d4'], far: '#3c6073', mid: '#2b4756', decor: 'ships', accent: '#b8892f' },
  sunken: { sky: ['#33566b', '#4e7b8c'], far: '#274554', mid: '#1c3340', decor: 'wrecks', accent: '#4e8a96' },
  desert: { sky: ['#e8b96b', '#f0dcae'], far: '#c19a5b', mid: '#a17c44', decor: 'dunes', accent: '#d8b070' },
  ruins: { sky: ['#c9b184', '#ddd0aa'], far: '#8e7f5e', mid: '#6d6147', decor: 'pillars', accent: '#b0a078' },
  warfront: { sky: ['#5a5f7a', '#8b8ea3'], far: '#464b60', mid: '#333749', decor: 'walls', accent: '#7b8398' },
  demon: { sky: ['#5b2333', '#8c3b3b'], far: '#42202c', mid: '#2e1720', decor: 'spikes', accent: '#c0392b' },
};

const DEFAULT_THEME = THEME_DATA.forest;

const MINIMAP_SIZE = 120;   // 미니맵 CSS 크기(px). 실제 픽셀 수는 화면 배율만큼 늘린다
const PIXEL_SCALE = 2;      // 도트 한 칸의 월드 크기(px)
const BOSS_PIXEL_SCALE = 4; // 보스는 같은 틀을 두 배로 키워 덩치를 낸다

// 도트 격자에 맞춰 좌표를 반올림한다. 안 맞추면 움직일 때 픽셀이 반 칸씩 흔들린다.
function snapPx(v) { return Math.round(v / PIXEL_SCALE) * PIXEL_SCALE; }

class Renderer {
  constructor(ctx, width, height) {
    this.mainCtx = ctx;
    this.ctx = ctx;
    this.width = width; this.height = height;
    this.camX = 0; this.camY = 0;
    this.buffer = document.createElement('canvas');
    this.buffer.width = width / PIXEL_SCALE;
    this.buffer.height = height / PIXEL_SCALE;
    this.bctx = this.buffer.getContext('2d');
    this._npcLooks = new Map();
    this.outScale = 1; // 캔버스 실제 픽셀 / 논리 픽셀
  }

  // 화면 배율이 바뀌면 캔버스 픽셀 수만 늘리고, 그리는 좌표는 960×540 그대로 쓴다.
  setOutputScale(k, minimap = null) {
    const canvas = this.mainCtx.canvas;
    const w = Math.round(this.width * k);
    const h = Math.round(this.height * k);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    canvas.style.width = `${this.width}px`;
    canvas.style.height = `${this.height}px`;
    this.outScale = w / this.width;
    if (minimap) {
      const size = Math.round(MINIMAP_SIZE * k);
      if (minimap.width !== size) { minimap.width = size; minimap.height = size; }
      minimap.style.width = `${MINIMAP_SIZE}px`;
      minimap.style.height = `${MINIMAP_SIZE}px`;
    }
  }

  // 조작 캐릭터의 투영 위치를 화면 한가운데에 둔다. 맵 밖(허공)이 화면을 채우지 않게 가장자리에서 멈춘다.
  updateCamera(activeUnit, map = null) {
    if (!activeUnit) return;
    const c = entityCenter(activeUnit);
    this.camX = isoSX(c.x, c.y) - this.width / 2;
    this.camY = isoSY(c.x, c.y) - this.height / 2;
    if (!map) return;
    const margin = 80;
    const minX = isoSX(0, map.h) - margin;
    const maxX = isoSX(map.w, 0) + margin - this.width;
    const minY = isoSY(0, 0) - margin;
    const maxY = isoSY(map.w, map.h) + margin - this.height;
    this.camX = clamp(this.camX, minX, Math.max(minX, maxX));
    this.camY = clamp(this.camY, minY, Math.max(minY, maxY));
  }

  // 월드 좌표 → 화면(카메라 적용 전) 좌표
  _proj(x, y) { return { x: isoSX(x, y), y: isoSY(x, y) }; }

  draw(state) {
    const theme = THEME_DATA[state.theme] || DEFAULT_THEME;
    this._theme = theme;
    const camX = snapPx(this.camX);
    const camY = snapPx(this.camY);
    this.cam = camX; // 라벨 층에서도 같은 값을 쓴다

    // ---- 1) 월드 그림: 반해상도 버퍼 ----
    const b = this.bctx;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, this.buffer.width, this.buffer.height);
    b.imageSmoothingEnabled = false;
    b.setTransform(1 / PIXEL_SCALE, 0, 0, 1 / PIXEL_SCALE, 0, 0);
    this.ctx = b;

    // 타일 바깥(허공)은 하늘색을 어둡게 깐다.
    b.fillStyle = shadeHex(theme.sky[1], 0.35);
    b.fillRect(0, 0, this.width, this.height);

    b.save();
    b.translate(-camX, -camY);
    this._drawTiles(state);
    this._drawWarpPads(state, state.time);
    this._drawSorted(state);
    state.effects.drawShapes(b);
    b.restore();

    // ---- 2) 원래 해상도로 키워 붙이기 ----
    const m = this.mainCtx;
    this.ctx = m;
    m.setTransform(this.outScale, 0, 0, this.outScale, 0, 0);
    m.clearRect(0, 0, this.width, this.height);
    m.imageSmoothingEnabled = false;
    m.drawImage(this.buffer, 0, 0, this.width, this.height);
    state.effects.drawOverlay(m, this.width, this.height);

    // ---- 3) 글자·체력바: 원래 해상도 ----
    m.save();
    m.translate(-camX, -camY);
    state.warps.forEach((w) => this._drawWarpLabel(w, w === state.warpPrompt));
    if (state.questBoard) this._drawQuestBoardLabel(state.questBoard, state.time, state.boardHasQuest);
    state.storyNpcs.forEach((npc) => this._drawStoryNpcLabel(npc, state.activeStoryNpcId, state.time));
    if (state.shopNpc) this._drawShopNpcLabel(state.shopNpc, state.time);
    state.recruitNpcs.forEach((npc) => this._drawRecruitNpcLabel(npc, state.time, state.recruitStatus[npc.charId]));
    state.enemies.filter((e) => e.alive).forEach((e) => this._drawEnemyLabel(e, state.time, e === state.target, state.partyLevel));
    state.partyUnits.forEach((u, i) => this._drawUnitLabel(u, i === state.activeIndex, state.time, state.partyUnits, i));
    state.effects.drawTexts(m);
    m.restore();
  }

  // ---------- 바닥 ----------
  _drawTiles(state) {
    const { ctx } = this;
    const map = state.map;
    const pal = tilePalette(state.groundColor);
    const roadPal = roadPalette(state.groundColor);
    const camX = snapPx(this.camX);
    const camY = snapPx(this.camY);

    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const i = map.idx(c, r);
        // 테두리(맵 밖)는 바닥을 깔지 않는다. 장식이 선 칸은 바닥도 함께 그린다.
        if (c === 0 || r === 0 || c === map.cols - 1 || r === map.rows - 1) continue;
        const p = this._proj(c * TILE, r * TILE);
        // 화면 밖은 건너뛴다(타일이 수천 장이라 이게 없으면 느려진다).
        if (p.x - TILE > camX + this.width || p.x + TILE < camX - TILE) continue;
        if (p.y > camY + this.height || p.y + TILE * 2 < camY) continue;
        const isRoad = map.road[i] === 1;
        const key = `tile:${isRoad ? 'road' : 'base'}:${state.groundColor}:${map.variant[i]}`;
        const spr = cachedSprite(key, TILE_SHAPES[map.variant[i]], isRoad ? roadPal : pal);
        drawSprite(ctx, spr, snapPx(p.x - TILE), snapPx(p.y), PIXEL_SCALE);
      }
    }
  }

  // 워프는 바닥에 빛나는 발판으로 표시한다.
  _drawWarpPads(state, time) {
    const { ctx } = this;
    state.warps.forEach((w) => {
      const c = entityCenter(w);
      const p = this._proj(c.x, c.y);
      const pulse = 0.5 + Math.sin(time / 260) * 0.3;
      ctx.fillStyle = `rgba(140, 220, 255, ${0.25 + pulse * 0.25})`;
      this._diamond(p.x, p.y, TILE * 1.6, TILE * 0.8);
      ctx.fill();
      ctx.strokeStyle = `rgba(200, 240, 255, ${pulse})`;
      ctx.lineWidth = 2;
      this._diamond(p.x, p.y, TILE * 1.6, TILE * 0.8);
      ctx.stroke();
    });
  }

  _diamond(cx, cy, w, h) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy);
    ctx.lineTo(cx, cy + h / 2);
    ctx.lineTo(cx - w / 2, cy);
    ctx.closePath();
  }

  // ---------- 깊이 정렬 ----------
  // 뒤(x+y가 작은 쪽)부터 그려야 앞의 것이 뒤의 것을 덮는다.
  _drawSorted(state) {
    const items = [];
    const push = (x, y, fn) => items.push({ d: x + y, fn });

    state.map.props.forEach((p) => push(p.x, p.y, () => this._drawProp(p)));
    if (state.questBoard) {
      const c = entityCenter(state.questBoard);
      push(c.x, c.y, () => this._drawQuestBoardArt(state.questBoard));
    }
    state.storyNpcs.forEach((npc) => {
      const c = entityCenter(npc);
      push(c.x, c.y, () => this._drawNpcArt(npc, this._villagerLook(npc.id, '#2e86c1'), state.time, 820));
    });
    if (state.shopNpc) {
      const c = entityCenter(state.shopNpc);
      push(c.x, c.y, () => this._drawNpcArt(state.shopNpc, this._villagerLook(`shop:${state.shopNpc.name}`, '#1e8449'), state.time, 900));
    }
    state.recruitNpcs.forEach((npc) => {
      const c = entityCenter(npc);
      push(c.x, c.y, () => this._drawNpcArt(npc, this._recruitLook(npc.charDef), state.time, 760));
    });
    state.enemies.filter((e) => e.alive).forEach((e) => {
      const c = entityCenter(e);
      push(c.x, c.y, () => this._drawEnemyArt(e, state.time));
    });
    state.drops.forEach((d) => push(d.x, d.y, () => this._drawDropArt(d, state.time)));
    state.partyUnits.forEach((u) => {
      const c = entityCenter(u);
      push(c.x, c.y, () => this._drawUnitArt(u, state.time));
    });
    state.projectiles.forEach((p) => push(p.x, p.y, () => this._drawProjectile(p)));

    items.sort((a, b) => a.d - b.d);
    items.forEach((it) => it.fn());
  }

  _drawProp(prop) {
    const rows = SCENERY_SHAPES[prop.shape];
    if (!rows) return;
    const theme = this._theme || DEFAULT_THEME;
    const kind = PROP_PALETTE_KIND[prop.shape] || 'theme';
    const spr = cachedSprite(`prop:${prop.shape}:${kind}:${theme.mid}${theme.accent}`, rows, propPalette(theme, prop.shape));
    const p = this._proj(prop.x, prop.y);
    this._shadow(p.x, p.y, rows[0].length * prop.scale * 0.6);
    drawSprite(this.ctx, spr, snapPx(p.x - (rows[0].length * prop.scale) / 2), snapPx(p.y - rows.length * prop.scale + 6), prop.scale);
  }

  _shadow(sx, sy, w) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, Math.max(8, w * 0.4), Math.max(4, w * 0.2), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------- 캐릭터 ----------
  _unitFrame(u, time) {
    if (u.downed) return 'idle0';
    if (Math.hypot(u.vx || 0, u.vy || 0) > 5) return Math.floor(time / 130) % 2 ? 'walk0' : 'walk1';
    return Math.floor(time / 480) % 2 ? 'idle1' : 'idle0';
  }

  // 스프라이트는 발밑(투영된 바닥 좌표)에 세운다.
  _spriteTop(e, spr, scale) {
    const c = entityCenter(e);
    const p = this._proj(c.x, c.y);
    return { sx: snapPx(p.x - (spr.width * scale) / 2), sy: snapPx(p.y - spr.height * scale + 4), px: p.x, py: p.y };
  }

  _drawUnitArt(u, time) {
    const { ctx } = this;
    const S = PIXEL_SCALE;
    const frame = this._unitFrame(u, time);
    const spr = unitSprite(u, frame, u.facingBack ? 'back' : 'front');
    const pos = this._spriteTop(u, spr, S);
    const flip = u.facing < 0;

    this._shadow(pos.px, pos.py, u.width);
    ctx.save();
    if (u.downed) {
      ctx.globalAlpha = 0.5;
      ctx.translate(snapPx(pos.px), snapPx(pos.py - 8));
      ctx.rotate(-Math.PI / 2);
      drawSprite(ctx, spr, -(spr.height * S) / 2, -(spr.width * S) / 2, S, flip);
      ctx.restore();
      return;
    }
    if (u.hitFlash > 0) ctx.globalAlpha = 0.55 + Math.sin(time / 40) * 0.2;
    const tint = this._statusTint(u, time);
    drawSprite(ctx, tint ? tintedSprite(spr, tint.color, tint.alpha) : spr, pos.sx, pos.sy, S, flip);
    this._drawHeldWeapon(u, pos.sx, pos.sy, flip, frame);
    ctx.restore();
    if (hasStatus(u, 'stun')) this._drawStunStars(pos.px, pos.sy, time);
  }

  // 현재 스탠스의 무기를 앞손에 쥐여 그린다. 공격 중이면 휘두르거나 반동을 준다.
  _drawHeldWeapon(u, sx, sy, flip, frame) {
    const gear = heldWeaponGear(u);
    if (!gear) return;
    const { ctx } = this;
    const S = PIXEL_SCALE;
    const grip = WEAPON_GRIP[STANCE_SHAPE[gear.stanceId]] || WEAPON_GRIP.sword;
    const bob = frame === 'idle1' || frame === 'walk1' ? 1 : 0;
    const handCol = 12.5;
    const handRow = UNIT_HEADROOM + 16.5 + bob;
    const hx = flip ? sx + (UNIT_W - handCol) * S : sx + handCol * S;
    const hy = sy + handRow * S;

    const t = clamp((u.attackAnim || 0) / 320, 0, 1);
    const angle = grip.angle + (t > 0 ? grip.swing * ((1 - t) * 1.8 - 0.9) : 0);
    const recoil = grip.swing === 0 ? -t * 4 : 0;

    ctx.save();
    ctx.translate(hx, hy);
    if (flip) ctx.scale(-1, 1);
    ctx.rotate(angle);
    drawSprite(ctx, itemSprite(gear.itemId), -grip.gx * S + recoil, -grip.gy * S, S);
    ctx.restore();
  }

  // 상태이상 덧칠 색. 알파는 고정값만 써서 캐시가 늘지 않게 한다.
  _statusTint(t, time) {
    const s = t.statuses;
    if (!s) return null;
    if (s.freeze) return { color: '#bfefff', alpha: 0.6 };
    if (s.shock && Math.floor(time / 90) % 3 === 0) return { color: '#fff7a8', alpha: 0.7 };
    if (s.burn && Math.sin(time / 70) > 0.2) return { color: '#ff7a1a', alpha: 0.4 };
    if (s.chill) return { color: '#5dade2', alpha: 0.35 };
    if (s.bleed && Math.sin(time / 110) > 0.6) return { color: '#c0392b', alpha: 0.4 };
    return null;
  }

  _drawStunStars(cx, topY, time) {
    const { ctx } = this;
    ctx.fillStyle = STATUS_DATA.stun.color;
    for (let i = 0; i < 3; i++) {
      const a = time / 200 + i * (Math.PI * 2 / 3);
      ctx.fillRect(snapPx(cx + Math.cos(a) * 14 - 2), snapPx(topY - 6 + Math.sin(a) * 4 - 2), 4, 4);
    }
  }

  _labelTop(e, spriteH, scale) {
    const c = entityCenter(e);
    const p = this._proj(c.x, c.y);
    return { cx: p.x, top: p.y - spriteH * scale + 4 };
  }

  _drawUnitLabel(u, isActive, time = 0, party = [], index = 0) {
    const { ctx } = this;
    const { cx, top } = this._labelTop(u, UNIT_H + UNIT_HEADROOM, PIXEL_SCALE);
    // 파티가 겹쳐 서면 이름표가 포개진다. 앞 순서의 가까운 동료 수만큼 위로 띄운다.
    let stack = 0;
    for (let i = 0; i < index; i++) {
      const o = party[i];
      if (o && planeDist(o, u) < 60) stack += 1;
    }
    const y = top - stack * 13;
    this._drawStatusIcons(u, cx, y - (isActive ? 54 : 38), time);

    if (isActive) {
      ctx.fillStyle = '#f1c40f';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 6, y - 33);
      ctx.lineTo(cx, y - 25);
      ctx.lineTo(cx + 6, y - 33);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    this._text(u.name, cx, y - 11, '#fff', '11px sans-serif');
    this._drawBar(cx - u.width, y - 8, u.width * 2, 4, u.hp / u.maxHp, '#e74c3c');
  }

  // ---------- 몬스터 ----------
  _enemyScale(e) { return e.boss ? BOSS_PIXEL_SCALE : PIXEL_SCALE; }

  _drawEnemyArt(e, time) {
    const { ctx } = this;
    const S = this._enemyScale(e);
    const moving = Math.hypot(e.vx || 0, e.vy || 0) > 5;
    const frame = moving && Math.floor(time / 150) % 2 ? 'b' : 'a';
    const spr = monsterSprite(e, frame, e.facingBack ? 'back' : 'front');
    const pos = this._spriteTop(e, spr, S);
    const lunge = (e.attackAnim || 0) > 0 && !isHardCc(e) ? e.facing * 6 : 0;

    // 보스 예고: 강타 범위를 바닥에 깐다(글자는 라벨 층에서).
    if (e.boss && e.phase === 'telegraph' && e.current) {
      const blink = 0.35 + Math.abs(Math.sin(time / 90)) * 0.5;
      if (e.current.type === 'slam') {
        ctx.fillStyle = `rgba(241,196,15,${blink * 0.3})`;
        this._diamond(pos.px, pos.py, e.current.radius * 2, e.current.radius);
        ctx.fill();
        ctx.strokeStyle = `rgba(241,196,15,${blink})`;
        ctx.lineWidth = 2;
        this._diamond(pos.px, pos.py, e.current.radius * 2, e.current.radius);
        ctx.stroke();
      }
    }

    this._shadow(pos.px, pos.py, e.width);
    ctx.save();
    if (e.name.includes('망령')) ctx.globalAlpha = 0.8;
    if (e.hitFlash > 0) ctx.globalAlpha *= 0.55;
    const tint = this._statusTint(e, time);
    drawSprite(ctx, tint ? tintedSprite(spr, tint.color, tint.alpha) : spr, pos.sx + lunge, pos.sy, S, e.facing < 0);
    ctx.restore();
    if (hasStatus(e, 'stun')) this._drawStunStars(pos.px, pos.sy, time);
  }

  _drawEnemyLabel(e, time, isTarget, partyLevel) {
    const { ctx } = this;
    const S = this._enemyScale(e);
    const spr = monsterSprite(e, 'a');
    const { cx, top } = this._labelTop(e, spr.height, S);
    const hostile = e.aggressive || e.provoked;
    const hasIcons = e.statuses && Object.keys(e.statuses).length > 0;
    this._drawStatusIcons(e, cx, top - 36, time);

    if (e.boss && e.phase === 'telegraph' && e.current) {
      const blink = 0.35 + Math.abs(Math.sin(time / 90)) * 0.5;
      this._text(`⚠ ${e.current.warn}`, cx, top - (hasIcons ? 42 : 22), `rgba(255,80,60,${blink})`, 'bold 13px sans-serif');
    }
    if (isTarget) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - e.width, top - 3, e.width * 2, spr.height * S + 6);
    }
    this._text(`${hostile ? '▲' : '○'} Lv.${e.level} ${e.name}`, cx, top - 8, dangerColor(e.level, partyLevel), '10px sans-serif');
    this._drawBar(cx - e.width, top - 5, e.width * 2, 4, e.hp / e.maxHp, hostile ? '#c0392b' : '#7dcea0');
  }

  // 머리 위 상태이상 아이콘 줄(원래 해상도).
  _drawStatusIcons(target, cx, y, time) {
    const list = statusList(target);
    if (list.length === 0) return;
    const { ctx } = this;
    const box = 16;
    const gap = 2;
    let x = Math.round(cx - (list.length * (box + gap) - gap) / 2);
    list.forEach((s) => {
      ctx.save();
      if (s.remaining < 1000 && Math.floor(time / 120) % 2 === 0) ctx.globalAlpha = 0.35;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x, y, box, box);
      drawSprite(ctx, statusIconSprite(s.id), x + 1, y + 1, 2);
      if (s.stacks > 1) this._text(`${s.stacks}`, x + box - 2, y + box + 1, '#fff', 'bold 9px sans-serif');
      ctx.restore();
      x += box + gap;
    });
  }

  // ---------- NPC ----------
  _recruitLook(charDef) {
    return this._cachedLook(`recruit:${charDef.id}`, () => ({
      defId: charDef.id, color: charDef.color, armorClass: ARMOR_CLASS_BY_TYPE[charDef.attackType], equipment: null,
    }));
  }

  _villagerLook(id, color) {
    return this._cachedLook(`npc:${id}`, () => ({ defId: `npc:${id}`, color, armorClass: 'light', equipment: null }));
  }

  _cachedLook(key, make) {
    let look = this._npcLooks.get(key);
    if (!look) { look = make(); this._npcLooks.set(key, look); }
    return look;
  }

  _drawNpcArt(npc, look, time, bobSpeed) {
    const S = PIXEL_SCALE;
    const frame = Math.floor(time / bobSpeed) % 2 ? 'idle1' : 'idle0';
    const spr = unitSprite(look, frame);
    const pos = this._spriteTop(npc, spr, S);
    this._shadow(pos.px, pos.py, npc.width);
    drawSprite(this.ctx, spr, pos.sx, pos.sy, S);
  }

  _npcLabelTop(npc) {
    const spr = unitSprite(this._villagerLook('x', '#fff'), 'idle0');
    return this._labelTop(npc, spr.height, PIXEL_SCALE);
  }

  _drawStoryNpcLabel(npc, activeId, time) {
    const { cx, top } = this._npcLabelTop(npc);
    if (npc.id === activeId) this._text('!', cx, top - 14 + Math.sin(time / 280) * 2, '#f1c40f', 'bold 15px sans-serif');
    this._text(npc.name, cx, top - 2, '#aed6f1', '11px sans-serif');
  }

  _drawShopNpcLabel(npc, time) {
    const { cx, top } = this._npcLabelTop(npc);
    this._text('$', cx, top - 14 + Math.sin(time / 300) * 2, '#f7dc6f', 'bold 14px sans-serif');
    this._text(npc.name, cx, top - 2, '#a9dfbf', '11px sans-serif');
  }

  _drawRecruitNpcLabel(npc, time, status) {
    const { cx, top } = this._npcLabelTop(npc);
    const mark = { available: '!', active: '…', ready: '?', done: '✓' }[status] || '';
    const color = { available: '#f1c40f', active: '#f5b041', ready: '#2ecc71', done: '#7f8c8d' }[status] || '#fff';
    if (mark) this._text(mark, cx, top - 14 + Math.sin(time / 260) * 2, color, 'bold 15px sans-serif');
    this._text(npc.name, cx, top - 2, '#f9e79f', '11px sans-serif');
  }

  _drawQuestBoardArt(b) {
    const { ctx } = this;
    const c = entityCenter(b);
    const p = this._proj(c.x, c.y);
    this._shadow(p.x, p.y, b.width);
    ctx.fillStyle = '#6b4f2a';
    ctx.fillRect(snapPx(p.x - 20), snapPx(p.y - 34), 6, 34);
    ctx.fillRect(snapPx(p.x + 14), snapPx(p.y - 34), 6, 34);
    ctx.fillStyle = '#5a4020';
    ctx.fillRect(snapPx(p.x - 24), snapPx(p.y - 62), 48, 30);
    ctx.fillStyle = '#8d6e3a';
    ctx.fillRect(snapPx(p.x - 22), snapPx(p.y - 60), 44, 26);
    ctx.fillStyle = '#f2e6c8';
    ctx.fillRect(snapPx(p.x - 18), snapPx(p.y - 56), 14, 10);
    ctx.fillRect(snapPx(p.x + 2), snapPx(p.y - 54), 14, 12);
  }

  _drawQuestBoardLabel(b, time, hasQuest) {
    const c = entityCenter(b);
    const p = this._proj(c.x, c.y);
    if (hasQuest) this._text('!', p.x, p.y - 76 + Math.sin(time / 280) * 2, '#f1c40f', 'bold 15px sans-serif');
    this._text(b.name, p.x, p.y - 66, '#f9e79f', '11px sans-serif');
  }

  _drawWarpLabel(w, isPrompt) {
    const c = entityCenter(w);
    const p = this._proj(c.x, c.y);
    const color = w.type === 'town' ? '#a9dfbf' : '#f5b7b1';
    this._text(`${w.label} (Lv.${w.level})`, p.x, p.y - 30, color, '11px sans-serif');
    if (isPrompt) this._text('Enter 이동', p.x, p.y - 16, '#f7dc6f', 'bold 11px sans-serif');
  }

  // ---------- 전리품·투사체 ----------
  _drawDropArt(d, time) {
    const { ctx } = this;
    const S = PIXEL_SCALE;
    const spr = d.kind === 'meso' ? mesoSprite() : itemSprite(d.itemId);
    const w = spr.width * S;
    const h = spr.height * S;
    const p = this._proj(d.x, d.y);
    const hop = d.hop > 0 ? -Math.sin((1 - d.hop / DROP_HOP_MS) * Math.PI) * 18 : 0;
    const bob = d.hop <= 0 ? Math.round(Math.sin((time + d.bob) / 260) * 2) * 2 : 0;
    this._shadow(p.x, p.y, 16);
    if (d.kind === 'gear') {
      const tier = ITEM_DATA[d.itemId].tier;
      ctx.fillStyle = `${TIER_COLOR[tier]}44`;
      ctx.fillRect(snapPx(p.x - 6), snapPx(p.y - h - 40), 12, 40 + h);
    }
    drawSprite(ctx, spr, snapPx(p.x - w / 2), snapPx(p.y - h + hop + bob), S);
  }

  _drawProjectile(p) {
    const { ctx } = this;
    const s = this._proj(p.x, p.y);
    const dir = Math.sign(isoSX(p.vx || 1, p.vy || 0)) || 1;
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = p.color;
    for (let i = 1; i <= 3; i++) ctx.fillRect(snapPx(s.x - dir * i * 8), snapPx(s.y - 16 - 2), 4, 4);
    ctx.restore();
    ctx.fillStyle = p.color;
    ctx.fillRect(snapPx(s.x - 6), snapPx(s.y - 18), 12, 4);
    ctx.fillRect(snapPx(s.x - 2), snapPx(s.y - 22), 4, 12);
    ctx.fillStyle = '#fff';
    ctx.fillRect(snapPx(s.x - 2), snapPx(s.y - 18), 4, 4);
  }

  // ---------- 공통 ----------
  _text(str, x, y, color, font) {
    const { ctx } = this;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  _drawBar(x, y, w, h, ratio, color) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * clamp(ratio, 0, 1), h);
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  // ---------- 미니맵 ----------
  // 쿼터뷰에서는 맵이 실제로 2차원이라 미니맵이 위에서 본 지도가 된다.
  drawMinimap(canvas, state) {
    const mctx = canvas.getContext('2d');
    const size = MINIMAP_SIZE;
    const k = canvas.width / MINIMAP_SIZE;
    mctx.setTransform(k, 0, 0, k, 0, 0);
    mctx.clearRect(0, 0, size, size);
    mctx.fillStyle = 'rgba(20,30,40,0.85)';
    mctx.beginPath(); mctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2); mctx.fill();
    mctx.save();
    mctx.beginPath(); mctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2); mctx.clip();

    const map = state.map;
    const sx = size / map.w;
    const sy = size / map.h;
    const dot = (e, color, r) => {
      const c = entityCenter(e);
      mctx.fillStyle = color;
      mctx.beginPath();
      mctx.arc(c.x * sx, c.y * sy, r, 0, Math.PI * 2);
      mctx.fill();
    };
    mctx.fillStyle = 'rgba(255,255,255,0.06)';
    mctx.fillRect(0, (ROAD_ROW_FROM * TILE) * sy, size, ((ROAD_ROW_TO - ROAD_ROW_FROM + 1) * TILE) * sy);
    state.warps.forEach((w) => dot(w, '#8ad6ff', 3));
    state.recruitNpcs.forEach((n) => dot(n, '#f1c40f', 2.5));
    state.enemies.filter((e) => e.alive).forEach((e) => dot(e, '#e74c3c', 2.5));
    state.partyUnits.forEach((u) => dot(u, u.color, 3.5));
    mctx.restore();
    mctx.strokeStyle = 'rgba(255,255,255,0.4)';
    mctx.beginPath(); mctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2); mctx.stroke();
  }
}
