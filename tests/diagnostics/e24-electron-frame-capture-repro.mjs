import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';

// E2.4-B1: non-gating packaged-runtime reproduction of explicit canvas frame capture.
// Uses the installed Electron runtime, not Chromium launched by Playwright.
const app=await electron.launch({args:['.'],timeout:45000,env:{...process.env,ELECTRON_DISABLE_SECURITY_WARNINGS:'true'}});
try{
 const window=await app.firstWindow({timeout:30000});
 await window.waitForLoadState('domcontentloaded');
 const result=await window.evaluate(async()=>{
  const supported=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  if(!supported)return {error:'No supported WebM MediaRecorder type'};
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
  const ctx=canvas.getContext('2d');
  const stream=canvas.captureStream(0),track=stream.getVideoTracks()[0];
  const chunks=[];
  const recorder=new MediaRecorder(stream,{mimeType:supported,videoBitsPerSecond:1000000});
  const completion=new Promise((resolve,reject)=>{
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data.size);};
   recorder.onerror=()=>reject(new Error('MediaRecorder emitted an error'));
   recorder.onstop=()=>resolve({type:supported,chunks,totalBytes:chunks.reduce((a,b)=>a+b,0),trackState:track.readyState});
  });
  recorder.start(100);
  for(let i=0;i<24;i++){
   ctx.fillStyle=i%2?'#0000ff':'#ff0000';ctx.fillRect(0,0,320,180);
   track.requestFrame();
   await new Promise(r=>setTimeout(r,50));
  }
  recorder.stop();
  const result=await completion;stream.getTracks().forEach(t=>t.stop());
  return result;
 });
 console.log('E2.4-B1 Electron captureStream(0) requestFrame result:',JSON.stringify(result));
 assert(!result.error,result.error);
 assert(result.totalBytes>0,'Packaged Electron MediaRecorder must emit video bytes');
 console.log('PASS E2.4-B1 Electron explicit frame capture');
}finally{await app.close();}
