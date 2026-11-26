import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {makeProject} from '../src/model.ts';
import {exportFormats,exportProfile,DESKTOP_ENCODED_OUTPUT_MAX_BYTES} from '../src/export-capabilities.ts';
assert.deepEqual(exportFormats.map(f=>[f.extension,f.available]),[['webm',true],['mp4',false],['mov',false]]);
assert.equal(DESKTOP_ENCODED_OUTPUT_MAX_BYTES,512*1024*1024);
const portrait=makeProject('Portrait profile');portrait.width=1080;portrait.height=1920;portrait.scenes[0].panels[0].duration=48;
const profile=exportProfile(portrait);assert.equal(profile.outputWidth,1080);assert.equal(profile.outputHeight,1920);assert.equal(profile.frames,48);assert.equal(profile.seconds,2);
const landscape=makeProject('Large landscape profile');landscape.width=3840;landscape.height=2160;assert.deepEqual([exportProfile(landscape).outputWidth,exportProfile(landscape).outputHeight],[1920,1080]);
const server=process.env.APP_URL?null:spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});
const url=process.env.APP_URL||'http://127.0.0.1:4317';
for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const page=await browser.newPage({viewport:{width:1500,height:1000}});page.setDefaultTimeout(10000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(url);
 await page.locator('input[type=file]').first().setInputFiles({name:'p4.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(portrait))});
 await page.getByRole('button',{name:'Timeline',exact:true}).click();
 await page.getByRole('button',{name:'Formats & limits',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Video formats & limits'});
 await dialog.waitFor();
 const content=await dialog.innerText();
 assert.match(content,/WebM \(\.webm\).*Available/);
 assert.match(content,/MP4 \(\.mp4\).*Not yet available/);
 assert.match(content,/MOV \(\.mov\).*Not yet available/);
 assert.match(content,/1080 × 1920/);
 assert.match(content,/48 frames \(2\.0 seconds\)/);
 assert.match(content,/512 MB/);
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 assert.equal(await dialog.count(),0);
 assert(await page.getByRole('button',{name:'Export animatic',exact:true}).isEnabled(),'Existing WebM export remains available');
 assert.deepEqual(errors,[]);
 console.log('PASS V1124-P4-A: truthful WebM/MP4/MOV support, orientation-safe HD dimensions, duration, output cap and unchanged exporter access.');
}finally{await browser.close();server?.kill();}
