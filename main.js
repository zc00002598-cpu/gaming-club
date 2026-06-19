/**
 * 游戏陪玩俱乐部 · Electron 主进程
 */
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

// 允许 Firebase WebSocket 正常连接
app.commandLine.appendSwitch('disable-web-security', 'false');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: '游戏陪玩俱乐部 · 管理系统',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#0a0a0f',
    show: false,   // 先隐藏，加载完成后再显示（避免白屏闪烁）
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      // 允许 file:// 中访问网络（Firebase SDK 需要）
      allowRunningInsecureContent: false,
    },
  });

  // 加载 index.html
  mainWindow.loadFile('index.html');

  // 页面加载完成后显示窗口（无闪烁体验）
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // 外部链接用默认浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// 自定义菜单（简化）
function buildMenu() {
  const template = [
    {
      label: '应用',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { type: 'separator' },
        { label: '退出', role: 'quit' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '全屏', role: 'togglefullscreen' },
        { label: '开发者工具', role: 'toggleDevTools' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
