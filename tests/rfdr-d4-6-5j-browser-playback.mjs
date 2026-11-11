// D4.6.5J browser playback and seeking smoke test for corrected WebM.
// This does not establish Electron compatibility or production muxer readiness.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const files={};
for(const label of ['normal','stress']) files[label]=await readFile('diagnostic-output/d4-6-5h-'+label+'-padding.webm');
const server=createServer((req,res)=>{
 const label=req.url?.includes('stress')?'stress':'normal';
 if(req.url?.startsWith('/video/')){
  const bytes=files[label],range=req.headers.range;
  res.setHeader('Content-Type','video/webm');
  res.setHeader('Accept-Ranges','bytes');
  if(range){
   const m=/bytes=(\d+)-(\d*)/.exec(range);
   if(m){const start=Number(m[1]),end=m[2]?Math.min(Number(m[2]),bytes.length-1):bytes.length-1;res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':end-start+1});res.end(bytes.subarray(start,end+1));return;}
  }
  res.writeHead(200,{'Content-Length':bytes.length});res.end(bytes);return;
 }
 res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>WebM playback test</title><video id="v" preload="auto" playsinline></video>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const reports=[];
try{
 for(const label of ['normal','stress']){
  const page=await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const report=await page.evaluate(async(label)=>{
   const v=document.querySelector('video');v.src='/video/'+label;
   const wait=(event,ms=15000)=>new Promise((resolve,reject)=>{const t=setTimeout(()=>{v.removeEventListener(event,handler);reject(Error('Timeout '+event+' state '+v.readyState+' error '+v.error?.message));},ms);function handler(){clearTimeout(t);resolve();}v.addEventListener(event,handler,{once:true});});
   await wait('loadedmetadata');
   const duration=v.duration,videoWidth=v.videoWidth,videoHeight=v.videoHeight;
   const seeks=[];
   for(const t of [0.5,0.875,1.5,2.5]){
    const pending=wait('seeked');v.currentTime=t;await pending;
    seeks.push({requested:t,actual:v.currentTime,readyState:v.readyState});
   }
   v.currentTime=0;
   await wait('seeked');
   const started=wait('playing');await v.play();await started;
   await new Promise(resolve=>setTimeout(resolve,250));
   const playbackTime=v.currentTime,paused=v.paused,error=v.error?.message??null;
   v.pause();
   return {label,duration,videoWidth,videoHeight,seeks,playbackTime,paused,error};
  },label);
  reports.push(report);
  console.log(JSON.stringify(report,null,2));
  assert(report.duration>2.95&&report.duration<3.1,'Unexpected playback duration');
  assert.equal(report.videoWidth,320);assert.equal(report.videoHeight,180);
  assert(report.seeks.every(s=>Math.abs(s.requested-s.actual)<0.05&&s.readyState>=2),'Seeking failed');
  assert(report.playbackTime>0&&!report.paused&&!report.error,'Playback failed');
  await page.close();
 }
 await writeFile('diagnostic-output/d4-6-5j-browser-playback.json',JSON.stringify(reports,null,2));
 console.log('D4.6.5J Chromium playback and seek smoke test PASS; audio perception and Electron compatibility not yet tested.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
