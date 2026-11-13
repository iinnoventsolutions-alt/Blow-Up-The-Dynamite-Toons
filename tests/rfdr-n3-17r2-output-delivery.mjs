import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createIsolatedExportRuntime}=require('../desktop/isolated-export-runtime.cjs');
const handlers=new Map(),messages=[];
const contents={mainFrame:{url:'file:///trusted.html'},send:(channel,data)=>messages.push({channel,data})};
const window={webContents:contents};
const ipcMain={handle:(k,fn)=>handlers.set(k,fn),removeHandler:k=>handlers.delete(k)};
const event={sender:contents,senderFrame:contents.mainFrame};
const saved=[];
const runtime=createIsolatedExportRuntime({ipcMain,window,pageURL:'file:///trusted.html',windowIsUsable:w=>w===window,enabled:true,
 startExport:async()=>new Uint8Array([26,69,223,163]),
 saveOutput:async(owner,name,bytes,signal)=>{
  assert.equal(owner,contents);signal.throwIfAborted();saved.push({name,bytes:new Uint8Array(bytes)});return '/tmp/example.webm';
 }});
const req={projectId:'project1',width:2,height:2,fps:2,outputName:'example.webm'};
const {id}=await handlers.get('isolated-export:start')(event,req);
for(let i=0;i<100&&messages.length===0;i++)await new Promise(r=>setTimeout(r,5));
assert.equal(saved.length,1);assert.equal(saved[0].name,'example.webm');
assert.deepEqual([...saved[0].bytes],[26,69,223,163]);
assert.deepEqual(messages[0],{channel:'isolated-export:complete',data:{id,status:'saved'}});
assert.equal(JSON.stringify(messages).includes('/tmp/'),false);
await runtime.dispose();
assert.equal(handlers.size,0);
const failures=[];
const broken=createIsolatedExportRuntime({ipcMain,window,pageURL:'file:///trusted.html',windowIsUsable:w=>w===window,enabled:true,
 startExport:async()=>new Uint8Array([1]),
 saveOutput:async()=>{throw Error('sensitive filesystem detail')}});
const bad=await handlers.get('isolated-export:start')(event,req);
for(let i=0;i<100&&!messages.some(m=>m.data.id===bad.id);i++)await new Promise(r=>setTimeout(r,5));
const result=messages.find(m=>m.data.id===bad.id);
assert.equal(result.data.status,'failed');
assert.equal(JSON.stringify(result).includes('sensitive'),false);
await broken.dispose();
console.log('RFDR N3.17-R2 opt-in main-owned output delivery and sanitized completion PASS');
