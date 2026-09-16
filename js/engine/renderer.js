// 화면 그리기. 두 겹으로 나눠 그린다.
//  1) 월드 그림(배경·발판·캐릭터·몬스터·이펙트)은 반해상도 버퍼(480x270)에 그린 뒤 픽셀 그대로 두 배로 키운다.
//     도트 한 칸 = 월드 2px로 모든 그림의 픽셀 크기가 같아진다.
//  2) 글자와 체력바는 원래 해상도에 따로 그린다. 버퍼에 그리면 뭉개져서 못 읽는다.
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
    this.camX = 0;
    this.cam = 0;
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
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
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

  updateCamera(activeUnit, worldWidth) {
    const target = activeUnit.x - this.width / 2;
    this.camX = clamp(target, 0, Math.max(0, worldWidth - this.width));
  }

  draw(state) {
    const theme = THEME_DATA[state.theme] || DEFAULT_THEME;
    this.cam = snapPx(this.camX);

    // ---- 1) 월드 그림: 반해상도 버퍼 ----
    const b = this.bctx;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, this.buffer.width, this.buffer.height);
    b.imageSmoothingEnabled = false;
    b.setTransform(1 / PIXEL_SCALE, 0, 0, 1 / PIXEL_SCALE, 0, 0);
    this.ctx = b;

    this._drawBackground(theme, state);
    b.save();
    b.translate(-this.cam, 0);
    state.platforms.forEach((p) => this._drawPlatform(p, theme));
    state.ropes.forEach((r) => this._drawRopeArt(r));
    state.warps.forEach((w) => this._drawWarpArt(w, state.time));
    if (state.questBoard) this._drawQuestBoardArt(state.questBoard);
    state.storyNpcs.forEach((npc) => this._drawNpcArt(npc, this._villagerLook(npc.id, '#2e86c1'), state.time, 820));
    if (state.shopNpc) this._drawNpcArt(state.shopNpc, this._villagerLook(`shop:${state.shopNpc.name}`, '#1e8449'), state.time, 900);
    state.recruitNpcs.forEach((npc) => this._drawNpcArt(npc, this._recruitLook(npc.charDef), state.time, 760));
    state.enemies.filter((e) => e.alive).forEach((e) => this._drawEnemyArt(e, state.time));
    state.drops.forEach((d) => this._drawDropArt(d, state.time));
    state.partyUnits.forEach((u) => this._drawUnitArt(u, state.time));
    state.projectiles.forEach((p) => this._drawProjectile(p));
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
    m.translate(-this.cam, 0);
    state.warps.forEach((w) => this._drawWarpLabel(w, w === state.warpPrompt));
    if (state.ropePrompt) this._text(state.ropePrompt.text, state.ropePrompt.rope.x, state.ropePrompt.y, '#f7dc6f', 'bold 11px sans-serif');
    if (state.questBoard) this._drawQuestBoardLabel(state.questBoard, state.time, state.boardHasQuest);
    state.storyNpcs.forEach((npc) => this._drawStoryNpcLabel(npc, state.activeStoryNpcId, state.time));
    if (state.shopNpc) this._drawShopNpcLabel(state.shopNpc, state.time);
    state.recruitNpcs.forEach((npc) => this._drawRecruitNpcLabel(npc, state.time, state.recruitStatus[npc.charId]));
    state.enemies.filter((e) => e.alive).forEach((e) => this._drawEnemyLabel(e, state.time, e === state.target, state.partyLevel));
    state.partyUnits.forEach((u, i) => this._drawUnitLabel(u, i === state.activeIndex, state.time, state.partyUnits, i));
    state.effects.drawTexts(m);
    m.restore();
  }

  // ---------- 배경 ----------
  // 배경은 카메라 이동을 직접 반영한다(이 단계에서는 아직 월드 좌표로 옮기기 전이다).
  _drawBackground(theme, state) {
    const { ctx } = this;
    // 하늘: 그라데이션 대신 계단식 색 띠. 도트 화면에 맞춰 색 단계를 눈에 보이게 끊는다.
    const bands = 9;
    for (let i = 0; i < bands; i++) {
      const y = snapPx((GROUND_Y / bands) * i);
      const y2 = i === bands - 1 ? GROUND_Y : snapPx((GROUND_Y / bands) * (i + 1));
      ctx.fillStyle = mixHex(theme.sky[0], theme.sky[1], i / (bands - 1));
      ctx.fillRect(0, y, this.width, y2 - y);
    }
    this._drawClouds();
    this._drawFarLayer(theme);
    this._drawMidLayer(theme);
    this._drawGround(state);
  }

  _drawClouds() {
    const { ctx } = this;
    const period = 520;
    const off = -(this.cam * 0.08) % period;
    ctx.save();
    ctx.globalAlpha = 0.85;
    for (let i = -1; i < this.width / period + 2; i++) {
      const bx = off + i * period;
      CLOUD_LAYOUT.forEach((c) => {
        const spr = cachedSprite(`scenery:cloud:${c.shape}`, SCENERY_SHAPES[c.shape], cloudPalette());
        drawSprite(ctx, spr, snapPx(bx + c.x), snapPx(c.y), c.scale);
      });
    }
    ctx.restore();
  }

  _drawFarLayer(theme) {
    const off = -(this.cam * 0.18) % 420;
    // 대기 원근: 먼 산일수록 하늘색을 섞어 흐리게. 안 그러면 앞의 장식과 같은 거리로 보인다.
    const hazed = {
      a: mixHex(shadeHex(theme.far, 1.3), theme.sky[1], 0.45),
      b: mixHex(theme.far, theme.sky[1], 0.35),
      c: mixHex(shadeHex(theme.far, 0.78), theme.sky[1], 0.3),
    };
    const cell = Math.floor((this.cam * 0.18) / 420);
    for (let i = -1; i < this.width / 420 + 2; i++) {
      const bx = off + i * 420;
      FAR_MOUNTAINS.forEach((m, k) => {
        // 칸마다 크기를 조금씩 흔들어 같은 산이 반복되는 티를 줄인다.
        const h = hashStr(`mt:${cell + i}:${k}`);
        const width = m.width + ((h % 5) - 2) * 18;
        const height = m.height + (((h >>> 4) % 5) - 2) * 10;
        this._pixelMountain(bx + m.x + ((h >>> 8) % 40) - 20, width, height, hazed);
      });
    }
  }

  // 먼 산: 삼각형 대신 4px 단으로 쌓는다. 비탈이 계단으로 보여야 도트 화면과 붙는다.
  _pixelMountain(cx, width, height, pal) {
    const { ctx } = this;
    const step = 4;
    const rows = Math.max(1, Math.round(height / step));
    const baseY = GROUND_Y - 10; // 지평선보다 살짝 위에서 끝내 뒤쪽에 있는 것처럼 보이게
    for (let r = 0; r < rows; r++) {
      const y = snapPx(baseY - (r + 1) * step);
      const w = snapPx((width * (rows - r)) / rows);
      if (w <= 0) continue;
      const x = snapPx(cx - w / 2);
      const side = Math.min(6, w / 2);
      ctx.fillStyle = r >= rows - 3 ? pal.a : pal.b; // 꼭대기는 밝게(눈·햇빛)
      ctx.fillRect(x, y, w, step);
      ctx.fillStyle = pal.a;
      ctx.fillRect(x, y, side, step);
      ctx.fillStyle = pal.c;
      ctx.fillRect(x + w - side, y, side, step);
    }
  }

  _drawMidLayer(theme) {
    const layout = DECOR_LAYOUT[theme.decor];
    if (!layout) return;
    const pal = sceneryPalette(theme, 'mid');
    const off = -(this.cam * 0.45) % 260;
    const cell = Math.floor((this.cam * 0.45) / 260);
    for (let i = -1; i < this.width / 260 + 2; i++) {
      const bx = off + i * 260;
      layout.forEach((d, k) => {
        // 칸마다 위치·좌우를 흔들고 가끔 하나를 비운다. 같은 배치가 반복되면 배경이 벽지처럼 보인다.
        const h = hashStr(`dc:${theme.decor}:${cell + i}:${k}`);
        if ((h >>> 12) % 7 === 0) return;
        const rows = SCENERY_SHAPES[d.shape];
        const spr = cachedSprite(`scenery:${d.shape}:${theme.mid}${theme.accent}`, rows, pal);
        const x = snapPx(bx + d.x + (h % 36) - 18);
        const y = snapPx(GROUND_Y - rows.length * d.scale);
        drawSprite(this.ctx, spr, x, y, d.scale, ((h >>> 5) & 1) === 1);
      });
    }
  }

  // 지면: 표면 타일을 이어 붙이고 그 아래는 흙 + 자갈. 자갈은 월드 좌표에 고정해 스크롤해도 제자리다.
  _drawGround(state) {
    const { ctx } = this;
    const pal = groundPalette(state.groundColor);
    ctx.fillStyle = pal.c;
    ctx.fillRect(0, GROUND_Y, this.width, this.height - GROUND_Y);

    const top = cachedSprite(`ground:${state.groundColor}`, SCENERY_SHAPES.ground_top, pal);
    const tileW = 16 * PIXEL_SCALE;
    const off = -(this.cam % tileW);
    for (let x = off - tileW; x < this.width + tileW; x += tileW) {
      drawSprite(ctx, top, snapPx(x), GROUND_Y, PIXEL_SCALE);
    }

    ctx.fillStyle = pal.d;
    const cell = 26;
    const first = Math.floor(this.cam / cell) - 1;
    const rows = Math.ceil((this.height - GROUND_Y - 20) / cell);
    for (let i = 0; i < this.width / cell + 3; i++) {
      const c = first + i;
      for (let r = 0; r < rows; r++) {
        const h = hashStr(`${c}:${r}`);
        if (h % 3 !== 0) continue;
        const px = snapPx(c * cell + (h >>> 3) % cell - this.cam);
        const py = snapPx(GROUND_Y + 20 + r * cell + (h >>> 11) % 12);
        ctx.fillRect(px, py, 4, 4);
      }
    }
  }

  // 2층 발판: 판자 타일을 이어 붙이고 기둥으로 받친다. 색은 존 테마의 강조색을 나무색 자리에 넣는다.
  _drawPlatform(p, theme) {
    const { ctx } = this;
    const pal = {
      h: theme.accent,
      j: shadeHex(theme.accent, 0.72),
      d: shadeHex(theme.accent, 0.42),
    };
    const plank = cachedSprite(`plat:${theme.accent}`, SCENERY_SHAPES.plank, pal);
    const post = cachedSprite(`post:${theme.accent}`, SCENERY_SHAPES.post, pal);
    const tileW = 16 * PIXEL_SCALE;
    const deckH = 8 * PIXEL_SCALE;

    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y, p.width, deckH);
    ctx.clip();
    for (let x = snapPx(p.x); x < p.x + p.width; x += tileW) {
      drawSprite(ctx, plank, x, snapPx(p.y), PIXEL_SCALE);
    }
    ctx.restore();

    const postH = 8 * PIXEL_SCALE;
    [snapPx(p.x + 16), snapPx(p.x + p.width - 28)].forEach((px) => {
      for (let y = snapPx(p.y + deckH); y < GROUND_Y; y += postH) {
        drawSprite(ctx, post, px, y, PIXEL_SCALE);
      }
    });
  }

  // 2px 격자에 맞춘 타원. 워프·폭발처럼 곡선이 필요한 곳에서 도형 대신 쓴다.
  _pixelEllipse(cx, cy, rx, ry, color, filled = true) {
    const { ctx } = this;
    const S = PIXEL_SCALE;
    ctx.fillStyle = color;
    for (let y = -ry; y <= ry; y += S) {
      const t = 1 - (y * y) / (ry * ry);
      if (t <= 0) continue;
      const w = snapPx(rx * Math.sqrt(t));
      if (w < S) continue;
      const yy = snapPx(cy + y);
      if (filled) {
        ctx.fillRect(snapPx(cx) - w, yy, w * 2, S);
      } else {
        ctx.fillRect(snapPx(cx) - w, yy, S * 2, S);
        ctx.fillRect(snapPx(cx) + w - S * 2, yy, S * 2, S);
      }
    }
  }

  // 로프: 굵은 줄 + 매듭 + 꼭대기 고리
  _drawRopeArt(r) {
    const { ctx } = this;
    const h = r.bottom - r.top;
    ctx.fillStyle = '#4a3419';
    ctx.fillRect(r.x - 4, r.top, 8, h);
    ctx.fillStyle = '#a07a44';
    ctx.fillRect(r.x - 2, r.top, 2, h);
    ctx.fillStyle = '#3a2812';
    for (let y = r.top + 14; y < r.bottom - 4; y += 18) ctx.fillRect(r.x - 6, y, 12, 4);
    ctx.fillStyle = '#6b4f2a';
    ctx.fillRect(r.x - 10, r.top - 2, 20, 6);
  }

  // 바닥 전리품: 아이템 아이콘(장비는 티어 색 빛기둥) 또는 메소. 바닥에 닿으면 살짝 통통 튄다.
  _drawDropArt(d, time) {
    const { ctx } = this;
    const S = PIXEL_SCALE;
    const spr = d.kind === 'meso' ? mesoSprite() : itemSprite(d.itemId);
    const w = spr.width * S;
    const h = spr.height * S;
    const bob = d.grounded ? Math.round(Math.sin((time + d.bob) / 260) * 2) * 2 : 0;
    if (d.kind === 'gear' && d.grounded) {
      const tier = ITEM_DATA[d.itemId].tier;
      ctx.fillStyle = `${TIER_COLOR[tier]}44`;
      ctx.fillRect(snapPx(d.x - 6), snapPx(d.y - h - 40), 12, 40 + h);
    }
    drawSprite(ctx, spr, snapPx(d.x - w / 2), snapPx(d.y - h + bob), S);
  }

  _shadow(cx, bottomY, w) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, bottomY, w * 0.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------- 캐릭터 ----------
  _unitFrame(u, time) {
    if (u.downed) return 'idle0';
    if (u.onRope) return u.climbing && Math.floor(time / 160) % 2 ? 'walk0' : 'idle0';
    if (Math.abs(u.vx) > 5 || !u.grounded) return Math.floor(time / 130) % 2 ? 'walk0' : 'walk1';
    return Math.floor(time / 480) % 2 ? 'idle1' : 'idle0';
  }

  // 스프라이트 윗변(모자 여유 포함). 이름·체력바를 이 위에 얹는다.
  _unitTop(u) {
    return u.y + u.height - (UNIT_H + UNIT_HEADROOM) * PIXEL_SCALE;
  }

  _drawUnitArt(u, time) {
    const { ctx } = this;
    const S = PIXEL_SCALE;
    const frame = this._unitFrame(u, time);
    const spr = unitSprite(u, frame);
    const w = spr.width * S;
    const h = spr.height * S;
    const cx = u.x + u.width / 2;
    const bottom = u.y + u.height;
    const flip = u.facing < 0;

    this._shadow(cx, bottom, u.width);
    ctx.save();
    if (u.downed) {
      // 쓰러지면 옆으로 눕고 흐려진다.
      ctx.globalAlpha = 0.5;
      ctx.translate(snapPx(cx), snapPx(bottom - w / 2));
      ctx.rotate(-Math.PI / 2);
      drawSprite(ctx, spr, -w / 2, -h, S, flip);
      ctx.restore();
      return;
    }
    if (u.hitFlash > 0) ctx.globalAlpha = 0.55 + Math.sin(time / 40) * 0.2;
    const sx = snapPx(cx - w / 2);
    const sy = snapPx(bottom - h);
    const tint = this._statusTint(u, time);
    drawSprite(ctx, tint ? tintedSprite(spr, tint.color, tint.alpha) : spr, sx, sy, S, flip);
    if (!u.onRope) this._drawHeldWeapon(u, sx, sy, flip, frame); // 로프에 매달리면 무기를 등에 멘다
    ctx.restore();
    if (hasStatus(u, 'stun')) this._drawStunStars(cx, sy + UNIT_HEADROOM * S, time);
  }

  // 상태이상 덧칠 색: 빙결은 얼음색으로 굳고, 감전·화상·출혈은 깜빡인다. 알파는 고정값만 써서 캐시가 늘지 않게 한다.
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

  // 기절: 머리 위를 도는 별 세 개(도트 버퍼에 2×2칸).
  _drawStunStars(cx, top, time) {
    const { ctx } = this;
    ctx.fillStyle = STATUS_DATA.stun.color;
    for (let i = 0; i < 3; i++) {
      const a = time / 200 + i * (Math.PI * 2 / 3);
      const x = cx + Math.cos(a) * 14;
      const y = top - 6 + Math.sin(a) * 4;
      ctx.fillRect(snapPx(x - 2), snapPx(y - 2), 4, 4);
    }
  }

  // 머리 위 상태이상 아이콘 줄(원래 해상도). 끝나기 1초 전부터 깜빡이고, 중첩은 숫자로.
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
    // t가 1→0으로 줄어드는 동안 뒤로 젖혔다가 앞으로 내리친다.
    const angle = grip.angle + (t > 0 ? grip.swing * ((1 - t) * 1.8 - 0.9) : 0);
    const recoil = grip.swing === 0 ? -t * 4 : 0;

    ctx.save();
    ctx.translate(hx, hy);
    if (flip) ctx.scale(-1, 1);
    ctx.rotate(angle);
    drawSprite(ctx, itemSprite(gear.itemId), -grip.gx * S + recoil, -grip.gy * S, S);
    ctx.restore();
  }

  _drawUnitLabel(u, isActive, time = 0, party = [], index = 0) {
    const { ctx } = this;
    const cx = u.x + u.width / 2;
    // 파티가 겹쳐 서면 이름표가 포개진다. 앞 순서의 가까운 동료 수만큼 위로 띄운다.
    let stack = 0;
    for (let i = 0; i < index; i++) {
      const o = party[i];
      if (o && Math.abs((o.x + o.width / 2) - cx) < 46) stack += 1;
    }
    const top = (u.downed ? u.y + u.height - 34 : this._unitTop(u)) - stack * 13;
    this._drawStatusIcons(u, cx, top - (isActive ? 54 : 38), time);

    if (isActive) {
      ctx.fillStyle = '#f1c40f';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 6, top - 33);
      ctx.lineTo(cx, top - 25);
      ctx.lineTo(cx + 6, top - 33);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    this._text(u.name, cx, top - 11, '#fff', '11px sans-serif');
    this._drawBar(u.x, top - 8, u.width, 4, u.hp / u.maxHp, '#e74c3c');
  }

  // ---------- 몬스터 ----------
  _enemyScale(e) { return e.boss ? BOSS_PIXEL_SCALE : PIXEL_SCALE; }

  _enemyTop(e) {
    return Math.min(e.y, e.y + e.height - UNIT_H * this._enemyScale(e));
  }

  _drawEnemyArt(e, time) {
    const { ctx } = this;
    const S = this._enemyScale(e);
    const moving = Math.abs(e.vx) > 5;
    const frame = moving && Math.floor(time / 150) % 2 ? 'b' : 'a';
    const spr = monsterSprite(e, frame);
    const w = spr.width * S;
    const h = spr.height * S;
    const cx = e.x + e.width / 2;
    const bottom = e.y + e.height;
    const lunge = (e.attackAnim || 0) > 0 ? e.facing * 6 : 0;

    // 보스 예고: 강타 범위·돌진 경로를 바닥에 깐다(글자는 라벨 층에서).
    if (e.boss && e.phase === 'telegraph' && e.current) {
      const blink = 0.35 + Math.abs(Math.sin(time / 90)) * 0.5;
      if (e.current.type === 'slam') {
        ctx.fillStyle = `rgba(241,196,15,${blink * 0.35})`;
        ctx.beginPath();
        ctx.ellipse(cx, GROUND_Y - 4, e.current.radius, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(241,196,15,${blink})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (e.current.type === 'charge') {
        ctx.fillStyle = `rgba(231,76,60,${blink * 0.3})`;
        const len = 260;
        ctx.fillRect(e.facing > 0 ? cx : cx - len, e.y, len, e.height);
      }
    }

    this._shadow(cx, bottom, e.boss ? w * 0.8 : e.width);
    ctx.save();
    if (e.name.includes('망령')) ctx.globalAlpha = 0.8; // 망령은 반투명
    if (e.hitFlash > 0) ctx.globalAlpha *= 0.55;
    const tint = this._statusTint(e, time);
    // 기절·빙결 중엔 제자리에서 굳어 공격 동작(돌진 흔들림)도 멈춘다.
    const shake = isHardCc(e) ? 0 : lunge;
    drawSprite(ctx, tint ? tintedSprite(spr, tint.color, tint.alpha) : spr, snapPx(cx - w / 2 + shake), snapPx(bottom - h), S, e.facing < 0);
    ctx.restore();
    if (hasStatus(e, 'stun')) this._drawStunStars(cx, this._enemyTop(e), time);
  }

  _drawEnemyLabel(e, time, isTarget, partyLevel) {
    const { ctx } = this;
    const cx = e.x + e.width / 2;
    const top = this._enemyTop(e);
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
      ctx.strokeRect(e.x - 3, top - 3, e.width + 6, e.y + e.height - top + 6);
    }
    // 레벨 차로 색을 바꿔, 이 사냥터가 지금 내 수준에 맞는지 한눈에 보이게 한다.
    this._text(`${hostile ? '▲' : '○'} Lv.${e.level} ${e.name}`, cx, top - 8, dangerColor(e.level, partyLevel), '10px sans-serif');
    this._drawBar(e.x, top - 5, e.width, 4, e.hp / e.maxHp, hostile ? '#c0392b' : '#7dcea0');
  }

  // ---------- NPC ----------
  // NPC도 캐릭터와 같은 도트 틀을 쓴다. 영입 NPC는 영입 후 모습과 똑같이 보인다.
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

  _npcTop(npc) { return npc.y + npc.height - (UNIT_H + UNIT_HEADROOM) * PIXEL_SCALE; }

  _drawNpcArt(npc, look, time, bobSpeed) {
    const S = PIXEL_SCALE;
    const frame = Math.floor(time / bobSpeed) % 2 ? 'idle1' : 'idle0';
    const spr = unitSprite(look, frame);
    const cx = npc.x + npc.width / 2;
    const bottom = npc.y + npc.height;
    this._shadow(cx, bottom, npc.width);
    // NPC는 왼쪽(마을 입구 쪽)을 바라보게 둔다.
    drawSprite(this.ctx, spr, snapPx(cx - spr.width * S / 2), snapPx(bottom - spr.height * S), S, true);
  }

  // status: 'available'(수락 가능) / 'active'(진행 중) / 'ready'(완료, 돌아오면 영입) / 'done'(영입 완료)
  _drawRecruitNpcLabel(npc, time, status) {
    const cx = npc.x + npc.width / 2;
    const top = this._npcTop(npc);
    const mark = { available: '!', active: '…', ready: '?', done: '✓' }[status] || '!';
    const markColor = { available: '#f1c40f', active: '#95a5a6', ready: '#f1c40f', done: '#2ecc71' }[status] || '#f1c40f';
    const bob = status === 'active' || status === 'done' ? 0 : Math.sin(time / 300) * 2;
    this._text(mark, cx, top - 17 + bob, markColor, 'bold 14px sans-serif');
    this._text(npc.name, cx, top - 3, status === 'done' ? '#8fbf9f' : '#fff', '11px sans-serif');
  }

  _drawStoryNpcLabel(npc, activeId, time) {
    const cx = npc.x + npc.width / 2;
    const top = this._npcTop(npc);
    const isActive = npc.id === activeId;
    if (isActive) this._text('!', cx, top - 17 + Math.sin(time / 260) * 3, '#f1c40f', 'bold 16px sans-serif');
    this._text(npc.name, cx, top - 3, isActive ? '#f9e79f' : '#d6eaf8', '11px sans-serif');
  }

  _drawShopNpcLabel(npc, time) {
    const cx = npc.x + npc.width / 2;
    const top = this._npcTop(npc);
    this._text('$', cx, top - 17 + Math.sin(time / 340) * 2, '#f1c40f', 'bold 13px sans-serif');
    this._text(npc.name, cx, top - 3, '#abebc6', '11px sans-serif');
  }

  // 의뢰 게시판: 나무 기둥에 걸린 공고판.
  _drawQuestBoardArt(b) {
    const { ctx } = this;
    this._shadow(b.x + b.width / 2, b.y + b.height, b.width);
    ctx.fillStyle = '#6b4f2a';
    ctx.fillRect(b.x + 6, b.y + 28, 6, b.height - 28);
    ctx.fillRect(b.x + b.width - 12, b.y + 28, 6, b.height - 28);
    ctx.fillStyle = '#5a4020';
    ctx.fillRect(b.x, b.y, b.width, 34);
    ctx.fillStyle = '#8d6e3a';
    ctx.fillRect(b.x + 2, b.y + 2, b.width - 4, 30);
    ctx.fillStyle = '#f2e6c8';
    ctx.fillRect(b.x + 6, b.y + 6, 14, 10);
    ctx.fillRect(b.x + 24, b.y + 8, 14, 12);
    ctx.fillRect(b.x + 8, b.y + 20, 12, 8);
  }

  _drawQuestBoardLabel(b, time, hasQuest) {
    const cx = b.x + b.width / 2;
    if (hasQuest) this._text('!', cx, b.y - 12 + Math.sin(time / 280) * 2, '#f1c40f', 'bold 15px sans-serif');
    this._text(b.name, cx, b.y - 2, '#f9e79f', '11px sans-serif');
  }

  // ---------- 워프 ----------
  _drawWarpArt(w, time) {
    const { ctx } = this;
    const cx = w.x + w.width / 2;
    const cy = w.y + w.height / 2;
    const pulse = 0.75 + Math.sin(time / 260) * 0.25;

    // 도트 포털: 색 단계가 다른 타원을 겹쳐 깊이를 낸다(그라데이션 대신).
    const rx = w.width / 2 + 6;
    const ry = w.height / 2;
    this._pixelEllipse(cx, cy, rx, ry, '#1b3f8f');
    this._pixelEllipse(cx, cy, rx * 0.82, ry * 0.86, '#2f7fd0');
    this._pixelEllipse(cx, cy, rx * 0.55, ry * 0.6, '#6cc5f5');
    this._pixelEllipse(cx, cy, rx * (0.3 + pulse * 0.1), ry * (0.3 + pulse * 0.1), '#e8fbff');
    this._pixelEllipse(cx, cy, rx * (0.9 + pulse * 0.08), ry * (0.94 + pulse * 0.06), '#bff0ff', false);

    // 위로 흐르는 빛 알갱이
    ctx.fillStyle = '#e8fbff';
    for (let i = 0; i < 4; i++) {
      const t = ((time / 900) + i * 0.25) % 1;
      const px = snapPx(cx + Math.sin((time / 400) + i * 2) * rx * 0.55);
      ctx.fillRect(px, snapPx(cy + ry - t * (ry * 2)), 4, 4);
    }
  }

  _drawWarpLabel(w, prompt) {
    const cx = w.x + w.width / 2;
    this._text(`${w.type === 'town' ? '🏠' : '⚔'} ${w.label}`, cx, w.y - 10, '#8ad6ff', 'bold 11px sans-serif');
    if (prompt) this._text('↑ 눌러 이동', cx, w.y - 26, '#f1c40f', 'bold 11px sans-serif');
    else this._text(`Lv.${w.level}+ · ↑로 이동`, cx, w.y - 24, 'rgba(255,255,255,0.65)', '9px sans-serif');
  }

  _drawProjectile(p) {
    const { ctx } = this;
    const dir = Math.sign(p.vx) || 1;
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = p.color;
    for (let i = 1; i <= 3; i++) {
      ctx.fillRect(snapPx(p.x - dir * i * 8), snapPx(p.y - 2), 4, 4);
    }
    ctx.restore();
    ctx.fillStyle = p.color;
    ctx.fillRect(snapPx(p.x - 6), snapPx(p.y - 2), 12, 4);
    ctx.fillRect(snapPx(p.x - 2), snapPx(p.y - 6), 4, 12);
    ctx.fillStyle = '#fff';
    ctx.fillRect(snapPx(p.x - 2), snapPx(p.y - 2), 4, 4);
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
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * clamp(ratio, 0, 1), h);
  }

  drawMinimap(canvas, state) {
    const mctx = canvas.getContext('2d');
    const w = MINIMAP_SIZE; const h = MINIMAP_SIZE;
    const k = canvas.width / MINIMAP_SIZE;
    mctx.setTransform(k, 0, 0, k, 0, 0);
    mctx.clearRect(0, 0, w, h);
    mctx.fillStyle = 'rgba(20,30,40,0.85)';
    mctx.beginPath(); mctx.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2); mctx.fill();
    mctx.save();
    mctx.beginPath(); mctx.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2); mctx.clip();
    const scale = w / state.worldWidth;
    state.warps.forEach((wp) => {
      mctx.fillStyle = '#8ad6ff';
      mctx.beginPath(); mctx.arc(wp.x * scale, h / 2, 3, 0, Math.PI * 2); mctx.fill();
    });
    state.recruitNpcs.forEach((npc) => {
      mctx.fillStyle = '#f1c40f';
      mctx.beginPath(); mctx.arc(npc.x * scale, h / 2 - 6, 2.5, 0, Math.PI * 2); mctx.fill();
    });
    state.enemies.filter((e) => e.alive).forEach((e) => {
      mctx.fillStyle = '#e74c3c';
      mctx.beginPath(); mctx.arc(e.x * scale, h / 2 + (e.platform ? -8 : 0), 2.5, 0, Math.PI * 2); mctx.fill();
    });
    state.partyUnits.forEach((u) => {
      mctx.fillStyle = u.color;
      mctx.beginPath(); mctx.arc(u.x * scale, h / 2, 3.5, 0, Math.PI * 2); mctx.fill();
    });
    mctx.restore();
    mctx.strokeStyle = 'rgba(255,255,255,0.4)';
    mctx.beginPath(); mctx.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2); mctx.stroke();
  }
}
