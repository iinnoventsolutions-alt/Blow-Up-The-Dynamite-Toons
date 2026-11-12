import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createIsolatedExportPipeline}=require('../desktop/isolated-export-pipeline.cjs');
const {createIsolatedExportSessions}=require('../desktop/isolated-export-sessions.cjs');
const request={projectId:'p',width:2,height:2,fps:8,outputName:'test.webm'};
const events=[],progress=[];
let disposed=0;
const sinkFactory=async()=>({
 writeFrame:async frame=>events.push('frame'+frame.index),
 writeAudio:async audio=>events.push(audio===null?'silent':'audio'),
 finish:async()=>{events.push('finish');return new Uint8Array([1,2,3])},
 dispose:async()=>{disposed++}
});
const pipeline=createIsolatedExportPipeline({resourcesPath:'/unused',frameCount:2,sinkFactory,
 renderFrame:async(_,index)=>({index,timestampUs:Math.round(index*1e6/8),pixels:new Uint8Array(16)}),
 renderAudio:async()=>null});
const sessions=createIsolatedExportSessions({startExport:pipeline});
const owner={},s=sessions.start(owner,request);assert.deepEqual([...await s.done],[1,2,3]);
assert.deepEqual(events,['frame0','frame1','silent','finish']);assert.equal(disposed,1);assert.equal(sessions.activeCount(),0);
const fail=createIsolatedExportPipeline({frameCount:2,sinkFactory,renderFrame:async(_,index)=>({index,timestampUs:0,pixels:new Uint8Array(16)}),renderAudio:async()=>null});
await assert.rejects(fail(request,{signal:new AbortController().signal,report:()=>{}}),/Invalid frame sequence/);assert.equal(disposed,2);
const ctrl=new AbortController();
const cancelled=createIsolatedExportPipeline({frameCount:1,sinkFactory,renderFrame:async()=>{ctrl.abort();return {index:0,timestampUs:0,pixels:new Uint8Array(16)}},renderAudio:async()=>null});
await assert.rejects(cancelled(request,{signal:ctrl.signal,report:()=>{}}),/abort/i);assert.equal(disposed,3);
const budget=createIsolatedExportPipeline({frameCount:2,maxRawBytes:16,sinkFactory,renderFrame:async()=>{},renderAudio:async()=>null});
await assert.rejects(budget(request,{signal:new AbortController().signal,report:()=>{}}),/disk budget/);assert.equal(disposed,3);
console.log('RFDR N3.17-E isolated pipeline ordering, session, cancellation and disposal PASS');
