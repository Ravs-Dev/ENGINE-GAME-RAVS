const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ravsDesktop', {
  onCommand(callback) {
    ipcRenderer.on('editor:command', (_event, command) => {
      if (['undo', 'redo', 'save'].includes(command)) callback(command);
    });
  }
});
