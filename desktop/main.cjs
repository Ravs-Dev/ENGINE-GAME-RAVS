const { app, BrowserWindow, Menu, dialog, session } = require('electron');
const path = require('node:path');

app.setName('RAVS Engine 3D');
app.setAppUserModelId('com.ravs.engine');
let window;
function createWindow() {
  window = new BrowserWindow({
    width: 1440, height: 960, minWidth: 960, minHeight: 640,
    title: 'RAVS Engine 3D', backgroundColor: '#11131b', show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.loadFile(path.join(__dirname, '..', 'index.html'));
  window.on('closed', () => { window = null; });
}
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({
      title: 'Ekspor scene RAVS 3D', defaultPath: path.join(app.getPath('documents'), item.getFilename()),
      filters: [{ name: 'RAVS 3D Scene', extensions: ['json'] }]
    });
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [{ label: 'Keluar', role: 'quit' }] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, ...(!app.isPackaged ? [{ role: 'toggleDevTools' }] : [])] },
    { label: 'Help', submenu: [{ label: 'Tentang RAVS Engine', click: () => dialog.showMessageBox(window, {
      type: 'info', title: 'RAVS Engine 3D', message: `RAVS Engine 3D ${app.getVersion()}`,
      detail: 'Editor game 3D desktop. Scene disimpan lokal; ekspor JSON untuk backup.'
    }) }] }
  ]));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
