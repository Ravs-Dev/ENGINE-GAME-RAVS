const { app, BrowserWindow, Menu, dialog, session, ipcMain, shell } = require('electron');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);

app.setName('RAVS Engine 3D');
app.setAppUserModelId('com.ravs.engine');
const { ProjectStore } = require('./project-store.cjs');
const projectStore = new ProjectStore();
let window;
function createWindow() {
  window = new BrowserWindow({
    width: 1440, height: 960, minWidth: 960, minHeight: 640,
    title: 'Ravs Engine 3D', icon: path.join(__dirname, '..', 'assets', 'ravs-logo.png'), backgroundColor: '#000000', show: false,
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
  const handler = (name, action) => ipcMain.handle(name, async (event, ...args) => {
    if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) return { ok: false, error: 'Permintaan tidak diizinkan.' };
    try { return { ok: true, data: await action(...args) }; } catch (error) { return { ok: false, error: error.message }; }
  });
  handler('project:select', async () => {
    const result = await dialog.showOpenDialog(window, { title: 'Pilih atau buat folder proyek Ravs', properties: ['openDirectory', 'createDirectory'] });
    return result.canceled ? null : projectStore.select(result.filePaths[0]);
  });
  handler('project:list', () => projectStore.list());
  handler('project:read', relative => projectStore.read(relative));
  handler('project:create', (relative, type, content) => projectStore.create(relative, type, content));
  handler('project:write', (relative, content, revision) => projectStore.write(relative, content, revision));
  handler('external:open', async raw => {
    const url = new URL(String(raw));
    const allowed = new Set(['github.com','developer.android.com','visualstudio.microsoft.com','dotnet.microsoft.com','adoptium.net']);
    if (url.protocol !== 'https:' || !allowed.has(url.hostname)) throw Error('Link eksternal tidak diizinkan.');
    await shell.openExternal(url.toString());
    return true;
  });
  handler('toolchains:scan', async () => {
    const specs = [
      { language:'lua', commands:[['lua',['-v']]] },
      { language:'c', commands: process.platform === 'win32' ? [['clang',['--version']],['gcc',['--version']],['cl',[]]] : [['clang',['--version']],['gcc',['--version']]] },
      { language:'cpp', commands: process.platform === 'win32' ? [['clang++',['--version']],['g++',['--version']],['cl',[]]] : [['clang++',['--version']],['g++',['--version']]] },
      { language:'csharp', commands:[['dotnet',['--version']]] },
      { language:'java', commands:[['java',['-version']]] }
    ];
    const results=[];
    for (const spec of specs) {
      let found=null;
      for (const [cmd,args] of spec.commands) {
        try {
          const { stdout='', stderr='' } = await execFileAsync(cmd,args,{timeout:2500,windowsHide:true});
          found={command:cmd,version:(stdout||stderr).split(/\r?\n/).filter(Boolean)[0]?.slice(0,160)||cmd}; break;
        } catch { }
      }
      results.push({language:spec.language,available:!!found,command:found?.command??null,version:found?.version??null});
    }
    return results;
  });

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
