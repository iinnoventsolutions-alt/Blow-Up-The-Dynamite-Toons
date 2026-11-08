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
 const outline=page.locator('.stage-paper .camera-sequential-outline polygon');
 const save=async()=>{const download=page.waitForEvent('download');await page.getByRole('button',{name:'Save project',exact:true}).click();return JSON.parse(await readFile(await (await download).path(),'utf8'));};
 const original=await outline.getAttribute('points');
 const modes=[
  {name:'pan',locator:()=>overlay.locator('circle[data-mode="pan"]').first(),dx:42,dy:28},
  {name:'zoom',locator:()=>overlay.locator('rect[data-mode="zoom"]').first(),dx:-35,dy:-25},
  {name:'rotate',locator:()=>overlay.locator('circle[data-mode="rotate"]').first(),dx:46,dy:35}
 ];
 for(const mode of modes){
  const before=await outline.getAttribute('points');
  const box=await mode.locator().boundingBox();assert(box,mode.name+' handle visible');
  const x=box.x+box.width/2,y=box.y+box.height/2;
  await page.getByLabel('Scene camera time').focus();
  await page.mouse.move(x,y);await page.mouse.down();
  await page.mouse.move(x+mode.dx,y+mode.dy,{steps:8});
  await page.keyboard.press('Escape');
  await page.mouse.up();await wait();
  assert.equal(await outline.getAttribute('points'),before,mode.name+': Escape must preserve original camera pose');
 }
 const savedAfterCancel=await save();
 assert.equal(savedAfterCancel.scenes[0].sequentialCamera.panels[panel.id].keys.at(-1).x,100,'Canceled gestures do not persist camera edits');
 // Normal release must still commit after canceled interactions.
 const pan=await modes[0].locator().boundingBox();assert(pan,'Pan handle remains usable');
 const px=pan.x+pan.width/2,py=pan.y+pan.height/2;
 await page.mouse.move(px,py);await page.mouse.down();await page.mouse.move(px+42,py+28,{steps:8});await page.mouse.up();await wait();
 assert.notEqual(await outline.getAttribute('points'),original,'Normal pointer release commits after Escape cancellations');
 const savedAfterCommit=await save();
 assert.notEqual(savedAfterCommit.scenes[0].sequentialCamera.panels[panel.id].keys.at(-1).x,100,'Normal release persists edited pose');
 console.log('PASS RFU4-RC1.1-D1.1: Escape cancels pan/zoom/rotation and normal release commits');
}catch(e){await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/rc11-d0-escape-reproduction.png'});throw e;}finally{await browser.close();server.kill();}
