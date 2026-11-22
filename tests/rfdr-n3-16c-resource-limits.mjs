import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
const require=createRequire(import.meta.url);
const {createIsolatedFfmpegSink}=require('../desktop/isolated-ffmpeg-sink.cjs');
const root=mkdtempSync(path.join(tmpdir(),'n316c-')),resources=path.join(root,'Resources');
mkdirSync(resources);writeFileSync(path.join(resources,'ffmpeg'),'stub',{mode:0o755});
const signal=new AbortController().signal;
try{
 await assert.rejects(createIsolatedFfmpegSink({resourcesPath:resources,width:2,height:2,fps:8,signal,maxRawBytes:0}),/disk budget/);
 await assert.rejects(createIsolatedFfmpegSink({resourcesPath:resources,width:2,height:2,fps:8,signal,encodeTimeoutMs:0}),/timeout/);
 const spawnMock=()=>{const child=new EventEmitter();child.stderr=new EventEmitter();child.stdin=new EventEmitter();child.stdin.write=(_data,callback)=>{queueMicrotask(()=>callback());return true};child.stdin.end=()=>{};child.kill=()=>{queueMicrotask(()=>child.emit('close',null));return true};return child};
 const audioSink=await createIsolatedFfmpegSink({resourcesPath:resources,width:2,height:2,fps:8,signal,maxRawBytes:16,spawnProcess:spawnMock});
 try{await assert.rejects(audioSink.writeAudio({sampleRate:48000,samples:new Float32Array(5)},signal),/format/)}finally{await audioSink.dispose()}
 const sink=await createIsolatedFfmpegSink({resourcesPath:resources,width:2,height:2,fps:8,signal,maxRawBytes:16,spawnProcess:spawnMock});
 try{
  await sink.writeFrame({index:0,pixels:new Uint8Array(16)},signal);
  await sink.writeFrame({index:1,pixels:new Uint8Array(16)},signal);
  await sink.writeFrame({index:2,pixels:new Uint8Array(16)},signal);
  assert.equal(typeof sink.finish,'function');
 }finally{await sink.dispose()}
 const tooSmall=await createIsolatedFfmpegSink({resourcesPath:resources,width:2,height:2,fps:8,signal,maxRawBytes:15,spawnProcess:spawnMock});
 try{await assert.rejects(tooSmall.writeFrame({index:0,pixels:new Uint8Array(16)},signal),/frame budget/)}finally{await tooSmall.dispose()}
 let killed=false;
 const spawnProcess=()=>{const child=spawnMock();child.kill=()=>{killed=true;queueMicrotask(()=>child.emit('close',null));return true};return child};
 const timed=await createIsolatedFfmpegSink({resourcesPath:resources,width:2,height:2,fps:8,signal,encodeTimeoutMs:20,spawnProcess});
 try{
  await timed.writeFrame({index:0,pixels:new Uint8Array(16)},signal);
  await assert.rejects(timed.finish(signal),/timed out/);
  assert.equal(killed,true);
 }finally{await timed.dispose()}
 console.log('RFDR N3.16-C raw disk budget and encoder timeout PASS');
}finally{rmSync(root,{recursive:true,force:true})}
