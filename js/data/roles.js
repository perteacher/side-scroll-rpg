// 역할군(공격 타입)별 스킬 정의.
// type: single(단일기) / aoe(범위기), reqLevel: 습득에 필요한 스탠스 레벨, aoeRadius: 범위기 반경(px)
const MAX_SKILL_LEVEL = 5;

const ROLE_SKILLS_DATA = {
  melee: {
    slash_combo: { id: 'slash_combo', name: '연속베기', type: 'single', reqLevel: 1, dmgMult: 1.4, cooldownMs: 2000, manaCost: 8 },
    flurry: { id: 'flurry', name: '난격', type: 'single', reqLevel: 1, dmgMult: 1.3, cooldownMs: 1800, manaCost: 8 },
    thrust_line: { id: 'thrust_line', name: '직선찌르기', type: 'single', reqLevel: 1, dmgMult: 1.45, cooldownMs: 2000, manaCost: 9 },
    guard_break: { id: 'guard_break', name: '가드브레이크', type: 'single', reqLevel: 3, dmgMult: 1.9, cooldownMs: 3500, manaCost: 14 },
    bleed_stab: { id: 'bleed_stab', name: '출혈찌르기', type: 'single', reqLevel: 3, dmgMult: 1.8, cooldownMs: 3000, manaCost: 13 },
    stun_punch: { id: 'stun_punch', name: '기절펀치', type: 'single', reqLevel: 3, dmgMult: 1.75, cooldownMs: 3200, manaCost: 13 },
    sweep: { id: 'sweep', name: '휩쓸기', type: 'aoe', reqLevel: 5, dmgMult: 1.5, cooldownMs: 4500, manaCost: 20, aoeRadius: 120 },
    war_cry: { id: 'war_cry', name: '전투의함성', type: 'aoe', reqLevel: 5, dmgMult: 1.4, cooldownMs: 5000, manaCost: 22, aoeRadius: 140 },
  },
  ranged: {
    power_shot: { id: 'power_shot', name: '강화사격', type: 'single', reqLevel: 1, dmgMult: 1.5, cooldownMs: 2200, manaCost: 9 },
    multi_shot: { id: 'multi_shot', name: '연사', type: 'single', reqLevel: 1, dmgMult: 1.35, cooldownMs: 1700, manaCost: 8 },
    snipe: { id: 'snipe', name: '저격', type: 'single', reqLevel: 3, dmgMult: 2.2, cooldownMs: 4000, manaCost: 16 },
    suppress: { id: 'suppress', name: '제압사격', type: 'single', reqLevel: 3, dmgMult: 1.8, cooldownMs: 2900, manaCost: 14 },
    arrow_rain: { id: 'arrow_rain', name: '화살비', type: 'aoe', reqLevel: 5, dmgMult: 1.5, cooldownMs: 4800, manaCost: 22, aoeRadius: 150 },
    scatter_shot: { id: 'scatter_shot', name: '산탄사격', type: 'aoe', reqLevel: 5, dmgMult: 1.45, cooldownMs: 4500, manaCost: 21, aoeRadius: 140 },
  },
  magic: {
    fireball: { id: 'fireball', name: '파이어볼', type: 'single', reqLevel: 1, dmgMult: 1.6, cooldownMs: 2400, manaCost: 12, element: 'fire' },
    frostbolt: { id: 'frostbolt', name: '프로스트볼트', type: 'single', reqLevel: 1, dmgMult: 1.55, cooldownMs: 2200, manaCost: 12, element: 'ice' },
    sparkbolt: { id: 'sparkbolt', name: '스파크볼트', type: 'single', reqLevel: 1, dmgMult: 1.55, cooldownMs: 2100, manaCost: 12, element: 'lightning' },
    ignite: { id: 'ignite', name: '점화', type: 'single', reqLevel: 3, dmgMult: 1.9, cooldownMs: 3000, manaCost: 16, element: 'fire' },
    freeze: { id: 'freeze', name: '동결', type: 'single', reqLevel: 3, dmgMult: 1.85, cooldownMs: 3200, manaCost: 16, element: 'ice' },
    shock: { id: 'shock', name: '감전', type: 'single', reqLevel: 3, dmgMult: 1.85, cooldownMs: 3000, manaCost: 16, element: 'lightning' },
    flame_nova: { id: 'flame_nova', name: '화염폭발', type: 'aoe', reqLevel: 5, dmgMult: 1.7, cooldownMs: 5000, manaCost: 26, aoeRadius: 150, element: 'fire' },
    ice_nova: { id: 'ice_nova', name: '빙결폭발', type: 'aoe', reqLevel: 5, dmgMult: 1.65, cooldownMs: 4800, manaCost: 25, aoeRadius: 150, element: 'ice' },
    chain_lightning: { id: 'chain_lightning', name: '연쇄번개', type: 'aoe', reqLevel: 5, dmgMult: 1.7, cooldownMs: 4900, manaCost: 26, aoeRadius: 160, element: 'lightning' },
  },
};

