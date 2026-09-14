window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();
  game.start();
  window.__game = game; // 디버그용
});
