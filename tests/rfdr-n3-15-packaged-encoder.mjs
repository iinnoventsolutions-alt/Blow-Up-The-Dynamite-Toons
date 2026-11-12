import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,chmodSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {packagedEncoder,probePackagedEncoder}=require('../desktop/isolated-ffmpeg.cjs');
const root=mkdtempSync(path.join(tmpdir(),'n315-')),resources=path.join(root,'Contents','Resources');
try{
 mkdirSync(resources,{recursive:true});
 assert.throws(()=>packagedEncoder(resources,'linux'),/macOS only/);
 assert.throws(()=>packagedEncoder('relative','darwin'),/resources path/);
 assert.throws(()=>packagedEncoder(resources,'darwin'),/ENOENT/);
 const binary=path.join(resources,'ffmpeg');
 writeFileSync(binary,'#!/bin/sh\\nprintf "ffmpeg version N3.15-test\\\\n"\\n',{mode:0o755});
 assert.equal(packagedEncoder(resources,'darwin'),realpathSync(binary));
 const probe=await probePackagedEncoder(resources);
 assert.match(probe.version,/N3.15-test/);
 chmodSync(binary,0o644);assert.throws(()=>packagedEncoder(resources,'darwin'),/not executable/);
 rmSync(binary);
 const external=path.join(root,'external');writeFileSync(external,'x',{mode:0o755});
 symlinkSync(external,binary);assert.throws(()=>packagedEncoder(resources,'darwin'),/external symlink/);
 rmSync(binary);
 writeFileSync(binary,'#!/bin/sh\\nsleep 2\\n',{mode:0o755});
 await assert.rejects(probePackagedEncoder(resources,{timeoutMs:50}),/timed out/);
 const controller=new AbortController();controller.abort();
 await assert.rejects(probePackagedEncoder(resources,{signal:controller.signal}),/abort/i);
 console.log('RFDR N3.15 packaged encoder boundary PASS');
}finally{rmSync(root,{recursive:true,force:true})}
