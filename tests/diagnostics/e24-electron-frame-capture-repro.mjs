import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';

// E2.4-B1.2: paired capture modes in the real Electron runtime, non-gating.
// Same draw content, frame count, cadence, bitrate and recording duration.
// Compare automatic captureStream(fps) with explicit captureStream(0)+requestFrame().
const app=await electron.launch({args:['.'],timeout:45000,env:{...process.env,ELECTRON_DISABLE_SECURITY_WARNINGS:'true'}});
try{
 const window=await app.firstWindow({timeout:30000});
 await window.waitForLoadState('domcontentloaded');
 const results=await window.evaluate(async()=>{
  const supported=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  if(!supported)return {error:'No supported WebM MediaRecorder type'};
  const fps=20,frames=24,intervalMs=50;
  const record=async(mode)=>{
   const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
   const ctx=canvas.getContext('2d');
   const stream=canvas.captureStream(mode==='automatic'?fps:0),track=stream.getVideoTracks()[0];
   const chunks=[];
   const recorder=new MediaRecorder(stream,{mimeType:supported,videoBitsPerSecond:1000000});
   const completion=new Promise((resolve,reject)=>{
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data.size);};
    recorder.onerror=()=>reject(new Error('MediaRecorder emitted an error'));
    recorder.onstop=()=>resolve({mode,type:recorder.mimeType,chunks,totalBytes:chunks.reduce((a,b)=>a+b,0),trackState:track.readyState,framesRequested:frames,elapsedMs:performance.now()-start});
   });
   const start=performance.now();
   try{
    recorder.start(100);
    for(let i=0;i<frames;i++){
     ctx.fillStyle=i%2?'#0000ff':'#ff0000';ctx.fillRect(0,0,320,180);
     if(mode==='explicit')track.requestFrame();
     await new Promise(r=>setTimeout(r,intervalMs));
    }
    recorder.stop();
    return await completion;
   }finally{if(recorder.state!=='inactive')recorder.stop();stream.getTracks().forEach(t=>t.stop());}
  };
  return {electron:navigator.userAgent,mimeType:supported,fps,frames,intervalMs,
   automatic:await record('automatic'),explicit:await record('explicit')};
 });
 console.log('E2.4-B1.2 Electron recording mode comparison:',JSON.stringify(results));
 assert(!results.error,results.error);
 console.log('E2.4-B1.2 classification:',JSON.stringify({
  automaticEmits:results.automatic.totalBytes>0,
  explicitEmits:results.explicit.totalBytes>0,
  explicitOnlyFailure:results.automatic.totalBytes>0&&results.explicit.totalBytes===0
 }));
 assert(results.automatic.totalBytes>0&&results.explicit.totalBytes>0,
  'Capture mode probe: one or both recording modes did not emit video bytes (inspect comparison above)');
 console.log('PASS E2.4-B1.2 both Electron frame capture modes');
}finally{await app.close();}
