import test from 'node:test';
import assert from 'node:assert/strict';
import {mixStereoAudio,createStereoChunkSource,type StereoSource,type StereoClip} from '../src/deterministic-stereo-audio.ts';
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

test('chunked stereo matches complete mix across boundaries and partial tail',()=>{
 const clips=[clip(source([[0,1,0],[1,0,1]],24000),{startSeconds:47998/48000}),clip(source([[.5,.25,.75]]),{startSeconds:47999/48000,gain:.5})];
 const duration=48005/48000;
 const full=mixStereoAudio(duration,clips)!;
 const chunks=createStereoChunkSource(duration,clips)!;
 const first=chunks.readChunk(0),last=chunks.readChunk(48000);
 assert.equal(first.frameCount,48000);assert.equal(first.samples.byteLength,384000);
 assert.equal(last.startFrame,48000);assert.equal(last.frameCount,5);
 assert.deepEqual(first.samples,full.samples.subarray(0,96000));
 assert.deepEqual(last.samples,full.samples.subarray(96000));
});
test('ten-minute chunk source remains bounded and validates offsets',()=>{
 const chunks=createStereoChunkSource(600,[clip(source([[1]]))])!;
 assert.equal(chunks.totalFrames,28800000);
 assert.equal(chunks.readChunk(28752000).samples.byteLength,384000);
 assert.throws(()=>createStereoChunkSource(601,[clip(source([[1]]))]),/budget/);
 for(const offset of [-1,1,NaN,28800000])assert.throws(()=>chunks.readChunk(offset),/offset/);
 assert.equal(createStereoChunkSource(600,[]),null);
});
test('chunk source observes cancellation and returns independent buffers',()=>{
 const controller=new AbortController();
 const chunks=createStereoChunkSource(2,[clip(source([[1]]))],controller.signal)!;
 const first=chunks.readChunk(0);first.samples[0]=0;
 assert.equal(chunks.readChunk(0).samples[0],1);
 const request=new AbortController();request.abort();
 assert.throws(()=>chunks.readChunk(0,request.signal),{name:'AbortError'});
 controller.abort();
 assert.throws(()=>chunks.readChunk(48000),{name:'AbortError'});
});
