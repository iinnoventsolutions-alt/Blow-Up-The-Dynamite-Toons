import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {makeProject,uid} from '../src/model.ts';

// E2-AUD-01-F0: isolated, non-gating reproduction. Deliberately send release
// at a newer coordinate than the last pointermove, as can occur on rapid release.
// Do not change production code or add to the standard UI gate until diagnosed.
const server=spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});
const url='http://127.0.0.1:4317';
let browser;
try {
 for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true});
 page.on('dialog',d=>d.accept());
 await page.goto(url);
 const p=makeProject('E2 AUD quick release');
 const assetId=uid(),trackId=uid(),clipId=uid();
 p.audioAssets.push({id:assetId,name:'test.wav',source:'data:audio/wav;base64,',duration:8,sampleRate:16000,channels:1,peaks:Array(160).fill(.2)});
 p.audioTracks.push({id:trackId,name:'Voice',gain:1,mute:false,solo:false,clips:[{id:clipId,assetId,name:'test.wav',start:12,offset:0,duration:48,gain:1}]});
 await page.locator('input[type=file]').first().setInputFiles({name:'aud.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});
 await page.getByRole('button',{name:'Timeline',exact:true}).click();
 const clip=page.locator('[data-audio-clip]').first(),root=page.locator('.audio-lanes');
 await clip.waitFor();
 const save=async()=>{const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save project',exact:true}).click();return JSON.parse(await readFile(await (await pending).path(),'utf8'));};
 const b=await clip.boundingBox();assert(b,'Clip bounding box exists');
 const x=b.x+b.width/2,y=b.y+20;
 const scale=await page.evaluate(()=>{const c=document.querySelector('[data-audio-clip]');return c.getBoundingClientRect().width/48;});
 // Pointer events are dispatched on the same stable lane container where
 // pointer capture sends events. A release at +24px with no intervening move
 // should still commit the released coordinate rather than the stale draft.
 await clip.dispatchEvent('pointerdown',{pointerId:1,pointerType:'mouse',button:0,buttons:1,clientX:x,clientY:y,bubbles:true});
 await root.dispatchEvent('pointerup',{pointerId:1,pointerType:'mouse',button:0,buttons:0,clientX:x+24,clientY:y,bubbles:true});
 const saved=await save(),actual=saved.audioTracks[0].clips[0].start,expected=12+Math.round(24/scale);
 console.log(JSON.stringify({case:'rapid release without final move',actual,expected,scale,pass:actual===expected}));
 assert.equal(actual,expected,'Release must incorporate final pointer coordinates, not stale last pointermove');
 console.log('PASS E2-AUD-01-F0 rapid-release persistence');
} finally {await browser?.close();server.kill();}
