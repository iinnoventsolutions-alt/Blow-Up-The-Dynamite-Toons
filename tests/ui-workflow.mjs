import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import {makeProject,makeScene,makePanel,uid,cameraAt,findPanel} from '../src/model.ts';
const server=spawn(process.execPath,['desktop/preview.cjs'],{stdio:'ignore'});for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4317')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})}),page=await browser.newPage({viewport:{width:1500,height:1000},acceptDownloads:true});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
const installImportDiagnostics=async () => page.evaluate(() => {
  window.__importTrace = {changes:0,notifications:[],lastFile:null};
  const selector='input[accept="image/png,image/jpeg,image/webp"]';
  const field=document.querySelector(selector);
  field?.addEventListener('change',event=>{
    const file=event.target.files?.[0];
    window.__importTrace.changes++;
    window.__importTrace.lastFile=file?{name:file.name,size:file.size,type:file.type}:null;
  },{capture:true});
  const watch=()=>{const items=[...document.querySelectorAll('[role="status"]')].map(n=>n.textContent?.trim()).filter(Boolean);for(const message of items)if(!window.__importTrace.notifications.includes(message))window.__importTrace.notifications.push(message);};
  new MutationObserver(watch).observe(document.body,{subtree:true,childList:true,characterData:true});
  watch();
});
const expectImageImportError=async (phrase) => {
 try {
  // Verify the notification was actually rendered, even if the 7-second toast expires
  // before a CI-loaded browser polls the live status locator.
  await page.waitForFunction(expected => window.__importTrace?.notifications.some(message => message.includes(expected)),phrase,{timeout:12000});
 } catch (error) {
  const status=await page.locator('[role=status]').allTextContents().catch(()=>[]);
  const trace=await page.evaluate(()=>window.__importTrace).catch(()=>null);
  const inputs=await page.locator('input[accept="image/png,image/jpeg,image/webp"]').evaluateAll(nodes=>nodes.map(n=>({value:n.value,files:n.files?.length}))).catch(()=>[]);
  const layers=await page.locator('.layer-row').count().catch(()=>null);
  console.error('Image import diagnostic:',JSON.stringify({expected:phrase,status,trace,inputs,layers,pageErrors:errors,url:page.url()}));
  throw error;
 }
};
const label=n=>page.getByLabel(n,{exact:true}),button=n=>page.getByRole('button',{name:n,exact:true}),prefs=async cat=>{await page.getByTitle('Preferences',{exact:true}).click();await category(cat);},category=async name=>page.getByRole('dialog').getByRole('button',{name,exact:true}).click();
const number=async(n,v)=>{await label(n).fill(String(v));await label(n).press('Tab');};
const save=async()=>{const pending=page.waitForEvent('download');await button('Save project').click();const d=await pending;return JSON.parse(await readFile(await d.path(),'utf8'));};
const load=async p=>{await page.locator('input[type=file]').first().setInputFiles({name:'workflow.issb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});await page.locator('.workspace-tabs').waitFor();};
function poseCheck(p,next,id){const a=findPanel(p,id),b=findPanel(next,id);let sa=0,sb=0;for(const panel of a.scene.panels){if(panel.id===id)break;sa+=panel.duration;}for(const panel of b.scene.panels){if(panel.id===id)break;sb+=panel.duration;}for(let f=0;f<a.panel.duration;f++)for(const key of ['x','y','zoom','rotation'])assert(Math.abs(cameraAt(a.scene,sa+f,p)[key]-cameraAt(b.scene,sb+f,next)[key])<1e-7);}
try{
 await mkdir('test-results',{recursive:true});await page.goto('http://127.0.0.1:4317');
 await prefs('General');await number('Default project width',1280);await number('Default project height',720);await number('Default project frame rate',30);await number('Default panel duration · seconds',3);await label('Remember the last workspace when opening projects').check();await label('Warn when deleting audio tracks').uncheck();
 await category('Drawing');await label('Default new layer type').selectOption('bitmap');await label('Default selection mode').selectOption('lasso');await number('Default bucket gap tolerance',2);
 await category('Naming');await number('Scene number minimum digits · 0 disables padding',3);await number('Panel number minimum digits · 0 disables padding',2);await number('Scene number increment',10);
 await category('Import / Export');await number('PNG export maximum edge · pixels',256);await category('Pitch');await label('Show captions in Pitch').uncheck();await button('Done').click();
 await button('+ Create storyboard').click();assert.equal(await label('Width').inputValue(),'1280');assert.equal(await label('Height').inputValue(),'720');assert.equal(await label('Frame rate').inputValue(),'30');await button('Create project →').click();
 let p=await save();assert.equal(p.scenes[0].name,'Scene 010');assert.equal(p.scenes[0].panels[0].name,'Panel 01');assert.equal(p.scenes[0].panels[0].duration,90);assert.equal(p.scenes[0].panels[0].layers[0].kind,'bitmap');
 await page.getByTitle('Select (V)',{exact:true}).click();assert.equal(await label('Selection mode').inputValue(),'lasso');
 await button('+ Panel').first().click();p=await save();assert.equal(p.scenes[0].panels[1].name,'Panel 02');await button('+ Scene').first().click();p=await save();assert.equal(p.scenes[1].name,'Scene 020');
 const png=page.waitForEvent('download');await page.getByTitle('Export current panel as PNG',{exact:true}).click();const data=await readFile(await(await png).path());assert.equal(data.readUInt32BE(16),256);assert.equal(data.readUInt32BE(20),144);
 const before=await save();await page.getByRole('status').filter({hasText:'Project file downloaded.'}).waitFor();await page.getByTitle('Dismiss message').click();await page.getByRole('status').filter({hasText:'Project file downloaded.'}).waitFor({state:'hidden'});await installImportDiagnostics();await page.locator('input[accept="image/png,image/jpeg,image/webp"]').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('broken')});await expectImageImportError('not a valid');assert.deepEqual(await save(),before);
 await page.locator('input[accept="image/png,image/jpeg,image/webp"]').setInputFiles({name:'bad-decode.png',mimeType:'image/png',buffer:Buffer.from([137,80,78,71,13,10,26,10,0,0])});await expectImageImportError('could not be decoded');assert.deepEqual(await save(),before);
 await prefs('General');await number('Default panel duration · seconds',9);await button('Cancel').click();await prefs('General');assert.equal(await label('Default panel duration · seconds').inputValue(),'3');await button('Done').click();
 await button('Pitch').click();assert.equal(await page.locator('.pitch-caption').count(),0);await button('Full screen').click();await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('pitch-view'));await page.evaluate(()=>document.exitFullscreen());
 await page.reload();await load(before);assert(await page.locator('.pitch-view').count());await prefs('General');await button('Restore defaults').click();await button('Done').click();
 // Recovery suppression in Pitch does not overwrite the project file.
 await prefs('General');await label('Create recovery snapshots in Pitch').uncheck();await number('Recovery snapshot delay · seconds after editing stops',5);await button('Done').click();
 await button('Drawing').click();await label('notes').fill('PITCH_RECOVERY_SENTINEL');await button('Pitch').click();await page.waitForTimeout(5300);
 const recovery=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('innovent-project-storage',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('records','readonly').objectStore('records').get('recovery');q.onsuccess=()=>{resolve(q.result);db.close();};q.onerror=()=>reject(q.error);};r.onerror=()=>reject(r.error);}));
 assert.equal(await recovery(),undefined);
 await prefs('General');await label('Create recovery snapshots in Pitch').check();await button('Done').click();await page.waitForTimeout(5300);assert((await recovery()).includes('PITCH_RECOVERY_SENTINEL'));
 await prefs('General');await button('Restore defaults').click();await button('Done').click();
 // Camera-aware edits and Undo across workspaces.
 const fixture=makeProject('Camera workflow',640,360);fixture.scenes[0].panels=[makePanel('Panel 1'),makePanel('Panel 2'),makePanel('Panel 3')];fixture.scenes[0].panels.forEach(p=>p.duration=12);fixture.scenes[0].camera=[{id:uid(),frame:0,x:100,y:120,zoom:1,rotation:0,interpolation:'ease'},{id:uid(),frame:35,x:500,y:200,zoom:2,rotation:30,interpolation:'linear'}];fixture.scenes.push(makeScene('Scene 2'));
 await load(fixture);await button('Panel').click();await label('Select Scene 1 / Panel 2 for move').check();await button('Move selected…').click();await label('Destination scene for Scene 1 / Panel 2').selectOption(fixture.scenes[1].id);await button('Move 1 panel').click();
 const moved=await save();for(const panel of fixture.scenes.flatMap(s=>s.panels))poseCheck(fixture,moved,panel.id);
 await page.getByTitle('Undo (⌘/Ctrl Z)',{exact:true}).click();assert.deepEqual(await save(),fixture);
 await button('Drawing').click();await page.getByRole('button',{name:'Select Scene 1, Panel 2',exact:true}).click();
 // RDR-2: count actual appearances, including notices that expire between edits.
 await page.evaluate(()=>{window.__rdr2Notices=0;const notice='Camera motion stays with each panel';const observe=()=>{const visible=[...document.querySelectorAll('[role="status"]')].some(el=>el.textContent?.includes(notice));if(visible&&!window.__rdr2Visible)window.__rdr2Notices++;window.__rdr2Visible=visible;};new MutationObserver(observe).observe(document.body,{subtree:true,childList:true,characterData:true});observe();});
 await page.getByTitle('Duplicate selected panel',{exact:true}).click();const copied=await save();assert.equal(copied.scenes[0].panels.length,4);
 await page.getByTitle('Delete selected panel',{exact:true}).click();await button('Discard / Delete').click();const deleted=await save();assert.equal(deleted.scenes[0].panels.length,3);await page.getByTitle('Duplicate selected panel',{exact:true}).click();await page.waitForTimeout(120);await page.getByTitle('Delete selected panel',{exact:true}).click();await button('Discard / Delete').click();await page.waitForTimeout(120);assert((await page.evaluate(()=>window.__rdr2Notices))<=1,'RDR-2 structural camera notice must not recur during repeated duplicate/delete edits (it may already have appeared earlier in this session)');for(const panel of fixture.scenes.flatMap(s=>s.panels))poseCheck(fixture,deleted,panel.id);
 await prefs('Shortcuts');await page.screenshot({path:'test-results/preferences-shortcuts.png'});await category('General');await page.waitForTimeout(180);await page.screenshot({path:'test-results/preferences-general.png'});await button('Done').click();await page.setViewportSize({width:1100,height:740});await prefs('Drawing');assert(await button('Done').isVisible());await page.screenshot({path:'test-results/preferences-compact.png'});await button('Done').click();
 assert.deepEqual(errors,[]);console.log('PASS workflow: preference defaults/Cancel/persistence/naming, PNG size, atomic bad-image rejection, workspace restore, Pitch captions/fullscreen, camera move/copy/delete/Undo.');
}catch(e){console.error(errors);await page.screenshot({path:'test-results/workflow-failure.png'});throw e;}finally{await browser.close();server.kill();}
