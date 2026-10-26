const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const crypto = require('node:crypto');
const { atomicWrite, readProject } = require('./persistence.cjs');
const { windowIsUsable, sendToWindow, closeWindow } = require('./window-lifecycle.cjs');
const { assertTrustedSender } = require('./ipc-security.cjs');
const metadata = require('../src/build-info.json');
const previousDataDirectory = app.getPath('userData');
// Preserve packaged recovery/preferences across the display-name correction.
const stableDataDirectory = path.basename(previousDataDirectory) === metadata.name
  ? path.join(app.getPath('appData'), 'Innovent Professional Storyboard') : previousDataDirectory;
app.setName(metadata.name);
app.setPath('userData', stableDataDirectory);
app.setAboutPanelOptions({ applicationName: metadata.name, applicationVersion: `Version ${metadata.version}`, version: `Build ${metadata.build}` });
let win, currentPath = null, dirty = false, closePrompt = false, quitRequested = false, pendingAction = null, recentFiles = [], saveQueue = Promise.resolve();
const pagePath = path.join(__dirname, '../dist/index.html');
const pageURL = pathToFileURL(pagePath).href;
const dataPath = (name) => path.join(app.getPath('userData'), name);
function trusted(event) { assertTrustedSender(event, win, pageURL, windowIsUsable); }
function handle(channel, fn) { ipcMain.handle(channel, async (event, ...args) => { trusted(event); try { return { ok: true, value: await fn(...args) }; } catch (error) { return { ok: false, error: error.message || 'Operation failed.' }; } }); }
const queued = (fn) => { const result = saveQueue.then(fn); saveQueue = result.catch(() => {}); return result; };
async function remember(filePath) {
  const existing = recentFiles.find(f => f.path === filePath);
  recentFiles = [{ id: existing?.id || crypto.randomUUID(), path: filePath, name: path.basename(filePath) }, ...recentFiles.filter(f => f.path !== filePath)].slice(0, 12);
  await atomicWrite(dataPath('recent.json'), JSON.stringify(recentFiles));
}
async function openPath(filePath) { const text = await readProject(filePath); currentPath = filePath; await remember(filePath); return { text, name: path.basename(filePath) }; }
app.whenReady().then(async () => {
  try { const list = JSON.parse(await fs.readFile(dataPath('recent.json'), 'utf8')); if (Array.isArray(list)) recentFiles = list.filter(f => typeof f.id === 'string' && typeof f.path === 'string' && typeof f.name === 'string').slice(0, 12); } catch {}
  handle('project:recent', () => recentFiles.map(({ id, name }) => ({ id, name })));
  handle('project:open-recent', async (id) => { const entry = recentFiles.find(f => f.id === id); if (!entry) throw new Error('Recent project is unavailable.'); return queued(() => openPath(entry.path)); });
  handle('project:open', async () => {
    const result = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: metadata.name, extensions: ['issb', 'innovent'] }] });
    if (result.canceled) return null;
    return queued(() => openPath(result.filePaths[0]));
  });
  handle('export:pdf', (data, name, openAfter) => queued(() => require('./pdf-export.cjs').exportPdf(data, name, openAfter, { dialog, shell, win })));
  handle('project:new', () => queued(async () => { currentPath = null; }));
  handle('project:save', (text, saveAs) => queued(async () => {
    const { parseProject } = await import('../src/project-format.js'); const project = parseProject(text);
    let destination = currentPath;
    if (!destination || saveAs === true || path.extname(destination).toLowerCase() !== '.issb') {
      const result = await dialog.showSaveDialog(win, { defaultPath: destination ? destination.replace(/\.[^.]+$/, '.issb') : `${project.title.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 100) || 'Storyboard'}.issb`, filters: [{ name: metadata.name, extensions: ['issb'] }] });
      if (result.canceled) return null; destination = result.filePath;
      if (!destination.toLowerCase().endsWith('.issb')) destination += '.issb';
    }
    await atomicWrite(destination, text); currentPath = destination; await remember(destination);
    return { name: path.basename(destination) };
  }));
  handle('project:snapshot', (text) => queued(async () => { const { parseProject } = await import('../src/project-format.js'); parseProject(text); await atomicWrite(dataPath('recovery.innovent'), text); }));
  handle('project:recovery', async () => { try { const text = await readProject(dataPath('recovery.innovent')); return { title: JSON.parse(text).title }; } catch { return null; } });
  handle('project:recover', () => queued(async () => { const text = await readProject(dataPath('recovery.innovent')); currentPath = null; return { text, name: 'Recovered project — save a copy' }; }));
  handle('project:discard-recovery', () => queued(() => fs.rm(dataPath('recovery.innovent'), { force: true })));
  ipcMain.on('project:dirty', (event, value) => { trusted(event); if (typeof value === 'boolean') dirty = value; });
  ipcMain.on('project:close-after-save', (event) => { trusted(event); if (!dirty) closeWindow(win); });
  ipcMain.on('project:cancel-close', (event) => { trusted(event); quitRequested = false; });
  ipcMain.on('app:renderer-ready', (event) => { trusted(event); if (pendingAction) { const name = pendingAction; pendingAction = null; sendToWindow(win, 'app:action', name); } });
  const action = (name) => () => {
    if (windowIsUsable(win)) { sendToWindow(win, 'app:action', name); return; }
    pendingAction = name;
    createWindow();
  };
  const requestQuit = () => { quitRequested = true; if (windowIsUsable(win)) closeWindow(win); else app.quit(); };
  const menus = [];
  if (process.platform === 'darwin') menus.push({ label: metadata.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { type: 'separator' }, { label: 'Quit', accelerator: 'Cmd+Q', click: requestQuit }] });
  menus.push({ label: 'File', submenu: [{ label: 'New Project', accelerator: 'CmdOrCtrl+N', click: action('new') }, { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: action('open') }, { type: 'separator' }, { label: 'Save', accelerator: 'CmdOrCtrl+S', click: action('save') }, { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: action('save-as') }, { type: 'separator' }, { label: 'Export PDF…', click: action('export-pdf') }, { type: 'separator' }, { label: 'Close', click: () => closeWindow(win) }] });
  menus.push({ label: 'Edit', submenu: [{ label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: action('undo') }, { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: action('redo') }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }, { type: 'separator' }, { label: 'Preferences…', click: action('preferences') }] });
  menus.push({ label: 'View', submenu: [{ role: 'togglefullscreen' }, { type: 'separator' }, { label: 'Performance Diagnostics', accelerator: 'CmdOrCtrl+Shift+I', click: action('performance-diagnostics') }] });
  Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
  function createWindow() {
    win = new BrowserWindow({ width: 1500, height: 1000, minWidth: 1100, minHeight: 740, backgroundColor: '#101821', title: metadata.name, icon: path.join(__dirname, '../dist/innovent-icon.png'), webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event) => event.preventDefault());
    win.loadFile(pagePath);
    const thisWindow = win;
    thisWindow.on('closed', () => {
      if (win === thisWindow) win = null;
      closePrompt = false;
      if (quitRequested) app.quit();
    });
    thisWindow.on('close', (event) => {
      if (!dirty) return;
      event.preventDefault();
      if (closePrompt) return;
      closePrompt = true;
      void (async () => {
        try {
          const result = await dialog.showMessageBox(thisWindow, { type: 'question', message: 'Save changes before closing?', detail: 'Your project has unsaved changes.', buttons: ['Save', 'Discard', 'Cancel'], defaultId: 0, cancelId: 2 });
          if (win !== thisWindow || !windowIsUsable(thisWindow)) return;
          if (result.response === 2) quitRequested = false;
          if (result.response === 0) sendToWindow(thisWindow, 'app:action', 'save-and-close');
          if (result.response === 1) {
            await queued(() => fs.rm(dataPath('recovery.innovent'), { force: true }));
            if (win !== thisWindow || !windowIsUsable(thisWindow)) return;
            dirty = false;
            closeWindow(thisWindow);
          }
        } catch (error) {
          quitRequested = false;
          if (windowIsUsable(thisWindow)) dialog.showErrorBox('Unable to close project', error.message || String(error));
        } finally {
          closePrompt = false;
        }
      })();
    });
  }
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) { currentPath = null; dirty = false; createWindow(); } });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
