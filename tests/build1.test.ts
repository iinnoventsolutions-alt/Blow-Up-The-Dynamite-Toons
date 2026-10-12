import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, makeScene, makePanel, movePanels, moveScene, newHistory, commit, undo, redo, allPanels, secondsText, secondsToFrames, panelAtFrame, panelStart, uid } from '../src/model.ts';
import { serializeProject, parseProject } from '../src/project-format.js';
import { readFileSync } from 'node:fs';
test('display and package build metadata remain synchronized without a version bump', () => {
  const info = JSON.parse(readFileSync(new URL('../src/build-info.json', import.meta.url), 'utf8'));
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
  assert.equal(info.name, 'Innovent Professional Storyboard');
  assert.match(info.build, /^\d{8}\.\d{4}$/); assert.equal(info.buildFormat, 'MMDDYYYY.HH24MI');
  assert.equal(pkg.issb.build, info.build); assert.equal(pkg.issb.version, info.version);
  assert.equal(pkg.version, `${info.version}.0.0`); assert.equal(lock.version, pkg.version);
});
function fixture() {
  const p = makeProject('Three scenes'); p.scenes = [1, 2, 3].map(n => { const s = makeScene(`Scene ${n}`); s.panels = [1, 2, 3].map(k => makePanel(`Panel ${k}`)); return s; });
  return p;
}
test('the requested two-destination batch move preserves panel identity and contents', () => {
  const p = fixture(), [a, b, c] = p.scenes, p2 = a.panels[1], p3 = a.panels[2]; p3.dialogue = 'Keep dialogue'; p3.layers[0].locked = true;
  const original = serializeProject(p);
  const moved = movePanels(p, [{ panelId: p3.id, sceneId: b.id, beforePanelId: b.panels[1].id }, { panelId: p2.id, sceneId: c.id, beforePanelId: null }]);
  assert.deepEqual(moved.scenes[0].panels.map(x => x.id), [a.panels[0].id]);
  assert.deepEqual(moved.scenes[1].panels.map(x => x.id), [b.panels[0].id, p3.id, b.panels[1].id, b.panels[2].id]);
  assert.equal(moved.scenes[2].panels.at(-1)!.id, p2.id);
  assert.deepEqual(moved.scenes[1].panels[1], p3); assert.equal(serializeProject(p), original);
});
test('multi-panel insertion preserves original order and is one undo step', () => {
  const p = fixture(), [a, b] = p.scenes;
  const moved = movePanels(p, a.panels.map(panel => ({ panelId: panel.id, sceneId: b.id, beforePanelId: b.panels[1].id })));
  assert.deepEqual(moved.scenes[1].panels.map(p => p.id), [b.panels[0].id, ...a.panels.map(p => p.id), b.panels[1].id, b.panels[2].id]);
  assert.equal(moved.scenes[0].panels.length, 0); assert.doesNotThrow(() => parseProject(serializeProject(moved)));
  const h = commit(newHistory(p), moved); assert.equal(h.past.length, 1); assert.deepEqual(undo(h).present, p); assert.deepEqual(redo(undo(h)).present, moved);
});
test('insertion anchors avoid the old off-by-one downward-reorder behavior', () => {
  const p = fixture(), s = p.scenes[0];
  const moved = movePanels(p, [{ panelId: s.panels[0].id, sceneId: s.id, beforePanelId: s.panels[2].id }]);
  assert.deepEqual(moved.scenes[0].panels.map(p => p.id), [s.panels[1].id, s.panels[0].id, s.panels[2].id]);
});
test('moves do not silently retime scene camera keys; whole-scene reordering preserves them', () => {
  const p = fixture(), [a, b] = p.scenes;
  a.camera = [{ id: uid(), frame: 0, x: 960, y: 540, zoom: 1, rotation: 0, interpolation: 'linear' }];
  assert.throws(() => movePanels(p, [{ panelId: a.panels[0].id, sceneId: b.id, beforePanelId: null }]), /camera-keyed/);
  assert.throws(() => movePanels(p, [{ panelId: b.panels[0].id, sceneId: a.id, beforePanelId: null }]), /camera-keyed/);
  const moved = moveScene(p, a.id, null); assert.deepEqual(moved.scenes.at(-1), a);
});
test('invalid and ambiguous move plans reject atomically', () => {
  const p = fixture(), [a, b] = p.scenes; const before = serializeProject(p);
  assert.throws(() => movePanels(p, [{ panelId: a.panels[0].id, sceneId: b.id, beforePanelId: null }, { panelId: a.panels[0].id, sceneId: b.id, beforePanelId: null }]), /once/);
  assert.throws(() => movePanels(p, [{ panelId: a.panels[0].id, sceneId: 'missing', beforePanelId: null }]), /no longer/);
  assert.throws(() => movePanels(p, [{ panelId: a.panels[0].id, sceneId: a.id, beforePanelId: a.panels[0].id }]), /anchor/);
  assert.equal(serializeProject(p), before);
});
test('time editing snaps to frames with safe decimal round trips', () => {
  for (const fps of [12, 24, 25, 30, 48, 50, 60]) for (const frames of [1, 2, 8, 120, 237, 360000]) assert.equal(secondsToFrames(Number(secondsText(frames, fps)), fps), frames);
  assert.equal(secondsToFrames(2.51, 24), 60); assert.throws(() => secondsToFrames(0, 24)); assert.throws(() => secondsToFrames(NaN, 24));
});
test('playback lookup and seeking handle empty scenes and exact panel boundaries', () => {
  const p = fixture(); p.scenes[0].panels = [];
  const entries = allPanels(p); assert.equal(panelAtFrame(p, 0).panel.id, entries[0].panel.id);
  assert.equal(panelAtFrame(p, 120).panel.id, entries[1].panel.id);
  assert.equal(panelStart(p, entries[1].panel.id), 120);
  assert.equal(panelAtFrame(p, 999999).panel.id, entries.at(-1)!.panel.id);
  const invalid = structuredClone(p); for (const s of invalid.scenes) s.panels = [];
  assert.throws(() => serializeProject(invalid), /at least one panel/);
});
