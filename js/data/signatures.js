// 캐릭터 고유 특성(패시브) + 전용기.
// 스탠스 스킬은 역할군 공용이라 누구를 영입해도 전투가 비슷했다.
// 여기서 캐릭터마다 다른 패시브와 전용기를 붙여, "누구를 데려가느냐"가 전투에 드러나게 한다.
// 전용기는 캐릭터 레벨 10에 개방되고 R키(조작 캐릭터) 또는 자동전투가 쓴다.

const SIGNATURE_REQ_LEVEL = 10;

// --- 패시브 특성 ---
// bonus는 EMPTY_FAMILY_BONUS와 같은 형태라 가문 특성·버프와 그대로 합산된다.
const TRAIT_DATA = {
  ironwall: { name: '철벽', desc: '방어력 +12% · 최대 HP +8%', bonus: { defPct: 0.12, hpPct: 0.08 } },
  // 힐러 계열 전용. 치료량이 공격력에서 나오므로 공격력이 곧 힐량이다.
  mender: { name: '치유자', desc: '공격력(치료량) +12% · 저항력 +10%', bonus: { atkPct: 0.12, resist: 0.10 } },
  warder: { name: '수호자의 기도', desc: '방어력 +10% · 저항력 +15%', bonus: { defPct: 0.10, resist: 0.15 } },
  berserk: { name: '광전사', desc: '공격력 +14% · 방어력 -6%', bonus: { atkPct: 0.14, defPct: -0.06 } },
  duelist: { name: '결투가', desc: '치명타 +7% · 치명타 피해 +12%', bonus: { crit: 7, critDmg: 12 } },
  swift: { name: '쾌속', desc: '공격속도 +12% · 이동속도 +10%', bonus: { atkSpeed: 0.12, moveSpeed: 0.10 } },
  marksman: { name: '명사수', desc: '명중률 +10% · 방어 무시 +6%', bonus: { accuracy: 0.10, pierce: 0.06 } },
  arcane: { name: '비전', desc: '공격력 +10% · 치명타 +3%', bonus: { atkPct: 0.10, crit: 3 } },
  vampiric: { name: '흡혈', desc: '준 피해의 6%만큼 HP 회복 · 공격력 +4%', bonus: { lifesteal: 0.06, atkPct: 0.04 } },
  guardian: { name: '수호', desc: '방어력 +16% · 최대 HP +12% · 공격력 -5%', bonus: { defPct: 0.16, hpPct: 0.12, atkPct: -0.05 } },
  hunter: { name: '추적자', desc: '공격력 +8% · 이동속도 +14%', bonus: { atkPct: 0.08, moveSpeed: 0.14 } },
  tactician: { name: '전술가', desc: '공격력 +14(고정) · 명중률 +6%', bonus: { atk: 14, accuracy: 0.06 } },
  juggernaut: { name: '불굴', desc: '최대 HP +18% · 공격속도 -4%', bonus: { hpPct: 0.18, atkSpeed: -0.04 } },
  executioner: { name: '처형자', desc: '치명타 피해 +25% · 방어 무시 +8%', bonus: { critDmg: 25, pierce: 0.08 } },
};

// --- 전용기 ---
// kind: nuke(단일 극딜) / barrage(연타) / aoe(범위) / chain(연쇄) / drain(흡혈) / buff(파티 강화) / heal(파티 회복)
const SIGNATURE_KIND_LABEL = {
  nuke: '단일', barrage: '연타', aoe: '범위', chain: '연쇄', drain: '흡혈', buff: '강화', heal: '회복',
};

