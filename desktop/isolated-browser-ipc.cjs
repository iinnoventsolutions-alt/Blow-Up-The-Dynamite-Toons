/** N3.17-M opt-in authenticated Electron IPC reply adapter.
 * Main initiates each request; renderer replies are accepted only from the
 * trusted top-level frame with a matching request token.
 * Not activated by main.cjs or exposed in production preload.
 */
const {randomUUID}=require('node:crypto');
const {assertTrustedSender}=require('./ipc-security.cjs');
const {createIsolatedBrowserTransport}=require('./isolated-browser-transport.cjs');
const {createStereoChunkTransport}=require('./isolated-stereo-chunk-transport.cjs');
const REPLY_CHANNEL='isolated-export:browser-reply';
const REQUEST_CHANNEL='isolated-export:browser-request';
function createIsolatedBrowserIpc({ipcMain,window,pageURL,windowIsUsable,enabled=false,enableStereo=false,frameTimeoutMs=30000,audioTimeoutMs=60000}={}){
 if(!enabled)return Object.freeze({enabled:false,close(){},transport:null});
 if(!ipcMain||typeof ipcMain.on!=='function'||typeof ipcMain.removeListener!=='function'||!window?.webContents||typeof window.webContents.send!=='function'||typeof windowIsUsable!=='function')
  throw new TypeError('Trusted Electron IPC dependencies required');
 let closed=false,pending=null,activeStereo=null;
 function notifyCancel(sessionId){try{if(windowIsUsable(window))window.webContents.send(REQUEST_CHANNEL,{token:randomUUID(),kind:'stereo-cancel',sessionId})}catch{}}
 const check=event=>assertTrustedSender(event,window,pageURL,windowIsUsable);
 function onReply(event,message){
  try{check(event)}catch{return}
  if(!pending||!message||typeof message!=='object'||Array.isArray(message)||
     message.token!==pending.token||message.kind!==pending.kind|| (pending.sessionId!==undefined&&message.sessionId!==pending.sessionId))return;
  const current=pending;pending=null;current.cleanup();
  if(message.error!==undefined){
   current.reject(new Error('Browser export operation failed'));
  }else{
   current.resolve(message.data);
  }
 }
 ipcMain.on(REPLY_CHANNEL,onReply);
 function request(kind,index,signal,extra={}){
  if(closed)throw new Error('Browser IPC closed');
  if(pending)throw new Error('Browser IPC request already pending');
  signal?.throwIfAborted();
  const token=randomUUID();
  return new Promise((resolve,reject)=>{
   let timer;
   const onAbort=()=>{
    if(pending!==entry)return;
    pending=null;entry.cleanup();reject(signal.reason instanceof Error?signal.reason:new Error('Export aborted'));
   };
   const entry={token,kind,sessionId:extra.sessionId,resolve,reject,cleanup:()=>{
    clearTimeout(timer);signal?.removeEventListener('abort',onAbort);
   }};
   pending=entry;
   if(signal)signal.addEventListener('abort',onAbort,{once:true});
   timer=setTimeout(()=>{
    if(pending!==entry)return;
    pending=null;entry.cleanup();reject(new Error('Browser response timed out'));
   },Math.max(1,(kind==='frame'?frameTimeoutMs:audioTimeoutMs)-5));
   try{
    if(!windowIsUsable(window))throw new Error('Trusted Electron window unavailable');
    window.webContents.send(REQUEST_CHANNEL,{token,kind,...(kind==='frame'?{index}:{}),...extra});
   }catch(error){pending=null;entry.cleanup();reject(error)}
  });
 }
 const transport=createIsolatedBrowserTransport({
  requestFrame:(index,signal)=>request('frame',index,signal),
  requestAudio:signal=>request('audio',undefined,signal),
  frameTimeoutMs,audioTimeoutMs
 });
 function createStereoSession(){
  if(closed||enableStereo!==true||activeStereo)throw new Error('Stereo session unavailable');
  const sessionId=randomUUID();
  const inner=createStereoChunkTransport((kind,data,signal)=>request(kind,undefined,signal,{...data,sessionId}));
  let ended=false;
  function closeSession(){
   if(ended)return;ended=true;inner.close();
   if(pending?.sessionId===sessionId){const entry=pending;pending=null;entry.cleanup();entry.reject(new Error('Stereo session closed'))}
   notifyCancel(sessionId);if(activeStereo===session)activeStereo=null;
  }
  const session=Object.freeze({begin:async(...args)=>{try{return await inner.begin(...args)}catch(error){closeSession();throw error}},read:async(...args)=>{try{return await inner.read(...args)}catch(error){closeSession();throw error}},close:closeSession});
  activeStereo=session;return session;
 }
 // Legacy opt-in adapter retained for existing isolated tests.
 const stereo=enableStereo===true?createStereoChunkTransport((kind,data,signal)=>request(kind,undefined,signal,data)):null;
 function close(){
  if(closed)return;closed=true;
  ipcMain.removeListener(REPLY_CHANNEL,onReply);
  transport.close();stereo?.close();activeStereo?.close();
  if(pending){const entry=pending;pending=null;entry.cleanup();entry.reject(new Error('Browser IPC closed'))}
 }
 return Object.freeze({enabled:true,transport,...(stereo?{stereo,createStereoSession}:{}),close,channels:Object.freeze({request:REQUEST_CHANNEL,reply:REPLY_CHANNEL})});
}
module.exports={createIsolatedBrowserIpc,REQUEST_CHANNEL,REPLY_CHANNEL};
