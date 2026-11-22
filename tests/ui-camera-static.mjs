import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { makeProject, makePanel } from '../src/model.ts';

// RFU4-RA.2C: dedicated static-camera acceptance coverage. Keep the established
// animated-camera regression suite (ui-camera.mjs) independent and unchanged.
const server=spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});
const url='http://127.0.0.1:4317';
for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true});
page.setDefaultTimeout(10000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const wait=()=>page.waitForTimeout(120);
const save=async()=>{const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save project',exact:true}).click();return JSON.parse(await readFile(await (await pending).path(),'utf8'));};
const load=async project=>{await page.locator('input[type=file]').first().setInputFiles({name:'static-camera.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await wait();};
const overlay=()=>page.locator('.stage-paper .camera-overlay');
const assertStatic=async label=>{
 assert.equal(await overlay().locator('text').filter({hasText:/^CAMERA$/}).count(),1,`${label}: one CAMERA label`);
 assert.equal(await overlay().locator('text').filter({hasText:/^(IN|OUT)$/}).count(),0,`${label}: no animated endpoint labels`);
 assert.equal(await overlay().locator('[data-camera-endpoint]').count(),0,`${label}: no endpoint groups`);
 assert.equal(await overlay().locator('.camera-current').count(),0,`${label}: no animated playhead outline`);
 assert.equal(await overlay().locator('.camera-frame').count(),1,`${label}: one camera outline`);
};
const drag=async(locator,dx,dy)=>{
 const box=await locator.boundingBox();assert(box,'Camera drag handle must be visible');
 const x=box.x+box.width/2,y=box.y+box.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:8});await page.mouse.up();await wait();
};
try{
 const project=makeProject('RFU4-RA static camera');
 project.scenes[0].panels.push(makePanel('Panel 2'));
 project.scenes[0].panels.forEach(p=>p.duration=60);
 await page.goto(url);await load(project);
 await page.getByTitle('camera (C)',{exact:true}).click();await wait();
 await assertStatic('initial static panel');
 await drag(overlay().locator('circle[data-mode="pan"]'),35,15);
 let saved=await save();
 assert.equal(saved.scenes[0].camera.length,0,'Static drag must not create scene keyframes');
 const first=saved.scenes[0].panels[0].staticCamera;
 assert(first&&first.x>project.width/2,'Static drag must persist a new camera position');
 await assertStatic('after static drag');
 await drag(overlay().locator('rect[data-mode="zoom"]').first(),-30,-20);
 saved=await save();
 assert.equal(saved.scenes[0].camera.length,0,'Static resize must not create scene keyframes');
 assert.notEqual(saved.scenes[0].panels[0].staticCamera.zoom,first.zoom,'Static resize must persist zoom');
 const firstFinal=saved.scenes[0].panels[0].staticCamera;
 await page.getByLabel('Scene camera time').fill('60');await wait();
 await assertStatic('second panel before edit');
 await drag(overlay().locator('circle[data-mode="pan"]'),-30,12);
 saved=await save();
 assert.equal(saved.scenes[0].camera.length,0,'Second static panel must not create scene keys');
 assert.deepEqual(saved.scenes[0].panels[0].staticCamera,firstFinal,'Second-panel edit must not alter first-panel pose');
 assert(saved.scenes[0].panels[1].staticCamera,'Second panel must retain its own pose');
 await page.getByLabel('Scene camera time').fill('0');await wait();
 await assertStatic('first panel after switching');
 await load(saved);
 await page.getByTitle('camera (C)',{exact:true}).click();await wait();
 const reopened=await save();
 assert.deepEqual(reopened.scenes[0].panels[0].staticCamera,firstFinal,'Save/reopen preserves first pose');
 assert.deepEqual(reopened.scenes[0].panels[1].staticCamera,saved.scenes[0].panels[1].staticCamera,'Save/reopen preserves second pose');
 await page.getByRole('button',{name:'Add keyframe at beginning of current panel'}).click();await wait();
 const animated=await save();
 assert(animated.scenes[0].camera.some(k=>k.frame===0),'Explicit keyframe creates an animated camera key');
 assert.equal(await overlay().locator('[data-camera-endpoint="in"]').count(),1,'Explicit key enables IN outline');
 assert.equal(await overlay().locator('[data-camera-endpoint="out"]').count(),1,'Explicit key enables OUT outline');
 await page.getByRole('button',{name:'Delete key',exact:true}).click();await wait();
 assert.equal((await save()).scenes[0].camera.length,0,'Deleting final key restores no-key state');
 await assertStatic('after final key deletion');
 assert.deepEqual(errors,[],'No browser runtime errors');
 console.log('PASS RFU4-RA.2C: static drag/resize, no implicit keys, panel isolation, save/reopen, explicit animation and final-key deletion.');
}catch(e){await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/camera-static-failure.png'});console.error(errors);throw e;}finally{await browser.close();server.kill();}
