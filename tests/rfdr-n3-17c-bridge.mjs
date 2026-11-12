import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createIsolatedExportBridge}=require('../desktop/isolated-export-bridge.cjs');
const {createIsolatedExportSessions}=require('../desktop/isolated-export-sessions.cjs');
const owner={},frame={url:'file:///app/index.html'},window={webContents:owner};
owner.mainFrame=frame;
let release,aborted=false;
const sessions=createIsolatedExportSessions({startExport:async(_,{signal})=>{await new Promise(resolve=>release=resolve);aborted=signal.aborted}});
const bridge=createIsolatedExportBridge({sessions,window,pageURL:frame.url,windowIsUsable:win=>win===window});
const event={sender:owner,senderFrame:frame};
const request={projectId:'p1',width:32,height:32,fps:24,outputName:'movie.webm'};
for(const bad of [{sender:{},senderFrame:frame},{sender:owner,senderFrame:{url:frame.url}},{sender:owner,senderFrame:{url:'https://evil.test'}}]){
 assert.throws(()=>bridge.start(bad,request),/Unauthorized/);
 assert.throws(()=>bridge.cancel(bad,'valid-id'),/Unauthorized/);
}
assert.throws(()=>bridge.start(event,{...request,destination:'/tmp/out.webm'}),/Unexpected/);
const started=bridge.start(event,request);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(bridge.progress(event,started.id).status,'running');
assert.throws(()=>bridge.cancel(event,'../../unsafe'),/session ID/);
assert.equal(bridge.cancel(event,started.id),true);
release();await started.done;
assert.equal(aborted,true);
assert.equal(sessions.activeCount(),0);
assert.throws(()=>bridge.progress(event,started.id),/Unknown/);
await bridge.closeWindow();
console.log('RFDR N3.17-C isolated trusted sender bridge PASS');
