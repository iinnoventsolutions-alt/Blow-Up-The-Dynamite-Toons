import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDeterministicFrameMetadata as resolve} from '../src/deterministic-frame-metadata.ts';
const base={fps:24,panels:[{id:'a',frames:48},{id:'b',frames:72},{id:'c',frames:24}]};
test('N3.2 camera interpolates intermediate keyframes at exact local frames',()=>{
 const out=resolve({...base,camera:[{panelId:'a',keyframes:[{frame:0,x:0},{frame:24,x:40},{frame:47,x:100}]}]});
 assert.equal(out.frames.length,144);
 assert.equal(out.frames[24].camera.x,40);
 assert.equal(out.frames[47].camera.x,100);
 assert.equal(out.frames[12].camera.x,20);
 assert.equal(out.frames[48].camera.x,0);
});
test('N3.2 scene boundaries reset metadata at panel start',()=>{
 const out=resolve({...base,sceneStarts:['a','c']});
 assert.deepEqual(out.frames.filter(f=>f.sceneStart).map(f=>f.index),[0,120]);
});
test('N3.2 dissolve has six ordered samples despite artificial delay fixture',()=>{
 const out=resolve({...base,transitions:[{from:'a',to:'b',kind:'dissolve',frames:6}],simulatedRenderDelayMs:75});
 assert.deepEqual(out.frames.filter(f=>f.transition).map(f=>f.transition.progress),[1/6,2/6,3/6,4/6,5/6,1]);
 assert.deepEqual(out.frames.filter(f=>f.transition).map(f=>f.index),[42,43,44,45,46,47]);
 assert.equal(out.durationSeconds,6);
});
test('N3.2 prevents cross-scene transitions and malformed keyframes',()=>{
 assert.throws(()=>resolve({...base,sceneStarts:['a','b'],transitions:[{from:'a',to:'b',kind:'dissolve',frames:6}]}),RangeError);
 assert.throws(()=>resolve({...base,camera:[{panelId:'a',keyframes:[{frame:24,x:1},{frame:12,x:2}]}]}),RangeError);
});
test('N3.2 cancellation and subsequent retry',()=>{
 const c=new AbortController();c.abort();
 assert.throws(()=>resolve({...base,signal:c.signal}),{name:'AbortError'});
 assert.equal(resolve(base).frames.length,144);
});
