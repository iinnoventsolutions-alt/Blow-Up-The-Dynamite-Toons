import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { cameraAt, changeDuration, commit, duplicatePanel, editProject, makeLayer, makePanel, makeProject, newHistory, redo, undo, uid } from '../src/model.ts';
import { parseProject, serializeProject } from '../src/project-format.js';
const require = createRequire(import.meta.url);
const { atomicWrite, readProject } = require('../desktop/persistence.cjs');

test('round trip preserves layers, drawing, metadata, and multiple panels', () => {
  const p = makeProject('Round trip', 1080, 1920, 30, 'Vertical test');
  const panel = p.scenes[0].panels[0];
  panel.layers.push(makeLayer('Ink')); panel.dialogue = 'A new beginning';
  panel.layers[0].visible = false; panel.layers[1].locked = true;
  panel.layers[1].strokes.push({ id: uid(), tool: 'brush', color: '#123456', size: 5, points: [[20, 30, 0.4], [40, 60, 0.8]] });
  p.scenes[0].panels.push(makePanel('Next', p.fps));
  assert.deepEqual(parseProject(serializeProject(p)), p);
});
test('undo/redo restores layer visibility and strokes, with redo invalidation after editing', () => {
  let h = newHistory(makeProject());
  h = commit(h, editProject(h.present, p => { p.scenes[0].panels[0].layers[0].visible = false; }));
  assert.equal(h.present.scenes[0].panels[0].layers[0].visible, false);
  const back = undo(h); assert.equal(back.present.scenes[0].panels[0].layers[0].visible, true);
  assert.deepEqual(redo(back).present, h.present);
  const branch = commit(back, editProject(back.present, p => { p.title = 'Branch'; }));
  assert.equal(branch.future.length, 0);
});
test('panel duplication creates fresh IDs at every editable level', () => {
  const p = makeProject(); const panel = p.scenes[0].panels[0];
  panel.layers[0].strokes.push({ id: uid(), tool: 'eraser', color: '#000000', size: 20, points: [[1, 2, 1]] });
  const copy = duplicatePanel(panel);
  assert.notEqual(copy.id, panel.id); assert.notEqual(copy.layers[0].id, panel.layers[0].id);
  assert.notEqual(copy.layers[0].strokes[0].id, panel.layers[0].strokes[0].id);
  p.scenes[0].panels.push(copy); assert.doesNotThrow(() => serializeProject(p));
});
test('scene camera interpolation spans a panel boundary, and duration edits retime downstream keys', () => {
  const p = makeProject(); const s = p.scenes[0]; s.panels.push(makePanel());
  s.camera = [{ id: uid(), frame: 0, x: 0, y: 0, zoom: 1, rotation: 0, interpolation: 'linear' }, { id: uid(), frame: 239, x: 239, y: 100, zoom: 2, rotation: 10, interpolation: 'linear' }];
  assert.equal(cameraAt(s, 120, p).x, 120);
  changeDuration(s, s.panels[0], 1);
  assert.equal(s.panels[0].duration, 1); assert.equal(s.camera[1].frame, 120);
  assert.doesNotThrow(()=>serializeProject(p));
});
test('invalid/future documents, duplicate IDs and injected image URLs are rejected', () => {
  const p = makeProject(); assert.throws(() => parseProject('{bad'), /valid JSON/);
  assert.throws(() => parseProject(JSON.stringify({ ...p, schemaVersion: 2 })), /Unsupported/);
  const invalid = structuredClone(p); invalid.scenes[0].panels[0].id = invalid.id;
  assert.throws(() => serializeProject(invalid), /duplicate/);
  const image = structuredClone(p); image.scenes[0].panels[0].layers[0].image = 'https://example.com/remote.png';
  assert.throws(() => serializeProject(image), /embedded image/);
  const timing = structuredClone(p); timing.scenes[0].panels[0].duration = 1.5;
  assert.throws(() => serializeProject(timing), /number/);
});
test('atomic save replaces an existing file and preserves it after a rejected open', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'innovent-test-'));
  try {
    const file = join(directory, 'project.innovent'); const p = makeProject('Original');
    await atomicWrite(file, serializeProject(p)); assert.equal(JSON.parse(await readProject(file)).title, 'Original');
    p.title = 'Updated'; await atomicWrite(file, serializeProject(p)); assert.equal(JSON.parse(await readProject(file)).title, 'Updated');
    const bad = join(directory, 'bad.innovent'); await atomicWrite(bad, '{"schemaVersion":99}'); await assert.rejects(readProject(bad));
    assert.equal(JSON.parse(await readFile(file, 'utf8')).title, 'Updated');
    assert.deepEqual((await readdir(directory)).sort(), ['bad.innovent', 'project.innovent']);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
