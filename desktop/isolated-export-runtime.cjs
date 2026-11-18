/** N3.17-H Electron runtime hook. Disabled until a fully trusted project backend exists. */
const {registerIsolatedExportIpc}=require('./isolated-export-ipc-registration.cjs');
const {createIsolatedExportSessions}=require('./isolated-export-sessions.cjs');
// Only known, non-sensitive diagnostic categories cross the main-to-renderer boundary.
function publicExportError(error){
 const message=error instanceof Error?error.message:'';
 if(message==='Export exceeds raw disk budget'||message==='Raw frame disk budget exceeded'||message==='Raw audio disk budget exceeded')return 'Export exceeds the 512 MB raw-frame storage limit';
 if(message==='FFmpeg export timed out')return 'FFmpeg encoding timed out';
 if(message==='Trusted project unavailable')return 'Export project snapshot unavailable';
 if(message==='Project export settings mismatch')return 'Export project settings mismatch';
 return 'FFmpeg export failed; check the isolated export diagnostic logs';
}

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
   if(saveOutput&&windowIsUsable(window))window.webContents.send('isolated-export:complete',{id:context.id,status:context.signal.aborted?'cancelled':'failed',error:context.signal.aborted?undefined:publicExportError(error)});
   throw error;
  }
 }});
 const registration=registerIsolatedExportIpc({ipcMain,sessions,window,pageURL,windowIsUsable,enabled:true});
 return Object.freeze({enabled:true,dispose:()=>registration.dispose()});
}
module.exports={createIsolatedExportRuntime};
