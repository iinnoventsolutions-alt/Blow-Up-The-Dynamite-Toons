/** N3.17-Q: actual renderer -> Electron IPC -> main -> renderer round-trip. */
const {app,BrowserWindow,ipcMain}=require('electron');
const {createIsolatedElectronExportHarness}=require('../desktop/isolated-electron-export-harness.cjs');
const {createTrustedProjectRegistry}=require('../desktop/isolated-export-project-registry.cjs');
const {writeFileSync,mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const dir=mkdtempSync(path.join(tmpdir(),'rfdr-n317q-'));
const page=path.join(dir,'index.html');
writeFileSync(page,'<!doctype html><title>RFDR isolated test</title>');
const pageURL=pathToFileURL(page).href;
let harness,window,finished=false;
let frames=0,audios=0,disposals=0;
const timer=setTimeout(()=>finish(new Error('Real Electron IPC timed out')),25000);
async function finish(error){
 if(finished)return;finished=true;clearTimeout(timer);
 try{await harness?.dispose()}catch(e){error ||= e}
 try{window?.destroy()}catch{}
 rmSync(dir,{recursive:true,force:true});
 if(error)console.error(error.stack||error.message);
 else console.log('RFDR N3.17-Q real Electron renderer IPC round-trip PASS');
 app.exit(error?1:0);
}
app.whenReady().then(async()=>{
 try{
  window=new BrowserWindow({show:false,webPreferences:{
   preload:path.join(__dirname,'rfdr-n3-17q-preload.cjs'),
   nodeIntegration:false,contextIsolation:true,sandbox:true
  }});
  await window.loadFile(page);
  assert.equal(window.webContents.mainFrame.url,pageURL);
  const registry=createTrustedProjectRegistry({inspectProject:p=>({id:p.id,width:p.width,height:p.height,fps:p.fps,frameCount:p.frameCount})});
  registry.publish({id:'electronq',width:2,height:2,fps:2,frameCount:2});
  harness=createIsolatedElectronExportHarness({
   ipcMain,window,pageURL,windowIsUsable:w=>w===window&&!w.isDestroyed(),registry,enabled:true,
   sinkFactory:async()=>({
    writeFrame:async frame=>{assert.equal(frame.index,frames++);assert.equal(frame.pixels.length,16)},
    writeAudio:async audio=>{assert.equal(audio,null);audios++},
    finish:async()=>new Uint8Array([1,2,3]),
    dispose:async()=>{disposals++}
   })
  });
  const request={projectId:'electronq',width:2,height:2,fps:2,outputName:'test.webm'};
  const id=await window.webContents.executeJavaScript('window.rfdrTest.start('+JSON.stringify(request)+').then(r=>r.id)');
  assert.match(id,/^[a-z0-9-]+$/i);
  // The coordinator evicts completed sessions; observe sink completion directly.
  for(let i=0;i<100&&disposals===0;i++)await new Promise(resolve=>setTimeout(resolve,50));
  assert.equal(frames,2);assert.equal(audios,1);assert.equal(disposals,1);
  await assert.rejects(window.webContents.executeJavaScript('window.rfdrTest.progress('+JSON.stringify(id)+')'),/Unknown or unauthorized export session/);
  await finish();
 }catch(error){await finish(error)}
}).catch(finish);
