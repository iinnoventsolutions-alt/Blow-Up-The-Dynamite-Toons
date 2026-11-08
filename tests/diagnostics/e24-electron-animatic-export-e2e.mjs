import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {spawnSync} from 'node:child_process';
import {writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import { _electron as electron } from 'playwright';

// E2.4-B3: real exportAnimatic path in Electron, not a synthetic MediaRecorder.
// Diagnostic is non-gating until timing and media assertions are proven stable.
const server=spawn(process.platform==='win32'?'node_modules/.bin/vite.cmd':'node_modules/.bin/vite',['--host','127.0.0.1','--port','4319','--strictPort'],{stdio:'ignore'});
let app;
const trace=(stage)=>console.log('E2.4-B3 stage:',stage,new Date().toISOString());
const within=async(promise,ms,label)=>Promise.race([promise,sleep(ms).then(()=>{throw new Error('E2.4-B3 '+label+' timed out after '+ms+'ms');})]);
const dir=mkdtempSync(join(tmpdir(),'e24-b3-'));
try{
 trace('start');
 let ready=false;for(let i=0;i<120;i++){try{if((await fetch('http://127.0.0.1:4319')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert(ready,'Vite server started');
 trace('vite-ready');
 app=await within(electron.launch({args:['.'],timeout:15000,env:{...process.env,ELECTRON_DISABLE_SECURITY_WARNINGS:'true'}}),20000,'launch');
 trace('electron-launched');
 const mainPage=await within(app.firstWindow({timeout:10000}),12000,'first-window');
 trace('first-window-ready');
 // Production main.cjs blocks all renderer-initiated navigation via will-navigate.
 // Create a separate isolated Electron diagnostic window instead of navigating the app window.
 const windowPromise=app.waitForEvent('window',{timeout:15000});
 await app.evaluate(async({BrowserWindow})=>{
  const diagnostic=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  await diagnostic.loadURL('http://127.0.0.1:4319/');
 });
 const page=await windowPromise;
 // Forward diagnostic renderer messages into CI logs before the experiment starts.
 page.on('console',message=>{if(message.text().startsWith('E2.4-B4.3 recorder matrix'))console.log(message.text());});
 page.on('pageerror',error=>console.warn('E2.4-B4.3 renderer error:',String(error)));
 await page.waitForLoadState('domcontentloaded',{timeout:10000});
 trace('vite-page-loaded');
 trace('export-evaluate-start');
 const cases=await Promise.race([page.evaluate(async()=>{
  const {makeProject,makePanel}=await import('/src/model.ts');
  const {exportAnimatic}=await import('/src/animatic-export.ts');
  function audioSource(){
   const rate=8000,count=rate,bytes=new Uint8Array(44+count*2),v=new DataView(bytes.buffer);
   const word=(at,str)=>{for(let i=0;i<str.length;i++)bytes[at+i]=str.charCodeAt(i);};
   word(0,'RIFF');v.setUint32(4,bytes.length-8,true);word(8,'WAVE');word(12,'fmt ');
   v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
   v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);
   word(36,'data');v.setUint32(40,count*2,true);
   for(let i=0;i<count;i++)v.setInt16(44+i*2,Math.round(1200*Math.sin(i*2*Math.PI*440/rate)),true);
   let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
   return 'data:audio/wav;base64,'+btoa(binary);
  }
  // B4.1: instrument browser APIs only inside this diagnostic window.
  const lifecycle=[];
  const OriginalRecorder=window.MediaRecorder;
  const originalRaf=window.requestAnimationFrame.bind(window);
  let rafCalls=0,rafCallbacks=0,frameRequests=0;
  window.requestAnimationFrame=(callback)=>{rafCalls++;return originalRaf(time=>{rafCallbacks++;callback(time);});};
  const originalRequestFrame=CanvasCaptureMediaStreamTrack.prototype.requestFrame;
  CanvasCaptureMediaStreamTrack.prototype.requestFrame=function(...args){frameRequests++;return originalRequestFrame.apply(this,args);};
  class TracedRecorder extends OriginalRecorder {
   constructor(...args){
    super(...args);
    lifecycle.push({event:'constructed',state:this.state,mime:this.mimeType,at:performance.now()});
    for(const name of ['start','dataavailable','error','stop']){
     this.addEventListener(name,e=>lifecycle.push({event:name,state:this.state,bytes:e.data?.size??null,at:performance.now()}));
    }
   }
   start(...args){lifecycle.push({event:'start-called',state:this.state,at:performance.now()});return super.start(...args);}
   stop(...args){lifecycle.push({event:'stop-called',state:this.state,at:performance.now()});return super.stop(...args);}
   requestData(...args){lifecycle.push({event:'request-data-called',state:this.state,at:performance.now()});return super.requestData(...args);}
  }
  // B4.3: non-production recorder matrix, matching B2's known-working shape.
  const probe=async(label,{audio=false,active=false,mime='video/webm;codecs=vp9,opus',bits=5000000}={})=>{
   const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
   const draw=canvas.getContext('2d'),source=canvas.captureStream(0);
   const track=source.getVideoTracks()[0];
   const ac=audio?new AudioContext():null;
   if(ac)await ac.resume();
   const destination=ac?.createMediaStreamDestination();
   const oscillator=active?ac.createOscillator():null;
   if(oscillator){oscillator.frequency.value=440;oscillator.connect(destination);oscillator.start();}
   const stream=new MediaStream([...source.getVideoTracks(),...(destination?.stream.getAudioTracks()||[])]);
   const events=[],chunks=[];
   let rec;
   try{
    rec=new OriginalRecorder(stream,{mimeType:mime,videoBitsPerSecond:bits,...(audio?{audioBitsPerSecond:192000}:{})});
    const done=new Promise((resolve,reject)=>{rec.ondataavailable=e=>{events.push('data:'+e.data.size);if(e.data.size)chunks.push(e.data.size);};rec.onstart=()=>events.push('start');rec.onerror=e=>reject(new Error(String(e.error)));rec.onstop=resolve;});
    rec.start(100);
    for(let i=0;i<30;i++){draw.fillStyle=i%2?'#ff0000':'#0000ff';draw.fillRect(0,0,320,180);track.requestFrame();await new Promise(r=>setTimeout(r,50));}
    rec.stop();await done;
    return {label,bytes:chunks.reduce((a,n)=>a+n,0),events};
   }catch(e){return {label,error:String(e),events};}
   finally{if(rec?.state==='recording')rec.stop();stream.getTracks().forEach(t=>t.stop());source.getTracks().forEach(t=>t.stop());if(oscillator){oscillator.stop();oscillator.disconnect();}if(ac)await ac.close();}
  };
  const matrix=[];
  for(const [label,options] of [
   ['baseline',{audio:false,bits:1000000}],
   ['high-bitrate',{audio:false,bits:5000000}],
   ['silent-audio-track',{audio:true,bits:5000000}],
   ['active-audio-track',{audio:true,active:true,bits:5000000}],
   ['vp8-audio',{audio:true,bits:5000000,mime:'video/webm;codecs=vp8,opus'}]
  ])matrix.push(await probe(label,options));
  console.log('E2.4-B4.3 recorder matrix',JSON.stringify(matrix));
  window.MediaRecorder=TracedRecorder;
  const results=[];
  // B4.5: repeat real exports and exercise silent routing edge cases.
  for(const scenario of ['silent','audio','muted','empty-track','silent-repeat','audio-repeat','silent-third','audio-third']){
   const withAudio=scenario.startsWith('audio');
   const p=makeProject('E2.4-B3 export',320,180,12);
   const scene=p.scenes[0],first=scene.panels[0];first.duration=12;
   const second=makePanel('Dissolve destination',12);second.duration=12;scene.panels.push(second);
   first.layers[0].strokes.push({id:'red',tool:'shape',shape:'rectangle',color:'#ff0000',fill:'#ff0000',size:0,points:[[0,0,1],[320,180,1]]});
   second.layers[0].strokes.push({id:'blue',tool:'shape',shape:'rectangle',color:'#0000ff',fill:'#0000ff',size:0,points:[[0,0,1],[320,180,1]]});
   p.transitions=[{id:'dissolve',fromId:first.id,toId:second.id,type:'dissolve',duration:6,direction:'right'}];
   if(withAudio||scenario==='muted'){
    const id='audio-1';p.audioAssets=[{id,name:'diagnostic.wav',source:audioSource(),duration:1,sampleRate:8000,channels:1,peaks:[]}];
    p.audioTracks=[{id:'track',name:'Audio',gain:1,mute:scenario==='muted',solo:false,clips:[{id:'clip',assetId:id,name:'Tone',start:0,offset:0,duration:1,gain:1}]}];
   }
   if(scenario==='empty-track')p.audioTracks=[{id:'empty',name:'Empty',gain:1,mute:false,solo:false,clips:[]}];
   const progress=[],controller=new AbortController();const eventStart=lifecycle.length,rafStart=rafCalls,callbackStart=rafCallbacks,frameStart=frameRequests;
   console.log('E2.4-B3 renderer export start',withAudio);
   const timeout=setTimeout(()=>controller.abort(),12000);
   try{
    const blob=await Promise.race([
      exportAnimatic(p,controller.signal,n=>progress.push(n)),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('E2.4-B3 export exceeded 15s watchdog')),15000))
    ]);
    const bytes=Array.from(new Uint8Array(await blob.arrayBuffer()));
    results.push({scenario,withAudio,bytes,byteLength:bytes.length,mime:blob.type,progressEnd:progress.at(-1),diagnostics:{events:lifecycle.slice(eventStart),rafCalls:rafCalls-rafStart,rafCallbacks:rafCallbacks-callbackStart,frameRequests:frameRequests-frameStart}});
   }catch(e){results.push({scenario,withAudio,error:String(e),progressEnd:progress.at(-1),diagnostics:{events:lifecycle.slice(eventStart),rafCalls:rafCalls-rafStart,rafCallbacks:rafCallbacks-callbackStart,frameRequests:frameRequests-frameStart}});}
   finally{clearTimeout(timeout);}
  }
  window.MediaRecorder=OriginalRecorder;
  CanvasCaptureMediaStreamTrack.prototype.requestFrame=originalRequestFrame;
  return results;
 }),sleep(90000).then(()=>{throw new Error('E2.4-B4.5 renderer evaluation exceeded 90s watchdog');})]);
 trace('export-evaluate-done');
 for(const c of cases){
  const {bytes,...summary}=c;console.log('E2.4-B3 production export:',JSON.stringify(summary));
  if(bytes?.length){const file=join(dir,c.scenario+'.webm');writeFileSync(file,Buffer.from(bytes));
   const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type','-of','json',file],{encoding:'utf8'});
   console.log('E2.4-B3 ffprobe:',JSON.stringify({scenario:c.scenario,withAudio:c.withAudio,status:probe.status,output:probe.stdout,error:probe.stderr}));
   assert.equal(probe.status,0,'Exported WebM must be parseable');
   const parsed=JSON.parse(probe.stdout),duration=Number(parsed.format?.duration);
   assert(duration>1.5&&duration<2.5,'Export duration must approximate 2 seconds');
   assert(parsed.streams?.some(s=>s.codec_type==='video'),'Export must contain video');
   if(c.withAudio)assert(parsed.streams?.some(s=>s.codec_type==='audio'),'Audio-enabled export must contain audio');
  }
  assert(!c.error,`scenario=${c.scenario}: ${c.error}`);assert(c.byteLength>100,'Actual export must produce video bytes');
 }
 console.log('PASS E2.4-B4.5 repeated Electron animatic exports including silent, audio, muted and empty tracks');
}finally{
 trace('cleanup-start');
 if(app){
  try{await within(app.close(),8000,'app-close');}
  catch(e){console.warn('E2.4-B3 Electron close warning:',String(e));}
 }
 server.kill();
 rmSync(dir,{recursive:true,force:true});
 trace('cleanup-done');
}
