import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import {makeProject,makePanel} from '../src/model.ts';

// RFU4-RA.4D.4B: real drag/drop and inspector duration editing.
const server=spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});
const url='http://127.0.0.1:4317';
for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true});
page.setDefaultTimeout(15000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const wait=()=>page.waitForTimeout(200);
const load=async p=>{await page.locator('input[type=file]').first().setInputFiles({name:'sequential-order-duration.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});await wait();};
const save=async()=>{const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save project',exact:true}).click();return JSON.parse(await readFile(await (await pending).path(),'utf8'));};
const seek=async f=>{await page.getByLabel('Scene camera time').fill(String(f));await wait();};
const outline=()=>page.locator('.stage-paper .camera-sequential-outline polygon');
const card=id=>page.locator('.panel-card[data-panel-id="'+id+'"]');
try{
 const p=makeProject('Sequential reorder and duration browser regression'),s=p.scenes[0];
 s.panels.push(makePanel('Animated'),makePanel('Following'));s.panels.forEach(x=>x.duration=60);
 const [first,animated,following]=s.panels;p.schemaVersion=5;
 s.sequentialCamera={version:1,baseline:{x:960,y:540,zoom:1.4,rotation:0},panels:{
  [animated.id]:{mode:'animated',keys:[{frame:30,x:60,y:10,zoom:1.1,rotation:0,interpolation:'ease'},{frame:59,x:120,y:30,zoom:1.2,rotation:0,interpolation:'linear'}]}
 }};
 await page.goto(url);await load(p);await page.getByTitle('camera (C)',{exact:true}).click();await wait();
 await seek(59);const baseline=await outline().getAttribute('points');
 await seek(119);const animatedOut=await outline().getAttribute('points');
 await seek(120);assert.equal(await outline().getAttribute('points'),animatedOut,'Following panel inherits OUT before reorder');
 // Drag the animated panel before the original first panel using the real HTML5 drop slot.
 await card(animated.id).dragTo(page.locator('.panel-drop-slot[data-before-panel="'+first.id+'"]'));await wait();
 let saved=await save();
 assert.deepEqual(saved.scenes[0].panels.map(x=>x.id),[animated.id,first.id,following.id],'Drag/drop changes panel order');
 assert.deepEqual(saved.scenes[0].sequentialCamera.panels[animated.id].keys.map(k=>k.frame),[30,59],'Relative camera keys remain owned by moved panel');
 await seek(59);const movedOut=await outline().getAttribute('points');
 assert.equal(movedOut,animatedOut,'Reordered animated panel retains its relative OUT against same baseline');
 await seek(60);assert.equal(await outline().getAttribute('points'),movedOut,'Reordered next panel inherits OUT');
 await page.getByTitle('Undo (⌘/Ctrl Z)').click();await wait();
 assert.deepEqual((await save()).scenes[0].panels.map(x=>x.id),[first.id,animated.id,following.id],'Undo restores original order');
 await page.getByTitle('Redo (⌘/Ctrl Shift Z)').click();await wait();
 assert.deepEqual((await save()).scenes[0].panels.map(x=>x.id),[animated.id,first.id,following.id],'Redo restores reordered panels');
 // Change the moved animated panel duration via the actual Panel inspector.
 await seek(0);
 await page.getByRole('tab',{name:'Panel',exact:true}).click();await wait();
 const duration=page.getByRole('spinbutton',{name:/Duration in (seconds|frames)/});
 assert.equal(await duration.count(),1,'Panel duration editor is visible');
 const label=await duration.getAttribute('aria-label');
 const newValue=label==='Duration in frames'?'120':String(120/p.fps);
 await duration.fill(newValue);await duration.press('Enter');await wait();
 saved=await save();
 assert.equal(saved.scenes[0].panels[0].duration,120,'Duration editor commits 120 frames');
 assert.deepEqual(saved.scenes[0].sequentialCamera.panels[animated.id].keys.map(k=>k.frame),[61,119],'Intermediate and OUT keys retime proportionally');
 await seek(119);const extendedOut=await outline().getAttribute('points');
 assert.equal(extendedOut,movedOut,'Extending duration preserves OUT pose');
 await seek(120);assert.equal(await outline().getAttribute('points'),extendedOut,'Downstream IN inherits retimed OUT');
 await page.getByTitle('Undo (⌘/Ctrl Z)').click();await wait();
 saved=await save();assert.equal(saved.scenes[0].panels[0].duration,60,'Undo restores original duration');
 await page.getByTitle('Redo (⌘/Ctrl Shift Z)').click();await wait();
 saved=await save();assert.equal(saved.scenes[0].panels[0].duration,120,'Redo restores extended duration');
 await load(saved);await page.getByTitle('camera (C)',{exact:true}).click();await wait();
 await seek(120);assert.equal(await outline().getAttribute('points'),extendedOut,'Save/reopen retains downstream inheritance');
 assert.deepEqual(errors,[],'No browser runtime errors');
 console.log('PASS RFU4-RA.4D.4B: drag/drop reorder, duration retiming, inherited IN/OUT, Undo/Redo, save/reopen.');
}catch(e){await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/sequential-order-duration-failure.png'});console.error(errors);throw e;}finally{await browser.close();server.kill();}
