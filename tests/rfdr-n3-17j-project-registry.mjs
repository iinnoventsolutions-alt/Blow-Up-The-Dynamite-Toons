import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createTrustedProjectRegistry}=require('../desktop/isolated-export-project-registry.cjs');
const {createTrustedExportBackend}=require('../desktop/isolated-export-backend.cjs');
const original={id:'live1',width:2,height:2,fps:8,scenes:[{panels:[{duration:2}]}]};
const registry=createTrustedProjectRegistry({inspectProject:p=>({...p,frameCount:p.scenes.flatMap(s=>s.panels).reduce((a,p)=>a+p.duration,0)})});
assert.equal(registry.publish(original),'live1');assert.equal(registry.size(),1);
original.scenes[0].panels[0].duration=99;
const snapshot=await registry.resolveProject('live1');assert.equal(snapshot.frameCount,2);assert.equal(snapshot.snapshot.scenes[0].panels[0].duration,2);
snapshot.snapshot.scenes[0].panels[0].duration=100;
assert.equal((await registry.resolveProject('live1')).snapshot.scenes[0].panels[0].duration,2);
const backend=createTrustedExportBackend({resourcesPath:'/fixture',resolveProject:registry.resolveProject,
 renderFrame:async(p,index)=>{assert.equal(p.snapshot.scenes[0].panels[0].duration,2);return {index,timestampUs:index*125000,pixels:new Uint8Array(16)}},
 renderAudio:async()=>null,sinkFactory:async()=>({writeFrame:async()=>{},writeAudio:async()=>{},finish:async()=>new Uint8Array([1]),dispose:async()=>{}})});
const request={projectId:'live1',width:2,height:2,fps:8,outputName:'live.webm'};
assert.deepEqual([...await backend(request,{signal:new AbortController().signal,report:()=>{}})],[1]);
assert.equal(registry.remove('live1'),true);
await assert.rejects(backend(request,{signal:new AbortController().signal,report:()=>{}}),/unavailable/);
assert.throws(()=>registry.publish({...original,id:'../bad'}),/metadata/);
const abort=new AbortController();abort.abort();
await assert.rejects(registry.resolveProject('live1',abort.signal),/abort/i);
registry.clear();assert.equal(registry.size(),0);
console.log('RFDR N3.17-J trusted project snapshots, isolation, backend and invalidation PASS');
