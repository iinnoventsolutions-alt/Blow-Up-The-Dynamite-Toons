/** N3.17-P: actual Electron BrowserWindow/IPC smoke, isolated from production app. */
const {app,BrowserWindow,ipcMain}=require('electron');
const {createIsolatedElectronExportHarness}=require('../desktop/isolated-electron-export-harness.cjs');
const {createTrustedProjectRegistry}=require('../desktop/isolated-export-project-registry.cjs');
const {writeFileSync,mkdtempSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const dir=mkdtempSync(path.join(tmpdir(),'rfdr-n317p-'));
const page=path.join(dir,'test.html');
writeFileSync(page,'<!doctype html><title>Isolated Electron IPC</title><script>window.addEventListener("load",()=>{document.title="ready"})</script>');
const pageURL=pathToFileURL(page).href;
let harness,window,finished=false;
const timeout=setTimeout(()=>finish(new Error('Electron IPC smoke timed out')),20000);
async function finish(error){
 if(finished)return;finished=true;clearTimeout(timeout);
 try{await harness?.dispose()}catch(e){error ||= e}
 try{window?.destroy()}catch{}
 rmSync(dir,{recursive:true,force:true});
 if(error)console.error(error.stack||error.message);
 else console.log('RFDR N3.17-P real Electron BrowserWindow and isolated harness initialization PASS');
 app.exit(error?1:0);
}
app.whenReady().then(async()=>{
 try{
  window=new BrowserWindow({show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
  window.webContents.on('did-finish-load',async()=>{
   try{
    const registry=createTrustedProjectRegistry({inspectProject:p=>({id:p.id,width:p.width,height:p.height,fps:p.fps,frameCount:p.frameCount})});
    registry.publish({id:'electron1',width:2,height:2,fps:2,frameCount:1});
    harness=createIsolatedElectronExportHarness({ipcMain,window,pageURL,windowIsUsable:w=>w===window&&!w.isDestroyed(),registry,enabled:true,
     sinkFactory:async()=>({writeFrame:async()=>{},writeAudio:async()=>{},finish:async()=>new Uint8Array([1]),dispose:async()=>{}})
    });
    const event={sender:window.webContents,senderFrame:window.webContents.mainFrame};
    // Verify real BrowserWindow frame identity; renderer IPC round-trip is a later gate.
    if(window.webContents.mainFrame.url!==pageURL)throw Error('Unexpected main frame URL');
    await finish();
   }catch(error){await finish(error)}
  });
  await window.loadFile(page);
 }catch(error){await finish(error)}
}).catch(finish);
