import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectDeterministicProject as inspect} from '../src/deterministic-project-adapter.ts';
import {cameraAt,projectFrames} from '../src/model.ts';
import {resolveCompatibleCamera} from '../src/sequential-camera.ts';
import {transitionAt} from '../src/transitions.ts';

const pose=(x,rotation=0)=>({x,y:540,zoom:1,rotation});
const panel=(id,duration)=>({id,name:id,duration,dialogue:'',action:'',slugging:'',notes:'',layers:[]});
function project(){
 return {format:'innovent-storyboard',schemaVersion:5,id:'project',title:'test',subtitle:'',width:1920,height:1080,fps:24,
 scenes:[
  {id:'s1',name:'One',camera:[],panels:[panel('a',5),panel('b',4)],sequentialCamera:{version:1,baseline:pose(100,10),panels:{
   a:{mode:'animated',keys:[{frame:2,x:20,y:0,zoom:1,rotation:20,interpolation:'linear'},{frame:4,x:40,y:0,zoom:1,rotation:50,interpolation:'linear'}]},
   b:{mode:'inherit'},
  }}},
  {id:'s2',name:'Two',camera:[{id:'lk',frame:0,...pose(700,-15),interpolation:'linear'},{id:'lk2',frame:2,...pose(750,-5),interpolation:'linear'}],panels:[panel('c',3)]},
 ],transitions:[{id:'t',fromId:'a',toId:'b',type:'dissolve',duration:3,direction:'right'}],
 audioAssets:[{id:'asset',name:'a',source:'',duration:10,sampleRate:48000,channels:2,peaks:[]}],
 audioTracks:[{id:'voice',name:'Voice',gain:.5,mute:false,solo:true,clips:[{id:'clip',assetId:'asset',name:'clip',start:2,offset:3,duration:8,gain:.8}]},
 {id:'muted',name:'Muted',gain:1,mute:false,solo:false,clips:[{id:'hidden',assetId:'asset',name:'hidden',start:0,offset:0,duration:12,gain:1}]}]};
}
test('N3.5 real project frame ordering, scene isolation, and full sequential poses',()=>{
 const p=project(),before=structuredClone(p),out=inspect(p);
 assert.equal(out.totalFrames,projectFrames(p));
 assert.deepEqual(out.frames.filter(f=>f.sceneStart).map(f=>f.index),[0,9]);
 assert.deepEqual(out.frames.map(f=>f.panelId),['a','a','a','a','a','b','b','b','b','c','c','c']);
 assert.deepEqual(out.frames[2].camera,resolveCompatibleCamera(p,'s1','a',2).pose);
 assert.deepEqual(out.frames[4].camera,pose(140,60));
 assert.deepEqual(out.frames[5].camera,pose(140,60)); // downstream IN inheritance
 assert.deepEqual(out.frames[9].camera,cameraAt(p.scenes[1],0,p));
 assert.deepEqual(out.frames[11].camera,cameraAt(p.scenes[1],2,p));
 assert.equal(out.frames[9].cameraEngine,'legacy');
 assert.equal(out.frames[5].cameraEngine,'sequential');
 assert.deepEqual(p,before);
 assert.deepEqual(inspect(p),out);
});
test('N3.5 transition metadata matches production transitionAt frame-for-frame',()=>{
 const p=project(),out=inspect(p);
 for(const f of out.frames){
   const live=transitionAt(p,f.index);
   assert.equal(f.transition?.progress,live?.progress);
   assert.equal(f.transition?.type,live?.transition.type);
 }
 assert.deepEqual(out.frames.filter(f=>f.transition).map(f=>f.index),[2,3,4]);
 assert.deepEqual(out.frames.filter(f=>f.transition).map(f=>f.transition.progress),[0,.5,1]);
});
test('N3.5 preserves audio timeline frame offsets, gains, solo, and end clipping',()=>{
 const p=project(),out=inspect(p);
 assert.deepEqual(out.audioWindows,[{trackId:'voice',clipId:'clip',assetId:'asset',startFrame:2,offsetFrames:3,durationFrames:8,gain:.4}]);
 p.audioTracks[0].solo=false;p.audioTracks[1].mute=true;
 assert.equal(inspect(p).audioWindows.length,1);
 p.audioTracks[1].mute=false;
 assert.equal(inspect(p).audioWindows.length,2);
});
test('N3.5 respects static legacy cameras when no scene keys exist',()=>{
 const p=project();delete p.scenes[0].sequentialCamera;p.scenes[0].panels[0].staticCamera=pose(40,25);
 const out=inspect(p);
 assert.deepEqual(out.frames[0].camera,pose(40,25));
 assert.deepEqual(out.frames[5].camera,pose(960,0));
});
test('N3.5 aborts and safely retries without mutating project',()=>{
 const p=project(),original=structuredClone(p),c=new AbortController();c.abort();
 assert.throws(()=>inspect(p,c.signal),{name:'AbortError'});
 assert.equal(inspect(p).totalFrames,12);
 assert.deepEqual(p,original);
});
