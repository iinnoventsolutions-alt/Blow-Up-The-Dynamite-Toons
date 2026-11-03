import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import {makeProject,makePanel} from '../src/model.ts';

// RFU4-RA.4D.4A: browser-level sequential camera structural operations.
const server=spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});
const url='http://127.0.0.1:4317';
for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true});
page.setDefaultTimeout(10000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const wait=()=>page.waitForTimeout(180);
const load=async p=>{await page.locator('input[type=file]').first().setInputFiles({name:'sequential-structure.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});await wait();};
const save=async()=>{const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save project',exact:true}).click();return JSON.parse(await readFile(await (await pending).path(),'utf8'));};
const seek=async f=>{await page.getByLabel('Scene camera time').fill(String(f));await wait();};
const outline=()=>page.locator('.stage-paper .camera-sequential-outline polygon');
try{
 const p=makeProject('Sequential structural browser regression'),s=p.scenes[0];
 s.panels.push(makePanel('Animated'));s.panels.forEach(x=>x.duration=60);p.schemaVersion=5;
 const animated=s.panels[1];
 s.sequentialCamera={version:1,baseline:{x:960,y:540,zoom:1.4,rotation:0},panels:{
  [animated.id]:{mode:'animated',keys:[{frame:59,x:120,y:30,zoom:1.2,rotation:0,interpolation:'linear'}]}
 }};
 await page.goto(url);await load(p);await page.getByTitle('camera (C)',{exact:true}).click();await wait();
 await seek(119);const out=await outline().getAttribute('points');
 await page.getByRole('button',{name:'+ Panel',exact:true}).click();await wait();
 let saved=await save();assert.equal(saved.scenes[0].panels.length,3,'Add panel creates third panel');
 assert.equal(saved.scenes[0].sequentialCamera.panels[saved.scenes[0].panels[2].id],undefined,'New panel inherits without a camera override');
 await seek(120);assert.equal(await outline().getAttribute('points'),out,'Added panel inherits animated OUT');
 // Select animated panel via timeline seek, then duplicate using Drawing workspace.
 await seek(60);await page.getByTitle('Duplicate selected panel').click();await wait();
 saved=await save();assert.equal(saved.scenes[0].panels.length,4,'Duplicate creates another panel');
 const copy=saved.scenes[0].panels[2];
 assert.equal(saved.scenes[0].sequentialCamera.panels[copy.id].mode,'animated','Duplicate preserves panel-owned animation');
 assert.notEqual(copy.id,animated.id,'Duplicate receives a fresh panel identity');
 await seek(179);const duplicateOut=await outline().getAttribute('points');
 await seek(180);assert.equal(await outline().getAttribute('points'),duplicateOut,'Downstream panel inherits duplicated OUT');
 await page.getByTitle('Delete selected panel').click();
 await page.getByRole('button',{name:'Discard / Delete',exact:true}).click();await wait();
 saved=await save();assert.equal(saved.scenes[0].panels.length,3,'Delete removes selected downstream panel');
 assert.equal(saved.scenes[0].sequentialCamera.panels[copy.id].mode,'animated','Deletion preserves surviving animated state');
 await page.getByTitle('Undo (⌘/Ctrl Z)').click();await wait();
 saved=await save();assert.equal(saved.scenes[0].panels.length,4,'Undo restores deleted panel');
 await page.getByTitle('Redo (⌘/Ctrl Shift Z)').click();await wait();
 saved=await save();assert.equal(saved.scenes[0].panels.length,3,'Redo removes it again');
 await load(saved);await page.getByTitle('camera (C)',{exact:true}).click();await wait();
 assert.equal((await save()).scenes[0].sequentialCamera.panels[copy.id].mode,'animated','Save/reopen preserves duplicated camera');
 assert.deepEqual(errors,[],'No browser runtime errors');
 console.log('PASS RFU4-RA.4D.4A: add, duplicate, delete, camera inheritance, Undo/Redo, save/reopen.');
}catch(e){await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/sequential-structure-failure.png'});console.error(errors);throw e;}finally{await browser.close();server.kill();}
