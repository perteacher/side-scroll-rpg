// 스킬 아이콘. 9×9 도트 격자 + 팔레트(c=주색 / l=밝게 / d=어둡게).
//
// 스킬이 100개가 넘어서 하나씩 그리면 품질이 고르지 않다. 그래서 '무엇을 하는 기술인가'를
// 18가지 모양으로 나누고, 색만 속성·역할에서 가져온다. 같은 모양이라도 불이면 주황, 얼음이면
// 하늘색이라 한눈에 갈린다. 상태이상 아이콘(STATUS_ICONS)이 쓰는 방식과 같다.
const SKILL_ICONS = {
  // --- 근접 ---
  slash: [ // 베기
    '......ll.',
    '.....lcc.',
    '....lcc..',
    '...lcc...',
    '..lcc....',
    '.lcc.....',
    '.dcc.....',
    '..dd.....',
    '.........',
  ],
  flurry: [ // 연타 — 베기 두 줄
    '....ll.ll',
    '...lcclcc',
    '..lcclcc.',
    '.lcclcc..',
    '.dcclcc..',
    '..ddlcc..',
    '.....dcc.',
    '......dd.',
    '.........',
  ],
  thrust: [ // 찌르기
    '.........',
    '.......l.',
    '......lc.',
    'ddddddlcc',
    'clllllllc',
    'ddddddlcc',
    '......lc.',
    '.......l.',
    '.........',
  ],
  smash: [ // 강타 — 내려찍기
    '.lllll...',
    'lcccccl..',
    'lcccccl..',
    '.ldddl...',
    '...c.....',
    '...c.....',
    '.d.c.d...',
    'd.dcd.d..',
    '.ddcdd...',
  ],
  whirl: [ // 회전 범위
    '..ddd....',
    '.dcccd..l',
    'dcc.ccd.c',
    'dc...cdlc',
    'dc....ccc',
    'dcc..ccd.',
    '.dcccdd..',
    'l.ddd....',
    'cl.......',
  ],

  // --- 원거리 ---
  arrow: [ // 화살
    '.......ll',
    '......lcl',
    '.....lc..',
    '....lc...',
    '...lc....',
    '..lc.....',
    '.lc..d...',
    'lc..d....',
    'l..d.....',
  ],
  volley: [ // 연사·화살비
    '.l..l..l.',
    'lc.lc.lc.',
    'c..c..c..',
    'd..d..d..',
    '.l..l..l.',
    'lc.lc.lc.',
    'c..c..c..',
    'd..d..d..',
    '.........',
  ],
  scope: [ // 저격·조준
    '...ccc...',
    '..c...c..',
    '.c..l..c.',
    'c...l...c',
    'cllcclllc',
    'c...l...c',
    '.c..l..c.',
    '..c...c..',
    '...ccc...',
  ],
  burst: [ // 산탄·탄막
    'l...d...l',
    '.l..d..l.',
    '..l.d.l..',
    '...ldl...',
    'dddcccddd',
    '...ldl...',
    '..l.d.l..',
    '.l..d..l.',
    'l...d...l',
  ],

  // --- 마법 ---
  bolt: [ // 마법 탄환
    '...ddd...',
    '..dcccd..',
    '.dclllcd.',
    'dclllllcd',
    'dcllllllc',
    'dclllllcd',
    '.dcccccd.',
    '..dcccd..',
    '...ddd...',
  ],
  nova: [ // 범위 폭발
    'd...l...d',
    '.d..l..d.',
    '..d.l.d..',
    '...dld...',
    'llldclllc',
    '...dld...',
    '..d.l.d..',
    '.d..l..d.',
    'd...l...d',
  ],
  chain: [ // 연쇄
    '....lll..',
    '...lcc...',
    '..lcc....',
    '.lccll...',
    '..llccl..',
    '....lcc..',
    '...lcc...',
    '..dcc....',
    '..dd.....',
  ],
  meteor: [ // 궁극 낙하 — 꼬리 달린 불덩이
    'l........',
    '.ll......',
    '..lld....',
    '...ddcd..',
    '..dclllc.',
    '..dcllllc',
    '...dcccc.',
    '....dddd.',
    '.........',
  ],

  // --- 지원(힐러) ---
  heal: [ // 치료 — 십자
    '...ccc...',
    '...clc...',
    '...clc...',
    'cccllccc.',
    'clllllll.',
    'cccllccc.',
    '...clc...',
    '...clc...',
    '...ccc...',
  ],
  heal_party: [ // 파티 치료 — 십자 + 둘레 표시
    'll.ccc.ll',
    'l..clc..l',
    '...clc...',
    'cccllccc.',
    'clllllll.',
    'cccllccc.',
    '...clc...',
    'l..clc..l',
    'll.ccc.ll',
  ],
  bless: [ // 버프 — 위로 솟는 빛
    '....l....',
    '...lcl...',
    '..lcccl..',
    '.lcclccl.',
    '...ccc...',
    '...ccc...',
    '..dcccd..',
    '.ddcccdd.',
    '..ddddd..',
  ],
  shield: [ // 방어 버프
    '.ccccccc.',
    '.cllllld.',
    '.cllcllld',
    '.clccclld',
    '.cllcllld',
    '.dcllllc.',
    '..dcllc..',
    '...dcc...',
    '....d....',
  ],
  cleanse: [ // 상태이상 해제 — 정화의 물방울
    '....l....',
    '...lcl.d.',
    '..lcccl..',
    '.lcclccl.',
    'lcclllccl',
    'lccclcccl',
    '.lcccccl.',
    '..lcccl..',
    '...lll...',
  ],
  refresh: [ // 재사용 대기 초기화
    '..lllll..',
    '.lc...cl.',
    'lc.....cl',
    'lc...ccll',
    'lc....lcl',
    'lc.....cl',
    '.lc...cl.',
    '..lllll..',
    '.........',
  ],
  revive: [ // 부활
    '....l....',
    '...lcl...',
    '..lcccl..',
    '.lcclccl.',
    'lcc.c.ccl',
    '.d..c..d.',
    '..ddcdd..',
    '...ddd...',
    '....d....',
  ],

  // --- 전용기 ---
  signature: [
    '....l....',
    '...lcl...',
    '..lcccl..',
    'lllcccll.',
    '.lcccccl.',
    '..lcccl..',
    '.lcc.ccl.',
    'lcd...dcl',
    'd.......d',
  ],
};

