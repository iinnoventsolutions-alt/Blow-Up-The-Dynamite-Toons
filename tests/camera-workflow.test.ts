import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProject, makePanel, makeScene } from '../src/model.ts';
import { enableSequentialCameraStorage, enableSequentialPanelAnimation, setSequentialIntermediateKey, setSequentialCameraOut, resolveCompatibleCamera, defaultCamera } from '../src/sequential-camera.ts';
import { resetCameraScope, deleteCameraKeyframe } from '../src/camera-workflow.ts';
import { serializeProject, parseProject } from '../src/project-format.js';

const altered={x:1250,y:650,zoom:1.7,rotation:25};
function sequentialFixture(){
 const original=makeProject();
 original.scenes[0].panels.push(makePanel('Second'),makePanel('Third'));
 return enableSequentialCameraStorage(original,original.scenes[0].id);
}
function animatedFixture(){
 let p=sequentialFixture();
 const s=p.scenes[0], first=s.panels[0];
 p=enableSequentialPanelAnimation(p,s.id,first.id);
 p=setSequentialCameraOut(p,s.id,first.id,altered);
 return p;
}
test('P1 selected OUT reset retains key but resets its transform and is undoable',()=>{
 const p=animatedFixture(),s=p.scenes[0],first=s.panels[0],neutral=defaultCamera(p);
 const before=serializeProject(p);
 const next=resetCameraScope(p,s.id,first.id,'key','out',first.duration-1);
 assert.equal(serializeProject(p),before);
 assert.deepEqual(resolveCompatibleCamera(next,s.id,first.id,first.duration-1).pose,neutral);
 assert.equal(next.scenes[0].sequentialCamera!.panels[first.id].mode,'animated');
 assert.deepEqual(parseProject(serializeProject(next)),next);
});
test('P1 reset panel removes owned animation but preserves other scenes',()=>{
 const original=animatedFixture();
 original.scenes.push(makeScene('Other scene'));
 const s=original.scenes[0],first=s.panels[0],nextPanel=s.panels[1],neutral=defaultCamera(original);
 const before=serializeProject(original);
 const next=resetCameraScope(original,s.id,first.id,'panel');
 assert.equal(serializeProject(original),before);
 assert.deepEqual(resolveCompatibleCamera(next,s.id,first.id,first.duration-1).pose,neutral);
 assert.deepEqual(resolveCompatibleCamera(next,s.id,nextPanel.id,0).pose,neutral);
 assert.deepEqual(next.scenes[1],original.scenes[1]);
 assert.deepEqual(parseProject(serializeProject(next)),next);
});
test('P1 resetting a later panel explicitly breaks inheritance to neutral',()=>{
 const p=animatedFixture(),s=p.scenes[0],later=s.panels[1],following=s.panels[2];
 assert.deepEqual(resolveCompatibleCamera(p,s.id,later.id,0).pose,altered);
 const next=resetCameraScope(p,s.id,later.id,'panel');
 assert.deepEqual(resolveCompatibleCamera(next,s.id,later.id,0).pose,defaultCamera(p));
 assert.deepEqual(resolveCompatibleCamera(next,s.id,following.id,0).pose,defaultCamera(p));
 assert.deepEqual(resolveCompatibleCamera(next,s.id,s.panels[0].id,s.panels[0].duration-1).pose,altered);
});
test('P1 reset scene clears sequential camera without changing project schema',()=>{
 const p=animatedFixture(),s=p.scenes[0],next=resetCameraScope(p,s.id,s.panels[0].id,'scene');
 assert.equal(next.schemaVersion,p.schemaVersion);
 assert.deepEqual(next.scenes[0].sequentialCamera!.panels,{});
 for(const panel of next.scenes[0].panels)assert.deepEqual(resolveCompatibleCamera(next,s.id,panel.id,0).pose,defaultCamera(p));
 assert.deepEqual(parseProject(serializeProject(next)),next);
});
test('P1 deleting intermediate key retains OUT and first-panel IN',()=>{
 let p=animatedFixture();
 const s=p.scenes[0],first=s.panels[0],frame=55;
 p=setSequentialIntermediateKey(p,s.id,first.id,frame,{...altered,x:1400});
 const before=serializeProject(p);
 const next=deleteCameraKeyframe(p,s.id,first.id,'intermediate',frame);
 assert.equal(serializeProject(p),before);
 assert.deepEqual(resolveCompatibleCamera(next,s.id,first.id,first.duration-1).pose,altered);
 assert.equal((next.scenes[0].sequentialCamera!.panels[first.id] as {keys:{frame:number}[]}).keys.some(k=>k.frame===frame),false);
});
test('P1 deleting explicit OUT retains intermediate and downstream inheritance',()=>{
 let p=animatedFixture();
 const s=p.scenes[0],first=s.panels[0],second=s.panels[1],frame=55;
 const middle={x:1100,y:560,zoom:1.2,rotation:8};
 p=setSequentialIntermediateKey(p,s.id,first.id,frame,middle);
 const next=deleteCameraKeyframe(p,s.id,first.id,'out',first.duration-1);
 assert.deepEqual(resolveCompatibleCamera(next,s.id,first.id,first.duration-1).pose,middle);
 assert.deepEqual(resolveCompatibleCamera(next,s.id,second.id,0).pose,middle);
 assert.throws(()=>deleteCameraKeyframe(next,s.id,first.id,'out',first.duration-1),/not found/);
});
test('P1 inherited IN cannot be deleted or reset as an editable key',()=>{
 const p=animatedFixture(),s=p.scenes[0],later=s.panels[1],first=s.panels[0];
 assert.throws(()=>deleteCameraKeyframe(p,s.id,later.id,'in',0),/cannot be deleted/);
 assert.throws(()=>resetCameraScope(p,s.id,later.id,'key','in',first.duration),/locked/);
});
test('P1 legacy key deletion and selected reset preserve project and scene',()=>{
 const p=makeProject(),s=p.scenes[0],panel=s.panels[0];
 s.camera=[{id:'one',frame:0,...altered,interpolation:'linear'},{id:'two',frame:panel.duration-1,...altered,interpolation:'ease'}];
 const before=serializeProject(p);
 const reset=resetCameraScope(p,s.id,panel.id,'key',null,0);
 assert.deepEqual(reset.scenes[0].camera[0],{id:'one',frame:0,...defaultCamera(p),interpolation:'linear'});
 const deleted=deleteCameraKeyframe(reset,s.id,panel.id,null,panel.duration-1);
 assert.equal(deleted.scenes[0].camera.length,1);
 assert.equal(serializeProject(p),before);
 assert.deepEqual(parseProject(serializeProject(deleted)),deleted);
});
