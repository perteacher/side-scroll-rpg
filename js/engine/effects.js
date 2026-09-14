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
  loot(x, y, text, color) {
    this._add({
      kind: 'text', x, y, vy: -24, life: 1500, maxLife: 1500,
      text, color: color || '#f1c40f', size: 12, crit: false,
    });
  }

  // 무기 세트 교체 연출: 발밑에서 링이 퍼진다.
  swap(unit) {
    this._add({
      kind: 'swap', x: unit.x + unit.width / 2, y: unit.y + unit.height,
      life: 420, maxLife: 420, color: '#f7dc6f',
    });
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
        it.vy += 520 * dt / 1000;
      }
    });
    this.items = this.items.filter((it) => it.life > 0);
  }

  draw(ctx) {
    this.items.forEach((it) => {
      const t = clamp(it.life / it.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = t;
      if (it.kind === 'text') this._drawText(ctx, it, t);
      else if (it.kind === 'slash') this._drawSlash(ctx, it, t);
      else if (it.kind === 'spark') this._drawSpark(ctx, it);
      else if (it.kind === 'burst') this._drawBurst(ctx, it, t);
      else if (it.kind === 'cast') this._drawCast(ctx, it, t);
      else if (it.kind === 'swap') this._drawSwap(ctx, it, t);
      ctx.restore();
    });
  }

  _drawText(ctx, it, t) {
    const pop = it.crit ? 1 + (1 - t) * 0.35 : 1;
    ctx.font = `bold ${Math.round(it.size * pop)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(it.text, it.x, it.y);
    ctx.fillStyle = it.color;
    ctx.fillText(it.text, it.x, it.y);
  }

  _drawSlash(ctx, it, t) {
    const spread = Math.PI * 0.75;
    const start = -spread / 2 + (1 - t) * spread * 0.6;
    ctx.translate(it.x, it.y);
    ctx.scale(it.facing, 1);
    ctx.strokeStyle = `rgba(255,255,255,${0.25 + t * 0.6})`;
    ctx.lineWidth = 4 * t + 1;
    ctx.beginPath();
    ctx.arc(0, 0, it.radius, start, start + spread * 0.7);
    ctx.stroke();
    ctx.strokeStyle = `rgba(160,220,255,${t * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, it.radius * 0.72, start, start + spread * 0.7);
    ctx.stroke();
  }

  _drawSpark(ctx, it) {
    ctx.fillStyle = it.color;
    ctx.beginPath();
    ctx.arc(it.x, it.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawBurst(ctx, it, t) {
    const r = it.radius * (1.05 - t * 0.75);
    const grad = ctx.createRadialGradient(it.x, it.y, r * 0.15, it.x, it.y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.45, it.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(it.x, it.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = it.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(it.x, it.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  _drawSwap(ctx, it, t) {
    const r = 10 + (1 - t) * 34;
    ctx.strokeStyle = it.color;
    ctx.lineWidth = 3 * t + 0.5;
    ctx.beginPath();
    ctx.ellipse(it.x, it.y - 4, r, r * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${t * 0.7})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(it.x, it.y - 4, r * 0.6, r * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  _drawCast(ctx, it, t) {
    const r = 16 + (1 - t) * 14;
    ctx.strokeStyle = it.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(it.x, it.y + 14, r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const a = (1 - t) * Math.PI * 2 + i * (Math.PI * 2 / 3);
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.arc(it.x + Math.cos(a) * r, it.y + 14 + Math.sin(a) * r * 0.35, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
