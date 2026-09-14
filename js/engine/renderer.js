// 배경(패럴랙스) + 캐릭터/몬스터 스프라이트 + 애니메이션을 Canvas 2D로 직접 그린다.
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

class Renderer {
  constructor(ctx, width, height) {
    this.ctx = ctx; this.width = width; this.height = height;
    this.camX = 0;
  }

  updateCamera(activeUnit, worldWidth) {
    const target = activeUnit.x - this.width / 2;
    this.camX = clamp(target, 0, Math.max(0, worldWidth - this.width));
  }

  draw(state) {
    const { ctx } = this;
    const theme = THEME_DATA[state.theme] || DEFAULT_THEME;
    ctx.clearRect(0, 0, this.width, this.height);

    this._drawBackground(theme, state);

    ctx.save();
    ctx.translate(-this.camX, 0);

    state.platforms.forEach((p) => this._drawPlatform(p, theme));
    state.warps.forEach((w) => this._drawWarp(w, state.time, w === state.warpPrompt));
    state.storyNpcs.forEach((npc) => this._drawStoryNpc(npc, state.activeStoryNpcId, state.time));
    if (state.shopNpc) this._drawShopNpc(state.shopNpc, state.time);
    if (state.questBoard) this._drawQuestBoard(state.questBoard, state.time, state.boardHasQuest);
    state.recruitNpcs.forEach((npc) => this._drawRecruitNpc(npc, state.time));
    state.enemies.filter((e) => e.alive).forEach((e) => this._drawEnemy(e, state.time, e === state.target));
    state.partyUnits.forEach((u, i) => this._drawUnit(u, i === state.activeIndex, state.time));
    state.projectiles.forEach((p) => this._drawProjectile(p, state.time));
    state.effects.draw(ctx);

    ctx.restore();
  }

