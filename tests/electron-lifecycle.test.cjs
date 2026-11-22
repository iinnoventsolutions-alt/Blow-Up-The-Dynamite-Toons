const test = require('node:test');
const assert = require('node:assert/strict');
const { windowIsUsable, sendToWindow, closeWindow } = require('../desktop/window-lifecycle.cjs');
function fakeWindow() {
  const sends = [];
  let destroyed = false, contentsDestroyed = false, closed = 0;
  const window = {
    isDestroyed: () => destroyed,
    webContents: { isDestroyed: () => contentsDestroyed, send: (...args) => sends.push(args) },
    close: () => { closed++; }
  };
  return { window, sends, destroy: () => { destroyed = true; }, destroyContents: () => { contentsDestroyed = true; }, closed: () => closed };
}
test('active window receives actions and can close', () => {
  const f = fakeWindow();
  assert.equal(windowIsUsable(f.window), true);
  assert.equal(sendToWindow(f.window, 'app:action', 'save'), true);
  assert.deepEqual(f.sends, [['app:action', 'save']]);
  assert.equal(closeWindow(f.window), true);
  assert.equal(f.closed(), 1);
});
test('destroyed BrowserWindow cannot receive actions or close', () => {
  const f = fakeWindow(); f.destroy();
  assert.equal(windowIsUsable(f.window), false);
  assert.equal(sendToWindow(f.window, 'app:action', 'save'), false);
  assert.equal(closeWindow(f.window), false);
  assert.equal(f.closed(), 0);
});
test('destroyed webContents cannot receive actions or close', () => {
  const f = fakeWindow(); f.destroyContents();
  assert.equal(windowIsUsable(f.window), false);
  assert.equal(sendToWindow(f.window, 'app:action', 'save'), false);
  assert.equal(closeWindow(f.window), false);
});
test('destroyed contents between check and send do not crash', () => {
  const f = fakeWindow();
  f.window.webContents.send = () => { f.destroyContents(); throw new Error('Object has been destroyed'); };
  assert.equal(sendToWindow(f.window, 'app:action', 'save'), false);
});
test('unexpected send errors are not hidden', () => {
  const f = fakeWindow();
  f.window.webContents.send = () => { throw new Error('Unrelated failure'); };
  assert.throws(() => sendToWindow(f.window, 'app:action', 'save'), /Unrelated failure/);
});
test('null window after close is harmless', () => {
  assert.equal(sendToWindow(null, 'app:action', 'save'), false);
  assert.equal(closeWindow(null), false);
});
