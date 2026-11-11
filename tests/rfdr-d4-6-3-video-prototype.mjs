import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';

await mkdir('diagnostic-output',{recursive:true});
const server=createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end('<!doctype html><title>WebCodecs feasibility</title>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 await page.goto(`http://127.0.0.1:${port}/?stress=${process.env.RFDR_STRESS==='1'?'stress':'normal'}`);
 const result=await page.evaluate(async()=>{
  const result={secureContext:isSecureContext,videoEncoder:typeof VideoEncoder==='function',videoFrame:typeof VideoFrame==='function',audioEncoder:typeof AudioEncoder==='function',audioData:typeof AudioData==='function',mediaRecorder:typeof MediaRecorder==='function',webmMuxerBundled:false};
  if(!result.videoEncoder||!result.videoFrame)return result;
  const codec='vp8',width=320,height=180,fps=24,count=72;
  const stress=new URLSearchParams(location.search).get('stress')==='stress';
  const config={codec,width,height,bitrate:500000,framerate:fps};
  const support=await VideoEncoder.isConfigSupported(config);
  result.videoConfigSupported=support.supported;
  if(!support.supported)return result;
  const chunks=[];const errors=[];
  const encoder=new VideoEncoder({output:(chunk)=>chunks.push({timestamp:chunk.timestamp,duration:chunk.duration??null,type:chunk.type,byteLength:chunk.byteLength}),error:e=>errors.push(String(e))});
  encoder.configure(config);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  for(let i=0;i<count;i++){
   ctx.fillStyle=i<24?'#f00':i<30?'#808080':'#00f';ctx.fillRect(0,0,width,height);
   if(stress && i%12===0){const until=performance.now()+65;while(performance.now()<until){} }
   const timestamp=Math.round(i*1000000/fps);
   const frame=new VideoFrame(canvas,{timestamp,duration:Math.round(1000000/fps)});
   encoder.encode(frame,{keyFrame:i===0});frame.close();
  }
  await encoder.flush();encoder.close();
  result.stress=stress;result.errors=errors;result.encodedChunks=chunks.length;
  result.firstTimestamp=chunks[0]?.timestamp??null;
  result.lastTimestamp=chunks.at(-1)?.timestamp??null;
  result.monotonic=chunks.every((c,i)=>i===0||c.timestamp>chunks[i-1].timestamp);
  result.timestampMatchesStoryboard=chunks.length===count&&chunks.every((c,i)=>c.timestamp===Math.round(i*1000000/fps));
  result.sample=chunks.slice(0,5);
  return result;
 });
 await writeFile(`diagnostic-output/webcodecs-${process.env.RFDR_STRESS==='1'?'stress':'normal'}.json`,JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
 assert(result.videoEncoder&&result.videoFrame,'WebCodecs video interfaces unavailable');
 assert(result.videoConfigSupported,'VP8 encoder configuration unavailable');
 assert.equal(result.errors.length,0);
 assert.equal(result.encodedChunks,72);
 assert(result.monotonic&&result.timestampMatchesStoryboard,'Explicit encoded chunk timestamps did not match storyboard');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
