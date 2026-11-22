/** N3.17-T test-only preload; production preload remains untouched. */
const {contextBridge,ipcRenderer}=require('electron');
const completions=new Map(),waiters=new Map();
ipcRenderer.on('isolated-export:browser-request',(_event,request)=>{
 const data=request.kind==='frame'
  ?{index:request.index,timestampUs:Math.round(request.index*125000),
    pixels:Uint8Array.from({length:32*32*4},(_,i)=>i%4===3?255:(i+request.index*31)%256)}
  :null;
 ipcRenderer.send('isolated-export:browser-reply',{token:request.token,kind:request.kind,data});
});
ipcRenderer.on('isolated-export:complete',(_event,message)=>{
 completions.set(message.id,message);
 const waiting=waiters.get(message.id);
 if(waiting){waiters.delete(message.id);waiting(message)}
});
contextBridge.exposeInMainWorld('rfdrTest',Object.freeze({
 start:request=>ipcRenderer.invoke('isolated-export:start',request),
 awaitCompletion:id=>completions.has(id)?Promise.resolve(completions.get(id)):new Promise(resolve=>waiters.set(id,resolve))
}));
