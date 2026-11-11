import test from 'node:test';
import assert from 'node:assert/strict';
import {mixDeterministicAudio as mix} from '../src/deterministic-audio-mixer.ts';
const rate=48000, source=(seconds,value)=>new Float32Array(Math.round(seconds*rate)).fill(value);
test('N3.3 exact 6s 48k sample count with trimmed clips gaps and overlap',()=>{
 const out=mix({durationSeconds:6,clips:[
  {startSeconds:0,trimStartSeconds:1,durationSeconds:2,sourceSamples:source(4,.25)},
  {startSeconds:1.5,trimStartSeconds:.5,durationSeconds:3,sourceSamples:source(4,.5)}
 ]});
 assert.equal(out.sampleRate,48000);
 assert.equal(out.samples.length,288000);
 assert.equal(out.durationSeconds,6);
 assert.equal(out.samples[0],.25);
 assert.equal(out.samples[rate*1.5],.75);
 assert.equal(out.samples[rate*2.5],.5);
 assert.equal(out.samples[rate*5],0);
});
test('N3.3 trim offset reads correct decoded samples',()=>{
 const src=new Float32Array(rate*3);src.fill(.2,0,rate);src.fill(.6,rate,2*rate);
 const out=mix({durationSeconds:2,clips:[{startSeconds:0,trimStartSeconds:1,durationSeconds:1,sourceSamples:src}]});
 assert.ok(Math.abs(out.samples[0]-.6)<1e-6);
 assert.equal(out.samples[rate],0);
});
test('N3.3 silence yields no audio stream',()=>{
 assert.equal(mix({durationSeconds:6,clips:[]}),null);
});
test('N3.3 clips beyond duration truncate and retain exact length',()=>{
 const out=mix({durationSeconds:1,clips:[{startSeconds:.5,trimStartSeconds:0,durationSeconds:2,sourceSamples:source(2,.5)}]});
 assert.equal(out.samples.length,48000);
 assert.equal(out.samples[23999],0);
 assert.equal(out.samples[24000],.5);
 assert.equal(out.samples[47999],.5);
});
test('N3.3 rejects invalid trims and cancellation permits retry',()=>{
 const controller=new AbortController();controller.abort();
 assert.throws(()=>mix({durationSeconds:6,clips:[{startSeconds:0,trimStartSeconds:0,durationSeconds:1,sourceSamples:source(1,.5)}],signal:controller.signal}),{name:'AbortError'});
 assert.throws(()=>mix({durationSeconds:1,clips:[{startSeconds:0,trimStartSeconds:1,durationSeconds:1,sourceSamples:source(1,.5)}]}),RangeError);
 assert.equal(mix({durationSeconds:1,clips:[{startSeconds:0,trimStartSeconds:0,durationSeconds:1,sourceSamples:source(1,.5)}]}).samples.length,48000);
});
