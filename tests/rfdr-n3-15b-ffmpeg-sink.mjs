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
 const fake=(binary,args)=>{calls.push({binary,args});const {EventEmitter}=require('node:events');const child=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();child.stdin.write=(_bytes,cb)=>queueMicrotask(()=>cb());child.stdin.end=()=>queueMicrotask(()=>child.emit('close',1));child.kill=()=>{};return child};
 const sink=await createIsolatedFfmpegSink({resourcesPath:resources,width:2,height:2,fps:8,signal,spawnProcess:fake});
 await assert.rejects(sink.writeFrame({index:0,pixels:new Uint8Array(4)},signal),/RGBA size/);
 await sink.writeAudio(null,signal);
 await sink.writeFrame({index:0,pixels:new Uint8Array(16)},signal);
 await assert.rejects(sink.finish(signal),/FFmpeg export failed/);
 assert.equal(calls.length,1);assert(calls[0].args.includes('-an'));
 await sink.dispose();await sink.dispose();
 // A late EPIPE after cancellation must not become an uncaught main-process exception.
 const cancelController=new AbortController();
 let cancelledChild;
 const cancelFake=()=>{const {EventEmitter}=require('node:events');const c=new EventEmitter();c.stderr=new EventEmitter();c.stdin=new EventEmitter();c.stdin.write=(_bytes,cb)=>queueMicrotask(()=>cb());c.stdin.end=()=>{};c.kill=()=>{queueMicrotask(()=>{c.stdin.emit('error',Object.assign(new Error('write EPIPE'),{code:'EPIPE'}));c.emit('close',null)})};cancelledChild=c;return c};
 const cancelSink=await createIsolatedFfmpegSink({resourcesPath:resources,width:2,height:2,fps:8,signal:cancelController.signal,spawnProcess:cancelFake});
 await cancelSink.writeAudio(null,cancelController.signal);
 await cancelSink.writeFrame({index:0,pixels:new Uint8Array(16)},cancelController.signal);
 cancelController.abort();
 await new Promise(r=>setTimeout(r,10));
 assert(cancelledChild.stdin.listenerCount('error')>0,'late pipe errors must remain handled');
 await cancelSink.dispose();
 const aborted=new AbortController();aborted.abort();
 await assert.rejects(createIsolatedFfmpegSink({resourcesPath:resources,width:2,height:2,fps:8,signal:aborted.signal}),/abort/i);
 console.log('RFDR N3.15-B isolated FFmpeg sink contract PASS');
}finally{rmSync(root,{recursive:true,force:true})}
