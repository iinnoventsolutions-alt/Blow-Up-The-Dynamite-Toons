import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject,makePanel} from '../src/model.ts';
import {enableSequentialCameraStorage,resolveCompatibleCamera} from '../../src/sequential-camera.ts';
import {copySequentialPanelCamera,pasteSequentialPanelCamera} from '../../src/sequential-camera-clipboard.ts';

// E2.3-F1.2B: required camera clipboard framing regression.
test('E2.3-F1.2B: preserve animated clipboard absolute IN, intermediate and OUT framing',()=>{
 let project=makeProject();
 const sceneId=project.scenes[0].id;
 project.scenes[0].panels.push(makePanel('Destination'));
 project=enableSequentialCameraStorage(project,sceneId);
 const scene=project.scenes[0], [source,destination]=scene.panels;
 source.duration=11;destination.duration=11;
 scene.sequentialCamera!.baseline={x:360,y:260,zoom:1.25,rotation:10};
 scene.sequentialCamera!.panels[source.id]={mode:'animated',keys:[
  {frame:5,x:80,y:-30,zoom:1.4,rotation:15,interpolation:'linear'},
  {frame:10,x:160,y:-60,zoom:1.8,rotation:30,interpolation:'linear'}
 ]};
 const frames=[{name:'IN',frame:0},{name:'INTERMEDIATE',frame:5},{name:'OUT',frame:10}];
 const expected=frames.map(({frame})=>resolveCompatibleCamera(project,sceneId,source.id,frame).pose);
 const inherited=resolveCompatibleCamera(project,sceneId,destination.id,0).pose;
 assert.notDeepEqual(inherited,expected[0],'Destination IN must differ from source IN');
 const original=structuredClone(project);
 const result=pasteSequentialPanelCamera(project,sceneId,destination.id,copySequentialPanelCamera(project,sceneId,source.id));
 assert.deepEqual(project,original,'Paste must not mutate source project');
 const mismatches=[];
 for(let i=0;i<frames.length;i++){
  const {name,frame}=frames[i];
  const actual=resolveCompatibleCamera(result,sceneId,destination.id,frame).pose;
  const differing=Object.keys(expected[i]).filter(k=>Math.abs(actual[k]-expected[i][k])>1e-7);
  console.log(JSON.stringify({checkpoint:name,frame,expected:expected[i],actual,differing}));
  if(differing.length)mismatches.push(name+': '+differing.join(', '));
 }
 assert.deepEqual(mismatches,[],'Pasted camera mismatches: '+mismatches.join('; '));
});

test('E2.3-F1.2B: retime animated clipboard while preserving key poses and interpolation',()=>{
 let project=makeProject();const id=project.scenes[0].id;
 project.scenes[0].panels.push(makePanel('Destination'));
 project=enableSequentialCameraStorage(project,id);
 const scene=project.scenes[0], [source,dest]=scene.panels;
 source.duration=11;dest.duration=21;
 scene.sequentialCamera!.baseline={x:310,y:240,zoom:1.3,rotation:12};
 scene.sequentialCamera!.panels[source.id]={mode:'animated',keys:[
  {frame:5,x:40,y:-15,zoom:1.25,rotation:20,interpolation:'ease'},
  {frame:10,x:100,y:-30,zoom:1.5,rotation:40,interpolation:'hold'}
 ]};
 const expected=[0,5,10].map(f=>resolveCompatibleCamera(project,id,source.id,f).pose);
 const original=structuredClone(project);
 const pasted=pasteSequentialPanelCamera(project,id,dest.id,copySequentialPanelCamera(project,id,source.id));
 for(const [i,f] of [0,10,20].entries())assert.deepEqual(resolveCompatibleCamera(pasted,id,dest.id,f).pose,expected[i]);
 const state=pasted.scenes[0].sequentialCamera!.panels[dest.id];
 assert.equal(state.mode,'animated');
 if(state.mode==='animated'){
  assert.deepEqual(state.keys.map(k=>k.frame),[10,20]);
  assert.deepEqual(state.keys.map(k=>k.interpolation),['ease','hold']);
 }
 assert.deepEqual(project,original);
});
test('E2.3-F1.2B: repeated paste preserves framing and unrelated downstream inherited camera',()=>{
 let project=makeProject();const id=project.scenes[0].id;
 project.scenes[0].panels.push(makePanel('Destination'),makePanel('Downstream'));
 project=enableSequentialCameraStorage(project,id);
 const scene=project.scenes[0], [source,dest,downstream]=scene.panels;
 source.duration=11;dest.duration=11;downstream.duration=11;
 scene.sequentialCamera!.baseline={x:300,y:200,zoom:1.2,rotation:8};
 scene.sequentialCamera!.panels[source.id]={mode:'animated',keys:[{frame:10,x:60,y:25,zoom:1.5,rotation:15,interpolation:'linear'}]};
 scene.sequentialCamera!.panels[downstream.id]={mode:'static',pose:{x:740,y:450,zoom:1.1,rotation:-12}};
 const downstreamBefore=resolveCompatibleCamera(project,id,downstream.id,0).pose;
 const clip=copySequentialPanelCamera(project,id,source.id);
 const once=pasteSequentialPanelCamera(project,id,dest.id,clip);
 const twice=pasteSequentialPanelCamera(once,id,dest.id,clip);
 assert.deepEqual(once,twice);
 for(const f of [0,5,10])assert.deepEqual(resolveCompatibleCamera(twice,id,dest.id,f).pose,resolveCompatibleCamera(project,id,source.id,f).pose);
 assert.deepEqual(resolveCompatibleCamera(twice,id,downstream.id,0).pose,downstreamBefore);
 assert.deepEqual(resolveCompatibleCamera(twice,id,source.id,10).pose,resolveCompatibleCamera(project,id,source.id,10).pose);
});
