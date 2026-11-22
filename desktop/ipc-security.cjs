'use strict';
// SA-2: Keep the IPC sender boundary independent of individual handlers.
function assertTrustedSender(event, win, pageURL, windowIsUsable) {
  if (!windowIsUsable(win) || !event || event.sender !== win.webContents ||
      event.senderFrame !== win.webContents.mainFrame ||
      event.senderFrame?.url !== pageURL) {
    throw new Error('Unauthorized application request.');
  }
}
module.exports = { assertTrustedSender };
