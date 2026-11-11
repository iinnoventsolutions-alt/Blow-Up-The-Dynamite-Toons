import test from 'node:test';
import assert from 'node:assert/strict';
import {renderDeterministicAnimatic as render} from '../src/deterministic-export-adapter.ts';
test('N3.4 explicit PCM survives fixture adapter composition',async()=>{
 const samples=new Float32Array(48000).fill(.25);
 const out=await render({fps:24,panels:[{id:'a',frames:48}],audio:[{startSeconds:.5,trimStartSeconds:0,durationSeconds:1,sourceSamples:samples}]});
 assert.equal(out.frames.length,48);
 assert.equal(out.audio.samples.length,96000);
 assert.equal(out.audio.samples[0],0);
 assert.equal(out.audio.samples[24000],.25);
 assert.equal(out.audio.samples[71999],.25);
 assert.equal(out.audio.samples[72000],0);
});
test('N3.4 rejects invalid PCM window instead of inventing source data',async()=>{
 await assert.rejects(render({fps:24,panels:[{id:'a',frames:48}],audio:[{startSeconds:0,trimStartSeconds:0,durationSeconds:2,sourceSamples:new Float32Array(48000)}]}),RangeError);
});
