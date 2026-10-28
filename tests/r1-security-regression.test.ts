import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, uid } from '../src/model.ts';
import { parseProject } from '../src/project-format.js';

test('R1.0 rejects malicious or malformed camera key data on import', () => {
 const baseline = makeProject();
 const check = (mutate, message) => {
  const project = structuredClone(baseline);
  project.scenes[0].camera = [{ id: uid(), frame: 0, x: 960, y: 540, zoom: 1, rotation: 0, interpolation: 'linear' }];
  mutate(project.scenes[0].camera[0], project);
  assert.throws(() => parseProject(JSON.stringify(project)), message);
 };
 check(key => { key.zoom = 0; }, /Invalid project number/);
 check(key => { key.zoom = 101; }, /Invalid project number/);
 check(key => { key.x = 20000; }, /Invalid project number/);
 check(key => { key.frame = 999999; }, /Invalid project number/);
 check(key => { key.frame = 0.5; }, /Invalid project number/);
 check(key => { key.interpolation = '<script>'; }, /Invalid camera interpolation/);
 check(key => { key.id = baseline.id; }, /duplicate object ID/);
 check((key, project) => { project.scenes[0].camera.push({ ...key, id: uid() }); }, /distinct frame times/);
});

test('R1.0 rejects remote or executable embedded artwork payloads', () => {
 const p = makeProject();
 const layer = p.scenes[0].panels[0].layers[0];
 for (const source of ['https://example.invalid/asset.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'javascript:alert(1)']) {
  layer.image = source;
  assert.throws(() => parseProject(JSON.stringify(p)), /Invalid embedded image/);
 }
});