  // ---------- 배경 ----------
  _drawBackground(theme, state) {
    const { ctx } = this;
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(1, theme.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, GROUND_Y);

    this._drawFarLayer(theme);
    this._drawMidLayer(theme);

    // 지면
    ctx.fillStyle = state.groundColor;
    ctx.fillRect(0, GROUND_Y, this.width, this.height - GROUND_Y);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(0, GROUND_Y, this.width, 4);

    // 지면 결
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 1;
    const step = 46;
    const offset = -(this.camX * 0.9) % step;
    for (let x = offset; x < this.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 12);
      ctx.lineTo(x - 14, this.height);
      ctx.stroke();
    }
  }

  _drawFarLayer(theme) {
    const { ctx } = this;
    const off = -(this.camX * 0.18) % 420;
    ctx.fillStyle = theme.far;
    for (let i = -1; i < this.width / 420 + 2; i++) {
      const bx = off + i * 420;
      ctx.beginPath();
      ctx.moveTo(bx - 60, GROUND_Y);
      ctx.lineTo(bx + 110, GROUND_Y - 150);
      ctx.lineTo(bx + 250, GROUND_Y);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx + 180, GROUND_Y);
      ctx.lineTo(bx + 310, GROUND_Y - 104);
      ctx.lineTo(bx + 440, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    }
  }

  _drawMidLayer(theme) {
    const { ctx } = this;
    const off = -(this.camX * 0.45) % 260;
    for (let i = -1; i < this.width / 260 + 2; i++) {
      const bx = off + i * 260;
      this._drawDecor(theme, bx);
    }
  }

  _drawDecor(theme, bx) {
    const { ctx } = this;
    const base = GROUND_Y;
    ctx.fillStyle = theme.mid;
    switch (theme.decor) {
      case 'trees':
      case 'valley':
        ctx.fillRect(bx + 26, base - 46, 10, 46);
        ctx.beginPath();
        ctx.arc(bx + 31, base - 62, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(bx + 150, base - 34, 8, 34);
        ctx.beginPath();
        ctx.arc(bx + 154, base - 46, 22, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'deadtrees':
        ctx.fillRect(bx + 40, base - 70, 8, 70);
        ctx.fillRect(bx + 44, base - 56, 34, 5);
        ctx.fillRect(bx + 14, base - 44, 30, 5);
        ctx.fillRect(bx + 170, base - 52, 7, 52);
        ctx.fillRect(bx + 150, base - 40, 24, 4);
        break;
      case 'rocks':
        ctx.beginPath();
        ctx.moveTo(bx + 20, base);
        ctx.lineTo(bx + 60, base - 54);
        ctx.lineTo(bx + 104, base);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(bx + 150, base - 26, 54, 26);
        break;
      case 'houses':
        ctx.fillRect(bx + 24, base - 74, 86, 74);
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.moveTo(bx + 14, base - 74);
        ctx.lineTo(bx + 67, base - 110);
        ctx.lineTo(bx + 120, base - 74);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,236,170,0.85)';
        ctx.fillRect(bx + 44, base - 54, 18, 18);
        ctx.fillRect(bx + 76, base - 54, 18, 18);
        ctx.fillStyle = theme.mid;
        ctx.fillRect(bx + 170, base - 50, 58, 50);
        break;
      case 'ships':
        ctx.beginPath();
        ctx.moveTo(bx + 20, base - 10);
        ctx.lineTo(bx + 130, base - 10);
        ctx.lineTo(bx + 112, base + 14);
        ctx.lineTo(bx + 38, base + 14);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(bx + 70, base - 84, 6, 74);
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.moveTo(bx + 76, base - 80);
        ctx.lineTo(bx + 118, base - 40);
        ctx.lineTo(bx + 76, base - 26);
        ctx.closePath();
        ctx.fill();
        break;
      case 'wrecks':
        ctx.save();
        ctx.translate(bx + 70, base);
        ctx.rotate(-0.25);
        ctx.fillRect(-60, -18, 120, 18);
        ctx.fillRect(-6, -78, 6, 62);
        ctx.restore();
        break;
      case 'dunes':
        ctx.beginPath();
        ctx.moveTo(bx - 30, base);
        ctx.quadraticCurveTo(bx + 70, base - 74, bx + 190, base);
        ctx.closePath();
        ctx.fill();
        break;
      case 'pillars':
        [0, 90, 180].forEach((dx, idx) => {
          const h = idx === 1 ? 40 : 96;
          ctx.fillRect(bx + 30 + dx, base - h, 22, h);
          ctx.fillStyle = theme.accent;
          ctx.fillRect(bx + 25 + dx, base - h - 8, 32, 8);
          ctx.fillStyle = theme.mid;
        });
        break;
      case 'walls':
        ctx.fillRect(bx, base - 96, 220, 96);
        ctx.fillStyle = theme.accent;
        for (let i = 0; i < 6; i++) ctx.fillRect(bx + 8 + i * 36, base - 110, 22, 16);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 6; c++) {
            ctx.strokeStyle = 'rgba(0,0,0,0.18)';
            ctx.strokeRect(bx + c * 37, base - 96 + r * 24, 37, 24);
          }
        }
        break;
      case 'spikes':
        ctx.beginPath();
        ctx.moveTo(bx + 20, base);
        ctx.lineTo(bx + 46, base - 92);
        ctx.lineTo(bx + 72, base);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.moveTo(bx + 130, base);
        ctx.lineTo(bx + 150, base - 58);
        ctx.lineTo(bx + 172, base);
        ctx.closePath();
        ctx.fill();
        break;
      default:
        break;
    }
  }

  _drawPlatform(p, theme) {
    const { ctx } = this;
    ctx.fillStyle = theme.accent;
    ctx.fillRect(p.x, p.y, p.width, 9);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(p.x, p.y + 9, p.width, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(p.x, p.y, p.width, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    [p.x + 16, p.x + p.width - 24].forEach((cx) => ctx.fillRect(cx, p.y + 15, 8, GROUND_Y - p.y - 15));
  }

  // ---------- 캐릭터 ----------
  _shadow(cx, bottomY, w) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, bottomY, w * 0.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawUnit(u, isActive, time) {
    const { ctx } = this;
    const cx = u.x + u.width / 2;
    const bottom = u.y + u.height;
    const moving = Math.abs(u.vx) > 5;
    const phase = moving ? Math.sin(time / 90) : Math.sin(time / 420) * 0.3;
    const atk = (u.attackAnim || 0) / 320;

    this._shadow(cx, bottom, u.width);

    ctx.save();
    ctx.translate(cx, bottom);
    // 쓰러진 캐릭터는 옆으로 눕고 회색으로 표시된다.
    if (u.downed) {
      ctx.rotate(-Math.PI / 2);
      ctx.translate(-u.height * 0.35, u.width * 0.2);
      ctx.globalAlpha = 0.45;
    }
    ctx.scale(u.facing >= 0 ? 1 : -1, 1);

    if (u.hitFlash > 0) { ctx.globalAlpha = 0.55 + Math.sin(time / 40) * 0.2; }

    const bodyH = u.height * 0.46;
    const legH = u.height * 0.3;
    const headR = u.height * 0.17;
    const skin = '#f0c9a0';

    // 다리
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(-9, -legH, 7, legH + phase * 3);
    ctx.fillRect(3, -legH, 7, legH - phase * 3);
    // 몸통
    ctx.fillStyle = u.color;
    this._roundRect(-11, -legH - bodyH, 22, bodyH, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.5;
    this._roundRect(-11, -legH - bodyH, 22, bodyH, 5);
    ctx.stroke();
    // 갑옷 라인
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(-11, -legH - bodyH * 0.55, 22, 3);
    // 머리
    const headY = -legH - bodyH - headR + 2;
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.arc(0, headY - headR * 0.25, headR, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(headR * 0.25, headY - 1, 2.5, 2.5);

    // 무기 (스탠스별)
    ctx.save();
    ctx.translate(9, -legH - bodyH * 0.65);
    ctx.rotate(-0.5 + atk * 1.9);
    this._drawWeapon(u);
    ctx.restore();

    ctx.restore();

    if (isActive) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 6, u.y - 16);
      ctx.lineTo(cx, u.y - 9);
      ctx.lineTo(cx + 6, u.y - 16);
      ctx.closePath();
      ctx.fillStyle = '#f1c40f';
      ctx.fill();
    }

    ctx.fillStyle = '#fff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(u.name, cx, u.y - 22);
    this._drawBar(u.x, u.y - 18, u.width, 4, u.hp / u.maxHp, '#e74c3c');
  }

  _drawWeapon(u) {
    const { ctx } = this;
    const type = u.stance ? u.stance.attackType : 'melee';
    const id = u.stance ? u.stance.id : 'bare';
    if (id === 'bare') {
      ctx.fillStyle = '#f0c9a0';
      ctx.beginPath(); ctx.arc(2, 2, 4, 0, Math.PI * 2); ctx.fill();
      return;
    }
    if (type === 'melee') {
      if (id === 'spear') {
        ctx.fillStyle = '#8d6e3a'; ctx.fillRect(-2, -30, 4, 46);
        ctx.fillStyle = '#dfe6ec';
        ctx.beginPath(); ctx.moveTo(-5, -30); ctx.lineTo(0, -46); ctx.lineTo(5, -30); ctx.closePath(); ctx.fill();
      } else if (id === 'dualblade') {
        ctx.fillStyle = '#dfe6ec'; ctx.fillRect(-2, -26, 4, 28); ctx.fillRect(6, -20, 4, 22);
        ctx.fillStyle = '#6b4f2a'; ctx.fillRect(-4, 0, 8, 6); ctx.fillRect(4, -2, 8, 6);
      } else if (id === 'fist') {
        ctx.fillStyle = '#b0b7bd'; this._roundRect(-6, -6, 13, 12, 3); ctx.fill();
      } else {
        ctx.fillStyle = '#dfe6ec'; ctx.fillRect(-2.5, -34, 5, 36);
        ctx.fillStyle = '#c0a062'; ctx.fillRect(-8, -2, 16, 4);
        ctx.fillStyle = '#6b4f2a'; ctx.fillRect(-3, 2, 6, 10);
      }
      return;
    }
    if (type === 'ranged') {
      if (id === 'musket') {
        ctx.fillStyle = '#5d4632'; ctx.fillRect(-4, -4, 30, 6);
        ctx.fillStyle = '#9aa3a8'; ctx.fillRect(20, -3, 14, 3);
      } else if (id === 'crossbow') {
        ctx.fillStyle = '#5d4632'; ctx.fillRect(-2, -2, 26, 5);
        ctx.strokeStyle = '#9aa3a8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(14, -12); ctx.lineTo(14, 12); ctx.stroke();
      } else {
        ctx.strokeStyle = '#8d6e3a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 20, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(2, -18); ctx.lineTo(2, 18); ctx.stroke();
      }
      return;
    }
    // 마법 지팡이
    const color = elementColor(u.stance.element);
    ctx.fillStyle = '#6b4f2a'; ctx.fillRect(-2, -34, 4, 48);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, -38, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(-2, -40, 2, 0, Math.PI * 2); ctx.fill();
  }

  // ---------- 몬스터 ----------
  _drawEnemy(e, time, isTarget) {
    const { ctx } = this;
    const cx = e.x + e.width / 2;
    const bottom = e.y + e.height;
    const hostile = e.aggressive || e.provoked;
    const moving = Math.abs(e.vx) > 5;
    const phase = moving ? Math.sin(time / 100) : Math.sin(time / 500) * 0.4;
    const atk = (e.attackAnim || 0) / 260;

    this._shadow(cx, bottom, e.width);

    ctx.save();
    ctx.translate(cx, bottom);
    ctx.scale(e.facing >= 0 ? 1 : -1, 1);
    if (e.hitFlash > 0) ctx.globalAlpha = 0.6;

    const body = hostile ? '#8e2f2f' : '#4a6b46';
    const dark = hostile ? '#5c1d1d' : '#2f4a2d';

    if (e.race === 'beast') {
      ctx.fillStyle = body;
      this._roundRect(-16, -26, 32, 18, 7); ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-13, -9, 5, 9 + phase * 2);
      ctx.fillRect(8, -9, 5, 9 - phase * 2);
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(15, -26, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.moveTo(10, -34); ctx.lineTo(14, -42); ctx.lineTo(18, -34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffe08a';
      ctx.fillRect(17, -28, 3, 2);
    } else if (e.race === 'undead') {
      ctx.fillStyle = '#d9d3c0';
      ctx.fillRect(-8, -30, 16, 22);
      ctx.fillStyle = dark;
      for (let i = 0; i < 3; i++) ctx.fillRect(-8, -28 + i * 7, 16, 2);
      ctx.fillStyle = '#d9d3c0';
      ctx.fillRect(-7, -8, 5, 8 + phase * 2);
      ctx.fillRect(3, -8, 5, 8 - phase * 2);
      ctx.beginPath(); ctx.arc(0, -38, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7b1e1e';
      ctx.fillRect(-5, -40, 3.5, 3.5); ctx.fillRect(2, -40, 3.5, 3.5);
      ctx.fillStyle = '#b0a890';
      ctx.save(); ctx.rotate(-0.4 + atk * 1.4); ctx.fillRect(10, -34, 3, 30); ctx.restore();
    } else if (e.race === 'inanimate') {
      ctx.fillStyle = '#6d6a58';
      this._roundRect(-16, -40, 32, 32, 4); ctx.fill();
      ctx.fillStyle = '#565343';
      ctx.fillRect(-13, -8, 10, 8);
      ctx.fillRect(4, -8, 10, 8);
      ctx.fillStyle = '#8a8775';
      ctx.fillRect(-18, -36, 6, 18); ctx.fillRect(12, -36, 6, 18);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(-7, -30, 5, 4); ctx.fillRect(3, -30, 5, 4);
    } else if (e.race === 'demon') {
      ctx.fillStyle = body;
      this._roundRect(-12, -34, 24, 26, 5); ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-9, -9, 7, 9 + phase * 2);
      ctx.fillRect(2, -9, 7, 9 - phase * 2);
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(0, -43, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2c0f14';
      ctx.beginPath(); ctx.moveTo(-9, -48); ctx.lineTo(-14, -60); ctx.lineTo(-4, -50); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(9, -48); ctx.lineTo(14, -60); ctx.lineTo(4, -50); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffdd57';
      ctx.fillRect(-6, -45, 4, 3); ctx.fillRect(3, -45, 4, 3);
      ctx.save(); ctx.rotate(-0.5 + atk * 1.8);
      ctx.fillStyle = '#cfd6dc'; ctx.fillRect(12, -36, 4, 30); ctx.restore();
    } else { // humanoid
      ctx.fillStyle = body;
      this._roundRect(-10, -32, 20, 24, 4); ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-8, -9, 6, 9 + phase * 2);
      ctx.fillRect(2, -9, 6, 9 - phase * 2);
      ctx.fillStyle = '#e0b088';
      ctx.beginPath(); ctx.arc(0, -40, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-8, -46, 16, 5);
      ctx.fillStyle = '#222';
      ctx.fillRect(2, -40, 2.5, 2.5);
      ctx.save(); ctx.rotate(-0.4 + atk * 1.6);
      ctx.fillStyle = '#cfd6dc'; ctx.fillRect(10, -32, 3.5, 26); ctx.restore();
    }
    ctx.restore();

    // 보스 예고 연출: 머리 위 경고 + 강타 범위 표시
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
      ctx.fillStyle = `rgba(255,80,60,${blink})`;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚠ ${e.current.warn}`, cx, e.y - 26);
    }

    if (isTarget) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(e.x - 3, e.y - 3, e.width + 6, e.height + 6);
    }

    ctx.fillStyle = hostile ? '#ff9b8a' : '#a9dfbf';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${hostile ? '▲' : '○'} ${e.name}`, cx, e.y - 8);
    this._drawBar(e.x, e.y - 5, e.width, 4, e.hp / e.maxHp, hostile ? '#c0392b' : '#7dcea0');
  }

  // ---------- NPC ----------
  _npcBody(npc, bodyColor, time, bobSpeed = 700) {
    const { ctx } = this;
    const cx = npc.x + npc.width / 2;
    const bottom = npc.y + npc.height;
    const bob = Math.sin(time / bobSpeed) * 1.5;
    this._shadow(cx, bottom, npc.width);
    ctx.save();
    ctx.translate(cx, bottom + bob);
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(-8, -14, 6, 14);
    ctx.fillRect(2, -14, 6, 14);
    ctx.fillStyle = bodyColor;
    this._roundRect(-11, -38, 22, 24, 5); ctx.fill();
    ctx.fillStyle = '#f0c9a0';
    ctx.beginPath(); ctx.arc(0, -46, 8.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(0, -48, 8.5, Math.PI, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawRecruitNpc(npc, time) {
    const { ctx } = this;
    const cx = npc.x + npc.width / 2;
    this._npcBody(npc, npc.charDef.color, time, 760);
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', cx, npc.y - 16 + Math.sin(time / 300) * 2);
    ctx.fillStyle = '#fff';
    ctx.font = '11px sans-serif';
    ctx.fillText(npc.name, cx, npc.y - 3);
  }

  _drawStoryNpc(npc, activeId, time) {
    const { ctx } = this;
    const cx = npc.x + npc.width / 2;
    const isActive = npc.id === activeId;
    this._npcBody(npc, '#2e86c1', time, 820);
    if (isActive) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', cx, npc.y - 16 + Math.sin(time / 260) * 3);
    }
    ctx.fillStyle = isActive ? '#f9e79f' : '#d6eaf8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(npc.name, cx, npc.y - 3);
  }

  _drawShopNpc(npc, time) {
    const { ctx } = this;
    const cx = npc.x + npc.width / 2;
    this._npcBody(npc, '#1e8449', time, 900);
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', cx, npc.y - 16 + Math.sin(time / 340) * 2);
    ctx.fillStyle = '#abebc6';
    ctx.font = '11px sans-serif';
    ctx.fillText(npc.name, cx, npc.y - 3);
  }

  // 의뢰 게시판: 나무 기둥에 걸린 공고판.
  _drawQuestBoard(b, time, hasQuest) {
    const { ctx } = this;
    const cx = b.x + b.width / 2;
    this._shadow(cx, b.y + b.height, b.width);
    ctx.fillStyle = '#6b4f2a';
    ctx.fillRect(b.x + 6, b.y + 28, 6, b.height - 28);
    ctx.fillRect(b.x + b.width - 12, b.y + 28, 6, b.height - 28);
    ctx.fillStyle = '#8d6e3a';
    this._roundRect(b.x, b.y, b.width, 34, 3); ctx.fill();
    ctx.strokeStyle = '#5a4020'; ctx.lineWidth = 2;
    this._roundRect(b.x, b.y, b.width, 34, 3); ctx.stroke();
    ctx.fillStyle = '#f2e6c8';
    ctx.fillRect(b.x + 6, b.y + 6, 14, 10);
    ctx.fillRect(b.x + 24, b.y + 8, 14, 12);
    ctx.fillRect(b.x + 8, b.y + 20, 12, 8);
    if (hasQuest) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', cx, b.y - 12 + Math.sin(time / 280) * 2);
    }
    ctx.fillStyle = '#f9e79f';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.name, cx, b.y - 2);
  }

  // ---------- 워프 ----------
  _drawWarp(w, time, prompt = false) {
    const { ctx } = this;
    const cx = w.x + w.width / 2;
    const cy = w.y + w.height / 2;
    const pulse = 0.75 + Math.sin(time / 260) * 0.25;

    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, w.width / 2 + 6);
    grad.addColorStop(0, 'rgba(180, 240, 255, 0.95)');
    grad.addColorStop(0.45, `rgba(90, 170, 255, ${0.55 * pulse})`);
    grad.addColorStop(1, 'rgba(40, 60, 160, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w.width / 2 + 6, w.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(140, 220, 255, ${pulse})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const spin = time / (500 + i * 160);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(spin) * 0.35);
      ctx.beginPath();
      ctx.ellipse(0, 0, (w.width / 2) - i * 7, (w.height / 2) - i * 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = '#8ad6ff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${w.type === 'town' ? '🏠' : '⚔'} ${w.label}`, cx, w.y - 10);
    if (prompt) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('↑ 눌러 이동', cx, w.y - 26);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '9px sans-serif';
      ctx.fillText(`Lv.${w.level}+ · ↑로 이동`, cx, w.y - 24);
    }
  }

  _drawProjectile(p, time) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = p.color;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(p.x - Math.sign(p.vx) * i * 7, p.y, 4.5 - i, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 8);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.5, p.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  _roundRect(x, y, w, h, r) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
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
    const w = canvas.width; const h = canvas.height;
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
