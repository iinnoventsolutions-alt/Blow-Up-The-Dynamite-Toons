// N2 contract-first regression gate. Expected RED until an isolated deterministic
// exporter adapter is implemented. This file does not alter the live exporter.
import test from 'node:test';
import assert from 'node:assert/strict';

const adapterUrl = new URL('../src/deterministic-export-adapter.ts', import.meta.url);
async function render(fixture) {
  const { renderDeterministicAnimatic } = await import(adapterUrl.href);
  return renderDeterministicAnimatic(fixture);
}
const base = {
  fps: 24, width: 320, height: 180,
  panels: [{ id: 'a', frames: 48 }, { id: 'b', frames: 72 }, { id: 'c', frames: 24 }],
  camera: [], transitions: [], audio: [],
};
test('N2-01 unequal panel lengths: 144 frames, ordered timestamps, 6s', async () => {
  const out = await render(base);
  assert.equal(out.frames.length, 144);
  assert.equal(out.durationSeconds, 6);
  assert.deepEqual(out.frames.map(x => x.panelId).filter((x,i,a) => i===0||x!==a[i-1]), ['a','b','c']);
  for(let i=0;i<144;i++) assert.equal(out.frames[i].timestampUs, Math.round(i*1e6/24));
});
test('N2-02 dissolve frames: deterministic progression under simulated delay', async () => {
  const fixture={...base, transitions:[{from:'a',to:'b',kind:'dissolve',frames:6}], simulatedRenderDelayMs:75};
  const out=await render(fixture);
  assert.equal(out.frames.length,144);
  const samples=out.frames.filter(f=>f.transition?.kind==='dissolve');
  assert.equal(samples.length,6);
  assert.deepEqual(samples.map(f=>f.transition.progress),[1/6,2/6,3/6,4/6,5/6,1]);
});
test('N2-03 camera interpolation: intermediate keyframe and scene boundary', async () => {
  const fixture={...base,camera:[{panelId:'a',keyframes:[{frame:0,x:0},{frame:24,x:40},{frame:47,x:100}]}],sceneStarts:['a','c']};
  const out=await render(fixture);
  assert.equal(out.frames[24].camera.x,40);
  assert.equal(out.frames[47].camera.x,100);
  assert.equal(out.frames[120].sceneStart,true);
});
test('N2-04 audio: trims, gaps, overlap and exact six-second sample count', async () => {
  const fixture={...base,audio:[{startSeconds:0,trimStartSeconds:1,durationSeconds:2},{startSeconds:2.5,trimStartSeconds:0,durationSeconds:3}]};
  const out=await render(fixture);
  assert.equal(out.audio.sampleRate,48000);
  assert.equal(out.audio.samples.length,288000);
  assert.equal(out.audio.durationSeconds,6);
});
test('N2-05 silence: video-only export, exact duration', async () => {
  const out=await render({...base,audio:[]});
  assert.equal(out.audio,null);
  assert.equal(out.frames.length,144);
  assert.equal(out.durationSeconds,6);
});
test('N2-06 cancellation: abort closes resources and permits clean retry', async () => {
  const controller=new AbortController();controller.abort();
  await assert.rejects(render({...base,signal:controller.signal}),{name:'AbortError'});
  const out=await render(base);
  assert.equal(out.frames.length,144);
});
