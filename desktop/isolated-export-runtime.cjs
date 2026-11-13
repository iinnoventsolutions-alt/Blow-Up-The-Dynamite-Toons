/** N3.17-H Electron runtime hook. Disabled until a fully trusted project backend exists. */
const {registerIsolatedExportIpc}=require('./isolated-export-ipc-registration.cjs');
const {createIsolatedExportSessions}=require('./isolated-export-sessions.cjs');
function createIsolatedExportRuntime({ipcMain,window,pageURL,windowIsUsable,enabled=false,startExport,saveOutput}={}){
 if(!enabled){
  return Object.freeze({enabled:false,dispose:async()=>{}});
 }
 if(typeof startExport!=='function')throw new Error('Isolated export backend unavailable; refusing IPC activation');
 if(!window?.webContents)throw new TypeError('Trusted Electron window required');
 if(saveOutput!==undefined&&typeof saveOutput!=='function')throw new TypeError('Invalid output delivery callback');
 const sessions=createIsolatedExportSessions({startExport:async(request,context)=>{
  try{
   const bytes=await startExport(request,context);
   context.signal.throwIfAborted();
   if(!saveOutput)return bytes;
   const destination=await saveOutput(window.webContents,request.outputName,bytes,context.signal);
   context.signal.throwIfAborted();
   if(windowIsUsable(window))window.webContents.send('isolated-export:complete',{id:context.id,status:destination===null?'cancelled':'saved'});
   return destination;
  }catch(error){
   if(saveOutput&&windowIsUsable(window))window.webContents.send('isolated-export:complete',{id:context.id,status:context.signal.aborted?'cancelled':'failed'});
   throw error;
  }
 }});
 const registration=registerIsolatedExportIpc({ipcMain,sessions,window,pageURL,windowIsUsable,enabled:true});
 return Object.freeze({enabled:true,dispose:()=>registration.dispose()});
}
module.exports={createIsolatedExportRuntime};
