const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { atomicWrite, readProject } = require('../desktop/persistence.cjs');

async function temporaryDirectory(t) {
 const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'iinnovent-persistence-'));
 t.after(() => fs.rm(dir, { recursive: true, force: true }));
 return dir;
}

test('atomic save writes full content and leaves no temporary files', async t => {
 const dir = await temporaryDirectory(t);
 const dest = path.join(dir, 'projects', 'draft.issb');
 await atomicWrite(dest, 'first version');
 await atomicWrite(dest, 'second version');
 assert.equal(await fs.readFile(dest, 'utf8'), 'second version');
 assert.deepEqual(await fs.readdir(path.dirname(dest)), ['draft.issb']);
});

test('concurrent atomic writes never mix partial project contents', async t => {
 const dir = await temporaryDirectory(t);
 const dest = path.join(dir, 'recovery.innovent');
 const values = Array.from({length:8}, (_,i) => String(i).repeat(16384));
 await Promise.all(values.map(value => atomicWrite(dest, value)));
 assert.ok(values.includes(await fs.readFile(dest, 'utf8')));
 assert.deepEqual(await fs.readdir(dir), ['recovery.innovent']);
});

test('unwritable destination does not destroy a previous valid save or strand temporary files', async t => {
 const dir = await temporaryDirectory(t);
 const destination = path.join(dir, 'project.issb');
 await atomicWrite(destination, 'preserve existing content');
 const originalRename = fs.rename;
 // Simulate an interrupted rename without changing filesystem privileges.
 fs.rename = async () => { throw new Error('simulated rename failure'); };
 try {
  await assert.rejects(atomicWrite(destination, 'replacement'), /simulated rename failure/);
 } finally { fs.rename = originalRename; }
 assert.equal(await fs.readFile(destination, 'utf8'), 'preserve existing content');
 assert.deepEqual(await fs.readdir(dir), ['project.issb']);
});

test('invalid recovery file is rejected rather than opened as a project', async t => {
 const dir = await temporaryDirectory(t);
 const destination = path.join(dir, 'recovery.innovent');
 await atomicWrite(destination, '{\"not\":\"a valid storyboard\"}');
 await assert.rejects(readProject(destination));
});
