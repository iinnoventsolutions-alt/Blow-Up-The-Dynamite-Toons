/** N3.17-D opt-in registration; no renderer-facing preload API. */
const {createIsolatedExportBridge}=require('./isolated-export-bridge.cjs');
const CHANNELS=Object.freeze(['isolated-export:start','isolated-export:progress','isolated-export:cancel']);
function registerIsolatedExportIpc({ipcMain,sessions,window,pageURL,windowIsUsable,enabled=false}={}){
 if(!enabled)return Object.freeze({enabled:false,dispose:()=>Promise.resolve()});
 if(!ipcMain||typeof ipcMain.handle!=='function'||typeof ipcMain.removeHandler!=='function')throw new TypeError('Invalid ipcMain');
 const bridge=createIsolatedExportBridge({sessions,window,pageURL,windowIsUsable});
 const handlers=[
  (event,request)=>{const {id,done}=bridge.start(event,request);done.catch(()=>{});return {id}},
  (event,id)=>bridge.progress(event,id),
  (event,id)=>bridge.cancel(event,id)
 ];
 let count=0;
 try{
  for(let i=0;i<CHANNELS.length;i++){ipcMain.handle(CHANNELS[i],handlers[i]);count++}
 }catch(error){for(let i=0;i<count;i++)ipcMain.removeHandler(CHANNELS[i]);throw error}
 let disposed=false;
 return Object.freeze({enabled:true,async dispose(){
  if(disposed)return;disposed=true;
  for(const name of CHANNELS)ipcMain.removeHandler(name);
  await bridge.closeWindow();
 }});
}
module.exports={registerIsolatedExportIpc,CHANNELS};
