import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { makeProject, makePanel } from '../src/model.ts';

// RFU4-RA.4C.2C.1: end-to-end sequential OUT numeric editing and history.
const server=spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});
const url='http://127.0.0.1:4317';
for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true});
page.setDefaultTimeout(10000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const wait=()=>page.waitForTimeout(150);
const load=async p=>{await page.locator('input[type=file]').first().setInputFiles({name:'sequential-out.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});await wait();};
const save=async()=>{const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save project',exact:true}).click();return JSON.parse(await readFile(await (await pending).path(),'utf8'));};
const seek=async frame=>{await page.getByLabel('Scene camera time').fill(String(frame));await wait();};
const outline=()=>page.locator('.stage-paper .camera-sequential-outline polygon');
const setNumber=async(label,value)=>{const field=page.getByRole('spinbutton',{name:label,exact:true});await field.fill(String(value));await field.press('Enter');await wait();};
try{
 const p=makeProject('Sequential OUT numeric regression'),s=p.scenes[0];
 s.panels.push(makePanel('Panel 2'),makePanel('Panel 3'));s.panels.forEach(x=>x.duration=60);
 p.schemaVersion=5;
 s.sequentialCamera={version:1,baseline:{x:1050,y:510,zoom:1.4,rotation:0},panels:{
  [s.panels[1].id]:{mode:'animated',keys:[{frame:59,x:180,y:45,zoom:1.25,rotation:0,interpolation:'linear'}]}
 }};
 await page.goto(url);await load(p);
 await page.getByTitle('camera (C)',{exact:true}).click();await wait();
 await seek(60);
 assert.equal(await page.getByLabel('Inherited camera IN').getAttribute('data-camera-locked'),'true');
 assert.equal(await page.getByRole('spinbutton',{name:'OUT X'}).count(),1,'Animated OUT is editable');
 assert.equal(await page.getByRole('spinbutton',{name:'IN X'}).count(),0,'Inherited IN has no numeric editor');
 const inOutline=await outline().getAttribute('points');
 await seek(119);const originalOut=await outline().getAttribute('points');
 await setNumber('OUT X',1400);
 const changedX=await outline().getAttribute('points');
 assert.notEqual(changedX,originalOut,'OUT X changes rendered endpoint');
 await setNumber('OUT zoom',2);
 const changedZoom=await outline().getAttribute('points');
 assert.notEqual(changedZoom,changedX,'OUT zoom changes rendered endpoint');
 await seek(60);assert.equal(await outline().getAttribute('points'),inOutline,'Inherited IN remains fixed');
 await seek(120);assert.equal(await outline().getAttribute('points'),changedZoom,'Next panel inherits edited OUT');
 let saved=await save();
 assert.equal(saved.scenes[0].camera.length,0,'Sequential editing creates no legacy scene keys');
 assert.equal(saved.scenes[0].sequentialCamera.panels[s.panels[1].id].mode,'animated');
 await page.getByTitle('Undo (⌘/Ctrl Z)').click();await wait();
 await seek(120);assert.equal(await outline().getAttribute('points'),changedX,'Undo restores prior OUT zoom');
 await page.getByTitle('Redo (⌘/Ctrl Shift Z)').click();await wait();
 await seek(120);assert.equal(await outline().getAttribute('points'),changedZoom,'Redo restores edited OUT zoom');
 await load(saved);await page.getByTitle('camera (C)',{exact:true}).click();await wait();
 await seek(120);assert.equal(await outline().getAttribute('points'),changedZoom,'Save/reopen preserves propagated OUT');
 const legacy=makeProject('Legacy camera isolation');
 legacy.scenes[0].camera.push({id:'legacy-key',frame:0,x:960,y:540,zoom:1,rotation:0,interpolation:'linear'});
 await load(legacy);await page.getByTitle('camera (C)',{exact:true}).click();await wait();
 assert.equal(await page.getByRole('spinbutton',{name:'OUT X'}).count(),0,'Sequential numeric controls absent in legacy scenes');
 assert.equal(await page.locator('.stage-paper .camera-overlay').count(),1,'Legacy camera overlay remains available');
 assert.deepEqual(errors,[],'No browser errors');
 console.log('PASS RFU4-RA.4C.2C.1: numeric OUT, locked IN, downstream inheritance, Undo/Redo, save/reopen, legacy isolation.');
}catch(e){await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/sequential-out-edit-failure.png'});console.error(errors);throw e;}finally{await browser.close();server.kill();}
