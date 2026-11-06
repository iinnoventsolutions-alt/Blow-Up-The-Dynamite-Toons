import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import {makeProject} from '../src/model.ts';

// RFU4-RC1.1-D0: intentionally failing reproduction, NOT included in npm run test:ui.
// Escape must discard a live sequential camera drag even when keyboard focus is elsewhere.
const server=spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});
const url='http://127.0.0.1:4317';
for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true});
page.setDefaultTimeout(10000);
const wait=()=>page.waitForTimeout(120);
try{
 const project=makeProject('Escape camera cancellation reproduction'),scene=project.scenes[0],panel=scene.panels[0];
 panel.duration=60;project.schemaVersion=5;
 scene.sequentialCamera={version:1,baseline:{x:960,y:540,zoom:1.3,rotation:0},panels:{
  [panel.id]:{mode:'animated',keys:[{frame:59,x:100,y:40,zoom:1.2,rotation:0,interpolation:'linear'}]}
 }};
 await page.goto(url);
 await page.locator('input[type=file]').first().setInputFiles({name:'escape-repro.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.getByTitle('camera (C)',{exact:true}).click();
 await page.getByLabel('Scene camera time').fill('59');await wait();
 const overlay=page.locator('.stage-paper .camera-sequential-out-overlay');
 const handle=overlay.locator('circle[data-mode="pan"]').first();
 const before=await page.locator('.stage-paper .camera-sequential-outline polygon').getAttribute('points');
 const box=await handle.boundingBox();assert(box,'Camera drag handle visible');
 const x=box.x+box.width/2,y=box.y+box.height/2;
 // Focus stays on inspector range, not the SVG. Real mouse input does not focus SVG.
 await page.getByLabel('Scene camera time').focus();
 await page.mouse.move(x,y);await page.mouse.down();
 await page.mouse.move(x+42,y+28,{steps:8});
 const live=await overlay.locator('[data-camera-endpoint="out"] polygon').first().getAttribute('points');
 assert(live,'Live camera outline exists while dragging');
 await page.keyboard.press('Escape');
 await page.mouse.up();await wait();
 const after=await page.locator('.stage-paper .camera-sequential-outline polygon').getAttribute('points');
 assert.equal(after,before,'Escape during sequential drag must preserve original camera pose');
 console.log('PASS RFU4-RC1.1-D0: Escape discarded active camera drag');
}catch(e){await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/rc11-d0-escape-reproduction.png'});throw e;}finally{await browser.close();server.kill();}
