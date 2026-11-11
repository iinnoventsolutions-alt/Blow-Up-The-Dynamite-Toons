// D4.6.5L.1: verify an aborted WebCodecs encode can be followed by a clean retry.
// Isolated diagnostic; does not test production export cancellation.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const js=await readFile('diagnostic-output/d4-6-5l-bundle.js');
const server=createServer((req,res)=>{if(req.url==='/bundle.js'){res.writeHead(200,{'content-type':'application/javascript'});res.end(js);}else{res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html>');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
 const result=await page.evaluate(async()=>{
  const errors=[];
  const encoder=new VideoEncoder({output:()=>{},error:e=>errors.push(String(e))});
  encoder.configure({codec:'vp8',width:320,height:180,bitrate:500000,framerate:24});
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
  for(let i=0;i<12;i++){
   const frame=new VideoFrame(canvas,{timestamp:Math.round(i*1e6/24)});
   encoder.encode(frame,{keyFrame:i===0});frame.close();
  }
  encoder.reset();encoder.close();
  const stateAfterCancel=encoder.state;
  const {createSilentWebM}=await import('/bundle.js');
  const retry=await createSilentWebM(true);
  return {stateAfterCancel,cancelErrors:errors,retry};
 });
 const {retry,...summary}=result;
 const report={...summary,retry:retry.report,bytes:retry.bytes.length};
 await writeFile('diagnostic-output/d4-6-5l1-cancel-retry.json',JSON.stringify(report,null,2));
 await writeFile('diagnostic-output/d4-6-5l1-retry.webm',Buffer.from(retry.bytes));
 console.log(JSON.stringify(report));
 assert.equal(report.stateAfterCancel,'closed');
 assert.equal(report.retry.frames,144);
 assert.equal(report.retry.errors.length,0);
 assert(report.retry.monotonic);
 assert(report.bytes>1000);
 console.log('D4.6.5L.1 isolated encoder cancel/retry PASS; production cancellation not yet tested.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