// ===== 힐러 계열(지원) 스킬 =====
// 원작 퍼스트 에이드 / 포르티투도 / 택티컬 어시스턴스 / 인캔테이션 / 인핸스 택틱스 / 이노켄티오의
// 스킬 이름과 역할을 가져왔다. 공격 스킬과 달리 dmgMult 대신 kind로 하는 일이 갈린다.
//   heal     … 가장 많이 다친 동료 한 명을 회복
//   healAll  … 파티 전원 회복
//   buff     … 파티 전원에게 durationMs 동안 보정을 건다
//   cleanse  … 파티 전원의 상태이상을 해제(+소폭 회복)
//   refresh  … 파티 전원의 스킬 재사용 대기를 초기화 (원작 리프래쉬 마인드)
//   revive   … 쓰러진 동료를 즉시 일으킨다 (원작 리서시테이션)
// healPct는 '시전자 공격력 대비'가 아니라 '대상 최대 HP 대비'다. 레벨이 올라도 쓸모가 유지된다.
ROLE_SKILLS_DATA.support = {
  // --- 퍼스트 에이드 (기본) ---
  treatment: { id: 'treatment', name: '트리트먼트', type: 'single', kind: 'heal', reqLevel: 1,
    healPct: 0.22, cooldownMs: 2600, manaCost: 10 },
  healing_hands: { id: 'healing_hands', name: '힐링 핸즈', type: 'party', kind: 'healAll', reqLevel: 3,
    healPct: 0.16, cooldownMs: 7000, manaCost: 22 },
  recovery: { id: 'recovery', name: '리커버', type: 'party', kind: 'cleanse', reqLevel: 5,
    healPct: 0.08, cooldownMs: 13000, manaCost: 20 },

  // --- 포르티투도 (기본 · 버프) ---
  // 힐러는 평타로 때리지 않는다. 파티에서 빠진 딜 한 자리를 이 버프들이 대신해야 해서
  // 수치를 넉넉하게 잡았다(힐러를 안 데려가면 이 보정도 통째로 없다).
  fortitude: { id: 'fortitude', name: '포르티투도', type: 'party', kind: 'buff', reqLevel: 1,
    buff: { defPct: 0.15, hpPct: 0.08 }, durationMs: 40000, cooldownMs: 22000, manaCost: 16 },
  meditation: { id: 'meditation', name: '메디테이션', type: 'party', kind: 'buff', reqLevel: 3,
    buff: { atkPct: 0.18 }, durationMs: 40000, cooldownMs: 22000, manaCost: 18 },
  haste: { id: 'haste', name: '헤이스트', type: 'party', kind: 'buff', reqLevel: 5,
    buff: { atkSpeed: 0.18, moveSpeed: 0.12 }, durationMs: 40000, cooldownMs: 24000, manaCost: 20 },

  // --- 택티컬 어시스턴스 (베테랑) ---
  ignore_harm: { id: 'ignore_harm', name: '이그노어 함', type: 'party', kind: 'buff', reqLevel: 1,
    buff: { resist: 0.15, defPct: 0.08 }, durationMs: 45000, cooldownMs: 24000, manaCost: 24 },
  penetration_aid: { id: 'penetration_aid', name: '페네트레이션', type: 'party', kind: 'buff', reqLevel: 3,
    buff: { pierce: 0.10, accuracy: 0.08 }, durationMs: 45000, cooldownMs: 24000, manaCost: 26 },
  refresh_mind: { id: 'refresh_mind', name: '리프래쉬 마인드', type: 'party', kind: 'refresh', reqLevel: 5,
    cooldownMs: 30000, manaCost: 34 },

  // --- 인캔테이션 (익스퍼트) ---
  protection_field: { id: 'protection_field', name: '프로텍션 필드', type: 'party', kind: 'buff', reqLevel: 1,
    buff: { defPct: 0.20 }, durationMs: 45000, cooldownMs: 24000, manaCost: 26 },
  magic_barrier: { id: 'magic_barrier', name: '매직 배리어', type: 'party', kind: 'buff', reqLevel: 3,
    buff: { resist: 0.20, hpPct: 0.10 }, durationMs: 45000, cooldownMs: 26000, manaCost: 30 },
  invulnerable: { id: 'invulnerable', name: '인버러너블', type: 'party', kind: 'buff', reqLevel: 5,
    buff: { defPct: 0.30, hpPct: 0.15 }, durationMs: 30000, cooldownMs: 40000, manaCost: 40 },

  // --- 인핸스 택틱스 (마스터) ---
  // 원작 1번 스킬 프랜스펄. 포르티투도 + 택티컬 어시스턴스의 버프를 한 방에 대신한다.
  fransfer: { id: 'fransfer', name: '프랜스펄', type: 'party', kind: 'buff', reqLevel: 1,
    buff: { atkPct: 0.18, defPct: 0.15, atkSpeed: 0.12, moveSpeed: 0.10, resist: 0.15, accuracy: 0.10 },
    durationMs: 60000, cooldownMs: 30000, manaCost: 46 },
  enhancement: { id: 'enhancement', name: '인핸스먼트', type: 'party', kind: 'buff', reqLevel: 3,
    buff: { atkPct: 0.15, crit: 8, pierce: 0.08 }, durationMs: 45000, cooldownMs: 26000, manaCost: 38 },
  escape_artist: { id: 'escape_artist', name: '에스킵 아티스트', type: 'party', kind: 'cleanse', reqLevel: 5,
    healPct: 0.20, cooldownMs: 16000, manaCost: 32 },

  // --- 이노켄티오 (마스터 · 퍼스트 에이드의 진화형) ---
  divine_bless: { id: 'divine_bless', name: '디바인 블레스', type: 'party', kind: 'buff', reqLevel: 1,
    buff: { defPct: 0.22, resist: 0.18, hpPct: 0.12 }, durationMs: 60000, cooldownMs: 30000, manaCost: 44 },
  sacred_heal: { id: 'sacred_heal', name: '세이크리드 힐', type: 'party', kind: 'healAll', reqLevel: 3,
    healPct: 0.45, cooldownMs: 12000, manaCost: 40 },
  resuscitation: { id: 'resuscitation', name: '리서시테이션', type: 'party', kind: 'revive', reqLevel: 5,
    healPct: 0.50, cooldownMs: 45000, manaCost: 50 },
};

