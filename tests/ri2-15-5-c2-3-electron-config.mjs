import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createConfig,validateStaged} from '../scripts/ri2-generate-electron-config.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'ri2-c23-'));
try{
 const stage=path.join(root,'stage'),out=path.join(root,'config.json');
 fs.mkdirSync(path.join(stage,'ffmpeg-runtime','bin'),{recursive:true});
 fs.mkdirSync(path.join(stage,'ffmpeg-runtime','lib'),{recursive:true});
 fs.mkdirSync(path.join(stage,'third-party-licenses'),{recursive:true});
 fs.writeFileSync(path.join(stage,'ffmpeg-runtime','bin','ffmpeg'),'tampered');
 assert.throws(()=>validateStaged('arm64',stage),/checksum mismatch/);
 assert.throws(()=>createConfig('arm64',stage,out),/checksum mismatch/);
 assert.equal(fs.existsSync(out),false);
 assert.throws(()=>createConfig('universal',stage,out),/Invalid architecture/);
 console.log('RI2.15.5-C2.3 fail-closed Electron config tests PASS');
}finally{fs.rmSync(root,{recursive:true,force:true})}
