import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject,makePanel} from '../../src/model.ts';
import {enableSequentialCameraStorage,resolveCompatibleCamera} from '../../src/sequential-camera.ts';
import {copySequentialPanelCamera,pasteSequentialPanelCamera} from '../../src/sequential-camera-clipboard.ts';

// E2.3-F1.1: non-gating diagnostic, intentionally outside npm test's tests/*.test.ts glob.
test('E2.3-F1.1: report all animated clipboard absolute framing mismatches',()=>{
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
