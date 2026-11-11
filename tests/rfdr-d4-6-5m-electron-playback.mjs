// D4.6.5M: Electron's bundled Chromium playback and seek compatibility.
// This is a CI smoke test, not a packaged ARM64 application acceptance.
import {_electron as electron} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const files={
 silent:await readFile('diagnostic-output/d4-6-5l2-normal-duration.webm'),
 audio:await readFile('diagnostic-output/d4-6-5k-normal-corrected.webm')
};
const server=createServer((req,res)=>{
 if(req.url?.startsWith('/video/')){
  const bytes=files[req.url.includes('audio')?'audio':'silent'];
  const range=req.headers.range;
  res.setHeader('Content-Type','video/webm');res.setHeader('Accept-Ranges','bytes');
  const m=range&&/bytes=(\d+)-(\d*)/.exec(range);
  if(m){const start=Number(m[1]),end=m[2]?Math.min(Number(m[2]),bytes.length-1):bytes.length-1;res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':end-start+1});res.end(bytes.subarray(start,end+1));return;}
  res.writeHead(200,{'Content-Length':bytes.length});res.end(bytes);return;
 }
 res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Electron WebM compatibility</title><video id="v" preload="auto" playsinline></video>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let app;
try{
 const url='http://127.0.0.1:'+server.address().port+'/';
 app=await electron.launch({args:[resolve('tests/rfdr-d4-6-5m-electron-main.cjs')],env:{...process.env,RFDR_MEDIA_URL:url},timeout:45000});
 const window=await app.firstWindow();
 await window.waitForSelector('#v');
 const reports=[];
 for(const kind of ['silent','audio']){
  const result=await window.evaluate(async kind=>{
   const v=document.querySelector('video');
   function wait(event){return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('timeout '+event+' '+v.error?.message)),20000);v.addEventListener(event,()=>{clearTimeout(timeout);resolve();},{once:true});});}
   const metadata=wait('loadedmetadata');v.src='/video/'+kind;await metadata;
   const duration=v.duration,dimensions=[v.videoWidth,v.videoHeight],seeks=[];
   for(const t of [0.5,2.875,4.5,5.75]){
    const done=wait('seeked');v.currentTime=t;await done;
    seeks.push({requested:t,actual:v.currentTime,readyState:v.readyState});
   }
   const done=wait('seeked');v.currentTime=0;await done;
   await v.play();await new Promise(resolve=>setTimeout(resolve,350));
   const report={kind,duration,dimensions,seeks,playbackTime:v.currentTime,paused:v.paused,error:v.error?.message??null};
   v.pause();return report;
  },kind);
  console.log(JSON.stringify(result));reports.push(result);
  assert(Math.abs(result.duration-6)<0.05,'Electron media duration mismatch');
  assert.deepEqual(result.dimensions,[320,180]);
  assert(result.seeks.every(s=>Math.abs(s.actual-s.requested)<0.05&&s.readyState>=2));
  assert(result.playbackTime>0&&!result.paused&&!result.error);
 }
 await writeFile('diagnostic-output/d4-6-5m-electron-playback.json',JSON.stringify(reports,null,2));
 console.log('D4.6.5M Electron corrected silent/audio playback and seeking PASS; packaged ARM64 acceptance pending.');
}finally{
 if(app)await app.close().catch(()=>{});
 await new Promise(resolve=>server.close(resolve));
}
