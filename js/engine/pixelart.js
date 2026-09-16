// 도트 스프라이트 컴파일러. 픽셀 격자(문자열 배열) + 팔레트 → 오프스크린 캔버스.
// 같은 모양·팔레트는 한 번만 만들어 캐시하고, UI(HTML)용 data URL도 따로 캐시한다.

const _spriteCache = new Map();
const _iconUrlCache = new Map();

function compileSprite(rows, palette) {
  const h = rows.length;
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      const color = palette[ch] || PIXEL_BASE[ch];
      if (!color) continue;
      x.fillStyle = color;
      x.fillRect(i, y, 1, 1);
    }
  });
  return c;
}

function cachedSprite(key, rows, palette) {
  let c = _spriteCache.get(key);
  if (!c) {
    c = compileSprite(rows, palette);
    _spriteCache.set(key, c);
  }
  return c;
}

function itemSprite(itemId) {
  const spec = itemSpriteSpec(itemId);
  return cachedSprite(`item:${spec.key}`, ITEM_SHAPES[spec.shape] || ITEM_SHAPES.unknown, spec.pal);
}

function itemIconURL(itemId) {
  const key = itemSpriteSpec(itemId).key;
  let url = _iconUrlCache.get(key);
  if (!url) {
    url = itemSprite(itemId).toDataURL();
    _iconUrlCache.set(key, url);
  }
  return url;
}

// HTML 목록에 끼워 넣을 아이콘. 16px 원본을 정수배로 키워야 픽셀이 뭉개지지 않는다.
function itemIconHtml(itemId, size = 24) {
  return `<img class="item-icon" src="${itemIconURL(itemId)}" width="${size}" height="${size}" alt="">`;
}

function mesoSprite() {
  return cachedSprite('meso', ITEM_SHAPES.meso, { y: '#f1c40f', w: '#fff3b0', d: '#b7950b' });
}

