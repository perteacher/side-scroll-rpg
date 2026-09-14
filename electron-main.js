// 데스크톱 실행용 진입점. 게임 자체는 브라우저판과 완전히 같은 파일을 그대로 띄운다.
const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
const path = require('path');

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

function createWindow() {
  const win = new BrowserWindow({
    width: GAME_WIDTH + 16,
    height: GAME_HEIGHT + 39,
    useContentSize: true,
    resizable: true,
    backgroundColor: '#000000',
    title: '사이드스크롤 RPG',
    autoHideMenuBar: true,
    webPreferences: {
      // 게임은 Node API를 쓰지 않는다. 렌더러를 격리해 둔다.
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
