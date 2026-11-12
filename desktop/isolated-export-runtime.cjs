/** N3.17-H Electron runtime hook. Disabled until a fully trusted project backend exists. */
const {registerIsolatedExportIpc}=require('./isolated-export-ipc-registration.cjs');
const {createIsolatedExportSessions}=require('./isolated-export-sessions.cjs');
function createIsolatedExportRuntime({ipcMain,window,pageURL,windowIsUsable,enabled=false,startExport}={}){
 if(!enabled){
  return Object.freeze({enabled:false,dispose:async()=>{}});
 }
 if(typeof startExport!=='function')throw new Error('Isolated export backend unavailable; refusing IPC activation');
 if(!window?.webContents)throw new TypeError('Trusted Electron window required');
 const sessions=createIsolatedExportSessions({startExport});
 const registration=registerIsolatedExportIpc({ipcMain,sessions,window,pageURL,windowIsUsable,enabled:true});
 return Object.freeze({enabled:true,dispose:()=>registration.dispose()});
}
module.exports={createIsolatedExportRuntime};