// ===== 상급·마스터 스탠스 전용 스킬 =====
Object.assign(ROLE_SKILLS_DATA.melee, {
  crushing_blow: { id: 'crushing_blow', name: '파쇄일격', type: 'single', reqLevel: 1, dmgMult: 2.4, cooldownMs: 3200, manaCost: 18 },
  blade_storm: { id: 'blade_storm', name: '칼날폭풍', type: 'aoe', reqLevel: 5, dmgMult: 2.3, cooldownMs: 6000, manaCost: 32, aoeRadius: 160 },
  dragon_fury: { id: 'dragon_fury', name: '용의분노', type: 'single', reqLevel: 3, dmgMult: 3.6, cooldownMs: 6500, manaCost: 36 },
  divine_slash: { id: 'divine_slash', name: '성광참', type: 'aoe', reqLevel: 5, dmgMult: 3.0, cooldownMs: 8000, manaCost: 48, aoeRadius: 190 },
});
Object.assign(ROLE_SKILLS_DATA.ranged, {
  piercing_shot: { id: 'piercing_shot', name: '관통사격', type: 'single', reqLevel: 1, dmgMult: 2.5, cooldownMs: 3200, manaCost: 18 },
  storm_volley: { id: 'storm_volley', name: '폭풍사격', type: 'aoe', reqLevel: 5, dmgMult: 2.2, cooldownMs: 6000, manaCost: 32, aoeRadius: 170 },
  heaven_arrow: { id: 'heaven_arrow', name: '천궁일섬', type: 'single', reqLevel: 3, dmgMult: 3.8, cooldownMs: 6500, manaCost: 38 },
  hail_of_fire: { id: 'hail_of_fire', name: '탄막폭격', type: 'aoe', reqLevel: 5, dmgMult: 3.0, cooldownMs: 8000, manaCost: 48, aoeRadius: 210 },
});
Object.assign(ROLE_SKILLS_DATA.magic, {
  inferno: { id: 'inferno', name: '업화', type: 'aoe', reqLevel: 5, dmgMult: 2.4, cooldownMs: 6000, manaCost: 34, aoeRadius: 170, element: 'fire' },
  glacier: { id: 'glacier', name: '빙하낙하', type: 'aoe', reqLevel: 5, dmgMult: 2.3, cooldownMs: 6000, manaCost: 34, aoeRadius: 170, element: 'ice' },
  thunderstorm: { id: 'thunderstorm', name: '뇌운', type: 'aoe', reqLevel: 5, dmgMult: 2.35, cooldownMs: 6000, manaCost: 34, aoeRadius: 180, element: 'lightning' },
  solar_flare: { id: 'solar_flare', name: '태양섬광', type: 'single', reqLevel: 3, dmgMult: 3.6, cooldownMs: 6500, manaCost: 40, element: 'fire' },
  eternal_ice: { id: 'eternal_ice', name: '영겁빙결', type: 'single', reqLevel: 3, dmgMult: 3.5, cooldownMs: 6500, manaCost: 40, element: 'ice' },
  judgment_bolt: { id: 'judgment_bolt', name: '심판뇌격', type: 'single', reqLevel: 3, dmgMult: 3.55, cooldownMs: 6500, manaCost: 40, element: 'lightning' },
  meteor: { id: 'meteor', name: '메테오', type: 'aoe', reqLevel: 5, dmgMult: 3.2, cooldownMs: 8500, manaCost: 52, aoeRadius: 210, element: 'fire' },
  blizzard: { id: 'blizzard', name: '블리자드', type: 'aoe', reqLevel: 5, dmgMult: 3.1, cooldownMs: 8500, manaCost: 52, aoeRadius: 210, element: 'ice' },
  heaven_storm: { id: 'heaven_storm', name: '천뢰폭풍', type: 'aoe', reqLevel: 5, dmgMult: 3.15, cooldownMs: 8500, manaCost: 52, aoeRadius: 220, element: 'lightning' },
});
