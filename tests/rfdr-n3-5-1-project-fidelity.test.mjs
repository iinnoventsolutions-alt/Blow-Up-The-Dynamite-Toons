import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectDeterministicProject} from '../src/deterministic-project-adapter.ts';
import {cameraAt,projectFrames} from '../src/model.ts';
import {resolveCompatibleCamera} from '../src/sequential-camera.ts';
import {transitionAt} from '../src/transitions.ts';
import {audioWindows} from '../src/audio-model.ts';

const pose=(x,rotation=0)=>({x,y:540,zoom:1,rotation});
const panel=(id,duration)=>({id,name:id,duration,dialogue:'',action:'',slugging:'',notes:'',layers:[]});
function base(){
 return {format:'innovent-storyboard',schemaVersion:5,id:'fidelity',title:'Fidelity',subtitle:'',width:1920,height:1080,fps:24,
 scenes:[{id:'s1',name:'Scene 1',panels:[panel('a',7),panel('b',5)],camera:[]},
 {id:'s2',name:'Scene 2',panels:[panel('c',6)],camera:[]}],
 transitions:[],audioAssets:[],audioTracks:[]};
}
test('N3.5.1 legacy ease/hold camera sampling matches playback evaluator across panel and scene boundaries',()=>{
 const p=base();
 p.scenes[0].camera=[
  {id:'k0',frame:0,...pose(100,0),interpolation:'ease'},
  {id:'k1',frame:6,...pose(400,90),interpolation:'hold'},
  {id:'k2',frame:10,...pose(800,180),interpolation:'linear'}];
 p.scenes[1].camera=[{id:'other',frame:0,...pose(1500,-30),interpolation:'linear'}];
 const before=structuredClone(p),out=inspectDeterministicProject(p);
 let index=0;
 for(const scene of p.scenes){
  let local=0;
  for(const item of scene.panels){
   for(let f=0;f<item.duration;f++,local++,index++){
    const expected=cameraAt(scene,local,p);
    for(const field of ['x','y','zoom','rotation'])assert.equal(out.frames[index].camera[field],expected[field]);
    assert.equal(out.frames[index].cameraEngine,'legacy');
   }
  }
 }
 assert.equal(out.frames[6].camera.x,400);
 assert.equal(out.frames[8].camera.x,400);
 assert.equal(out.frames[12].camera.x,1500);
 assert.deepEqual(out.frames.filter(f=>f.sceneStart).map(f=>f.index),[0,12]);
 assert.deepEqual(p,before);
});
test('N3.5.1 sequential ease/hold intermediate keys and inherited rotation match accepted camera engine',()=>{
 const p=base();
 p.scenes[0].sequentialCamera={version:1,baseline:pose(100,5),panels:{
  a:{mode:'animated',keys:[
   {frame:2,x:40,y:0,zoom:1,rotation:30,interpolation:'hold'},
   {frame:4,x:80,y:0,zoom:1,rotation:60,interpolation:'ease'},
   {frame:6,x:120,y:0,zoom:1,rotation:90,interpolation:'linear'}]},
  b:{mode:'animated',keys:[{frame:4,x:20,y:0,zoom:1,rotation:-15,interpolation:'linear'}]},
 }};
 const out=inspectDeterministicProject(p);
 for(const [i,id,f] of out.frames.slice(0,12).map((v,i)=>[i,v.panelId,v.panelFrame])){
  const expected=resolveCompatibleCamera(p,'s1',id,f).pose;
  assert.deepEqual(out.frames[i].camera,expected);
 }
 assert.deepEqual(out.frames[7].camera,out.frames[6].camera);
 assert.equal(out.frames[6].camera.rotation,95);
 assert.equal(out.frames[11].camera.rotation,80);
 assert.equal(out.frames[12].camera.x,960); // new scene isolation
});
test('N3.5.1 non-dissolve transition direction and progress retain production semantics',()=>{
 for(const type of ['dissolve','edge-wipe','clock-wipe','slide']){
  const p=base();
  p.transitions=[{id:'tr',fromId:'a',toId:'b',type,duration:4,direction:'left'}];
  const out=inspectDeterministicProject(p);
  for(const f of out.frames){
   const expected=transitionAt(p,f.index);
   assert.equal(f.transition?.progress,expected?.progress);
   assert.equal(f.transition?.type,expected?.transition.type);
   assert.equal(f.transition?.direction,expected?.transition.direction);
  }
  assert.deepEqual(out.frames.filter(f=>f.transition).map(f=>f.index),[3,4,5,6]);
  assert.equal(out.frames[3].transition.progress,0);
  assert.equal(out.frames[6].transition.progress,1);
  assert.equal(out.frames[7].transition,undefined);
 }
});
test('N3.5.1 audio window clipping, overlap, mute/solo, and offsets match production audioWindows',()=>{
 const p=base();
 p.audioTracks=[
  {id:'one',name:'one',gain:.5,mute:false,solo:false,clips:[
   {id:'early',assetId:'asset',name:'early',start:0,offset:2,duration:8,gain:.4},
   {id:'late',assetId:'asset',name:'late',start:15,offset:4,duration:10,gain:.6}]},
  {id:'two',name:'two',gain:1,mute:false,solo:false,clips:[
   {id:'overlap',assetId:'asset',name:'overlap',start:5,offset:1,duration:6,gain:.8}]},
 ];
 const verify=()=>{
  const out=inspectDeterministicProject(p);
  assert.equal(out.totalFrames,projectFrames(p));
  const expected=audioWindows(p,0).map(w=>({
   trackId:w.track.id,clipId:w.clip.id,assetId:w.clip.assetId,
   startFrame:Math.round(w.delay*p.fps),
   offsetFrames:Math.round(w.offset*p.fps),
   durationFrames:Math.round(w.duration*p.fps),
   gain:w.gain,
  }));
  assert.deepEqual(out.audioWindows,expected);
 };
 verify();
 p.audioTracks[1].solo=true;verify();
 p.audioTracks[1].mute=true;verify();
 p.audioTracks[1].solo=false;p.audioTracks[1].mute=false;p.audioTracks[0].mute=true;verify();
});
