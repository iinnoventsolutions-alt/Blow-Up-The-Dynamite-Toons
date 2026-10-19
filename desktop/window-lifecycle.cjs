// Window lifecycle guards for Electron callbacks that can outlive a BrowserWindow.
function windowIsUsable(window) {
  if (!window || window.isDestroyed() || !window.webContents || window.webContents.isDestroyed()) return false;
  return true;
}
function sendToWindow(window, channel, ...args) {
  if (!windowIsUsable(window)) return false;
  try {
    window.webContents.send(channel, ...args);
    return true;
  } catch (error) {
    // Electron can destroy webContents after the check but before the send.
    if (!windowIsUsable(window)) return false;
    throw error;
  }
}
function closeWindow(window) {
  if (!windowIsUsable(window)) return false;
  window.close();
  return true;
}
module.exports = { windowIsUsable, sendToWindow, closeWindow };
