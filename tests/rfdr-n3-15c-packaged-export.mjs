/** N3.15-C: real packaged ARM64 FFmpeg, isolated sink, independently inspected WebM. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {createIsolatedFfmpegSink}=require('../desktop/isolated-ffmpeg-sink.cjs');
const resourcesPath=process.env.RFDR_PACKAGED_RESOURCES;
assert(resourcesPath&&path.isAbsolute(resourcesPath),'Set RFDR_PACKAGED_RESOURCES to packaged app Contents/Resources');
const dir=mkdtempSync(path.join(tmpdir(),'rfdr-n315c-'));
const fps=8,width=32,height=32,frames=8,signal=new AbortController().signal;
const probe=(file)=>{const p=spawnSync('ffprobe',['-v','error','-show_entries','stream=codec_type,codec_name,nb_frames','-of','json',file],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);return JSON.parse(p.stdout).streams};
try{
 for(const withAudio of [false,true]){
  const sink=await createIsolatedFfmpegSink({resourcesPath,width,height,fps,signal});
  try{
   for(let i=0;i<frames;i++){
    const pixels=new Uint8Array(width*height*4);
    for(let k=0;k<pixels.length;k+=4){pixels[k]=i*25;pixels[k+1]=k/4%width*7;pixels[k+2]=90;pixels[k+3]=255}
    await sink.writeFrame({index:i,timestampUs:Math.round(i*1e6/fps),pixels},signal);
   }
   const samples=new Float32Array(48000);
   for(let i=0;i<samples.length;i++)samples[i]=0.15*Math.sin(2*Math.PI*440*i/48000);
   await sink.writeAudio(withAudio?{sampleRate:48000,samples}:null,signal);
   const data=await sink.finish(signal);
   assert(data.byteLength>100,'WebM output must not be empty');
   const file=path.join(dir,withAudio?'audio.webm':'silent.webm');writeFileSync(file,data);
   const streams=probe(file);
   assert(streams.some(s=>s.codec_type==='video'&&s.codec_name==='vp8'),JSON.stringify(streams));
   assert.equal(streams.some(s=>s.codec_type==='audio'&&s.codec_name==='opus'),withAudio);
   const decoded=spawnSync('ffprobe',['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=nb_read_frames','-of','default=noprint_wrappers=1:nokey=1',file],{encoding:'utf8'});
   assert.equal(decoded.status,0,decoded.stderr);
   assert.equal(Number(decoded.stdout.trim()),frames,'decoded frame count');
   console.log('N3.15-C packaged export PASS',withAudio?'with Opus':'silent',data.byteLength);
  }finally{await sink.dispose()}
 }
}finally{rmSync(dir,{recursive:true,force:true})}
