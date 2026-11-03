import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import {makeProject,makePanel} from '../src/model.ts';

// RFU4-RA.4C.2D.1: actual pointer-driven OUT movement, resize and persistence.
const server=spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});
const url='http://127.0.0.1:4317';
for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true});
page.setDefaultTimeout(10000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const wait=()=>page.waitForTimeout(150);
const load=async p=>{await page.locator('input[type=file]').first().setInputFiles({name:'sequential-drag.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});await wait();};
const save=async()=>{const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save project',exact:true}).click();return JSON.parse(await readFile(await (await pending).path(),'utf8'));};
const seek=async f=>{await page.getByLabel('Scene camera time').fill(String(f));await wait();};
const outline=()=>page.locator('.stage-paper .camera-sequential-outline polygon');
const handles=()=>page.locator('.stage-paper .camera-sequential-out-overlay');
const drag=async(locator,dx,dy,steps=8)=>{const b=await locator.boundingBox();assert(b,'Drag handle must be visible');const x=b.x+b.width/2,y=b.y+b.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps});await page.mouse.up();await wait();};
try{
 const p=makeProject('Sequential camera drag acceptance'),s=p.scenes[0];
 s.panels.push(makePanel('Panel 2'),makePanel('Panel 3'));s.panels.forEach(panel=>panel.duration=60);
 p.schemaVersion=5;
 s.sequentialCamera={version:1,baseline:{x:960,y:540,zoom:1.4,rotation:0},panels:{
  [s.panels[1].id]:{mode:'animated',keys:[{frame:59,x:120,y:40,zoom:1.15,rotation:0,interpolation:'linear'}]}
 }};
 await page.goto(url);await load(p);await page.getByTitle('camera (C)',{exact:true}).click();await wait();
 await seek(60);
 const incoming=await outline().getAttribute('points');
 assert.equal(await handles().locator('[data-camera-endpoint="in"]').count(),1,'Green IN outline present');
 assert.equal(await handles().locator('[data-camera-endpoint="in"] [data-mode]').count(),0,'IN exposes no draggable handles');
 assert.equal(await page.getByLabel('Inherited camera IN').getAttribute('data-camera-locked'),'true','Inspector locks IN');
 await seek(119);
 assert.equal(await handles().count(),1,'Interactive OUT overlay available');
 const before=await outline().getAttribute('points');
 await drag(handles().locator('circle[data-mode="pan"]'),36,20);
 await seek(119);
 const moved=await outline().getAttribute('points');
 assert.notEqual(moved,before,'OUT center drag changes persisted outline');
 let saved=await save();
 const keyAfterMove=saved.scenes[0].sequentialCamera.panels[s.panels[1].id].keys.at(-1);
 assert.notEqual(keyAfterMove.x,120,'Center drag updates panel-owned OUT X offset');
 assert.equal(saved.scenes[0].camera.length,0,'No legacy camera keys created');
 await drag(handles().locator('rect[data-mode="zoom"]').first(),-35,-24);
 await seek(119);
 const resized=await outline().getAttribute('points');
 assert.notEqual(resized,moved,'OUT corner drag changes persisted geometry');
 saved=await save();
 const keyAfterResize=saved.scenes[0].sequentialCamera.panels[s.panels[1].id].keys.at(-1);
 assert.notEqual(keyAfterResize.zoom,keyAfterMove.zoom,'Resize changes panel-owned zoom');
 // A fast release must persist, not bounce back to the prior endpoint.
 await drag(handles().locator('circle[data-mode="pan"]'),-18,12,2);
 await seek(119);
 const rapid=await outline().getAttribute('points');
 assert.notEqual(rapid,resized,'Rapid release commits an updated OUT');
 await wait();assert.equal(await outline().getAttribute('points'),rapid,'No post-release snapback');
 await seek(60);assert.equal(await outline().getAttribute('points'),incoming,'Inherited IN is unaffected by OUT drag/resize');
 await seek(120);assert.equal(await outline().getAttribute('points'),rapid,'Next panel inherits final OUT');
 const maskToggle=page.getByRole('checkbox',{name:'Mask outside camera'});
 await maskToggle.check();await wait();
 const mask=page.locator('.stage-paper .camera-outside-mask path');
 assert.equal(await mask.count(),1,'Camera mask remains available');
 const downstreamMask=await mask.getAttribute('d');
 await seek(119);assert.equal(await mask.getAttribute('d'),downstreamMask,'Mask aligns across inherited OUT boundary');
 await maskToggle.uncheck();
 const final=await save();
 await page.getByTitle('Undo (⌘/Ctrl Z)').click();await wait();await seek(119);
 assert.equal(await outline().getAttribute('points'),resized,'Undo restores pre-rapid-drag OUT');
 await page.getByTitle('Redo (⌘/Ctrl Shift Z)').click();await wait();await seek(119);
 assert.equal(await outline().getAttribute('points'),rapid,'Redo restores rapid-drag OUT');
 await load(final);await page.getByTitle('camera (C)',{exact:true}).click();await wait();await seek(120);
 assert.equal(await outline().getAttribute('points'),rapid,'Save/reopen retains inherited OUT');
 assert.deepEqual(errors,[],'No browser runtime errors');
 console.log('PASS RFU4-RA.4C.2D.1: OUT drag, resize, rapid release, locked IN, mask, downstream, Undo/Redo, save/reopen.');
}catch(e){await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/sequential-out-drag-failure.png'});console.error(errors);throw e;}finally{await browser.close();server.kill();}
