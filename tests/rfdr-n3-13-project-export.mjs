import assert from 'node:assert/strict';
import {exportIsolatedProject} from '../src/deterministic-project-export.ts';
const panel=(id)=>({id,name:id,duration:4,dialogue:'',action:'',slugging:'',notes:'',layers:[]});
const project=()=>({format:'innovent-storyboard',schemaVersion:5,id:'n313',title:'N3.13',subtitle:'',width:64,height:64,fps:8,scenes:[{id:'scene',name:'Scene',camera:[],panels:[panel('a'),panel('b')]}],transitions:[],audioAssets:[],audioTracks:[]});
function sink(){const frames=[],audio=[];let disposed=0;return {frames,audio,get disposed(){return disposed},async writeFrame(f){frames.push(f)},async writeAudio(a){audio.push(a)},async finish(){return new Uint8Array([1,2,3])},async dispose(){disposed++}}}
const render=async(p,i)=>({index:i,timestampUs:Math.round(i*1e6/p.fps),pixels:new Uint8Array([i,0,0,255])});
const decode=async()=>({sampleRate:48000,samples:new Float32Array(48000).fill(.5)});
{
 const p=project(),s=sink(),progress=[];
 const out=await exportIsolatedProject(p,{render,decode,sink:s,signal:new AbortController().signal,onProgress:x=>progress.push(x)});
 assert.deepEqual([...out],[1,2,3]);assert.equal(s.frames.length,8);
 assert.deepEqual(s.frames.map(f=>f.timestampUs),[0,125000,250000,375000,500000,625000,750000,875000]);
 assert.equal(s.audio.length,1);assert.equal(s.audio[0],null);assert.equal(s.disposed,1);assert.equal(progress.at(-1),1);
}
{
 const p=project(),s=sink();
 p.audioAssets.push({id:'sound',name:'sound',source:'',duration:1,sampleRate:48000,channels:1,peaks:[]});
 p.audioTracks.push({id:'track',name:'track',gain:.5,mute:false,solo:false,clips:[{id:'clip',assetId:'sound',name:'clip',start:2,offset:0,duration:4,gain:1}]});
 await exportIsolatedProject(p,{render,decode,sink:s,signal:new AbortController().signal});
 assert.equal(s.audio[0].sampleRate,48000);assert.equal(s.audio[0].samples.length,48000);
 assert.equal(s.audio[0].samples[0],0);assert.equal(s.audio[0].samples[12000],.25);assert.equal(s.audio[0].samples[36000],0);
}
{
 const p=project(),s=sink();
 await assert.rejects(exportIsolatedProject(p,{render:async(p,i)=>({...await render(p,i),timestampUs:99}),decode,sink:s,signal:new AbortController().signal}),/schedule mismatch/);
 assert.equal(s.disposed,1);
}
{
 const p=project(),s=sink(),controller=new AbortController();
 await assert.rejects(exportIsolatedProject(p,{render:async(p,i)=>{if(i===2)controller.abort();return render(p,i)},decode,sink:s,signal:controller.signal}),/abort/i);
 assert.equal(s.disposed,1);assert(s.frames.length<=2);
}
console.log('RFDR N3.13 isolated project export bridge PASS');
