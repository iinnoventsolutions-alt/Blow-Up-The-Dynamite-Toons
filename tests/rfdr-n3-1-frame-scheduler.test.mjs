import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleDeterministicFrames } from '../src/deterministic-frame-scheduler.ts';

test('N3.1 unequal panels yield 144 ordered frames over 6 seconds', () => {
  const out=scheduleDeterministicFrames({fps:24,panels:[{id:'a',frames:48},{id:'b',frames:72},{id:'c',frames:24}]});
  assert.equal(out.totalFrames,144);
  assert.equal(out.durationSeconds,6);
  assert.equal(out.frames.length,144);
  assert.deepEqual([out.frames[0],out.frames[48],out.frames[120]].map(x=>[x.panelId,x.panelFrame]),[['a',0],['b',0],['c',0]]);
  for(let i=0;i<144;i++){
    assert.equal(out.frames[i].index,i);
    assert.equal(out.frames[i].timestampUs,Math.round(i*1_000_000/24));
  }
  assert.equal(out.frames.at(-1).timestampUs,5958333);
});
test('N3.1 scheduler is independent of wall clock and repeatable', () => {
  const fixture={fps:30,panels:[{id:'a',frames:10},{id:'b',frames:20}]};
  assert.deepEqual(scheduleDeterministicFrames(fixture),scheduleDeterministicFrames(fixture));
});
test('N3.1 pre-aborted signal rejects without producing frames', () => {
  const controller=new AbortController();controller.abort();
  assert.throws(()=>scheduleDeterministicFrames({fps:24,panels:[{id:'a',frames:144}],signal:controller.signal}),{name:'AbortError'});
  assert.equal(scheduleDeterministicFrames({fps:24,panels:[{id:'a',frames:144}]}).totalFrames,144);
});
test('N3.1 validates malformed and excessive schedules', () => {
  assert.throws(()=>scheduleDeterministicFrames({fps:0,panels:[{id:'a',frames:1}]}),RangeError);
  assert.throws(()=>scheduleDeterministicFrames({fps:24,panels:[]}),RangeError);
  assert.throws(()=>scheduleDeterministicFrames({fps:24,panels:[{id:'a',frames:0}]}),RangeError);
  assert.throws(()=>scheduleDeterministicFrames({fps:24,panels:[{id:'a',frames:1_000_001}]}),RangeError);
});
