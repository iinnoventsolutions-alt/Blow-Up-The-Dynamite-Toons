const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
async function atomicWrite(filePath, text) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temp = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${crypto.randomUUID()}.tmp`);
  let handle;
  try {
    handle = await fs.open(temp, 'wx', 0o600); await handle.writeFile(text, 'utf8'); await handle.sync(); await handle.close(); handle = undefined;
    await fs.rename(temp, filePath);
  } finally { if (handle) await handle.close(); await fs.rm(temp, { force: true }); }
}
async function readProject(filePath) {
  const { parseProject, MAX_PROJECT_BYTES } = await import('../src/project-format.js');
  const info = await fs.stat(filePath); if (info.size > MAX_PROJECT_BYTES) throw new Error('Project exceeds the 128 MB limit.');
  const text = await fs.readFile(filePath, 'utf8'); parseProject(text); return text;
}
module.exports = { atomicWrite, readProject };
