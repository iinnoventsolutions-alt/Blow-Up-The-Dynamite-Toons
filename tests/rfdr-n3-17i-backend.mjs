import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createTrustedExportBackend}=require('../desktop/isolated-export-backend.cjs');
const {createIsolatedExportRuntime}=require('../desktop/isolated-export-runtime.cjs');
const request={projectId:'trusted1',width:2,height:2,fps:8,outputName:'test.webm'};
const owner={mainFrame:{url:'file:///app/index.html'}},window={webContents:owner};
const handlers=new Map(),ipcMain={handle:(n,f)=>handlers.set(n,f),removeHandler:n=>handlers.delete(n)};
const opts={ipcMain,window,pageURL:owner.mainFrame.url,windowIsUsable:w=>w===window};
const event={sender:owner,senderFrame:owner.mainFrame};
const seen=[],project={id:'trusted1',width:2,height:2,fps:8,frameCount:2};
const sinkFactory=async()=>({
 writeFrame:async frame=>seen.push(frame.index),
 writeAudio:async audio=>assert.equal(audio,null),
 finish:async()=>new Uint8Array([1,2]),
 dispose:async()=>seen.push('dispose')
});
const backend=createTrustedExportBackend({resourcesPath:'/fixture',resolveProject:async id=>id==='trusted1'?project:null,
 renderFrame:async(p,index)=>({index,timestampUs:index*125000,pixels:new Uint8Array(16)}),
 renderAudio:async()=>null,sinkFactory});
const runtime=createIsolatedExportRuntime({...opts,enabled:true,startExport:backend});
assert.equal(runtime.enabled,true);
const start=handlers.get('isolated-export:start');
assert.throws(()=>start({sender:{},senderFrame:owner.mainFrame},request),/Unauthorized/);
const {id}=start(event,request);
assert.equal(typeof id,'string');
await new Promise(resolve=>setTimeout(resolve,20));
assert.deepEqual(seen,[0,1,'dispose']);
const unknown=start(event,{...request,projectId:'unknown'});
assert.equal(typeof unknown.id,'string');
await new Promise(resolve=>setTimeout(resolve,20));
assert.deepEqual(seen,[0,1,'dispose']);
await runtime.dispose();assert.equal(handlers.size,0);
await assert.rejects(backend({...request,width:4},{signal:new AbortController().signal,report:()=>{}}),/settings mismatch/);
console.log('RFDR N3.17-I trusted project resolution and opt-in runtime composition PASS');
