import test from 'node:test';
import assert from 'node:assert/strict';
import {makePanel,makeProject,makeScene,cameraAt,changeDuration,movePanels,removeStoryboardPanel,duplicateStoryboardPanel} from '../src/model.ts';
import {setSequentialCameraOut,setSequentialFirstPanelIn,assessLegacyCameraMigration,resolveCompatibleCamera,compareLegacyCameraFrames,migrateVisuallyEquivalentLegacyCamera,cameraOffset,defaultCamera,enableSequentialCameraStorage,resolveSequentialCamera,type SequentialCameraScene} from '../src/sequential-camera.ts';
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

test('RFU4-RA.4D.1: deleting sequential animated panel removes its state and reconnects inheritance',()=>{
 const p=makeProject(),s=p.scenes[0];s.panels.push(makePanel('Animated'),makePanel('Downstream'));
 s.panels.forEach(x=>x.duration=30);p.schemaVersion=5;
 const [a,b,c]=s.panels;
 s.sequentialCamera={version:1,baseline:{x:960,y:540,zoom:1,rotation:0},panels:{
  [b.id]:{mode:'animated',keys:[{frame:29,x:180,y:0,zoom:1.2,rotation:0,interpolation:'linear'}]}
 }};
 const before=resolveCompatibleCamera(p,s.id,c.id,0).pose;
 assert.equal(before.x,1140);
 const next=removeStoryboardPanel(p,b.id),scene=next.scenes[0];
 assert.equal(scene.sequentialCamera?.panels[b.id],undefined);
 assert.deepEqual(resolveCompatibleCamera(next,scene.id,c.id,0).pose,resolveCompatibleCamera(next,scene.id,a.id,0).pose);
 assert.equal(p.scenes[0].sequentialCamera?.panels[b.id]?.mode,'animated','Source remains immutable');
});
test('RFU4-RA.4D.1: duplication creates independent camera state and recalculates downstream',()=>{
 const p=makeProject(),s=p.scenes[0];s.panels.push(makePanel('Animated'),makePanel('Next'));
 s.panels.forEach(x=>x.duration=30);p.schemaVersion=5;
 const animated=s.panels[1];
 s.sequentialCamera={version:1,panels:{
  [animated.id]:{mode:'animated',keys:[{frame:29,x:100,y:0,zoom:1,rotation:0,interpolation:'linear'}]}
 }};
 const {project:next,panelId}=duplicateStoryboardPanel(p,animated.id),scene=next.scenes[0];
 assert.equal(scene.panels[2].id,panelId);
 assert.equal(scene.sequentialCamera?.panels[panelId]?.mode,'animated');
 assert.notEqual(scene.sequentialCamera?.panels[panelId],scene.sequentialCamera?.panels[animated.id]);
 assert.equal(resolveCompatibleCamera(next,scene.id,panelId,0).inPose.x,1060);
 assert.equal(resolveCompatibleCamera(next,scene.id,scene.panels[3].id,0).inPose.x,1160);
 assert.equal(p.scenes[0].panels.length,3);
});

test('RFU4-RA.4D.2: same-scene reorder recalculates inherited IN without changing relative OUT',()=>{
 const p=makeProject(),s=p.scenes[0];s.panels.push(makePanel('Animated'),makePanel('Following'));
 s.panels.forEach(panel=>panel.duration=30);p.schemaVersion=5;
 const [a,b,c]=s.panels;
 s.sequentialCamera={version:1,panels:{[b.id]:{mode:'animated',keys:[{frame:29,x:100,y:0,zoom:1,rotation:0,interpolation:'linear'}]}}};
 const next=movePanels(p,[{panelId:b.id,sceneId:s.id,beforePanelId:a.id}]),result=next.scenes[0];
 assert.deepEqual(result.panels.map(panel=>panel.id),[b.id,a.id,c.id]);
 assert.equal(result.sequentialCamera?.panels[b.id]?.mode,'animated');
 assert.equal(resolveCompatibleCamera(next,s.id,b.id,0).inPose.x,960);
 assert.equal(resolveCompatibleCamera(next,s.id,a.id,0).inPose.x,1060);
 assert.equal(resolveCompatibleCamera(next,s.id,c.id,0).inPose.x,1060);
 assert.deepEqual(p.scenes[0].panels.map(panel=>panel.id),[a.id,b.id,c.id]);
});
test('RFU4-RA.4D.2: cross-scene sequential move transfers ownership and inherits destination baseline',()=>{
 const p=makeProject(),source=p.scenes[0],destination=makeScene('Destination');
 p.scenes.push(destination);p.schemaVersion=5;
 source.panels.push(makePanel('Animated'));source.panels.forEach(panel=>panel.duration=30);
 const moved=source.panels[1];
 source.sequentialCamera={version:1,panels:{[moved.id]:{mode:'animated',keys:[{frame:29,x:100,y:0,zoom:1,rotation:0,interpolation:'linear'}]}}};
 destination.sequentialCamera={version:1,baseline:{x:1200,y:540,zoom:1,rotation:0},panels:{}};
 const next=movePanels(p,[{panelId:moved.id,sceneId:destination.id}]);
 assert.equal(next.scenes[0].sequentialCamera?.panels[moved.id],undefined);
 assert.equal(next.scenes[1].sequentialCamera?.panels[moved.id]?.mode,'animated');
 assert.equal(resolveCompatibleCamera(next,destination.id,moved.id,0).inPose.x,1200);
 assert.equal(resolveCompatibleCamera(next,destination.id,moved.id,29).outPose.x,1300);
});
test('RFU4-RA.4D.2: incompatible cross-engine camera moves reject atomically',()=>{
 const p=makeProject(),source=p.scenes[0],legacy=makeScene('Legacy');
 p.scenes.push(legacy);p.schemaVersion=5;
 source.panels.push(makePanel('Animated'));
 const animated=source.panels[1];
 source.sequentialCamera={version:1,panels:{[animated.id]:{mode:'animated',keys:[{frame:1,x:50,y:0,zoom:1,rotation:0,interpolation:'linear'}]}}};
 const before=JSON.stringify(p);
 assert.throws(()=>movePanels(p,[{panelId:animated.id,sceneId:legacy.id}]),/camera conversion/);
 assert.equal(JSON.stringify(p),before);
});

