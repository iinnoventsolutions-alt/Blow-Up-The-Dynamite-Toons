import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { makeProject, makePanel } from '../src/model.ts';

// RFU4-RA.4C.1C: read-only sequential stage/mask regression.
// Deliberately separate from legacy camera interaction acceptance.
const server=spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});
const url='http://127.0.0.1:4317';
for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const page=await browser.newPage({viewport:{width:1500,height:1000}});
page.setDefaultTimeout(10000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const wait=()=>page.waitForTimeout(120);
const load=async p=>{await page.locator('input[type=file]').first().setInputFiles({name:'sequential-ui.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});await wait();};
const polygon=()=>page.locator('.stage-paper .camera-sequential-outline polygon');
const mask=()=>page.locator('.stage-paper .camera-outside-mask path');
const points=async()=>polygon().getAttribute('points');
const seek=async frame=>{await page.getByLabel('Scene camera time').fill(String(frame));await wait();};
try{
 const p=makeProject('Sequential UI regression'),s=p.scenes[0];
 s.panels.push(makePanel('Panel 2'));s.panels.push(makePanel('Panel 3'));
 s.panels.forEach(x=>x.duration=60);
 p.schemaVersion=5;
 s.sequentialCamera={version:1,baseline:{x:1050,y:510,zoom:1.4,rotation:0},panels:{
  [s.panels[1].id]:{mode:'animated',keys:[{frame:59,x:180,y:45,zoom:1.25,rotation:0,interpolation:'linear'}]}
 }};
 await page.goto(url);await load(p);
 assert.equal(await polygon().count(),1,'Sequential outline is visible');
 assert.equal(await page.locator('.stage-paper .camera-overlay').count(),0,'Legacy interactive overlay is not displayed for sequential storage');
 const first=await points();assert(first,'First panel camera outline exists');
 // Camera mask control lives in the Camera inspector, not the default Panel inspector.
 await page.getByTitle('camera (C)',{exact:true}).click();await wait();
 const copyCamera=page.getByRole('button',{name:'Copy camera from selected panel'});
 const pasteCamera=page.getByRole('button',{name:'Paste camera on selected panel'});
 assert.equal(await copyCamera.count(),1,'Sequential copy action is visible');
 assert.equal(await pasteCamera.isDisabled(),true,'Paste disabled before sequential copy');
 await copyCamera.click();await wait();
 assert.equal(await pasteCamera.isEnabled(),true,'Sequential copy enables paste');
 const originalFirst=await points();
 await seek(60);
 await pasteCamera.click();await wait();
 assert.equal(await points(),originalFirst,'Pasted static camera replaces animated destination framing');
 await seek(119);
 assert.equal(await points(),originalFirst,'Pasted static camera remains static through destination OUT');
 await seek(120);
 assert.equal(await points(),originalFirst,'Downstream camera inherits pasted static OUT');
 await seek(0);
 await load(p); // Restore original animated fixture for existing mask and inheritance assertions.


 const rotationHandle=page.locator('.camera-sequential-out-overlay [data-mode="rotate"]');
 // RC1: rotation affordance is available on the editable sequential overlay.
 assert.equal(await rotationHandle.count(),1,'Sequential camera exposes one cyan rotation handle');
 assert.equal(await rotationHandle.getAttribute('fill'),'#15c7e8','Rotation handle uses cyan accent');
 const checkbox=page.getByRole('checkbox',{name:'Mask outside camera'});
 await checkbox.check();await wait();
 assert.equal(await mask().count(),1,'Sequential dark mask is visible');
 const firstMask=await mask().getAttribute('d');
 await seek(60);
 assert.equal(await points(),first,'Second panel IN inherits first panel OUT');
 assert.equal(await mask().getAttribute('d'),firstMask,'Inherited camera mask matches first panel');
 await seek(119);
 const secondOut=await points();
 assert.notEqual(secondOut,first,'Animated second panel changes outline');
 assert.notEqual(await mask().getAttribute('d'),firstMask,'Mask follows animated OUT');
 await seek(120);
 assert.equal(await points(),secondOut,'Third panel inherits second panel OUT');
 await seek(0);
 assert.equal(await points(),first,'Seeking back restores original baseline');
 await checkbox.uncheck();
 assert.equal(await mask().count(),0,'Mask toggle removes dark mask');
 assert.deepEqual(errors,[],'No browser runtime errors');
 // RC1.1-A: first panel IN is editable, later panels remain inherited and locked.
 await seek(0);
 await page.getByRole('button',{name:'Animate sequential camera IN/OUT'}).click();await wait();
 assert.equal(await page.getByLabel('Editable camera IN').count(),1,'First panel IN is editable');
 assert.equal(await page.getByRole('button',{name:'Select editable IN'}).count(),1,'First panel exposes editable IN selection');
 await page.getByRole('button',{name:'Select editable IN'}).click();await wait();
 assert.equal(await page.locator('.camera-sequential-out-overlay text').filter({hasText:/^IN$/}).count(),1,'First panel overlay edits IN');
 assert.equal(await page.locator('.camera-sequential-out-overlay [aria-label="Persistent camera OUT outline"] polygon').count(),1,'Red OUT outline persists while green IN is selected');
 assert.equal(await page.locator('.camera-sequential-out-overlay [aria-label="Persistent camera OUT outline"] text').textContent(),'OUT','Persistent red OUT remains labeled');
 await page.getByRole('button',{name:'Select drawing camera OUT'}).click();await wait();
 assert.equal(await page.locator('.camera-sequential-out-overlay [data-camera-endpoint="out"] polygon').count(),1,'Red OUT is editable when selected');
 assert.equal(await page.locator('.camera-sequential-out-overlay [data-camera-endpoint="in"] polygon').count(),1,'Green IN remains visible while red OUT is selected');
 await page.getByRole('button',{name:'Select drawing camera IN'}).click();await wait();
 assert.equal(await page.locator('.camera-sequential-out-overlay [aria-label="Persistent camera OUT outline"] polygon').count(),1,'Red OUT returns when selecting green IN');
 const input=page.getByLabel('IN X',{exact:true});
 await input.fill('1125');await input.press('Enter');await wait();
 assert.equal(await page.getByLabel('IN X',{exact:true}).inputValue(),'1125','Numeric first-panel IN edit persists');
 await seek(60);
 assert.equal(await page.getByLabel('Inherited camera IN').count(),1,'Later panel IN remains inherited');
 assert.equal(await page.locator('.camera-sequential-out-overlay text').filter({hasText:/IN · LOCKED/}).count(),1,'Later panel IN remains locked on stage');
 await seek(0);
 assert.equal(await page.getByLabel('IN X',{exact:true}).inputValue(),'1125','First-panel IN survives seeking');
 await load(p);
 // Legacy rendering must remain on the existing overlay path.
 const legacy=makeProject('Legacy UI regression');
 legacy.scenes[0].camera.push({id:'key-a',frame:0,x:960,y:540,zoom:1,rotation:0,interpolation:'linear'});
 await load(legacy);
 assert.equal(await page.locator('.stage-paper .camera-sequential-outline').count(),0,'Legacy scene has no sequential outline');
 assert.equal(await page.locator('.stage-paper .camera-overlay').count(),1,'Legacy camera overlay remains visible');
 assert.deepEqual(errors,[],'No browser runtime errors after legacy load');
 console.log('PASS RFU4-RA.4C.1C: inherited outline, moving mask, downstream OUT, seek reset, legacy overlay.');
}catch(e){await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/sequential-camera-ui-failure.png'});console.error(errors);throw e;}finally{await browser.close();server.kill();}
