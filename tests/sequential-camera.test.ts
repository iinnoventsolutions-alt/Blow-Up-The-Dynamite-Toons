import test from 'node:test';
import assert from 'node:assert/strict';
import {makePanel,makeProject,makeScene} from '../src/model.ts';
import {setSequentialCameraOut,assessLegacyCameraMigration,resolveCompatibleCamera,compareLegacyCameraFrames,migrateVisuallyEquivalentLegacyCamera,cameraOffset,defaultCamera,enableSequentialCameraStorage,resolveSequentialCamera,type SequentialCameraScene} from '../src/sequential-camera.ts';
test('sequential camera: default scene, inherited panel, independent new scene',()=>{
 const p=makeProject(),s=p.scenes[0];s.panels.push(makePanel('Second'));
 const c:SequentialCameraScene={panels:{}},neutral=defaultCamera(p);
 assert.deepEqual(resolveSequentialCamera(s,p,c,s.panels[1].id,0).pose,neutral);
 const other=makeScene('Scene 2');p.scenes.push(other);
 assert.deepEqual(resolveSequentialCamera(other,p,{panels:{}},other.panels[0].id,0).pose,neutral);
});
test('sequential camera: scene baseline propagates, animated OUT carries downstream, IN remains locked',()=>{
 const p=makeProject(),s=p.scenes[0];for(let i=2;i<=10;i++)s.panels.push(makePanel('Panel '+i));
 const base={x:1050,y:610,zoom:1.3,rotation:5};
 const c:SequentialCameraScene={baseline:base,panels:{}};
 for(const panel of s.panels)assert.deepEqual(resolveSequentialCamera(s,p,c,panel.id,0).pose,base);
 const end={x:1400,y:710,zoom:2,rotation:15};
 c.panels[s.panels[5].id]={mode:'animated',keys:[{frame:119,...cameraOffset(base,end),interpolation:'linear'}]};
 const animated=resolveSequentialCamera(s,p,c,s.panels[5].id,119);
 assert.deepEqual(animated.inPose,base);assert.deepEqual(animated.outPose,end);
 for(const panel of s.panels.slice(6))assert.deepEqual(resolveSequentialCamera(s,p,c,panel.id,0).pose,end);
 assert.deepEqual(resolveSequentialCamera(s,p,c,s.panels[4].id,0).pose,base);
});
test('sequential camera: explicit break and scene-local continuity',()=>{
 const p=makeProject(),s=p.scenes[0];s.panels.push(makePanel('Two'),makePanel('Three'));
 const pose={x:400,y:300,zoom:2,rotation:0},c:SequentialCameraScene={panels:{[s.panels[1].id]:{mode:'break',pose}}};
 assert.deepEqual(resolveSequentialCamera(s,p,c,s.panels[2].id,0).pose,pose);
 assert.deepEqual(resolveSequentialCamera(s,p,c,s.panels[0].id,0).pose,defaultCamera(p));
});
test('sequential camera: interpolated local keys, hold, and invalid input',()=>{
 const p=makeProject(),s=p.scenes[0],base=defaultCamera(p);
 const end={x:1160,y:540,zoom:1,rotation:0};
 const c:SequentialCameraScene={panels:{[s.panels[0].id]:{mode:'animated',keys:[{frame:100,...cameraOffset(base,end),interpolation:'hold'}]}}};
 assert.equal(resolveSequentialCamera(s,p,c,s.panels[0].id,50).pose.x,1060);
 assert.equal(resolveSequentialCamera(s,p,c,s.panels[0].id,100).pose.x,1160);
 c.panels[s.panels[0].id]={mode:'animated',keys:[{frame:0,...cameraOffset(base,end),interpolation:'linear'}]};
 assert.throws(()=>resolveSequentialCamera(s,p,c,s.panels[0].id,0),/Invalid sequential/);
 assert.equal(base.x,960);
});

