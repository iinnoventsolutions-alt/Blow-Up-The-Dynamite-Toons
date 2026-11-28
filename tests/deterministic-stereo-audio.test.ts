import test from 'node:test';
import assert from 'node:assert/strict';
import {mixStereoAudio,type StereoSource,type StereoClip} from '../src/deterministic-stereo-audio.ts';
function source(channels:number[][],sampleRate=48000):StereoSource{
 const data=channels.map(c=>new Float32Array(c));
 return {sampleRate,length:data[0].length,numberOfChannels:data.length,getChannelData:i=>data[i]};
}
const clip=(s:StereoSource,patch:Partial<StereoClip>={}):StereoClip=>({source:s,startSeconds:0,trimStartSeconds:0,durationSeconds:s.length/s.sampleRate,...patch});
test('stereo preserves independent channels and metadata',()=>{
 const result=mixStereoAudio(2/48000,[clip(source([[1,0],[0,1]]))])!;
 assert.equal(result.channels,2);assert.equal(result.sampleRate,48000);assert.equal(result.durationSeconds,2/48000);
 assert.deepEqual([...result.samples],[1,0,0,1]);
});
test('mono duplicates into both channels; overlap, trim, gain and delay preserve timing',()=>{
 const result=mixStereoAudio(4/48000,[clip(source([[1,2,3]]),{trimStartSeconds:1/48000,startSeconds:1/48000,gain:.5}),clip(source([[0,1],[1,0]]),{startSeconds:2/48000})])!;
 assert.deepEqual([...result.samples],[0,0,1,1,1.5,2.5,1,0]);
});
test('resampling preserves channels and clamps final source position',()=>{
 const result=mixStereoAudio(4/48000,[clip(source([[0,1],[1,0]],24000))])!;
 assert.deepEqual([...result.samples],[0,1,.5,.5,1,0,1,0]);
});
test('silent project returns null; output budget and malformed sources rejected',()=>{
 assert.equal(mixStereoAudio(600,[]),null);
 assert.throws(()=>mixStereoAudio(600,[clip(source([[1]]))]),/budget/);
 assert.throws(()=>mixStereoAudio(1/48000,[clip(source([[1],[1],[1]]))]),/mono or stereo/);
 assert.throws(()=>mixStereoAudio(1/48000,[clip(source([[NaN]]))]),/sample/);
 assert.throws(()=>mixStereoAudio(1/48000,[clip(source([[1]]),{gain:-1})]),/gain/);
});
test('cancellation is checked before allocation',()=>{
 const controller=new AbortController();controller.abort();
 assert.throws(()=>mixStereoAudio(1,[clip(source([[1]]))],controller.signal),{name:'AbortError'});
});
