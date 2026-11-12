/** N3.16 isolated security and regression gate: no production wiring. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
const require=createRequire(import.meta.url);
const {createIsolatedFfmpegSink}=require('../desktop/isolated-ffmpeg-sink.cjs');
const root=mkdtempSync(path.join(tmpdir(),'rfdr-n316-')),resources=path.join(root,'Resources');
mkdirSync(resources);writeFileSync(path.join(resources,'ffmpeg'),'test',{mode:0o755});
const signal=new AbortController().signal;
try{
 const main=readFileSync(new URL('../desktop/main.cjs',import.meta.url),'utf8');
 const preload=readFileSync(new URL('../desktop/preload.cjs',import.meta.url),'utf8');
 const exporter=readFileSync(new URL('../src/animatic-export.ts',import.meta.url),'utf8');
 for(const content of [main,preload,exporter])assert(!content.includes('isolated-ffmpeg-sink'),'Isolated sink must not be wired into production');
 let observed;
 const fake=(binary,args,opts)=>{
  observed={binary,args,opts};
  const child=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{queueMicrotask(()=>child.emit('close',null))};
  queueMicrotask(()=>child.emit('close',1));
  return child;
 };
 const sink=await createIsolatedFfmpegSink({resourcesPath:resources,width:2,height:2,fps:8,signal,spawnProcess:fake});
 try{
  await assert.rejects(sink.writeFrame({index:1,pixels:new Uint8Array(16)},signal),/order/);
  await sink.writeFrame({index:0,pixels:new Uint8Array(16)},signal);
  await assert.rejects(sink.writeFrame({index:0,pixels:new Uint8Array(16)},signal),/order/);
  await assert.rejects(sink.writeAudio({sampleRate:44100,samples:new Float32Array(4)},signal),/format/);
  await sink.writeAudio(null,signal);
  await assert.rejects(sink.finish(signal),/FFmpeg export failed/);
  assert.equal(observed.binary,realpathSync(path.join(resources,'ffmpeg')));
  assert.equal(observed.opts.shell,false);
  assert.deepEqual(observed.args.slice(0,5),['-hide_banner','-loglevel','error','-nostdin','-y']);
  assert(observed.args.includes('yuv420p'));
  assert(observed.args.includes('-an'));
  assert(!observed.args.some(x=>x.includes('http:')||x.includes('https:')));
 }finally{await sink.dispose();await sink.dispose()}
 await assert.rejects(sink.writeFrame({index:1,pixels:new Uint8Array(16)},signal),/disposed/);
 const canceled=new AbortController();const abortSink=await createIsolatedFfmpegSink({resourcesPath:resources,width:2,height:2,fps:8,signal:canceled.signal});
 try{canceled.abort();await assert.rejects(abortSink.writeFrame({index:0,pixels:new Uint8Array(16)},signal),/abort/i)}
 finally{await abortSink.dispose()}
 console.log('RFDR N3.16 isolation, argument safety, ordering, cancellation and cleanup PASS');
}finally{rmSync(root,{recursive:true,force:true})}
