#!/usr/bin/env node
// RI2.15.5-B: audit a local, already-extracted private FFmpeg runtime.
// Usage: node scripts/ri2-audit-private-runtime.mjs /absolute/path/to/runtime
// Does not create installers, distribute artifacts, or authorize release.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = process.argv[2];
if (!root || !path.isAbsolute(root)) { console.error('Provide an absolute runtime directory'); process.exit(2); }
const failures = [];
const files = ['bin/ffmpeg', 'lib/libvpx.12.dylib', 'lib/libopus.0.dylib'];
const report = { checkpoint:'RI2.15.5-B', scope:'local private runtime only', root, files:[], failures };
for (const rel of files) {
  const target = path.join(root, rel);
  try {
    const st = fs.lstatSync(target);
    if (!st.isFile() || st.isSymbolicLink()) throw new Error('must be a regular file, not a symlink');
    if (!st.size) throw new Error('empty file');
    const bytes = fs.readFileSync(target);
    report.files.push({ path:rel, size:st.size, sha256:crypto.createHash('sha256').update(bytes).digest('hex') });
  } catch (e) { failures.push(rel+': '+e.message); }
}
for (const rel of ['bin','lib']) {
  try {
    const st=fs.lstatSync(path.join(root,rel));
    if (!st.isDirectory() || st.isSymbolicLink()) failures.push(rel+': directory must not be a symlink');
  } catch(e) { failures.push(rel+': '+e.message); }
}
console.log(JSON.stringify(report,null,2));
if (failures.length) process.exitCode=1;
else console.log('RI2.15.5-B runtime-file inventory PASS; architecture, linkage, license, signatures and distribution approval NOT evaluated.');
