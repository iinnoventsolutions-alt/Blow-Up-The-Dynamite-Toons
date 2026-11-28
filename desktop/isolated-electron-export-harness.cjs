/** N3.17-N opt-in integration composition for trusted test harnesses only.
 * No production main/preload registration. Browser data is never project authority.
 */
const {createIsolatedBrowserIpc}=require('./isolated-browser-ipc.cjs');
const {createTrustedExportBackend}=require('./isolated-export-backend.cjs');
const {createIsolatedExportRuntime}=require('./isolated-export-runtime.cjs');
const {createIsolatedExportOutput}=require('./isolated-export-output.cjs');
function createIsolatedElectronExportHarness({ipcMain,window,pageURL,windowIsUsable,registry,resourcesPath,sinkFactory,dialog,formatPolicy,enabled=false}={}){
 if(!enabled)return Object.freeze({enabled:false,dispose:async()=>{}});
 if(!registry||typeof registry.resolveProject!=='function')throw new TypeError('Trusted project registry required');
 const extended=formatPolicy?.capabilities?.mp4===true&&formatPolicy?.capabilities?.mov===true;
 if(extended&&!dialog)throw new TypeError('Extended export requires trusted save dialog');
 const browser=createIsolatedBrowserIpc({ipcMain,window,pageURL,windowIsUsable,enabled:true,enableStereo:extended});
 let runtime,output;
 try{
  const startExport=createTrustedExportBackend({
   resourcesPath,formatPolicy,...(extended?{createStereoTransport:()=>browser.createStereoSession()}:{}),resolveProject:(id,signal)=>registry.resolveProject(id,signal),
   renderFrame:(project,index,signal,geometry)=>browser.transport.frame(index,geometry?.width??project.width,geometry?.height??project.height,project.fps,signal,geometry),
   renderAudio:(_project,signal)=>browser.transport.audio(signal),
   ...(sinkFactory?{sinkFactory}:{})
  });
  runtime=createIsolatedExportRuntime({ipcMain,window,pageURL,windowIsUsable,enabled:true,startExport,formatPolicy,
   ...(dialog?{saveOutput:async(owner,name,bytes,signal,format)=>{
    if(!output)output=createIsolatedExportOutput({
     dialog,window,formatPolicy,sessions:{closeOwner:async()=>{}}
    });
    return output.save(owner,name,bytes,signal,format);
   }}:{})
  });
 }catch(error){browser.close();throw error}
 let disposed=false;
 return Object.freeze({enabled:true,async dispose(){
  if(disposed)return;disposed=true;
  browser.close();
  await output?.closeWindow(window.webContents);
  await runtime.dispose();
 }});
}
module.exports={createIsolatedElectronExportHarness};
