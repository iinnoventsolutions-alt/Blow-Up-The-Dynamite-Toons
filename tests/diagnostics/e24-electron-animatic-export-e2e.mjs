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
const dir=mkdtempSync(join(tmpdir(),'e24-b3-'));
try{
 let ready=false;for(let i=0;i<120;i++){try{if((await fetch('http://127.0.0.1:4319')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert(ready,'Vite server started');
 app=await electron.launch({args:['.'],timeout:45000,env:{...process.env,ELECTRON_DISABLE_SECURITY_WARNINGS:'true'}});
 const page=await app.firstWindow({timeout:30000});
 await page.goto('http://127.0.0.1:4319');
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
  const results=[];
  for(const withAudio of [false,true]){
   const p=makeProject('E2.4-B3 export',320,180,12);
   const scene=p.scenes[0],first=scene.panels[0];first.duration=12;
   const second=makePanel('Dissolve destination',12);second.duration=12;scene.panels.push(second);
   first.layers[0].strokes.push({id:'red',tool:'shape',shape:'rectangle',color:'#ff0000',fill:'#ff0000',size:0,points:[[0,0,1],[320,180,1]]});
   second.layers[0].strokes.push({id:'blue',tool:'shape',shape:'rectangle',color:'#0000ff',fill:'#0000ff',size:0,points:[[0,0,1],[320,180,1]]});
   p.transitions=[{id:'dissolve',fromId:first.id,toId:second.id,type:'dissolve',duration:6,direction:'right'}];
   if(withAudio){
    const id='audio-1';p.audioAssets=[{id,name:'diagnostic.wav',source:audioSource(),duration:1,sampleRate:8000,channels:1,peaks:[]}];
    p.audioTracks=[{id:'track',name:'Audio',gain:1,mute:false,solo:false,clips:[{id:'clip',assetId:id,name:'Tone',start:0,offset:0,duration:1,gain:1}]}];
   }
   const progress=[],controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),12000);
   try{
    const blob=await Promise.race([
      exportAnimatic(p,controller.signal,n=>progress.push(n)),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('E2.4-B3 export exceeded 15s watchdog')),15000))
    ]);
    const bytes=Array.from(new Uint8Array(await blob.arrayBuffer()));
    results.push({withAudio,bytes,byteLength:bytes.length,mime:blob.type,progressEnd:progress.at(-1)});
   }catch(e){results.push({withAudio,error:String(e),progressEnd:progress.at(-1)});}
   finally{clearTimeout(timeout);}
  }
  return results;
 }),sleep(40000).then(()=>{throw new Error('E2.4-B3 renderer evaluation exceeded 40s watchdog');})]);
 for(const c of cases){
  const {bytes,...summary}=c;console.log('E2.4-B3 production export:',JSON.stringify(summary));
  if(bytes?.length){const file=join(dir,c.withAudio?'audio.webm':'silent.webm');writeFileSync(file,Buffer.from(bytes));
   const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type','-of','json',file],{encoding:'utf8'});
   console.log('E2.4-B3 ffprobe:',JSON.stringify({withAudio:c.withAudio,status:probe.status,output:probe.stdout,error:probe.stderr}));
   assert.equal(probe.status,0,'Exported WebM must be parseable');
   const parsed=JSON.parse(probe.stdout),duration=Number(parsed.format?.duration);
   assert(duration>1.5&&duration<2.5,'Export duration must approximate 2 seconds');
   assert(parsed.streams?.some(s=>s.codec_type==='video'),'Export must contain video');
   if(c.withAudio)assert(parsed.streams?.some(s=>s.codec_type==='audio'),'Audio-enabled export must contain audio');
  }
  assert(!c.error,c.error);assert(c.byteLength>100,'Actual export must produce video bytes');
 }
 console.log('PASS E2.4-B3 actual Electron animatic exports with dissolve and audio');
}finally{await app?.close();server.kill();rmSync(dir,{recursive:true,force:true});}
