/** N3.17-M opt-in authenticated Electron IPC reply adapter.
 * Main initiates each request; renderer replies are accepted only from the
 * trusted top-level frame with a matching request token.
 * Not activated by main.cjs or exposed in production preload.
 */
const {randomUUID}=require('node:crypto');
const {assertTrustedSender}=require('./ipc-security.cjs');
const {createIsolatedBrowserTransport}=require('./isolated-browser-transport.cjs');
const REPLY_CHANNEL='isolated-export:browser-reply';
const REQUEST_CHANNEL='isolated-export:browser-request';
function createIsolatedBrowserIpc({ipcMain,window,pageURL,windowIsUsable,enabled=false,frameTimeoutMs=30000,audioTimeoutMs=60000}={}){
 if(!enabled)return Object.freeze({enabled:false,close(){},transport:null});
 if(!ipcMain||typeof ipcMain.on!=='function'||typeof ipcMain.removeListener!=='function'||!window?.webContents||typeof window.webContents.send!=='function'||typeof windowIsUsable!=='function')
  throw new TypeError('Trusted Electron IPC dependencies required');
 let closed=false,pending=null;
 const check=event=>assertTrustedSender(event,window,pageURL,windowIsUsable);
 function onReply(event,message){
  try{check(event)}catch{return}
  if(!pending||!message||typeof message!=='object'||Array.isArray(message)||
     message.token!==pending.token||message.kind!==pending.kind)return;
  const current=pending;pending=null;
  if(message.error!==undefined){
   current.reject(new Error('Browser export operation failed'));
  }else{
   current.resolve(message.data);
  }
 }
 ipcMain.on(REPLY_CHANNEL,onReply);
 function request(kind,index,signal){
  if(closed)throw new Error('Browser IPC closed');
  if(pending)throw new Error('Browser IPC request already pending');
  signal?.throwIfAborted();
  const token=randomUUID();
  return new Promise((resolve,reject)=>{
   const entry={token,kind,resolve,reject};
   pending=entry;
   try{
    if(!windowIsUsable(window))throw new Error('Trusted Electron window unavailable');
    window.webContents.send(REQUEST_CHANNEL,{token,kind,...(kind==='frame'?{index}:{})});
   }catch(error){pending=null;reject(error)}
  });
 }
 const transport=createIsolatedBrowserTransport({
  requestFrame:(index,signal)=>request('frame',index,signal),
  requestAudio:signal=>request('audio',undefined,signal),
  frameTimeoutMs,audioTimeoutMs
 });
 function close(){
  if(closed)return;closed=true;
  ipcMain.removeListener(REPLY_CHANNEL,onReply);
  transport.close();
  if(pending){const entry=pending;pending=null;entry.reject(new Error('Browser IPC closed'))}
 }
 return Object.freeze({enabled:true,transport,close,channels:Object.freeze({request:REQUEST_CHANNEL,reply:REPLY_CHANNEL})});
}
module.exports={createIsolatedBrowserIpc,REQUEST_CHANNEL,REPLY_CHANNEL};
