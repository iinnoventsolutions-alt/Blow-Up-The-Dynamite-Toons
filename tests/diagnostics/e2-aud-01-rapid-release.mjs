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
 const initial=(await save()).audioTracks[0].clips[0].start;
 const b=await clip.boundingBox();assert(b,'Clip bounding box exists');
 const x=b.x+b.width/2,y=b.y+20;
 const scale=await page.evaluate(()=>document.querySelector('.audio-clip').getBoundingClientRect().width/48);
 // Native mouse-down establishes actual capture; synthetic release at an advanced
 // coordinate isolates the missing final pointermove case.
 await page.mouse.move(x,y);
 await page.mouse.down();
 await page.locator('.audio-lanes').dispatchEvent('pointerup',{pointerId:1,pointerType:'mouse',button:0,buttons:0,clientX:x+24,clientY:y,bubbles:true});
 await page.mouse.up();
 const actual=(await save()).audioTracks[0].clips[0].start;
 const expected=initial+Math.round(24/scale);
 console.log(JSON.stringify({case:'rapid release without final move',initial,actual,expected,scale,pass:actual===expected}));
 assert.equal(actual,expected,'Release must incorporate final pointer coordinates, not stale last pointermove');
 console.log('PASS E2-AUD-01-F0 rapid-release persistence');
}finally{await browser?.close();server.kill();}
