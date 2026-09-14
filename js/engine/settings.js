// 플레이 설정. 세이브 파일과 별개로 브라우저에 남는다(캐릭터를 새로 만들어도 유지).
const SETTINGS_KEY = 'maple_granado_settings';

const DEFAULT_SETTINGS = {
  autoPotion: true,   // HP/MP가 임계치 아래로 떨어지면 물약 자동 사용
  hpThreshold: 0.5,
  mpThreshold: 0.25,
  showTracker: true,  // 화면 우측 퀘스트 목표 상시 표시
  showDamage: true,   // 데미지 숫자 표시
};

const SettingsManager = {
  values: { ...DEFAULT_SETTINGS },

  load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) Object.assign(this.values, JSON.parse(raw));
    } catch (e) { /* 저장소 차단 — 기본값으로 간다 */ }
    return this.values;
  },

  set(key, value) {
    if (!(key in DEFAULT_SETTINGS)) return;
    this.values[key] = value;
    this.save();
  },

  save() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.values)); } catch (e) { /* 저장소 차단 */ }
  },

  reset() {
    this.values = { ...DEFAULT_SETTINGS };
    this.save();
  },
};

// 플레이 기록. 이쪽은 세이브 파일에 같이 들어간다(캐릭터의 기록이므로).
class StatsTracker {
  constructor() {
    this.kills = 0;
    this.bossKills = 0;
    this.goldEarned = 0;
    this.playMs = 0;
    this.deaths = 0;      // 전투 불능이 된 횟수
    this.zonesVisited = new Set();
  }

  tick(dt) { this.playMs += dt; }

  get playTimeText() {
    const sec = Math.floor(this.playMs / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}시간 ${m}분` : `${m}분 ${sec % 60}초`;
  }

  serialize() {
    return {
      kills: this.kills, bossKills: this.bossKills, goldEarned: this.goldEarned,
      playMs: Math.round(this.playMs), deaths: this.deaths, zonesVisited: [...this.zonesVisited],
    };
  }

  restore(data) {
    if (!data) return;
    this.kills = data.kills || 0;
    this.bossKills = data.bossKills || 0;
    this.goldEarned = data.goldEarned || 0;
    this.playMs = data.playMs || 0;
    this.deaths = data.deaths || 0;
    this.zonesVisited = new Set(data.zonesVisited || []);
  }
}