test('sequential camera: reordering preserves relative animation and recomputes inherited IN',()=>{
 const p=makeProject(),s=p.scenes[0];s.panels.push(makePanel('Animated'),makePanel('Follower'));
 const a=s.panels[0],b=s.panels[1],c=s.panels[2];
 const pose={x:1100,y:600,zoom:1.5,rotation:10};
 const offset={x:100,y:-40,zoom:2,rotation:15};
 const config:SequentialCameraScene={panels:{[a.id]:{mode:'static',pose},[b.id]:{mode:'animated',keys:[{frame:b.duration-1,...offset,interpolation:'linear'}]}}};
 assert.deepEqual(resolveSequentialCamera(s,p,config,b.id,0).inPose,pose);
 assert.deepEqual(resolveSequentialCamera(s,p,config,c.id,0).pose,{x:1200,y:560,zoom:3,rotation:25});
 s.panels=[b,a,c];
 const neutral=defaultCamera(p);
 assert.deepEqual(resolveSequentialCamera(s,p,config,b.id,0).inPose,neutral);
 assert.deepEqual(resolveSequentialCamera(s,p,config,b.id,b.duration-1).outPose,{x:1060,y:500,zoom:2,rotation:15});
 assert.deepEqual(resolveSequentialCamera(s,p,config,c.id,0).pose,pose);
});

import {parseProject,serializeProject} from '../src/project-format.js';
test('schema 5 sequential camera survives save/reopen without altering legacy camera keys',()=>{
 const original=makeProject(),scene=original.scenes[0];scene.panels.push(makePanel('Second'));
 const upgraded=enableSequentialCameraStorage(original,scene.id);
 assert.equal(original.schemaVersion,4);assert.equal(upgraded.schemaVersion,5);
 const base={x:1000,y:500,zoom:1.2,rotation:5};
 upgraded.scenes[0].sequentialCamera!.baseline=base;
 upgraded.scenes[0].sequentialCamera!.panels[scene.panels[0].id]={mode:'animated',keys:[{frame:119,x:50,y:20,zoom:2,rotation:10,interpolation:'ease'}]};
 const loaded=parseProject(serializeProject(upgraded));
 assert.deepEqual(loaded,upgraded);
 assert.deepEqual(resolveSequentialCamera(loaded.scenes[0],loaded,loaded.scenes[0].sequentialCamera!,scene.panels[1].id,0).pose,{x:1050,y:520,zoom:2.4,rotation:15});
 assert.deepEqual(parseProject(serializeProject(original)),original);
});
test('schema 5 sequential camera rejects malformed states and missing panel references',()=>{
 const original=makeProject(),p=enableSequentialCameraStorage(original,original.scenes[0].id),c=p.scenes[0].sequentialCamera!;
 c.panels.missing={mode:'inherit'};assert.throws(()=>serializeProject(p),/panel reference/);delete c.panels.missing;
 c.panels[p.scenes[0].panels[0].id]={mode:'animated',keys:[{frame:0,x:0,y:0,zoom:1,rotation:0,interpolation:'linear'}]};
 assert.throws(()=>serializeProject(p),/Invalid project number/);
});
test('legacy camera motion cannot be silently converted',()=>{
 const p=makeProject();p.scenes[0].panels[0].staticCamera={x:900,y:500,zoom:1,rotation:0};
 assert.throws(()=>enableSequentialCameraStorage(p,p.scenes[0].id),/visual-preserving conversion/);
 assert.equal(p.schemaVersion,4);
});

test('legacy migration: neutral scene converts with identical poses and no mutation',()=>{
 const p=makeProject(),scene=p.scenes[0];scene.panels.push(makePanel('Next'));
 const before=serializeProject(p),result=assessLegacyCameraMigration(p,scene.id);
 assert.equal(result.safe,true);assert.equal(serializeProject(p),before);
 assert.equal(result.project!.schemaVersion,5);
 for(const panel of result.project!.scenes[0].panels)for(const frame of [0,Math.floor(panel.duration/2),panel.duration-1])
  assert.deepEqual(resolveSequentialCamera(result.project!.scenes[0],result.project!,result.project!.scenes[0].sequentialCamera!,panel.id,frame).pose,defaultCamera(p));
});
test('legacy migration: keyed scene is retained without silent visual changes',()=>{
 const p=makeProject(),scene=p.scenes[0],before=serializeProject(p);
 scene.camera.push({id:'keyA',frame:0,x:960,y:540,zoom:1,rotation:0,interpolation:'ease'});
 scene.camera.push({id:'keyB',frame:scene.panels[0].duration-1,x:1200,y:600,zoom:2,rotation:15,interpolation:'linear'});
 const keyed=serializeProject(p),result=assessLegacyCameraMigration(p,scene.id);
 assert.equal(result.safe,false);assert.match(result.reason!,/keyframes/);assert.equal(serializeProject(p),keyed);
 assert.notEqual(keyed,before);
});
test('legacy migration: independent static panel cameras require review',()=>{
 const p=makeProject(),scene=p.scenes[0];scene.panels[0].staticCamera={x:1200,y:600,zoom:2,rotation:0};
 const before=serializeProject(p),result=assessLegacyCameraMigration(p,scene.id);
 assert.equal(result.safe,false);assert.match(result.reason!,/static/);assert.equal(serializeProject(p),before);
});

