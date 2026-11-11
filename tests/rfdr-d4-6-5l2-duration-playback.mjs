// D4.6.5L.2 corrected silent WebM playback and seeking in Chromium.
// Electron verification is a separate gate, not inferred from this result.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const files={normal:await readFile('diagnostic-output/d4-6-5l2-normal-duration.webm'),stress:await readFile('diagnostic-output/d4-6-5l2-stress-duration.webm')};
const server=createServer((req,res)=>{
 if(req.url?.startsWith('/video/')){
  const b=files[req.url.includes('stress')?'stress':'normal'],range=req.headers.range;
  res.setHeader('Content-Type','video/webm');res.setHeader('Accept-Ranges','bytes');
  const m=range&&/bytes=(\d+)-(\d*)/.exec(range);
  if(m){const start=Number(m[1]),end=m[2]?Math.min(Number(m[2]),b.length-1):b.length-1;res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${b.length}`,'Content-Length':end-start+1});res.end(b.subarray(start,end+1));return;}
  res.writeHead(200,{'Content-Length':b.length});res.end(b);return;
 }
 res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><video id="v" preload="auto"></video>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const reports=[];
 for(const label of ['normal','stress']){
  const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
  const result=await page.evaluate(async label=>{
   const v=document.querySelector('video');
   function wait(event){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('timeout '+event+' '+v.error?.message)),15000);v.addEventListener(event,()=>{clearTimeout(timer);resolve();},{once:true});});}
   const metadata=wait('loadedmetadata');v.src='/video/'+label;await metadata;
   const duration=v.duration,seeks=[];
   for(const t of [0.5,2.875,4.5,5.75]){
    const seeked=wait('seeked');v.currentTime=t;await seeked;
    seeks.push({requested:t,actual:v.currentTime,readyState:v.readyState});
   }
   const seeked=wait('seeked');v.currentTime=0;await seeked;
   await v.play();await new Promise(r=>setTimeout(r,250));
   const report={duration,seeks,playbackTime:v.currentTime,paused:v.paused,error:v.error?.message??null};
   v.pause();return report;
  },label);
  console.log(JSON.stringify({label,...result}));reports.push({label,...result});
  assert(Math.abs(result.duration-6)<0.01);
  assert(result.seeks.every(s=>Math.abs(s.requested-s.actual)<0.05&&s.readyState>=2));
  assert(result.playbackTime>0&&!result.paused&&!result.error);
  await page.close();
 }
 await writeFile('diagnostic-output/d4-6-5l2-chromium-playback.json',JSON.stringify(reports,null,2));
 console.log('D4.6.5L.2 corrected silent WebM Chromium playback PASS; Electron remains pending.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