test('RFU4-RA.4D.3: extending sequential animation retains OUT and retimes intermediate keys',()=>{
 const p=makeProject(),scene=p.scenes[0],panel=scene.panels[0];panel.duration=11;p.schemaVersion=5;
 scene.panels.push(makePanel('Following'));
 scene.sequentialCamera={version:1,panels:{[panel.id]:{mode:'animated',keys:[
  {frame:5,x:40,y:0,zoom:1,rotation:0,interpolation:'ease'},
  {frame:10,x:100,y:30,zoom:1.2,rotation:0,interpolation:'linear'}
 ]}}};
 const out=resolveCompatibleCamera(p,scene.id,panel.id,10).outPose;
 changeDuration(scene,panel,21);
 const state=scene.sequentialCamera.panels[panel.id];
 assert.equal(state.mode,'animated');
 if(state.mode!=='animated')return;
 assert.deepEqual(state.keys.map(k=>k.frame),[10,20]);
 assert.equal(state.keys[0].interpolation,'ease');
 assert.deepEqual(resolveCompatibleCamera(p,scene.id,panel.id,20).outPose,out);
 assert.deepEqual(resolveCompatibleCamera(p,scene.id,scene.panels[1].id,0).inPose,out);
});
test('RFU4-RA.4D.3: shortening with distinct key collision rejects without mutation',()=>{
 const p=makeProject(),scene=p.scenes[0],panel=scene.panels[0];panel.duration=11;p.schemaVersion=5;
 scene.sequentialCamera={version:1,panels:{[panel.id]:{mode:'animated',keys:[
  {frame:4,x:10,y:0,zoom:1,rotation:0,interpolation:'linear'},
  {frame:5,x:20,y:0,zoom:1,rotation:0,interpolation:'linear'},
  {frame:10,x:50,y:0,zoom:1,rotation:0,interpolation:'linear'}
 ]}}};
 const original=JSON.stringify(p);
 assert.throws(()=>changeDuration(scene,panel,3),/merge sequential camera keys/);
 assert.equal(JSON.stringify(p),original);
 assert.throws(()=>changeDuration(scene,panel,1),/at least two frames/);
 assert.equal(JSON.stringify(p),original);
});
test('RFU4-RA.4D.3: static and inherited panels may use a single frame',()=>{
 const p=makeProject(),scene=p.scenes[0],panel=scene.panels[0];p.schemaVersion=5;
 scene.sequentialCamera={version:1,panels:{[panel.id]:{mode:'static',pose:{x:1100,y:600,zoom:1,rotation:0}}}};
 changeDuration(scene,panel,1);
 assert.equal(panel.duration,1);
 assert.equal(resolveCompatibleCamera(p,scene.id,panel.id,0).pose.x,1100);
});

