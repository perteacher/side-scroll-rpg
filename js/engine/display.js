// 화면 배율(해상도). 게임 안의 좌표는 언제나 960×540이고, 화면에 보일 때만 통째로 키운다.
//  - HUD·창(HTML)은 #game-root에 CSS transform scale을 걸어 같이 커진다.
//  - 캔버스는 CSS 크기를 960×540으로 둔 채 실제 픽셀 수를 배율×기기 픽셀비만큼 늘린다.
//    그래야 키워도 글자·체력바가 뭉개지지 않는다(도트는 원래 계단이라 그대로 키운다).
const GAME_VIEW_W = 960;
const GAME_VIEW_H = 540;
const MAX_CANVAS_SCALE = 3; // 4K·고배율 모니터에서 캔버스가 지나치게 커지지 않게

const RESOLUTION_OPTIONS = [
  { id: 'fit', label: '창에 맞춤' },
  { id: '960x540', label: '960 × 540', w: 960, h: 540 },
  { id: '1280x720', label: '1280 × 720', w: 1280, h: 720 },
  { id: '1600x900', label: '1600 × 900', w: 1600, h: 900 },
  { id: '1920x1080', label: '1920 × 1080', w: 1920, h: 1080 },
];

const DisplayManager = {
  scale: 1,
  outputScale: 0,
  onScaleChange: null, // (캔버스 출력 배율) => void

  init() {
    window.addEventListener('resize', () => this.apply());
    document.addEventListener('fullscreenchange', () => this.apply());
    this._resizeDesktopWindow();
    this.apply();
  },

  get option() {
    return RESOLUTION_OPTIONS.find((o) => o.id === SettingsManager.values.resolution) || RESOLUTION_OPTIONS[0];
  },

  // 창에 꽉 차는 배율. 고정 해상도를 골라도 창보다 크게는 키우지 않는다(잘리면 못 쓰니까).
  targetScale() {
    const fit = Math.min(window.innerWidth / GAME_VIEW_W, window.innerHeight / GAME_VIEW_H);
    const opt = this.option;
    const s = opt.w ? Math.min(opt.w / GAME_VIEW_W, fit) : fit;
    return Math.max(0.25, s);
  },

  apply() {
    const root = document.getElementById('game-root');
    // 최소화·숨김 탭은 창 크기가 0으로 잡힌다. 그때 줄여봐야 되돌릴 때 다시 키울 뿐이라 건너뛴다.
    if (!root || !window.innerWidth || !window.innerHeight) return;
    const s = this.targetScale();
    root.style.transform = `scale(${s})`;
    root.style.left = `${Math.max(0, Math.round((window.innerWidth - GAME_VIEW_W * s) / 2))}px`;
    root.style.top = `${Math.max(0, Math.round((window.innerHeight - GAME_VIEW_H * s) / 2))}px`;
    this.scale = s;
    const out = Math.min(MAX_CANVAS_SCALE, s * (window.devicePixelRatio || 1));
    if (Math.abs(out - this.outputScale) > 1e-3) {
      this.outputScale = out;
      if (this.onScaleChange) this.onScaleChange(out);
    }
  },

  setResolution(id) {
    if (!RESOLUTION_OPTIONS.some((o) => o.id === id)) return;
    SettingsManager.set('resolution', id);
    this._resizeDesktopWindow();
    this.apply();
  },

  // 데스크톱(exe)에서는 고른 해상도로 창 안쪽 크기까지 바꾼다. 브라우저는 창 크기를 못 바꾸므로 배율만.
  _resizeDesktopWindow() {
    const opt = this.option;
    if (!opt.w || !window.desktopApp || !window.desktopApp.setContentSize) return;
    window.desktopApp.setContentSize(opt.w, opt.h);
    // 창이 뒤에 가려져 있으면 resize 이벤트가 렌더링 때까지 밀린다. 타이머로 한 번 더 맞춘다.
    [200, 700].forEach((ms) => setTimeout(() => this.apply(), ms));
  },

  isFullscreen() {
    return !!document.fullscreenElement
      || (window.innerWidth >= screen.width && window.innerHeight >= screen.height);
  },

  toggleFullscreen() {
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  },

  get sizeText() {
    return `${Math.round(GAME_VIEW_W * this.scale)} × ${Math.round(GAME_VIEW_H * this.scale)}`;
  },
};
