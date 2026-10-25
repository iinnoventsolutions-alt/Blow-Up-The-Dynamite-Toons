const test = require('node:test');
const assert = require('node:assert/strict');
const { assertTrustedSender } = require('../desktop/ipc-security.cjs');
const pageURL = 'file:///app/dist/index.html';
const mainFrame = { url: pageURL };
const webContents = { mainFrame };
const win = { webContents };
const usable = () => true;
const check = event => assertTrustedSender(event, win, pageURL, usable);
test('SA-2 accepts the exact application main frame', () => {
  assert.doesNotThrow(() => check({ sender: webContents, senderFrame: mainFrame }));
});
test('SA-2 rejects missing or destroyed windows', () => {
  assert.throws(() => assertTrustedSender({ sender: webContents, senderFrame: mainFrame }, null, pageURL, () => false), /Unauthorized/);
  assert.throws(() => assertTrustedSender({ sender: webContents, senderFrame: mainFrame }, win, pageURL, () => false), /Unauthorized/);
});
test('SA-2 rejects forged, missing, and foreign senders', () => {
  for (const event of [null, {}, { sender: {} }, { sender: {}, senderFrame: mainFrame }, { sender: webContents }]) {
    assert.throws(() => check(event), /Unauthorized/);
  }
});
test('SA-2 rejects child frames and navigated main frames', () => {
  assert.throws(() => check({ sender: webContents, senderFrame: { url: pageURL } }), /Unauthorized/);
  const original = mainFrame.url;
  try {
    mainFrame.url = 'https://attacker.example/';
    assert.throws(() => check({ sender: webContents, senderFrame: mainFrame }), /Unauthorized/);
  } finally { mainFrame.url = original; }
});
