/** N3.17-T consolidated real Electron + packaged ARM64 FFmpeg + saved WebM. */
const {app,BrowserWindow,ipcMain}=require('electron');
const {createIsolatedElectronExportHarness}=require('../desktop/isolated-electron-export-harness.cjs');
const {createTrustedProjectRegistry}=require('../desktop/isolated-export-project-registry.cjs');
const {writeFileSync,mkdtempSync,rmSync,readFileSync,readdirSync}=require('node:fs');
const {tmpdir}=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {spawnSync}=require('node:child_process');
const assert=require('node:assert/strict');
const resourcesPath=process.env.RFDR_PACKAGED_RESOURCES;
if(!resourcesPath)throw new Error('RFDR_PACKAGED_RESOURCES required: this test must run in ARM64 packaging gate');
const dir=mkdtempSync(path.join(tmpdir(),'rfdr-n317t-'));
const page=path.join(dir,'index.html'),destination=path.join(dir,'final.webm');
writeFileSync(page,'<!doctype html><title>RFDR final isolated acceptance</title>');
const pageURL=pathToFileURL(page).href;
let harness,window,finished=false,dialogCalls=0;
const timeout=setTimeout(()=>finish(new Error('N3.17-T real Electron export timed out')),120000);
async function finish(error){
 if(finished)return;finished=true;clearTimeout(timeout);
 try{await harness?.dispose()}catch(e){error ||= e}
 try{window?.destroy()}catch{}
 try{rmSync(dir,{recursive:true,force:true})}catch(e){error ||= e}
 if(error)console.error(error.stack||error.message);
 else console.log('RFDR N3.17-T real Electron renderer -> authenticated IPC -> packaged FFmpeg -> save -> FFprobe PASS');
 app.exit(error?1:0);
}
app.whenReady().then(async()=>{
 try{
  window=new BrowserWindow({show:false,webPreferences:{
   preload:path.join(__dirname,'rfdr-n3-17t-preload.cjs'),
   nodeIntegration:false,contextIsolation:true,sandbox:true
  }});
  await window.loadFile(page);
  assert.equal(window.webContents.mainFrame.url,pageURL);
  const registry=createTrustedProjectRegistry({inspectProject:p=>({id:p.id,width:p.width,height:p.height,fps:p.fps,frameCount:p.frameCount})});
  registry.publish({id:'electron-final',width:32,height:32,fps:8,frameCount:8});
  harness=createIsolatedElectronExportHarness({
   ipcMain,window,pageURL,windowIsUsable:w=>w===window&&!w.isDestroyed(),
   registry,resourcesPath,enabled:true,
   dialog:{showSaveDialog:async()=>{dialogCalls++;return {canceled:false,filePath:destination}}}
  });
  const request={projectId:'electron-final',width:32,height:32,fps:8,outputName:'final.webm'};
  const completion=await window.webContents.executeJavaScript(
   'window.rfdrTest.start('+JSON.stringify(request)+').then(({id})=>window.rfdrTest.awaitCompletion(id))'
  );
  assert.equal(completion.status,'saved');
  assert.equal(dialogCalls,1);
  assert.match(completion.id,/^[a-z0-9-]+$/i);
  assert.equal(JSON.stringify(completion).includes(destination),false);
  const bytes=readFileSync(destination);assert(bytes.byteLength>100);
  const probe=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height','-of','json',destination],{encoding:'utf8'});
  assert.equal(probe.status,0,probe.stderr);
  const stream=JSON.parse(probe.stdout).streams[0];
  assert.equal(stream.codec_name,'vp8');assert.equal(stream.width,32);assert.equal(stream.height,32);
  assert.deepEqual(readdirSync(dir).sort(),['final.webm','index.html']);
  await finish();
 }catch(error){await finish(error)}
}).catch(finish);
