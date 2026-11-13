import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
const require=createRequire(import.meta.url);
const {createIsolatedElectronExportHarness}=require('../desktop/isolated-electron-export-harness.cjs');
const {createTrustedProjectRegistry}=require('../desktop/isolated-export-project-registry.cjs');
const ipcMain=new EventEmitter(),handlers=new Map();
ipcMain.handle=(name,fn)=>{if(handlers.has(name))throw new Error('Duplicate');handlers.set(name,fn)};
ipcMain.removeHandler=name=>handlers.delete(name);
const contents={mainFrame:{url:'file:///trusted.html'},send:(channel,request)=>{
 assert.equal(channel,'isolated-export:browser-request');
 queueMicrotask(()=>ipcMain.emit('isolated-export:browser-reply',event,{
  token:request.token,kind:request.kind,data:request.kind==='frame'
   ?{index:request.index,timestampUs:request.index*500000,pixels:new Uint8ClampedArray(16)}
   :null
 }));
}};
const window={webContents:contents},event={sender:contents,senderFrame:contents.mainFrame};
const registry=createTrustedProjectRegistry({inspectProject:p=>({id:p.id,width:p.width,height:p.height,fps:p.fps,frameCount:p.frameCount})});
registry.publish({id:'proj1',width:2,height:2,fps:2,frameCount:2});
let frames=0,audio=0,disposed=0;
const harness=createIsolatedElectronExportHarness({ipcMain,window,pageURL:'file:///trusted.html',windowIsUsable:w=>w===window,registry,enabled:true,
 sinkFactory:async()=>({writeFrame:async f=>{assert.equal(f.index,frames++);assert.equal(f.pixels.length,16)},writeAudio:async a=>{assert.equal(a,null);audio++},finish:async()=>new Uint8Array([1,2,3]),dispose:async()=>{disposed++}})
});
const start=handlers.get('isolated-export:start');
const {id}=start(event,{projectId:'proj1',width:2,height:2,fps:2,outputName:'test.webm'});
assert.match(id,/^[a-z0-9-]+$/i);
await new Promise(resolve=>setTimeout(resolve,50));
assert.equal(frames,2);assert.equal(audio,1);assert.equal(disposed,1);
assert.throws(()=>start(event,{projectId:'other',width:2,height:2,fps:2,outputName:'test.webm'}),/^(?!$)/);
await harness.dispose();assert.equal(handlers.size,0);assert.equal(ipcMain.listenerCount('isolated-export:browser-reply'),0);
assert.equal(createIsolatedElectronExportHarness().enabled,false);
console.log('RFDR N3.17-N isolated snapshot-to-IPC-to-sink integration PASS');
