// LGA Study Explorer: desktop shell for the office screen.
// Opens the app full screen. Press F11 to leave full screen, Ctrl+Q to quit.
// Start in locked kiosk mode with:  npm start -- --kiosk
const { app, BrowserWindow, shell, Menu, globalShortcut } = require('electron');
const path = require('path');

const KIOSK = process.argv.includes('--kiosk');

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    kiosk: KIOSK,
    backgroundColor: '#0B1F3A',
    autoHideMenuBar: true,
    title: 'LGA Study Explorer',
    icon: path.join(__dirname, 'img', 'logo.png'),
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'index.html'), { hash: 'welcome' });

  // Links to outside websites open in the normal browser, never inside the screen app.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url); }
  });
  globalShortcut.register('F11', () => { if (!KIOSK) win.setFullScreen(!win.isFullScreen()); });
  globalShortcut.register('CommandOrControl+Q', () => app.quit());
}

app.whenReady().then(createWindow);
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
