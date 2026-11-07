import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';

// E2.4-B2: non-gating reliability matrix in the Electron app runtime.
// Each trial reports byte counts and recorder events; no production export changes.
const app=await electron.launch({args:['.'],timeout:45000,env:{...process.env,ELECTRON_DISABLE_SECURITY_WARNINGS:'true'}});
try {
 const window=await app.firstWindow({timeout:30000});
 await window.waitForLoadState('domcontentloaded');
 const report=await window.evaluate(async()=>{
  const mimeType=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  if(!mimeType)return {error:'No supported WebM MediaRecorder type'};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const run=async({mode,delayMs,audio,trial})=>{
   const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
   const context=canvas.getContext('2d');
   const source=canvas.captureStream(mode==='automatic'?20:0);
   const video=source.getVideoTracks()[0];
   let audioContext,destination;
   if(audio){
    audioContext=new AudioContext();
    await audioContext.resume();
    destination=audioContext.createMediaStreamDestination();
    const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
    gain.gain.value=.01;oscillator.connect(gain).connect(destination);oscillator.start();
    destination._oscillator=oscillator;
   }
   const stream=new MediaStream([...source.getVideoTracks(),...(destination?.stream.getAudioTracks()||[])]);
   const events=[],chunks=[];
   const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:1000000});
   let started=performance.now();
   const done=new Promise((resolve,reject)=>{
    recorder.onstart=()=>events.push('start');
    recorder.ondataavailable=e=>{events.push('data:'+e.data.size);if(e.data.size)chunks.push(e.data.size);};
    recorder.onerror=e=>{events.push('error');reject(new Error('MediaRecorder error '+String(e.error?.message||'')));};
    recorder.onstop=()=>resolve();
   });
   try{
    context.fillStyle='#ff0000';context.fillRect(0,0,320,180);
    recorder.start(100);
    if(delayMs)await sleep(delayMs);
    for(let i=0;i<24;i++){
     context.fillStyle=i%2?'#0000ff':'#ff0000';context.fillRect(0,0,320,180);
     if(mode==='explicit')video.requestFrame();
     await sleep(50);
    }
    recorder.stop();await done;
    return {trial,mode,delayMs,audio,mimeType:recorder.mimeType,totalBytes:chunks.reduce((a,b)=>a+b,0),chunks,events,trackState:video.readyState,elapsedMs:Math.round(performance.now()-started)};
   }catch(e){return {trial,mode,delayMs,audio,error:String(e),events};}
   finally{
    if(recorder.state!=='inactive')recorder.stop();
    stream.getTracks().forEach(t=>t.stop());
    source.getTracks().forEach(t=>t.stop());
    if(destination){destination._oscillator.stop();await audioContext.close();}
   }
  };
  const trials=[];
  // Repeated baseline probes establish whether capture outcomes are deterministic.
  for(let trial=1;trial<=3;trial++)for(const mode of ['automatic','explicit'])
   trials.push(await run({mode,delayMs:0,audio:false,trial}));
  // Startup readiness and an audio track approximate real animatic export conditions.
  for(const mode of ['automatic','explicit']){
   trials.push(await run({mode,delayMs:250,audio:false,trial:'warmup'}));
   trials.push(await run({mode,delayMs:250,audio:true,trial:'audio'}));
  }
  return {userAgent:navigator.userAgent,mimeType,trials};
 });
 console.log('E2.4-B2 Electron recording reliability matrix:',JSON.stringify(report));
 assert(!report.error,report.error);
 const summary={};
 for(const mode of ['automatic','explicit']){
  const runs=report.trials.filter(t=>t.mode===mode);
  summary[mode]={successful:runs.filter(t=>t.totalBytes>0).length,total:runs.length,bytes:runs.map(t=>t.totalBytes||0),errors:runs.filter(t=>t.error).map(t=>t.error)};
 }
 console.log('E2.4-B2 reliability summary:',JSON.stringify(summary));
 assert(report.trials.every(t=>t.totalBytes>0),'One or more Electron recording trials emitted no bytes; inspect non-gating reliability matrix');
 console.log('PASS E2.4-B2 all recording trials');
}finally{await app.close();}
