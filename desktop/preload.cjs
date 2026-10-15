const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  exportPdf: (data, name, openAfter) => ipcRenderer.invoke('export:pdf', data, name, openAfter),
  save: (text, saveAs) => ipcRenderer.invoke('project:save', text, saveAs),
  open: () => ipcRenderer.invoke('project:open'),
  recent: () => ipcRenderer.invoke('project:recent'),
  openRecent: (id) => ipcRenderer.invoke('project:open-recent', id),
  newProject: () => ipcRenderer.invoke('project:new'),
  recovery: () => ipcRenderer.invoke('project:recovery'),
  recover: () => ipcRenderer.invoke('project:recover'),
  discardRecovery: () => ipcRenderer.invoke('project:discard-recovery'),
  snapshot: (text) => ipcRenderer.invoke('project:snapshot', text),
  setDirty: (dirty) => ipcRenderer.send('project:dirty', dirty),
  closeAfterSave: () => ipcRenderer.send('project:close-after-save'),
  onAction: (callback) => { const handler = (_, action) => callback(action); ipcRenderer.on('app:action', handler); return () => ipcRenderer.removeListener('app:action', handler); }
});
