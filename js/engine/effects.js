// 전투 연출: 데미지 숫자, 베기 궤적, 타격 스파크, 범위기 폭발.
// ai.js처럼 렌더러를 모르는 곳에서도 호출할 수 있도록 전역 핸들 하나를 둔다.
let EFFECTS = null;

class EffectManager {
  constructor() {
    this.items = [];
  }

  _add(item) {
    if (this.items.length > 240) this.items.shift();
    this.items.push(item);
  }

  damage(x, y, amount, opts = {}) {
    // 설정에서 끈 경우 순수 데미지 숫자만 감춘다(MISS·회복 같은 안내는 남긴다).
    if (!opts.text && typeof SettingsManager !== 'undefined' && !SettingsManager.values.showDamage) return;
    this._add({
      kind: 'text', x: x + randRange(-8, 8), y, vy: -46, life: 780, maxLife: 780,
      text: opts.text || `${amount}`,
      color: opts.color || (opts.crit ? '#f5b041' : '#ffffff'),
      size: opts.crit ? 17 : 13,
      crit: !!opts.crit,
    });
  }

  slash(unit) {
    const cx = unit.x + unit.width / 2 + unit.facing * 22;
    this._add({
      kind: 'slash', x: cx, y: unit.y + unit.height * 0.45,
      facing: unit.facing, life: 180, maxLife: 180,
      radius: unit.stance ? Math.max(26, unit.stance.range * 0.6) : 30,
    });
  }

  spark(x, y, color) {
    for (let i = 0; i < 6; i++) {
      this._add({
        kind: 'spark', x, y,
        vx: randRange(-110, 110), vy: randRange(-130, -20),
        life: 320, maxLife: 320, color: color || '#ffe08a',
      });
    }
  }

  burst(x, y, radius, color) {
    this._add({ kind: 'burst', x, y, radius, life: 420, maxLife: 420, color: color || '#f39c12' });
  }

  cast(unit, color) {
    this._add({
      kind: 'cast', x: unit.x + unit.width / 2, y: unit.y + unit.height / 2,
      life: 360, maxLife: 360, color: color || '#8ad6ff',
    });
  }

  // 획득 표시: 데미지 숫자보다 느리게 오래 떠 있어야 사냥 중에도 읽힌다.
  loot(x, y, text, color, itemId = null) {
    this._add({
      kind: 'text', x, y, vy: -24, life: 1500, maxLife: 1500,
      text, color: color || '#f1c40f', size: 12, crit: false, itemId,
    });
  }

  // 무기 세트 교체 연출: 발밑에서 링이 퍼진다.
  swap(unit) {
    this._add({
      kind: 'swap', x: unit.x + unit.width / 2, y: unit.y + unit.height,
      life: 420, maxLife: 420, color: '#f7dc6f',
    });
  }

  // 희귀 드랍처럼 "지금 봐야 하는" 순간에 화면 전체를 한 번 번쩍인다.
  flash(color, life = 420) {
    this._add({ kind: 'flash', x: 0, y: 0, life, maxLife: life, color: color || '#ffffff' });
  }

  levelUp(unit) {
    this._add({
      kind: 'text', x: unit.x + unit.width / 2, y: unit.y - 6, vy: -30, life: 1200, maxLife: 1200,
      text: 'LEVEL UP!', color: '#f1c40f', size: 14, crit: true,
    });
  }

  update(dt) {
    this.items.forEach((it) => {
      it.life -= dt;
      if (it.kind === 'text') it.y += it.vy * dt / 1000;
      if (it.kind === 'spark') {
        it.x += it.vx * dt / 1000;
        it.y += it.vy * dt / 1000;
        it.vx *= 0.94; it.vy *= 0.94;
      }
    });
    this.items = this.items.filter((it) => it.life > 0);
  }