const SIGNATURE_DATA = {
  // --- 기본 클래스 5종 ---
  fighter: { traitId: 'ironwall', skill: { id: 'sig_fighter', name: '분쇄 일격', kind: 'nuke', dmgMult: 3.0, manaCost: 26, cooldownMs: 9000 } },
  musketeer: { traitId: 'marksman', skill: { id: 'sig_musketeer', name: '관통 사격', kind: 'nuke', dmgMult: 3.4, manaCost: 28, cooldownMs: 9500 } },
  wizard: { traitId: 'arcane', skill: { id: 'sig_wizard', name: '원소 폭발', kind: 'aoe', dmgMult: 2.2, aoeRadius: 170, manaCost: 34, cooldownMs: 12000 } },
  warlock: { traitId: 'vampiric', skill: { id: 'sig_warlock', name: '생명 흡수', kind: 'drain', dmgMult: 2.4, healPct: 0.45, manaCost: 28, cooldownMs: 10000 } },
  scout: { traitId: 'mender', skill: { id: 'sig_scout', name: '퍼스트 에이드', kind: 'heal', healPct: 0.45, manaCost: 26, cooldownMs: 14000 } },

  // --- 1티어 영입 ---
  paion: { traitId: 'guardian', skill: { id: 'sig_paion', name: '십자 방벽', kind: 'buff', manaCost: 30, cooldownMs: 20000, durationMs: 12000, buff: { defPct: 0.25, hpPct: 0.10 } } },
  clode: { traitId: 'duelist', skill: { id: 'sig_clode', name: '쌍월참', kind: 'barrage', dmgMult: 1.0, hits: 4, manaCost: 26, cooldownMs: 10000 } },
  itju: { traitId: 'swift', skill: { id: 'sig_itju', name: '질풍 연격', kind: 'barrage', dmgMult: 0.8, hits: 6, manaCost: 26, cooldownMs: 10000 } },
  panfilos: { traitId: 'juggernaut', skill: { id: 'sig_panfilos', name: '대지 가르기', kind: 'aoe', dmgMult: 2.3, aoeRadius: 150, manaCost: 32, cooldownMs: 12000 } },
  scowt: { traitId: 'hunter', skill: { id: 'sig_scowt', name: '추적자의 화살', kind: 'nuke', dmgMult: 3.3, manaCost: 26, cooldownMs: 9000 } },
  wizarr: { traitId: 'arcane', skill: { id: 'sig_wizarr', name: '화염 소용돌이', kind: 'aoe', dmgMult: 2.4, aoeRadius: 170, manaCost: 34, cooldownMs: 12000, element: 'fire' } },
  jackson: { traitId: 'marksman', skill: { id: 'sig_jackson', name: '저격 관통', kind: 'nuke', dmgMult: 3.8, manaCost: 30, cooldownMs: 11000 } },

  // --- 2티어 영입 ---
  ramirof: { traitId: 'berserk', skill: { id: 'sig_ramirof', name: '광란의 주먹', kind: 'barrage', dmgMult: 0.95, hits: 5, manaCost: 28, cooldownMs: 10000 } },
  adelin: { traitId: 'executioner', skill: { id: 'sig_adelin', name: '처형 사격', kind: 'nuke', dmgMult: 4.0, manaCost: 32, cooldownMs: 11000 } },
  emilrea: { traitId: 'arcane', skill: { id: 'sig_emilrea', name: '연쇄 화염', kind: 'chain', dmgMult: 1.9, chainCount: 3, manaCost: 32, cooldownMs: 11000, element: 'fire' } },
  sohoa: { traitId: 'duelist', skill: { id: 'sig_sohoa', name: '월광 무도', kind: 'aoe', dmgMult: 2.1, aoeRadius: 130, manaCost: 30, cooldownMs: 11000 } },
  vernelia: { traitId: 'mender', skill: { id: 'sig_vernelia', name: '서리 결계', kind: 'buff', manaCost: 30, cooldownMs: 20000, durationMs: 12000, buff: { defPct: 0.18, resist: 0.15 } } },
  mbomar: { traitId: 'ironwall', skill: { id: 'sig_mbomar', name: '불괴의 일격', kind: 'nuke', dmgMult: 3.1, manaCost: 26, cooldownMs: 9000 } },
  risael: { traitId: 'swift', skill: { id: 'sig_risael', name: '그림자 연타', kind: 'barrage', dmgMult: 0.85, hits: 6, manaCost: 28, cooldownMs: 10000 } },

  // --- 3티어 영입 ---
  musketya: { traitId: 'marksman', skill: { id: 'sig_musketya', name: '일제 사격', kind: 'aoe', dmgMult: 2.2, aoeRadius: 160, manaCost: 32, cooldownMs: 12000 } },
  cortasal: { traitId: 'executioner', skill: { id: 'sig_cortasal', name: '급소 저격', kind: 'nuke', dmgMult: 4.2, manaCost: 32, cooldownMs: 11000 } },
  andrei: { traitId: 'tactician', skill: { id: 'sig_andrei', name: '전열 지휘', kind: 'buff', manaCost: 32, cooldownMs: 20000, durationMs: 12000, buff: { atkPct: 0.22, accuracy: 0.08 } } },
  alejandr: { traitId: 'vampiric', skill: { id: 'sig_alejandr', name: '흑염 흡수', kind: 'drain', dmgMult: 2.6, healPct: 0.45, manaCost: 30, cooldownMs: 10000, element: 'fire' } },
  graciel: { traitId: 'guardian', skill: { id: 'sig_graciel', name: '수호의 창', kind: 'buff', manaCost: 32, cooldownMs: 20000, durationMs: 12000, buff: { defPct: 0.20, atkPct: 0.08 } } },
  rorken: { traitId: 'juggernaut', skill: { id: 'sig_rorken', name: '대지 관통', kind: 'nuke', dmgMult: 3.3, manaCost: 28, cooldownMs: 9500 } },
  tiburan: { traitId: 'berserk', skill: { id: 'sig_tiburan', name: '피의 연무', kind: 'barrage', dmgMult: 1.0, hits: 5, manaCost: 28, cooldownMs: 10000 } },

  // --- 4티어 영입 ---
  catrenne: { traitId: 'warder', skill: { id: 'sig_catrenne', name: '프로텍션 필드', kind: 'buff', manaCost: 36, cooldownMs: 22000, durationMs: 15000, buff: { defPct: 0.28, resist: 0.15 } } },
  granmar: { traitId: 'tactician', skill: { id: 'sig_granmar', name: '빙하 결계', kind: 'buff', manaCost: 34, cooldownMs: 20000, durationMs: 12000, buff: { atkPct: 0.15, defPct: 0.12 }, element: 'ice' } },
  rominas: { traitId: 'hunter', skill: { id: 'sig_rominas', name: '연발 석궁', kind: 'barrage', dmgMult: 0.9, hits: 6, manaCost: 30, cooldownMs: 10000 } },
  sharife: { traitId: 'swift', skill: { id: 'sig_sharife', name: '질풍 화살비', kind: 'aoe', dmgMult: 2.3, aoeRadius: 170, manaCost: 32, cooldownMs: 12000 } },
  brunia: { traitId: 'arcane', skill: { id: 'sig_brunia', name: '뇌전 연쇄', kind: 'chain', dmgMult: 1.85, chainCount: 4, manaCost: 34, cooldownMs: 11000, element: 'lightning' } },
  yeganel: { traitId: 'duelist', skill: { id: 'sig_yeganel', name: '정밀 연사', kind: 'barrage', dmgMult: 1.0, hits: 5, manaCost: 30, cooldownMs: 10000 } },
  vikia: { traitId: 'swift', skill: { id: 'sig_vikia', name: '연환 각격', kind: 'barrage', dmgMult: 0.8, hits: 7, manaCost: 30, cooldownMs: 10000 } },

  // --- 5티어 영입 ---
  wolak: { traitId: 'vampiric', skill: { id: 'sig_wolak', name: '영혼 흡수', kind: 'drain', dmgMult: 2.8, healPct: 0.5, manaCost: 32, cooldownMs: 10000, element: 'lightning' } },
  valerian: { traitId: 'executioner', skill: { id: 'sig_valerian', name: '벼락 심판', kind: 'nuke', dmgMult: 4.4, manaCost: 34, cooldownMs: 11000, element: 'lightning' } },
  beatria: { traitId: 'arcane', skill: { id: 'sig_beatria', name: '대화염 폭풍', kind: 'aoe', dmgMult: 2.8, aoeRadius: 190, manaCost: 38, cooldownMs: 12500, element: 'fire' } },
  lionello: { traitId: 'duelist', skill: { id: 'sig_lionello', name: '검성의 연격', kind: 'barrage', dmgMult: 1.05, hits: 6, manaCost: 32, cooldownMs: 10500 } },
  darian: { traitId: 'marksman', skill: { id: 'sig_darian', name: '관통 볼트', kind: 'nuke', dmgMult: 4.0, manaCost: 32, cooldownMs: 10500 } },
  helenia: { traitId: 'mender', skill: { id: 'sig_helenia', name: '생명의 성역', kind: 'heal', healPct: 0.5, manaCost: 40, cooldownMs: 22000 } },
  clera: { traitId: 'executioner', skill: { id: 'sig_clera', name: '작열 탄환', kind: 'nuke', dmgMult: 4.5, manaCost: 34, cooldownMs: 11000, element: 'fire' } },

  // --- 6티어 영입 (카르네비아) ---
  sverna: { traitId: 'guardian', skill: { id: 'sig_sverna', name: '설벽 창진', kind: 'buff', manaCost: 34, cooldownMs: 22000, durationMs: 13000, buff: { defPct: 0.3, hpPct: 0.12 } } },
  kaltos: { traitId: 'berserk', skill: { id: 'sig_kaltos', name: '한파 난타', kind: 'barrage', dmgMult: 1.1, hits: 6, manaCost: 34, cooldownMs: 10500, element: 'ice' } },
  nivena: { traitId: 'arcane', skill: { id: 'sig_nivena', name: '빙하 붕괴', kind: 'aoe', dmgMult: 3.0, aoeRadius: 200, manaCost: 40, cooldownMs: 13000, element: 'ice' } },
  brandt: { traitId: 'marksman', skill: { id: 'sig_brandt', name: '서리 관통탄', kind: 'nuke', dmgMult: 4.6, manaCost: 34, cooldownMs: 10500, element: 'ice' } },
  lucienne: { traitId: 'mender', skill: { id: 'sig_lucienne', name: '성화의 고리', kind: 'heal', healPct: 0.55, manaCost: 36, cooldownMs: 20000 } },

  // --- 7티어 영입 (아에리스) ---
  aeron: { traitId: 'swift', skill: { id: 'sig_aeron', name: '질풍 연사', kind: 'barrage', dmgMult: 1.0, hits: 8, manaCost: 36, cooldownMs: 11000 } },
  thalia: { traitId: 'warder', skill: { id: 'sig_thalia', name: '프랜스펄', kind: 'buff', manaCost: 42, cooldownMs: 26000, durationMs: 18000, buff: { atkPct: 0.20, defPct: 0.15, resist: 0.15, accuracy: 0.10 } } },
  gorvain: { traitId: 'ironwall', skill: { id: 'sig_gorvain', name: '거암 내려치기', kind: 'nuke', dmgMult: 5.0, manaCost: 36, cooldownMs: 11500 } },
  seris: { traitId: 'duelist', skill: { id: 'sig_seris', name: '폭풍 쌍인', kind: 'chain', dmgMult: 2.4, count: 4, manaCost: 36, cooldownMs: 11000 } },
  orwen: { traitId: 'tactician', skill: { id: 'sig_orwen', name: '전열 재정비', kind: 'heal', healPct: 0.4, manaCost: 44, cooldownMs: 24000 } },
};

