'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const desktop = (name) => fs.readFileSync(path.join(__dirname, '..', 'desktop', name), 'utf8');

test('SA-2 preload exposes only fixed, named IPC channels', () => {
  const source = desktop('preload.cjs');
  const channels = [...source.matchAll(/ipcRenderer\.(?:invoke|send)\('([^']+)'/g)].map(match => match[1]);
  assert.equal(channels.length, 14);
  assert.equal(new Set(channels).size, channels.length);
  assert.doesNotMatch(source, /ipcRenderer\.(?:invoke|send)\(\s*[a-zA-Z_$]/);
  assert.doesNotMatch(source, /exposeInMainWorld\([^,]+,\s*ipcRenderer/);
});

test('SA-2 all privileged main-process IPC handlers pass sender authorization', () => {
  const source = desktop('main.cjs');
  assert.match(source, /function handle\(channel, fn\).*trusted\(event\)/);
  const direct = [...source.matchAll(/ipcMain\.on\('([^']+)',\s*\(event[^)]*\)\s*=>\s*\{([^}]+)\}/g)];
  assert.equal(direct.length, 4);
  for (const [, channel, body] of direct) {
    assert.match(body, /trusted\(event\)/, channel);
  }
});

test('SA-2 PDF export rejects non-PDF and oversized input before save dialog', () => {
  const source = desktop('pdf-export.cjs');
  assert.match(source, /data instanceof ArrayBuffer/);
  assert.match(source, /128 \* 1024 \* 1024/);
  assert.match(source, /%PDF-/);
  assert.ok(source.indexOf("'%PDF-'") < source.indexOf('dialog.showSaveDialog'));
});

test('SA-2 project save and snapshot validate project format before writing', () => {
  const source = desktop('main.cjs');
  assert.match(source, /handle\('project:save',[\s\S]*?parseProject\(text\)/);
  assert.match(source, /handle\('project:snapshot',[^\n]*parseProject\(text\)/);
  const persistence = desktop('persistence.cjs');
  assert.match(persistence, /fs\.open\(temp, 'wx', 0o600\)/);
  assert.match(persistence, /parseProject\(text\)/);
});
