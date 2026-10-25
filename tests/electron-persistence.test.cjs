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

test('SA-3 rejects directories as project files', async t => {
 const dir = await temporaryDirectory(t);
 await assert.rejects(readProject(dir), /regular file/);
});

test('SA-3 rejects an oversized project before reading its contents', async t => {
 const dir = await temporaryDirectory(t);
 const file = path.join(dir, 'oversized.issb');
 const { MAX_PROJECT_BYTES } = await import('../src/project-format.js');
 const handle = await fs.open(file, 'w');
 try { await handle.truncate(MAX_PROJECT_BYTES + 1); } finally { await handle.close(); }
 await assert.rejects(readProject(file), /128 MB limit/);
});

test('SA-3 rejects malformed project JSON without changing the source file', async t => {
 const dir = await temporaryDirectory(t);
 const file = path.join(dir, 'malformed.issb');
 const invalid = '{"format":"innovent-storyboard",';
 await fs.writeFile(file, invalid);
 await assert.rejects(readProject(file), /not valid JSON/);
 assert.equal(await fs.readFile(file, 'utf8'), invalid);
});