test('visual-equivalence preflight: constant keyed scene converts frame-exact and survives save',()=>{
 const p=makeProject(),scene=p.scenes[0];scene.panels.push(makePanel('Second'));
 const pose={x:1000,y:550,zoom:1.5,rotation:10};
 scene.camera.push({id:'fixedA',frame:0,...pose,interpolation:'linear'});
 scene.camera.push({id:'fixedB',frame:scene.panels.reduce((n,x)=>n+x.duration,0)-1,...pose,interpolation:'ease'});
 const original=serializeProject(p),result=migrateVisuallyEquivalentLegacyCamera(p,scene.id);
 assert.equal(result.safe,true);assert.equal(result.framesChecked,scene.panels.reduce((n,x)=>n+x.duration,0));
 assert.equal(serializeProject(p),original);
 const reopened=parseProject(serializeProject(result.project!));
 assert.deepEqual(reopened.scenes[0].camera,scene.camera);
 assert.equal(compareLegacyCameraFrames(reopened,scene.id,reopened.scenes[0].sequentialCamera!).equivalent,true);
});
test('visual-equivalence preflight: moving linear and ease keys are not silently migrated',()=>{
 for(const interpolation of ['linear','ease'] as const){
  const p=makeProject(),scene=p.scenes[0];scene.panels.push(makePanel('Second'));
  scene.camera.push({id:'from',frame:0,x:960,y:540,zoom:1,rotation:0,interpolation});
  scene.camera.push({id:'to',frame:scene.panels.reduce((n,x)=>n+x.duration,0)-1,x:1100,y:600,zoom:2,rotation:20,interpolation:'linear'});
  const before=serializeProject(p),result=migrateVisuallyEquivalentLegacyCamera(p,scene.id);
  assert.equal(result.safe,false);assert.equal(serializeProject(p),before);
 }
});
test('visual-equivalence preflight: hold transition and mismatched candidate are rejected',()=>{
 const p=makeProject(),scene=p.scenes[0];scene.panels.push(makePanel('Second'));
 scene.camera.push({id:'holdA',frame:0,x:960,y:540,zoom:1,rotation:0,interpolation:'hold'});
 scene.camera.push({id:'holdB',frame:scene.panels[0].duration,x:1200,y:540,zoom:1,rotation:0,interpolation:'linear'});
 assert.equal(migrateVisuallyEquivalentLegacyCamera(p,scene.id).safe,false);
 const wrong={baseline:{x:900,y:540,zoom:1,rotation:0},panels:{}};
 const result=compareLegacyCameraFrames(p,scene.id,wrong);
 assert.equal(result.equivalent,false);assert.ok(result.firstMismatch);
});

