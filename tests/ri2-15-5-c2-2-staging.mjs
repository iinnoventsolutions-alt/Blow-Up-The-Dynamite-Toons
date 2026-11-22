import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {stage} from '../scripts/ri2-stage-private-installer-runtime.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ri2-c22-'));
try {
 const src=path.join(dir,'src'),dest=path.join(dir,'out');
 fs.mkdirSync(path.join(src,'bin'),{recursive:true});
 fs.mkdirSync(path.join(src,'lib'),{recursive:true});
 for(const name of ['bin/ffmpeg','lib/libvpx.12.dylib','lib/libopus.0.dylib']){
  fs.writeFileSync(path.join(src,name),'NOT AN APPROVED BINARY');
 }
 assert.throws(()=>stage('arm64',src,dest),/SHA-256 mismatch/);
 assert.equal(fs.existsSync(dest),false);
 assert.throws(()=>stage('x64',src,dest),/SHA-256 mismatch/);
 assert.throws(()=>stage('invalid',src,dest),/Architecture/);
 assert.throws(()=>stage('arm64',src,src),/overlap/);
 assert.equal(fs.existsSync(dest),false);
 console.log('RI2.15.5-C2.2 fail-closed staging negative tests PASS');
} finally {fs.rmSync(dir,{recursive:true,force:true})}
