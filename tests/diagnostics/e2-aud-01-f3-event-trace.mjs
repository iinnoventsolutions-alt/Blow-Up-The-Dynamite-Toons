import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {makeProject,makePanel} from '../../src/model.ts';

// E2-AUD-01-F0: non-gating, isolated regression for pointerup arriving
// at a newer coordinate than the last pointermove.
function wav(){const rate=16000,n=rate*2,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);return b;}
const server=spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});
const url='http://127.0.0.1:4317';
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true});
 page.setDefaultTimeout(10000);
 page.on('dialog',d=>d.accept());
 page.on('pageerror',e=>console.error('PAGE ERROR:',e.message));
 await page.goto(url);
 const p=makeProject('E2 AUD quick release');
 p.scenes[0].panels.push(makePanel('Panel 2'),makePanel('Panel 3'));
 p.scenes[0].panels.forEach(panel=>panel.duration=24);
 await page.locator('input[type=file]').first().setInputFiles({name:'aud.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});
 await page.waitForTimeout(220);
 console.log('Timeline button count:',await page.getByRole('button',{name:'Timeline',exact:true}).count());
 await page.getByRole('button',{name:'Timeline',exact:true}).click();
 await page.locator('input[accept*=".wav"]').setInputFiles({name:'Voice.wav',mimeType:'audio/wav',buffer:wav()});
 const clip=page.locator('.audio-clip').first();
 await clip.waitFor();
 const save=async()=>{const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save project',exact:true}).click();return JSON.parse(await readFile(await (await pending).path(),'utf8'));};
 const events=[];
 await page.evaluate(()=>{window.__audEvents=[];for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,e=>{if(e.target.closest?.('.audio-lanes'))window.__audEvents.push({type,clientX:e.clientX,pointerId:e.pointerId,target:e.target.className?.toString?.().slice(0,50)});},true);});
 const measure=async()=> (await save()).audioTracks[0].clips[0].start;
 const drag=async(kind,dx=24)=>{
  const bb=await clip.boundingBox();assert(bb,'clip visible');const x=bb.x+Math.min(35,bb.width/2),y=bb.y+20;
  const before=await measure();
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x+dx,y,{steps:1});
  if(kind==='capture-loss'){
   await page.locator('.audio-lanes').evaluate(el=>{if(el.hasPointerCapture(1))el.releasePointerCapture(1);});
  }
  await page.mouse.up();
  const after=await measure();
  const log=await page.evaluate(()=>{const a=window.__audEvents;window.__audEvents=[];return a;});
  console.log(JSON.stringify({case:kind,before,after,delta:after-before,events:log}));
  return {before,after};
 };
 const first=await drag('native-rapid-release');
 assert.equal(first.after-first.before,12,'Native rapid drag must persist');
 const second=await drag('native-rapid-release');
 assert.equal(second.after-second.before,12,'Repeated native rapid drag must persist');
 const loss=await drag('capture-loss');
 assert.equal(loss.after-loss.before,12,'Unexpected capture loss must commit last valid drag position');
 console.log('PASS F4: native rapid release, repeated release and capture-loss recovery');
}finally{await browser?.close();server.kill();}
