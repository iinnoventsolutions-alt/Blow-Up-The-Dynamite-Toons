import assert from 'node:assert/strict';
import {mixProjectAudio} from '../src/deterministic-project-audio.ts';
const project=()=>({format:'innovent-storyboard',schemaVersion:4,id:'p',title:'p',subtitle:'',width:64,height:64,fps:10,
 scenes:[{id:'s',panels:[{id:'p1',duration:10}]}],transitions:[],
 audioAssets:[{id:'a',name:'a',source:'',duration:1,sampleRate:48000,channels:1,peaks:[]}],
 audioTracks:[{id:'t',name:'t',gain:.5,mute:false,solo:false,clips:[{id:'c',assetId:'a',name:'c',start:2,offset:1,duration:4,gain:.5}]}]});
const samples=new Float32Array(48000).fill(1);
let calls=0;const decode=async()=>{calls++;return {sampleRate:48000,samples};};
{
 const p=project(),out=await mixProjectAudio(p,decode);
 assert.equal(out.samples.length,48000);assert.equal(out.samples[0],0);assert.equal(out.samples[9600],.25);assert.equal(out.samples[28799],.25);assert.equal(out.samples[28800],0);
}
{
 const p=project();p.audioTracks[0].clips.push({...p.audioTracks[0].clips[0],id:'c2',start:2,offset:1});
 calls=0;const out=await mixProjectAudio(p,decode);assert.equal(calls,1);assert.equal(out.samples[9600],.5);
}
{
 const p=project();p.audioTracks[0].mute=true;assert.equal(await mixProjectAudio(p,decode),null);
 p.audioTracks[0].mute=false;p.audioTracks.push({id:'solo',name:'solo',gain:1,mute:false,solo:true,clips:[]});assert.equal(await mixProjectAudio(p,decode),null);
}
{
 const p=project();p.audioTracks[0].clips[0].offset=9;const out=await mixProjectAudio(p,decode);assert.equal(out.samples[9600],.25);assert.equal(out.samples[14399],.25);assert.equal(out.samples[14400],0);
}
{
 const p=project(),controller=new AbortController();controller.abort();
 await assert.rejects(mixProjectAudio(p,decode,controller.signal),/abort/i);
}
{
 const p=project();p.audioTracks[0].clips[0].assetId='missing';
 await assert.rejects(mixProjectAudio(p,decode),/Missing audio asset/);
}
console.log('RFDR N3.12 real-project audio adapter PASS');