// ---------- 캐릭터 합성 ----------
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// '#rrggbb'를 f배(0~1 어둡게, 1 이상 밝게)
function shadeHex(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => clamp(Math.round(v * f), 0, 255);
  const r = ch((n >> 16) & 255); const g = ch((n >> 8) & 255); const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// 부호 없는 시프트(>>>)를 써야 한다. >>는 32비트 부호를 살려 음수가 나오고, 음수 % n은 배열 밖을 가리킨다.
function pickBySeed(list, seed, shift = 0) {
  return list[(seed >>> shift) % list.length];
}

function unitLook(unit) {
  const seed = hashStr(unit.defId || unit.className || unit.name);
  return {
    skin: pickBySeed(SKIN_TONES, seed),
    hair: pickBySeed(HAIR_COLORS, seed, 5),
    style: pickBySeed(HAIR_STYLES, seed, 11),
  };
}

// 지금 스탠스에 해당하는 무기(현재 세트에서). 맨손이면 null.
function heldWeaponGear(unit) {
  if (!unit.equipment) return null;
  const list = [unit.equipment.weapon1, unit.equipment.weapon2].filter(Boolean);
  const stance = STANCE_DATA[unit.currentStanceId];
  return list.find((g) => stance && g.stanceId === stance.weapon) || null;
}

// ---------- 몬스터 합성 ----------
// 종족별 틀 하나에 이름으로 정한 색을 입힌다. 같은 이름의 몹은 늘 같은 색이다.
// frame: a(다리 모음) / b(다리 벌림)
function monsterSprite(enemy, frame = 'a', dir = 'front') {
  const race = MONSTER_LAYERS[enemy.race] ? enemy.race : 'humanoid';
  const key = `mon:${race}:${enemy.name}:${frame}:${dir}`;
  let c = _spriteCache.get(key);
  if (c) return c;
  const layers = MONSTER_LAYERS[race];
  const back = MONSTER_BACK_LAYERS[race];
  const pal = monsterPalette(race, enemy.name);
  c = document.createElement('canvas');
  c.width = UNIT_W; c.height = UNIT_H;
  const x = c.getContext('2d');
  x.drawImage(compileSprite(frame === 'b' ? layers.legs_b : layers.legs_a, pal), 0, 0);
  // 뒷모습은 몸통만 바꾼다(다리는 좌우 대칭이라 그대로).
  x.drawImage(compileSprite(dir === 'back' && back ? back.body : layers.body, pal), 0, 0);
  _spriteCache.set(key, c);
  return c;
}

// frame: idle0 / idle1(숨쉬기로 윗몸 1px 내려감) / walk0(다리 벌림) / walk1
function unitSprite(unit, frame = 'idle0', dir = 'front') {
  const armorClass = unit.armorClass || 'light';
  const body = unit.equipment && unit.equipment.armor;
  const helm = unit.equipment && unit.equipment.helmet;
  const bodyTier = body ? body.tier : 1;
  const helmTier = helm ? helm.tier : 0;
  const key = `unit:${unit.defId}:${unit.color}:${armorClass}:${bodyTier}:${helmTier}:${frame}:${dir}`;
  let c = _spriteCache.get(key);
  if (c) return c;

  const look = unitLook(unit);
  const base = {
    s: look.skin, x: shadeHex(look.skin, 0.82),
    r: look.hair, q: shadeHex(look.hair, 0.7),
    c: unit.color, u: shadeHex(unit.color, 0.68),
    p: LEG_COLOR[armorClass], b: '#3a2a1c',
  };
  const outfitPal = armorClass === 'heavy' ? { ...base, ...TIER_METAL[bodyTier] }
    : armorClass === 'light' ? { ...base, ...LEATHER, a: TIER_COLOR[bodyTier] }
      : { ...base, o: shadeHex(unit.color, 0.5) };
  const helmPal = armorClass === 'heavy' ? { ...base, ...TIER_METAL[helmTier || 1] }
    : armorClass === 'light' ? { ...base, ...LEATHER, a: TIER_COLOR[helmTier || 1] }
      : { ...base, c: unit.color, u: shadeHex(unit.color, 0.68) };

  const bob = frame === 'idle1' || frame === 'walk1' ? 1 : 0;
  c = document.createElement('canvas');
  c.width = UNIT_W; c.height = UNIT_H + UNIT_HEADROOM;
  const x = c.getContext('2d');
  const put = (rows, pal, dy) => x.drawImage(compileSprite(rows, pal), 0, dy);
  const top = UNIT_HEADROOM;

  // 뒷모습은 전용 레이어를 쓰고, 없는 부위는 앞모습을 그대로 쓴다.
  const L = (name) => (dir === 'back' && UNIT_BACK_LAYERS[name]) || UNIT_LAYERS[name];
  put(frame === 'walk0' ? L('legs_walk') : L('legs_idle'), base, top);
  put(L(`outfit_${armorClass}`), outfitPal, top + bob);
  put(L('head'), base, top + bob);
  if (!helm) put(L(`hair_${look.style}`), base, top + bob);
  else if (armorClass === 'cloth') put(L('helm_cloth'), helmPal, bob);
  else put(L(`helm_${armorClass}`), helmPal, top + bob);

  _spriteCache.set(key, c);
  return c;
}

// 두 색을 t(0~1)로 섞는다. 하늘을 계단식 색 띠로 나눌 때 쓴다.
function mixHex(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const ch = (shift) => {
    const va = (a >> shift) & 255;
    const vb = (b >> shift) & 255;
    return Math.round(va + (vb - va) * t);
  };
  return `#${((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1)}`;
}

// 상태이상 색을 스프라이트 모양 그대로 덧칠한 사본(빙결=얼음색 등). 원본 캔버스별로 캐시.
const _tintCache = new WeakMap();
function tintedSprite(sprite, color, alpha) {
  let byKey = _tintCache.get(sprite);
  if (!byKey) { byKey = new Map(); _tintCache.set(sprite, byKey); }
  const key = `${color}|${alpha}`;
  let c = byKey.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = sprite.width; c.height = sprite.height;
    const x = c.getContext('2d');
    x.drawImage(sprite, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.globalAlpha = alpha;
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    byKey.set(key, c);
  }
  return c;
}

function statusIconSprite(id) {
  const def = STATUS_DATA[id];
  return cachedSprite(`status:${id}`, STATUS_ICONS[id], { c: def.color, l: shadeHex(def.color, 1.4), d: shadeHex(def.color, 0.55) });
}

function statusIconHtml(id, size = 14) {
  const key = `status:${id}`;
  let url = _iconUrlCache.get(key);
  if (!url) { url = statusIconSprite(id).toDataURL(); _iconUrlCache.set(key, url); }
  return `<img class="status-icon" src="${url}" width="${size}" height="${size}" alt="">`;
}

// 캔버스에 스프라이트를 정수 배율로 찍는다. flipX면 좌우 반전.
function drawSprite(ctx, sprite, x, y, scale = 1, flipX = false) {
  const w = sprite.width * scale;
  const h = sprite.height * scale;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  if (flipX) {
    ctx.save();
    ctx.translate(Math.round(x + w), Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(sprite, Math.round(x), Math.round(y), w, h);
  }
  ctx.imageSmoothingEnabled = prev;
}
