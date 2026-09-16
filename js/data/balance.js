// 몹 강도 배율.
//
// 몹 수치(js/data/world.js)는 사이드스크롤 시절에 잡은 값이다. 그 뒤로 파티 쪽에만
// 스탠스 성장·장비 강화·잠재능력·컬렉션·링크가 쌓여서, 측정해 보니 Lv1~45 구간의 몹이
// 전부 한 프레임(0.02초)에 죽었다. 그래서 몹 정의는 그대로 두고 여기서 배율만 곱한다.
//
// 목표: 몹 한 마리 처치에 1.5~3.5초. 경험치는 처치 속도가 2~3배 느려진 만큼만 올린다(성장 속도 유지).
// [레벨, HP 배율, 공격력 배율, 경험치 배율, 방어력 배율] — 사이 레벨은 선형 보간한다.
const ENEMY_SCALE_POINTS = [
  [1, 18, 1.6, 3, 1],
  [5, 20, 1.6, 3, 1],
  [10, 36, 1.5, 3, 1],
  [15, 36, 1.4, 3, 1],
  [20, 48, 1.3, 3, 1],
  [25, 44, 1.3, 3, 1],
  [30, 56, 1.2, 3, 1],
  [35, 55, 1.2, 3, 1],
  [40, 60, 1.15, 3, 1],
  [45, 58, 1.15, 3, 1],
  [100, 5.5, 1.0, 2, 0.9],
  [110, 1.1, 0.6, 1.5, 0.5],
  [120, 0.2, 0.35, 1.2, 0.2],
];

function enemyScaleFor(level) {
  const pts = ENEMY_SCALE_POINTS;
  const lv = clamp(level || 1, pts[0][0], pts[pts.length - 1][0]);
  let a = pts[0];
  let b = pts[pts.length - 1];
  for (let i = 0; i < pts.length - 1; i++) {
    if (lv >= pts[i][0] && lv <= pts[i + 1][0]) { a = pts[i]; b = pts[i + 1]; break; }
  }
  const span = b[0] - a[0];
  const t = span === 0 ? 0 : (lv - a[0]) / span;
  const mix = (i) => a[i] + (b[i] - a[i]) * t;
  return { hp: mix(1), atk: mix(2), xp: mix(3), def: mix(4) };
}
