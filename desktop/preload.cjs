const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  // Exposed bridge is inert until main registers trusted, developer-gated handlers.
  isolatedExport: Object.freeze({
    onAvailability: callback => {
      if (typeof callback !== 'function') throw new TypeError('Export availability callback required');
      const listener = (_event, enabled) => callback(enabled === true);
      ipcRenderer.on('isolated-export:available', listener);
      return () => ipcRenderer.removeListener('isolated-export:available', listener);
    },
    start: request => ipcRenderer.invoke('isolated-export:start', request),
    progress: id => ipcRenderer.invoke('isolated-export:progress', id),
    cancel: id => ipcRenderer.invoke('isolated-export:cancel', id),
    onRequest: callback => {
      if (typeof callback !== 'function') throw new TypeError('Export callback required');
      const listener = (_event, request) => callback(request);
      ipcRenderer.on('isolated-export:browser-request', listener);
      return () => ipcRenderer.removeListener('isolated-export:browser-request', listener);
    },
    reply: message => ipcRenderer.send('isolated-export:browser-reply', message),
    onComplete: callback => {
      if (typeof callback !== 'function') throw new TypeError('Export callback required');
      const listener = (_event, result) => callback(result);
      ipcRenderer.on('isolated-export:complete', listener);
      return () => ipcRenderer.removeListener('isolated-export:complete', listener);
    }
  }),
  exportPdf: (data, name, openAfter) => ipcRenderer.invoke('export:pdf', data, name, openAfter),
  save: (text, saveAs) => ipcRenderer.invoke('project:save', text, saveAs),
  open: () => ipcRenderer.invoke('project:open'),
  recent: () => ipcRenderer.invoke('project:recent'),
  clearRecent: () => ipcRenderer.invoke('project:clear-recent'),
  openRecent: (id) => ipcRenderer.invoke('project:open-recent', id),
  newProject: () => ipcRenderer.invoke('project:new'),
  recovery: () => ipcRenderer.invoke('project:recovery'),
  recover: () => ipcRenderer.invoke('project:recover'),
  discardRecovery: () => ipcRenderer.invoke('project:discard-recovery'),
  snapshot: (text) => ipcRenderer.invoke('project:snapshot', text),
  setDirty: (dirty) => ipcRenderer.send('project:dirty', dirty),
  closeAfterSave: () => ipcRenderer.send('project:close-after-save'),
  cancelClose: () => ipcRenderer.send('project:cancel-close'),
  rendererReady: () => ipcRenderer.send('app:renderer-ready'),
  onAction: (callback) => { const handler = (_, action) => callback(action); ipcRenderer.on('app:action', handler); return () => ipcRenderer.removeListener('app:action', handler); }
});
