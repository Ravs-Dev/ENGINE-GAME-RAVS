const { app, BrowserWindow, Menu, dialog, session } = require('electron');
const path = require('node:path');

app.setName('RAVS Engine 3D');
app.setAppUserModelId('com.ravs.engine');
let window;
function createWindow() {
  window = new BrowserWindow({
    width: 1440, height: 960, minWidth: 960, minHeight: 640,
    title: 'RAVS Engine 3D', backgroundColor: '#11131b', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.loadFile(path.join(__dirname, '..', 'index.html'));
  window.webContents.on('will-prevent-unload', event => {
    const choice = dialog.showMessageBoxSync(window, {
      type: 'question', buttons: ['Tetap di editor', 'Tutup tanpa menyimpan'], defaultId: 0, cancelId: 0,
      message: 'Scene memiliki perubahan yang belum disimpan.'
    });
    if (choice === 1) event.preventDefault();
  });
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
    { label: 'File', submenu: [{ label: 'Simpan Scene', accelerator: 'CmdOrCtrl+S', click: () => window?.webContents.send('editor:command', 'save') }, { label: 'Keluar', role: 'quit' }] },
    { label: 'Edit', submenu: [{ label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => window?.webContents.send('editor:command', 'undo') }, { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => window?.webContents.send('editor:command', 'redo') }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
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