test('compatibility dispatch: mixed project isolates legacy animated and sequential scenes',()=>{
 const p=makeProject(),legacy=p.scenes[0],sequential=makeScene('Sequential');p.scenes.push(sequential);
 legacy.camera.push({id:'legacyA',frame:0,x:960,y:540,zoom:1,rotation:0,interpolation:'linear'});
 legacy.camera.push({id:'legacyB',frame:legacy.panels[0].duration-1,x:1200,y:600,zoom:2,rotation:20,interpolation:'linear'});
 p.schemaVersion=5;
 sequential.sequentialCamera={version:1,baseline:{x:1000,y:500,zoom:1.5,rotation:0},panels:{}};
 const l=resolveCompatibleCamera(p,legacy.id,legacy.panels[0].id,legacy.panels[0].duration-1);
 const n=resolveCompatibleCamera(p,sequential.id,sequential.panels[0].id,0);
 assert.equal(l.engine,'legacy');assert.equal(n.engine,'sequential');
 assert.equal(l.pose.x,1200);assert.equal(n.pose.x,1000);
 const reopened=parseProject(serializeProject(p));
 assert.deepEqual(resolveCompatibleCamera(reopened,legacy.id,legacy.panels[0].id,legacy.panels[0].duration-1),l);
 assert.deepEqual(resolveCompatibleCamera(reopened,sequential.id,sequential.panels[0].id,0),n);
});
test('compatibility dispatch: legacy independent static camera remains scene-local',()=>{
 const p=makeProject(),scene=p.scenes[0];scene.panels.push(makePanel('Other'));
 scene.panels[0].staticCamera={x:1400,y:600,zoom:2,rotation:5};
 const a=resolveCompatibleCamera(p,scene.id,scene.panels[0].id,10);
 const b=resolveCompatibleCamera(p,scene.id,scene.panels[1].id,10);
 assert.equal(a.engine,'legacy');assert.equal(a.pose.x,1400);
 assert.equal(b.pose.x,960);
 assert.equal(p.schemaVersion,4);
});
test('compatibility dispatch: unsafe migration retains legacy playback across panel boundary',()=>{
 const p=makeProject(),scene=p.scenes[0];scene.panels.push(makePanel('Other'));
 const boundary=scene.panels[0].duration;
 scene.camera.push({id:'a',frame:0,x:960,y:540,zoom:1,rotation:0,interpolation:'ease'});
 scene.camera.push({id:'b',frame:boundary+10,x:1200,y:600,zoom:2,rotation:10,interpolation:'linear'});
 assert.equal(migrateVisuallyEquivalentLegacyCamera(p,scene.id).safe,false);
 const left=resolveCompatibleCamera(p,scene.id,scene.panels[0].id,boundary-1);
 const right=resolveCompatibleCamera(p,scene.id,scene.panels[1].id,0);
 assert.equal(left.engine,'legacy');assert.equal(right.engine,'legacy');
 assert.ok(right.pose.x>=left.pose.x);
});

test('sequential OUT writer locks inherited IN and propagates to downstream panels',()=>{
 const original=makeProject(),scene=original.scenes[0];
 scene.panels.push(makePanel('Animated'),makePanel('Follower'));
 const p=enableSequentialCameraStorage(original,scene.id),s=p.scenes[0],animated=s.panels[1],follower=s.panels[2];
 const initial=defaultCamera(p);
 s.sequentialCamera!.panels[animated.id]={mode:'animated',keys:[{frame:animated.duration-1,x:10,y:0,zoom:1,rotation:0,interpolation:'ease'}]};
 const end={x:1250,y:600,zoom:1.8,rotation:12};
 const next=setSequentialCameraOut(p,s.id,animated.id,end);
 assert.deepEqual(resolveCompatibleCamera(next,s.id,animated.id,0).pose,initial,'IN stays inherited');
 assert.deepEqual(resolveCompatibleCamera(next,s.id,animated.id,animated.duration-1).pose,end,'OUT moves');
 assert.deepEqual(resolveCompatibleCamera(next,s.id,follower.id,0).pose,end,'next panel inherits OUT');
 assert.deepEqual(resolveCompatibleCamera(next,s.id,s.panels[0].id,0).pose,initial,'previous panel unaffected');
 assert.equal(next.scenes[0].sequentialCamera!.panels[animated.id].mode,'animated');
 assert.deepEqual(resolveCompatibleCamera(p,s.id,follower.id,0).pose,{...initial,x:initial.x+10},'input project unchanged');
 assert.deepEqual(parseProject(serializeProject(next)),next,'OUT persists across save/reopen');
});
test('sequential OUT writer rejects unsafe edits without changing source',()=>{
 const original=makeProject(),s=original.scenes[0],p=enableSequentialCameraStorage(original,s.id);
 const pose=defaultCamera(p);
 assert.throws(()=>setSequentialCameraOut(p,s.id,s.panels[0].id,pose),/does not have an animated/);
 p.scenes[0].sequentialCamera!.panels[s.panels[0].id]={mode:'animated',keys:[]};
 assert.throws(()=>setSequentialCameraOut(p,s.id,s.panels[0].id,{...pose,zoom:0}),/Invalid sequential/);
 assert.equal(p.scenes[0].sequentialCamera!.panels[s.panels[0].id].mode,'animated');
 assert.equal((p.scenes[0].sequentialCamera!.panels[s.panels[0].id] as {keys:unknown[]}).keys.length,0);
});
