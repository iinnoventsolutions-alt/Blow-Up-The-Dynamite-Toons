import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {createIsolatedFfmpegSink}=require('../desktop/isolated-ffmpeg-sink.cjs');
const root=mkdtempSync(path.join(tmpdir(),'n315b-')),resources=path.join(root,'Contents','Resources');
mkdirSync(resources,{recursive:true});
writeFileSync(path.join(resources,'ffmpeg'),'placeholder',{mode:0o755});
const signal=new AbortController().signal;
try{
 await assert.rejects(createIsolatedFfmpegSink({resourcesPath:resources,width:0,height:4,fps:8,signal}),/dimensions/);
 const calls=[];
 const fake=(binary,args)=>{calls.push({binary,args});const {EventEmitter}=require('node:events');const child=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};queueMicrotask(()=>child.emit('close',1));return child};
 const sink=await createIsolatedFfmpegSink({resourcesPath:resources,width:2,height:2,fps:8,signal,spawnProcess:fake});
 await assert.rejects(sink.writeFrame({index:0,pixels:new Uint8Array(4)},signal),/RGBA size/);
 await sink.writeFrame({index:0,pixels:new Uint8Array(16)},signal);
 await sink.writeAudio(null,signal);
 await assert.rejects(sink.finish(signal),/FFmpeg export failed/);
 assert.equal(calls.length,1);assert(calls[0].args.includes('-an'));
 await sink.dispose();await sink.dispose();
 const aborted=new AbortController();aborted.abort();
 await assert.rejects(createIsolatedFfmpegSink({resourcesPath:resources,width:2,height:2,fps:8,signal:aborted.signal}),/abort/i);
 console.log('RFDR N3.15-B isolated FFmpeg sink contract PASS');
}finally{rmSync(root,{recursive:true,force:true})}