// 역할·속성별 기본 색
const SKILL_ICON_COLOR = {
  melee: '#e07a5f',
  ranged: '#7dc98a',
  magic: '#a78bd0',
  support: '#5fc9a0',
  fire: '#ff8c3a',
  ice: '#7fd4f5',
  lightning: '#f4d03f',
  signature: '#f1c40f',
};

// 스킬 id → 모양. 여기 없으면 type/kind에서 자동으로 고른다.
const SKILL_ICON_SHAPE = {
  // 근접
  slash_combo: 'slash', flurry: 'flurry', thrust_line: 'thrust',
  guard_break: 'smash', bleed_stab: 'thrust', stun_punch: 'smash',
  sweep: 'whirl', war_cry: 'whirl',
  crushing_blow: 'smash', blade_storm: 'whirl', dragon_fury: 'smash', divine_slash: 'whirl',
  // 원거리
  power_shot: 'arrow', multi_shot: 'volley', snipe: 'scope', suppress: 'burst',
  arrow_rain: 'volley', scatter_shot: 'burst',
  piercing_shot: 'arrow', storm_volley: 'volley', heaven_arrow: 'scope', hail_of_fire: 'burst',
  // 마법
  fireball: 'bolt', frostbolt: 'bolt', sparkbolt: 'bolt',
  ignite: 'nova', freeze: 'nova', shock: 'chain',
  flame_nova: 'nova', ice_nova: 'nova', chain_lightning: 'chain',
  inferno: 'nova', glacier: 'nova', thunderstorm: 'chain',
  solar_flare: 'bolt', eternal_ice: 'bolt', judgment_bolt: 'chain',
  meteor: 'meteor', blizzard: 'meteor', heaven_storm: 'meteor',
  // 지원
  treatment: 'heal', healing_hands: 'heal_party', recovery: 'cleanse',
  fortitude: 'shield', meditation: 'bless', haste: 'bless',
  ignore_harm: 'shield', penetration_aid: 'bless', refresh_mind: 'refresh',
  protection_field: 'shield', magic_barrier: 'shield', invulnerable: 'shield',
  fransfer: 'bless', enhancement: 'bless', escape_artist: 'cleanse',
  divine_bless: 'bless', sacred_heal: 'heal_party', resuscitation: 'revive',
};

// 지원 스킬 kind → 기본 모양(자료가 빠져도 그럴듯한 그림이 나오게)
const SUPPORT_KIND_SHAPE = {
  heal: 'heal', healAll: 'heal_party', buff: 'bless',
  cleanse: 'cleanse', refresh: 'refresh', revive: 'revive',
};

// 스킬 정의 → { shape, color, key }
// element가 있으면 색이 속성색으로 바뀐다(같은 폭발이라도 불/얼음이 갈린다).
function skillIconSpec(def, attackType = null, element = null) {
  if (!def) return { shape: 'bolt', color: SKILL_ICON_COLOR.magic, key: 'unknown' };
  const el = def.element || element;
  const role = def.kind ? 'support' : (attackType || 'magic');
  const shape = SKILL_ICON_SHAPE[def.id]
    || (def.kind ? (SUPPORT_KIND_SHAPE[def.kind] || 'bless') : (def.type === 'aoe' ? 'nova' : 'bolt'));
  const color = (el && SKILL_ICON_COLOR[el]) || SKILL_ICON_COLOR[role] || SKILL_ICON_COLOR.magic;
  return { shape, color, key: `${shape}:${color}` };
}

// 전용기 → { shape, color, key }. 종류마다 모양을 달리해 한눈에 구분되게 한다.
const SIGNATURE_KIND_SHAPE = {
  nuke: 'signature', barrage: 'flurry', aoe: 'nova', chain: 'chain',
  drain: 'bolt', buff: 'bless', heal: 'heal_party',
};

function signatureIconSpec(sig) {
  if (!sig) return { shape: 'signature', color: SKILL_ICON_COLOR.signature, key: 'sig' };
  const shape = SIGNATURE_KIND_SHAPE[sig.kind] || 'signature';
  const color = (sig.element && SKILL_ICON_COLOR[sig.element]) || SKILL_ICON_COLOR.signature;
  return { shape, color, key: `sig:${shape}:${color}` };
}
