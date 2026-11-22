/** N3.17-N opt-in integration composition for trusted test harnesses only.
 * No production main/preload registration. Browser data is never project authority.
 */
const {createIsolatedBrowserIpc}=require('./isolated-browser-ipc.cjs');
const {createTrustedExportBackend}=require('./isolated-export-backend.cjs');
const {createIsolatedExportRuntime}=require('./isolated-export-runtime.cjs');
const {createIsolatedExportOutput}=require('./isolated-export-output.cjs');
function createIsolatedElectronExportHarness({ipcMain,window,pageURL,windowIsUsable,registry,resourcesPath,sinkFactory,dialog,enabled=false}={}){
 if(!enabled)return Object.freeze({enabled:false,dispose:async()=>{}});
 if(!registry||typeof registry.resolveProject!=='function')throw new TypeError('Trusted project registry required');
 const browser=createIsolatedBrowserIpc({ipcMain,window,pageURL,windowIsUsable,enabled:true});
 let runtime;
 try{
  const startExport=createTrustedExportBackend({
   resourcesPath,resolveProject:(id,signal)=>registry.resolveProject(id,signal),
   renderFrame:(project,index,signal)=>browser.transport.frame(index,project.width,project.height,project.fps,signal),
   renderAudio:(_project,signal)=>browser.transport.audio(signal),
   ...(sinkFactory?{sinkFactory}:{})
  });
  let output;
  runtime=createIsolatedExportRuntime({ipcMain,window,pageURL,windowIsUsable,enabled:true,startExport,
   ...(dialog?{saveOutput:async(owner,name,bytes,signal)=>{
    if(!output)output=createIsolatedExportOutput({
     dialog,window,sessions:{closeOwner:async()=>{}}
    });
    return output.save(owner,name,bytes,signal);
   }}:{})
  });
 }catch(error){browser.close();throw error}
 let disposed=false;
 return Object.freeze({enabled:true,async dispose(){
  if(disposed)return;disposed=true;
  browser.close();
  await runtime.dispose();
 }});
}
module.exports={createIsolatedElectronExportHarness};
