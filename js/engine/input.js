// 물리 키 위치로 정규화한다. e.key를 쓰면 한글 입력 상태에서 'q'가 'ㅂ'로 들어와 매칭이 깨진다.
function normalizeKey(e) {
  const code = e.code || '';
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (code.startsWith('Arrow')) return code.toLowerCase();
  if (code === 'Space') return ' ';
  if (code === 'Tab') return 'tab';
  if (code === 'Escape') return 'escape';
  return (e.key || '').toLowerCase();
}

// 조작: 이동/공격은 키보드 전용, 마우스는 NPC 상호작용/UI 클릭 전용.
class InputManager {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();
    this.onMouseClickWorld = null; // (worldX, worldY) => void, main.js/game.js에서 설정
    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(normalizeKey(e)));
  }

  _onKeyDown(e) {
    const key = normalizeKey(e);
    // 브라우저 기본 동작(스크롤, 탭 이동) 방지
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(key)) e.preventDefault();
    if (!this.keys.has(key)) this.justPressed.add(key);
    this.keys.add(key);
    if (e.altKey && key === 'e') { e.preventDefault(); this.justPressed.add('alt+e'); }
  }

  isDown(key) { return this.keys.has(key); }
  wasPressed(key) { return this.justPressed.has(key); }
  endFrame() { this.justPressed.clear(); }

  bindCanvasClick(canvas, getWorldFromScreen) {
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      // 화면 배율(CSS transform)로 커진 만큼 되돌려 게임 좌표(960×540)로 바꾼다.
      const k = rect.width / (canvas.clientWidth || rect.width);
      const sx = (e.clientX - rect.left) / k;
      const sy = (e.clientY - rect.top) / k;
      const world = getWorldFromScreen(sx, sy);
      // 월드 좌표만으로는 발밑만 집힌다. 그림 기준으로 판정할 수 있게 화면 좌표도 같이 넘긴다.
      if (this.onMouseClickWorld) this.onMouseClickWorld(world.x, world.y, sx, sy);
    });
  }
}
