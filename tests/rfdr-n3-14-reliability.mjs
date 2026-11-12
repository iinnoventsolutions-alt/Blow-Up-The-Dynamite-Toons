import assert from 'node:assert/strict';
import {runIsolatedExport} from '../src/isolated-export-coordinator.ts';
const frame=i=>({index:i,timestampUs:Math.round(i*1e6/8),pixels:new Uint8Array(4)});
function fixture(overrides={}){let disposed=0,written=0,finished=0;
 const sink={async writeFrame(){written++},async writeAudio(){},async finish(){finished++;return new Uint8Array([1])},async dispose(){disposed++}};
 return {input:{frameCount:3,fps:8,renderFrame:async i=>frame(i),renderAudio:async()=>null,sink,signal:new AbortController().signal,...overrides},stats:()=>({disposed,written,finished})};}
{
 const f=fixture({renderFrame:async i=>({...frame(i),pixels:new Uint8Array(64*1024*1024+1)})});
 await assert.rejects(runIsolatedExport(f.input),/Frame pixel budget/);
 assert.deepEqual(f.stats(),{disposed:1,written:0,finished:0});
}
{
 const f=fixture({renderFrame:async i=>({...frame(i),pixels:new Uint8Array(0)})});
 await assert.rejects(runIsolatedExport(f.input),/Frame pixel budget/);assert.equal(f.stats().disposed,1);
}
{
 const f=fixture({renderAudio:async()=>({sampleRate:48000,samples:new Float32Array(128*1024*1024/4+1)})});
 await assert.rejects(runIsolatedExport(f.input),/Audio PCM budget/);assert.equal(f.stats().disposed,1);assert.equal(f.stats().finished,0);
}
{
 const f=fixture({renderAudio:async()=>({sampleRate:0,samples:new Float32Array(2)})});
 await assert.rejects(runIsolatedExport(f.input),/Audio PCM budget/);assert.equal(f.stats().disposed,1);
}
{
 const f=fixture();f.input.sink.finish=async()=>new Uint8Array(512*1024*1024+1);
 await assert.rejects(runIsolatedExport(f.input),/Encoded output budget/);assert.equal(f.stats().disposed,1);
}
{
 const f=fixture();f.input.sink.writeFrame=async()=>{throw new Error('sink write failure')};
 await assert.rejects(runIsolatedExport(f.input),/sink write failure/);assert.equal(f.stats().disposed,1);
}
{
 const controller=new AbortController(),f=fixture({signal:controller.signal});
 f.input.sink.writeAudio=async()=>controller.abort();
 await assert.rejects(runIsolatedExport(f.input),/abort/i);assert.equal(f.stats().disposed,1);assert.equal(f.stats().finished,0);
}
{
 const f=fixture({frameCount:3000});
 const out=await runIsolatedExport(f.input);
 assert.equal(out[0],1);assert.equal(f.stats().written,3000);assert.equal(f.stats().disposed,1);
}
console.log('RFDR N3.14 reliability and resource budget PASS');
