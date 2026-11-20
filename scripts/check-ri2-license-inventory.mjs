#!/usr/bin/env node
// RI2.15.3 documentation-only license inventory gate. Does not authorize distribution.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const fail = (message) => { console.error('RI2.15.3 FAIL:', message); process.exitCode = 1; };
const read = (path) => { if (!existsSync(path)) { fail('Missing '+path); return ''; } return readFileSync(path, 'utf8'); };
const files = [
  'release-audit/licenses/FFmpeg-n7.1.1-LICENSE.md',
  'release-audit/licenses/FFmpeg-n7.1.1-COPYING.LGPLv2.1',
  'release-audit/licenses/libvpx-v1.16.0-LICENSE',
  'release-audit/licenses/opus-v1.6.1-COPYING'
];
for (const path of files) {
  const data = read(path);
  if (data.trim().length < 500) fail('Incomplete notice: '+path);
  else console.log('NOTICE OK', path, createHash('sha256').update(data).digest('hex'));
}
let cfg;
try { cfg = JSON.parse(read('release-audit/ri2-4-minimal-ffmpeg-candidate.json')); }
catch { fail('Candidate configuration invalid'); }
if (cfg) {
  const required = ['--disable-everything','--enable-libvpx','--enable-libopus','--enable-encoder=libvpx_vp8','--enable-encoder=libopus'];
  for (const flag of required) if (!cfg.requiredConfigureFlags?.includes(flag)) fail('Missing required '+flag);
  for (const flag of cfg.requiredConfigureFlags || []) if (/^--enable-(gpl|version3|nonfree)(?:$|=)/.test(flag)) fail('Forbidden '+flag);
  for (const flag of ['--enable-gpl','--enable-version3','--enable-nonfree']) if (!cfg.forbiddenConfigureFlags?.includes(flag)) fail('Forbidden policy missing '+flag);
}
const evidence = read('docs/RFDR-RI2-15-2-B-binary-license-verification.md');
if (!evidence.includes('legal distribution approval OPEN')) fail('Missing release-blocking legal gate');
if (!evidence.includes('ffmpeg -L')) fail('Missing explicit FFmpeg binary-license evidence gap');
// Deliberately DOES NOT claim binary verification: exact -L output and package-level notices remain open.
if (!process.exitCode) console.log('RI2.15.3 PASS: documentation inventory only; distribution NOT authorized');
