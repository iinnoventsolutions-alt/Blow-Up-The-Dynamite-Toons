/** Test-only preload: not referenced by production BrowserWindow. */
const {contextBridge,ipcRenderer}=require('electron');
ipcRenderer.on('isolated-export:browser-request',(_event,request)=>{
 const data=request.kind==='frame'
  ?{index:request.index,timestampUs:Math.round(request.index*500000),pixels:new Uint8Array(16).fill(255)}
  :null;
 ipcRenderer.send('isolated-export:browser-reply',{token:request.token,kind:request.kind,data});
});
contextBridge.exposeInMainWorld('rfdrTest',Object.freeze({
 start:request=>ipcRenderer.invoke('isolated-export:start',request),
 progress:id=>ipcRenderer.invoke('isolated-export:progress',id),
 cancel:id=>ipcRenderer.invoke('isolated-export:cancel',id)
}));