// ===== 링크 스킬 (메이플스토리) =====
// 보유한 캐릭터(병영 포함)가 일정 레벨에 오르면 그 캐릭터의 고유 특성이 약하게 파티 전체에 나눠진다.
// 같은 특성은 겹치지 않고 가장 높은 링크 레벨 하나만 적용한다.
const LINK_LEVELS = [
  { level: 30, rate: 0.25 },
  { level: 70, rate: 0.4 },
  { level: 101, rate: 0.6 },
];

function linkLevelOf(charLevel) { return LINK_LEVELS.filter((l) => charLevel >= l.level).length; }

function linkBonusOf(traitId, linkLevel) {
  const trait = TRAIT_DATA[traitId];
  if (!trait || !linkLevel) return null;
  const rate = LINK_LEVELS[linkLevel - 1].rate;
  const out = {};
  Object.entries(trait.bonus).forEach(([k, v]) => { out[k] = v * rate; });
  return out;
}

function traitOf(defId) {
  const entry = SIGNATURE_DATA[defId];
  return entry ? TRAIT_DATA[entry.traitId] : null;
}

function signatureOf(defId) {
  const entry = SIGNATURE_DATA[defId];
  return entry ? entry.skill : null;
}

// 전용기 한 줄 설명
function signatureText(skill) {
  if (skill.kind === 'heal') return `파티 전원 HP ${Math.round(skill.healPct * 100)}% 회복`;
  if (skill.kind === 'buff' && skill.buff && skill.buff.resist && Object.keys(skill.buff).length === 1) {
    return `파티 저항력 +${Math.round(skill.buff.resist * 100)}% — ${skill.durationMs / 1000}초`;
  }
  if (skill.kind === 'buff') {
    const b = skill.buff;
    const parts = [];
    if (b.atkPct) parts.push(`공격 +${Math.round(b.atkPct * 100)}%`);
    if (b.defPct) parts.push(`방어 +${Math.round(b.defPct * 100)}%`);
    if (b.hpPct) parts.push(`최대 HP +${Math.round(b.hpPct * 100)}%`);
    if (b.crit) parts.push(`치명타 +${b.crit}%`);
    if (b.accuracy) parts.push(`명중 +${Math.round(b.accuracy * 100)}%`);
    if (b.resist) parts.push(`저항력 +${Math.round(b.resist * 100)}%`);
    return `파티 ${parts.join(' · ')} — ${skill.durationMs / 1000}초`;
  }
  if (skill.kind === 'barrage') return `${skill.dmgMult}배 ${skill.hits}연타`;
  if (skill.kind === 'chain') return `${skill.dmgMult}배 · 최대 ${skill.chainCount}체 연쇄`;
  if (skill.kind === 'aoe') return `${skill.dmgMult}배 범위 타격 (반경 ${skill.aoeRadius})`;
  if (skill.kind === 'drain') return `${skill.dmgMult}배 · 준 피해의 ${Math.round(skill.healPct * 100)}% 회복`;
  return `${skill.dmgMult}배 단일 타격`;
}