  // 도형 이펙트는 도트 버퍼(반해상도)에, 글자는 원래 해상도에 그린다. 글자까지 버퍼에 넣으면 뭉개진다.
  drawShapes(ctx) {
    this.items.forEach((it) => {
      if (it.kind === 'text') return;
      const t = clamp(it.life / it.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = t;
      if (it.kind === 'slash') this._drawSlash(ctx, it, t);
      else if (it.kind === 'spark') this._drawSpark(ctx, it);
      else if (it.kind === 'burst') this._drawBurst(ctx, it, t);
      else if (it.kind === 'cast') this._drawCast(ctx, it, t);
      else if (it.kind === 'swap') this._drawSwap(ctx, it, t);
      ctx.restore();
    });
  }

  // 화면 전체 연출. 카메라 이동과 무관하므로 버퍼를 키워 붙인 직후에 따로 그린다.
  drawOverlay(ctx, width, height) {
    this.items.forEach((it) => {
      if (it.kind !== 'flash') return;
      const t = clamp(it.life / it.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = t * 0.45;
      ctx.fillStyle = it.color;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    });
  }

  drawTexts(ctx) {
    this.items.forEach((it) => {
      if (it.kind !== 'text') return;
      const t = clamp(it.life / it.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = t;
      this._drawText(ctx, it, t);
      ctx.restore();
    });
  }

  _drawText(ctx, it, t) {
    const p = worldToScreen(it.x, it.y);
    const pop = it.crit ? 1 + (1 - t) * 0.35 : 1;
    ctx.font = `bold ${Math.round(it.size * pop)}px sans-serif`;
    // 획득 표시는 글자 왼쪽에 도트 아이콘을 붙인다.
    if (it.itemId) {
      const half = ctx.measureText(it.text).width / 2;
      drawSprite(ctx, itemSprite(it.itemId), p.x - half - 20, p.y - 15, 1.25);
    }
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(it.text, p.x, p.y);
    ctx.fillStyle = it.color;
    ctx.fillText(it.text, p.x, p.y);
  }

  // ---------- 도트 연출 ----------
  // 이펙트도 도트 격자(2px)에 맞춰 네모로만 찍는다. 매끈한 곡선이 섞이면 배경·캐릭터와 그림체가 어긋난다.
  _dot(ctx, x, y, size = 4) {
    ctx.fillRect(snapPx(x - size / 2), snapPx(y - size / 2), size, size);
  }

  // 각도 구간을 따라 점을 찍어 그린 호. 두께는 점 크기로 낸다.
  _dotArc(ctx, cx, cy, radius, from, to, color, size = 4) {
    ctx.fillStyle = color;
    const steps = Math.max(6, Math.round(radius * Math.abs(to - from) / 5));
    for (let i = 0; i <= steps; i++) {
      const a = from + (to - from) * (i / steps);
      this._dot(ctx, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, size);
    }
  }

  _dotRing(ctx, cx, cy, rx, ry, color, size = 4) {
    ctx.fillStyle = color;
    const steps = Math.max(8, Math.round((rx + ry) / 3));
    for (let i = 0; i < steps; i++) {
      const a = (Math.PI * 2 * i) / steps;
      this._dot(ctx, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, size);
    }
  }

  _drawSlash(ctx, it, t) {
    const p = worldToScreen(it.x, it.y);
    const spread = Math.PI * 0.75;
    const start = -spread / 2 + (1 - t) * spread * 0.6;
    ctx.translate(p.x, p.y - 16);
    ctx.scale(it.facing, 1);
    this._dotArc(ctx, 0, 0, it.radius, start, start + spread * 0.7, `rgba(255,255,255,${0.35 + t * 0.6})`, 6);
    this._dotArc(ctx, 0, 0, it.radius * 0.72, start, start + spread * 0.7, `rgba(160,220,255,${t * 0.7})`, 4);
  }

  _drawSpark(ctx, it) {
    const p = worldToScreen(it.x, it.y);
    ctx.fillStyle = it.color;
    this._dot(ctx, p.x, p.y - 16, 4);
  }

  _drawBurst(ctx, it, t) {
    const p = worldToScreen(it.x, it.y);
    const r = it.radius * (1.05 - t * 0.75);
    // 바닥에 퍼지는 고리라서 세로를 절반으로 눌러 그린다(쿼터뷰).
    this._dotRing(ctx, p.x, p.y, r, r * 0.5, it.color, 6);
    this._dotRing(ctx, p.x, p.y, r * 0.72, r * 0.36, 'rgba(255,255,255,0.85)', 4);
    this._dotRing(ctx, p.x, p.y, r * 0.42, r * 0.21, it.color, 4);
  }

  _drawSwap(ctx, it, t) {
    const p = worldToScreen(it.x, it.y);
    const r = 10 + (1 - t) * 34;
    this._dotRing(ctx, p.x, p.y, r, r * 0.5, it.color, 4);
    this._dotRing(ctx, p.x, p.y, r * 0.6, r * 0.3, `rgba(255,255,255,${t * 0.8})`, 4);
  }

  _drawCast(ctx, it, t) {
    const p = worldToScreen(it.x, it.y);
    const r = 16 + (1 - t) * 14;
    this._dotRing(ctx, p.x, p.y, r, r * 0.5, it.color, 4);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      const a = (1 - t) * Math.PI * 2 + i * (Math.PI * 2 / 3);
      this._dot(ctx, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.5, 4);
    }
  }
}
