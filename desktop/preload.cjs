const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ravsDesktop', {
  selectProject: () => ipcRenderer.invoke('project:select'),
  listFiles: () => ipcRenderer.invoke('project:list'),
  readFile: path => ipcRenderer.invoke('project:read', path),
  createEntry: (path, type, content) => ipcRenderer.invoke('project:create', path, type, content),
  writeFile: (path, content, revision) => ipcRenderer.invoke('project:write', path, content, revision),
  onCommand(callback) {
    ipcRenderer.on('editor:command', (_event, command) => {
      if (['undo', 'redo', 'save'].includes(command)) callback(command);
    });
  }
});