test('RFU4-RA.5B.1: PNG camera export resolves sequential intermediate, OUT and inherited IN; legacy remains unchanged',async()=>{
 const {resolveCameraForPNGExport}=await import('../src/sequential-camera.ts');
 const p=makeProject('PNG camera compatibility'),s=p.scenes[0];
 s.panels.push(makePanel('Follower'));
 const first=s.panels[0],second=s.panels[1],base=defaultCamera(p);
 const legacyPose={x:1200,y:600,zoom:1.5,rotation:4};
 s.camera.push({id:'legacy-png',frame:0,...legacyPose,interpolation:'linear'});
 assert.deepEqual(resolveCameraForPNGExport(p,s.id,first.id,0),cameraAt(s,0,p));
 s.camera=[];
 p.schemaVersion=5;
 s.sequentialCamera={version:1,panels:{[first.id]:{mode:'animated',keys:[
  {frame:60,x:100,y:40,zoom:1.5,rotation:10,interpolation:'linear'},
  {frame:first.duration-1,x:200,y:80,zoom:2,rotation:20,interpolation:'linear'}
 ]}}};
 for(const frame of [0,30,60,90,first.duration-1]){
  assert.deepEqual(resolveCameraForPNGExport(p,s.id,first.id,frame),resolveCompatibleCamera(p,s.id,first.id,frame).pose);
 }
 assert.deepEqual(resolveCameraForPNGExport(p,s.id,second.id,first.duration),resolveCompatibleCamera(p,s.id,second.id,0).pose);
 assert.notDeepEqual(resolveCameraForPNGExport(p,s.id,first.id,60),base);
});

test('RFU4-RA.5B.1: dissolve and wipe transition boundary uses inherited incoming IN',async()=>{
 const {transitionAt}=await import('../src/transitions.ts');
 const {resolveCameraForPNGExport}=await import('../src/sequential-camera.ts');
 const p=makeProject('Sequential transition continuity'),s=p.scenes[0];
 s.panels.push(makePanel('Incoming'));
 const outgoing=s.panels[0],incoming=s.panels[1];
 p.schemaVersion=5;
 s.sequentialCamera={version:1,panels:{[outgoing.id]:{mode:'animated',keys:[{frame:outgoing.duration-1,x:120,y:-30,zoom:1.4,rotation:8,interpolation:'linear'}]}}};
 for(const type of ['dissolve','edge-wipe','clock-wipe','slide'] as const){
  p.transitions=[{id:'transition-test',fromId:outgoing.id,toId:incoming.id,type,duration:12,direction:'right'}];
  const boundary=outgoing.duration;
  const mix=transitionAt(p,boundary-1);
  assert.equal(mix?.boundary,boundary);
  assert.equal(mix?.progress,1);
  const out=resolveCompatibleCamera(p,s.id,outgoing.id,outgoing.duration-1).pose;
  const incomingAtBoundary=resolveCompatibleCamera(p,s.id,incoming.id,0).pose;
  assert.deepEqual(incomingAtBoundary,out,'Incoming IN must equal outgoing OUT for '+type);
  assert.deepEqual(resolveCameraForPNGExport(p,s.id,incoming.id,boundary),out);
  assert.equal(transitionAt(p,boundary),undefined);
 }
});

test('RC1.1-A: first panel IN is editable and scene-local; later IN remains locked',()=>{
 const p=makeProject('First panel editable IN');p.schemaVersion=5;
 const first=p.scenes[0];first.panels.push(makePanel('Later'));
 first.sequentialCamera={version:1,panels:{
  [first.panels[0].id]:{mode:'animated',keys:[{frame:first.panels[0].duration-1,x:120,y:0,zoom:1,rotation:20,interpolation:'linear'}]}
 }};
 const second=makeScene('Independent scene');second.sequentialCamera={version:1,panels:{}};p.scenes.push(second);
 const start={x:1100,y:600,zoom:1.3,rotation:35};
 const edited=setSequentialFirstPanelIn(p,first.id,first.panels[0].id,start);
 assert.deepEqual(resolveCompatibleCamera(edited,first.id,first.panels[0].id,0).inPose,start);
 const end=resolveCompatibleCamera(edited,first.id,first.panels[0].id,first.panels[0].duration-1).outPose;
 assert.equal(end.x,1220);assert.equal(end.rotation,55);
 assert.deepEqual(resolveCompatibleCamera(edited,first.id,first.panels[1].id,0).inPose,end);
 assert.deepEqual(resolveCompatibleCamera(edited,second.id,second.panels[0].id,0).inPose,defaultCamera(p));
 assert.deepEqual(resolveCompatibleCamera(p,first.id,first.panels[0].id,0).inPose,defaultCamera(p),'original project remains immutable');
 assert.throws(()=>setSequentialFirstPanelIn(edited,first.id,first.panels[1].id,start),/Only the first panel/);
 const reopened=JSON.parse(JSON.stringify(edited));
 assert.deepEqual(resolveCompatibleCamera(reopened,first.id,first.panels[0].id,0).inPose,start);
});
