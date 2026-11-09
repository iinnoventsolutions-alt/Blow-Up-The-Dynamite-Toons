import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject,makePanel} from '../src/model.ts';
import {enableSequentialCameraStorage,resolveCompatibleCamera} from '../src/sequential-camera.ts';
import {copySequentialPanelCamera,pasteSequentialPanelCamera} from '../src/sequential-camera-clipboard.ts';
const setup=()=>{let p=makeProject();const id=p.scenes[0].id;p.scenes[0].panels.push(makePanel('Destination'));p=enableSequentialCameraStorage(p,id);return {p,id,a:p.scenes[0].panels[0].id,b:p.scenes[0].panels[1].id};};
test('RB1 static copy preserves x/y/zoom/rotation, does not mutate artwork or source',()=>{
 const {p,id,a,b}=setup(),s=p.scenes[0],value={x:500,y:350,zoom:1.7,rotation:37};
 s.sequentialCamera!.panels[a]={mode:'static',pose:value};
 const snapshot=structuredClone(p),clip=copySequentialPanelCamera(p,id,a);
 const result=pasteSequentialPanelCamera(p,id,b,clip);
 assert.deepEqual(p,snapshot);assert.deepEqual(resolveCompatibleCamera(result,id,b,0).pose,value);
 assert.deepEqual(result.scenes[0].panels,s.panels);
 assert.notEqual((result.scenes[0].sequentialCamera!.panels[b] as any).pose,value);
});
test('RB1 animated copy preserves relative offsets, rotation and interpolation across durations',()=>{
 const {p,id,a,b}=setup(),s=p.scenes[0];s.panels[0].duration=11;s.panels[1].duration=21;
 s.sequentialCamera!.panels[a]={mode:'animated',keys:[{frame:5,x:100,y:20,zoom:1.5,rotation:30,interpolation:'ease'},{frame:10,x:200,y:40,zoom:2,rotation:60,interpolation:'hold'}]};
 const clip=copySequentialPanelCamera(p,id,a),result=pasteSequentialPanelCamera(p,id,b,clip);
 const state=result.scenes[0].sequentialCamera!.panels[b];
 assert.equal(state.mode,'animated');if(state.mode!=='animated')return;
 assert.deepEqual(state.keys.map(k=>k.frame),[10,20]);
 assert.deepEqual(state.keys.map(k=>k.rotation),[30,60]);
 assert.deepEqual(state.keys.map(k=>k.interpolation),['ease','hold']);
 assert.equal(resolveCompatibleCamera(result,id,b,20).pose.rotation,60);
 assert.deepEqual(clip.state,s.sequentialCamera!.panels[a]);
});
test('RB1 rejects compressed collisions atomically and preserves destination',()=>{
 const {p,id,a,b}=setup(),s=p.scenes[0];s.panels[0].duration=20;s.panels[1].duration=3;
 s.sequentialCamera!.panels[a]={mode:'animated',keys:[{frame:4,x:1,y:0,zoom:1,rotation:2,interpolation:'linear'},{frame:5,x:2,y:0,zoom:1,rotation:3,interpolation:'linear'},{frame:19,x:3,y:0,zoom:1,rotation:4,interpolation:'linear'}]};
 const before=structuredClone(p),clip=copySequentialPanelCamera(p,id,a);
 assert.throws(()=>pasteSequentialPanelCamera(p,id,b,clip),/too short|cannot accommodate/);
 assert.deepEqual(p,before);
});
test('RB1 inherited camera copies visible static framing without creating animation',()=>{
 const {p,id,a,b}=setup(),s=p.scenes[0];
 s.sequentialCamera!.baseline={x:710,y:320,zoom:1.2,rotation:-18};
 const result=pasteSequentialPanelCamera(p,id,b,copySequentialPanelCamera(p,id,a));
 assert.equal(result.scenes[0].sequentialCamera!.panels[b].mode,'static');
 assert.deepEqual(resolveCompatibleCamera(result,id,b,0).pose,s.sequentialCamera!.baseline);
});
test('RB1 replaces existing animated destination with static, without changing unrelated panel data',()=>{
 const {p,id,a,b}=setup(),s=p.scenes[0];
 s.sequentialCamera!.panels[a]={mode:'static',pose:{x:100,y:200,zoom:2,rotation:45}};
 s.sequentialCamera!.panels[b]={mode:'animated',keys:[{frame:119,x:5,y:5,zoom:2,rotation:5,interpolation:'linear'}]};
 s.panels[1].notes='Keep me';
 const result=pasteSequentialPanelCamera(p,id,b,copySequentialPanelCamera(p,id,a));
 assert.equal(result.scenes[0].sequentialCamera!.panels[b].mode,'static');
 assert.equal(result.scenes[0].panels[1].notes,'Keep me');
 assert.equal(p.scenes[0].sequentialCamera!.panels[b].mode,'animated');
});
