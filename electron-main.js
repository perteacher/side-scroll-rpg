// 데스크톱 실행용 진입점. 게임 자체는 브라우저판과 완전히 같은 파일을 그대로 띄운다.
const { app, BrowserWindow, Menu, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

function createWindow() {
  const win = new BrowserWindow({
    // useContentSize: 창 테두리를 뺀 안쪽이 정확히 960x540
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    useContentSize: true,
    resizable: true,
    backgroundColor: '#000000',
    title: '사이드스크롤 RPG',
    autoHideMenuBar: true,
    webPreferences: {
      // 게임은 Node API를 쓰지 않는다. 렌더러를 격리하고, 창 크기 조절만 preload로 열어준다.
      preload: path.join(__dirname, 'electron-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
    },
  });

  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'index.html'));

  // F11 전체화면, F5 새로고침만 열어둔다.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
    if (input.key === 'F5') {
      win.reload();
      event.preventDefault();
    }
  });

  return win;
}

// 설정창에서 해상도를 고르면 창 안쪽 크기를 그 해상도로 맞춘다. 화면보다 크면 최대화로 대신한다.
ipcMain.on('set-content-size', (event, width, height) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || !Number.isFinite(width) || !Number.isFinite(height)) return;
  const w = Math.round(Math.min(Math.max(width, 480), 7680));
  const h = Math.round(Math.min(Math.max(height, 270), 4320));
  if (win.isFullScreen()) win.setFullScreen(false);
  const area = screen.getDisplayMatching(win.getBounds()).workAreaSize;
  if (w > area.width || h > area.height) { win.maximize(); return; }
  if (win.isMaximized()) win.unmaximize();
  win.setContentSize(w, h);
  win.center();
});

app.whenReady().then(() => {
  createWindow();
  // 개발자도구는 Ctrl+Shift+I 로만 연다(게임 키와 겹치지 않게).
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.toggleDevTools();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
