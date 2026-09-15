// 게임(렌더러)에 창 크기 조절 하나만 열어준다. Node API는 여전히 막아둔다.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  setContentSize: (width, height) => ipcRenderer.send('set-content-size', Number(width), Number(height)),
});
